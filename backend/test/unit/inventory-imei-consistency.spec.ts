import { describe, it, expect, jest } from '@jest/globals';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { ImeiService } from '../../src/modules/imei/imei.service';
import { BadRequestException } from '@nestjs/common';

// A variant that has IMEI rows is IMEI-tracked: manual quantity tweaks
// would desync inventory counters from the IMEI rows checkout actually
// requires. adjustStock must refuse; syncInventoryFromImei rebuilds the
// counters from the rows instead.
describe('inventory/IMEI single source of truth', () => {
  it('adjustStock rejects manual IMPORT on IMEI-tracked variants', async () => {
    const mockTx: any = {
      inventory: {
        findUnique: jest.fn().mockReturnValue(
          Promise.resolve({ variantId: 'var-1', quantity: 5, reservedQty: 0, availableQty: 5 }),
        ),
      },
      imeiDevice: {
        count: jest.fn().mockReturnValue(Promise.resolve(3)),
      },
    };
    const mockPrisma: any = {
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
    };
    const service = new InventoryService(mockPrisma);
    await expect(
      service.adjustStock('var-1', { quantity: 3 } as any, 'staff-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('syncInventoryFromImei rebuilds counters from IMEI rows', async () => {
    const counts: Record<string, number> = { AVAILABLE: 3, RESERVED: 1, BLOCKED: 1 };
    const mockPrisma: any = {
      imeiDevice: {
        count: jest.fn().mockImplementation((args: any) =>
          Promise.resolve(counts[args?.where?.status] ?? 0),
        ),
      },
      inventory: {
        update: jest.fn().mockImplementation((args: any) => Promise.resolve(args.data)),
      },
    };
    const service = new ImeiService(mockPrisma);
    await service.syncInventoryFromImei('var-1');
    expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
      where: { variantId: 'var-1' },
      data: { quantity: 5, availableQty: 3, reservedQty: 1 },
    });
  });
});
