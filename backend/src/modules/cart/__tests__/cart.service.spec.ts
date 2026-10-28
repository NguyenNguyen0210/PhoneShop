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
      flashSaleItem: {
        findFirst: mockFn().mockResolvedValue(null),
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

  describe('Flash Sale dynamic pricing in Cart', () => {
    it('sets unitPrice to flashPrice when adding an item in an active flash sale', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        isActive: true,
        price: 20000000,
        product: { id: 'prod-1', name: 'Flash Phone', brand: { id: 'b1', isActive: true } },
      });

      prisma.flashSaleItem.findFirst.mockResolvedValue({
        id: 'fsi-1',
        variantId: 'var-1',
        flashPrice: 15000000,
        stockLimit: 10,
        soldCount: 2,
      });

      await service.addItem('user-1', { variantId: 'var-1', quantity: 1 });

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          variantId: 'var-1',
          quantity: 1,
          unitPrice: 15000000,
        },
      });
    });

    it('returns flashPrice, isFlashSale, flashQuotaLeft and correct subtotal in getCart', async () => {
      const cartWithItem = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'ci-1',
            variantId: 'var-1',
            quantity: 2,
            unitPrice: 20000000,
            variant: {
              id: 'var-1',
              price: 20000000,
              product: { id: 'prod-1', name: 'Phone' },
            },
          },
        ],
      };
      prisma.cart.findUnique.mockResolvedValue(cartWithItem);

      prisma.flashSaleItem.findFirst.mockResolvedValue({
        id: 'fsi-1',
        variantId: 'var-1',
        flashPrice: 15000000,
        stockLimit: 10,
        soldCount: 3,
      });

      const res = await service.getCart('user-1');
      const firstItem = res.items[0] as any;
      expect(firstItem.unitPrice).toBe(15000000);
      expect(firstItem.originalPrice).toBe(20000000);
      expect(firstItem.isFlashSale).toBe(true);
      expect(firstItem.flashQuotaLeft).toBe(7);
      expect(res.subtotal).toBe(30000000); // 15,000,000 * 2
    });
  });
});
