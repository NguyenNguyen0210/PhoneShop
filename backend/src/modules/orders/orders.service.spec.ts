import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OrdersService } from './orders.service';
import { OrderStatus, StockMovementType } from '@prisma/client';

describe('OrdersService - Fulfillment Stock Movements & Ledger Sync', () => {
  let ordersService: OrdersService;
  let mockPrisma: any;
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      inventory: {
        update: (jest.fn() as any).mockResolvedValue({ id: 'inv-1', quantity: 9, reservedQty: 0 }),
        findUnique: (jest.fn() as any).mockResolvedValue({ id: 'inv-1', quantity: 9, reservedQty: 0 }),
        updateMany: (jest.fn() as any).mockResolvedValue({ count: 1 }),
      },
      stockMovement: {
        create: (jest.fn() as any).mockResolvedValue({ id: 'sm-1' }),
      },
      imeiDevice: {
        updateMany: (jest.fn() as any).mockResolvedValue({ count: 1 }),
      },
      payment: {
        findMany: (jest.fn() as any).mockResolvedValue([]),
        update: (jest.fn() as any).mockResolvedValue({}),
      },
      paymentTransaction: {
        create: (jest.fn() as any).mockResolvedValue({}),
      },
      orderItem: {
        findMany: (jest.fn() as any).mockResolvedValue([]),
      },
      warranty: {
        upsert: (jest.fn() as any).mockResolvedValue({}),
      },
      shipping: {
        upsert: (jest.fn() as any).mockResolvedValue({}),
      },
      order: {
        update: (jest.fn() as any).mockImplementation((args: any) =>
          Promise.resolve({ id: 'ord-123', status: args.data.status }),
        ),
        updateMany: (jest.fn() as any).mockResolvedValue({ count: 1 }),
      },
    };

    mockPrisma = {
      order: {
        findUnique: (jest.fn() as any).mockResolvedValue({
          id: 'ord-123',
          orderNumber: 'ORD-20261004-ABCD',
          status: OrderStatus.SHIPPING,
          userId: 'user-1',
          items: [
            {
              id: 'item-1',
              variantId: 'var-101',
              quantity: 2,
              unitPrice: 15000000,
              imeiDeviceId: 'imei-1',
            },
          ],
          payments: [],
        }),
      },
      $transaction: (jest.fn() as any).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      }),
    };

    ordersService = new OrdersService(mockPrisma, {} as any);
  });

  it('decrements physical stock and records EXPORT_ORDER movement on DELIVERED', async () => {
    // Current inventory after decrement is 8 (so balanceBefore was 8 + 2 = 10)
    mockTx.inventory.findUnique.mockResolvedValue({ quantity: 8 });

    await ordersService.transitionStatus('ord-123', OrderStatus.DELIVERED);

    // Verify physical stock decrement
    expect(mockTx.inventory.update).toHaveBeenCalledWith({
      where: { variantId: 'var-101' },
      data: {
        quantity: { decrement: 2 },
        reservedQty: { decrement: 2 },
      },
    });

    // Verify stockMovement creation with correct calculations
    expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
      data: {
        variantId: 'var-101',
        type: StockMovementType.EXPORT_ORDER,
        quantity: -2,
        balanceBefore: 10,
        balanceAfter: 8,
        unitPrice: 15000000,
        totalAmount: 30000000,
        referenceType: 'ORDER',
        referenceId: 'ORD-20261004-ABCD',
        note: 'Xuất kho giao đơn hàng #ORD-20261004-ABCD',
      },
    });
  });

  it('does NOT duplicate stock decrement or movement when transitioning from DELIVERED to COMPLETED', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'ord-123',
      orderNumber: 'ORD-20261004-ABCD',
      status: OrderStatus.DELIVERED,
      userId: 'user-1',
      items: [
        {
          id: 'item-1',
          variantId: 'var-101',
          quantity: 2,
          unitPrice: 15000000,
          imeiDeviceId: 'imei-1',
        },
      ],
      payments: [],
    });

    await ordersService.transitionStatus('ord-123', OrderStatus.COMPLETED);

    expect(mockTx.inventory.update).not.toHaveBeenCalled();
    expect(mockTx.stockMovement.create).not.toHaveBeenCalled();
  });
});
