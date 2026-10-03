import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustStockDto, SetReorderLevelDto, ReserveStockDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private async getInventory(variantId: string) {
    const inv = await this.prisma.inventory.findUnique({ where: { variantId } });
    if (!inv) throw new NotFoundException('Inventory record not found for this variant');
    return inv;
  }

  async findAll() {
    return this.prisma.inventory.findMany({
      include: {
        variant: { include: { product: { select: { id: true, name: true } } } },
      },
    });
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

  async adjustStock(variantId: string, dto: AdjustStockDto) {
    const inv = await this.getInventory(variantId);
    const newQty = inv.quantity + dto.quantity;

    if (newQty < 0) throw new BadRequestException('Insufficient stock');

    // Available can never exceed physical quantity on hand.
    const newAvailable = Math.min(Math.max(0, inv.availableQty + dto.quantity), newQty);

    return this.prisma.inventory.update({
      where: { variantId },
      data: {
        quantity: newQty,
        availableQty: newAvailable,
      },
    });
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
