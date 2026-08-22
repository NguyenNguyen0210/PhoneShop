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
exports.ReturnsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
let ReturnsService = class ReturnsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateReturnNumber() {
        return `RET-${Date.now()}-${(0, crypto_1.randomBytes)(3).toString('hex').toUpperCase()}`;
    }
    generateRefundNumber() {
        return `REF-${Date.now()}-${(0, crypto_1.randomBytes)(3).toString('hex').toUpperCase()}`;
    }
    async createReturn(userId, dto) {
        const order = await this.prisma.order.findFirst({
            where: { id: dto.orderId, userId },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const allowedStatuses = [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.COMPLETED];
        if (!allowedStatuses.includes(order.status)) {
            throw new common_1.BadRequestException('Return can only be requested for delivered or completed orders');
        }
        return this.prisma.return.create({
            data: {
                orderId: dto.orderId,
                userId,
                returnNumber: this.generateReturnNumber(),
                reason: dto.reason,
                customerNote: dto.customerNote,
                items: {
                    create: dto.items.map((item) => ({
                        orderItemId: item.orderItemId,
                        quantity: item.quantity,
                        reason: item.reason,
                        condition: item.condition,
                    })),
                },
            },
            include: { items: true, order: true },
        });
    }
    async getMyReturns(userId) {
        return this.prisma.return.findMany({
            where: { userId },
            include: { items: true, refunds: true, order: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getMyReturn(userId, id) {
        const ret = await this.prisma.return.findFirst({
            where: { id, userId },
            include: { items: true, refunds: true, order: true },
        });
        if (!ret)
            throw new common_1.NotFoundException('Return request not found');
        return ret;
    }
    async findAll() {
        return this.prisma.return.findMany({
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
                items: true,
                refunds: true,
                order: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const ret = await this.prisma.return.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
                items: true,
                refunds: true,
                order: true,
            },
        });
        if (!ret)
            throw new common_1.NotFoundException('Return not found');
        return ret;
    }
    async transitionStatus(id, newStatus, dto) {
        await this.findOne(id);
        const data = { status: newStatus };
        if (dto?.adminNote)
            data.adminNote = dto.adminNote;
        const now = new Date();
        if (newStatus === client_1.ReturnStatus.APPROVED)
            data.approvedAt = now;
        if (newStatus === client_1.ReturnStatus.RECEIVED)
            data.receivedAt = now;
        if (newStatus === client_1.ReturnStatus.COMPLETED)
            data.completedAt = now;
        return this.prisma.return.update({ where: { id }, data });
    }
    async cancelReturn(userId, id) {
        const ret = await this.prisma.return.findFirst({ where: { id, userId } });
        if (!ret)
            throw new common_1.NotFoundException('Return not found');
        if (ret.status !== client_1.ReturnStatus.REQUESTED) {
            throw new common_1.BadRequestException('Can only cancel return in REQUESTED status');
        }
        return this.prisma.return.update({
            where: { id },
            data: { status: client_1.ReturnStatus.CANCELLED },
        });
    }
    async createRefund(dto) {
        const ret = await this.findOne(dto.returnId);
        if (ret.status !== client_1.ReturnStatus.COMPLETED && ret.status !== client_1.ReturnStatus.RECEIVED) {
            throw new common_1.BadRequestException('Return must be RECEIVED or COMPLETED before issuing a refund');
        }
        return this.prisma.refund.create({
            data: {
                returnId: dto.returnId,
                refundNumber: this.generateRefundNumber(),
                amount: dto.amount,
                reason: dto.reason,
            },
        });
    }
    async processRefund(refundId) {
        const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
        if (!refund)
            throw new common_1.NotFoundException('Refund not found');
        if (refund.status !== client_1.RefundStatus.PENDING) {
            throw new common_1.BadRequestException('Refund is not in PENDING status');
        }
        return this.prisma.refund.update({
            where: { id: refundId },
            data: { status: client_1.RefundStatus.PROCESSING },
        });
    }
    async completeRefund(refundId) {
        const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
        if (!refund)
            throw new common_1.NotFoundException('Refund not found');
        return this.prisma.refund.update({
            where: { id: refundId },
            data: { status: client_1.RefundStatus.COMPLETED, processedAt: new Date() },
        });
    }
    async getRefundHistory() {
        return this.prisma.refund.findMany({
            include: { return: { include: { order: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.ReturnsService = ReturnsService;
exports.ReturnsService = ReturnsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReturnsService);
//# sourceMappingURL=returns.service.js.map