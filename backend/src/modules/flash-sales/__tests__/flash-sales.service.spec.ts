import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FlashSalesService } from '../flash-sales.service';

describe('FlashSalesService', () => {
  let service: FlashSalesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      flashSaleCampaign: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      flashSaleItem: {
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    (prisma.flashSaleItem.findFirst as any).mockResolvedValue(null);

    service = new FlashSalesService(prisma as any);
  });

  describe('create', () => {
    it('should reject creation if startAt is after or equal to endAt', async () => {
      const dto = {
        name: 'Flash Sale Test',
        startAt: new Date(Date.now() + 100000).toISOString(),
        endAt: new Date(Date.now()).toISOString(),
        items: [],
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject creation if variant is not found', async () => {
      const now = Date.now();
      const dto = {
        name: 'Flash Sale Test',
        startAt: new Date(now).toISOString(),
        endAt: new Date(now + 3600000).toISOString(),
        items: [{ variantId: 'non-existent', flashPrice: 100000, stockLimit: 5 }],
      };

      (prisma.productVariant.findUnique as any).mockResolvedValue(null);

      await expect(service.create(dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should reject creation if flashPrice >= variant.price', async () => {
      const now = Date.now();
      const dto = {
        name: 'Flash Sale Test',
        startAt: new Date(now).toISOString(),
        endAt: new Date(now + 3600000).toISOString(),
        items: [{ variantId: 'var-1', flashPrice: 20000000, stockLimit: 5 }],
      };

      (prisma.productVariant.findUnique as any).mockResolvedValue({
        id: 'var-1',
        sku: 'IP15-BLK',
        price: 19000000,
        inventory: { quantity: 10, availableQty: 10 },
      });

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject creation if stockLimit > variant.inventory.quantity', async () => {
      const now = Date.now();
      const dto = {
        name: 'Flash Sale Test',
        startAt: new Date(now).toISOString(),
        endAt: new Date(now + 3600000).toISOString(),
        items: [{ variantId: 'var-1', flashPrice: 15000000, stockLimit: 20 }],
      };

      (prisma.productVariant.findUnique as any).mockResolvedValue({
        id: 'var-1',
        sku: 'IP15-BLK',
        price: 19000000,
        inventory: { quantity: 10, availableQty: 10 },
      });

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should create campaign successfully when validation passes', async () => {
      const now = Date.now();
      const dto = {
        name: 'Valid Flash Sale',
        description: 'Super discount',
        startAt: new Date(now).toISOString(),
        endAt: new Date(now + 3600000).toISOString(),
        items: [{ variantId: 'var-1', flashPrice: 15000000, stockLimit: 5 }],
      };

      (prisma.productVariant.findUnique as any).mockResolvedValue({
        id: 'var-1',
        sku: 'IP15-BLK',
        price: 19000000,
        inventory: { quantity: 10, availableQty: 10 },
      });

      const createdCampaign = { id: 'camp-1', ...dto };
      (prisma.flashSaleCampaign.create as any).mockResolvedValue(createdCampaign);

      const result = await service.create(dto as any);
      expect(result).toEqual(createdCampaign);
      expect(prisma.flashSaleCampaign.create).toHaveBeenCalled();
    });
  });

  describe('getActiveCampaign', () => {
    it('should return active campaign if running within valid time window', async () => {
      const now = new Date();
      (prisma.flashSaleCampaign.findFirst as any).mockResolvedValue({
        id: 'camp-1',
        name: 'Midday Sale',
        startAt: new Date(now.getTime() - 1000),
        endAt: new Date(now.getTime() + 100000),
        isActive: true,
        items: [],
      });

      const result = await service.getActiveCampaign();
      expect(result).toBeDefined();
      expect(result?.id).toBe('camp-1');
    });

    it('should return null if no active campaign is running', async () => {
      (prisma.flashSaleCampaign.findFirst as any).mockResolvedValue(null);

      const result = await service.getActiveCampaign();
      expect(result).toBeNull();
    });
  });

  describe('findAllAdmin', () => {
    it('should query with correct filters for status', async () => {
      (prisma.flashSaleCampaign.findMany as any).mockResolvedValue([]);

      await service.findAllAdmin('ACTIVE');
      expect(prisma.flashSaleCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );

      await service.findAllAdmin('UPCOMING');
      expect(prisma.flashSaleCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ startAt: expect.anything() }),
        }),
      );

      await service.findAllAdmin('ENDED');
      expect(prisma.flashSaleCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );

      await service.findAllAdmin('ALL');
      expect(prisma.flashSaleCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('findOne', () => {
    it('should return campaign if found', async () => {
      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue({ id: 'camp-1' });
      const result = await service.findOne('camp-1');
      expect(result.id).toBe('camp-1');
    });

    it('should throw NotFoundException if campaign not found', async () => {
      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('endEarly', () => {
    it('should update isActive to false and endAt to now', async () => {
      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue({ id: 'camp-1', isActive: true });
      (prisma.flashSaleCampaign.update as any).mockResolvedValue({ id: 'camp-1', isActive: false });

      const result = await service.endEarly('camp-1');
      expect(result.isActive).toBe(false);
      expect(prisma.flashSaleCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException if campaign is currently active and running', async () => {
      const now = new Date();
      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue({
        id: 'camp-1',
        isActive: true,
        startAt: new Date(now.getTime() - 10000),
        endAt: new Date(now.getTime() + 10000),
      });

      await expect(service.remove('camp-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete campaign if ended or inactive', async () => {
      const now = new Date();
      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue({
        id: 'camp-1',
        isActive: false,
        startAt: new Date(now.getTime() - 20000),
        endAt: new Date(now.getTime() - 10000),
      });
      (prisma.flashSaleCampaign.delete as any).mockResolvedValue({ id: 'camp-1' });

      const result = await service.remove('camp-1');
      expect(result.id).toBe('camp-1');
      expect(prisma.flashSaleCampaign.delete).toHaveBeenCalledWith({ where: { id: 'camp-1' } });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if campaign not found', async () => {
      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue(null);

      await expect(
        service.update('camp-unknown', {
          name: 'Updated',
          startAt: new Date(Date.now() + 1000).toISOString(),
          endAt: new Date(Date.now() + 5000).toISOString(),
          items: [],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject update on ENDED campaign when isActive is false', async () => {
      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue({
        id: 'camp-1',
        isActive: false,
        startAt: new Date(Date.now() - 50000),
        endAt: new Date(Date.now() + 50000),
        items: [],
      });

      await expect(
        service.update('camp-1', {
          name: 'Updated',
          startAt: new Date(Date.now() + 1000).toISOString(),
          endAt: new Date(Date.now() + 5000).toISOString(),
          items: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject update on ENDED campaign when endAt is in the past', async () => {
      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue({
        id: 'camp-1',
        isActive: true,
        startAt: new Date(Date.now() - 50000),
        endAt: new Date(Date.now() - 1000),
        items: [],
      });

      await expect(
        service.update('camp-1', {
          name: 'Updated',
          startAt: new Date(Date.now() + 1000).toISOString(),
          endAt: new Date(Date.now() + 5000).toISOString(),
          items: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update an UPCOMING campaign', async () => {
      const now = Date.now();
      const existingCampaign = {
        id: 'camp-1',
        name: 'Upcoming Sale',
        description: 'Old description',
        isActive: true,
        startAt: new Date(now + 100000),
        endAt: new Date(now + 200000),
        items: [
          {
            id: 'item-1',
            campaignId: 'camp-1',
            variantId: 'var-1',
            flashPrice: 15000000,
            stockLimit: 10,
            soldCount: 0,
          },
          {
            id: 'item-2',
            campaignId: 'camp-1',
            variantId: 'var-2',
            flashPrice: 16000000,
            stockLimit: 5,
            soldCount: 0,
          },
        ],
      };

      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue(existingCampaign);

      (prisma.productVariant.findUnique as any).mockImplementation(async ({ where }: any) => {
        if (where.id === 'var-1') {
          return {
            id: 'var-1',
            sku: 'VAR-1',
            price: 20000000,
            isActive: true,
            inventory: { availableQty: 15 },
          };
        }
        if (where.id === 'var-3') {
          return {
            id: 'var-3',
            sku: 'VAR-3',
            price: 18000000,
            isActive: true,
            inventory: { availableQty: 8 },
          };
        }
        return null;
      });

      const updatedCampaign = {
        id: 'camp-1',
        name: 'Updated Upcoming Sale',
        description: 'New description',
        startAt: new Date(now + 120000),
        endAt: new Date(now + 250000),
        items: [],
      };
      (prisma.flashSaleCampaign.update as any).mockResolvedValue(updatedCampaign);

      const dto = {
        name: 'Updated Upcoming Sale',
        description: 'New description',
        startAt: new Date(now + 120000).toISOString(),
        endAt: new Date(now + 250000).toISOString(),
        items: [
          { variantId: 'var-1', flashPrice: 14000000, stockLimit: 8 },
          { variantId: 'var-3', flashPrice: 12000000, stockLimit: 5 },
        ],
      };

      const result = await service.update('camp-1', dto as any);

      expect(result).toEqual(updatedCampaign);
      expect(prisma.flashSaleItem.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['item-2'] } },
      });
      expect(prisma.flashSaleItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { flashPrice: 14000000, stockLimit: 8 },
      });
      expect(prisma.flashSaleItem.create).toHaveBeenCalledWith({
        data: {
          campaignId: 'camp-1',
          variantId: 'var-3',
          flashPrice: 12000000,
          stockLimit: 5,
        },
      });
    });

    it('should successfully update an ACTIVE campaign (locking startAt and extending endAt)', async () => {
      const now = Date.now();
      const originalStartAt = new Date(now - 3600000);
      const existingCampaign = {
        id: 'camp-1',
        name: 'Active Sale',
        description: 'Running sale',
        isActive: true,
        startAt: originalStartAt,
        endAt: new Date(now + 3600000),
        items: [
          {
            id: 'item-1',
            campaignId: 'camp-1',
            variantId: 'var-1',
            flashPrice: 15000000,
            stockLimit: 10,
            soldCount: 3,
          },
        ],
      };

      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue(existingCampaign);

      (prisma.productVariant.findUnique as any).mockResolvedValue({
        id: 'var-1',
        sku: 'VAR-1',
        price: 20000000,
        isActive: true,
        inventory: { availableQty: 10 },
      });

      const updatedCampaign = {
        id: 'camp-1',
        name: 'Active Sale Extended',
        startAt: originalStartAt,
        endAt: new Date(now + 7200000),
        items: [],
      };
      (prisma.flashSaleCampaign.update as any).mockResolvedValue(updatedCampaign);

      const dto = {
        name: 'Active Sale Extended',
        startAt: new Date(now - 7200000).toISOString(), // Attempt to alter startAt
        endAt: new Date(now + 7200000).toISOString(),
        items: [
          { variantId: 'var-1', flashPrice: 15000000, stockLimit: 12 },
        ],
      };

      const result = await service.update('camp-1', dto as any);

      expect(result).toEqual(updatedCampaign);
      // Ensure startAt passed to prisma update is the locked original startAt, NOT dto.startAt
      expect(prisma.flashSaleCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startAt: originalStartAt,
            endAt: new Date(dto.endAt),
          }),
        }),
      );
    });

    it('should reject update on ACTIVE campaign if endAt is not in the future', async () => {
      const now = Date.now();
      const existingCampaign = {
        id: 'camp-1',
        name: 'Active Sale',
        isActive: true,
        startAt: new Date(now - 3600000),
        endAt: new Date(now + 3600000),
        items: [],
      };

      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue(existingCampaign);

      const dto = {
        name: 'Active Sale',
        startAt: new Date(now - 3600000).toISOString(),
        endAt: new Date(now - 1000).toISOString(),
        items: [],
      };

      await expect(service.update('camp-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject changing flashPrice of item with soldCount > 0 in ACTIVE campaign', async () => {
      const now = Date.now();
      const existingCampaign = {
        id: 'camp-1',
        name: 'Active Sale',
        isActive: true,
        startAt: new Date(now - 3600000),
        endAt: new Date(now + 3600000),
        items: [
          {
            id: 'item-1',
            campaignId: 'camp-1',
            variantId: 'var-1',
            flashPrice: 15000000,
            stockLimit: 10,
            soldCount: 2,
          },
        ],
      };

      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue(existingCampaign);

      const dto = {
        name: 'Active Sale',
        startAt: new Date(now - 3600000).toISOString(),
        endAt: new Date(now + 7200000).toISOString(),
        items: [
          { variantId: 'var-1', flashPrice: 14000000, stockLimit: 10 },
        ],
      };

      await expect(service.update('camp-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject removing item with soldCount > 0 in ACTIVE campaign', async () => {
      const now = Date.now();
      const existingCampaign = {
        id: 'camp-1',
        name: 'Active Sale',
        isActive: true,
        startAt: new Date(now - 3600000),
        endAt: new Date(now + 3600000),
        items: [
          {
            id: 'item-1',
            campaignId: 'camp-1',
            variantId: 'var-1',
            flashPrice: 15000000,
            stockLimit: 10,
            soldCount: 3,
          },
        ],
      };

      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue(existingCampaign);

      const dto = {
        name: 'Active Sale',
        startAt: new Date(now - 3600000).toISOString(),
        endAt: new Date(now + 7200000).toISOString(),
        items: [],
      };

      await expect(service.update('camp-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject setting stockLimit < soldCount', async () => {
      const now = Date.now();
      const existingCampaign = {
        id: 'camp-1',
        name: 'Active Sale',
        isActive: true,
        startAt: new Date(now - 3600000),
        endAt: new Date(now + 3600000),
        items: [
          {
            id: 'item-1',
            campaignId: 'camp-1',
            variantId: 'var-1',
            flashPrice: 15000000,
            stockLimit: 10,
            soldCount: 5,
          },
        ],
      };

      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue(existingCampaign);

      const dto = {
        name: 'Active Sale',
        startAt: new Date(now - 3600000).toISOString(),
        endAt: new Date(now + 7200000).toISOString(),
        items: [
          { variantId: 'var-1', flashPrice: 15000000, stockLimit: 4 },
        ],
      };

      await expect(service.update('camp-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should reject overlapping campaign with another active campaign', async () => {
      const now = Date.now();
      const existingCampaign = {
        id: 'camp-1',
        name: 'Upcoming Sale',
        isActive: true,
        startAt: new Date(now + 100000),
        endAt: new Date(now + 200000),
        items: [],
      };

      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue(existingCampaign);

      (prisma.productVariant.findUnique as any).mockResolvedValue({
        id: 'var-1',
        sku: 'VAR-1',
        price: 20000000,
        isActive: true,
        inventory: { availableQty: 10 },
      });

      (prisma.flashSaleItem.findFirst as any).mockResolvedValue({ id: 'overlap-item' });

      const dto = {
        name: 'Upcoming Sale',
        startAt: new Date(now + 100000).toISOString(),
        endAt: new Date(now + 200000).toISOString(),
        items: [
          { variantId: 'var-1', flashPrice: 15000000, stockLimit: 5 },
        ],
      };

      await expect(service.update('camp-1', dto as any)).rejects.toThrow(BadRequestException);
      expect(prisma.flashSaleItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: { not: 'camp-1' },
          }),
        }),
      );
    });
  });

  describe('C7: advisory lock serializes overlap check + write', () => {
    it('create: takes pg_advisory_xact_lock and runs the overlap check + create inside one $transaction', async () => {
      const now = Date.now();
      const dto = {
        name: 'Flash Sale Test',
        startAt: new Date(now).toISOString(),
        endAt: new Date(now + 3600000).toISOString(),
        items: [{ variantId: 'var-1', flashPrice: 15000000, stockLimit: 5 }],
      };

      (prisma.productVariant.findUnique as any).mockResolvedValue({
        id: 'var-1',
        sku: 'IP15-BLK',
        price: 19000000,
        inventory: { quantity: 10, availableQty: 10 },
      });
      (prisma.flashSaleCampaign.create as any).mockResolvedValue({ id: 'camp-1' });

      await service.create(dto as any);

      // check + create must run inside a single transaction
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // the advisory lock is taken first, then overlap check, then the write
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const sql: string = (prisma.$queryRaw as any).mock.calls[0][0][0];
      expect(sql).toContain('pg_advisory_xact_lock');
      expect(sql).toContain('flash_sale_overlap');
      expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.flashSaleItem.findFirst.mock.invocationCallOrder[0],
      );
      expect(
        prisma.flashSaleItem.findFirst.mock.invocationCallOrder[0],
      ).toBeLessThan(prisma.flashSaleCampaign.create.mock.invocationCallOrder[0]);
    });

    it('update: takes the advisory lock before the overlap check inside the transaction', async () => {
      const now = Date.now();
      (prisma.flashSaleCampaign.findUnique as any).mockResolvedValue({
        id: 'camp-1',
        name: 'Upcoming Sale',
        isActive: true,
        startAt: new Date(now + 100000),
        endAt: new Date(now + 200000),
        items: [],
      });
      (prisma.productVariant.findUnique as any).mockResolvedValue({
        id: 'var-1',
        sku: 'VAR-1',
        price: 20000000,
        isActive: true,
        inventory: { availableQty: 10 },
      });
      (prisma.flashSaleCampaign.update as any).mockResolvedValue({ id: 'camp-1' });

      const dto = {
        name: 'Upcoming Sale',
        startAt: new Date(now + 120000).toISOString(),
        endAt: new Date(now + 250000).toISOString(),
        items: [{ variantId: 'var-1', flashPrice: 15000000, stockLimit: 5 }],
      };

      await service.update('camp-1', dto as any);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const sql: string = (prisma.$queryRaw as any).mock.calls[0][0][0];
      expect(sql).toContain('pg_advisory_xact_lock');
      expect(sql).toContain('flash_sale_overlap');
      expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.flashSaleItem.findFirst.mock.invocationCallOrder[0],
      );
    });
  });
});
