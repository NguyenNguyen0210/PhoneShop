import { apiClient } from './apiClient';
import type { Product, Brand, Category, ProductVariant } from '../types';

export interface ProductFilterParams {
  search?: string;
  brandId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  storage?: string;
  ram?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const productService = {
  async getProducts(params?: ProductFilterParams): Promise<PaginatedProducts> {
    const response = await apiClient.get('/products', { params });
    const data = response.data?.data ?? response.data;
    // Backend might return an array or { items, total, ... }
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        limit: data.length,
        totalPages: 1,
      };
    }
    return {
      items: data.items || data.data || data.products || [],
      total: data.total ?? (data.items?.length || data.data?.length || 0),
      page: data.page ?? 1,
      limit: data.limit ?? 50,
      totalPages: data.totalPages ?? 1,
    };
  },

  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data?.data ?? response.data;
  },

  async getBrands(): Promise<Brand[]> {
    const response = await apiClient.get('/brands');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
  },

  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get('/categories');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
  },

  // Admin APIs
  async getAllProductsAdmin(params?: ProductFilterParams): Promise<PaginatedProducts> {
    const response = await apiClient.get('/products/admin/all', { params });
    const data = response.data?.data ?? response.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        limit: data.length,
        totalPages: 1,
      };
    }
    return {
      items: data.items || data.data || [],
      total: data.total ?? (data.items?.length || data.data?.length || 0),
      page: data.page ?? 1,
      limit: data.limit ?? 50,
      totalPages: data.totalPages ?? 1,
    };
  },

  async createProduct(dto: {
    name: string;
    description: string;
    brandId: string;
    categoryId: string;
    thumbnail?: string;
    images?: string[];
    specs?: Record<string, string>;
  }): Promise<Product> {
    const response = await apiClient.post('/products', dto);
    return response.data?.data ?? response.data;
  },

  async updateProduct(id: string, dto: Partial<Product>): Promise<Product> {
    const response = await apiClient.patch(`/products/${id}`, dto);
    return response.data?.data ?? response.data;
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async addVariant(
    productId: string,
    dto: {
      sku: string;
      color: string;
      storage: string;
      ram?: string;
      price: number;
      compareAtPrice?: number;
      inventoryQty?: number;
    }
  ): Promise<ProductVariant> {
    const response = await apiClient.post(`/products/${productId}/variants`, dto);
    return response.data?.data ?? response.data;
  },
};
