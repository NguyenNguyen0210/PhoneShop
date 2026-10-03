import { apiClient } from './apiClient';
import type { Product, Brand, Category, ProductVariant } from '../types';
import { FALLBACK_PRODUCT_IMAGE } from '../utils/imageFallback';

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

export const normalizeProduct = (p: any): Product => {
  if (!p) return p;
  const thumb =
    p.thumbnail ||
    p.thumbnailUrl ||
    p.images?.[0] ||
    p.variants?.[0]?.imageUrl ||
    p.variants?.[0]?.images?.[0] ||
    FALLBACK_PRODUCT_IMAGE;

  const images = Array.isArray(p.images) && p.images.length > 0
    ? p.images
    : [thumb];

  const variants = Array.isArray(p.variants)
    ? p.variants.map((v: any) => ({
        ...v,
        imageUrl: v.imageUrl || thumb,
        images: Array.isArray(v.images) && v.images.length > 0 ? v.images : [v.imageUrl || thumb],
      }))
    : [];

  return {
    ...p,
    thumbnail: thumb,
    thumbnailUrl: thumb,
    images,
    variants,
  };
};

export const productService = {
  async getProducts(params?: ProductFilterParams): Promise<PaginatedProducts> {
    const response = await apiClient.get('/products', { params });
    const data = response.data?.data ?? response.data;
    // Backend might return an array or { items, total, ... }
    if (Array.isArray(data)) {
      const items = data.map(normalizeProduct);
      return {
        items,
        total: items.length,
        page: 1,
        limit: items.length,
        totalPages: 1,
      };
    }
    const rawItems = data.items || data.data || data.products || [];
    const items = rawItems.map(normalizeProduct);
    return {
      items,
      total: data.total ?? items.length,
      page: data.page ?? 1,
      limit: data.limit ?? 50,
      totalPages: data.totalPages ?? 1,
    };
  },

  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get(`/products/${id}`);
    const data = response.data?.data ?? response.data;
    return normalizeProduct(data);
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
      const items = data.map(normalizeProduct);
      return {
        items,
        total: items.length,
        page: 1,
        limit: items.length,
        totalPages: 1,
      };
    }
    const rawItems = data.items || data.data || [];
    const items = rawItems.map(normalizeProduct);
    return {
      items,
      total: data.total ?? items.length,
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
