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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const CANCELLABLE_STATUSES = [client_1.OrderStatus.PENDING, client_1.OrderStatus.CONFIRMED];
let OrdersService = class OrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateOrderNumber() {
        return `ORD-${Date.now()}-${(0, crypto_1.randomBytes)(3).toString('hex').toUpperCase()}`;
    }
    async checkout(userId, dto) {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: { variant: { include: { inventory: true } } },
                },
            },
        });
        if (!cart || cart.items.length === 0) {
            throw new common_1.BadRequestException('Cart is empty');
        }
        for (const item of cart.items) {
            if (!item.variant.isActive) {
                throw new common_1.BadRequestException(`Variant ${item.variant.name} is not available`);
            }
            if (!item.variant.inventory || item.variant.inventory.availableQty < item.quantity) {
                throw new common_1.BadRequestException(`Insufficient stock for ${item.variant.name}`);
            }
        }
        const subtotal = cart.items.reduce((acc, item) => acc + Number(item.unitPrice) * item.quantity, 0);
        let discountAmount = 0;
        let voucherUsageData = null;
        if (dto.voucherCode) {
            const voucher = await this.prisma.voucher.findUnique({
                where: { code: dto.voucherCode },
            });
            if (voucher && voucher.isActive) {
                const now = new Date();
                if (voucher.startAt <= now && voucher.endAt >= now) {
                    if (voucher.type === client_1.VoucherType.PERCENTAGE) {
                        discountAmount = (subtotal * Number(voucher.value)) / 100;
                        if (voucher.maxDiscountAmount) {
                            discountAmount = Math.min(discountAmount, Number(voucher.maxDiscountAmount));
                        }
                    }
                    else if (voucher.type === client_1.VoucherType.FIXED_AMOUNT) {
                        discountAmount = Math.min(Number(voucher.value), subtotal);
                    }
                    voucherUsageData = { voucherId: voucher.id, discountAmount };
                    await this.prisma.voucher.update({
                        where: { id: voucher.id },
                        data: { usageCount: { increment: 1 } },
                    });
                }
            }
        }
        const shippingFee = 30000;
        const totalAmount = subtotal - discountAmount + shippingFee;
        const order = await this.prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    orderNumber: this.generateOrderNumber(),
                    userId,
                    addressId: dto.addressId,
                    subtotal,
                    discountAmount,
                    shippingFee,
                    taxAmount: 0,
                    totalAmount,
                    voucherCode: dto.voucherCode,
                    customerNote: dto.customerNote,
                    items: {
                        create: cart.items.map((item) => ({
                            variantId: item.variantId,
                            productName: item.variant.product?.name || item.variant.name,
                            sku: item.variant.sku,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discountAmount: 0,
                            totalPrice: Number(item.unitPrice) * item.quantity,
                        })),
                    },
                },
                include: { items: true },
            });
            if (voucherUsageData) {
                await tx.voucherUsage.create({
                    data: {
                        voucherId: voucherUsageData.voucherId,
                        userId,
                        orderId: newOrder.id,
                        discountAmount: voucherUsageData.discountAmount,
                    },
                });
            }
            for (const item of cart.items) {
                await tx.inventory.update({
                    where: { variantId: item.variantId },
                    data: {
                        reservedQty: { increment: item.quantity },
                        availableQty: { decrement: item.quantity },
                    },
                });
            }
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            return newOrder;
        });
        return order;
    }
    async findMyOrders(userId) {
        return this.prisma.order.findMany({
            where: { userId },
            include: { items: true, payments: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findMyOrder(userId, id) {
        const order = await this.prisma.order.findFirst({
            where: { id, userId },
            include: { items: { include: { variant: true } }, payments: true, address: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async findAll() {
        return this.prisma.order.findMany({
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
                items: true,
                payments: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
                items: { include: { variant: { include: { product: true } } } },
                payments: { include: { transactions: true } },
                address: true,
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async transitionStatus(id, newStatus, staffId) {
        const order = await this.findOne(id);
        const allowedTransitions = {
            [client_1.OrderStatus.PENDING]: [client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.CANCELLED],
            [client_1.OrderStatus.CONFIRMED]: [client_1.OrderStatus.PROCESSING, client_1.OrderStatus.CANCELLED],
            [client_1.OrderStatus.PROCESSING]: [client_1.OrderStatus.SHIPPING],
            [client_1.OrderStatus.SHIPPING]: [client_1.OrderStatus.DELIVERED],
            [client_1.OrderStatus.DELIVERED]: [client_1.OrderStatus.COMPLETED, client_1.OrderStatus.RETURNED],
        };
        const allowed = allowedTransitions[order.status] || [];
        if (!allowed.includes(newStatus)) {
            throw new common_1.BadRequestException(`Cannot transition from ${order.status} to ${newStatus}`);
        }
        const data = { status: newStatus };
        const now = new Date();
        if (newStatus === client_1.OrderStatus.CONFIRMED)
            data.confirmedAt = now;
        if (newStatus === client_1.OrderStatus.SHIPPING)
            data.shippedAt = now;
        if (newStatus === client_1.OrderStatus.DELIVERED)
            data.deliveredAt = now;
        if (newStatus === client_1.OrderStatus.COMPLETED)
            data.completedAt = now;
        if (newStatus === client_1.OrderStatus.CANCELLED)
            data.cancelledAt = now;
        return this.prisma.order.update({ where: { id }, data });
    }
    async cancelMyOrder(userId, id, dto) {
        const order = await this.prisma.order.findFirst({ where: { id, userId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (!CANCELLABLE_STATUSES.includes(order.status)) {
            throw new common_1.BadRequestException('Order cannot be cancelled in its current status');
        }
        const items = await this.prisma.orderItem.findMany({ where: { orderId: id } });
        await this.prisma.$transaction(items.map((item) => this.prisma.inventory.update({
            where: { variantId: item.variantId },
            data: {
                reservedQty: { decrement: item.quantity },
                availableQty: { increment: item.quantity },
            },
        })));
        return this.prisma.order.update({
            where: { id },
            data: {
                status: client_1.OrderStatus.CANCELLED,
                cancelledAt: new Date(),
                cancelledReason: dto.reason,
            },
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map