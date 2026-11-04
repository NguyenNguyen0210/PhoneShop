import { ConflictException } from '@nestjs/common';
import { ImeiStatus, OrderStatus, ShippingStatus } from '@prisma/client';
import { OrdersService } from '../src/modules/orders/orders.service';
import { ShippingService } from '../src/modules/shipping/shipping.service';

describe('Shipping and order status consistency', () => {
  const order = {
    id: 'order-1',
    orderNumber: 'ORD-1',
    status: OrderStatus.PACKED,
    items: [],
    user: null,
  };
  const shipment = {
    id: 'ship-1',
    orderId: order.id,
    status: ShippingStatus.READY_TO_SHIP,
    trackingNumber: 'TRACK-1',
  };
  let prisma: any;
  let service: ShippingService;

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ ...order }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      shipping: {
        findUnique: jest.fn().mockResolvedValue({ ...shipment }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn(),
      },
      orderItem: { findMany: jest.fn().mockResolvedValue([]) },
      imeiDevice: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      inventory: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn().mockResolvedValue({ quantity: 0 }) },
      stockMovement: { create: jest.fn() },
      payment: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([{ method: 'COD', status: 'PENDING' }]), updateMany: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(prisma)),
    };
    const ordersService = new OrdersService(prisma);
    service = new ShippingService(prisma, ordersService);
  });

  it('ships an already packed order and updates the carrier in the same transaction', async () => {
    await service.updateStatus(shipment.id, { status: ShippingStatus.PICKED_UP });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: order.id, status: OrderStatus.PACKED },
      data: expect.objectContaining({ status: OrderStatus.SHIPPING }),
    });
    expect(prisma.shipping.updateMany).toHaveBeenCalledWith({
      where: { id: shipment.id, status: ShippingStatus.READY_TO_SHIP },
      data: expect.objectContaining({ status: ShippingStatus.PICKED_UP }),
    });
    // The generic order SHIPPING transition must not reset a carrier shipment
    // to READY_TO_SHIP while the carrier marks it PICKED_UP.
    expect(prisma.shipping.upsert).not.toHaveBeenCalled();
  });

  it.each([OrderStatus.CONFIRMED, OrderStatus.PROCESSING])(
    'ships %s and records packing in the same transaction as carrier pickup',
    async (initialStatus) => {
      prisma.order.findUnique.mockResolvedValue({ ...order, status: initialStatus });

      await service.updateStatus(shipment.id, { status: ShippingStatus.PICKED_UP });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.order.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: order.id, status: initialStatus },
        data: expect.objectContaining({
          status: OrderStatus.SHIPPING,
          packedAt: expect.any(Date),
          shippedAt: expect.any(Date),
        }),
      });
      expect(prisma.shipping.updateMany).toHaveBeenCalledWith({
        where: { id: shipment.id, status: ShippingStatus.READY_TO_SHIP },
        data: expect.objectContaining({ status: ShippingStatus.PICKED_UP }),
      });
    },
  );

  it('does not make a separate packing commit if carrier pickup loses a race', async () => {
    prisma.order.findUnique.mockResolvedValue({ ...order, status: OrderStatus.CONFIRMED });
    prisma.shipping.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.updateStatus(shipment.id, { status: ShippingStatus.PICKED_UP }))
      .rejects.toThrow(ConflictException);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: order.id, status: OrderStatus.CONFIRMED },
      data: expect.objectContaining({ status: OrderStatus.SHIPPING }),
    });
  });

  it('rejects a carrier race inside the order transaction', async () => {
    prisma.shipping.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.updateStatus(shipment.id, { status: ShippingStatus.PICKED_UP }))
      .rejects.toThrow(ConflictException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).toHaveBeenCalledTimes(1);
  });

  it('marks delivered and closes shipping in a single transaction', async () => {
    prisma.order.findUnique.mockResolvedValue({ ...order, status: OrderStatus.SHIPPING });
    prisma.shipping.findUnique.mockResolvedValue({ ...shipment, status: ShippingStatus.IN_TRANSIT });

    await service.updateStatus(shipment.id, { status: ShippingStatus.DELIVERED });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: order.id, status: OrderStatus.SHIPPING },
      data: expect.objectContaining({ status: OrderStatus.DELIVERED }),
    });
    expect(prisma.shipping.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.shipping.updateMany).toHaveBeenCalledWith({
      where: { id: shipment.id, status: ShippingStatus.IN_TRANSIT },
      data: expect.objectContaining({ status: ShippingStatus.DELIVERED }),
    });
  });

  it('keeps partially refunded prepaid stock quarantined on a carrier return', async () => {
    prisma.order.findUnique.mockResolvedValue({
      ...order,
      status: OrderStatus.SHIPPING,
      items: [{ id: 'item-1', imeiDeviceId: 'imei-1', variantId: 'variant-1', quantity: 1 }],
    });
    prisma.shipping.findUnique.mockResolvedValue({
      ...shipment, status: ShippingStatus.IN_TRANSIT,
    });
    prisma.payment.findFirst.mockResolvedValue({ id: 'partially-refunded-payment' });

    await service.updateStatus(shipment.id, { status: ShippingStatus.RETURNED });

    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-1', status: { in: [ImeiStatus.RESERVED, ImeiStatus.SOLD] } }, data: { status: ImeiStatus.RETURNED },
    });
    expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
      where: { variantId: 'variant-1', reservedQty: { gte: 1 } },
      data: { quantity: { decrement: 1 }, reservedQty: { decrement: 1 } },
    });
    expect(prisma.shipping.updateMany).toHaveBeenCalledWith({
      where: { id: shipment.id, status: ShippingStatus.IN_TRANSIT },
      data: expect.objectContaining({ status: ShippingStatus.RETURNED }),
    });
  });
});
