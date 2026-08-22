import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDashboard(): Promise<{
        totalOrders: number;
        pendingOrders: number;
        totalRevenue: number;
        totalUsers: number;
        totalProducts: number;
        totalLowStock: number;
    }>;
    getRevenue(from: string, to: string): Promise<{
        from: Date;
        to: Date;
        totalRevenue: number;
        dailyBreakdown: {
            date: string;
            revenue: number;
        }[];
        paymentCount: number;
    }>;
    getTopProducts(limit?: string): Promise<{
        variantId: string;
        productName: string;
        variantName: string;
        sku: string;
        totalQuantitySold: number;
        totalRevenue: number;
    }[]>;
    getOrderStatus(): Promise<{
        status: import("@prisma/client").$Enums.OrderStatus;
        count: number;
    }[]>;
    getLowStock(): Promise<{
        variantId: string;
        productName: string;
        sku: string;
        availableQty: number;
        reorderLevel: number;
        deficit: number;
    }[]>;
}
