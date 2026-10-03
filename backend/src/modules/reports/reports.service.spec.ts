import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReportsService } from './reports.service';
import { BadRequestException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
      order: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      payment: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
      productVariant: {
        findMany: jest.fn(),
      },
      inventory: {
        findMany: jest.fn(),
      },
      refund: {
        aggregate: jest.fn(),
      },
    };

    service = new ReportsService(prisma);
  });

  describe('getBrandSalesReport', () => {
    it('should return brand sales report without date filter (all-time)', async () => {
      const mockRawRows = [
        {
          brandId: 'brand-apple',
          brandName: 'Apple',
          logoUrl: 'https://example.com/apple.png',
          quantitySold: 10,
          revenue: '60000000',
        },
        {
          brandId: 'brand-samsung',
          brandName: 'Samsung',
          logoUrl: 'https://example.com/samsung.png',
          quantitySold: 5,
          revenue: '30000000',
        },
        {
          brandId: 'brand-xiaomi',
          brandName: 'Xiaomi',
          logoUrl: null,
          quantitySold: 2,
          revenue: '10000000',
        },
      ];

      (prisma.$queryRaw as any).mockResolvedValue(mockRawRows);

      const result = await service.getBrandSalesReport();

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result.from).toBeUndefined();
      expect(result.to).toBeUndefined();
      expect(result.totalRevenue).toBe(100000000);
      expect(result.brands).toHaveLength(3);

      expect(result.brands[0]).toEqual({
        brandId: 'brand-apple',
        brandName: 'Apple',
        logoUrl: 'https://example.com/apple.png',
        quantitySold: 10,
        revenue: 60000000,
        percentage: 60,
      });

      expect(result.brands[1]).toEqual({
        brandId: 'brand-samsung',
        brandName: 'Samsung',
        logoUrl: 'https://example.com/samsung.png',
        quantitySold: 5,
        revenue: 30000000,
        percentage: 30,
      });

      expect(result.brands[2]).toEqual({
        brandId: 'brand-xiaomi',
        brandName: 'Xiaomi',
        logoUrl: null,
        quantitySold: 2,
        revenue: 10000000,
        percentage: 10,
      });
    });

    it('should return brand sales report with date filter and rounded percentages', async () => {
      const mockRawRows = [
        {
          brandId: 'brand-1',
          brandName: 'Brand One',
          logoUrl: 'https://example.com/b1.png',
          quantitySold: 1,
          revenue: 100,
        },
        {
          brandId: 'brand-2',
          brandName: 'Brand Two',
          logoUrl: null,
          quantitySold: 2,
          revenue: 200,
        },
      ];

      (prisma.$queryRaw as any).mockResolvedValue(mockRawRows);

      const result = await service.getBrandSalesReport('2026-01-01', '2026-06-30');

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result.from).toBe('2026-01-01');
      expect(result.to).toBe('2026-06-30');
      expect(result.totalRevenue).toBe(300);
      expect(result.brands).toEqual([
        {
          brandId: 'brand-1',
          brandName: 'Brand One',
          logoUrl: 'https://example.com/b1.png',
          quantitySold: 1,
          revenue: 100,
          percentage: 33.3,
        },
        {
          brandId: 'brand-2',
          brandName: 'Brand Two',
          logoUrl: null,
          quantitySold: 2,
          revenue: 200,
          percentage: 66.7,
        },
      ]);
    });

    it('should return empty brands and totalRevenue 0 if no sales found', async () => {
      (prisma.$queryRaw as any).mockResolvedValue([]);

      const result = await service.getBrandSalesReport();

      expect(result.totalRevenue).toBe(0);
      expect(result.brands).toEqual([]);
    });

    it('should throw BadRequestException if only from is provided', async () => {
      await expect(service.getBrandSalesReport('2026-01-01', undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getBrandSalesReport('2026-01-01', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if only to is provided', async () => {
      await expect(service.getBrandSalesReport(undefined, '2026-12-31')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getBrandSalesReport('', '2026-12-31')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if date format is invalid', async () => {
      await expect(service.getBrandSalesReport('01-01-2026', '2026-12-31')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getBrandSalesReport('2026-01-01', 'invalid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if from is after to', async () => {
      await expect(service.getBrandSalesReport('2026-12-31', '2026-01-01')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
