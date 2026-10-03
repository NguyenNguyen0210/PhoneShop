import { describe, it, expect, vi, beforeEach } from 'vitest';
import { brandService } from '../brandService';
import { apiClient } from '../apiClient';
import type { CreateBrandInput, UpdateBrandInput } from '../../types';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('brandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAdmin', () => {
    it('should call /brands/admin/all without query param when search is not provided', async () => {
      const mockBrands = [
        { id: '1', name: 'Apple', slug: 'apple', isActive: true },
        { id: '2', name: 'Samsung', slug: 'samsung', isActive: true },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockBrands } });

      const result = await brandService.getAllAdmin();

      expect(apiClient.get).toHaveBeenCalledWith('/brands/admin/all');
      expect(result).toEqual(mockBrands);
    });

    it('should call /brands/admin/all with search query param when provided', async () => {
      const mockBrands = [{ id: '1', name: 'Apple', slug: 'apple', isActive: true }];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockBrands } });

      const result = await brandService.getAllAdmin('Apple');

      expect(apiClient.get).toHaveBeenCalledWith('/brands/admin/all', {
        params: { search: 'Apple' },
      });
      expect(result).toEqual(mockBrands);
    });

    it('should handle direct array response when res.data is an array', async () => {
      const mockBrands = [{ id: '1', name: 'Apple', slug: 'apple', isActive: true }];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBrands });

      const result = await brandService.getAllAdmin();

      expect(result).toEqual(mockBrands);
    });

    it('should handle items wrapper in response data', async () => {
      const mockBrands = [{ id: '1', name: 'Apple', slug: 'apple', isActive: true }];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { items: mockBrands } });

      const result = await brandService.getAllAdmin();

      expect(result).toEqual(mockBrands);
    });
  });

  describe('getById', () => {
    it('should call /brands/:id and return brand', async () => {
      const mockBrand = { id: 'brand-1', name: 'Apple', slug: 'apple', isActive: true };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockBrand } });

      const result = await brandService.getById('brand-1');

      expect(apiClient.get).toHaveBeenCalledWith('/brands/brand-1');
      expect(result).toEqual(mockBrand);
    });
  });

  describe('create', () => {
    it('should post to /brands and return created brand', async () => {
      const input: CreateBrandInput = {
        name: 'Xiaomi',
        slug: 'xiaomi',
        description: 'Smartphone Xiaomi',
        websiteUrl: 'https://mi.com',
        isActive: true,
      };
      const createdBrand = { id: 'brand-2', ...input };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: createdBrand } });

      const result = await brandService.create(input);

      expect(apiClient.post).toHaveBeenCalledWith('/brands', input);
      expect(result).toEqual(createdBrand);
    });
  });

  describe('update', () => {
    it('should patch to /brands/:id and return updated brand', async () => {
      const input: UpdateBrandInput = {
        name: 'Apple Inc',
      };
      const updatedBrand = { id: 'brand-1', name: 'Apple Inc', slug: 'apple', isActive: true };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { data: updatedBrand } });

      const result = await brandService.update('brand-1', input);

      expect(apiClient.patch).toHaveBeenCalledWith('/brands/brand-1', input);
      expect(result).toEqual(updatedBrand);
    });
  });

  describe('delete', () => {
    it('should call delete /brands/:id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });

      await brandService.delete('brand-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/brands/brand-1');
    });
  });

  describe('activate', () => {
    it('should call put /brands/:id/activate and return activated brand', async () => {
      const activatedBrand = { id: 'brand-1', name: 'Apple', slug: 'apple', isActive: true };
      vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: activatedBrand } });

      const result = await brandService.activate('brand-1');

      expect(apiClient.put).toHaveBeenCalledWith('/brands/brand-1/activate');
      expect(result).toEqual(activatedBrand);
    });
  });

  describe('deactivate', () => {
    it('should call put /brands/:id/deactivate and return deactivated brand', async () => {
      const deactivatedBrand = { id: 'brand-1', name: 'Apple', slug: 'apple', isActive: false };
      vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: deactivatedBrand } });

      const result = await brandService.deactivate('brand-1');

      expect(apiClient.put).toHaveBeenCalledWith('/brands/brand-1/deactivate');
      expect(result).toEqual(deactivatedBrand);
    });
  });
});
