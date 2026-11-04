import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus, TransactionStatus, TransactionType, Prisma } from '@prisma/client';

export interface BrandSalesItem {
  brandId: string;
  brandName: string;
  logoUrl: string | null;
  quantitySold: number;
  revenue: number;
  percentage: number;
}

export interface BrandSalesReport {
  from?: string;
  to?: string;
  totalRevenue: number;
  brands: BrandSalesItem[];
}

export interface CategorySalesItem {
  categoryId: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  percentage: number;
}

export interface CategorySalesReport {
  from?: string;
  to?: string;
  totalRevenue: number;
  categories: CategorySalesItem[];
}

// Day buckets follow Asia/Ho_Chi_Minh — never UTC.
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

  private async cashflow(from?: Date, to?: Date) {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        status: TransactionStatus.SUCCESS,
        type: { in: [TransactionType.PAYMENT, TransactionType.REFUND, TransactionType.PARTIAL_REFUND] },
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
      },
      select: { amount: true, type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    let gross = new Prisma.Decimal(0);
    let refunds = new Prisma.Decimal(0);
    let paymentCount = 0;
    const days = new Map<string, { gross: Prisma.Decimal; refunds: Prisma.Decimal }>();
    for (const row of transactions) {
      const day = this.vnDay(row.createdAt);
      const bucket = days.get(day) ?? { gross: new Prisma.Decimal(0), refunds: new Prisma.Decimal(0) };
      if (row.type === TransactionType.PAYMENT) {
        gross = gross.plus(row.amount); bucket.gross = bucket.gross.plus(row.amount); paymentCount++;
      } else {
        refunds = refunds.plus(row.amount); bucket.refunds = bucket.refunds.plus(row.amount);
      }
      days.set(day, bucket);
    }
    return {
      totalRevenue: gross.toNumber(), refundedTotal: refunds.toNumber(),
      netRevenue: gross.minus(refunds).toNumber(), paymentCount,
      dailyBreakdown: [...days].map(([date, bucket]) => ({
        date, revenue: bucket.gross.minus(bucket.refunds).toNumber(),
        grossRevenue: bucket.gross.toNumber(), refundedTotal: bucket.refunds.toNumber(),
        netRevenue: bucket.gross.minus(bucket.refunds).toNumber(),
      })),
    };
  }

  async getDashboardSummary() {
    const [totalOrders, pendingOrders, money, totalUsers, totalProducts, inventories] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.cashflow(), this.prisma.user.count(), this.prisma.product.count(),
      this.prisma.inventory.findMany({ select: { availableQty: true, reorderLevel: true } }),
    ]);
    return {
      totalOrders, pendingOrders, totalRevenue: money.totalRevenue,
      refundedTotal: money.refundedTotal, netRevenue: money.netRevenue,
      totalUsers, totalProducts,
      totalLowStock: inventories.filter((i) => i.availableQty <= i.reorderLevel).length,
    };
  }

  async getRevenueReport(fromInput: string, toInput: string) {
    const from = new Date(`${fromInput}T00:00:00+07:00`);
    const to = new Date(`${toInput}T23:59:59.999+07:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromInput) || !/^\d{4}-\d{2}-\d{2}$/.test(toInput) ||
      isNaN(from.getTime()) || isNaN(to.getTime()) ||
      this.vnDay(from) !== fromInput || this.vnDay(to) !== toInput || from > to) {
      throw new BadRequestException('Invalid date range (expected valid YYYY-MM-DD days, from <= to)');
    }
    return { from: fromInput, to: toInput, timeZone: VN_TIME_ZONE, ...await this.cashflow(from, to) };
  }

  async getBrandSalesReport(fromInput?: string, toInput?: string): Promise<BrandSalesReport> {
    const from = fromInput?.trim();
    const to = toInput?.trim();
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (from || to) {
      if (!from || !to) {
        throw new BadRequestException('Both "from" and "to" must be provided');
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(from) || !dateRegex.test(to)) {
        throw new BadRequestException('Invalid date format (expected YYYY-MM-DD)');
      }
      fromDate = new Date(`${from}T00:00:00+07:00`);
      toDate = new Date(`${to}T23:59:59.999+07:00`);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid date range (expected YYYY-MM-DD)');
      }
      if (fromDate > toDate) {
        throw new BadRequestException('"from" must not be after "to"');
      }
    }

    const rows: Array<{
      brandId: string;
      brandName: string;
      logoUrl: string | null;
      quantitySold: number;
      revenue: number | string;
    }> =
      fromDate && toDate
        ? await this.prisma.$queryRaw`
            SELECT
              b.id AS "brandId",
              b.name AS "brandName",
              b.logo_url AS "logoUrl",
              SUM(oi.quantity)::int AS "quantitySold",
              SUM(oi.total_price)::numeric AS revenue
            FROM brands b
            JOIN products p ON p.brand_id = b.id
            JOIN product_variants pv ON pv.product_id = p.id
            JOIN order_items oi ON oi.variant_id = pv.id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status IN ('DELIVERED', 'COMPLETED')
              AND o.created_at >= ${fromDate}
              AND o.created_at <= ${toDate}
            GROUP BY b.id, b.name, b.logo_url
            ORDER BY revenue DESC
          `
        : await this.prisma.$queryRaw`
            SELECT
              b.id AS "brandId",
              b.name AS "brandName",
              b.logo_url AS "logoUrl",
              SUM(oi.quantity)::int AS "quantitySold",
              SUM(oi.total_price)::numeric AS revenue
            FROM brands b
            JOIN products p ON p.brand_id = b.id
            JOIN product_variants pv ON pv.product_id = p.id
            JOIN order_items oi ON oi.variant_id = pv.id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status IN ('DELIVERED', 'COMPLETED')
            GROUP BY b.id, b.name, b.logo_url
            ORDER BY revenue DESC
          `;

    const totalRevenue = rows.reduce((acc, r) => acc + Number(r.revenue ?? 0), 0);

    const brands: BrandSalesItem[] = rows.map((r) => {
      const rev = Number(r.revenue ?? 0);
      const percentage =
        totalRevenue > 0 ? Number(((rev / totalRevenue) * 100).toFixed(1)) : 0;
      return {
        brandId: r.brandId,
        brandName: r.brandName,
        logoUrl: r.logoUrl ?? null,
        quantitySold: Number(r.quantitySold ?? 0),
        revenue: rev,
        percentage,
      };
    });

    return {
      from: from || undefined,
      to: to || undefined,
      totalRevenue,
      brands,
    };
  }

  async getCategorySalesReport(fromInput?: string, toInput?: string): Promise<CategorySalesReport> {
    const from = fromInput?.trim();
    const to = toInput?.trim();
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (from || to) {
      if (!from || !to) {
        throw new BadRequestException('Both "from" and "to" must be provided');
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(from) || !dateRegex.test(to)) {
        throw new BadRequestException('Invalid date format (expected YYYY-MM-DD)');
      }
      fromDate = new Date(`${from}T00:00:00+07:00`);
      toDate = new Date(`${to}T23:59:59.999+07:00`);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid date range (expected YYYY-MM-DD)');
      }
      if (fromDate > toDate) {
        throw new BadRequestException('"from" must not be after "to"');
      }
    }

    const rows: Array<{
      categoryId: string;
      categoryName: string;
      quantitySold: number;
      revenue: number | string;
    }> =
      fromDate && toDate
        ? await this.prisma.$queryRaw`
            SELECT
              c.id AS "categoryId",
              c.name AS "categoryName",
              SUM(oi.quantity)::int AS "quantitySold",
              SUM(oi.total_price)::numeric AS revenue
            FROM categories c
            JOIN products p ON p.category_id = c.id
            JOIN product_variants pv ON pv.product_id = p.id
            JOIN order_items oi ON oi.variant_id = pv.id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status IN ('DELIVERED', 'COMPLETED')
              AND o.created_at >= ${fromDate}
              AND o.created_at <= ${toDate}
            GROUP BY c.id, c.name
            ORDER BY revenue DESC
          `
        : await this.prisma.$queryRaw`
            SELECT
              c.id AS "categoryId",
              c.name AS "categoryName",
              SUM(oi.quantity)::int AS "quantitySold",
              SUM(oi.total_price)::numeric AS revenue
            FROM categories c
            JOIN products p ON p.category_id = c.id
            JOIN product_variants pv ON pv.product_id = p.id
            JOIN order_items oi ON oi.variant_id = pv.id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status IN ('DELIVERED', 'COMPLETED')
            GROUP BY c.id, c.name
            ORDER BY revenue DESC
          `;

    const totalRevenue = rows.reduce((acc, r) => acc + Number(r.revenue ?? 0), 0);

    const categories: CategorySalesItem[] = rows.map((r) => {
      const rev = Number(r.revenue ?? 0);
      const percentage =
        totalRevenue > 0 ? Number(((rev / totalRevenue) * 100).toFixed(1)) : 0;
      return {
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        quantitySold: Number(r.quantitySold ?? 0),
        revenue: rev,
        percentage,
      };
    });

    return {
      from: from || undefined,
      to: to || undefined,
      totalRevenue,
      categories,
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
        WHERE o.status IN ('DELIVERED', 'COMPLETED')
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
