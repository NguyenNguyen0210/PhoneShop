import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { PaymentMethod, ShippingMethod } from '@prisma/client';

const mockFn = () => (jest.fn() as any);

describe('OrdersService - Flash Sale Atomic Reservation', () => {
  let service: OrdersService;
  let prisma: any;
  let orderQueue: any;

  beforeEach(() => {
    orderQueue = {
      add: mockFn().mockResolvedValue({ id: 'job-1' }),
    };

    prisma = {
      cart: {
        findUnique: mockFn(),
      },
      $transaction: mockFn(),
    };

    service = new OrdersService(prisma as any, orderQueue as any);
  });

  it('should apply flashPrice and increment soldCount when within stock limit', async () => {
    const userId = 'user-1';
    const dto = {
      addressId: 'addr-1',
      paymentMethod: PaymentMethod.COD,
      shippingMethod: ShippingMethod.STANDARD,
    };

    const mockCart = {
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          variantId: 'var-1',
          quantity: 2,
          unitPrice: 20000000,
          variant: {
            id: 'var-1',
            name: 'iPhone 15 Black',
            sku: 'IP15-BLK',
            isActive: true,
            price: 20000000,
            product: { name: 'iPhone 15' },
            inventory: { availableQty: 10 },
          },
        },
      ],
    };

    prisma.cart.findUnique.mockResolvedValue(mockCart);

    const mockTx: any = {
      address: {
        findFirst: mockFn().mockResolvedValue({ id: 'addr-1', userId }),
      },
      productVariant: {
        findMany: mockFn().mockResolvedValue([{ id: 'var-1', price: 20000000 }]),
      },
      flashSaleItem: {
        findFirst: mockFn().mockResolvedValue({
          id: 'fsi-1',
          campaignId: 'camp-1',
          variantId: 'var-1',
          flashPrice: 15000000,
          stockLimit: 5,
          soldCount: 1,
        }),
        updateMany: mockFn().mockResolvedValue({ count: 1 }),
      },
      cartItem: {
        update: mockFn(),
        deleteMany: mockFn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: mockFn().mockResolvedValue([{ id: 'imei-1' }, { id: 'imei-2' }]),
      imeiDevice: {
        updateMany: mockFn().mockResolvedValue({ count: 2 }),
      },
      inventory: {
        update: mockFn(),
        updateMany: mockFn().mockResolvedValue({ count: 1 }),
      },
      order: {
        create: mockFn().mockImplementation((args: any) => {
          return { id: 'ord-1', ...args.data };
        }),
      },
      shipping: {
        create: mockFn().mockResolvedValue({ id: 'ship-1' }),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });

    const order = await service.checkout(userId, dto as any);

    // Verify atomic reservation was called with soldCount <= stockLimit - quantity
    expect(mockTx.flashSaleItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'fsi-1',
        soldCount: { lte: 3 }, // 5 - 2
      },
      data: {
        soldCount: { increment: 2 },
      },
    });

    // Subtotal should use flashPrice: 15,000,000 * 2 = 30,000,000
    expect(order.subtotal).toBe(30000000);
    expect(order.items.create[0].unitPrice).toBe(15000000);
  });

  it('should throw BadRequestException when overselling flash sale item (reserved.count === 0)', async () => {
    const userId = 'user-1';
    const dto = {
      addressId: 'addr-1',
      paymentMethod: PaymentMethod.COD,
      shippingMethod: ShippingMethod.STANDARD,
    };

    const mockCart = {
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          variantId: 'var-1',
          quantity: 2,
          unitPrice: 20000000,
          variant: {
            id: 'var-1',
            name: 'iPhone 15 Black',
            sku: 'IP15-BLK',
            isActive: true,
            price: 20000000,
            product: { name: 'iPhone 15' },
            inventory: { availableQty: 10 },
          },
        },
      ],
    };

    prisma.cart.findUnique.mockResolvedValue(mockCart);

    const mockTx: any = {
      address: {
        findFirst: mockFn().mockResolvedValue({ id: 'addr-1', userId }),
      },
      productVariant: {
        findMany: mockFn().mockResolvedValue([{ id: 'var-1', price: 20000000 }]),
      },
      flashSaleItem: {
        findFirst: mockFn().mockResolvedValue({
          id: 'fsi-1',
          campaignId: 'camp-1',
          variantId: 'var-1',
          flashPrice: 15000000,
          stockLimit: 5,
          soldCount: 4,
        }),
        updateMany: mockFn().mockResolvedValue({ count: 0 }), // Oversold!
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });

    await expect(service.checkout(userId, dto as any)).rejects.toThrow(BadRequestException);
    await expect(service.checkout(userId, dto as any)).rejects.toThrow(
      'đã hết suất ưu đãi Flash Sale. Vui lòng cập nhật lại giỏ hàng.',
    );
  });

  it('should stack voucher discount on top of flash sale subtotal', async () => {
    const userId = 'user-1';
    const dto = {
      addressId: 'addr-1',
      paymentMethod: PaymentMethod.COD,
      shippingMethod: ShippingMethod.STANDARD,
      voucherCode: 'SALE500K',
    };

    const mockCart = {
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          variantId: 'var-1',
          quantity: 1,
          unitPrice: 20000000,
          variant: {
            id: 'var-1',
            name: 'iPhone 15 Black',
            sku: 'IP15-BLK',
            isActive: true,
            price: 20000000,
            product: { name: 'iPhone 15' },
            inventory: { availableQty: 10 },
          },
        },
      ],
    };

    prisma.cart.findUnique.mockResolvedValue(mockCart);

    const mockTx: any = {
      address: {
        findFirst: mockFn().mockResolvedValue({ id: 'addr-1', userId }),
      },
      productVariant: {
        findMany: mockFn().mockResolvedValue([{ id: 'var-1', price: 20000000 }]),
      },
      flashSaleItem: {
        findFirst: mockFn().mockResolvedValue({
          id: 'fsi-1',
          campaignId: 'camp-1',
          variantId: 'var-1',
          flashPrice: 15000000,
          stockLimit: 5,
          soldCount: 0,
        }),
        updateMany: mockFn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: mockFn().mockResolvedValue([{ id: 'vouch-1' }]),
      voucher: {
        findUnique: mockFn().mockResolvedValue({
          id: 'vouch-1',
          code: 'SALE500K',
          isActive: true,
          type: 'FIXED_AMOUNT',
          value: 500000,
          startAt: new Date(Date.now() - 10000),
          endAt: new Date(Date.now() + 10000),
          usageLimit: 100,
          usageCount: 10,
        }),
        updateMany: mockFn().mockResolvedValue({ count: 1 }),
      },
      voucherUsage: {
        create: mockFn().mockResolvedValue({ id: 'vu-1' }),
        count: mockFn().mockResolvedValue(1),
      },
      cartItem: {
        update: mockFn(),
        deleteMany: mockFn().mockResolvedValue({ count: 1 }),
      },
      imeiDevice: {
        updateMany: mockFn().mockResolvedValue({ count: 1 }),
      },
      inventory: {
        update: mockFn(),
        updateMany: mockFn().mockResolvedValue({ count: 1 }),
      },
      order: {
        create: mockFn().mockImplementation((args: any) => {
          return { id: 'ord-1', ...args.data };
        }),
      },
      shipping: {
        create: mockFn().mockResolvedValue({ id: 'ship-1' }),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });

    const order = await service.checkout(userId, dto as any);

    // Flash subtotal: 15,000,000 - voucher 500,000 = 14,500,000 (shipping is 0 because > 500,000)
    expect(order.subtotal).toBe(15000000);
    expect(order.discountAmount).toBe(500000);
    expect(order.totalAmount).toBe(14500000);
  });
});
