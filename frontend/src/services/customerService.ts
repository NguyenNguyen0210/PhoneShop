import { apiClient } from './apiClient';

export interface CustomerFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export const customerService = {
  getCustomers: async (params?: CustomerFilterParams) => {
    const res = await apiClient.get('/users', { params });
    return res.data?.data ?? res.data;
  },

  getCustomerById: async (id: string) => {
    const res = await apiClient.get(`/users/${id}`);
    return res.data?.data ?? res.data;
  },

  getCustomer360: async (id: string) => {
    const res = await apiClient.get(`/users/${id}/customer-360`);
    return res.data?.data ?? res.data;
  },

  // Admin-only operations
  activateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/activate`);
    return res.data?.data ?? res.data;
  },

  deactivateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/deactivate`);
    return res.data?.data ?? res.data;
  },

  banUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/ban`);
    return res.data?.data ?? res.data;
  },
};
