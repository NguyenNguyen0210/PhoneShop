import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { OrdersProcessor } from '../../src/modules/orders/orders.processor';
import { ImeiService } from '../../src/modules/imei/imei.service';
import { OrderStatus, ImeiStatus, VoucherType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('Orders & IMEI Concurrency and Lifecycle Tests', () => {
  describe('OrdersService - checkout & IMEI reservation with row-locking', () => {
    let ordersService: OrdersService;
    let mockPrisma: any;
    let mockOrderQueue: any;

    beforeEach(() => {
      mockOrderQueue = {
        add: jest.fn().mockReturnValue(Promise.resolve()),
      };
    });

    it('should acquire IMEIs using $queryRaw row-level locking and reserve them', async () => {
      const mockTx: any = {
        address: {
          findFirst: jest.fn().mockImplementation(() =>
            Promise.resolve({ id: 'addr-1', userId: 'user-1' }),
          ),
        },
        productVariant: {
          findMany: jest.fn().mockImplementation(() =>
            Promise.resolve([{ id: 'var-1', price: 10000000 }]),
          ),
        },
        $queryRaw: jest.fn().mockImplementation(() =>
          Promise.resolve([{ id: 'imei-uuid-1' }, { id: 'imei-uuid-2' }]),
        ),
        imeiDevice: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 2 })),
        },
        inventory: {
          update: jest.fn().mockReturnValue(Promise.resolve({})),
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        order: {
          create: jest.fn().mockImplementation((args: any) =>
            Promise.resolve({
              id: 'order-1',
              orderNumber: args.data.orderNumber,
              totalAmount: args.data.totalAmount,
              items: args.data.items.create,
            }),
          ),
        },
        cartItem: {
          deleteMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
      };

      mockPrisma = {
        cart: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'cart-1',
              items: [
                {
                  variantId: 'var-1',
                  quantity: 2,
                  unitPrice: 10000000,
                  variant: {
                    id: 'var-1',
                    name: 'iPhone 15 128GB',
                    sku: 'IP15-128',
                    isActive: true,
                    inventory: { availableQty: 5 },
                  },
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, mockOrderQueue);

      const result = await ordersService.checkout('user-1', {
        addressId: 'addr-1',
      } as any);

      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockTx.imeiDevice.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['imei-uuid-1', 'imei-uuid-2'] } },
        data: { status: ImeiStatus.RESERVED },
      });
      expect(mockTx.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-1', availableQty: { gte: 2 } },
        data: {
          reservedQty: { increment: 2 },
          availableQty: { decrement: 2 },
        },
      });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].imeiDeviceId).toBe('imei-uuid-1');
      expect(result.items[1].imeiDeviceId).toBe('imei-uuid-2');
    });

    it('should throw Insufficient stock when a concurrent checkout wins the atomic hold (count==0)', async () => {
      const mockTx: any = {
        address: {
          findFirst: jest.fn().mockImplementation(() =>
            Promise.resolve({ id: 'addr-1', userId: 'user-1' }),
          ),
        },
        productVariant: {
          findMany: jest.fn().mockImplementation(() =>
            Promise.resolve([{ id: 'var-1', price: 10000000 }]),
          ),
        },
        $queryRaw: jest.fn().mockImplementation(() =>
          Promise.resolve([{ id: 'imei-uuid-1' }]),
        ),
        imeiDevice: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        inventory: {
          // Lost the race: another transaction consumed the last units first
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 0 })),
        },
      };

      mockPrisma = {
        cart: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'cart-1',
              items: [
                {
                  id: 'item-1',
                  variantId: 'var-1',
                  quantity: 1,
                  unitPrice: 10000000,
                  variant: {
                    id: 'var-1',
                    name: 'iPhone 15 128GB',
                    sku: 'IP15-128',
                    isActive: true,
                    inventory: { availableQty: 5 },
                  },
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, mockOrderQueue);

      await expect(
        ordersService.checkout('user-1', { addressId: 'addr-1' } as any),
      ).rejects.toThrow('Insufficient stock');
    });

    it('should throw BadRequestException if available IMEIs are fewer than required quantity', async () => {
      const mockTx: any = {
        address: {
          findFirst: jest.fn().mockImplementation(() =>
            Promise.resolve({ id: 'addr-1', userId: 'user-1' }),
          ),
        },
        productVariant: {
          findMany: jest.fn().mockImplementation(() =>
            Promise.resolve([{ id: 'var-1', price: 10000000 }]),
          ),
        },
        $queryRaw: jest.fn().mockImplementation(() =>
          Promise.resolve([{ id: 'imei-uuid-1' }]), // only 1 returned, need 2
        ),
      };

      mockPrisma = {
        cart: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'cart-1',
              items: [
                {
                  variantId: 'var-1',
                  quantity: 2,
                  unitPrice: 10000000,
                  variant: {
                    id: 'var-1',
                    name: 'iPhone 15 128GB',
                    sku: 'IP15-128',
                    isActive: true,
                    inventory: { availableQty: 5 },
                  },
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, mockOrderQueue);

      await expect(
        ordersService.checkout('user-1', { addressId: 'addr-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate voucher usageLimit and minOrderValue inside transaction', async () => {
      const now = new Date();
      const mockTx: any = {
        address: {
          findFirst: jest.fn().mockImplementation(() =>
            Promise.resolve({ id: 'addr-1', userId: 'user-1' }),
          ),
        },
        productVariant: {
          findMany: jest.fn().mockImplementation(() =>
            Promise.resolve([{ id: 'var-1', price: 1000000 }]),
          ),
        },
        voucher: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'vouch-1',
              code: 'DISCOUNT50',
              isActive: true,
              startAt: new Date(now.getTime() - 10000),
              endAt: new Date(now.getTime() + 10000),
              usageLimit: 5,
              usageCount: 5, // Limit reached
              minOrderValue: 500000,
              type: VoucherType.FIXED_AMOUNT,
              value: 50000,
            }),
          ),
        },
      };

      mockPrisma = {
        cart: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'cart-1',
              items: [
                {
                  variantId: 'var-1',
                  quantity: 1,
                  unitPrice: 1000000,
                  variant: {
                    id: 'var-1',
                    name: 'iPhone 15',
                    sku: 'IP15',
                    isActive: true,
                    inventory: { availableQty: 2 },
                  },
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, mockOrderQueue);

      await expect(
        ordersService.checkout('user-1', {
          addressId: 'addr-1',
          voucherCode: 'DISCOUNT50',
        } as any),
      ).rejects.toThrow('Voucher usage limit reached');
    });

    it('should throw if order subtotal is below voucher minOrderValue inside transaction', async () => {
      const now = new Date();
      const mockTx: any = {
        address: {
          findFirst: jest.fn().mockImplementation(() =>
            Promise.resolve({ id: 'addr-1', userId: 'user-1' }),
          ),
        },
        productVariant: {
          findMany: jest.fn().mockImplementation(() =>
            Promise.resolve([{ id: 'var-1', price: 5000000 }]),
          ),
        },
        $queryRaw: jest.fn().mockImplementation(() => Promise.resolve([])),
        voucher: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'vouch-1',
              code: 'MIN10M',
              isActive: true,
              startAt: new Date(now.getTime() - 10000),
              endAt: new Date(now.getTime() + 10000),
              usageLimit: 10,
              usageCount: 0,
              minOrderValue: 10000000, // 10M min order
              type: VoucherType.PERCENTAGE,
              value: 10,
            }),
          ),
        },
      };

      mockPrisma = {
        cart: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'cart-1',
              items: [
                {
                  variantId: 'var-1',
                  quantity: 1,
                  unitPrice: 5000000, // Only 5M subtotal
                  variant: {
                    id: 'var-1',
                    name: 'AirPods',
                    sku: 'AP3',
                    isActive: true,
                    inventory: { availableQty: 2 },
                  },
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, mockOrderQueue);

      await expect(
        ordersService.checkout('user-1', {
          addressId: 'addr-1',
          voucherCode: 'MIN10M',
        } as any),
      ).rejects.toThrow('Minimum order value is 10000000');
    });

    it('should increment voucher usage inside transaction when valid', async () => {
      const now = new Date();
      const mockTx: any = {
        address: {
          findFirst: jest.fn().mockImplementation(() =>
            Promise.resolve({ id: 'addr-1', userId: 'user-1' }),
          ),
        },
        productVariant: {
          findMany: jest.fn().mockImplementation(() =>
            Promise.resolve([{ id: 'var-1', price: 2000000 }]),
          ),
        },
        voucher: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'vouch-1',
              code: 'VALID10',
              isActive: true,
              startAt: new Date(now.getTime() - 10000),
              endAt: new Date(now.getTime() + 10000),
              usageLimit: 10,
              usageCount: 2,
              minOrderValue: 1000000,
              type: VoucherType.PERCENTAGE,
              value: 10,
              maxDiscountAmount: 500000,
            }),
          ),
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        $queryRaw: jest.fn().mockImplementation(() =>
          Promise.resolve([{ id: 'imei-uuid-1' }]),
        ),
        imeiDevice: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        inventory: {
          update: jest.fn().mockReturnValue(Promise.resolve({})),
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        order: {
          create: jest.fn().mockImplementation((args: any) =>
            Promise.resolve({
              id: 'order-1',
              ...args.data,
              items: args.data.items.create,
            }),
          ),
        },
        voucherUsage: {
          create: jest.fn().mockReturnValue(Promise.resolve({})),
        },
        cartItem: {
          deleteMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
      };

      mockPrisma = {
        cart: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'cart-1',
              items: [
                {
                  variantId: 'var-1',
                  quantity: 1,
                  unitPrice: 2000000,
                  variant: {
                    id: 'var-1',
                    name: 'Phone',
                    sku: 'P1',
                    isActive: true,
                    inventory: { availableQty: 2 },
                  },
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, mockOrderQueue);

      const order = await ordersService.checkout('user-1', {
        addressId: 'addr-1',
        voucherCode: 'VALID10',
      } as any);

      expect(mockTx.voucher.updateMany).toHaveBeenCalledWith({
        where: { id: 'vouch-1', usageCount: { lt: 10 } },
        data: { usageCount: { increment: 1 } },
      });
      expect(mockTx.voucherUsage.create).toHaveBeenCalled();
      expect(order.discountAmount).toBe(200000); // 10% of 2M
    });
  });

  describe('OrdersService - transitionStatus', () => {
    let ordersService: OrdersService;
    let mockPrisma: any;

    it('should release reserved IMEIs and restore inventory when transitioning from CONFIRMED to CANCELLED', async () => {
      const mockTx: any = {
        imeiDevice: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        inventory: {
          update: jest.fn().mockReturnValue(Promise.resolve({})),
        },
        order: {
          update: jest.fn().mockImplementation((args: any) =>
            Promise.resolve({ id: 'ord-1', status: args.data.status }),
          ),
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
      };

      mockPrisma = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-1',
              status: OrderStatus.CONFIRMED,
              items: [
                {
                  id: 'item-1',
                  variantId: 'var-1',
                  quantity: 1,
                  imeiDeviceId: 'imei-1',
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, {} as any);

      await ordersService.transitionStatus('ord-1', OrderStatus.CANCELLED);

      expect(mockTx.imeiDevice.updateMany).toHaveBeenCalledWith({
        where: { id: 'imei-1', status: ImeiStatus.RESERVED },
        data: { status: ImeiStatus.AVAILABLE },
      });
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: {
          reservedQty: { decrement: 1 },
          availableQty: { increment: 1 },
        },
      });
    });

    it('should update assigned IMEIs to SOLD with soldAt timestamp when transitioning to DELIVERED', async () => {
      const mockTx: any = {
        imeiDevice: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        inventory: {
          update: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
          findUnique: jest.fn().mockReturnValue(Promise.resolve({ id: 'inv-1', quantity: 9, reservedQty: 0 })),
        },
        payment: {
          findMany: jest.fn().mockReturnValue(Promise.resolve([])),
        },
        orderItem: {
          findMany: jest.fn().mockReturnValue(Promise.resolve([])),
        },
        order: {
          update: jest.fn().mockImplementation((args: any) =>
            Promise.resolve({ id: 'ord-1', status: args.data.status }),
          ),
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
      };

      mockPrisma = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-1',
              status: OrderStatus.SHIPPING,
              items: [
                {
                  id: 'item-1',
                  variantId: 'var-1',
                  quantity: 1,
                  imeiDeviceId: 'imei-1',
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, {} as any);

      await ordersService.transitionStatus('ord-1', OrderStatus.DELIVERED);

      expect(mockTx.imeiDevice.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['imei-1'] }, status: ImeiStatus.RESERVED },
        data: {
          status: ImeiStatus.SOLD,
          soldAt: expect.any(Date),
        },
      });
      // Entering DELIVERED settles the hold exactly once (reserved + physical down, available untouched)
      expect(mockTx.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-1', reservedQty: { gte: 1 } },
        data: {
          reservedQty: { decrement: 1 },
          quantity: { decrement: 1 },
        },
      });
    });

    it('should update assigned IMEIs to SOLD when transitioning to COMPLETED', async () => {
      const mockTx: any = {
        imeiDevice: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        inventory: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        payment: {
          findMany: jest.fn().mockReturnValue(Promise.resolve([])),
        },
        orderItem: {
          findMany: jest.fn().mockReturnValue(Promise.resolve([])),
        },
        order: {
          update: jest.fn().mockImplementation((args: any) =>
            Promise.resolve({ id: 'ord-1', status: args.data.status }),
          ),
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
      };

      mockPrisma = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-1',
              status: OrderStatus.DELIVERED,
              items: [
                {
                  id: 'item-1',
                  variantId: 'var-1',
                  quantity: 1,
                  imeiDeviceId: 'imei-1',
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, {} as any);

      await ordersService.transitionStatus('ord-1', OrderStatus.COMPLETED);

      expect(mockTx.imeiDevice.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['imei-1'] }, status: ImeiStatus.RESERVED },
        data: {
          status: ImeiStatus.SOLD,
          soldAt: expect.any(Date),
        },
      });
      // COMPLETED-after-DELIVERED must NOT settle again — one sale, one deduction
      expect(mockTx.inventory.updateMany).not.toHaveBeenCalled();
    });

    it('should allow SHIPPING to RETURNED so carrier returns auto-sync', async () => {
      const mockTx: any = {
        order: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
      };

      mockPrisma = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-1',
              status: OrderStatus.SHIPPING,
              items: [],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      ordersService = new OrdersService(mockPrisma, {} as any);

      const result: any = await ordersService.transitionStatus('ord-1', OrderStatus.RETURNED);

      expect(result.status).toBe(OrderStatus.RETURNED);
      expect(mockTx.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-1', status: OrderStatus.SHIPPING },
          data: expect.objectContaining({ status: OrderStatus.RETURNED }),
        }),
      );
    });
  });

  describe('OrdersProcessor - atomic hold expiration', () => {
    it('should atomically cancel order and release reserved stock if status is PENDING', async () => {
      const mockTx: any = {
        order: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        imeiDevice: {
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
        },
        inventory: {
          update: jest.fn().mockReturnValue(Promise.resolve({})),
        },
      };

      const mockPrisma: any = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-hold-1',
              status: OrderStatus.PENDING,
              items: [
                {
                  variantId: 'var-1',
                  quantity: 1,
                  imeiDeviceId: 'imei-hold-1',
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      const processor = new OrdersProcessor(mockPrisma);
      const mockJob: any = {
        name: 'expire-order-hold',
        id: 'job-1',
        data: { orderId: 'ord-hold-1' },
      };

      await processor.process(mockJob);

      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'ord-hold-1', status: OrderStatus.PENDING },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: expect.any(Date),
          cancelledReason: 'Hold expired (15 minutes)',
        },
      });
      expect(mockTx.imeiDevice.updateMany).toHaveBeenCalledWith({
        where: { id: 'imei-hold-1', status: ImeiStatus.RESERVED },
        data: { status: ImeiStatus.AVAILABLE },
      });
      expect(mockTx.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: {
          reservedQty: { decrement: 1 },
          availableQty: { increment: 1 },
        },
      });
    });

    it('should skip release if order status changed before transaction commits (race condition prevention)', async () => {
      const mockTx: any = {
        order: {
          // Order was paid/confirmed right before tx ran -> affected count is 0
          updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 0 })),
        },
        imeiDevice: {
          updateMany: jest.fn(),
        },
        inventory: {
          update: jest.fn(),
        },
      };

      const mockPrisma: any = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-hold-2',
              status: OrderStatus.PENDING, // was pending at findUnique
              items: [
                {
                  variantId: 'var-1',
                  quantity: 1,
                  imeiDeviceId: 'imei-hold-2',
                },
              ],
            }),
          ),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      const processor = new OrdersProcessor(mockPrisma);
      const mockJob: any = {
        name: 'expire-order-hold',
        id: 'job-2',
        data: { orderId: 'ord-hold-2' },
      };

      await processor.process(mockJob);

      expect(mockTx.order.updateMany).toHaveBeenCalled();
      // Should NOT release IMEIs or inventory because affected.count was 0
      expect(mockTx.imeiDevice.updateMany).not.toHaveBeenCalled();
      expect(mockTx.inventory.update).not.toHaveBeenCalled();
    });
  });

  describe('ImeiService - batch import & inventory synchronization', () => {
    it('should atomically create IMEIs and increment variant inventory quantity and availableQty', async () => {
      const mockTx: any = {
        imeiDevice: {
          findUnique: jest.fn().mockReturnValue(Promise.resolve(null)),
          create: jest.fn().mockImplementation((args: any) =>
            Promise.resolve({ id: `id-${args.data.imei}`, ...args.data }),
          ),
        },
        inventory: {
          upsert: jest.fn().mockReturnValue(Promise.resolve({})),
        },
      };

      const mockPrisma: any = {
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      const imeiService = new ImeiService(mockPrisma);

      const importDto = {
        // Luhn-valid fixtures (H3 rejects anything else at the service gate)
        items: [
          { variantId: 'var-1', imei: '358901010000013' },
          { variantId: 'var-1', imei: '358901010000021' },
          { variantId: 'var-2', imei: '358901010000039' },
        ],
      };

      const result = await imeiService.import(importDto as any);

      expect(result).toEqual({ imported: 3, total: 3 });
      expect(mockTx.imeiDevice.create).toHaveBeenCalledTimes(3);

      // Verify var-1 got incremented by 2
      expect(mockTx.inventory.upsert).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        create: {
          variantId: 'var-1',
          quantity: 2,
          availableQty: 2,
          reservedQty: 0,
        },
        update: {
          quantity: { increment: 2 },
          availableQty: { increment: 2 },
        },
      });

      // Verify var-2 got incremented by 1
      expect(mockTx.inventory.upsert).toHaveBeenCalledWith({
        where: { variantId: 'var-2' },
        create: {
          variantId: 'var-2',
          quantity: 1,
          availableQty: 1,
          reservedQty: 0,
        },
        update: {
          quantity: { increment: 1 },
          availableQty: { increment: 1 },
        },
      });
    });

    it('should skip duplicate IMEIs and only increment inventory for newly created devices', async () => {
      const mockTx: any = {
        imeiDevice: {
          findUnique: jest.fn().mockImplementation((args: any) => {
            if (args.where.imei === '358901010000013') {
              return Promise.resolve({ id: 'existing-id' }); // already exists
            }
            return Promise.resolve(null);
          }),
          create: jest.fn().mockImplementation((args: any) =>
            Promise.resolve({ id: `id-${args.data.imei}`, ...args.data }),
          ),
        },
        inventory: {
          upsert: jest.fn().mockReturnValue(Promise.resolve({})),
        },
      };

      const mockPrisma: any = {
        $transaction: jest.fn().mockImplementation(async (callback: any) => {
          return callback(mockTx);
        }),
      };

      const imeiService = new ImeiService(mockPrisma);

      const importDto = {
        items: [
          { variantId: 'var-1', imei: '358901010000013' }, // duplicate
          { variantId: 'var-1', imei: '358901010000021' }, // new
        ],
      };

      const result = await imeiService.import(importDto as any);

      expect(result).toEqual({ imported: 1, total: 2 });
      expect(mockTx.imeiDevice.create).toHaveBeenCalledTimes(1);

      // Inventory increment should only be 1 for the newly created device
      expect(mockTx.inventory.upsert).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        create: {
          variantId: 'var-1',
          quantity: 1,
          availableQty: 1,
          reservedQty: 0,
        },
        update: {
          quantity: { increment: 1 },
          availableQty: { increment: 1 },
        },
      });
    });
  });
});
