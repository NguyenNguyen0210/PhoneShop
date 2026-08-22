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
exports.WishlistService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let WishlistService = class WishlistService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrCreateWishlist(userId) {
        let wishlist = await this.prisma.wishlist.findUnique({
            where: { userId },
            include: { items: { include: { product: true } } },
        });
        if (!wishlist) {
            wishlist = await this.prisma.wishlist.create({
                data: { userId },
                include: { items: { include: { product: true } } },
            });
        }
        return wishlist;
    }
    async getWishlist(userId) {
        return this.getOrCreateWishlist(userId);
    }
    async addProduct(userId, dto) {
        const wishlist = await this.getOrCreateWishlist(userId);
        const existing = await this.prisma.wishlistItem.findUnique({
            where: { wishlistId_productId: { wishlistId: wishlist.id, productId: dto.productId } },
        });
        if (existing)
            throw new common_1.ConflictException('Product already in wishlist');
        return this.prisma.wishlistItem.create({
            data: { wishlistId: wishlist.id, productId: dto.productId },
            include: { product: true },
        });
    }
    async removeProduct(userId, productId) {
        const wishlist = await this.getOrCreateWishlist(userId);
        const item = await this.prisma.wishlistItem.findUnique({
            where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
        });
        if (!item)
            throw new common_1.NotFoundException('Product not in wishlist');
        return this.prisma.wishlistItem.delete({ where: { id: item.id } });
    }
    async clearWishlist(userId) {
        const wishlist = await this.getOrCreateWishlist(userId);
        await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
        return { success: true };
    }
    async checkProduct(userId, productId) {
        const wishlist = await this.getOrCreateWishlist(userId);
        const item = await this.prisma.wishlistItem.findUnique({
            where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
        });
        return { inWishlist: !!item };
    }
    async moveToCart(userId, productId) {
        const wishlist = await this.getOrCreateWishlist(userId);
        const item = await this.prisma.wishlistItem.findUnique({
            where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
        });
        if (!item)
            throw new common_1.NotFoundException('Product not in wishlist');
        const variant = await this.prisma.productVariant.findFirst({
            where: { productId, isActive: true },
        });
        if (!variant)
            throw new common_1.BadRequestException('No active variant available');
        const inventory = await this.prisma.inventory.findUnique({ where: { variantId: variant.id } });
        if (!inventory || inventory.availableQty < 1) {
            throw new common_1.BadRequestException('Variant is out of stock');
        }
        const cart = await this.prisma.cart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
        const existingCartItem = await this.prisma.cartItem.findUnique({
            where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
        });
        if (existingCartItem) {
            await this.prisma.cartItem.update({
                where: { id: existingCartItem.id },
                data: { quantity: { increment: 1 } },
            });
        }
        else {
            await this.prisma.cartItem.create({
                data: { cartId: cart.id, variantId: variant.id, quantity: 1, unitPrice: variant.price },
            });
        }
        await this.prisma.wishlistItem.delete({ where: { id: item.id } });
        return { success: true, message: 'Product moved to cart' };
    }
};
exports.WishlistService = WishlistService;
exports.WishlistService = WishlistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WishlistService);
//# sourceMappingURL=wishlist.service.js.map