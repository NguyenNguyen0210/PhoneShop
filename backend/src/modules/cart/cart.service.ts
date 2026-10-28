import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { variant: { include: { product: { include: { brand: true } }, inventory: true } } },
        },
      },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: { variant: { include: { product: { include: { brand: true } }, inventory: true } } },
          },
        },
      });
    }
    return cart;
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

        if (item.id && effectiveUnitPrice !== Number(item.unitPrice)) {
          await this.prisma.cartItem.update({
            where: { id: item.id },
            data: { unitPrice: effectiveUnitPrice },
          }).catch(() => {});
        }

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
    const unitPrice = flash ? flash.flashPrice : variant.price;

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } },
    });

    if (existing) {
      const newQty = existing.quantity + dto.quantity;
      if (inventory.availableQty < newQty) {
        throw new BadRequestException('Insufficient stock for requested quantity');
      }
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty, unitPrice },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: dto.variantId,
        quantity: dto.quantity,
        unitPrice,
      },
    });
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
    return this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        id: { in: itemIds },
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
      if (!item.variant.inventory || item.variant.inventory.availableQty < item.quantity) {
        issues.push(`Insufficient stock for ${item.variant.name}`);
      }
    }

    return { valid: issues.length === 0, issues, cart };
  }
}
