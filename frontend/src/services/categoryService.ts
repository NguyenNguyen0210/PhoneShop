import { apiClient } from './apiClient';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../types';

export const categoryService = {
  async getAdminCategoryTree(): Promise<Category[]> {
    const response = await apiClient.get('/categories/admin/tree');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getAdminCategoriesAll(): Promise<Category[]> {
    const response = await apiClient.get('/categories/admin/all');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getPublicCategories(): Promise<Category[]> {
    const response = await apiClient.get('/categories');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async createCategory(dto: CreateCategoryInput): Promise<Category> {
    const response = await apiClient.post('/categories', dto);
    return response.data?.data ?? response.data;
  },

  async updateCategory(id: string, dto: UpdateCategoryInput): Promise<Category> {
    const response = await apiClient.patch(`/categories/${id}`, dto);
    return response.data?.data ?? response.data;
  },

  async activateCategory(id: string): Promise<Category> {
    const response = await apiClient.put(`/categories/${id}/activate`);
    return response.data?.data ?? response.data;
  },

  async deactivateCategory(id: string): Promise<Category> {
    const response = await apiClient.put(`/categories/${id}/deactivate`);
    return response.data?.data ?? response.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },
};
