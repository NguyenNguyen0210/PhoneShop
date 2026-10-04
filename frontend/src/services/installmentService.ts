import { apiClient } from './apiClient';
import type { InstallmentApplication } from '../types';

export interface AdminInstallmentsQuery {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
  search?: string;
}

export interface AdminInstallmentsResponse {
  items: InstallmentApplication[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewInstallmentPayload {
  status: 'APPROVED' | 'REJECTED';
  staffNotes?: string;
  rejectionReason?: string;
}

export const installmentService = {
  async getMyInstallments(): Promise<InstallmentApplication[]> {
    const response = await apiClient.get('/installments/my');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getInstallmentByOrderId(orderId: string): Promise<InstallmentApplication> {
    const response = await apiClient.get(`/installments/order/${orderId}`);
    return response.data?.data ?? response.data;
  },

  async getInstallments(
    params?: AdminInstallmentsQuery
  ): Promise<AdminInstallmentsResponse> {
    return this.getAdminInstallments(params);
  },

  async getAdminInstallments(
    params?: AdminInstallmentsQuery
  ): Promise<AdminInstallmentsResponse> {
    const response = await apiClient.get('/admin/installments', { params });
    const data = response.data?.data ?? response.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        totalPages: 1,
      };
    }
    return {
      items: data?.items ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      limit: data?.limit ?? 10,
      totalPages: data?.totalPages ?? 1,
    };
  },

  async getAdminInstallmentById(id: string): Promise<InstallmentApplication> {
    const response = await apiClient.get(`/admin/installments/${id}`);
    return response.data?.data ?? response.data;
  },

  async reviewInstallment(
    id: string,
    data: ReviewInstallmentPayload
  ): Promise<any> {
    const response = await apiClient.patch(`/admin/installments/${id}/review`, data);
    return response.data?.data ?? response.data;
  },
};
