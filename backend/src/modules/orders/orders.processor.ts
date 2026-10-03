import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, ImeiStatus } from '@prisma/client';

export interface ExpireOrderHoldJobData {
  orderId: string;
}

@Processor('order-queue')
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ExpireOrderHoldJobData, any, string>): Promise<any> {
    this.logger.log(`Processing job: ${job.name} [ID: ${job.id}]`);

    if (job.name === 'expire-order-hold') {
      return this.handleExpireOrderHold(job.data.orderId);
    }
  }

  private async handleExpireOrderHold(orderId: string) {
    this.logger.log(`Checking hold expiry for order: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found, skipping hold expiry`);
      return;
    }

    if (order.status !== OrderStatus.PENDING) {
      this.logger.log(
        `Order ${orderId} has status ${order.status} (not PENDING). No hold expiry needed.`,
      );
      return;
    }

    // Atomic cancellation and release inside transaction
    let cancelled = false;
    await this.prisma.$transaction(async (tx) => {
      const affected = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledReason: 'Hold expired (15 minutes)',
        },
      });
      if (affected.count === 0) return; // Order was already confirmed, paid, or cancelled
      cancelled = true;

      // H2: give the voucher use back together with the stock release
      if ((order as any).voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: { code: (order as any).voucherCode },
          select: { id: true },
        });
        if (voucher) {
          await tx.voucher.update({
            where: { id: voucher.id },
            data: { usageCount: { decrement: 1 } },
          });
        }
        await tx.voucherUsage.deleteMany({ where: { orderId } });
      }

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
    });

    if (cancelled) {
      this.logger.log(
        `Successfully cancelled order ${orderId} and released reserved stock/IMEIs.`,
      );
    } else {
      this.logger.log(
        `Order ${orderId} was already updated before hold expiry. Skipping hold expiry.`,
      );
    }
  }
}
