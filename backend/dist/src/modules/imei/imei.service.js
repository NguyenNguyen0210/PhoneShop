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
exports.ImeiService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ImeiService = class ImeiService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async add(dto) {
        const existing = await this.prisma.imeiDevice.findUnique({ where: { imei: dto.imei } });
        if (existing)
            throw new common_1.ConflictException('IMEI already registered');
        return this.prisma.imeiDevice.create({ data: dto });
    }
    async import(dto) {
        const created = [];
        for (const item of dto.items) {
            const existing = await this.prisma.imeiDevice.findUnique({ where: { imei: item.imei } });
            if (!existing) {
                created.push(await this.prisma.imeiDevice.create({ data: item }));
            }
        }
        return { imported: created.length, total: dto.items.length };
    }
    async findAll(variantId, status) {
        const where = {};
        if (variantId)
            where.variantId = variantId;
        if (status)
            where.status = status;
        return this.prisma.imeiDevice.findMany({
            where,
            include: { variant: { include: { product: { select: { id: true, name: true } } } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const imei = await this.prisma.imeiDevice.findUnique({
            where: { id },
            include: { variant: true },
        });
        if (!imei)
            throw new common_1.NotFoundException('IMEI device not found');
        return imei;
    }
    async searchByImei(imei) {
        const device = await this.prisma.imeiDevice.findUnique({
            where: { imei },
            include: { variant: { include: { product: true } } },
        });
        if (!device)
            throw new common_1.NotFoundException('IMEI not found');
        return device;
    }
    async checkAvailability(imei) {
        const device = await this.prisma.imeiDevice.findUnique({ where: { imei } });
        if (!device)
            throw new common_1.NotFoundException('IMEI not found');
        return { imei, status: device.status, available: device.status === client_1.ImeiStatus.AVAILABLE };
    }
    async validate(imei) {
        if (!/^\d{15}$/.test(imei))
            return false;
        let sum = 0;
        for (let i = 0; i < 15; i++) {
            let digit = parseInt(imei[i]);
            if (i % 2 !== 0)
                digit *= 2;
            if (digit > 9)
                digit -= 9;
            sum += digit;
        }
        return sum % 10 === 0;
    }
    async updateStatus(id, dto) {
        await this.findOne(id);
        const data = { status: dto.status };
        if (dto.status === client_1.ImeiStatus.SOLD)
            data.soldAt = new Date();
        return this.prisma.imeiDevice.update({ where: { id }, data });
    }
    async reserve(id) {
        const device = await this.findOne(id);
        if (device.status !== client_1.ImeiStatus.AVAILABLE) {
            throw new common_1.BadRequestException('IMEI is not available for reservation');
        }
        return this.prisma.imeiDevice.update({
            where: { id },
            data: { status: client_1.ImeiStatus.RESERVED },
        });
    }
    async markSold(id) {
        const device = await this.findOne(id);
        if (device.status !== client_1.ImeiStatus.AVAILABLE && device.status !== client_1.ImeiStatus.RESERVED) {
            throw new common_1.BadRequestException('Cannot mark IMEI as sold in current state');
        }
        return this.prisma.imeiDevice.update({
            where: { id },
            data: { status: client_1.ImeiStatus.SOLD, soldAt: new Date() },
        });
    }
    async returnDevice(id) {
        await this.findOne(id);
        return this.prisma.imeiDevice.update({
            where: { id },
            data: { status: client_1.ImeiStatus.RETURNED },
        });
    }
    async block(id) {
        await this.findOne(id);
        return this.prisma.imeiDevice.update({
            where: { id },
            data: { status: client_1.ImeiStatus.BLOCKED },
        });
    }
    async warranty(id) {
        await this.findOne(id);
        return this.prisma.imeiDevice.update({
            where: { id },
            data: { status: client_1.ImeiStatus.WARRANTY },
        });
    }
};
exports.ImeiService = ImeiService;
exports.ImeiService = ImeiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ImeiService);
//# sourceMappingURL=imei.service.js.map