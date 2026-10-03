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
        findMany: jest.fn<any>(),
      },
      productVariant: {
        findUnique: jest.fn<any>(),
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
    it('adjustStock with positive quantity records IMPORT_MANUAL movement and audit log', async () => {
      const variantId = 'v-123';
      prisma.inventory.findUnique.mockResolvedValue({
        variantId,
        quantity: 10,
        availableQty: 10,
        reservedQty: 0,
      });
      prisma.productVariant.findUnique.mockResolvedValue({
        id: variantId,
        costPrice: 5000000,
      });
      prisma.inventory.update.mockResolvedValue({
        variantId,
        quantity: 15,
        availableQty: 15,
      });
      prisma.stockMovement.create.mockResolvedValue({ id: 'sm-1' });

      const result = await service.adjustStock(
        variantId,
        { quantity: 5, unitPrice: 5200000, note: 'Nhập hàng thêm' },
        'user-1'
      );

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
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId },
        data: {
          quantity: 15,
          availableQty: 15,
        },
      });
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

    it('adjustStock with negative quantity records EXPORT_MANUAL movement', async () => {
      const variantId = 'v-123';
      prisma.inventory.findUnique.mockResolvedValue({
        variantId,
        quantity: 10,
        availableQty: 8,
        reservedQty: 2,
      });
      prisma.productVariant.findUnique.mockResolvedValue({
        id: variantId,
        costPrice: 3000000,
      });
      prisma.inventory.update.mockResolvedValue({
        variantId,
        quantity: 6,
        availableQty: 4,
      });
      prisma.stockMovement.create.mockResolvedValue({ id: 'sm-2' });

      const result = await service.adjustStock(
        variantId,
        { quantity: -4, note: 'Hàng hỏng' },
        'user-2'
      );

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
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId },
        data: {
          quantity: 6,
          availableQty: 4,
        },
      });
      expect(result.quantity).toBe(6);
    });

    it('adjustStock throws BadRequestException if balanceAfter < 0', async () => {
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
    });

    it('adjustStock throws NotFoundException if inventory does not exist', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustStock('unknown-variant', { quantity: 1 })
      ).rejects.toThrow(NotFoundException);
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
              gte: new Date('2026-10-01T00:00:00.000Z'),
              lte: new Date('2026-10-04T23:59:59.999Z'),
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
  });
});
