import apiClient from './apiClient';
import type { InventoryRecord, AdjustStockPayload, SetReorderLevelPayload } from '../types';

export interface StockCheckResult {
  variantId: string;
  availableQty: number;
  reservedQty: number;
  inStock: boolean;
}

export const inventoryService = {
  getInventoryList: async (): Promise<InventoryRecord[]> => {
    const response = await apiClient.get<InventoryRecord[]>('/inventory');
    return response.data;
  },

  getLowStockAlerts: async (threshold?: number): Promise<InventoryRecord[]> => {
    const response = await apiClient.get<InventoryRecord[]>('/inventory/low-stock', {
      params: threshold !== undefined ? { threshold } : undefined,
    });
    return response.data;
  },

  checkStock: async (variantId: string): Promise<StockCheckResult> => {
    const response = await apiClient.get<StockCheckResult>(`/inventory/${variantId}/check`);
    return response.data;
  },

  adjustStock: async (variantId: string, payload: AdjustStockPayload): Promise<InventoryRecord> => {
    const response = await apiClient.put<InventoryRecord>(`/inventory/${variantId}/adjust`, payload);
    return response.data;
  },

  setReorderLevel: async (variantId: string, payload: SetReorderLevelPayload): Promise<InventoryRecord> => {
    const response = await apiClient.put<InventoryRecord>(`/inventory/${variantId}/reorder-level`, payload);
    return response.data;
  },
};
