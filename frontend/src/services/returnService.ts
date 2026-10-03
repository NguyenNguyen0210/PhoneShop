import { apiClient } from './apiClient';
import type { ReturnRequest } from '../types';

export interface CreateReturnPayload {
  orderId: string;
  reason: string;
  customerNote?: string;
  items: {
    orderItemId: string;
    quantity: number;
    reason?: string;
    condition?: string;
  }[];
}

export const returnService = {
  async createReturn(payload: CreateReturnPayload): Promise<ReturnRequest> {
    const response = await apiClient.post('/returns', payload);
    return response.data?.data ?? response.data;
  },

  async getMyReturns(): Promise<ReturnRequest[]> {
    const response = await apiClient.get('/returns/my');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getMyReturnById(id: string): Promise<ReturnRequest> {
    const response = await apiClient.get(`/returns/my/${id}`);
    return response.data?.data ?? response.data;
  },

  async cancelReturn(id: string): Promise<void> {
    await apiClient.delete(`/returns/my/${id}/cancel`);
  },
};
