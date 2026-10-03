import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

// Persistent safety net for 15-minute checkout holds.
//
// Why this exists (proven live on 2026-10-03): two PENDING orders with
// long-expired holds sat unreleased because (a) REDIS_ENABLED is unset so
// BullMQ jobs are silently dropped by the local queue fallback, and (b) the
// in-process setTimeout fallback dies on server restart. Neither layer
// survives a deploy/restart — only a recurring, persistent check does.
//
// The sweep is fully guarded: OrdersService.releaseExpiredHold() cancels
// exclusively still-PENDING orders (conditional updateMany) with
// status-filtered IMEI/inventory release + voucher rollback, so overlapping
// runs, user cancels, and staff cancels can never double-release.
@Injectable()
export class HoldExpirySweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HoldExpirySweeper.name);
  private timer: NodeJS.Timeout | null = null;

  // Sweep often enough that an expired hold never blocks stock for long,
  // rarely enough to be noise-free on the DB (single indexed query).
  private static readonly SWEEP_INTERVAL_MS = 60_000;
  private static readonly STARTUP_DELAY_MS = 10_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  onModuleInit() {
    // First sweep shortly after boot (catches holds that expired while down),
    // then on a fixed interval. unref: never keep the process alive alone.
    const boot = setTimeout(() => this.sweep().catch(() => undefined), HoldExpirySweeper.STARTUP_DELAY_MS);
    if (typeof (boot as any)?.unref === 'function') (boot as any).unref();
    this.timer = setInterval(() => {
      this.sweep().catch((err) => this.logger.error(`Hold sweep failed: ${err?.message}`));
    }, HoldExpirySweeper.SWEEP_INTERVAL_MS);
    if (typeof (this.timer as any)?.unref === 'function') (this.timer as any).unref();
    this.logger.log('Hold-expiry sweeper started (60s interval)');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(): Promise<number> {
    const expired = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING, holdExpiresAt: { lt: new Date() } },
      select: { id: true, orderNumber: true },
    });
    let released = 0;
    for (const o of expired) {
      try {
        if (await this.ordersService.releaseExpiredHold(o.id)) released++;
      } catch (err: any) {
        this.logger.error(`Failed releasing hold for order ${o.orderNumber}: ${err?.message}`);
      }
    }
    if (released > 0) {
      this.logger.log(`Hold sweep released ${released}/${expired.length} expired hold(s)`);
    }
    return released;
  }
}
