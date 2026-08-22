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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
let PaymentsService = class PaymentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateTransactionCode() {
        return `TXN-${Date.now()}-${(0, crypto_1.randomBytes)(4).toString('hex').toUpperCase()}`;
    }
    async create(userId, dto) {
        const order = await this.prisma.order.findFirst({
            where: { id: dto.orderId, userId },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Cannot pay for a cancelled order');
        }
        const existing = await this.prisma.payment.findFirst({
            where: { orderId: dto.orderId, status: client_1.PaymentStatus.PAID },
        });
        if (existing)
            throw new common_1.BadRequestException('Order is already paid');
        const payment = await this.prisma.payment.create({
            data: {
                orderId: dto.orderId,
                method: dto.method,
                amount: order.totalAmount,
            },
        });
        if (dto.method === 'COD') {
            await this.prisma.paymentTransaction.create({
                data: {
                    paymentId: payment.id,
                    transactionCode: this.generateTransactionCode(),
                    type: client_1.TransactionType.PAYMENT,
                    status: client_1.TransactionStatus.PENDING,
                    amount: order.totalAmount,
                },
            });
        }
        return payment;
    }
    async handleCallback(dto) {
        return { received: true, provider: dto.provider };
    }
    async confirmPayment(paymentId) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        await this.prisma.paymentTransaction.create({
            data: {
                paymentId,
                transactionCode: this.generateTransactionCode(),
                type: client_1.TransactionType.PAYMENT,
                status: client_1.TransactionStatus.SUCCESS,
                amount: payment.amount,
            },
        });
        return this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: client_1.PaymentStatus.PAID, paidAt: new Date() },
        });
    }
    async failPayment(paymentId) {
        const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        await this.prisma.paymentTransaction.create({
            data: {
                paymentId,
                transactionCode: this.generateTransactionCode(),
                type: client_1.TransactionType.PAYMENT,
                status: client_1.TransactionStatus.FAILED,
                amount: payment.amount,
            },
        });
        return this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: client_1.PaymentStatus.FAILED },
        });
    }
    async getStatus(paymentId) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: { transactions: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        return payment;
    }
    async findByOrder(orderId) {
        return this.prisma.payment.findMany({
            where: { orderId },
            include: { transactions: true },
        });
    }
    async findAll() {
        return this.prisma.payment.findMany({
            include: {
                order: { select: { id: true, orderNumber: true, userId: true } },
                transactions: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTransactionHistory() {
        return this.prisma.paymentTransaction.findMany({
            include: { payment: { include: { order: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map