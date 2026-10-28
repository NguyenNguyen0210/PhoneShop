import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { rollbackFlashSoldCount } from './flash-sale-rollback.util';
import { OrderStatus, ImeiStatus, PaymentStatus } from '@prisma/client';

export interface ExpireOrderHoldJobData {
  orderId: string;
}

@Processor('order-queue')
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly emailService?: EmailService,
  ) {
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
      include: {
        items: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found, skipping hold expiry`);
      return;
    }

    if (order.holdExpiresAt && order.holdExpiresAt.getTime() > Date.now()) {
      this.logger.log(
        `Order ${orderId} hold has not expired yet (expires at ${order.holdExpiresAt.toISOString()}). Skipping hold expiry.`,
      );
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

      // Close still-pending payments so the expired order keeps no live rows.
      if (tx.payment?.updateMany) {
        await tx.payment.updateMany({
          where: { orderId, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.CANCELLED },
        });
      }

      // H2: give the voucher use back together with the stock release
      if ((order as any).voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: { code: (order as any).voucherCode },
          select: { id: true },
        });
        if (voucher) {
          await tx.voucher.updateMany({
            where: { id: voucher.id, usageCount: { gt: 0 } },
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
        await tx.inventory.updateMany({
          where: { variantId: item.variantId, reservedQty: { gte: item.quantity } },
          data: {
            reservedQty: { decrement: item.quantity },
            availableQty: { increment: item.quantity },
          },
        });
      }

      // Audit A3: the BullMQ expiry path is the PRIMARY release path when
      // Redis is enabled, and the sweeper never revisits a non-PENDING order.
      // Without this call every abandoned checkout permanently ate its
      // flash-sale slots (soldCount never rolled back).
      await rollbackFlashSoldCount(tx, order.items, order.createdAt);
    });

    if (cancelled) {
      this.logger.log(
        `Successfully cancelled order ${orderId} and released reserved stock/IMEIs.`,
      );
      if (this.emailService && (order as any).user?.email) {
        try {
          const u = (order as any).user;
          const recipientName =
            [u.firstName, u.lastName].filter(Boolean).join(' ') || undefined;
          const holdReason = 'Đã quá thời gian chờ hoàn tất thanh toán';

          await this.emailService.sendOrderCancelled(u.email, {
            orderNumber: order.orderNumber,
            recipientName,
            cancelledReason: holdReason,
            voucherRestored: Boolean((order as any).voucherCode),
          });
        } catch (emailErr) {
          this.logger.warn(
            `Failed to send hold expired cancellation email in processor for order ${orderId}: ${(emailErr as Error).message}`,
          );
        }
      }
    } else {
      this.logger.log(
        `Order ${orderId} was already updated before hold expiry. Skipping hold expiry.`,
      );
    }
  }
}
