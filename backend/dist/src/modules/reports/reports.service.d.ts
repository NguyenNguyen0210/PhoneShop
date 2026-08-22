import { PrismaService } from '../../prisma/prisma.service';
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getDashboardSummary(): Promise<{
        totalOrders: number;
        pendingOrders: number;
        totalRevenue: number;
        totalUsers: number;
        totalProducts: number;
        totalLowStock: number;
    }>;
    getRevenueReport(from: Date, to: Date): Promise<{
        from: Date;
        to: Date;
        totalRevenue: number;
        dailyBreakdown: {
            date: string;
            revenue: number;
        }[];
        paymentCount: number;
    }>;
    getTopSellingProducts(limit?: number): Promise<{
        variantId: string;
        productName: string;
        variantName: string;
        sku: string;
        totalQuantitySold: number;
        totalRevenue: number;
    }[]>;
    getOrderStatusReport(): Promise<{
        status: import("@prisma/client").$Enums.OrderStatus;
        count: number;
    }[]>;
    getLowStockReport(): Promise<{
        variantId: string;
        productName: string;
        sku: string;
        availableQty: number;
        reorderLevel: number;
        deficit: number;
    }[]>;
}
