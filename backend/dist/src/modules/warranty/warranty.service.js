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
exports.WarrantyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
let WarrantyService = class WarrantyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateWarrantyCode() {
        return `WRT-${Date.now()}-${(0, crypto_1.randomBytes)(4).toString('hex').toUpperCase()}`;
    }
    async create(dto) {
        return this.prisma.warranty.create({
            data: {
                ...dto,
                warrantyCode: this.generateWarrantyCode(),
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
            },
            include: { productVariant: { include: { product: true } }, orderItem: true },
        });
    }
    async findAll(userId) {
        const where = {};
        if (userId)
            where.userId = userId;
        return this.prisma.warranty.findMany({
            where,
            include: {
                productVariant: { include: { product: true } },
                imeiDevice: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const warranty = await this.prisma.warranty.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
                productVariant: { include: { product: true } },
                imeiDevice: true,
                orderItem: true,
            },
        });
        if (!warranty)
            throw new common_1.NotFoundException('Warranty not found');
        return warranty;
    }
    async searchByCode(warrantyCode) {
        const warranty = await this.prisma.warranty.findUnique({
            where: { warrantyCode },
            include: { productVariant: { include: { product: true } }, imeiDevice: true },
        });
        if (!warranty)
            throw new common_1.NotFoundException('Warranty not found');
        return warranty;
    }
    async checkStatus(warrantyCode) {
        const warranty = await this.searchByCode(warrantyCode);
        const now = new Date();
        const isExpired = warranty.endDate < now;
        return {
            warrantyCode,
            status: warranty.status,
            startDate: warranty.startDate,
            endDate: warranty.endDate,
            isExpired,
            daysRemaining: isExpired ? 0 : Math.ceil((warranty.endDate.getTime() - now.getTime()) / 86400000),
        };
    }
    async claimWarranty(userId, id, dto) {
        const warranty = await this.findOne(id);
        if (warranty.userId !== userId)
            throw new common_1.BadRequestException('Not your warranty');
        if (warranty.status !== client_1.WarrantyStatus.ACTIVE) {
            throw new common_1.BadRequestException('Warranty is not in ACTIVE status');
        }
        const now = new Date();
        if (warranty.endDate < now)
            throw new common_1.BadRequestException('Warranty has expired');
        return this.prisma.warranty.update({
            where: { id },
            data: { status: client_1.WarrantyStatus.CLAIMED, notes: dto.reason },
        });
    }
    async voidWarranty(id) {
        await this.findOne(id);
        return this.prisma.warranty.update({
            where: { id },
            data: { status: client_1.WarrantyStatus.VOIDED },
        });
    }
    async getUserWarranties(userId) {
        return this.prisma.warranty.findMany({
            where: { userId },
            include: { productVariant: { include: { product: true } }, imeiDevice: true },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.WarrantyService = WarrantyService;
exports.WarrantyService = WarrantyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WarrantyService);
//# sourceMappingURL=warranty.service.js.map