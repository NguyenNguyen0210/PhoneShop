import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateImeiDto, UpdateImeiStatusDto, ImportImeiDto } from './dto/imei.dto';
import { ImeiStatus, Prisma, StockMovementType } from '@prisma/client';
import { PaginationQueryDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryImeiDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ enum: ImeiStatus })
  @IsOptional()
  @IsEnum(ImeiStatus)
  status?: ImeiStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

@Injectable()
export class ImeiService {
  constructor(private prisma: PrismaService) {}

  // ── H3: IMEI HYGIENE ───────────────────────────────────────
  // Every write path must normalize + validate. Previously only the
  // read-only GET /imei/validate/:imei checked Luhn, so "12345",
  // bad-check-digit codes, or " 3589… " (trailing space — bypasses the
  // @unique index while being the same handset) entered stock silently.
  private normalizeImei(raw: string): string {
    return (raw || '').replace(/[\s-]/g, '');
  }

  private async assertValidImei(raw: string): Promise<string> {
    const imei = this.normalizeImei(raw);
    if (!(await this.validate(imei))) {
      throw new BadRequestException(
        `Invalid IMEI "${raw}": must be exactly 15 digits with a valid Luhn check digit`,
      );
    }
    return imei;
  }

  private async assertOptionalImei(raw?: string): Promise<string | undefined> {
    if (raw === undefined || raw === null) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    return this.assertValidImei(trimmed);
  }

