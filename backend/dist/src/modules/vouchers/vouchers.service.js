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
exports.VouchersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let VouchersService = class VouchersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
        if (existing)
            throw new common_1.ConflictException('Voucher code already exists');
        return this.prisma.voucher.create({ data: { ...dto, startAt: new Date(dto.startAt), endAt: new Date(dto.endAt) } });
    }
    async findAll(activeOnly = false) {
        const where = {};
        if (activeOnly) {
            const now = new Date();
            where.isActive = true;
            where.startAt = { lte: now };
            where.endAt = { gte: now };
        }
        return this.prisma.voucher.findMany({ where, orderBy: { createdAt: 'desc' } });
    }
    async findOne(id) {
        const voucher = await this.prisma.voucher.findUnique({
            where: { id },
            include: { usages: true },
        });
        if (!voucher)
            throw new common_1.NotFoundException('Voucher not found');
        return voucher;
    }
    async update(id, dto) {
        await this.findOne(id);
        const data = { ...dto };
        if (dto.startAt)
            data.startAt = new Date(dto.startAt);
        if (dto.endAt)
            data.endAt = new Date(dto.endAt);
        return this.prisma.voucher.update({ where: { id }, data });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.voucher.delete({ where: { id } });
    }
    async changeStatus(id, isActive) {
        await this.findOne(id);
        return this.prisma.voucher.update({ where: { id }, data: { isActive } });
    }
    async validate(userId, dto) {
        const voucher = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
        if (!voucher)
            throw new common_1.NotFoundException('Voucher not found');
        const now = new Date();
        if (!voucher.isActive)
            throw new common_1.BadRequestException('Voucher is not active');
        if (voucher.startAt > now)
            throw new common_1.BadRequestException('Voucher is not yet valid');
        if (voucher.endAt < now)
            throw new common_1.BadRequestException('Voucher has expired');
        if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
            throw new common_1.BadRequestException('Voucher usage limit reached');
        }
        if (voucher.minOrderValue && dto.orderTotal < Number(voucher.minOrderValue)) {
            throw new common_1.BadRequestException(`Minimum order value is ${voucher.minOrderValue}`);
        }
        if (voucher.perUserLimit) {
            const userUsage = await this.prisma.voucherUsage.count({
                where: { voucherId: voucher.id, userId },
            });
            if (userUsage >= voucher.perUserLimit) {
                throw new common_1.BadRequestException('You have reached the per-user usage limit');
            }
        }
        let discount = 0;
        if (voucher.type === client_1.VoucherType.PERCENTAGE) {
            discount = (dto.orderTotal * Number(voucher.value)) / 100;
            if (voucher.maxDiscountAmount) {
                discount = Math.min(discount, Number(voucher.maxDiscountAmount));
            }
        }
        else if (voucher.type === client_1.VoucherType.FIXED_AMOUNT) {
            discount = Math.min(Number(voucher.value), dto.orderTotal);
        }
        else if (voucher.type === client_1.VoucherType.FREE_SHIPPING) {
            discount = 0;
        }
        return { valid: true, voucher, discount };
    }
    async viewUsage(id) {
        await this.findOne(id);
        return this.prisma.voucherUsage.findMany({
            where: { voucherId: id },
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
            orderBy: { usedAt: 'desc' },
        });
    }
};
exports.VouchersService = VouchersService;
exports.VouchersService = VouchersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VouchersService);
//# sourceMappingURL=vouchers.service.js.map