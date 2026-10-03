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
      productVariant: {
        findUnique: jest.fn(),
      },
    };

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
        inventory: { quantity: 10 },
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
        inventory: { quantity: 10 },
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
        inventory: { quantity: 10 },
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
});
