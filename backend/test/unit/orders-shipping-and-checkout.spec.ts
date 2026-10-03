import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { ShippingMethod, ShippingStatus, VoucherType } from '@prisma/client';

describe('OrdersService - Shipping Calculation & Checkout Integration', () => {
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
              price: id === 'var-cheap' ? 200000 : 10000000,
            })),
          );
        }),
      },
      voucher: {
        findUnique: jest.fn(),
        update: jest.fn().mockReturnValue(Promise.resolve({})),
        updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
      },
      voucherUsage: {
        count: jest.fn().mockReturnValue(Promise.resolve(0)),
        create: jest.fn().mockReturnValue(Promise.resolve({})),
      },
      $queryRaw: jest.fn().mockImplementation(() =>
        Promise.resolve([{ id: 'imei-1' }]),
      ),
      imeiDevice: {
        updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
      },
      inventory: {
        update: jest.fn().mockReturnValue(Promise.resolve({})),
      },
      order: {
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({
            id: 'order-1',
            orderNumber: args.data.orderNumber,
            totalAmount: args.data.totalAmount,
            subtotal: args.data.subtotal,
            shippingFee: args.data.shippingFee,
            shippingMethod: args.data.shippingMethod,
            discountAmount: args.data.discountAmount,
            items: args.data.items?.create || [],
          }),
        ),
      },
      shipping: {
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({
            id: 'ship-1',
            orderId: args.data.orderId,
            providerName: args.data.providerName,
            shippingFee: args.data.shippingFee,
            status: args.data.status,
            estimatedDeliveryDate: args.data.estimatedDeliveryDate,
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

  describe('calculateShippingFee', () => {
    describe('when subtotal <= 500,000 VND (standard rate)', () => {
      it('should charge 15,000 VND for ECONOMY', () => {
        expect(service.calculateShippingFee(ShippingMethod.ECONOMY, 300000)).toBe(15000);
        expect(service.calculateShippingFee(ShippingMethod.ECONOMY, 500000)).toBe(15000);
        expect(service.calculateShippingFee(ShippingMethod.ECONOMY, 0)).toBe(15000);
      });

      it('should charge 30,000 VND for STANDARD', () => {
        expect(service.calculateShippingFee(ShippingMethod.STANDARD, 300000)).toBe(30000);
        expect(service.calculateShippingFee(ShippingMethod.STANDARD, 500000)).toBe(30000);
      });

      it('should charge 60,000 VND for EXPRESS_2H', () => {
        expect(service.calculateShippingFee(ShippingMethod.EXPRESS_2H, 300000)).toBe(60000);
        expect(service.calculateShippingFee(ShippingMethod.EXPRESS_2H, 500000)).toBe(60000);
      });
    });

    describe('when subtotal > 500,000 VND (free shipping threshold)', () => {
      it('should charge 0 VND for ECONOMY', () => {
        expect(service.calculateShippingFee(ShippingMethod.ECONOMY, 500001)).toBe(0);
        expect(service.calculateShippingFee(ShippingMethod.ECONOMY, 2000000)).toBe(0);
      });

      it('should charge 0 VND for STANDARD', () => {
        expect(service.calculateShippingFee(ShippingMethod.STANDARD, 500001)).toBe(0);
        expect(service.calculateShippingFee(ShippingMethod.STANDARD, 10000000)).toBe(0);
      });

      it('should charge 30,000 VND (discounted by 30k from 60k) for EXPRESS_2H', () => {
        expect(service.calculateShippingFee(ShippingMethod.EXPRESS_2H, 500001)).toBe(30000);
        expect(service.calculateShippingFee(ShippingMethod.EXPRESS_2H, 2000000)).toBe(30000);
      });
    });
  });

  describe('computeEstimatedDeliveryDate', () => {
    it('should add 2 hours for EXPRESS_2H', () => {
      const fixedDate = new Date('2026-10-03T10:00:00.000Z');
      const result = service.computeEstimatedDeliveryDate(ShippingMethod.EXPRESS_2H, fixedDate);
      expect(result.toISOString()).toBe('2026-10-03T12:00:00.000Z');
    });

    it('should add 2 days for STANDARD', () => {
      const fixedDate = new Date('2026-10-03T10:00:00.000Z');
      const result = service.computeEstimatedDeliveryDate(ShippingMethod.STANDARD, fixedDate);
      expect(result.toISOString()).toBe('2026-10-05T10:00:00.000Z');
    });

    it('should add 4 days for ECONOMY', () => {
      const fixedDate = new Date('2026-10-03T10:00:00.000Z');
      const result = service.computeEstimatedDeliveryDate(ShippingMethod.ECONOMY, fixedDate);
      expect(result.toISOString()).toBe('2026-10-07T10:00:00.000Z');
    });
  });

  describe('checkout integration with shipping methods', () => {
    const setupCart = (unitPrice: number) => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            id: 'item-1',
            variantId: unitPrice <= 500000 ? 'var-cheap' : 'var-expensive',
            quantity: 1,
            unitPrice,
            variant: {
              id: unitPrice <= 500000 ? 'var-cheap' : 'var-expensive',
              name: 'Test Device',
              sku: 'TD-01',
              isActive: true,
              inventory: { availableQty: 5 },
            },
          },
        ],
      });
    };

    it('should default to STANDARD shipping method and standard provider name when omitted', async () => {
      setupCart(200000); // <= 500k -> STANDARD fee is 30,000

      const order = await service.checkout('user-1', {
        addressId: 'addr-1',
      });

      expect(order.shippingMethod).toBe(ShippingMethod.STANDARD);
      expect(order.shippingFee).toBe(30000);
      expect(order.totalAmount).toBe(230000); // 200k + 30k

      expect(mockTx.shipping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          providerName: 'Giao hàng Tiêu chuẩn',
          shippingFee: 30000,
          status: ShippingStatus.PENDING,
          estimatedDeliveryDate: expect.any(Date),
        }),
      });
    });

    it('should assign ECONOMY shipping method with 15k fee when subtotal <= 500k', async () => {
      setupCart(200000);

      const order = await service.checkout('user-1', {
        addressId: 'addr-1',
        shippingMethod: ShippingMethod.ECONOMY,
      });

      expect(order.shippingMethod).toBe(ShippingMethod.ECONOMY);
      expect(order.shippingFee).toBe(15000);
      expect(order.totalAmount).toBe(215000); // 200k + 15k

      expect(mockTx.shipping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          providerName: 'Giao hàng Tiết kiệm',
          shippingFee: 15000,
          status: ShippingStatus.PENDING,
        }),
      });
    });

    it('should assign ECONOMY shipping method with 0 fee when subtotal > 500k', async () => {
      setupCart(10000000);

      const order = await service.checkout('user-1', {
        addressId: 'addr-1',
        shippingMethod: ShippingMethod.ECONOMY,
      });

      expect(order.shippingMethod).toBe(ShippingMethod.ECONOMY);
      expect(order.shippingFee).toBe(0);
      expect(order.totalAmount).toBe(10000000); // 10M + 0

      expect(mockTx.shipping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerName: 'Giao hàng Tiết kiệm',
          shippingFee: 0,
        }),
      });
    });

    it('should assign EXPRESS_2H with 60k fee when subtotal <= 500k and provider "Giao hàng Hỏa tốc 2h"', async () => {
      setupCart(200000);

      const order = await service.checkout('user-1', {
        addressId: 'addr-1',
        shippingMethod: ShippingMethod.EXPRESS_2H,
      });

      expect(order.shippingMethod).toBe(ShippingMethod.EXPRESS_2H);
      expect(order.shippingFee).toBe(60000);
      expect(order.totalAmount).toBe(260000); // 200k + 60k

      expect(mockTx.shipping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          providerName: 'Giao hàng Hỏa tốc 2h',
          shippingFee: 60000,
          status: ShippingStatus.PENDING,
        }),
      });
    });

    it('should assign EXPRESS_2H with 30k fee when subtotal > 500k', async () => {
      setupCart(10000000);

      const order = await service.checkout('user-1', {
        addressId: 'addr-1',
        shippingMethod: ShippingMethod.EXPRESS_2H,
      });

      expect(order.shippingMethod).toBe(ShippingMethod.EXPRESS_2H);
      expect(order.shippingFee).toBe(30000);
      expect(order.totalAmount).toBe(10030000); // 10M + 30k

      expect(mockTx.shipping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          providerName: 'Giao hàng Hỏa tốc 2h',
          shippingFee: 30000,
          status: ShippingStatus.PENDING,
        }),
      });
    });

    it('should correctly cap FREE_SHIPPING voucher discount to the calculated shipping fee', async () => {
      setupCart(200000); // subtotal 200k, EXPRESS_2H fee is 60,000

      mockTx.voucher.findUnique.mockResolvedValue({
        id: 'vouch-free-ship',
        code: 'FREESHIP70K',
        type: VoucherType.FREE_SHIPPING,
        value: 70000, // voucher value is 70k, but shipping fee is 60k
        isActive: true,
        startAt: new Date(Date.now() - 10000),
        endAt: new Date(Date.now() + 10000),
        usageLimit: 100,
        usageCount: 0,
        minOrderValue: null,
        perUserLimit: null,
      });

      const order = await service.checkout('user-1', {
        addressId: 'addr-1',
        shippingMethod: ShippingMethod.EXPRESS_2H,
        voucherCode: 'FREESHIP70K',
      });

      // Discount amount should be capped at shippingFee (60,000), not voucher value (70,000)
      expect(order.shippingFee).toBe(60000);
      expect(order.discountAmount).toBe(60000);
      expect(order.totalAmount).toBe(200000); // 200k subtotal - 60k discount + 60k shippingFee = 200k
    });

    it('should apply partial FREE_SHIPPING voucher discount when voucher value is lower than shipping fee', async () => {
      setupCart(200000); // subtotal 200k, EXPRESS_2H fee is 60,000

      mockTx.voucher.findUnique.mockResolvedValue({
        id: 'vouch-free-ship',
        code: 'FREESHIP20K',
        type: VoucherType.FREE_SHIPPING,
        value: 20000, // voucher value is 20k, lower than 60k
        isActive: true,
        startAt: new Date(Date.now() - 10000),
        endAt: new Date(Date.now() + 10000),
        usageLimit: 100,
        usageCount: 0,
        minOrderValue: null,
        perUserLimit: null,
      });

      const order = await service.checkout('user-1', {
        addressId: 'addr-1',
        shippingMethod: ShippingMethod.EXPRESS_2H,
        voucherCode: 'FREESHIP20K',
      });

      expect(order.shippingFee).toBe(60000);
      expect(order.discountAmount).toBe(20000);
      expect(order.totalAmount).toBe(240000); // 200k - 20k + 60k = 240k
    });
  });
});
