import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { ShippingService } from '../../src/modules/shipping/shipping.service';
import { OrderStatus, ShippingStatus, ImeiStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService - PACKED and SHIPPING transitions', () => {
  let service: OrdersService;
  let prisma: any;

  const mockOrder = {
    id: 'order-123',
    status: OrderStatus.PROCESSING,
    userId: 'user-1',
    payments: [],
    items: [],
    shipping: { id: 'ship-1', orderId: 'order-123', providerName: 'Standard', status: ShippingStatus.PENDING },
  };

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      shipping: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      voucher: {
        update: jest.fn(),
      },
      voucherUsage: {
        deleteMany: jest.fn(),
      },
      imeiDevice: {
        updateMany: jest.fn(),
      },
      inventory: {
        update: jest.fn(),
      },
      installmentApplication: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    service = new OrdersService(prisma as any, { add: jest.fn() } as any);
  });

  it('should transition from PROCESSING to PACKED and set packedAt', async () => {
    (prisma.order.findUnique as any).mockResolvedValue(mockOrder);
    (prisma.order.update as any).mockResolvedValue({ ...mockOrder, status: OrderStatus.PACKED, packedAt: new Date() });

    const result = await service.transitionStatus('order-123', OrderStatus.PACKED);
    expect(result.status).toBe(OrderStatus.PACKED);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-123' },
        data: expect.objectContaining({ status: OrderStatus.PACKED }),
      }),
    );
  });

  it('should transition from PACKED to SHIPPING and sync shipping details', async () => {
    const packedOrder = { ...mockOrder, status: OrderStatus.PACKED };
    (prisma.order.findUnique as any).mockResolvedValue(packedOrder);
    (prisma.order.update as any).mockResolvedValue({ ...packedOrder, status: OrderStatus.SHIPPING, shippedAt: new Date() });

    const shippingPayload = {
      providerName: 'Giao Hàng Nhanh (GHN)',
      trackingNumber: 'GHN999888',
      estimatedDeliveryDate: '2026-10-10T00:00:00.000Z',
    };

    const result = await service.transitionStatus('order-123', OrderStatus.SHIPPING, undefined, undefined, shippingPayload);
    expect(result.status).toBe(OrderStatus.SHIPPING);
    expect(prisma.shipping.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: 'order-123' },
        update: expect.objectContaining({
          providerName: 'Giao Hàng Nhanh (GHN)',
          trackingNumber: 'GHN999888',
          status: ShippingStatus.READY_TO_SHIP,
        }),
      }),
    );
  });

  it('should reject invalid transition from CONFIRMED directly to PACKED', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({ ...mockOrder, status: OrderStatus.CONFIRMED });
    await expect(service.transitionStatus('order-123', OrderStatus.PACKED)).rejects.toThrow(BadRequestException);
  });

  it('should allow cancellation from PACKED status and release reserved inventory/IMEIs', async () => {
    const packedOrderWithItems = {
      ...mockOrder,
      status: OrderStatus.PACKED,
      items: [
        { variantId: 'var-1', quantity: 1, imeiDeviceId: 'imei-1' },
      ],
    };
    (prisma.order.findUnique as any).mockResolvedValue(packedOrderWithItems);
    (prisma.order.update as any).mockResolvedValue({ ...packedOrderWithItems, status: OrderStatus.CANCELLED });
    (prisma.imeiDevice.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.inventory.update as any).mockResolvedValue({});

    const result = await service.transitionStatus('order-123', OrderStatus.CANCELLED, undefined, 'Customer requested cancel');
    expect(result.status).toBe(OrderStatus.CANCELLED);
    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-1', status: ImeiStatus.RESERVED },
      data: { status: ImeiStatus.AVAILABLE },
    });
    expect(prisma.inventory.update).toHaveBeenCalledWith({
      where: { variantId: 'var-1' },
      data: {
        reservedQty: { decrement: 1 },
        availableQty: { increment: 1 },
      },
    });
  });
});

describe('ShippingService - updateByOrder', () => {
  let shippingService: ShippingService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn() },
      shipping: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };
    shippingService = new ShippingService(prisma as any);
  });

  it('should update carrier and tracking number for an existing order', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({ id: 'order-123' });
    (prisma.shipping.upsert as any).mockResolvedValue({
      id: 'ship-1',
      orderId: 'order-123',
      providerName: 'Viettel Post',
      trackingNumber: 'VTP123456',
    });

    const result = await shippingService.updateByOrder('order-123', {
      providerName: 'Viettel Post',
      trackingNumber: 'VTP123456',
    });

    expect(result.trackingNumber).toBe('VTP123456');
    expect(prisma.shipping.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: 'order-123' },
        update: expect.objectContaining({
          providerName: 'Viettel Post',
          trackingNumber: 'VTP123456',
        }),
      }),
    );
  });

  it('should throw NotFoundException if order does not exist', async () => {
    (prisma.order.findUnique as any).mockResolvedValue(null);
    await expect(
      shippingService.updateByOrder('non-existent-order', {
        providerName: 'Viettel Post',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
