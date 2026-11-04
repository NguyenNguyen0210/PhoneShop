import { CartService } from '../src/modules/cart/cart.service';

describe('Cart concurrency and selected-item validation', () => {
  let prisma: any;
  let service: CartService;

  beforeEach(() => {
    prisma = {
      cart: { findUnique: jest.fn().mockResolvedValue({ id: 'cart-1', items: [] }) },
      cartItem: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      inventory: { findUnique: jest.fn().mockResolvedValue({ availableQty: 10 }) },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({ price: 100, isActive: true, product: { brand: { isActive: true } } }),
      },
      flashSaleItem: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    service = new CartService(prisma);
  });

  it('retries a concurrent add against the newest cart quantity', async () => {
    prisma.cartItem.findUnique
      .mockResolvedValueOnce({ id: 'row-1', quantity: 1 })
      .mockResolvedValueOnce({ id: 'row-1', quantity: 3 })
      .mockResolvedValueOnce({ id: 'row-1', quantity: 5 });
    prisma.cartItem.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await service.addItem('user-1', { variantId: 'variant-1', quantity: 2 });

    expect(result).toEqual(expect.objectContaining({ quantity: 5 }));
    expect(prisma.cartItem.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'row-1', quantity: 1 },
      data: { quantity: 3, unitPrice: 100 },
    });
    expect(prisma.cartItem.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'row-1', quantity: 3 },
      data: { quantity: 5, unitPrice: 100 },
    });
  });

  it('checks stock after a lost update race instead of exceeding availability', async () => {
    prisma.inventory.findUnique.mockResolvedValue({ availableQty: 4 });
    prisma.cartItem.findUnique
      .mockResolvedValueOnce({ id: 'row-1', quantity: 1 })
      .mockResolvedValueOnce({ id: 'row-1', quantity: 3 });
    prisma.cartItem.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.addItem('user-1', { variantId: 'variant-1', quantity: 2 }))
      .rejects.toThrow('Insufficient stock');
    expect(prisma.cartItem.updateMany).toHaveBeenCalledTimes(1);
  });

  it('ignores invalid unselected rows but rejects missing selected IDs', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          id: 'row-1', variantId: 'variant-1',
          variant: { isActive: true, name: 'Phone A', inventory: { availableQty: 3 } },
          quantity: 1,
        },
        {
          id: 'row-2', variantId: 'variant-2',
          variant: { isActive: false, name: 'Phone B', inventory: { availableQty: 0 } },
          quantity: 1,
        },
      ],
    });

    expect((await service.validateCart('user-1', 'variant-1')).valid).toBe(true);
    const selectedWithMissing = await service.validateCart('user-1', 'variant-1,missing');
    expect(selectedWithMissing.valid).toBe(false);
    expect(selectedWithMissing.issues).toEqual(expect.arrayContaining([
      expect.stringContaining('missing'),
    ]));
    expect((await service.validateCart('user-1')).valid).toBe(false);
  });
});
