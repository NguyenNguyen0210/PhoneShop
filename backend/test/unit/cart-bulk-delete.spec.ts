import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CartService } from '../../src/modules/cart/cart.service';

describe('CartService - removeItemsBulk', () => {
  let service: CartService;
  let prisma: {
    cart: { findUnique: any; create: any };
    cartItem: { deleteMany: any };
  };

  beforeEach(() => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
    };

    service = new CartService(prisma as any);
  });

  it('should delete multiple items belonging to the user cart', async () => {
    const mockCart = { id: 'cart-uuid-1', userId: 'user-uuid-1', items: [] };
    (prisma.cart.findUnique as any).mockResolvedValue(mockCart);
    (prisma.cartItem.deleteMany as any).mockResolvedValue({ count: 2 });

    const itemIds = ['item-uuid-1', 'item-uuid-2'];
    const result = await (service as any).removeItemsBulk('user-uuid-1', itemIds);

    expect(prisma.cart.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-uuid-1' },
      include: expect.any(Object),
    });
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: {
        cartId: 'cart-uuid-1',
        id: { in: itemIds },
      },
    });
    expect(result).toEqual({ count: 2 });
  });

  it('should scope deletion strictly to the user cartId even with foreign itemIds (IDOR protection)', async () => {
    const mockCart = { id: 'cart-uuid-1', userId: 'user-uuid-1', items: [] };
    (prisma.cart.findUnique as any).mockResolvedValue(mockCart);
    (prisma.cartItem.deleteMany as any).mockResolvedValue({ count: 1 });

    const mixedItemIds = ['user-1-item', 'foreign-cart-item'];
    const result = await service.removeItemsBulk('user-uuid-1', mixedItemIds);

    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: {
        cartId: 'cart-uuid-1',
        id: { in: mixedItemIds },
      },
    });
    expect(result).toEqual({ count: 1 });
  });
});
