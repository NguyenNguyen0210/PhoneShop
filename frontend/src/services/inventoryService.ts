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
  getInventoryList: async (): Promise<InventoryRecord[]> => {
    const response = await apiClient.get('/inventory');
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
