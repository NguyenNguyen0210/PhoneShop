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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let InventoryService = class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getInventory(variantId) {
        const inv = await this.prisma.inventory.findUnique({ where: { variantId } });
        if (!inv)
            throw new common_1.NotFoundException('Inventory record not found for this variant');
        return inv;
    }
    async findAll() {
        return this.prisma.inventory.findMany({
            include: {
                variant: { include: { product: { select: { id: true, name: true } } } },
            },
        });
    }
    async findOne(variantId) {
        const inv = await this.getInventory(variantId);
        return inv;
    }
    async checkStock(variantId) {
        const inv = await this.getInventory(variantId);
        return {
            variantId,
            availableQty: inv.availableQty,
            reservedQty: inv.reservedQty,
            inStock: inv.availableQty > 0,
        };
    }
    async getLowStockAlerts(threshold) {
        return this.prisma.inventory.findMany({
            where: {
                availableQty: { lte: threshold ? threshold : this.prisma.inventory.fields.reorderLevel },
            },
            include: {
                variant: { include: { product: { select: { id: true, name: true } } } },
            },
        });
    }
    async adjustStock(variantId, dto) {
        const inv = await this.getInventory(variantId);
        const newQty = inv.quantity + dto.quantity;
        if (newQty < 0)
            throw new common_1.BadRequestException('Insufficient stock');
        const newAvailable = Math.max(0, inv.availableQty + dto.quantity);
        return this.prisma.inventory.update({
            where: { variantId },
            data: {
                quantity: newQty,
                availableQty: newAvailable,
            },
        });
    }
    async reserveStock(variantId, dto) {
        const inv = await this.getInventory(variantId);
        if (inv.availableQty < dto.quantity) {
            throw new common_1.BadRequestException('Not enough available stock to reserve');
        }
        return this.prisma.inventory.update({
            where: { variantId },
            data: {
                reservedQty: { increment: dto.quantity },
                availableQty: { decrement: dto.quantity },
            },
        });
    }
    async releaseStock(variantId, dto) {
        const inv = await this.getInventory(variantId);
        if (inv.reservedQty < dto.quantity) {
            throw new common_1.BadRequestException('Cannot release more than reserved quantity');
        }
        return this.prisma.inventory.update({
            where: { variantId },
            data: {
                reservedQty: { decrement: dto.quantity },
                availableQty: { increment: dto.quantity },
            },
        });
    }
    async setReorderLevel(variantId, dto) {
        await this.getInventory(variantId);
        return this.prisma.inventory.update({
            where: { variantId },
            data: { reorderLevel: dto.reorderLevel },
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map