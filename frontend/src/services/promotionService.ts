import { apiClient } from './apiClient';
import type { Voucher, CreateVoucherInput, VoucherUsageRecord, PromotionSummary } from '../types';

export const promotionService = {
  getSummary: async (): Promise<PromotionSummary> => {
    const res = await apiClient.get('/vouchers/analytics/summary');
    return res.data?.data ?? res.data;
  },

  getAllVouchers: async (): Promise<Voucher[]> => {
    const res = await apiClient.get('/vouchers');
    return res.data?.data ?? res.data;
  },

  getVoucher: async (id: string): Promise<Voucher> => {
    const res = await apiClient.get(`/vouchers/${id}`);
    return res.data?.data ?? res.data;
  },

  createVoucher: async (data: CreateVoucherInput): Promise<Voucher> => {
    const res = await apiClient.post('/vouchers', data);
    return res.data?.data ?? res.data;
  },

  updateVoucher: async (id: string, data: Partial<CreateVoucherInput>): Promise<Voucher> => {
    const res = await apiClient.patch(`/vouchers/${id}`, data);
    return res.data?.data ?? res.data;
  },

  toggleVoucherStatus: async (id: string, activate: boolean): Promise<Voucher> => {
    const endpoint = activate ? `/vouchers/${id}/activate` : `/vouchers/${id}/deactivate`;
    const res = await apiClient.put(endpoint);
    return res.data?.data ?? res.data;
  },

  deleteVoucher: async (id: string): Promise<void> => {
    await apiClient.delete(`/vouchers/${id}`);
  },

  getVoucherUsages: async (id: string): Promise<VoucherUsageRecord[]> => {
    const res = await apiClient.get(`/vouchers/${id}/usage`);
    return res.data?.data ?? res.data;
  },
};
