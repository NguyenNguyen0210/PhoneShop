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
exports.ShippingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shipping_dto_1 = require("./dto/shipping.dto");
const STATUS_TRANSITIONS = {
    [shipping_dto_1.ShippingStatus.PENDING]: [shipping_dto_1.ShippingStatus.READY_TO_SHIP],
    [shipping_dto_1.ShippingStatus.READY_TO_SHIP]: [shipping_dto_1.ShippingStatus.PICKED_UP],
    [shipping_dto_1.ShippingStatus.PICKED_UP]: [shipping_dto_1.ShippingStatus.IN_TRANSIT],
    [shipping_dto_1.ShippingStatus.IN_TRANSIT]: [shipping_dto_1.ShippingStatus.DELIVERED, shipping_dto_1.ShippingStatus.FAILED],
    [shipping_dto_1.ShippingStatus.FAILED]: [shipping_dto_1.ShippingStatus.IN_TRANSIT, shipping_dto_1.ShippingStatus.RETURNED],
};
let ShippingService = class ShippingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    estimateFee(_city, _weight) {
        return 30_000;
    }
    async create(dto) {
        const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const existing = await this.prisma.shipping.findUnique({ where: { orderId: dto.orderId } });
        if (existing)
            throw new common_1.BadRequestException('Shipping record already exists for this order');
        return this.prisma.shipping.create({
            data: {
                orderId: dto.orderId,
                providerName: dto.providerName,
                trackingNumber: dto.trackingNumber,
                shippingFee: dto.shippingFee ?? this.estimateFee(),
                estimatedDeliveryDate: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : undefined,
            },
        });
    }
    async findByOrder(orderId) {
        const shipping = await this.prisma.shipping.findUnique({ where: { orderId } });
        if (!shipping)
            throw new common_1.NotFoundException('Shipping not found for this order');
        return shipping;
    }
    async findOne(id) {
        const shipping = await this.prisma.shipping.findUnique({ where: { id } });
        if (!shipping)
            throw new common_1.NotFoundException('Shipping record not found');
        return shipping;
    }
    async updateStatus(id, dto) {
        const shipping = await this.findOne(id);
        const allowed = STATUS_TRANSITIONS[shipping.status] ?? [];
        if (!allowed.includes(dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition shipping status from ${shipping.status} to ${dto.status}`);
        }
        const data = {
            status: dto.status,
            ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
            ...(dto.estimatedDeliveryDate && { estimatedDeliveryDate: new Date(dto.estimatedDeliveryDate) }),
        };
        if (dto.status === shipping_dto_1.ShippingStatus.PICKED_UP)
            data.shippedAt = new Date();
        if (dto.status === shipping_dto_1.ShippingStatus.DELIVERED)
            data.deliveredAt = new Date();
        return this.prisma.shipping.update({ where: { id }, data });
    }
    async findAll() {
        return this.prisma.shipping.findMany({
            include: { order: { select: { orderNumber: true, userId: true, totalAmount: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.ShippingService = ShippingService;
exports.ShippingService = ShippingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShippingService);
//# sourceMappingURL=shipping.service.js.map