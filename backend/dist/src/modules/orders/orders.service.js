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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const CANCELLABLE_STATUSES = [
    client_1.OrderStatus.PENDING,
    client_1.OrderStatus.CONFIRMED,
];
let OrdersService = OrdersService_1 = class OrdersService {
    prisma;
    orderQueue;
    logger = new common_1.Logger(OrdersService_1.name);
    constructor(prisma, orderQueue) {
        this.prisma = prisma;
        this.orderQueue = orderQueue;
    }
    generateOrderNumber() {
        return `ORD-${Date.now()}-${(0, crypto_1.randomBytes)(3).toString('hex').toUpperCase()}`;
    }
    async checkout(userId, dto) {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: { inventory: true, product: { select: { name: true } } },
                        },
                    },
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
                    else if (voucher.type === client_1.VoucherType.FIXED_AMOUNT || voucher.type === client_1.VoucherType.FREE_SHIPPING) {
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
        const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);
        const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const order = await this.prisma.$transaction(async (tx) => {
            const orderItemsCreateData = [];
            for (const item of cart.items) {
                const availableImeis = await tx.imeiDevice.findMany({
                    where: {
                        variantId: item.variantId,
                        status: client_1.ImeiStatus.AVAILABLE,
                    },
                    take: item.quantity,
                });
                if (availableImeis.length < item.quantity) {
                    throw new common_1.BadRequestException(`Not enough available IMEIs for ${item.variant.name}`);
                }
                const imeiIds = availableImeis.map((imei) => imei.id);
                await tx.imeiDevice.updateMany({
                    where: { id: { in: imeiIds } },
                    data: { status: client_1.ImeiStatus.RESERVED },
                });
                for (const imei of availableImeis) {
                    orderItemsCreateData.push({
                        variantId: item.variantId,
                        productName: item.variant.product?.name || item.variant.name,
                        sku: item.variant.sku,
                        quantity: 1,
                        unitPrice: item.unitPrice,
                        discountAmount: 0,
                        totalPrice: Number(item.unitPrice),
                        imeiDeviceId: imei.id,
                    });
                }
                await tx.inventory.update({
                    where: { variantId: item.variantId },
                    data: {
                        reservedQty: { increment: item.quantity },
                        availableQty: { decrement: item.quantity },
                    },
                });
            }
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
                    holdExpiresAt,
                    items: {
                        create: orderItemsCreateData,
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
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            return newOrder;
        });
        try {
            await this.orderQueue.add('expire-order-hold', { orderId: order.id }, { delay: 15 * 60 * 1000 });
            this.logger.log(`Enqueued 15m hold expiry job for order ${order.id}`);
        }
        catch (queueErr) {
            this.logger.error(`Failed to enqueue expire-order-hold job for order ${order.id}:`, queueErr.message);
        }
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
        if (newStatus === client_1.OrderStatus.CANCELLED && order.status === client_1.OrderStatus.PENDING) {
            await this.prisma.$transaction(async (tx) => {
                for (const item of order.items) {
                    if (item.imeiDeviceId) {
                        await tx.imeiDevice.update({
                            where: { id: item.imeiDeviceId },
                            data: { status: client_1.ImeiStatus.AVAILABLE },
                        });
                    }
                    await tx.inventory.update({
                        where: { variantId: item.variantId },
                        data: {
                            reservedQty: { decrement: item.quantity },
                            availableQty: { increment: item.quantity },
                        },
                    });
                }
            });
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
        await this.prisma.$transaction(async (tx) => {
            for (const item of items) {
                if (item.imeiDeviceId) {
                    await tx.imeiDevice.update({
                        where: { id: item.imeiDeviceId },
                        data: { status: client_1.ImeiStatus.AVAILABLE },
                    });
                }
                await tx.inventory.update({
                    where: { variantId: item.variantId },
                    data: {
                        reservedQty: { decrement: item.quantity },
                        availableQty: { increment: item.quantity },
                    },
                });
            }
            await tx.order.update({
                where: { id },
                data: {
                    status: client_1.OrderStatus.CANCELLED,
                    cancelledAt: new Date(),
                    cancelledReason: dto.reason,
                },
            });
        });
        return this.prisma.order.findUnique({ where: { id } });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('order-queue')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], OrdersService);
//# sourceMappingURL=orders.service.js.map