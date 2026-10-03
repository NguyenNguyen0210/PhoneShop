import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { WishlistService } from '../../src/modules/wishlist/wishlist.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('WishlistService Unit Tests', () => {
  let service: WishlistService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      wishlist: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      wishlistItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      productVariant: {
        findFirst: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn(),
      },
      cart: {
        upsert: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(mockPrisma)),
    };

    service = new WishlistService(mockPrisma as any);
  });

  describe('getWishlist', () => {
    it('should query wishlist with enriched product relations', async () => {
      const mockResult = {
        id: 'w-1',
        userId: 'u-1',
        items: [
          {
            id: 'wi-1',
            productId: 'p-1',
            product: {
              id: 'p-1',
              name: 'iPhone 16 Pro Max',
              brand: { name: 'Apple' },
              variants: [{ id: 'v-1', price: 34990000, isActive: true, inventory: { availableQty: 10 } }],
            },
          },
        ],
      };

      mockPrisma.wishlist.findUnique.mockResolvedValue(mockResult);

      const result = await service.getWishlist('u-1');

      expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u-1' },
          include: expect.objectContaining({
            items: expect.objectContaining({
              include: expect.objectContaining({
                product: expect.objectContaining({
                  include: expect.objectContaining({
                    brand: true,
                    category: true,
                  }),
                }),
              }),
            }),
          }),
        }),
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('addProduct', () => {
    it('should throw ConflictException if product already in wishlist', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1', userId: 'u-1' });
      mockPrisma.wishlistItem.findUnique.mockResolvedValue({ id: 'wi-1' });

      await expect(service.addProduct('u-1', { productId: 'p-1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('moveToCart', () => {
    it('should throw NotFoundException if item is not in wishlist', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1', userId: 'u-1' });
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(null);

      await expect(service.moveToCart('u-1', 'p-1')).rejects.toThrow(NotFoundException);
    });

    it('should successfully add active variant to cart and remove from wishlist', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1', userId: 'u-1' });
      mockPrisma.wishlistItem.findUnique.mockResolvedValue({ id: 'wi-1', wishlistId: 'w-1', productId: 'p-1' });
      mockPrisma.productVariant.findFirst.mockResolvedValue({ id: 'v-1', productId: 'p-1', price: 30000000 });
      mockPrisma.inventory.findUnique.mockResolvedValue({ variantId: 'v-1', availableQty: 5 });
      mockPrisma.cart.upsert.mockResolvedValue({ id: 'c-1', userId: 'u-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue({ id: 'ci-1' });
      mockPrisma.wishlistItem.delete.mockResolvedValue({ id: 'wi-1' });

      const res = await service.moveToCart('u-1', 'p-1');

      expect(res).toEqual({ success: true, message: 'Product moved to cart' });
      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { cartId: 'c-1', variantId: 'v-1', quantity: 1, unitPrice: 30000000 },
        }),
      );
      expect(mockPrisma.wishlistItem.delete).toHaveBeenCalledWith({ where: { id: 'wi-1' } });
    });
  });
});
