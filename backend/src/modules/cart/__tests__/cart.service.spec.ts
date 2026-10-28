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

  describe('CartService - flash quota / read-only getCart / P2002 retry / bulk delete', () => {
    let service: CartService;
    let prisma: any;

    const activeVariant = {
      id: 'var-1',
      isActive: true,
      price: 20000000,
      product: { id: 'prod-1', name: 'Phone', brand: { id: 'b1', isActive: true } },
    };

    beforeEach(() => {
      prisma = {
        cart: {
          findUnique: mockFn().mockResolvedValue({ id: 'cart-1', userId: 'user-1', items: [] }),
          create: mockFn(),
        },
        inventory: {
          findUnique: mockFn().mockResolvedValue({ variantId: 'var-1', availableQty: 10 }),
        },
        productVariant: {
          findUnique: mockFn().mockResolvedValue(activeVariant),
        },
        cartItem: {
          findUnique: mockFn().mockResolvedValue(null),
          findFirst: mockFn(),
          create: mockFn().mockResolvedValue({ id: 'ci-new', quantity: 1 }),
          update: mockFn().mockResolvedValue({ id: 'ci-1', quantity: 3 }),
          deleteMany: mockFn().mockResolvedValue({ count: 1 }),
        },
        flashSaleItem: {
          findFirst: mockFn().mockResolvedValue(null),
        },
      };

      service = new CartService(prisma);
    });

    it('C1: addItem rejects when flash quotaLeft < requested quantity even though inventory has stock', async () => {
      prisma.flashSaleItem.findFirst.mockResolvedValue({
        id: 'fsi-1',
        variantId: 'var-1',
        flashPrice: 15000000,
        stockLimit: 10,
        soldCount: 8, // quotaLeft = 2
      });

      await expect(
        service.addItem('user-1', { variantId: 'var-1', quantity: 3 }),
      ).rejects.toThrow('Flash Sale chỉ còn 2 suất cho phiên bản này');

      expect(prisma.cartItem.create).not.toHaveBeenCalled();
      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('C1: merge path enforces flash quota on the combined quantity', async () => {
      prisma.cartItem.findUnique.mockResolvedValue({
        id: 'ci-1',
        cartId: 'cart-1',
        variantId: 'var-1',
        quantity: 1,
      });
      prisma.flashSaleItem.findFirst.mockResolvedValue({
        id: 'fsi-1',
        variantId: 'var-1',
        flashPrice: 15000000,
        stockLimit: 3,
        soldCount: 2, // quotaLeft = 1
      });

      // 1 (existing) + 1 (requested) = 2 > quotaLeft 1 → reject
      await expect(
        service.addItem('user-1', { variantId: 'var-1', quantity: 1 }),
      ).rejects.toThrow('Flash Sale chỉ còn 1 suất cho phiên bản này');

      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('C1: updateItem rejects when requested quantity exceeds flash quota', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'ci-1',
        cartId: 'cart-1',
        variantId: 'var-1',
        quantity: 1,
      });
      prisma.flashSaleItem.findFirst.mockResolvedValue({
        id: 'fsi-1',
        variantId: 'var-1',
        flashPrice: 15000000,
        stockLimit: 10,
        soldCount: 9, // quotaLeft = 1
      });

      await expect(
        service.updateItem('user-1', 'ci-1', { quantity: 2 }),
      ).rejects.toThrow('Flash Sale chỉ còn 1 suất cho phiên bản này');

      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('C3: addItem catches P2002 on create and retries the merge path once', async () => {
      prisma.cartItem.findUnique
        .mockResolvedValueOnce(null) // initial check: no existing item
        .mockResolvedValueOnce({
          id: 'ci-1',
          cartId: 'cart-1',
          variantId: 'var-1',
          quantity: 1,
        }); // re-read after the unique violation
      prisma.cartItem.create.mockRejectedValue({ code: 'P2002' });

      const result = await service.addItem('user-1', { variantId: 'var-1', quantity: 2 });

      expect(prisma.cartItem.create).toHaveBeenCalledTimes(1);
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'ci-1' },
        data: { quantity: 3, unitPrice: 20000000 },
      });
      expect(result).toEqual({ id: 'ci-1', quantity: 3 });
    });

    it('C2: getCart performs no cartItem.update (read-only enrichment)', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'ci-1',
            variantId: 'var-1',
            quantity: 2,
            unitPrice: 20000000,
            variant: { id: 'var-1', price: 20000000, product: { id: 'prod-1' } },
          },
        ],
      });
      prisma.flashSaleItem.findFirst.mockResolvedValue({
        id: 'fsi-1',
        variantId: 'var-1',
        flashPrice: 15000000,
        stockLimit: 10,
        soldCount: 3,
      });

      const res = await service.getCart('user-1');

      expect(prisma.cartItem.update).not.toHaveBeenCalled();
      const item = res.items[0] as any;
      expect(item.unitPrice).toBe(15000000); // enrichment still applied in-memory
      expect(item.originalPrice).toBe(20000000);
      expect(item.isFlashSale).toBe(true);
      expect(item.flashQuotaLeft).toBe(7);
    });

    it('C4: validateCart flags items whose product brand is inactive', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'ci-1',
            variantId: 'var-1',
            quantity: 1,
            unitPrice: 20000000,
            variant: {
              id: 'var-1',
              name: 'Phone X',
              isActive: true,
              price: 20000000,
              product: { id: 'prod-1', brand: { id: 'b1', isActive: false } },
              inventory: { variantId: 'var-1', availableQty: 5 },
            },
          },
        ],
      });

      const res = await service.validateCart('user-1');

      expect(res.valid).toBe(false);
      expect(res.issues).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động'),
        ]),
      );
    });

    it('C5: removeItemsBulk matches cart item ids OR variant ids', async () => {
      await service.removeItemsBulk('user-1', ['ci-1', 'var-9']);

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: {
          cartId: 'cart-1',
          OR: [
            { id: { in: ['ci-1', 'var-9'] } },
            { variantId: { in: ['ci-1', 'var-9'] } },
          ],
        },
      });
    });
  });
});
