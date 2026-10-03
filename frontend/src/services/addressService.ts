import { apiClient } from './apiClient';
import type { Address, CreateAddressPayload } from '../types';

export const addressService = {
  async getAddresses(): Promise<Address[]> {
    const res = await apiClient.get('/addresses');
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async createAddress(payload: CreateAddressPayload): Promise<Address> {
    const res = await apiClient.post('/addresses', payload);
    return res.data?.data ?? res.data;
  },

  async setDefaultAddress(id: string): Promise<Address> {
    const res = await apiClient.put(`/addresses/${id}/default`);
    return res.data?.data ?? res.data;
  },

  async deleteAddress(id: string): Promise<void> {
    await apiClient.delete(`/addresses/${id}`);
  },
};
