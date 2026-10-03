import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { ImeiStatus } from '@prisma/client';

describe('OrdersService - Selective Checkout', () => {
  let service: OrdersService;
  let mockPrisma: any;
  let mockTx: any;
  let mockQueue: any;

  beforeEach(() => {
    mockTx = {
      address: {
        findFirst: jest.fn().mockImplementation(() =>
          Promise.resolve({ id: 'addr-1', userId: 'user-1' }),
        ),
      },
      productVariant: {
        findMany: jest.fn().mockImplementation((args: any) => {
          const ids = args?.where?.id?.in || [];
          return Promise.resolve(
            ids.map((id: string) => ({
              id,
              price: id === 'var-1' ? 10000000 : 20000000,
            })),
          );
        }),
      },
      $queryRaw: jest.fn().mockImplementation((query: any) => {
        return Promise.resolve([{ id: 'imei-1' }]);
      }),
      imeiDevice: {
        updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
      },
      inventory: {
        updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
      },
      order: {
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({
            id: 'order-1',
            orderNumber: args.data.orderNumber,
            totalAmount: args.data.totalAmount,
            subtotal: args.data.subtotal,
            items: args.data.items.create,
          }),
        ),
      },
      cartItem: {
        update: jest.fn().mockReturnValue(Promise.resolve({})),
        deleteMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
      },
    };

    mockPrisma = {
      cart: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        return callback(mockTx);
      }),
    };

    mockQueue = {
      add: jest.fn().mockReturnValue(Promise.resolve()),
    };

    service = new OrdersService(mockPrisma, mockQueue);
  });

  it('should throw BadRequestException if selectedItemIds does not match any item in cart', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          variantId: 'var-1',
          quantity: 1,
          unitPrice: 10000000,
          variant: {
            id: 'var-1',
            name: 'iPhone 15',
            sku: 'IP15',
            isActive: true,
            inventory: { availableQty: 5 },
          },
        },
      ],
    });

    await expect(
      service.checkout('user-1', {
        addressId: 'addr-1',
        selectedItemIds: ['item-unknown'],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if selectedItemIds contains IDs not in user cart', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          variantId: 'var-1',
          quantity: 1,
          unitPrice: 10000000,
          variant: {
            id: 'var-1',
            name: 'iPhone 15',
            sku: 'IP15',
            isActive: true,
            inventory: { availableQty: 5 },
          },
        },
      ],
    });

    await expect(
      service.checkout('user-1', {
        addressId: 'addr-1',
        selectedItemIds: ['item-1', 'item-unknown'],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should only include selected items in created order and only delete selected items from cartItem', async () => {
    const item1 = {
      id: 'item-1',
      variantId: 'var-1',
      quantity: 1,
      unitPrice: 10000000,
      variant: {
        id: 'var-1',
        name: 'iPhone 15',
        sku: 'IP15',
        isActive: true,
        inventory: { availableQty: 5 },
      },
    };
    const item2 = {
      id: 'item-2',
      variantId: 'var-2',
      quantity: 1,
      unitPrice: 20000000,
      variant: {
        id: 'var-2',
        name: 'iPhone 15 Pro',
        sku: 'IP15P',
        isActive: true,
        inventory: { availableQty: 5 },
      },
    };

    mockPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [item1, item2],
    });

    const result = await service.checkout('user-1', {
      addressId: 'addr-1',
      selectedItemIds: ['item-1'],
    } as any);

    // Only item-1 should be in order
    expect(result.items).toHaveLength(1);
    expect(result.items[0].variantId).toBe('var-1');

    // Only item-1 variant inventory should be held (atomic guarded hold)
    expect(mockTx.inventory.updateMany).toHaveBeenCalledTimes(1);
    expect(mockTx.inventory.updateMany).toHaveBeenCalledWith({
      where: { variantId: 'var-1', availableQty: { gte: 1 } },
      data: {
        reservedQty: { increment: 1 },
        availableQty: { decrement: 1 },
      },
    });

    // Only item-1 should be deleted from cartItem
    expect(mockTx.cartItem.deleteMany).toHaveBeenCalledWith({
      where: {
        cartId: 'cart-1',
        id: { in: ['item-1'] },
      },
    });
  });

  it('should checkout all items in cart when selectedItemIds is omitted', async () => {
    const item1 = {
      id: 'item-1',
      variantId: 'var-1',
      quantity: 1,
      unitPrice: 10000000,
      variant: {
        id: 'var-1',
        name: 'iPhone 15',
        sku: 'IP15',
        isActive: true,
        inventory: { availableQty: 5 },
      },
    };
    const item2 = {
      id: 'item-2',
      variantId: 'var-2',
      quantity: 1,
      unitPrice: 20000000,
      variant: {
        id: 'var-2',
        name: 'iPhone 15 Pro',
        sku: 'IP15P',
        isActive: true,
        inventory: { availableQty: 5 },
      },
    };

    mockPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [item1, item2],
    });

    const result = await service.checkout('user-1', {
      addressId: 'addr-1',
    } as any);

    expect(result.items).toHaveLength(2);
    expect(mockTx.cartItem.deleteMany).toHaveBeenCalledWith({
      where: {
        cartId: 'cart-1',
        id: { in: ['item-1', 'item-2'] },
      },
    });
  });
});