  async add(dto: CreateImeiDto) {
    const imei = await this.assertValidImei(dto.imei);
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException('Product variant not found');
    const existing = await this.prisma.imeiDevice.findUnique({ where: { imei } });
    if (existing) throw new ConflictException('IMEI already registered');
    const imei2 = await this.assertOptionalImei(dto.imei2);
    const serialNumber = dto.serialNumber?.trim() || undefined;
    if (imei2) {
      const dup2 = await this.prisma.imeiDevice.findUnique({ where: { imei2 } });
      if (dup2) throw new ConflictException('IMEI2 already registered');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const device = await tx.imeiDevice.create({
          data: { ...dto, imei, imei2, serialNumber },
        });
        const inv = await tx.inventory.upsert({
          where: { variantId: dto.variantId },
          create: {
            variantId: dto.variantId,
            quantity: 1,
            availableQty: 1,
            reservedQty: 0,
          },
          update: {
            quantity: { increment: 1 },
            availableQty: { increment: 1 },
          },
        });
        const balanceAfter = inv.quantity;
        await tx.stockMovement.create({
          data: {
            variantId: dto.variantId,
            type: StockMovementType.IMPORT_MANUAL,
            quantity: 1,
            balanceBefore: balanceAfter - 1,
            balanceAfter,
            referenceType: 'IMEI_IMPORT',
            referenceId: device.id,
            note: `Manual IMEI add ${imei}`,
          },
        });
        return device;
      });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new ConflictException('IMEI already exists (concurrent import)');
      throw e;
    }
  }

  async import(dto: ImportImeiDto) {
    // Validate the whole batch BEFORE touching the DB so a single bad code
    // rejects the import instead of half-importing stock. Keys are normalized
    // IMEIs so " 3589… " and "3589…" collide instead of double-importing.
    const seen = new Set<string>(); // normalized IMEIs in this batch
    const seen2 = new Set<string>(); // normalized IMEI2 in this batch
    const normalized = new Map<string, string>(); // original -> normalized
    const skippedDuplicates: string[] = [];
    const invalid: string[] = [];
    for (const item of dto.items) {
      const imei = this.normalizeImei(item.imei);
      if (!(await this.validate(imei))) {
        if (invalid.length < 10) invalid.push(item.imei);
        continue;
      }
      if (seen.has(imei)) {
        skippedDuplicates.push(item.imei);
        continue;
      }
      if (item.imei2?.trim()) {
        const imei2n = this.normalizeImei(item.imei2);
        if (!(await this.validate(imei2n))) {
          if (invalid.length < 10) invalid.push(item.imei2);
          continue;
        }
        if (seen2.has(imei2n)) {
          skippedDuplicates.push(item.imei2);
          continue;
        }
        const dup2Db = await this.prisma.imeiDevice.findUnique({
          where: { imei2: imei2n },
        });
        if (dup2Db) {
          skippedDuplicates.push(item.imei2);
          continue;
        }
        seen2.add(imei2n);
      }
      seen.add(imei);
      normalized.set(item.imei, imei);
    }
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Import rejected: ${invalid.length} IMEI(s) failed Luhn/format check (e.g. ${invalid.join(', ')}). No devices were imported.`,
      );
    }

    // Pre-check that every referenced variant exists before opening a txn.
    const variantIds = [
      ...new Set(
        dto.items.filter((i) => normalized.has(i.imei)).map((i) => i.variantId),
      ),
    ];
    if (variantIds.length > 0) {
      const found = await this.prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true },
      });
      if (found.length !== variantIds.length) {
        throw new NotFoundException('One or more product variants not found');
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created: any[] = [];
        const variantCountMap = new Map<string, number>();

        for (const item of dto.items) {
          const imei = normalized.get(item.imei);
          if (!imei) continue; // intra-batch duplicate
          const existing = await tx.imeiDevice.findUnique({ where: { imei } });
          if (!existing) {
            const imei2 = item.imei2?.trim()
              ? this.normalizeImei(item.imei2)
              : undefined;
            const serialNumber = item.serialNumber?.trim() || undefined;
            const device = await tx.imeiDevice.create({
              data: { ...item, imei, imei2, serialNumber },
            });
            created.push(device);
            variantCountMap.set(
              item.variantId,
              (variantCountMap.get(item.variantId) || 0) + 1,
            );
          }
        }

        for (const [variantId, count] of variantCountMap.entries()) {
          await tx.inventory.upsert({
            where: { variantId },
            create: {
              variantId,
              quantity: count,
              availableQty: count,
              reservedQty: 0,
            },
            update: {
              quantity: { increment: count },
              availableQty: { increment: count },
            },
          });
          const inv = await tx.inventory.findUnique({ where: { variantId } });
          const balanceAfter = inv ? inv.quantity : count;
          await tx.stockMovement.create({
            data: {
              variantId,
              type: StockMovementType.IMPORT_MANUAL,
              quantity: count,
              balanceBefore: balanceAfter - count,
              balanceAfter,
              referenceType: 'IMEI_IMPORT',
              note: `Bulk IMEI import (${count} devices)`,
            },
          });
        }

        return {
          imported: created.length,
          total: dto.items.length,
          skippedDuplicates,
        };
      });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new ConflictException('IMEI already exists (concurrent import)');
      throw e;
    }
  }

  async findAll(query: QueryImeiDto = {}): Promise<PaginatedResponse<any>> {
    const page = Number(query?.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query?.limit) > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ImeiDeviceWhereInput = {};
    if (query?.variantId) {
      where.variantId = query.variantId;
    }
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { imei: { contains: searchTerm, mode: 'insensitive' } },
        { serialNumber: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.imeiDevice.count({ where }),
      this.prisma.imeiDevice.findMany({
        where,
        skip,
        take: limit,
        include: { variant: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const imei = await this.prisma.imeiDevice.findUnique({
      where: { id },
      include: { variant: true },
    });
    if (!imei) throw new NotFoundException('IMEI device not found');
    return imei;
  }

  async searchByImei(imei: string) {
    const device = await this.prisma.imeiDevice.findUnique({
      where: { imei: this.normalizeImei(imei) },
      include: { variant: { include: { product: true } } },
    });
    if (!device) throw new NotFoundException('IMEI not found');
    return device;
  }

  async checkAvailability(imei: string) {
    const normalized = this.normalizeImei(imei);
    const device = await this.prisma.imeiDevice.findUnique({ where: { imei: normalized } });
    if (!device) throw new NotFoundException('IMEI not found');
    return { imei: normalized, status: device.status, available: device.status === ImeiStatus.AVAILABLE };
  }

  async validate(imei: string): Promise<boolean> {
    if (!/^\d{15}$/.test(imei)) return false;
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let digit = parseInt(imei[i]);
      if (i % 2 !== 0) digit *= 2;
      if (digit > 9) digit -= 9;
      sum += digit;
    }
    return sum % 10 === 0;
  }

  // ── H6: IMEI STATE MACHINE ────────────────────────────────
  // Previously updateStatus/return/block/warranty accepted ANY → ANY, so a
  // SOLD handset could be flipped back to AVAILABLE and double-sold, or an
  // AVAILABLE unit flipped to RETURNED (shrinking sellable stock). Every
  // mutation below goes through transitionTo(): allowed-map check +
  // conditional updateMany (count===0 ⇒ lost a race or illegal jump).
  private static readonly ALLOWED_IMEI_TRANSITIONS: Record<ImeiStatus, ImeiStatus[]> = {
    [ImeiStatus.AVAILABLE]: [ImeiStatus.RESERVED, ImeiStatus.BLOCKED],
    [ImeiStatus.RESERVED]: [ImeiStatus.AVAILABLE, ImeiStatus.SOLD, ImeiStatus.BLOCKED],
    [ImeiStatus.SOLD]: [ImeiStatus.WARRANTY, ImeiStatus.RETURNED],
    [ImeiStatus.RETURNED]: [ImeiStatus.AVAILABLE, ImeiStatus.BLOCKED],
    [ImeiStatus.BLOCKED]: [ImeiStatus.AVAILABLE],
    [ImeiStatus.WARRANTY]: [ImeiStatus.AVAILABLE],
  };

  private async transitionTo(id: string, to: ImeiStatus, extraData: Record<string, any> = {}) {
    const device = await this.findOne(id);
    const allowed = ImeiService.ALLOWED_IMEI_TRANSITIONS[device.status] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition IMEI from ${device.status} to ${to}`,
      );
    }
    const updated = await this.prisma.imeiDevice.updateMany({
      where: { id, status: device.status },
      data: { status: to, ...extraData },
    });
    if (updated.count === 0) {
      throw new BadRequestException(
        `IMEI state changed concurrently (expected ${device.status})`,
      );
    }
    return this.findOne(id);
  }

  async updateStatus(id: string, dto: UpdateImeiStatusDto) {
    const data: any = {};
    if (dto.status === ImeiStatus.SOLD) data.soldAt = new Date();
    return this.transitionTo(id, dto.status, data);
  }

  async reserve(id: string) {
    return this.transitionTo(id, ImeiStatus.RESERVED);
  }

  async markSold(id: string) {
    return this.transitionTo(id, ImeiStatus.SOLD, { soldAt: new Date() });
  }

  async returnDevice(id: string) {
    return this.transitionTo(id, ImeiStatus.RETURNED);
  }

  async block(id: string) {
    return this.transitionTo(id, ImeiStatus.BLOCKED);
  }

  async warranty(id: string) {
    return this.transitionTo(id, ImeiStatus.WARRANTY);
  }

  async release(id: string) {
    return this.transitionTo(id, ImeiStatus.AVAILABLE);
  }

  // Rebuild a variant's inventory counters from its IMEI rows (the source of
  // truth checkout enforces). quantity = handsets physically on hand;
  // SOLD/RETURNED/WARRANTY rows are owned by the sales/return flows and are
  // deliberately not inferred here.
  async syncInventoryFromImei(variantId: string) {
    const [available, reserved, blocked] = await Promise.all(
      ([ImeiStatus.AVAILABLE, ImeiStatus.RESERVED, ImeiStatus.BLOCKED] as const).map(
        (status) => this.prisma.imeiDevice.count({ where: { variantId, status } }),
      ),
    );
    return this.prisma.inventory.update({
      where: { variantId },
      data: {
        quantity: available + reserved + blocked,
        availableQty: available,
        reservedQty: reserved,
      },
    });
  }
}
