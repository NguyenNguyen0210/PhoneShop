import { apiClient } from './apiClient';
import type { Product, Brand, Category, ProductVariant, UpdateVariantDto, CreateVariantDto } from '../types';
import { FALLBACK_PRODUCT_IMAGE } from '../utils/imageFallback';

export interface GetProductsParams {
  search?: string;
  brandId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  ram?: string[];
  storage?: string[];
  color?: string[];
  inStock?: boolean;
  onSale?: boolean;
  has5G?: boolean;
  os?: string[];
  chipset?: string[];
  minScreenSize?: number;
  maxScreenSize?: number;
  minBattery?: number;
  maxBattery?: number;
  minRating?: number;
  page?: number;
  limit?: number;
  sortBy?:
    | 'default'
    | 'createdAt'
    | 'name'
    | 'price-asc'
    | 'price-desc'
    | 'rating'
    | 'newest'
    | 'best-seller'
    | 'top-discount';
  sortOrder?: 'asc' | 'desc';
}

export type ProductFilterParams = GetProductsParams;

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
        // Backend Prisma Decimal may arrive as string in JSON — coerce here
        // (boundary) so every consumer (filters, sort, cards) sees numbers.
        price:
          v.price !== null && v.price !== undefined ? Number(v.price) : v.price,
        compareAtPrice:
          v.compareAtPrice !== null && v.compareAtPrice !== undefined
            ? Number(v.compareAtPrice)
            : v.compareAtPrice,
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
  async getProducts(params?: GetProductsParams): Promise<PaginatedProducts> {
    const queryParams: GetProductsParams = {
      limit: 12,
      ...params,
    };
    const response = await apiClient.get('/products', {
      params: queryParams,
      paramsSerializer: {
        indexes: null,
      },
    });
    const data = response.data?.data ?? response.data;
    // Backend might return an array or { items, total, ... }
    if (Array.isArray(data)) {
      const items = data.map(normalizeProduct);
      const limit = queryParams.limit ?? 12;
      const total = items.length;
      return {
        items,
        total,
        page: queryParams.page ?? 1,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }
    const rawItems = data.items || data.data || data.products || [];
    const items = rawItems.map(normalizeProduct);
    const limit = data.limit ?? queryParams.limit ?? 12;
    const total = data.total ?? items.length;
    const totalPages = data.totalPages ?? Math.max(1, Math.ceil(total / limit));
    return {
      items,
      total,
      page: data.page ?? queryParams.page ?? 1,
      limit,
      totalPages,
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
  async getAllProductsAdmin(params?: GetProductsParams): Promise<PaginatedProducts> {
    const response = await apiClient.get('/products/admin/all', {
      params,
      paramsSerializer: {
        indexes: null,
      },
    });
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
    description?: string;
    brandId: string;
    categoryId: string;
    thumbnailUrl?: string;
    /** Legacy alias — mapped to thumbnailUrl when sent. */
    thumbnail?: string;
    images?: string[];
    specs?: Record<string, any>;
  }): Promise<Product> {
    const { thumbnail, ...rest } = dto;
    const payload = { ...rest, thumbnailUrl: dto.thumbnailUrl ?? thumbnail };
    const response = await apiClient.post('/products', payload);
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
    dto: CreateVariantDto | {
      sku: string;
      color: string;
      storage: string;
      ram?: string;
      price: number;
      compareAtPrice?: number;
    }
  ): Promise<ProductVariant> {
    // Backend CreateVariantDto has no inventoryQty — stock is adjusted
    // separately via inventoryService.adjustStock after creation.
    const payload = { ...(dto as Record<string, unknown>) };
    delete payload.inventoryQty;
    const response = await apiClient.post(`/products/${productId}/variants`, payload);
    return response.data?.data ?? response.data;
  },

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto
  ): Promise<ProductVariant> {
    const response = await apiClient.patch(
      `/products/${productId}/variants/${variantId}`,
      dto
    );
    return response.data?.data ?? response.data;
  },

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/variants/${variantId}`);
  },

  async toggleVariantStatus(
    productId: string,
    variantId: string,
    isActive: boolean
  ): Promise<ProductVariant> {
    const response = await apiClient.patch(
      `/products/${productId}/variants/${variantId}`,
      { isActive }
    );
    return response.data?.data ?? response.data;
  },
};
