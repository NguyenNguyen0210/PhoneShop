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

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const subtotal = cart.items.reduce(
      (acc, item) => acc + Number(item.unitPrice) * item.quantity, 0,
    );
    return { ...cart, subtotal };
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
    });
    if (!variant || !variant.isActive) {
      throw new NotFoundException('Product variant not found or inactive');
    }

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
    });
    if (!variant || !variant.isActive) {
      throw new NotFoundException('Product variant not found or inactive');
    }

    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId: item.variantId },
    });
    if (!inventory || inventory.availableQty < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity, unitPrice: variant.price },
    });
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
