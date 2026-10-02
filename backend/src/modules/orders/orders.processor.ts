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

    // Order is still PENDING -> Cancel order, release IMEIs, restore inventory
    await this.prisma.$transaction(async (tx) => {
      // 1. Mark order as CANCELLED
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledReason: 'Hold expired (15 minutes)',
        },
      });

      // 2. Release all reserved IMEIs and restore inventory
      for (const item of order.items) {
        if (item.imeiDeviceId) {
          await tx.imeiDevice.update({
            where: { id: item.imeiDeviceId },
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

    this.logger.log(
      `Successfully cancelled order ${orderId} and released reserved stock/IMEIs.`,
    );
  }
}
