import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InventoryService } from './inventory.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';

describe('InventoryService - Stock Movements & Ledger', () => {
  let service: InventoryService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      inventory: {
        findUnique: jest.fn<any>(),
        update: jest.fn<any>(),
        updateMany: jest.fn<any>(),
        findMany: jest.fn<any>(),
        count: jest.fn<any>(),
      },
      productVariant: {
        findUnique: jest.fn<any>(),
      },
      imeiDevice: {
        count: jest.fn<any>(),
      },
      stockMovement: {
        create: jest.fn<any>(),
        findMany: jest.fn<any>(),
        count: jest.fn<any>(),
      },
      auditLog: {
        create: jest.fn<any>(),
      },
      $transaction: jest.fn<any>((cb: any) => cb(prisma)),
    };

    service = new InventoryService(prisma as any);
  });

  describe('adjustStock', () => {
    it('adjustStock with positive quantity atomically increments and records IMPORT_MANUAL movement from post-read balances', async () => {
      const variantId = 'v-123';
      prisma.inventory.findUnique
        .mockResolvedValueOnce({
          variantId,
          quantity: 10,
          availableQty: 10,
          reservedQty: 0,
        })
        .mockResolvedValueOnce({
          variantId,
          quantity: 15,
          availableQty: 15,
          reservedQty: 0,
        });
      prisma.inventory.updateMany.mockResolvedValue({ count: 1 });
      prisma.productVariant.findUnique.mockResolvedValue({
        id: variantId,
        costPrice: 5000000,
      });
      prisma.stockMovement.create.mockResolvedValue({ id: 'sm-1' });

      const result = await service.adjustStock(
        variantId,
        { quantity: 5, unitPrice: 5200000, note: 'Nhập hàng thêm' },
        'user-1'
      );

      // atomic guarded increment instead of read-compute-absolute-write
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId },
        data: {
          quantity: { increment: 5 },
          availableQty: { increment: 5 },
        },
      });
      expect(prisma.inventory.update).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId,
            type: StockMovementType.IMPORT_MANUAL,
            quantity: 5,
            balanceBefore: 10,
            balanceAfter: 15,
            unitPrice: 5200000,
            totalAmount: 26000000,
            performedBy: 'user-1',
            referenceType: 'ADJUSTMENT',
            note: 'Nhập hàng thêm',
          }),
        })
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UPDATE_STOCK',
            entity: 'inventory',
            entityId: variantId,
            userId: 'user-1',
          }),
        })
      );
      expect(result.quantity).toBe(15);
    });

    it('adjustStock with negative quantity guards quantity floor and records EXPORT_MANUAL movement', async () => {
      const variantId = 'v-123';
      prisma.inventory.findUnique
        .mockResolvedValueOnce({
          variantId,
          quantity: 10,
          availableQty: 8,
          reservedQty: 2,
        })
        .mockResolvedValueOnce({
          variantId,
          quantity: 6,
          availableQty: 4,
          reservedQty: 2,
        });
      prisma.inventory.updateMany.mockResolvedValue({ count: 1 });
      prisma.productVariant.findUnique.mockResolvedValue({
        id: variantId,
        costPrice: 3000000,
      });
      prisma.stockMovement.create.mockResolvedValue({ id: 'sm-2' });

      const result = await service.adjustStock(
        variantId,
        { quantity: -4, note: 'Hàng hỏng' },
        'user-2'
      );

      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId, quantity: { gte: 4 } },
        data: {
          quantity: { decrement: 4 },
          availableQty: { decrement: 4 },
        },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId,
            type: StockMovementType.EXPORT_MANUAL,
            quantity: -4,
            balanceBefore: 10,
            balanceAfter: 6,
            unitPrice: 3000000,
            totalAmount: 12000000,
            performedBy: 'user-2',
            referenceType: 'ADJUSTMENT',
            note: 'Hàng hỏng',
          }),
        })
      );
      expect(result.quantity).toBe(6);
    });

    it('adjustStock rejects when result quantity would go below zero (pre-validation, no write)', async () => {
      const variantId = 'v-123';
      prisma.inventory.findUnique.mockResolvedValue({
        variantId,
        quantity: 3,
        availableQty: 3,
        reservedQty: 0,
      });

      await expect(
        service.adjustStock(variantId, { quantity: -5 }, 'user-1')
      ).rejects.toThrow(BadRequestException);
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('adjustStock rejects when new quantity would fall below reserved quantity', async () => {
      const variantId = 'v-123';
      prisma.inventory.findUnique.mockResolvedValue({
        variantId,
        quantity: 5,
        availableQty: 2,
        reservedQty: 3,
      });

      await expect(
        service.adjustStock(variantId, { quantity: -3 }, 'user-1')
      ).rejects.toThrow('New quantity cannot be less than reserved quantity');
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    });

    it('adjustStock throws Conflict-free BadRequest when the guarded atomic update loses a race (count 0)', async () => {
      const variantId = 'v-123';
      prisma.inventory.findUnique
        .mockResolvedValueOnce({ variantId, quantity: 3, availableQty: 3, reservedQty: 0 })
        .mockResolvedValueOnce({ variantId, quantity: 3, availableQty: 3, reservedQty: 0 });
      prisma.inventory.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.adjustStock(variantId, { quantity: -2 }, 'user-1')
      ).rejects.toThrow(BadRequestException);
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('adjustStock throws NotFoundException if inventory does not exist', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustStock('unknown-variant', { quantity: 1 })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll lowStockOnly filter', () => {
    it('filters availableQty <= reorderLevel at query level (raw SQL page ids + count) before pagination', async () => {
      const raw: any = jest.fn();
      raw.mockResolvedValueOnce([{ id: 'inv-2' }, { id: 'inv-1' }]);
      raw.mockResolvedValueOnce([{ count: 7 }]);
      prisma.$queryRaw = raw;
      prisma.inventory.findMany.mockResolvedValue([
        { id: 'inv-2', quantity: 3, reservedQty: 3, availableQty: 0, reorderLevel: 5 },
        { id: 'inv-1', quantity: 4, reservedQty: 0, availableQty: 4, reorderLevel: 5 },
      ]);

      const res = await service.findAll(2, 20, undefined, 'true');

      expect(res.total).toBe(7);
      expect(res.page).toBe(2);
      expect(res.limit).toBe(20);
      expect(res.data).toHaveLength(2);
      expect(res.totalPages).toBe(1);
      // full rows fetched by ids with the existing include
      expect(prisma.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['inv-2', 'inv-1'] } },
          include: {
            variant: { include: { product: { select: { id: true, name: true } } } },
          },
          orderBy: { updatedAt: 'desc' },
        }),
      );
      // raw SQL applies the per-row comparison BEFORE limit/offset
      const pageSql = prisma.$queryRaw.mock.calls[0][0];
      expect(pageSql.text).toContain('available_qty <= i.reorder_level');
      expect(pageSql.text).toContain('LIMIT');
      expect(pageSql.text).toContain('OFFSET');
      const pageValues = pageSql.values;
      expect(pageValues).toContain(20);
      expect(pageValues).toContain(20);
      const countSql = prisma.$queryRaw.mock.calls[1][0];
      expect(countSql.text).toContain('available_qty <= i.reorder_level');
      expect(countSql.text).not.toContain('LIMIT');
    });

    it('applies the search term in raw SQL when lowStockOnly + search are combined', async () => {
      const raw: any = jest.fn();
      raw.mockResolvedValueOnce([]);
      raw.mockResolvedValueOnce([{ count: 0 }]);
      prisma.$queryRaw = raw;

      await service.findAll(1, 20, 'iPhone', 'true');

      const pageSql = prisma.$queryRaw.mock.calls[0][0];
      expect(pageSql.text).toContain('ILIKE');
      expect(pageSql.values).toContain('%iPhone%');
    });

    it('falls back to per-row filtering with correct totals and page slice when $queryRaw is unavailable (test doubles)', async () => {
      prisma.inventory.findMany.mockResolvedValue([
        { id: 'inv-1', quantity: 10, reservedQty: 0, availableQty: 10, reorderLevel: 5 },
        { id: 'inv-2', quantity: 5, reservedQty: 0, availableQty: 5, reorderLevel: 5 },
        { id: 'inv-3', quantity: 2, reservedQty: 0, availableQty: 2, reorderLevel: 5 },
      ]);

      const res = await service.findAll(2, 1, undefined, 'true');

      expect(res.total).toBe(2);
      expect(res.data).toEqual([
        { id: 'inv-3', quantity: 2, reservedQty: 0, availableQty: 2, reorderLevel: 5 },
      ]);
      expect(res.page).toBe(2);
      expect(res.limit).toBe(1);
    });

    it('returns unfiltered paginated data when lowStockOnly is falsy', async () => {
      prisma.inventory.count.mockResolvedValue(2);
      prisma.inventory.findMany.mockResolvedValue([
        { id: 'inv-1' },
        { id: 'inv-2' },
      ]);

      const res = await service.findAll(1, 20, undefined, undefined);

      expect(res.total).toBe(2);
      expect(prisma.$queryRaw).toBeUndefined();
    });
  });

  describe('recordMovement', () => {
    it('creates StockMovement with fallback to variant costPrice or price', async () => {
      const variantId = 'v-456';
      prisma.inventory.findUnique.mockResolvedValue({
        variantId,
        quantity: 20,
      });
      prisma.productVariant.findUnique.mockResolvedValue({
        id: variantId,
        costPrice: null,
        price: 8000000,
      });
      prisma.stockMovement.create.mockResolvedValue({ id: 'sm-3' });

      await service.recordMovement(null, {
        variantId,
        type: StockMovementType.IMPORT_RETURN,
        quantity: 2,
        referenceType: 'RETURN',
        referenceId: 'RET-001',
      });

      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variantId,
          type: StockMovementType.IMPORT_RETURN,
          quantity: 2,
          balanceBefore: 20,
          balanceAfter: 22,
          unitPrice: 8000000,
          totalAmount: 16000000,
          referenceType: 'RETURN',
          referenceId: 'RET-001',
        }),
      });
    });

    it('throws NotFoundException if inventory record not found', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);

      await expect(
        service.recordMovement(null, {
          variantId: 'v-missing',
          type: StockMovementType.IMPORT_MANUAL,
          quantity: 1,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if balanceAfter < 0 in recordMovement', async () => {
      const variantId = 'v-low';
      prisma.inventory.findUnique.mockResolvedValue({
        variantId,
        quantity: 2,
      });

      await expect(
        service.recordMovement(null, {
          variantId,
          type: StockMovementType.EXPORT_MANUAL,
          quantity: -5,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLedger', () => {
    it('returns paginated movements with summary metrics', async () => {
      prisma.stockMovement.findMany
        .mockResolvedValueOnce([
          {
            id: 'sm-1',
            quantity: 5,
            totalAmount: 10000000,
            type: StockMovementType.IMPORT_MANUAL,
            createdAt: new Date('2026-10-01T10:00:00Z'),
            variant: {
              id: 'v-1',
              sku: 'SKU-1',
              color: 'Black',
              storage: '128GB',
              product: { id: 'p-1', name: 'iPhone 15', thumbnailUrl: 'http://img1.png' },
            },
            performer: { id: 'u-1', firstName: 'Nguyen', lastName: 'Van A', email: 'a@example.com' },
          },
          {
            id: 'sm-2',
            quantity: -2,
            totalAmount: 4000000,
            type: StockMovementType.EXPORT_ORDER,
            createdAt: new Date('2026-10-02T10:00:00Z'),
            variant: {
              id: 'v-1',
              sku: 'SKU-1',
              color: 'Black',
              storage: '128GB',
              product: { id: 'p-1', name: 'iPhone 15', thumbnailUrl: 'http://img1.png' },
            },
            performer: null,
          },
        ])
        .mockResolvedValueOnce([
          { type: StockMovementType.IMPORT_MANUAL, quantity: 5, totalAmount: 10000000 },
          { type: StockMovementType.EXPORT_ORDER, quantity: -2, totalAmount: 4000000 },
        ]);
      prisma.stockMovement.count.mockResolvedValue(2);

      const res = await service.getLedger({ page: 1, limit: 10 });
      expect(res.items).toHaveLength(2);
      expect(res.items[0].performer?.fullName).toBe('Nguyen Van A');
      expect(res.items[0].variant?.product?.thumbnail).toBe('http://img1.png');
      expect(res.pagination.total).toBe(2);
      expect(res.summary.totalInQuantity).toBe(5);
      expect(res.summary.totalOutQuantity).toBe(2);
      expect(res.summary.totalInAmount).toBe(10000000);
      expect(res.summary.totalOutAmount).toBe(4000000);
      expect(res.summary.netAmount).toBe(-6000000);
      expect(res.summary.totalTransactions).toBe(2);
    });

    it('filters by date range, type, search term, and variantId', async () => {
      prisma.stockMovement.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.stockMovement.count.mockResolvedValue(0);

      await service.getLedger({
        page: 2,
        limit: 5,
        startDate: '2026-10-01',
        endDate: '2026-10-04',
        type: StockMovementType.EXPORT_ORDER,
        search: 'iPhone',
        variantId: 'v-999',
      });

      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expect.objectContaining({
            variantId: 'v-999',
            type: StockMovementType.EXPORT_ORDER,
            createdAt: {
              gte: new Date('2026-10-01T00:00:00+07:00'),
              lte: new Date('2026-10-04T23:59:59.999+07:00'),
            },
            variant: {
              OR: [
                { sku: { contains: 'iPhone', mode: 'insensitive' } },
                { product: { name: { contains: 'iPhone', mode: 'insensitive' } } },
              ],
            },
          }),
        })
      );
    });
  });

  describe('getDailySummary', () => {
    it('groups movements by date YYYY-MM-DD and aggregates in/out metrics', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-10-01T08:00:00Z'),
          quantity: 10,
          totalAmount: 50000000,
          type: StockMovementType.IMPORT_MANUAL,
        },
        {
          createdAt: new Date('2026-10-01T15:30:00Z'),
          quantity: -3,
          totalAmount: 18000000,
          type: StockMovementType.EXPORT_ORDER,
        },
        {
          createdAt: new Date('2026-10-02T10:00:00Z'),
          quantity: -1,
          totalAmount: 6000000,
          type: StockMovementType.EXPORT_ORDER,
        },
      ]);

      const result = await service.getDailySummary({
        startDate: '2026-10-01',
        endDate: '2026-10-02',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2026-10-01',
        inQty: 10,
        outQty: 3,
        inAmount: 50000000,
        outAmount: 18000000,
      });
      expect(result[1]).toEqual({
        date: '2026-10-02',
        inQty: 0,
        outQty: 1,
        inAmount: 0,
        outAmount: 6000000,
      });
    });
    it('buckets by Asia/Ho_Chi_Minh day: a movement at 18:30 UTC (+7) belongs to the next day', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-10-01T18:30:00Z'),
          quantity: 2,
          totalAmount: 2000000,
          type: StockMovementType.IMPORT_MANUAL,
        },
      ]);

      const result = await service.getDailySummary({});

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-10-02');
      expect(result[0].inQty).toBe(2);
    });
  });

  describe('reserveStock / releaseStock IMEI guard', () => {
    it('reserveStock rejects IMEI-tracked variants without touching counters', async () => {
      prisma.imeiDevice.count.mockResolvedValue(3);

      await expect(
        service.reserveStock('var-imei', { quantity: 1 })
      ).rejects.toThrow(BadRequestException);
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    });

    it('releaseStock rejects IMEI-tracked variants without touching counters', async () => {
      prisma.imeiDevice.count.mockResolvedValue(3);

      await expect(
        service.releaseStock('var-imei', { quantity: 1 })
      ).rejects.toThrow(BadRequestException);
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('exportLedgerCsv', () => {
    it('exports CSV with UTF-8 BOM, headers, and formatted rows', async () => {
      prisma.stockMovement.findMany
        .mockResolvedValueOnce([
          {
            id: 'sm-1',
            createdAt: new Date('2026-10-01T10:00:00Z'),
            referenceId: 'ORD-101',
            type: StockMovementType.EXPORT_ORDER,
            variant: {
              sku: 'IP15-128',
              color: 'Blue',
              storage: '128GB',
              product: { name: 'iPhone 15', thumbnailUrl: null },
            },
            quantity: -2,
            balanceBefore: 10,
            balanceAfter: 8,
            unitPrice: 20000000,
            totalAmount: 40000000,
            performer: { fullName: 'Admin User', email: 'admin@phoneshop.vn' },
            note: 'Giao hàng',
          },
        ])
        .mockResolvedValueOnce([
          { type: StockMovementType.EXPORT_ORDER, quantity: -2, totalAmount: 40000000 },
        ]);
      prisma.stockMovement.count.mockResolvedValue(1);

      const csv = await service.exportLedgerCsv({});
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Mã GD,Thời gian,Mã chứng từ,Loại biến động');
      expect(csv).toContain('"sm-1"');
      expect(csv).toContain('"ORD-101"');
      expect(csv).toContain('"iPhone 15"');
      expect(csv).toContain('"Admin User"');
    });

    it('neutralizes formula-injection by prefixing leading =, +, -, @ with a single quote', async () => {
      prisma.stockMovement.findMany
        .mockResolvedValueOnce([
          {
            id: 'sm-9',
            createdAt: new Date('2026-10-01T10:00:00Z'),
            referenceId: '=HYPERLINK("http://evil")',
            type: StockMovementType.EXPORT_MANUAL,
            variant: {
              sku: '@SUM(1,1)',
              color: '-2+3',
              storage: '+cmd',
              product: { name: 'Product', thumbnailUrl: null },
            },
            quantity: -1,
            balanceBefore: 5,
            balanceAfter: 4,
            unitPrice: 100,
            totalAmount: 100,
            performer: null,
            note: '=cmd|\' /C calc!A0',
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.stockMovement.count.mockResolvedValue(1);

      const csv = await service.exportLedgerCsv({});
      expect(csv).toContain('"\'=HYPERLINK(""http://evil"")"');
      expect(csv).toContain('"\'@SUM(1,1)"');
      expect(csv).toContain('"\'-2+3"');
      expect(csv).toContain('"\'=cmd');
    });
  });
});
