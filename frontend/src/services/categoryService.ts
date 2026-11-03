import { apiClient } from './apiClient';
import type { Category } from '../types';

export interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[];
  productCount?: number;
  order?: number;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  parentId?: string | null;
  icon?: string;
  imageUrl?: string;
  description?: string;
  order?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {}

export const categoryService = {
  /**
   * Lấy cây danh mục phân cấp cho trang quản trị
   */
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const res = await apiClient.get('/categories/admin/tree');
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Lấy danh sách toàn bộ danh mục (phẳng) kèm filter
   */
  async getAllCategories(params?: { search?: string; isActive?: boolean }): Promise<Category[]> {
    const res = await apiClient.get('/categories/admin/all', { params });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  /**
   * Tạo mới danh mục
   */
  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    const finalPayload = {
      ...payload,
      imageUrl: payload.imageUrl ?? payload.icon,
      sortOrder: payload.sortOrder ?? payload.order ?? 0,
    };
    const res = await apiClient.post('/categories', finalPayload);
    return res.data?.data ?? res.data;
  },

  /**
   * Cập nhật thông tin danh mục
   */
  async updateCategory(id: string, payload: UpdateCategoryPayload): Promise<Category> {
    const finalPayload = {
      ...payload,
      imageUrl: payload.imageUrl !== undefined ? payload.imageUrl : payload.icon,
      sortOrder: payload.sortOrder !== undefined ? payload.sortOrder : payload.order,
    };
    const res = await apiClient.patch(`/categories/${id}`, finalPayload);
    return res.data?.data ?? res.data;
  },

  /**
   * Bật/tắt trạng thái hoạt động của danh mục
   */
  async toggleCategoryStatus(id: string, activate: boolean): Promise<Category> {
    const endpoint = activate ? `/categories/${id}/activate` : `/categories/${id}/deactivate`;
    const res = await apiClient.put(endpoint);
    return res.data?.data ?? res.data;
  },

  /**
   * Xóa danh mục
   */
  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },

  /**
   * Cập nhật thứ tự sắp xếp danh mục
   */
  async reorderCategories(orders: Array<{ id: string; order?: number; sortOrder?: number }>): Promise<void> {
    const items = orders.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder ?? item.order ?? 0,
    }));
    await apiClient.put('/categories/admin/reorder', { orders, items });
  },
};

export default categoryService;
