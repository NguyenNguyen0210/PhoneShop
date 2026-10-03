import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReportsController } from './reports.controller';
import { BadRequestException } from '@nestjs/common';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: any;

  beforeEach(() => {
    service = {
      getDashboardSummary: jest.fn(),
      getRevenueReport: jest.fn(),
      getBrandSalesReport: jest.fn(),
      getTopSellingProducts: jest.fn(),
      getOrderStatusReport: jest.fn(),
      getLowStockReport: jest.fn(),
    };

    controller = new ReportsController(service);
  });

  describe('getBrandSales', () => {
    it('should delegate to service when no query params are provided', async () => {
      service.getBrandSalesReport.mockResolvedValue({
        totalRevenue: 1000,
        brands: [],
      });

      const res = await controller.getBrandSales(undefined, undefined);

      expect(service.getBrandSalesReport).toHaveBeenCalledWith(undefined, undefined);
      expect(res).toEqual({ totalRevenue: 1000, brands: [] });
    });

    it('should delegate to service when valid from and to are provided', async () => {
      service.getBrandSalesReport.mockResolvedValue({
        from: '2026-01-01',
        to: '2026-12-31',
        totalRevenue: 1000,
        brands: [],
      });

      const res = await controller.getBrandSales('2026-01-01', '2026-12-31');

      expect(service.getBrandSalesReport).toHaveBeenCalledWith('2026-01-01', '2026-12-31');
      expect(res).toEqual({
        from: '2026-01-01',
        to: '2026-12-31',
        totalRevenue: 1000,
        brands: [],
      });
    });

    it('should throw BadRequestException if only from is provided', () => {
      expect(() => controller.getBrandSales('2026-01-01', undefined)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if only to is provided', () => {
      expect(() => controller.getBrandSales(undefined, '2026-12-31')).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if date format is invalid', () => {
      expect(() => controller.getBrandSales('2026/01/01', '2026-12-31')).toThrow(
        BadRequestException,
      );
      expect(() => controller.getBrandSales('2026-01-01', 'invalid')).toThrow(
        BadRequestException,
      );
    });
  });
});
