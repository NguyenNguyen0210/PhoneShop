import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Periodically check for unpaid online orders whose reservation hold has expired.
   * Runs every minute.
   * Only targets orders in PENDING status with holdExpiresAt <= NOW().
   * COD orders (holdExpiresAt = null) are untouched.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredHolds() {
    const now = new Date();
    try {
      const expiredOrders = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING,
          holdExpiresAt: {
            not: null,
            lte: now,
          },
        },
        include: {
          items: true,
        },
        take: 50,
      });

      if (!expiredOrders || expiredOrders.length === 0) {
        return;
      }

      this.logger.log(
        `[Hold Expiry Sweep] Found ${expiredOrders.length} expired order hold(s) to release.`,
      );

      for (const order of expiredOrders) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const released = await this.ordersService.releaseOrderReservation(
              tx,
              order,
              {
                reason: 'Hold expired (15 minutes timeout - auto released by system)',
                allowedCurrentStatuses: [OrderStatus.PENDING],
              },
            );
            if (released) {
              this.logger.log(
                `[Hold Expiry Sweep] Successfully released hold and cancelled order ${order.orderNumber || order.id}`,
              );
            }
          });
        } catch (orderErr: any) {
          this.logger.error(
            `[Hold Expiry Sweep] Failed to release hold for order ${order.id}: ${orderErr.message}`,
            orderErr.stack,
          );
        }
      }
    } catch (sweepErr: any) {
      this.logger.error(
        `[Hold Expiry Sweep] Error querying expired holds: ${sweepErr.message}`,
        sweepErr.stack,
      );
    }
  }
}
