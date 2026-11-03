import { apiClient } from './apiClient';
import type { Warranty } from '../types';

export interface WarrantyLookupResult {
  id?: string;
  userId?: string;
  warrantyCode: string;
  imeiNumber?: string;
  productName: string;
  variantInfo?: string;
  warrantyMonths?: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOIDED';
  isExpired: boolean;
  daysRemaining: number;
  notes?: string;
}

export interface ClaimWarrantyPayload {
  reason: string;
  customerPhone?: string;
  returnAddress?: string;
}

export const warrantyService = {
  async lookupWarranty(codeOrImei: string): Promise<WarrantyLookupResult> {
    const clean = codeOrImei.trim();

    try {
      const response = await apiClient.get(`/warranty/search/${encodeURIComponent(clean)}`);
      const w = response.data?.data ?? response.data;
      const now = new Date();
      const end = new Date(w.endDate || w.expiresAt);
      const isExpired = end < now;
      const daysRemaining = isExpired ? 0 : Math.ceil((end.getTime() - now.getTime()) / 86400000);

      return {
        id: w.id,
        userId: w.userId,
        warrantyCode: w.warrantyCode,
        imeiNumber: w.imei || w.imeiNumber || w.imeiDevice?.imei || w.imeiDevice?.imeiNumber,
        productName:
          w.productName ||
          w.productVariant?.product?.name ||
          w.deviceInfo?.productName ||
          'Thiết bị di động chính hãng',
        variantInfo: w.variantInfo || w.variantName || (w.productVariant
          ? `${w.productVariant.color || ''} - ${w.productVariant.storage || ''}`
          : undefined),
        warrantyMonths: w.warrantyMonths ?? 12,
        startDate: w.startDate || w.activatedAt,
        endDate: w.endDate || w.expiresAt,
        status: isExpired ? 'EXPIRED' : w.status || 'ACTIVE',
        isExpired,
        daysRemaining,
        notes: w.notes,
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không tìm thấy thông tin bảo hành cho mã này. Vui lòng kiểm tra lại số IMEI, số điện thoại hoặc mã bảo hành.';
      throw new Error(msg);
    }
  },

  async getMyWarranties(): Promise<Warranty[]> {
    const response = await apiClient.get('/warranty/my');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async claimWarranty(
    id: string,
    payload: { reason: string; customerPhone?: string; returnAddress?: string }
  ): Promise<Warranty> {
    const res = await apiClient.post(`/warranty/${id}/claim`, payload);
    return res.data?.data ?? res.data;
  },

  async getAllWarrantiesAdmin(): Promise<any[]> {
    const res = await apiClient.get('/warranty');
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async voidWarrantyAdmin(id: string): Promise<any> {
    const res = await apiClient.put(`/warranty/${id}/void`);
    return res.data?.data ?? res.data;
  },
};
