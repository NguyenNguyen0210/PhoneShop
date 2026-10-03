import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustStockDto, SetReorderLevelDto, ReserveStockDto } from './dto/inventory.dto';
import { GetStockLedgerDto } from './dto/stock-movement.dto';
import { getPagination, buildPaginatedResponse } from '../../common/utils/pagination.util';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private async getInventory(variantId: string) {
    const inv = await this.prisma.inventory.findUnique({ where: { variantId } });
    if (!inv) throw new NotFoundException('Inventory record not found for this variant');
    return inv;
  }

  async findAll(page?: number | string, limit?: number | string) {
    const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit, 20);
    const [total, data] = await Promise.all([
      this.prisma.inventory.count(),
      this.prisma.inventory.findMany({
        include: {
          variant: { include: { product: { select: { id: true, name: true } } } },
        },
        skip,
        take: safeLimit,
      }),
    ]);
    return buildPaginatedResponse(data, total, safePage, safeLimit);
  }

  async findOne(variantId: string) {
    const inv = await this.getInventory(variantId);
    return inv;
  }

  async checkStock(variantId: string) {
    const inv = await this.getInventory(variantId);
    return {
      variantId,
      availableQty: inv.availableQty,
      reservedQty: inv.reservedQty,
      inStock: inv.availableQty > 0,
    };
  }

  async getLowStockAlerts(threshold?: number) {
    // M20: Prisma cannot compare two columns in `where` — the previous
    // `lte: fields.reorderLevel` filter was invalid and crashed this endpoint.
    // An explicit threshold still filters in SQL; otherwise compare per-row.
    if (threshold !== undefined) {
      return this.prisma.inventory.findMany({
        where: { availableQty: { lte: threshold } },
        include: {
          variant: { include: { product: { select: { id: true, name: true } } } },
        },
      });
    }
    const all = await this.prisma.inventory.findMany({
      include: {
        variant: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    return all.filter((inv) => inv.availableQty <= inv.reorderLevel);
  }

  async recordMovement(
    tx: any,
    params: {
      variantId: string;
      type: StockMovementType;
      quantity: number;
      unitPrice?: number;
      referenceType?: string;
      referenceId?: string;
      performedBy?: string;
      note?: string;
    }
  ) {
    const client = tx || this.prisma;
    const inv = await client.inventory.findUnique({ where: { variantId: params.variantId } });
    if (!inv) throw new NotFoundException('Inventory not found');

    const variant = await client.productVariant.findUnique({
      where: { id: params.variantId },
      select: { costPrice: true, price: true },
    });

    const balanceBefore = inv.quantity;
    const balanceAfter = balanceBefore + params.quantity;
    if (balanceAfter < 0) {
      throw new BadRequestException('Số lượng giảm vượt quá tồn kho thực tế');
    }

    const unitPrice =
      params.unitPrice !== undefined
        ? params.unitPrice
        : Number(variant?.costPrice ?? variant?.price ?? 0);
    const totalAmount = Math.abs(params.quantity) * unitPrice;

    return client.stockMovement.create({
      data: {
        variantId: params.variantId,
        type: params.type,
        quantity: params.quantity,
        balanceBefore,
        balanceAfter,
        unitPrice,
        totalAmount,
        referenceType: params.referenceType || 'ADJUSTMENT',
        referenceId: params.referenceId,
        performedBy: params.performedBy,
        note: params.note,
      },
    });
  }

  async adjustStock(variantId: string, dto: AdjustStockDto, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { variantId } });
      if (!inv) throw new NotFoundException('Inventory record not found for this variant');

      const newQty = inv.quantity + dto.quantity;
      if (newQty < 0) throw new BadRequestException('Insufficient stock');

      const newAvailable = Math.min(Math.max(0, inv.availableQty + dto.quantity), newQty);

      const type =
        dto.quantity >= 0 ? StockMovementType.IMPORT_MANUAL : StockMovementType.EXPORT_MANUAL;

      await this.recordMovement(tx, {
        variantId,
        type,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        performedBy: userId,
        note: dto.note,
        referenceType: 'ADJUSTMENT',
      });

      const updatedInv = await tx.inventory.update({
        where: { variantId },
        data: {
          quantity: newQty,
          availableQty: newAvailable,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_STOCK',
          entity: 'inventory',
          entityId: variantId,
          userId: userId || null,
          oldData: { quantity: inv.quantity, availableQty: inv.availableQty },
          newData: { quantity: newQty, availableQty: newAvailable, note: dto.note },
        },
      });

      return updatedInv;
    });
  }

  async getLedger(dto: GetStockLedgerDto) {
    const { page = 1, limit = 10, startDate, endDate, type, search, variantId } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (variantId) where.variantId = variantId;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.variant = {
        OR: [
          { sku: { contains: term, mode: 'insensitive' } },
          { product: { name: { contains: term, mode: 'insensitive' } } },
        ],
      };
    }

    const [rawItems, total, allMovementsInPeriod] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              color: true,
              storage: true,
              price: true,
              costPrice: true,
              product: { select: { id: true, name: true, thumbnailUrl: true } },
            },
          },
          performer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        select: { type: true, quantity: true, totalAmount: true },
      }),
    ]);

    let totalInQuantity = 0;
    let totalOutQuantity = 0;
    let totalInAmount = 0;
    let totalOutAmount = 0;

    for (const mov of allMovementsInPeriod) {
      const amount = Number(mov.totalAmount);
      const qty = mov.quantity;
      if (qty > 0) {
        totalInQuantity += qty;
        totalInAmount += amount;
      } else {
        totalOutQuantity += Math.abs(qty);
        totalOutAmount += amount;
      }
    }

    const items = rawItems.map((item: any) => {
      const performer = item.performer
        ? {
            ...item.performer,
            fullName:
              item.performer.fullName ??
              ([item.performer.firstName, item.performer.lastName].filter(Boolean).join(' ') ||
                item.performer.email),
          }
        : null;

      const variant = item.variant
        ? {
            ...item.variant,
            product: item.variant.product
              ? {
                  ...item.variant.product,
                  thumbnail: item.variant.product.thumbnail ?? item.variant.product.thumbnailUrl,
                }
              : null,
          }
        : null;

      return {
        ...item,
        performer,
        variant,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalInQuantity,
        totalOutQuantity,
        totalInAmount,
        totalOutAmount,
        netAmount: totalOutAmount - totalInAmount,
        totalTransactions: total,
      },
    };
  }

  async getDailySummary(dto: { startDate?: string; endDate?: string }) {
    const where: any = {};
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(`${dto.startDate}T00:00:00.000Z`);
      if (dto.endDate) where.createdAt.lte = new Date(`${dto.endDate}T23:59:59.999Z`);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, quantity: true, totalAmount: true, type: true },
    });

    const dailyMap = new Map<
      string,
      { inQty: number; outQty: number; inAmount: number; outAmount: number }
    >();

    for (const m of movements) {
      const day = (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt))
        .toISOString()
        .slice(0, 10);

      if (!dailyMap.has(day)) {
        dailyMap.set(day, { inQty: 0, outQty: 0, inAmount: 0, outAmount: 0 });
      }
      const stat = dailyMap.get(day)!;
      const amount = Number(m.totalAmount);
      if (m.quantity > 0) {
        stat.inQty += m.quantity;
        stat.inAmount += amount;
      } else {
        stat.outQty += Math.abs(m.quantity);
        stat.outAmount += amount;
      }
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data }));
  }

  async exportLedgerCsv(dto: GetStockLedgerDto): Promise<string> {
    const res = await this.getLedger({ ...dto, page: 1, limit: 10000 });
    const headers = [
      'Mã GD',
      'Thời gian',
      'Mã chứng từ',
      'Loại biến động',
      'Tên sản phẩm',
      'SKU',
      'Màu sắc',
      'Dung lượng',
      'Số lượng',
      'Tồn trước',
      'Tồn sau',
      'Đơn giá (VNĐ)',
      'Thành tiền (VNĐ)',
      'Người thực hiện',
      'Ghi chú',
    ];

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = res.items.map((item: any) =>
      [
        escapeCsv(item.id),
        escapeCsv(new Date(item.createdAt).toLocaleString('vi-VN')),
        escapeCsv(item.referenceId || ''),
        escapeCsv(item.type),
        escapeCsv(item.variant?.product?.name || ''),
        escapeCsv(item.variant?.sku || ''),
        escapeCsv(item.variant?.color || ''),
        escapeCsv(item.variant?.storage || ''),
        item.quantity,
        item.balanceBefore,
        item.balanceAfter,
        Number(item.unitPrice),
        Number(item.totalAmount),
        escapeCsv(item.performer?.fullName || item.performer?.email || ''),
        escapeCsv(item.note || ''),
      ].join(',')
    );

    return '\uFEFF' + [headers.join(','), ...rows].join('\n');
  }

  async reserveStock(variantId: string, dto: ReserveStockDto) {
    const inv = await this.getInventory(variantId);
    if (inv.availableQty < dto.quantity) {
      throw new BadRequestException('Not enough available stock to reserve');
    }
    return this.prisma.inventory.update({
      where: { variantId },
      data: {
        reservedQty: { increment: dto.quantity },
        availableQty: { decrement: dto.quantity },
      },
    });
  }

  async releaseStock(variantId: string, dto: ReserveStockDto) {
    const inv = await this.getInventory(variantId);
    if (inv.reservedQty < dto.quantity) {
      throw new BadRequestException('Cannot release more than reserved quantity');
    }
    return this.prisma.inventory.update({
      where: { variantId },
      data: {
        reservedQty: { decrement: dto.quantity },
        availableQty: { increment: dto.quantity },
      },
    });
  }

  async setReorderLevel(variantId: string, dto: SetReorderLevelDto) {
    await this.getInventory(variantId);
    return this.prisma.inventory.update({
      where: { variantId },
      data: { reorderLevel: dto.reorderLevel },
    });
  }
}
