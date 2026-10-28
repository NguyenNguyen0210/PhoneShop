import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    const existing = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { variant: { include: { product: { include: { brand: true } }, inventory: true } } },
        },
      },
    });
    if (existing) return existing;
    try {
      return await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: { variant: { include: { product: { include: { brand: true } }, inventory: true } } },
          },
        },
      });
    } catch (e: any) {
      // Lost a create race on the unique userId: the concurrent request owns
      // the cart row — re-fetch it instead of failing the request.
      if (e?.code !== 'P2002') throw e;
      const refetched = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: { variant: { include: { product: { include: { brand: true } }, inventory: true } } },
          },
        },
      });
      if (!refetched) throw e;
      return refetched;
    }
  }

  private async resolveActiveFlashSale(variantId: string) {
    if (!this.prisma.flashSaleItem?.findFirst) return null;
    const now = new Date();
    const flashItem = await this.prisma.flashSaleItem.findFirst({
      where: {
        variantId,
        campaign: {
          isActive: true,
          startAt: { lte: now },
          endAt: { gte: now },
        },
      },
      orderBy: { id: 'asc' },
    });
    if (!flashItem) return null;
    const quotaLeft = Math.max(0, flashItem.stockLimit - (flashItem.soldCount || 0));
    if (quotaLeft <= 0) return null;
    return {
      flashPrice: Number(flashItem.flashPrice),
      stockLimit: flashItem.stockLimit,
      soldCount: flashItem.soldCount || 0,
      quotaLeft,
    };
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    let subtotal = 0;
    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        const flash = await this.resolveActiveFlashSale(item.variantId);
        const effectiveUnitPrice = flash
          ? flash.flashPrice
          : Number(item.variant?.price ?? item.unitPrice);
        const originalPrice = Number(item.variant?.price ?? item.unitPrice);
        const isFlashSale = Boolean(flash);
        const flashQuotaLeft = flash ? flash.quotaLeft : undefined;

        // Read-only enrichment: getCart must never write to the DB (the stale
        // unitPrice is corrected by addItem/updateItem/checkout instead).

        subtotal += effectiveUnitPrice * item.quantity;
        return {
          ...item,
          unitPrice: effectiveUnitPrice,
          originalPrice,
          isFlashSale,
          flashPrice: flash ? flash.flashPrice : null,
          flashQuotaLeft,
        };
      }),
    );
    return { ...cart, items: enrichedItems, subtotal };
  }

  /**
   * Merge an extra quantity into an existing cart item, re-checking stock and
   * the flash-sale quota against the COMBINED quantity.
   */
  private async mergeCartItem(
    existing: { id: string; quantity: number },
    dto: AddCartItemDto,
    inventory: { availableQty: number } | null,
    variant: { price: any },
    flash: { flashPrice: number; quotaLeft: number } | null,
  ) {
    const newQty = existing.quantity + dto.quantity;
    if (!inventory || inventory.availableQty < newQty) {
      throw new BadRequestException('Insufficient stock for requested quantity');
    }
    if (flash && newQty > flash.quotaLeft) {
      throw new BadRequestException(`Flash Sale chỉ còn ${flash.quotaLeft} suất cho phiên bản này`);
    }
    const unitPrice = flash ? flash.flashPrice : variant.price;
    return this.prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty, unitPrice },
    });
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    // Check stock
    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId: dto.variantId },
    });
    if (!inventory || inventory.availableQty < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Get current price
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: { include: { brand: true } } },
    });
    if (!variant || !variant.isActive) {
      throw new NotFoundException('Product variant not found or inactive');
    }

    if (variant.product?.brand && variant.product.brand.isActive === false) {
      throw new BadRequestException('Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động');
    }

    const flash = await this.resolveActiveFlashSale(dto.variantId);
    // Flash quota is a hard cap independent of inventory.availableQty.
    if (flash && dto.quantity > flash.quotaLeft) {
      throw new BadRequestException(`Flash Sale chỉ còn ${flash.quotaLeft} suất cho phiên bản này`);
    }
    const unitPrice = flash ? flash.flashPrice : variant.price;

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } },
    });

    if (existing) {
      return this.mergeCartItem(existing, dto, inventory, variant, flash);
    }

    try {
      return await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: dto.variantId,
          quantity: dto.quantity,
          unitPrice,
        },
      });
    } catch (e: any) {
      // Concurrent add of the same variant hit the unique (cartId, variantId)
      // constraint — retry the merge path once with a fresh read.
      if (e?.code !== 'P2002') throw e;
      const raced = await this.prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } },
      });
      if (!raced) throw e;
      const flashNow = await this.resolveActiveFlashSale(dto.variantId);
      return this.mergeCartItem(raced, dto, inventory, variant, flashNow);
    }
  }

  async addToCart(userId: string, dto: AddCartItemDto) {
    return this.addItem(userId, dto);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        OR: [{ id: itemId }, { variantId: itemId }],
      },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: { product: { include: { brand: true } } },
    });
    if (!variant || !variant.isActive) {
      throw new NotFoundException('Product variant not found or inactive');
    }

    if (variant.product?.brand && variant.product.brand.isActive === false) {
      throw new BadRequestException('Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động');
    }

    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId: item.variantId },
    });
    if (!inventory || inventory.availableQty < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const flash = await this.resolveActiveFlashSale(item.variantId);
    // Flash quota is a hard cap independent of inventory.availableQty.
    if (flash && dto.quantity > flash.quotaLeft) {
      throw new BadRequestException(`Flash Sale chỉ còn ${flash.quotaLeft} suất cho phiên bản này`);
    }
    const unitPrice = flash ? flash.flashPrice : variant.price;

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity, unitPrice },
    });
  }

  async updateQuantity(userId: string, itemId: string, dto: UpdateCartItemDto) {
    return this.updateItem(userId, itemId, dto);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        OR: [{ id: itemId }, { variantId: itemId }],
      },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    return this.prisma.cartItem.delete({ where: { id: item.id } });
  }

  async removeItemsBulk(userId: string, itemIds: string[]) {
    const cart = await this.getOrCreateCart(userId);
    // FE sends either cart-item ids or variant ids — match both.
    return this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        OR: [{ id: { in: itemIds } }, { variantId: { in: itemIds } }],
      },
    });
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { success: true };
  }

  async validateCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const issues: string[] = [];

    for (const item of cart.items) {
      if (!item.variant.isActive) {
        issues.push(`Variant ${item.variant.name} is no longer available`);
      }
      if (item.variant.product?.brand && item.variant.product.brand.isActive === false) {
        issues.push('Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động');
      }
      if (!item.variant.inventory || item.variant.inventory.availableQty < item.quantity) {
        issues.push(`Insufficient stock for ${item.variant.name}`);
      }
    }

    return { valid: issues.length === 0, issues, cart };
  }
}
