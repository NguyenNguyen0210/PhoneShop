"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardSummary() {
        const [totalOrders, pendingOrders, totalRevenue, totalUsers, totalProducts, totalLowStock,] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.order.count({ where: { status: client_1.OrderStatus.PENDING } }),
            this.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: client_1.PaymentStatus.PAID },
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
    async getRevenueReport(from, to) {
        const payments = await this.prisma.payment.findMany({
            where: {
                status: client_1.PaymentStatus.PAID,
                paidAt: { gte: from, lte: to },
            },
            select: {
                amount: true,
                paidAt: true,
                method: true,
            },
            orderBy: { paidAt: 'asc' },
        });
        const byDate = {};
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map