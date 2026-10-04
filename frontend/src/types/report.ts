export interface DashboardSummary {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  refundedTotal: number;
  netRevenue: number;
  totalUsers: number;
  totalProducts: number;
  totalLowStock: number;
}

export interface DailyRevenueItem {
  date: string;
  revenue: number;
}

export interface RevenueReport {
  from: string;
  to: string;
  timeZone: string;
  totalRevenue: number;
  refundedTotal: number;
  netRevenue: number;
  dailyBreakdown: DailyRevenueItem[];
  paymentCount: number;
}

export interface TopProductItem {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface OrderStatusItem {
  status: string;
  count: number;
}

export interface BrandSalesItem {
  brandId: string;
  brandName: string;
  logoUrl: string | null;
  quantitySold: number;
  revenue: number;
  percentage: number;
}

export interface BrandSalesReport {
  from?: string;
  to?: string;
  totalRevenue: number;
  brands: BrandSalesItem[];
}

export interface CategorySalesItem {
  categoryId: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  percentage: number;
}

export interface CategorySalesReport {
  from?: string;
  to?: string;
  totalRevenue: number;
  categories: CategorySalesItem[];
}

export interface LowStockItem {
  variantId: string;
  productName: string;
  sku: string;
  availableQty: number;
  reorderLevel: number;
  deficit: number;
}

export type DatePresetKey = '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'CUSTOM';
