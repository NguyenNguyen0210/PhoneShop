import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus, RefundStatus } from '@prisma/client';

// M11: all money figures in this service are NET (paid minus completed
// refunds) and day buckets follow Asia/Ho_Chi_Minh — never UTC.
const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const vnDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private vnDay(d: Date): string {
    return vnDayFormatter.format(d);
  }

  private async completedRefundsTotal(from?: Date, to?: Date): Promise<number> {
    const where: any = { status: RefundStatus.COMPLETED };
    if (from || to) {
      where.processedAt = {};
      if (from) where.processedAt.gte = from;
      if (to) where.processedAt.lte = to;
    }
    const agg = await this.prisma.refund.aggregate({
      _sum: { amount: true },
      where,
    });
    return Number(agg._sum.amount ?? 0);
  }

  async getDashboardSummary() {
    const [
      totalOrders,
      pendingOrders,
      totalRevenue,
      totalUsers,
      totalProducts,
      inventories,
      refundedTotal,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.PAID },
      }),
      this.prisma.user.count(),
      this.prisma.product.count(),
      // M11/M20: Prisma cannot compare two columns in `where`, so the
      // previous `lte: fields.reorderLevel` filter was invalid — filter the
      // fetched rows in code instead (same as getLowStockReport).
      this.prisma.inventory.findMany({
        select: { availableQty: true, reorderLevel: true },
      }),
      this.completedRefundsTotal(),
    ]);

    return {
      totalOrders,
      pendingOrders,
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      refundedTotal,
      netRevenue: Number(totalRevenue._sum.amount ?? 0) - refundedTotal,
      totalUsers,
      totalProducts,
      totalLowStock: inventories.filter((i) => i.availableQty <= i.reorderLevel).length,
    };
  }

  async getRevenueReport(fromInput: string, toInput: string) {
    // M11: interpret the range as Ho_Chi_Minh calendar days (the old code
    // parsed YYYY-MM-DD as UTC midnight = 07:00 local, silently dropping a
    // day-boundary slice) and validate it.
    const from = new Date(`${fromInput}T00:00:00+07:00`);
    const to = new Date(`${toInput}T23:59:59.999+07:00`);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range (expected YYYY-MM-DD)');
    }
    if (from > to) {
      throw new BadRequestException('"from" must not be after "to"');
    }

    const [payments, refundedTotal] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: from, lte: to },
        },
        select: {
          amount: true,
          paidAt: true,
          method: true,
        },
        orderBy: { paidAt: 'asc' },
      }),
      this.completedRefundsTotal(from, to),
    ]);

    // Group by VN-local date
    const byDate: Record<string, number> = {};
    for (const p of payments) {
      const day = p.paidAt ? this.vnDay(p.paidAt) : 'unknown';
      byDate[day] = (byDate[day] ?? 0) + Number(p.amount);
    }

    const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    return {
      from: fromInput,
      to: toInput,
      timeZone: VN_TIME_ZONE,
      totalRevenue,
      refundedTotal,
      netRevenue: totalRevenue - refundedTotal,
      dailyBreakdown: Object.entries(byDate).map(([date, revenue]) => ({ date, revenue })),
      paymentCount: payments.length,
    };
  }

  async getTopSellingProducts(limit = 10) {
    // M11: cancelled orders never sold anything — exclude them. Prisma
    // groupBy cannot filter on the joined order, so this uses one raw query.
    const rows: Array<{ variantId: string; qty: number; revenue: number }> =
      await this.prisma.$queryRaw`
        SELECT oi.variant_id AS "variantId",
               SUM(oi.quantity)::int AS qty,
               SUM(oi.total_price) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status <> 'CANCELLED'
        GROUP BY oi.variant_id
        ORDER BY qty DESC
        LIMIT ${Math.min(100, Math.max(1, Math.floor(limit) || 10))}
      `;

    const variantIds = rows.map((r) => r.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { name: true } } },
    });

    return rows.map((r) => {
      const variant = variants.find((v) => v.id === r.variantId);
      return {
        variantId: r.variantId,
        productName: variant?.product.name ?? 'Unknown',
        variantName: variant?.name ?? 'Unknown',
        sku: variant?.sku ?? '',
        totalQuantitySold: Number(r.qty ?? 0),
        totalRevenue: Number(r.revenue ?? 0),
      };
    });
  }

  async getOrderStatusReport() {
    const statuses = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    return statuses.map((s) => ({ status: s.status, count: s._count._all }));
  }

  async getLowStockReport() {
    const lowStock = await this.prisma.inventory.findMany({
      include: {
        variant: { include: { product: { select: { name: true, id: true } } } },
      },
      orderBy: { availableQty: 'asc' },
    });

    return lowStock
      .filter((inv) => inv.availableQty <= inv.reorderLevel)
      .map((inv) => ({
        variantId: inv.variantId,
        productName: inv.variant.product.name,
        sku: inv.variant.sku,
        availableQty: inv.availableQty,
        reorderLevel: inv.reorderLevel,
        deficit: inv.reorderLevel - inv.availableQty,
      }));
  }
}
