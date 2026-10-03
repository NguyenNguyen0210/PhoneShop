import { apiClient } from './apiClient';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '../types';

export const brandService = {
  async getAllAdmin(search?: string): Promise<Brand[]> {
    const response = search
      ? await apiClient.get('/brands/admin/all', { params: { search } })
      : await apiClient.get('/brands/admin/all');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getById(id: string): Promise<Brand> {
    const response = await apiClient.get(`/brands/${id}`);
    return response.data?.data ?? response.data;
  },

  async create(data: CreateBrandInput): Promise<Brand> {
    const response = await apiClient.post('/brands', data);
    return response.data?.data ?? response.data;
  },

  async update(id: string, data: UpdateBrandInput): Promise<Brand> {
    const response = await apiClient.patch(`/brands/${id}`, data);
    return response.data?.data ?? response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/brands/${id}`);
  },

  async activate(id: string): Promise<Brand> {
    const response = await apiClient.put(`/brands/${id}/activate`);
    return response.data?.data ?? response.data;
  },

  async deactivate(id: string): Promise<Brand> {
    const response = await apiClient.put(`/brands/${id}/deactivate`);
    return response.data?.data ?? response.data;
  },
};
