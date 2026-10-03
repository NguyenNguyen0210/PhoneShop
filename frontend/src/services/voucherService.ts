import { apiClient } from './apiClient';

export interface VoucherInfo {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
}

export interface VoucherValidationResult {
  valid: boolean;
  voucher: VoucherInfo;
  discount: number;
}

export const voucherService = {
  async getActiveVouchers(): Promise<VoucherInfo[]> {
    const res = await apiClient.get('/vouchers/active');
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async validateVoucher(code: string, orderTotal: number): Promise<VoucherValidationResult> {
    const res = await apiClient.post('/vouchers/validate', {
      code: code.trim().toUpperCase(),
      orderTotal,
    });
    return res.data?.data ?? res.data;
  },
};
