import { apiClient } from './apiClient';
import type { Warranty } from '../types';

export interface WarrantyLookupResult {
  warrantyCode: string;
  imeiNumber?: string;
  productName: string;
  variantInfo?: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOIDED';
  isExpired: boolean;
  daysRemaining: number;
}

export const warrantyService = {
  async lookupWarranty(codeOrImei: string): Promise<WarrantyLookupResult> {
    const clean = codeOrImei.trim();

    try {
      const response = await apiClient.get(`/warranty/search/${encodeURIComponent(clean)}`);
      const w = response.data?.data ?? response.data;
      const now = new Date();
      const end = new Date(w.endDate);
      const isExpired = end < now;
      const daysRemaining = isExpired ? 0 : Math.ceil((end.getTime() - now.getTime()) / 86400000);

      return {
        warrantyCode: w.warrantyCode,
        imeiNumber: w.imeiDevice?.imei || w.imeiDevice?.imeiNumber,
        productName:
          w.productVariant?.product?.name ||
          w.deviceInfo?.productName ||
          'Thiết bị di động chính hãng',
        variantInfo: w.productVariant
          ? `${w.productVariant.color || ''} - ${w.productVariant.storage || ''}`
          : undefined,
        startDate: w.startDate,
        endDate: w.endDate,
        status: isExpired ? 'EXPIRED' : w.status || 'ACTIVE',
        isExpired,
        daysRemaining,
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không tìm thấy thông tin bảo hành cho mã này. Vui lòng kiểm tra lại số IMEI hoặc mã bảo hành.';
      throw new Error(msg);
    }
  },

  async getMyWarranties(): Promise<Warranty[]> {
    const response = await apiClient.get('/warranty/my');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },
};
