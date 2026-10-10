import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from '../cart.service';

const mockFn = () => jest.fn() as any;

describe('CartService - Brand Deactivation Validation', () => {
  let service: CartService;
  let prisma: any;

  const mockCart = {
    id: 'cart-1',
    userId: 'user-1',
    items: [],
  };

  beforeEach(() => {
    prisma = {
      cart: {
        findUnique: mockFn().mockResolvedValue(mockCart),
        create: mockFn().mockResolvedValue(mockCart),
      },
      inventory: {
        findUnique: mockFn().mockResolvedValue({
          variantId: 'var-1',
          availableQty: 10,
        }),
      },
      productVariant: {
        findUnique: mockFn(),
      },
      cartItem: {
        findUnique: mockFn().mockResolvedValue(null),
        findFirst: mockFn(),
        create: mockFn().mockResolvedValue({ id: 'ci-1', quantity: 1 }),
        update: mockFn().mockResolvedValue({ id: 'ci-1', quantity: 2 }),
      },
    };

    service = new CartService(prisma);
  });

  describe('addItem / addToCart', () => {
    it('throws BadRequestException when product brand isActive is false', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        isActive: true,
        price: 1000000,
        product: {
          id: 'prod-1',
          name: 'Inactive Phone',
          brand: {
            id: 'brand-1',
            name: 'Inactive Brand',
            isActive: false,
          },
        },
      });

      await expect(
        service.addItem('user-1', { variantId: 'var-1', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addItem('user-1', { variantId: 'var-1', quantity: 1 }),
      ).rejects.toThrow('Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động');

      expect(prisma.productVariant.findUnique).toHaveBeenCalledWith({
        where: { id: 'var-1' },
        include: { product: { include: { brand: true } } },
      });
    });

    it('successfully adds item when product brand isActive is true', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        isActive: true,
        price: 1000000,
        product: {
          id: 'prod-1',
          name: 'Active Phone',
          brand: {
            id: 'brand-1',
            name: 'Active Brand',
            isActive: true,
          },
        },
      });

      const result = await service.addItem('user-1', { variantId: 'var-1', quantity: 1 });
      expect(result).toBeDefined();
      expect(prisma.cartItem.create).toHaveBeenCalled();
    });

    it('also works via addToCart alias', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        isActive: true,
        price: 1000000,
        product: {
          id: 'prod-1',
          name: 'Inactive Phone',
          brand: {
            id: 'brand-1',
            name: 'Inactive Brand',
            isActive: false,
          },
        },
      });

      await expect(
        service.addToCart('user-1', { variantId: 'var-1', quantity: 1 }),
      ).rejects.toThrow('Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động');
    });
  });

  describe('updateItem / updateQuantity', () => {
    it('throws BadRequestException when product brand isActive is false', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'ci-1',
        cartId: 'cart-1',
        variantId: 'var-1',
        quantity: 1,
      });

      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        isActive: true,
        price: 1000000,
        product: {
          id: 'prod-1',
          name: 'Inactive Phone',
          brand: {
            id: 'brand-1',
            name: 'Inactive Brand',
            isActive: false,
          },
        },
      });

      await expect(
        service.updateItem('user-1', 'ci-1', { quantity: 2 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateItem('user-1', 'ci-1', { quantity: 2 }),
      ).rejects.toThrow('Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động');

      expect(prisma.productVariant.findUnique).toHaveBeenCalledWith({
        where: { id: 'var-1' },
        include: { product: { include: { brand: true } } },
      });
    });

    it('successfully updates item when product brand isActive is true', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'ci-1',
        cartId: 'cart-1',
        variantId: 'var-1',
        quantity: 1,
      });

      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        isActive: true,
        price: 1000000,
        product: {
          id: 'prod-1',
          name: 'Active Phone',
          brand: {
            id: 'brand-1',
            name: 'Active Brand',
            isActive: true,
          },
        },
      });

      const result = await service.updateItem('user-1', 'ci-1', { quantity: 2 });
      expect(result).toBeDefined();
      expect(prisma.cartItem.update).toHaveBeenCalled();
    });

    it('also works via updateQuantity alias', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'ci-1',
        cartId: 'cart-1',
        variantId: 'var-1',
        quantity: 1,
      });

      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        isActive: true,
        price: 1000000,
        product: {
          id: 'prod-1',
          name: 'Inactive Phone',
          brand: {
            id: 'brand-1',
            name: 'Inactive Brand',
            isActive: false,
          },
        },
      });

      await expect(
        service.updateQuantity('user-1', 'ci-1', { quantity: 2 }),
      ).rejects.toThrow('Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động');
    });
  });
});
