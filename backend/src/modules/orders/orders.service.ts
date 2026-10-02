import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, CancelOrderDto } from './dto/order.dto';
import { OrderStatus, VoucherType, ImeiStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('order-queue') private readonly orderQueue: Queue,
  ) {}

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  async checkout(userId: string, dto: CreateOrderDto) {
    // 1. Get cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: { inventory: true, product: { select: { name: true } } },
            },
          },
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
      (acc, item) => acc + Number(item.unitPrice) * item.quantity,
      0,
    );

    const shippingFee = 30000; // 30,000 VND flat rate
    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes hold

    // 4. Atomic transaction with IMEI reservation, voucher validation, and inventory deduction
    const order = await this.prisma.$transaction(async (tx) => {
      // Voucher validation inside transaction
      let discountAmount = 0;
      let voucherUsageData: { voucherId: string; discountAmount: number } | null = null;

      if (dto.voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: { code: dto.voucherCode },
        });

        if (!voucher) {
          throw new BadRequestException('Voucher not found');
        }
        if (!voucher.isActive) {
          throw new BadRequestException('Voucher is not active');
        }

        const now = new Date();
        if (voucher.startAt > now) {
          throw new BadRequestException('Voucher is not yet valid');
        }
        if (voucher.endAt < now) {
          throw new BadRequestException('Voucher has expired');
        }
        if (
          voucher.usageLimit !== null &&
          voucher.usageLimit !== undefined &&
          voucher.usageCount >= voucher.usageLimit
        ) {
          throw new BadRequestException('Voucher usage limit reached');
        }
        if (voucher.minOrderValue && subtotal < Number(voucher.minOrderValue)) {
          throw new BadRequestException(
            `Minimum order value is ${voucher.minOrderValue}`,
          );
        }
        if (voucher.perUserLimit) {
          const userUsage = await tx.voucherUsage.count({
            where: { voucherId: voucher.id, userId },
          });
          if (userUsage >= voucher.perUserLimit) {
            throw new BadRequestException(
              'You have reached the per-user usage limit',
            );
          }
        }

        if (voucher.type === VoucherType.PERCENTAGE) {
          discountAmount = (subtotal * Number(voucher.value)) / 100;
          if (voucher.maxDiscountAmount) {
            discountAmount = Math.min(
              discountAmount,
              Number(voucher.maxDiscountAmount),
            );
          }
        } else if (
          voucher.type === VoucherType.FIXED_AMOUNT ||
          voucher.type === VoucherType.FREE_SHIPPING
        ) {
          discountAmount = Math.min(Number(voucher.value), subtotal);
        }

        voucherUsageData = { voucherId: voucher.id, discountAmount };

        await tx.voucher.update({
          where: { id: voucher.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

      const orderItemsCreateData: Array<{
        variantId: string;
        productName: string;
        sku: string;
        quantity: number;
        unitPrice: any;
        discountAmount: number;
        totalPrice: number;
        imeiDeviceId: string;
      }> = [];

      for (const item of cart.items) {
        // Atomic row-level locking for available IMEIs
        const availableImeis: Array<{ id: string }> = await tx.$queryRaw`
          SELECT id FROM imei_devices
          WHERE variant_id = ${item.variantId}::uuid AND status = 'AVAILABLE'
          LIMIT ${item.quantity}
          FOR UPDATE SKIP LOCKED
        `;

        if (availableImeis.length < item.quantity) {
          throw new BadRequestException(
            `Not enough available IMEIs for variant ${item.variantId}`,
          );
        }

        // Mark those IMEIs as RESERVED
        const imeiIds = availableImeis.map((x) => x.id);
        await tx.imeiDevice.updateMany({
          where: { id: { in: imeiIds } },
          data: { status: ImeiStatus.RESERVED },
        });

        // Link reserved IMEIs to order items
        for (const imei of availableImeis) {
          orderItemsCreateData.push({
            variantId: item.variantId,
            productName: (item.variant as any).product?.name || item.variant.name,
            sku: item.variant.sku,
            quantity: 1,
            unitPrice: item.unitPrice,
            discountAmount: 0,
            totalPrice: Number(item.unitPrice),
            imeiDeviceId: imei.id,
          });
        }

        // Adjust inventory
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            reservedQty: { increment: item.quantity },
            availableQty: { decrement: item.quantity },
          },
        });
      }

      // Create Order
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
          holdExpiresAt,
          items: {
            create: orderItemsCreateData,
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

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    // 6. Push BullMQ job for 15-minute hold auto-release
    try {
      await this.orderQueue.add(
        'expire-order-hold',
        { orderId: order.id },
        { delay: 15 * 60 * 1000 },
      );
      this.logger.log(`Enqueued 15m hold expiry job for order ${order.id}`);
    } catch (queueErr) {
      this.logger.error(
        `Failed to enqueue expire-order-hold job for order ${order.id}:`,
        (queueErr as Error).message,
      );
    }

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

    return this.prisma.$transaction(async (tx) => {
      // When transitioning from CONFIRMED or PENDING to CANCELLED: release reserved IMEIs back to AVAILABLE and restore inventory availableQty
      if (
        newStatus === OrderStatus.CANCELLED &&
        (order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED)
      ) {
        for (const item of order.items) {
          if (item.imeiDeviceId) {
            await tx.imeiDevice.updateMany({
              where: { id: item.imeiDeviceId, status: ImeiStatus.RESERVED },
              data: { status: ImeiStatus.AVAILABLE },
            });
          }
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: {
              reservedQty: { decrement: item.quantity },
              availableQty: { increment: item.quantity },
            },
          });
        }
      }

      // When transitioning order to DELIVERED or COMPLETED: update all assigned IMEIs to SOLD and set soldAt: new Date()
      if (newStatus === OrderStatus.DELIVERED || newStatus === OrderStatus.COMPLETED) {
        const imeiIds = order.items
          .map((item) => item.imeiDeviceId)
          .filter((imeiId): imeiId is string => Boolean(imeiId));

        if (imeiIds.length > 0) {
          await tx.imeiDevice.updateMany({
            where: { id: { in: imeiIds } },
            data: {
              status: ImeiStatus.SOLD,
              soldAt: now,
            },
          });
        }
      }

      return tx.order.update({ where: { id }, data });
    });
  }

  async cancelMyOrder(userId: string, id: string, dto: CancelOrderDto) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
    if (!order) throw new NotFoundException('Order not found');

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled in its current status');
    }

    // Release reserved stock & IMEIs
    const items = await this.prisma.orderItem.findMany({ where: { orderId: id } });
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.imeiDeviceId) {
          await tx.imeiDevice.updateMany({
            where: { id: item.imeiDeviceId, status: ImeiStatus.RESERVED },
            data: { status: ImeiStatus.AVAILABLE },
          });
        }
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            reservedQty: { decrement: item.quantity },
            availableQty: { increment: item.quantity },
          },
        });
      }

      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledReason: dto.reason,
        },
      });
    });

    return this.prisma.order.findUnique({ where: { id } });
  }
}
