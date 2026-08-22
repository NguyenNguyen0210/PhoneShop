import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary() {
    const [
      totalOrders,
      pendingOrders,
      totalRevenue,
      totalUsers,
      totalProducts,
      totalLowStock,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.PAID },
      }),
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.inventory.count({
        where: { availableQty: { lte: this.prisma.inventory.fields.reorderLevel } },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      totalUsers,
      totalProducts,
      totalLowStock,
    };
  }

  async getRevenueReport(from: Date, to: Date) {
    const payments = await this.prisma.payment.findMany({
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
    });

    // Group by date
    const byDate: Record<string, number> = {};
    for (const p of payments) {
      const day = p.paidAt?.toISOString().split('T')[0] ?? 'unknown';
      byDate[day] = (byDate[day] ?? 0) + Number(p.amount);
    }

    const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    return {
      from,
      to,
      totalRevenue,
      dailyBreakdown: Object.entries(byDate).map(([date, revenue]) => ({ date, revenue })),
      paymentCount: payments.length,
    };
  }

  async getTopSellingProducts(limit = 10) {
    const result = await this.prisma.orderItem.groupBy({
      by: ['variantId'],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const variantIds = result.map((r) => r.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { name: true } } },
    });

    return result.map((r) => {
      const variant = variants.find((v) => v.id === r.variantId);
      return {
        variantId: r.variantId,
        productName: variant?.product.name ?? 'Unknown',
        variantName: variant?.name ?? 'Unknown',
        sku: variant?.sku ?? '',
        totalQuantitySold: r._sum.quantity ?? 0,
        totalRevenue: Number(r._sum.totalPrice ?? 0),
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
