import { apiClient } from './apiClient';
import type { ImeiDevice } from '../types';

export const imeiService = {
  validateLuhn(imei: string): boolean {
    const clean = imei.trim();
    if (!/^\d{15}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let digit = parseInt(clean[i], 10);
      if (i % 2 !== 0) digit *= 2;
      if (digit > 9) digit -= 9;
      sum += digit;
    }
    return sum % 10 === 0;
  },

  async getAllImeis(params?: { variantId?: string; status?: string }): Promise<ImeiDevice[]> {
    const response = await apiClient.get('/imei', { params });
    const data = response.data?.data ?? response.data;
    const rawList = Array.isArray(data) ? data : data?.items ?? [];
    return rawList.map((item: any) => ({
      id: item.id,
      imeiNumber: item.imei || item.imeiNumber,
      variantId: item.variantId,
      status: item.status,
      variant: item.variant,
      createdAt: item.createdAt,
      soldAt: item.soldAt,
    }));
  },

  async searchImei(imei: string): Promise<ImeiDevice> {
    const response = await apiClient.get('/imei/search', { params: { imei } });
    const item = response.data?.data ?? response.data;
    return {
      id: item.id,
      imeiNumber: item.imei || item.imeiNumber,
      variantId: item.variantId,
      status: item.status,
      variant: item.variant,
      createdAt: item.createdAt,
      soldAt: item.soldAt,
    };
  },

  async importImeis(
    variantId: string,
    imeiNumbers: string[]
  ): Promise<{ imported: number; total: number }> {
    const payload = {
      items: imeiNumbers.map((imei) => ({
        imei: imei.trim(),
        variantId,
      })),
    };
    const response = await apiClient.post('/imei/import', payload);
    return response.data?.data ?? response.data;
  },

  async updateImeiStatus(
    id: string,
    action: 'reserve' | 'sell' | 'return' | 'warranty' | 'block'
  ): Promise<ImeiDevice> {
    const response = await apiClient.put(`/imei/${id}/${action}`);
    return response.data?.data ?? response.data;
  },
};
