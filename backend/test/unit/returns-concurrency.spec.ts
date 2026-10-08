import { describe, it, expect, jest } from '@jest/globals';
import { ReturnsService } from '../../src/modules/returns/returns.service';
import { Prisma, OrderStatus } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

// A concurrent duplicate submission hits the @@unique([returnId,
// orderItemId]) constraint (P2002). It must surface as 409 Conflict —
// never a 500, and never a second ReturnItem row.
describe('ReturnsService.createReturn concurrency', () => {
  it('maps unique-constraint violation to ConflictException', async () => {
    const orderItem = {
      id: 'oi-1',
      orderId: 'ord-1',
      variantId: 'var-1',
      sku: 'SKU-1',
      quantity: 1,
    };
    const mockTx: any = {
      $queryRaw: jest.fn().mockReturnValue(Promise.resolve([])),
      returnItem: {
        findMany: jest.fn().mockReturnValue(Promise.resolve([])),
      },
      return: {
        create: jest.fn().mockImplementation(() =>
          Promise.reject(
            new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed on the constraint: `return_items_return_id_order_item_id_key`',
              { code: 'P2002', clientVersion: '7.9.1' },
            ),
          ),
        ),
      },
    };
    const mockPrisma: any = {
      order: {
        findFirst: jest.fn().mockReturnValue(
          Promise.resolve({
            id: 'ord-1',
            status: OrderStatus.DELIVERED,
            deliveredAt: new Date(),
            createdAt: new Date(),
            items: [orderItem],
          }),
        ),
      },
      orderItem: {
        findMany: jest.fn().mockReturnValue(Promise.resolve([orderItem])),
      },
      returnItem: {
        findMany: jest.fn().mockReturnValue(Promise.resolve([])),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
    };

    const service = new ReturnsService(mockPrisma);
    await expect(
      service.createReturn('user-1', {
        orderId: 'ord-1',
        reason: 'Lỗi màn hình',
        items: [{ orderItemId: 'oi-1', quantity: 1 }],
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockTx.$queryRaw).toHaveBeenCalled();
  });
});
