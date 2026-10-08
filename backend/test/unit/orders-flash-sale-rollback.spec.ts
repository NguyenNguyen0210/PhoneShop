import { describe, it, expect, jest } from '@jest/globals';
import { rollbackFlashSoldCount } from '../../src/modules/orders/flash-sale-rollback.util';

describe('rollbackFlashSoldCount', () => {
  it('decrements soldCount with guard on the campaign active at order time', async () => {
    const tx: any = {
      flashSaleItem: {
        findMany: jest.fn().mockReturnValue(
          Promise.resolve([
            { id: 'fsi-1', variantId: 'v-1', soldCount: 5, stockLimit: 10 },
          ]),
        ),
        updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 1 })),
      },
    };
    await rollbackFlashSoldCount(
      tx,
      [{ variantId: 'v-1', quantity: 2 }],
      new Date('2026-10-01T10:00:00Z'),
    );
    expect(tx.flashSaleItem.findMany).toHaveBeenCalledWith({
      where: {
        variantId: { in: ['v-1'] },
        campaign: {
          startAt: { lte: new Date('2026-10-01T10:00:00Z') },
          endAt: { gte: new Date('2026-10-01T10:00:00Z') },
        },
      },
      select: { id: true, variantId: true },
    });
    expect(tx.flashSaleItem.updateMany).toHaveBeenCalledWith({
      where: { id: 'fsi-1', soldCount: { gte: 2 } },
      data: { soldCount: { decrement: 2 } },
    });
  });

  it('skips variants with no matching flash item (no crash)', async () => {
    const tx: any = {
      flashSaleItem: {
        findMany: jest.fn().mockReturnValue(Promise.resolve([])),
        updateMany: jest.fn(),
      },
    };
    await rollbackFlashSoldCount(tx, [{ variantId: 'v-9', quantity: 1 }], new Date());
    expect(tx.flashSaleItem.updateMany).not.toHaveBeenCalled();
  });
});
