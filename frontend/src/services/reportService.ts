import { apiClient } from './apiClient';
import dayjs from 'dayjs';
import type {
  DashboardSummary,
  RevenueReport,
  TopProductItem,
  OrderStatusItem,
  BrandSalesReport,
  CategorySalesReport,
  LowStockItem,
  DatePresetKey,
} from '../types/report';

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await apiClient.get<DashboardSummary>('/reports/dashboard');
  return (response.data as any)?.data ?? response.data;
};

export const getRevenueReport = async (from: string, to: string): Promise<RevenueReport> => {
  const response = await apiClient.get<RevenueReport>('/reports/revenue', {
    params: { from, to },
  });
  return (response.data as any)?.data ?? response.data;
};

export const getTopSellingProducts = async (limit = 10): Promise<TopProductItem[]> => {
  const response = await apiClient.get<TopProductItem[]>('/reports/top-products', {
    params: { limit },
  });
  return (response.data as any)?.data ?? response.data;
};

export const getOrderStatusReport = async (): Promise<OrderStatusItem[]> => {
  const response = await apiClient.get<OrderStatusItem[]>('/reports/order-status');
  return (response.data as any)?.data ?? response.data;
};

export const getBrandSalesReport = async (from?: string, to?: string): Promise<BrandSalesReport> => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const response = await apiClient.get<BrandSalesReport>('/reports/brand-sales', {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return (response.data as any)?.data ?? response.data;
};

export const getCategorySalesReport = async (from?: string, to?: string): Promise<CategorySalesReport> => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const response = await apiClient.get<CategorySalesReport>('/reports/category-sales', {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return (response.data as any)?.data ?? response.data;
};

export const getLowStockReport = async (): Promise<LowStockItem[]> => {
  const response = await apiClient.get<LowStockItem[]>('/reports/low-stock');
  return (response.data as any)?.data ?? response.data;
};

export const getDatePresetRange = (preset: DatePresetKey): { from: string; to: string } => {
  const now = dayjs();
  switch (preset) {
    case '7_DAYS':
      return {
        from: now.subtract(7, 'day').format('YYYY-MM-DD'),
        to: now.format('YYYY-MM-DD'),
      };
    case '30_DAYS':
      return {
        from: now.subtract(30, 'day').format('YYYY-MM-DD'),
        to: now.format('YYYY-MM-DD'),
      };
    case 'THIS_MONTH':
      return {
        from: now.startOf('month').format('YYYY-MM-DD'),
        to: now.endOf('month').format('YYYY-MM-DD'),
      };
    case 'CUSTOM':
    default:
      return {
        from: now.subtract(7, 'day').format('YYYY-MM-DD'),
        to: now.format('YYYY-MM-DD'),
      };
  }
};

export const reportService = {
  getDashboardSummary,
  getRevenueReport,
  getTopSellingProducts,
  getOrderStatusReport,
  getBrandSalesReport,
  getCategorySalesReport,
  getLowStockReport,
  getDatePresetRange,
};
