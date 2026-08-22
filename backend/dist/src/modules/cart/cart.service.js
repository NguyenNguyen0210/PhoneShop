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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CartService = class CartService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrCreateCart(userId) {
        let cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: { variant: { include: { product: true, inventory: true } } },
                },
            },
        });
        if (!cart) {
            cart = await this.prisma.cart.create({
                data: { userId },
                include: {
                    items: {
                        include: { variant: { include: { product: true, inventory: true } } },
                    },
                },
            });
        }
        return cart;
    }
    async getCart(userId) {
        const cart = await this.getOrCreateCart(userId);
        const subtotal = cart.items.reduce((acc, item) => acc + Number(item.unitPrice) * item.quantity, 0);
        return { ...cart, subtotal };
    }
    async addItem(userId, dto) {
        const cart = await this.getOrCreateCart(userId);
        const inventory = await this.prisma.inventory.findUnique({
            where: { variantId: dto.variantId },
        });
        if (!inventory || inventory.availableQty < dto.quantity) {
            throw new common_1.BadRequestException('Insufficient stock');
        }
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: dto.variantId },
        });
        if (!variant || !variant.isActive) {
            throw new common_1.NotFoundException('Product variant not found or inactive');
        }
        const existing = await this.prisma.cartItem.findUnique({
            where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } },
        });
        if (existing) {
            const newQty = existing.quantity + dto.quantity;
            if (inventory.availableQty < newQty) {
                throw new common_1.BadRequestException('Insufficient stock for requested quantity');
            }
            return this.prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: newQty, unitPrice: variant.price },
            });
        }
        return this.prisma.cartItem.create({
            data: {
                cartId: cart.id,
                variantId: dto.variantId,
                quantity: dto.quantity,
                unitPrice: variant.price,
            },
        });
    }
    async updateItem(userId, itemId, dto) {
        const cart = await this.getOrCreateCart(userId);
        const item = await this.prisma.cartItem.findFirst({
            where: { id: itemId, cartId: cart.id },
        });
        if (!item)
            throw new common_1.NotFoundException('Cart item not found');
        const inventory = await this.prisma.inventory.findUnique({
            where: { variantId: item.variantId },
        });
        if (!inventory || inventory.availableQty < dto.quantity) {
            throw new common_1.BadRequestException('Insufficient stock');
        }
        return this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity: dto.quantity },
        });
    }
    async removeItem(userId, itemId) {
        const cart = await this.getOrCreateCart(userId);
        const item = await this.prisma.cartItem.findFirst({
            where: { id: itemId, cartId: cart.id },
        });
        if (!item)
            throw new common_1.NotFoundException('Cart item not found');
        return this.prisma.cartItem.delete({ where: { id: itemId } });
    }
    async clearCart(userId) {
        const cart = await this.getOrCreateCart(userId);
        await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        return { success: true };
    }
    async validateCart(userId) {
        const cart = await this.getOrCreateCart(userId);
        const issues = [];
        for (const item of cart.items) {
            if (!item.variant.isActive) {
                issues.push(`Variant ${item.variant.name} is no longer available`);
            }
            if (!item.variant.inventory || item.variant.inventory.availableQty < item.quantity) {
                issues.push(`Insufficient stock for ${item.variant.name}`);
            }
        }
        return { valid: issues.length === 0, issues, cart };
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CartService);
//# sourceMappingURL=cart.service.js.map