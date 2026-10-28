import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ImeiService } from './imei.service';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ImeiStatus, StockMovementType } from '@prisma/client';

// Fixtures: device found via findOne (findUnique with include variant).
const makeDevice = (status: ImeiStatus) => ({
  id: 'd1',
  imei: '358901010000018',
  variantId: 'var-1',
  status,
  purchasePrice: 12000000,
  variant: { id: 'var-1', price: 15000000 },
});

describe('ImeiService - transitionTo stock effects & sync (D5/D6)', () => {
  let service: ImeiService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      imeiDevice: {
        findUnique: jest.fn<any>(),
        updateMany: jest.fn<any>(),
        count: jest.fn<any>(),
      },
      inventory: {
        findUnique: jest.fn<any>(),
        updateMany: jest.fn<any>(),
        update: jest.fn<any>(),
      },
      stockMovement: {
        create: jest.fn<any>(),
      },
      orderItem: {
        findFirst: jest.fn<any>(),
      },
      $executeRaw: jest.fn<any>(),
      $transaction: jest.fn<any>((cb: any) => cb(prisma)),
    };
    service = new ImeiService(prisma);
  });

  const ready = (status: ImeiStatus) => {
    prisma.imeiDevice.findUnique.mockResolvedValue(makeDevice(status));
    prisma.imeiDevice.updateMany.mockResolvedValue({ count: 1 });
    prisma.inventory.updateMany.mockResolvedValue({ count: 1 });
    prisma.inventory.findUnique.mockResolvedValue({
      variantId: 'var-1',
      quantity: 3,
    });
  };

  describe('counter + ledger effects per transition', () => {
    it('AVAILABLE→RESERVED: reservedQty++, availableQty--, no movement', async () => {
      ready(ImeiStatus.AVAILABLE);
      await service.reserve('d1');
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-1', availableQty: { gte: 1 } },
        data: { reservedQty: { increment: 1 }, availableQty: { decrement: 1 } },
      });
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('AVAILABLE→SOLD (manual markSold): quantity--, availableQty--, EXPORT_ORDER movement with settlement balances', async () => {
      ready(ImeiStatus.AVAILABLE);
      await service.markSold('d1');
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: {
          variantId: 'var-1',
          quantity: { gte: 1 },
          availableQty: { gte: 1 },
        },
        data: { quantity: { decrement: 1 }, availableQty: { decrement: 1 } },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: 'var-1',
            type: StockMovementType.EXPORT_ORDER,
            quantity: -1,
            balanceBefore: 4,
            balanceAfter: 3,
            unitPrice: 15000000,
            totalAmount: 15000000,
            referenceType: 'IMEI_MANUAL',
            referenceId: 'd1',
          }),
        }),
      );
    });

    it('RESERVED→AVAILABLE without a live order hold: reservedQty--, availableQty++', async () => {
      ready(ImeiStatus.RESERVED);
      prisma.orderItem.findFirst.mockResolvedValue(null);
      await service.release('d1');
      expect(prisma.orderItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ imeiDeviceId: 'd1' }),
        }),
      );
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-1', reservedQty: { gte: 1 } },
        data: { reservedQty: { decrement: 1 }, availableQty: { increment: 1 } },
      });
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('RESERVED→AVAILABLE refuses when the device is held by a live order (PENDING/CONFIRMED/PROCESSING/PACKED)', async () => {
      ready(ImeiStatus.RESERVED);
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'oi-1' });
      await expect(service.release('d1')).rejects.toThrow(ConflictException);
      await expect(service.release('d1')).rejects.toThrow(
        'IMEI đang được giữ cho đơn hàng đang xử lý',
      );
      expect(prisma.imeiDevice.updateMany).not.toHaveBeenCalled();
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    });

    it('AVAILABLE→BLOCKED: reservedQty++ (on hand but unsellable), no movement', async () => {
      ready(ImeiStatus.AVAILABLE);
      await service.block('d1');
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-1', availableQty: { gte: 1 } },
        data: { reservedQty: { increment: 1 }, availableQty: { decrement: 1 } },
      });
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('BLOCKED→AVAILABLE: reverses the block (reservedQty--, availableQty++)', async () => {
      ready(ImeiStatus.BLOCKED);
      await service.release('d1');
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-1', reservedQty: { gte: 1 } },
        data: { reservedQty: { decrement: 1 }, availableQty: { increment: 1 } },
      });
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('SOLD→WARRANTY: no counter change, no movement', async () => {
      ready(ImeiStatus.SOLD);
      await service.warranty('d1');
      expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
        where: { id: 'd1', status: ImeiStatus.SOLD },
        data: { status: ImeiStatus.WARRANTY },
      });
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('WARRANTY→AVAILABLE: quantity++ & availableQty++ + IMPORT_RETURN movement', async () => {
      ready(ImeiStatus.WARRANTY);
      await service.release('d1');
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: { quantity: { increment: 1 }, availableQty: { increment: 1 } },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: 'var-1',
            type: StockMovementType.IMPORT_RETURN,
            quantity: 1,
            balanceBefore: 2,
            balanceAfter: 3,
            unitPrice: 12000000,
            note: 'Restock after warranty repair',
          }),
        }),
      );
    });

    it('SOLD→RETURNED: no counter change, no movement', async () => {
      ready(ImeiStatus.SOLD);
      await service.returnDevice('d1');
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('RETURNED→AVAILABLE: quantity++ & availableQty++ + IMPORT_RETURN movement', async () => {
      ready(ImeiStatus.RETURNED);
      await service.release('d1');
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: { quantity: { increment: 1 }, availableQty: { increment: 1 } },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: StockMovementType.IMPORT_RETURN,
            quantity: 1,
            note: 'Restock after product return',
          }),
        }),
      );
    });
  });

  describe('guards', () => {
    it('illegal transition (SOLD→AVAILABLE) throws BadRequest and writes nothing', async () => {
      ready(ImeiStatus.SOLD);
      await expect(service.release('d1')).rejects.toThrow(BadRequestException);
      expect(prisma.imeiDevice.updateMany).not.toHaveBeenCalled();
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    });

    it('count===0 on the imei claim (lost race) throws ConflictException', async () => {
      ready(ImeiStatus.AVAILABLE);
      prisma.imeiDevice.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.reserve('d1')).rejects.toThrow(ConflictException);
    });

    it('count===0 on the inventory update (desync) throws ConflictException', async () => {
      ready(ImeiStatus.AVAILABLE);
      prisma.inventory.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.reserve('d1')).rejects.toThrow(ConflictException);
    });
  });

  describe('syncInventoryFromImei (D5)', () => {
    const counts = { AVAILABLE: 3, RESERVED: 1, BLOCKED: 1 };
    const wire = () => {
      prisma.imeiDevice.count.mockImplementation((args: any) =>
        Promise.resolve(counts[args.where.status] ?? 0),
      );
    };

    it('runs inside a transaction with a pg_advisory_xact_lock', async () => {
      wire();
      prisma.inventory.findUnique.mockResolvedValue({
        variantId: 'var-1',
        quantity: 5,
        availableQty: 3,
        reservedQty: 1,
      });
      await service.syncInventoryFromImei('var-1');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      const sql = prisma.$executeRaw.mock.calls[0][0];
      expect(sql.text).toContain('pg_advisory_xact_lock');
      expect(sql.text).toContain('sync_inventory_from_imei');
    });

    it('no-ops (no write) when computed values already match', async () => {
      wire();
      const current = {
        variantId: 'var-1',
        quantity: 5,
        availableQty: 3,
        reservedQty: 1,
      };
      prisma.inventory.findUnique.mockResolvedValue(current);
      const res = await service.syncInventoryFromImei('var-1');
      expect(prisma.inventory.update).not.toHaveBeenCalled();
      expect(res).toBe(current);
    });

    it('writes counters when they differ from the IMEI rows', async () => {
      wire();
      prisma.inventory.findUnique.mockResolvedValue({
        variantId: 'var-1',
        quantity: 99,
        availableQty: 99,
        reservedQty: 0,
      });
      prisma.inventory.update.mockResolvedValue({});
      await service.syncInventoryFromImei('var-1');
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: { quantity: 5, availableQty: 3, reservedQty: 1 },
      });
    });

    it('still works (legacy test doubles) when $transaction/$executeRaw are absent', async () => {
      wire();
      const legacy: any = {
        imeiDevice: { count: prisma.imeiDevice.count },
        inventory: {
          findUnique: prisma.inventory.findUnique,
          update: prisma.inventory.update,
        },
      };
      legacy.inventory.findUnique.mockResolvedValue({
        variantId: 'var-1',
        quantity: 1,
        availableQty: 1,
        reservedQty: 1,
      });
      legacy.inventory.update.mockImplementation((args: any) =>
        Promise.resolve(args.data),
      );
      const legacyService = new ImeiService(legacy);
      await legacyService.syncInventoryFromImei('var-1');
      expect(legacy.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: { quantity: 5, availableQty: 3, reservedQty: 1 },
      });
    });
  });
});
