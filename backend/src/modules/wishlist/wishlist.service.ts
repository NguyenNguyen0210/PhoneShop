import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToWishlistDto } from './dto/wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateWishlist(userId: string) {
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

  async getWishlist(userId: string) {
    return this.getOrCreateWishlist(userId);
  }

  async addProduct(userId: string, dto: AddToWishlistDto) {
    const wishlist = await this.getOrCreateWishlist(userId);

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: dto.productId } },
    });
    if (existing) throw new ConflictException('Product already in wishlist');

    return this.prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId: dto.productId },
      include: { product: true },
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
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    return { inWishlist: !!item };
  }

  async moveToCart(userId: string, productId: string) {
    // Remove from wishlist - CartService handles adding to cart
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (!item) throw new NotFoundException('Product not in wishlist');

    // Find default active variant
    const variant = await this.prisma.productVariant.findFirst({
      where: { productId, isActive: true },
    });
    if (!variant) throw new BadRequestException('No active variant available');

    // Check stock
    const inventory = await this.prisma.inventory.findUnique({ where: { variantId: variant.id } });
    if (!inventory || inventory.availableQty < 1) {
      throw new BadRequestException('Variant is out of stock');
    }

    // Add to cart
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
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, variantId: variant.id, quantity: 1, unitPrice: variant.price },
      });
    }

    // Remove from wishlist
    await this.prisma.wishlistItem.delete({ where: { id: item.id } });

    return { success: true, message: 'Product moved to cart' };
  }
}
