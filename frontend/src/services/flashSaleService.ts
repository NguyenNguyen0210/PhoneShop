import { apiClient } from './apiClient';
import type { FlashSaleCampaign, CreateFlashSaleInput } from '../types';

export const flashSaleService = {
  getActiveCampaign: async (): Promise<FlashSaleCampaign | null> => {
    const res = await apiClient.get('/flash-sales/active');
    return res.data?.data ?? res.data;
  },

  getAdminCampaigns: async (status?: string): Promise<FlashSaleCampaign[]> => {
    const res = await apiClient.get('/flash-sales/admin', { params: { status } });
    return res.data?.data ?? res.data;
  },

  getCampaignDetail: async (id: string): Promise<FlashSaleCampaign> => {
    const res = await apiClient.get(`/flash-sales/${id}`);
    return res.data?.data ?? res.data;
  },

  createCampaign: async (data: CreateFlashSaleInput): Promise<FlashSaleCampaign> => {
    const res = await apiClient.post('/flash-sales', data);
    return res.data?.data ?? res.data;
  },

  endEarly: async (id: string): Promise<FlashSaleCampaign> => {
    const res = await apiClient.put(`/flash-sales/${id}/end-early`);
    return res.data?.data ?? res.data;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    await apiClient.delete(`/flash-sales/${id}`);
  },
};
