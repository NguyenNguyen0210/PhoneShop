import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarrantyDto, ClaimWarrantyDto, RepairWarrantyDto } from './dto/warranty.dto';
import { WarrantyStatus, WarrantyRepairStage, ImeiStatus, OrderStatus, AuditAction } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class WarrantyService {
  constructor(private prisma: PrismaService) {}

  private generateWarrantyCode(): string {
    return `WRT-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private addWarrantyMonths(date: Date, months: number): Date {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) d.setDate(0);
    return d;
  }

  async create(dto: CreateWarrantyDto) {
    if (!dto.orderItemId) throw new BadRequestException('orderItemId is required');
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: {
        order: { select: { userId: true, status: true } },
        variant: { include: { product: { select: { warrantyMonths: true } } } },
      },
    });
    if (!orderItem) throw new NotFoundException('Order item not found');
    if (orderItem.order.userId !== dto.userId) {
      throw new BadRequestException('Order item does not belong to this user');
    }
    if (orderItem.variantId !== dto.productVariantId) {
      throw new BadRequestException('Order item does not match this product variant');
    }
    if (![OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(orderItem.order.status as any)) {
      throw new BadRequestException('Warranty starts only after delivery');
    }
    if (dto.imeiDeviceId && dto.imeiDeviceId !== orderItem.imeiDeviceId) {
      throw new BadRequestException('IMEI does not belong to the order item');
    }
    const months = orderItem.variant?.product?.warrantyMonths ?? 12;
    const startDate = new Date();
    const endDate = this.addWarrantyMonths(startDate, months);
    try {
      // D7: only re-activate an ACTIVE warranty (reset dates for a live
      // warranty). VOIDED/CLAIMED rows must never be resurrected — the
      // upsert update branch is a no-op for non-ACTIVE statuses.
      const existing = await this.prisma.warranty.findUnique({
        where: { orderItemId: dto.orderItemId },
      });
      if (existing && existing.status !== WarrantyStatus.ACTIVE) {
        throw new ConflictException(
          `Cannot update warranty in ${existing.status} status — only ACTIVE warranties may be refreshed`,
        );
      }
      return await this.prisma.warranty.upsert({
        where: { orderItemId: dto.orderItemId },
        update: {},
        create: {
          userId: dto.userId,
          productVariantId: dto.productVariantId,
          orderItemId: dto.orderItemId,
          imeiDeviceId: dto.imeiDeviceId ?? orderItem.imeiDeviceId ?? undefined,
          warrantyCode: this.generateWarrantyCode(),
          startDate,
          endDate,
          status: WarrantyStatus.ACTIVE,
          notes: dto.notes,
        },
        include: { productVariant: { include: { product: true } }, orderItem: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Warranty already exists');
      throw e;
    }
  }

  async findAll(userId?: string) {
    const where: any = {};
    if (userId) where.userId = userId;
    return this.prisma.warranty.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        productVariant: { include: { product: true } },
        imeiDevice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const warranty = await this.prisma.warranty.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        productVariant: { include: { product: true } },
        imeiDevice: true,
        orderItem: true,
      },
    });
    if (!warranty) throw new NotFoundException('Warranty not found');
    return warranty;
  }

  async searchByCode(codeOrImei: string) {
    const clean = (codeOrImei || '').trim();
    if (!clean) {
      throw new BadRequestException('Vui lòng cung cấp mã bảo hành, IMEI hoặc số điện thoại');
    }

    // Public lookup is restricted to an exact warranty code or device identifier.
    const orConditions: any[] = [
      { warrantyCode: { equals: clean, mode: 'insensitive' } },
      { imeiDevice: { imei: clean } },
      { imeiDevice: { serialNumber: { equals: clean, mode: 'insensitive' } } },
    ];

    const candidates = await this.prisma.warranty.findMany({
      where: {
        OR: orConditions,
      },
      include: {
        productVariant: {
          select: {
            id: true, name: true, sku: true, color: true, storage: true,
            product: { select: { name: true, warrantyMonths: true } },
          },
        },
        imeiDevice: { select: { id: true, status: true, variantId: true, imei: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    if (candidates.length === 0) {
      throw new NotFoundException('Không tìm thấy thông tin bảo hành cho mã IMEI hoặc số điện thoại này');
    }

    const now = new Date();
    const live = candidates.filter(
      (w) => w.status === WarrantyStatus.ACTIVE && new Date(w.endDate) >= now,
    );
    const picked = live[0] ?? candidates.find((w) => w.status === WarrantyStatus.ACTIVE) ?? candidates[0];

    const endDate = new Date(picked.endDate);
    const startDate = new Date(picked.startDate);
    const isExpired = endDate < now;
    const daysRemaining = isExpired ? 0 : Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
    const warrantyMonths = picked.productVariant?.product?.warrantyMonths ?? 12;
    const variantName = picked.productVariant
      ? `${picked.productVariant.color || ''} - ${picked.productVariant.storage || ''}`.trim()
      : '';

    // Public lookup: structured response including activation status, warranty months, and expiry
    return {
      id: picked.id,
      warrantyCode: picked.warrantyCode,
      imei: picked.imeiDevice?.imei ?? null,
      imeiNumber: picked.imeiDevice?.imei ?? null,
      productName: picked.productVariant?.product?.name || 'Thiết bị di động chính hãng',
      variantName,
      variantInfo: variantName,
      warrantyMonths,
      startDate: picked.startDate,
      activatedAt: picked.startDate,
      endDate: picked.endDate,
      expiresAt: picked.endDate,
      status: isExpired && picked.status === WarrantyStatus.ACTIVE ? 'EXPIRED' : picked.status,
      isActive: picked.status === WarrantyStatus.ACTIVE && !isExpired,
      isExpired,
      daysRemaining,
      notes: null,
      claims: [],
      productVariant: picked.productVariant,
      imeiDevice: picked.imeiDevice
        ? {
            id: picked.imeiDevice.id,
            status: picked.imeiDevice.status,
            variantId: picked.imeiDevice.variantId,
            imei: picked.imeiDevice.imei,
          }
        : null,
    };
  }

  async lookup(term: string) {
    return this.searchByCode(term);
  }

  async lookupMyPhone(userId: string, phone: string) {
    const normalized = phone.replace(/[\s.]/g, '').replace(/^\+84/, '0');
    if (!/^0[35789]\d{8}$/.test(normalized)) throw new BadRequestException('Invalid phone number');
    const record = await this.prisma.warranty.findFirst({
      where: {
        userId,
        OR: [
          { user: { phone: { in: [normalized, `+84${normalized.slice(1)}`] } } },
          { orderItem: { order: { shippingAddressSnapshot: { path: ['phone'], equals: normalized } } } },
          { orderItem: { order: { shippingAddressSnapshot: { path: ['phone'], equals: `+84${normalized.slice(1)}` } } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new NotFoundException('Warranty not found for your account and phone');
    return this.searchByCode(record.warrantyCode);
  }

  async checkStatus(warrantyCode: string) {
    const warranty = await this.searchByCode(warrantyCode);
    const now = new Date();
    const isExpired = warranty.endDate < now;
    return {
      warrantyCode,
      status: isExpired && warranty.status === WarrantyStatus.ACTIVE ? 'EXPIRED' : warranty.status,
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      isExpired,
      daysRemaining: isExpired ? 0 : Math.ceil((warranty.endDate.getTime() - now.getTime()) / 86400000),
    };
  }

  async claimWarranty(userId: string, id: string, dto: ClaimWarrantyDto) {
    const warranty = await this.findOne(id);
    if (warranty.userId !== userId) throw new BadRequestException('Not your warranty');
    if (warranty.status !== WarrantyStatus.ACTIVE) {
      throw new BadRequestException('Warranty is not in ACTIVE status');
    }
    const now = new Date();
    if (warranty.endDate < now) throw new BadRequestException('Warranty has expired');

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.warranty.updateMany({
        where: { id, userId, status: WarrantyStatus.ACTIVE, endDate: { gte: now } },
        data: { status: WarrantyStatus.CLAIMED, repairStage: WarrantyRepairStage.REQUESTED,
          notes: dto.reason, claimPhone: dto.customerPhone ?? null,
          claimReturnAddress: dto.returnAddress ?? null },
      });
      if (changed.count !== 1) throw new ConflictException('Warranty changed during claim');
      await tx.auditLog.create({ data: { action: AuditAction.UPDATE, entity: 'Warranty',
        entityId: id, userId, newData: { repairStage: 'REQUESTED', reason: dto.reason } } });
      return tx.warranty.findUnique({ where: { id } });
    });
  }

  async advanceRepair(id: string, step: 'receive' | 'repair' | 'return', dto: RepairWarrantyDto, actorId: string) {
    const stages = {
      receive: [WarrantyRepairStage.REQUESTED, WarrantyRepairStage.RECEIVED],
      repair: [WarrantyRepairStage.RECEIVED, WarrantyRepairStage.REPAIRED],
      return: [WarrantyRepairStage.REPAIRED, WarrantyRepairStage.RETURNED],
    } as const;
    const [from, to] = stages[step];
    return this.prisma.$transaction(async (tx) => {
      const warranty = await tx.warranty.findUnique({ where: { id } });
      if (!warranty) throw new NotFoundException('Warranty not found');
      if (warranty.status !== WarrantyStatus.CLAIMED || warranty.repairStage !== from) {
        throw new ConflictException('Repair stage changed or action is out of order');
      }
      const changed = await tx.warranty.updateMany({
        where: { id, status: WarrantyStatus.CLAIMED, repairStage: from },
        data: { repairStage: to,
          ...(step === 'return' ? { status: warranty.endDate < new Date() ? WarrantyStatus.EXPIRED : WarrantyStatus.ACTIVE } : {}),
        },
      });
      if (changed.count !== 1) throw new ConflictException('Repair changed concurrently');
      if (warranty.imeiDeviceId && step !== 'repair') {
        const device = await tx.imeiDevice.updateMany({
          where: { id: warranty.imeiDeviceId, status: step === 'receive' ? ImeiStatus.SOLD : ImeiStatus.WARRANTY },
          data: { status: step === 'receive' ? ImeiStatus.WARRANTY : ImeiStatus.SOLD },
        });
        if (device.count !== 1) throw new ConflictException('Device state does not match repair stage');
      }
      await tx.auditLog.create({ data: { action: AuditAction.UPDATE, entity: 'Warranty',
        entityId: id, userId: actorId, oldData: { repairStage: from },
        newData: { repairStage: to, notes: dto.notes } } });
      return tx.warranty.findUnique({ where: { id } });
    });
  }

  async voidWarranty(id: string) {
    const warranty = await this.findOne(id);
    if ([WarrantyRepairStage.RECEIVED, WarrantyRepairStage.REPAIRED].includes(warranty.repairStage as any)) {
      throw new BadRequestException('Return the customer device before voiding its warranty');
    }
    // P4: voiding is final — only a live or claimed warranty can be voided,
    // and the handset goes back through inspection (WARRANTY) instead of
    // dangling in whatever status it had.
    if (
      warranty.status !== WarrantyStatus.ACTIVE &&
      warranty.status !== WarrantyStatus.CLAIMED
    ) {
      throw new BadRequestException(
        `Only ACTIVE or CLAIMED warranties can be voided (current: ${warranty.status})`,
      );
    }
    return this.prisma.warranty.update({
      where: { id },
      data: { status: WarrantyStatus.VOIDED },
    });
  }

  // Bulk-void live/claimed warranties when the sale dies (cancel/refund/return).
  // Runs inside the caller's transaction (tx) so coverage and money move
  // together, including a claim open at the time of a full refund.
  async voidWarrantiesForOrder(tx: any, orderId: string): Promise<void> {
    await tx.warranty.updateMany({
      where: { orderItem: { orderId }, status: { in: [WarrantyStatus.ACTIVE, WarrantyStatus.CLAIMED] } },
      data: { status: WarrantyStatus.VOIDED },
    });
  }

  async getUserWarranties(userId: string) {
    return this.prisma.warranty.findMany({
      where: { userId },
      include: { productVariant: { include: { product: true } }, imeiDevice: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
