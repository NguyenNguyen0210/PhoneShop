import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarrantyDto, ClaimWarrantyDto } from './dto/warranty.dto';
import { WarrantyStatus } from '@prisma/client';
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
        order: { select: { userId: true } },
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
    const months = orderItem.variant?.product?.warrantyMonths ?? 12;
    const startDate = new Date();
    const endDate = this.addWarrantyMonths(startDate, months);
    try {
      return await this.prisma.warranty.upsert({
        where: { orderItemId: dto.orderItemId },
        update: {
          status: WarrantyStatus.ACTIVE,
          startDate,
          endDate,
          imeiDeviceId: dto.imeiDeviceId ?? orderItem.imeiDeviceId ?? undefined,
          notes: dto.notes,
        },
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
    const clean = codeOrImei.trim();
    // P4: deterministic newest-first + ACTIVE preferred. Previously a bare
    // findFirst over the OR could return a stale VOIDED/EXPIRED row for a
    // device that also has a live warranty, misleading staff and customers.
    const candidates = await this.prisma.warranty.findMany({
      where: {
        OR: [
          { warrantyCode: { equals: clean, mode: 'insensitive' } },
          { imeiDevice: { imei: clean } },
          { imeiDevice: { serialNumber: { equals: clean, mode: 'insensitive' } } },
        ],
      },
      include: { productVariant: { include: { product: true } }, imeiDevice: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    if (candidates.length === 0) throw new NotFoundException('Warranty not found');
    const now = new Date();
    const live = candidates.filter(
      (w) => w.status === WarrantyStatus.ACTIVE && new Date(w.endDate) >= now,
    );
    const picked = live[0] ?? candidates.find((w) => w.status === WarrantyStatus.ACTIVE) ?? candidates[0];
    // Public lookup: strip sensitive handset identifiers. Staff detail
    // paths (findOne/findAll) still return the full imeiDevice.
    return {
      ...picked,
      imeiDevice: picked.imeiDevice
        ? {
            id: picked.imeiDevice.id,
            status: picked.imeiDevice.status,
            variantId: picked.imeiDevice.variantId,
          }
        : null,
    };
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

    return this.prisma.warranty.update({
      where: { id },
      data: { status: WarrantyStatus.CLAIMED, notes: dto.reason },
    });
  }

  async voidWarranty(id: string) {
    const warranty = await this.findOne(id);
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

  // Bulk-void ACTIVE warranties when the sale dies (cancel/refund/return).
  // Runs inside the caller's transaction (tx) so coverage and money move
  // together. CLAIMED rows (handset under repair) are intentionally kept.
  async voidWarrantiesForOrder(tx: any, orderId: string): Promise<void> {
    await tx.warranty.updateMany({
      where: { orderItem: { orderId }, status: WarrantyStatus.ACTIVE },
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
