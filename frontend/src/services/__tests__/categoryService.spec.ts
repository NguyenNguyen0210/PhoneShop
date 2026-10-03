import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryService } from '../categoryService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('categoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAdminCategoryTree should call /categories/admin/tree and return items', async () => {
    const mockData = [{ id: '1', name: 'Điện thoại', children: [] }];
    (apiClient.get as any).mockResolvedValue({ data: { data: mockData } });

    const result = await categoryService.getAdminCategoryTree();
    expect(apiClient.get).toHaveBeenCalledWith('/categories/admin/tree');
    expect(result).toEqual(mockData);
  });

  it('getAdminCategoriesAll should call /categories/admin/all and return items', async () => {
    const mockData = [{ id: '1', name: 'Điện thoại' }, { id: '2', name: 'Phụ kiện' }];
    (apiClient.get as any).mockResolvedValue({ data: { data: mockData } });

    const result = await categoryService.getAdminCategoriesAll();
    expect(apiClient.get).toHaveBeenCalledWith('/categories/admin/all');
    expect(result).toEqual(mockData);
  });

  it('getPublicCategories should call /categories and return items', async () => {
    const mockData = [{ id: '1', name: 'Điện thoại', isActive: true }];
    (apiClient.get as any).mockResolvedValue({ data: mockData });

    const result = await categoryService.getPublicCategories();
    expect(apiClient.get).toHaveBeenCalledWith('/categories');
    expect(result).toEqual(mockData);
  });

  it('createCategory should post to /categories', async () => {
    const input = { name: 'Điện thoại mới', slug: 'dien-thoai-moi' };
    (apiClient.post as any).mockResolvedValue({ data: { data: { id: 'new-1', ...input } } });

    const result = await categoryService.createCategory(input);
    expect(apiClient.post).toHaveBeenCalledWith('/categories', input);
    expect(result.id).toBe('new-1');
  });

  it('updateCategory should patch to /categories/:id', async () => {
    const input = { name: 'Điện thoại VIP' };
    (apiClient.patch as any).mockResolvedValue({ data: { data: { id: '1', ...input } } });

    const result = await categoryService.updateCategory('1', input);
    expect(apiClient.patch).toHaveBeenCalledWith('/categories/1', input);
    expect(result.name).toBe('Điện thoại VIP');
  });

  it('activateCategory should call put /categories/:id/activate', async () => {
    (apiClient.put as any).mockResolvedValue({ data: { data: { id: '1', isActive: true } } });

    const result = await categoryService.activateCategory('1');
    expect(apiClient.put).toHaveBeenCalledWith('/categories/1/activate');
    expect(result.isActive).toBe(true);
  });

  it('deactivateCategory should call put /categories/:id/deactivate', async () => {
    (apiClient.put as any).mockResolvedValue({ data: { data: { id: '1', isActive: false } } });

    const result = await categoryService.deactivateCategory('1');
    expect(apiClient.put).toHaveBeenCalledWith('/categories/1/deactivate');
    expect(result.isActive).toBe(false);
  });

  it('deleteCategory should call delete /categories/:id', async () => {
    (apiClient.delete as any).mockResolvedValue({ data: { success: true } });

    await categoryService.deleteCategory('1');
    expect(apiClient.delete).toHaveBeenCalledWith('/categories/1');
  });
});
