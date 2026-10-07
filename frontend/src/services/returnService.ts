import { apiClient } from './apiClient';
import type { ReturnRequest, RefundItem } from '../types';

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

export interface CreateRefundPayload {
  returnId: string;
  amount: number;
  reason?: string;
}

export const returnService = {
  // Storefront methods
  async createReturn(payload: CreateReturnPayload): Promise<ReturnRequest> {
    const response = await apiClient.post('/returns', payload);
    return response.data?.data ?? response.data;
  },

  async getMyReturns(): Promise<ReturnRequest[]> {
    const response = await apiClient.get('/returns/my');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : data?.items ?? [];
  },

  async getMyReturnById(id: string): Promise<ReturnRequest> {
    const response = await apiClient.get(`/returns/my/${id}`);
    return response.data?.data ?? response.data;
  },

  async cancelReturn(id: string): Promise<void> {
    await apiClient.delete(`/returns/my/${id}/cancel`);
  },

  // Admin methods
  async getAllReturnsAdmin(): Promise<ReturnRequest[]> {
    const response = await apiClient.get('/returns');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : data?.items ?? [];
  },

  async getAdminReturns(params?: {
    status?: string;
    limit?: number;
    page?: number;
    search?: string;
  }): Promise<ReturnRequest[]> {
    const response = await apiClient.get('/returns', { params });
    const data = response.data?.data ?? response.data;
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : data?.items ?? [];
  },

  async getReturnDetailAdmin(id: string): Promise<ReturnRequest> {
    const response = await apiClient.get(`/returns/${id}`);
    return response.data?.data ?? response.data;
  },

  async approveReturn(id: string, adminNote?: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/approve`, { adminNote });
    return response.data?.data ?? response.data;
  },

  async rejectReturn(id: string, adminNote: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/reject`, { adminNote });
    return response.data?.data ?? response.data;
  },

  async markShippingReturn(id: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/mark-shipping`);
    return response.data?.data ?? response.data;
  },

  async receiveReturn(id: string, adminNote?: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/receive`, { adminNote });
    return response.data?.data ?? response.data;
  },

  async inspectReturn(id: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/inspect`);
    return response.data?.data ?? response.data;
  },

  async completeReturn(id: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/complete`);
    return response.data?.data ?? response.data;
  },

  async createRefund(payload: CreateRefundPayload): Promise<RefundItem> {
    const response = await apiClient.post('/returns/refunds', payload);
    return response.data?.data ?? response.data;
  },

  async processRefund(refundId: string): Promise<RefundItem> {
    const response = await apiClient.put(`/returns/refunds/${refundId}/process`);
    return response.data?.data ?? response.data;
  },

  async completeRefund(refundId: string): Promise<RefundItem> {
    const response = await apiClient.put(`/returns/refunds/${refundId}/complete`);
    return response.data?.data ?? response.data;
  },

  async getRefundHistory(): Promise<RefundItem[]> {
    const response = await apiClient.get('/returns/refunds/history');
    const data = response.data?.data ?? response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return data?.items ?? [];
  },
};
