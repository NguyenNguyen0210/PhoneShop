import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ImeiService, QueryImeiDto } from '../../src/modules/imei/imei.service';
import { ImeiController } from '../../src/modules/imei/imei.controller';
import { ImeiStatus } from '@prisma/client';

describe('IMEI Pagination Unit Tests', () => {
  let imeiService: ImeiService;
  let imeiController: ImeiController;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      imeiDevice: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    imeiService = new ImeiService(mockPrisma as any);
    imeiController = new ImeiController(imeiService);
  });

  describe('ImeiService.findAll pagination & offset', () => {
    it('should use default page = 1, limit = 10, skip = 0 when no query is passed', async () => {
      mockPrisma.imeiDevice.count.mockResolvedValue(0);
      mockPrisma.imeiDevice.findMany.mockResolvedValue([]);

      const result = await imeiService.findAll();

      expect(mockPrisma.imeiDevice.count).toHaveBeenCalledWith({ where: {} });
      expect(mockPrisma.imeiDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: {},
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate skip correctly for custom page and limit', async () => {
      const mockDevices = [
        {
          id: 'imei-1',
          imei: '358901010000018',
          serialNumber: 'SN-001',
          status: ImeiStatus.AVAILABLE,
          variant: { id: 'var-1', name: 'iPhone 15 128GB', product: { id: 'p-1', name: 'iPhone 15' } },
        },
      ];

      mockPrisma.imeiDevice.count.mockResolvedValue(55);
      mockPrisma.imeiDevice.findMany.mockResolvedValue(mockDevices);

      const query: QueryImeiDto = { page: 3, limit: 20 };
      const result = await imeiService.findAll(query);

      expect(mockPrisma.imeiDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        }),
      );
      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(55);
      expect(result.totalPages).toBe(3);
      expect(result.data).toHaveLength(1);
    });

    it('should calculate totalPages correctly when total is exact multiple of limit', async () => {
      mockPrisma.imeiDevice.count.mockResolvedValue(40);
      mockPrisma.imeiDevice.findMany.mockResolvedValue([]);

      const result = await imeiService.findAll({ page: 1, limit: 10 });

      expect(result.totalPages).toBe(4);
      expect(result.total).toBe(40);
    });

    it('should handle empty results gracefully and return totalPages = 1', async () => {
      mockPrisma.imeiDevice.count.mockResolvedValue(0);
      mockPrisma.imeiDevice.findMany.mockResolvedValue([]);

      const result = await imeiService.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('ImeiService.findAll filtering', () => {
    it('should filter by variantId and status when provided', async () => {
      mockPrisma.imeiDevice.count.mockResolvedValue(12);
      mockPrisma.imeiDevice.findMany.mockResolvedValue([]);

      await imeiService.findAll({
        variantId: 'var-123',
        status: ImeiStatus.AVAILABLE,
      });

      const expectedWhere = {
        variantId: 'var-123',
        status: ImeiStatus.AVAILABLE,
      };

      expect(mockPrisma.imeiDevice.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.imeiDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('should build case-insensitive OR clause for imei and serialNumber on search', async () => {
      mockPrisma.imeiDevice.count.mockResolvedValue(1);
      mockPrisma.imeiDevice.findMany.mockResolvedValue([]);

      await imeiService.findAll({ search: '35890101' });

      const expectedWhere = {
        OR: [
          { imei: { contains: '35890101', mode: 'insensitive' } },
          { serialNumber: { contains: '35890101', mode: 'insensitive' } },
        ],
      };

      expect(mockPrisma.imeiDevice.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.imeiDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('should combine variantId, status, and search filters in where clause', async () => {
      mockPrisma.imeiDevice.count.mockResolvedValue(3);
      mockPrisma.imeiDevice.findMany.mockResolvedValue([]);

      await imeiService.findAll({
        variantId: 'var-abc',
        status: ImeiStatus.RESERVED,
        search: 'SN-999',
      });

      const expectedWhere = {
        variantId: 'var-abc',
        status: ImeiStatus.RESERVED,
        OR: [
          { imei: { contains: 'SN-999', mode: 'insensitive' } },
          { serialNumber: { contains: 'SN-999', mode: 'insensitive' } },
        ],
      };

      expect(mockPrisma.imeiDevice.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.imeiDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });
  });

  describe('ImeiController.findAll delegation', () => {
    it('should delegate query parameters to imeiService.findAll', async () => {
      const query: QueryImeiDto = {
        page: 2,
        limit: 15,
        status: ImeiStatus.SOLD,
        variantId: 'var-1',
        search: '3589',
      };
      const mockResult = {
        data: [],
        total: 100,
        page: 2,
        limit: 15,
        totalPages: 7,
      };

      jest.spyOn(imeiService, 'findAll').mockResolvedValue(mockResult);

      const result = await imeiController.findAll(query);

      expect(imeiService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });
});
