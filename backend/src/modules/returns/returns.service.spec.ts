import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ReturnsService } from './returns.service';
import { ReturnStatus, StockMovementType, ImeiStatus } from '@prisma/client';

describe('ReturnsService - Fulfillment Stock Movements & Ledger Sync', () => {
  let returnsService: ReturnsService;
  let mockPrisma: any;
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      returnItem: {
        findMany: (jest.fn() as any).mockResolvedValue([
          {
            id: 'ret-item-1',
            returnId: 'ret-uuid-1',
            orderItemId: 'order-item-1',
            quantity: 1,
          },
        ]),
      },
      orderItem: {
        findMany: (jest.fn() as any).mockResolvedValue([
          {
            id: 'order-item-1',
            variantId: 'var-202',
            quantity: 1,
            unitPrice: 20000000,
            imeiDeviceId: 'imei-device-99',
          },
        ]),
      },
      imeiDevice: {
        updateMany: (jest.fn() as any).mockResolvedValue({ count: 1 }),
      },
      inventory: {
        update: (jest.fn() as any).mockResolvedValue({ id: 'inv-2', quantity: 6, availableQty: 6 }),
        findUnique: (jest.fn() as any).mockResolvedValue({ id: 'inv-2', quantity: 6, availableQty: 6 }),
      },
      stockMovement: {
        create: (jest.fn() as any).mockResolvedValue({ id: 'sm-ret-1' }),
      },
      return: {
        update: (jest.fn() as any).mockImplementation((args: any) =>
          Promise.resolve({ id: 'ret-uuid-1', status: args.data.status }),
        ),
      },
    };

    mockPrisma = {
      return: {
        findUnique: (jest.fn() as any).mockResolvedValue({
          id: 'ret-uuid-1',
          returnNumber: 'RET-20261004-XYZ',
          status: ReturnStatus.RECEIVED,
          orderId: 'ord-123',
          userId: 'user-1',
          items: [],
          refunds: [],
        }),
      },
      $transaction: (jest.fn() as any).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      }),
    };

    returnsService = new ReturnsService(mockPrisma);
  });

  it('increments physical and available stock and records IMPORT_RETURN movement on COMPLETED', async () => {
    // Current inventory after increment is 6 (so balanceBefore was 6 - 1 = 5)
    mockTx.inventory.findUnique.mockResolvedValue({ quantity: 6 });

    await returnsService.transitionStatus('ret-uuid-1', ReturnStatus.COMPLETED);

    // Verify IMEI status transitions to RETURNED then AVAILABLE
    expect(mockTx.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-device-99', status: ImeiStatus.SOLD },
      data: { status: ImeiStatus.RETURNED },
    });
    expect(mockTx.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-device-99', status: ImeiStatus.RETURNED },
      data: { status: ImeiStatus.AVAILABLE, soldAt: null },
    });

    // Verify physical stock increment
    expect(mockTx.inventory.update).toHaveBeenCalledWith({
      where: { variantId: 'var-202' },
      data: {
        quantity: { increment: 1 },
        availableQty: { increment: 1 },
      },
    });

    // Verify stockMovement creation with correct calculations
    expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
      data: {
        variantId: 'var-202',
        type: StockMovementType.IMPORT_RETURN,
        quantity: 1,
        balanceBefore: 5,
        balanceAfter: 6,
        unitPrice: 20000000,
        totalAmount: 20000000,
        referenceType: 'RETURN',
        referenceId: 'ret-uuid-1',
        note: 'Nhập lại kho từ đơn hoàn trả #ret-uuid-1',
      },
    });
  });
});
