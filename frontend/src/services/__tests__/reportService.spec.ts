import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import {
  getDashboardSummary,
  getRevenueReport,
  getTopSellingProducts,
  getOrderStatusReport,
  getBrandSalesReport,
  getLowStockReport,
  getDatePresetRange,
  reportService,
} from '../reportService';
import { apiClient } from '../apiClient';
import type {
  DashboardSummary,
  RevenueReport,
  TopProductItem,
  OrderStatusItem,
  BrandSalesReport,
  LowStockItem,
} from '../../types/report';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardSummary', () => {
    it('should call GET /reports/dashboard and unwrap response data', async () => {
      const mockSummary: DashboardSummary = {
        totalOrders: 150,
        pendingOrders: 12,
        totalRevenue: 500000000,
        refundedTotal: 20000000,
        netRevenue: 480000000,
        totalUsers: 80,
        totalProducts: 45,
        totalLowStock: 3,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: mockSummary },
      });

      const result = await getDashboardSummary();

      expect(apiClient.get).toHaveBeenCalledWith('/reports/dashboard');
      expect(result).toEqual(mockSummary);
    });

    it('should handle direct data without wrapped data property', async () => {
      const mockSummary: DashboardSummary = {
        totalOrders: 10,
        pendingOrders: 1,
        totalRevenue: 1000000,
        refundedTotal: 0,
        netRevenue: 1000000,
        totalUsers: 5,
        totalProducts: 10,
        totalLowStock: 0,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockSummary,
      });

      const result = await reportService.getDashboardSummary();
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getRevenueReport', () => {
    it('should call GET /reports/revenue with from and to query params', async () => {
      const mockRevenue: RevenueReport = {
        from: '2026-09-01',
        to: '2026-09-30',
        timeZone: 'Asia/Ho_Chi_Minh',
        totalRevenue: 100000000,
        refundedTotal: 5000000,
        netRevenue: 95000000,
        dailyBreakdown: [{ date: '2026-09-01', revenue: 5000000 }],
        paymentCount: 15,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: mockRevenue },
      });

      const result = await getRevenueReport('2026-09-01', '2026-09-30');

      expect(apiClient.get).toHaveBeenCalledWith('/reports/revenue', {
        params: { from: '2026-09-01', to: '2026-09-30' },
      });
      expect(result).toEqual(mockRevenue);
    });
  });

  describe('getTopSellingProducts', () => {
    it('should call GET /reports/top-products with limit parameter', async () => {
      const mockTopProducts: TopProductItem[] = [
        {
          variantId: 'var-1',
          productName: 'iPhone 15 Pro Max',
          variantName: '256GB Titan',
          sku: 'IP15PM-256',
          totalQuantitySold: 20,
          totalRevenue: 600000000,
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: mockTopProducts },
      });

      const result = await getTopSellingProducts(5);

      expect(apiClient.get).toHaveBeenCalledWith('/reports/top-products', {
        params: { limit: 5 },
      });
      expect(result).toEqual(mockTopProducts);
    });

    it('should default limit to 10 if not provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await getTopSellingProducts();

      expect(apiClient.get).toHaveBeenCalledWith('/reports/top-products', {
        params: { limit: 10 },
      });
    });
  });

  describe('getOrderStatusReport', () => {
    it('should call GET /reports/order-status', async () => {
      const mockStatuses: OrderStatusItem[] = [
        { status: 'PENDING', count: 5 },
        { status: 'DELIVERED', count: 25 },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockStatuses,
      });

      const result = await getOrderStatusReport();

      expect(apiClient.get).toHaveBeenCalledWith('/reports/order-status');
      expect(result).toEqual(mockStatuses);
    });
  });

  describe('getBrandSalesReport', () => {
    it('should call GET /reports/brand-sales with params if provided', async () => {
      const mockBrandSales: BrandSalesReport = {
        from: '2026-09-01',
        to: '2026-09-30',
        totalRevenue: 200000000,
        brands: [
          {
            brandId: 'b-1',
            brandName: 'Apple',
            logoUrl: null,
            quantitySold: 10,
            revenue: 150000000,
            percentage: 75,
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: mockBrandSales },
      });

      const result = await getBrandSalesReport('2026-09-01', '2026-09-30');

      expect(apiClient.get).toHaveBeenCalledWith('/reports/brand-sales', {
        params: { from: '2026-09-01', to: '2026-09-30' },
      });
      expect(result).toEqual(mockBrandSales);
    });

    it('should call GET /reports/brand-sales without params when omitted', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { brands: [], totalRevenue: 0 },
      });

      await getBrandSalesReport();

      expect(apiClient.get).toHaveBeenCalledWith('/reports/brand-sales', {
        params: undefined,
      });
    });
  });

  describe('getLowStockReport', () => {
    it('should call GET /reports/low-stock', async () => {
      const mockLowStock: LowStockItem[] = [
        {
          variantId: 'var-1',
          productName: 'Galaxy S24 Ultra',
          sku: 'S24U-512',
          availableQty: 2,
          reorderLevel: 5,
          deficit: 3,
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: mockLowStock },
      });

      const result = await getLowStockReport();

      expect(apiClient.get).toHaveBeenCalledWith('/reports/low-stock');
      expect(result).toEqual(mockLowStock);
    });
  });

  describe('getDatePresetRange', () => {
    it('should calculate 7_DAYS range accurately', () => {
      const range = getDatePresetRange('7_DAYS');
      const expectedTo = dayjs().format('YYYY-MM-DD');
      const expectedFrom = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

      expect(range.to).toBe(expectedTo);
      expect(range.from).toBe(expectedFrom);
    });

    it('should calculate 30_DAYS range accurately', () => {
      const range = getDatePresetRange('30_DAYS');
      const expectedTo = dayjs().format('YYYY-MM-DD');
      const expectedFrom = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

      expect(range.to).toBe(expectedTo);
      expect(range.from).toBe(expectedFrom);
    });

    it('should calculate THIS_MONTH range accurately', () => {
      const range = getDatePresetRange('THIS_MONTH');
      const expectedFrom = dayjs().startOf('month').format('YYYY-MM-DD');
      const expectedTo = dayjs().endOf('month').format('YYYY-MM-DD');

      expect(range.from).toBe(expectedFrom);
      expect(range.to).toBe(expectedTo);
    });

    it('should return fallback range for CUSTOM or unknown preset', () => {
      const range = getDatePresetRange('CUSTOM');
      const expectedTo = dayjs().format('YYYY-MM-DD');
      const expectedFrom = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

      expect(range.to).toBe(expectedTo);
      expect(range.from).toBe(expectedFrom);
    });
  });
});
