import { apiClient } from './apiClient';
import type { CustomerSummary, Customer360Data } from '../types/customer';

export interface CustomerFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export const customerService = {
  getCustomers: async (params?: CustomerFilterParams) => {
    const res = await apiClient.get<{
      data: CustomerSummary[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/users', { params });
    return res.data;
  },

  getCustomerById: async (id: string) => {
    const res = await apiClient.get<CustomerSummary>(`/users/${id}`);
    return res.data;
  },

  getCustomer360: async (id: string) => {
    const res = await apiClient.get<Customer360Data>(`/users/${id}/customer-360`);
    return res.data;
  },

  // Admin-only operations
  activateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/activate`);
    return res.data;
  },

  deactivateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/deactivate`);
    return res.data;
  },

  banUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/ban`);
    return res.data;
  },
};
