import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, CancelOrderDto } from './dto/order.dto';
import { OrderStatus, VoucherType } from '@prisma/client';
import { randomBytes } from 'crypto';

const CANCELLABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  async checkout(userId: string, dto: CreateOrderDto) {
    // 1. Get cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { variant: { include: { inventory: true } } },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Verify stock
    for (const item of cart.items) {
      if (!item.variant.isActive) {
        throw new BadRequestException(`Variant ${item.variant.name} is not available`);
      }
      if (!item.variant.inventory || item.variant.inventory.availableQty < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.variant.name}`);
      }
    }

    // 3. Calculate subtotal
    const subtotal = cart.items.reduce(
      (acc, item) => acc + Number(item.unitPrice) * item.quantity, 0,
    );

    // 4. Apply voucher
    let discountAmount = 0;
    let voucherUsageData: any = null;

    if (dto.voucherCode) {
      const voucher = await this.prisma.voucher.findUnique({
        where: { code: dto.voucherCode },
      });
      if (voucher && voucher.isActive) {
        const now = new Date();
        if (voucher.startAt <= now && voucher.endAt >= now) {
          if (voucher.type === VoucherType.PERCENTAGE) {
            discountAmount = (subtotal * Number(voucher.value)) / 100;
            if (voucher.maxDiscountAmount) {
              discountAmount = Math.min(discountAmount, Number(voucher.maxDiscountAmount));
            }
          } else if (voucher.type === VoucherType.FIXED_AMOUNT) {
            discountAmount = Math.min(Number(voucher.value), subtotal);
          }
          voucherUsageData = { voucherId: voucher.id, discountAmount };
          await this.prisma.voucher.update({
            where: { id: voucher.id },
            data: { usageCount: { increment: 1 } },
          });
        }
      }
    }

    const shippingFee = 30000; // 30,000 VND flat rate
    const totalAmount = subtotal - discountAmount + shippingFee;

    // 5. Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId,
          addressId: dto.addressId,
          subtotal,
          discountAmount,
          shippingFee,
          taxAmount: 0,
          totalAmount,
          voucherCode: dto.voucherCode,
          customerNote: dto.customerNote,
          items: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              productName: (item.variant as any).product?.name || item.variant.name,
              sku: item.variant.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: 0,
              totalPrice: Number(item.unitPrice) * item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Record voucher usage
      if (voucherUsageData) {
        await tx.voucherUsage.create({
          data: {
            voucherId: voucherUsageData.voucherId,
            userId,
            orderId: newOrder.id,
            discountAmount: voucherUsageData.discountAmount,
          },
        });
      }

      // Reserve stock
      for (const item of cart.items) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            reservedQty: { increment: item.quantity },
            availableQty: { decrement: item.quantity },
          },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    return order;
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyOrder(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: { include: { variant: true } }, payments: true, address: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { include: { variant: { include: { product: true } } } },
        payments: { include: { transactions: true } },
        address: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async transitionStatus(id: string, newStatus: OrderStatus, staffId?: string) {
    const order = await this.findOne(id);

    const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]:    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]:  [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPING],
      [OrderStatus.SHIPPING]:   [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]:  [OrderStatus.COMPLETED, OrderStatus.RETURNED],
    };

    const allowed = allowedTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}`,
      );
    }

    const data: any = { status: newStatus };
    const now = new Date();
    if (newStatus === OrderStatus.CONFIRMED)  data.confirmedAt  = now;
    if (newStatus === OrderStatus.SHIPPING)   data.shippedAt    = now;
    if (newStatus === OrderStatus.DELIVERED)  data.deliveredAt  = now;
    if (newStatus === OrderStatus.COMPLETED)  data.completedAt  = now;
    if (newStatus === OrderStatus.CANCELLED)  data.cancelledAt  = now;

    return this.prisma.order.update({ where: { id }, data });
  }

  async cancelMyOrder(userId: string, id: string, dto: CancelOrderDto) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
    if (!order) throw new NotFoundException('Order not found');

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled in its current status');
    }

    // Release reserved stock
    const items = await this.prisma.orderItem.findMany({ where: { orderId: id } });
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.inventory.update({
          where: { variantId: item.variantId },
          data: {
            reservedQty: { decrement: item.quantity },
            availableQty: { increment: item.quantity },
          },
        }),
      ),
    );

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledReason: dto.reason,
      },
    });
  }
}
