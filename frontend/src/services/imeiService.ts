import { apiClient } from './apiClient';
import type { ImeiDevice, ImeiStatus } from '../types';

export interface PaginatedImeis {
  data: ImeiDevice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const mapImeiItem = (item: any): ImeiDevice => ({
  id: item.id,
  imei: item.imei || item.imeiNumber || '',
  imeiNumber: item.imeiNumber || item.imei || '',
  variantId: item.variantId,
  status: item.status,
  variant: item.variant,
  createdAt: item.createdAt,
  soldAt: item.soldAt,
});

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

  async getImeis(params?: {
    variantId?: string;
    status?: ImeiStatus;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedImeis> {
    const response = await apiClient.get('/imei', { params });
    const resData = response.data?.data ?? response.data;
    if (Array.isArray(resData)) {
      const mapped = resData.map(mapImeiItem);
      return Object.assign([...mapped], {
        data: mapped,
        total: mapped.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? (mapped.length || 10),
        totalPages: 1,
      }) as unknown as PaginatedImeis;
    }
    const rawList = Array.isArray(resData?.data)
      ? resData.data
      : Array.isArray(resData?.items)
      ? resData.items
      : [];
    const mapped = rawList.map(mapImeiItem);
    const limit = resData?.limit ?? params?.limit ?? 10;
    const total = resData?.total ?? mapped.length;
    return Object.assign([...mapped], {
      data: mapped,
      total,
      page: resData?.page ?? params?.page ?? 1,
      limit,
      totalPages: resData?.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 1),
    }) as unknown as PaginatedImeis;
  },

  async getAllImeis(params?: { variantId?: string; status?: string }): Promise<ImeiDevice[]> {
    const res = await this.getImeis(params as any);
    return res.data;
  },

  async searchImei(imei: string): Promise<ImeiDevice> {
    const response = await apiClient.get('/imei/search', { params: { imei } });
    const item = response.data?.data ?? response.data;
    return {
      id: item.id,
      imei: item.imei || item.imeiNumber,
      imeiNumber: item.imeiNumber || item.imei,
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
