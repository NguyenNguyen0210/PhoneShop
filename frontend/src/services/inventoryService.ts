import { apiClient } from './apiClient';
import type {
  InventoryRecord,
  AdjustStockPayload,
  SetReorderLevelPayload,
  StockLedgerResponse,
  DailyLedgerSummary,
} from '../types';

export interface StockCheckResult {
  variantId: string;
  availableQty: number;
  reservedQty: number;
  inStock: boolean;
}

export const inventoryService = {
  getStockLevels: async (params?: {
    limit?: number;
    page?: number;
    search?: string;
  }): Promise<InventoryRecord[]> => {
    const response = await apiClient.get('/inventory', { params });
    const data = response.data?.data ?? response.data;
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : data?.items ?? [];
  },

  getInventoryList: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    lowStockOnly?: boolean;
  }): Promise<InventoryRecord[]> => {
    const response = await apiClient.get('/inventory', {
      // Lấy đủ lớn để picker Nhập kho thấy được biến thể X-Y-Z
      // (backend paginate tối đa 100).
      params: { limit: 100, ...params },
    });
    const data = response.data?.data ?? response.data;
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : data?.items ?? [];
  },

  syncMissingInventories: async (): Promise<{ created: number }> => {
    const response = await apiClient.post('/inventory/sync-missing');
    return response.data?.data ?? response.data;
  },

  getLowStockAlerts: async (threshold?: number): Promise<InventoryRecord[]> => {
    const response = await apiClient.get('/inventory/low-stock', {
      params: threshold !== undefined ? { threshold } : undefined,
    });
    return response.data?.data ?? response.data;
  },

  checkStock: async (variantId: string): Promise<StockCheckResult> => {
    const response = await apiClient.get(`/inventory/${variantId}/check`);
    return response.data?.data ?? response.data;
  },

  adjustStock: async (variantId: string, payload: AdjustStockPayload): Promise<InventoryRecord> => {
    const response = await apiClient.put(`/inventory/${variantId}/adjust`, payload);
    return response.data?.data ?? response.data;
  },

  setReorderLevel: async (variantId: string, payload: SetReorderLevelPayload): Promise<InventoryRecord> => {
    const response = await apiClient.put(`/inventory/${variantId}/reorder-level`, payload);
    return response.data?.data ?? response.data;
  },

  getLedger: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
    search?: string;
    variantId?: string;
  }): Promise<StockLedgerResponse> => {
    const response = await apiClient.get<StockLedgerResponse>('/inventory/ledger', { params });
    return response.data;
  },

  getDailySummary: async (params?: { startDate?: string; endDate?: string }): Promise<DailyLedgerSummary[]> => {
    const response = await apiClient.get<DailyLedgerSummary[]>('/inventory/ledger/daily-summary', { params });
    return response.data;
  },

  getVariantLedger: async (
    variantId: string,
    params?: { page?: number; limit?: number }
  ): Promise<StockLedgerResponse> => {
    const response = await apiClient.get<StockLedgerResponse>(`/inventory/variants/${variantId}/ledger`, { params });
    return response.data;
  },

  exportLedgerCsv: async (params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    search?: string;
    variantId?: string;
  }): Promise<Blob> => {
    const response = await apiClient.get('/inventory/ledger/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
