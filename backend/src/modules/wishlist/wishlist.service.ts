import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToWishlistDto } from './dto/wishlist.dto';

const WISHLIST_INCLUDE = {
  items: {
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          variants: {
            where: { isActive: true },
            include: { inventory: true },
            orderBy: { price: 'asc' as const },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: WISHLIST_INCLUDE,
    });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
        include: WISHLIST_INCLUDE,
      });
    }
    return wishlist;
  }

  async getWishlist(userId: string) {
    return this.getOrCreateWishlist(userId);
  }

  async addProduct(userId: string, dto: AddToWishlistDto) {
    // AUDIT: validate the product exists and is sellable before creating a
    // wishlist row — otherwise dead references accumulate.
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, status: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.status !== 'ACTIVE') throw new BadRequestException('Product is not available');

    const wishlist = await this.getOrCreateWishlist(userId);

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: dto.productId } },
    });
    if (existing) throw new ConflictException('Product already in wishlist');

    return this.prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId: dto.productId },
      include: WISHLIST_INCLUDE.items.include,
    });
  }

  async removeProduct(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (!item) throw new NotFoundException('Product not in wishlist');
    return this.prisma.wishlistItem.delete({ where: { id: item.id } });
  }

  async clearWishlist(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
    return { success: true };
  }

  async checkProduct(userId: string, productId: string) {
    // AUDIT: read-only — a mere existence check must not auto-create a
    // wishlist row as a side effect.
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) return { inWishlist: false };
    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    return { inWishlist: !!item };
  }

  async moveToCart(userId: string, productId: string, variantId?: string) {
    // Remove from wishlist - CartService handles adding to cart
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (!item) throw new NotFoundException('Product not in wishlist');

    // AUDIT: variant selection is deterministic. An explicit variantId wins
    // (validated against this product); otherwise the cheapest active
    // variant is picked — never an arbitrary findFirst row.
    let variant;
    if (variantId) {
      variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
      if (!variant || variant.productId !== productId || !variant.isActive) {
        throw new BadRequestException('Invalid variant for this product');
      }
    } else {
      variant = await this.prisma.productVariant.findFirst({
        where: { productId, isActive: true },
        orderBy: { price: 'asc' },
      });
    }
    if (!variant) throw new BadRequestException('No active variant available');
    const selectedVariant = variant;

    // Check stock
    const inventory = await this.prisma.inventory.findUnique({ where: { variantId: selectedVariant.id } });
    if (!inventory || inventory.availableQty < 1) {
      throw new BadRequestException('Variant is out of stock');
    }
    // AUDIT: cap the resulting cart quantity at on-hand stock so the move
    // can never push the line above availableQty.
    const cappedQty = Math.min(1, inventory.availableQty);

    // Execute cart addition and wishlist deletion atomically in transaction
    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      const existingCartItem = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId: selectedVariant.id } },
      });

      if (existingCartItem) {
        await tx.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: Math.min(existingCartItem.quantity + cappedQty, inventory.availableQty) },
        });
      } else {
        await tx.cartItem.create({
          data: { cartId: cart.id, variantId: selectedVariant.id, quantity: cappedQty, unitPrice: selectedVariant.price },
        });
      }

      await tx.wishlistItem.delete({ where: { id: item.id } });
    });

    return { success: true, message: 'Product moved to cart' };
  }
}
