import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from '../productService';
import { apiClient } from '../apiClient';
import type { UpdateVariantDto } from '../../types';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('productService - Variant CRUD & Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateVariant', () => {
    it('should call PATCH /products/:productId/variants/:variantId with payload and return data', async () => {
      const mockUpdatedVariant = {
        id: 'var-123',
        productId: 'prod-456',
        sku: 'IP15-128-BLK',
        name: 'iPhone 15 128GB Đen',
        color: 'Đen',
        storage: '128GB',
        ram: '8GB',
        price: 21990000,
        compareAtPrice: 24990000,
        imageUrl: 'https://cdn.example.com/img.webp',
        isActive: true,
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: {
          data: mockUpdatedVariant,
        },
      });

      const updateDto: UpdateVariantDto = {
        name: 'iPhone 15 128GB Đen',
        price: 21990000,
        compareAtPrice: 24990000,
        imageUrl: 'https://cdn.example.com/img.webp',
        isActive: true,
      };

      const result = await productService.updateVariant('prod-456', 'var-123', updateDto);

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/products/prod-456/variants/var-123',
        updateDto
      );
      expect(result).toEqual(mockUpdatedVariant);
    });

    it('should handle response without wrapper data object', async () => {
      const mockVariant = {
        id: 'var-123',
        productId: 'prod-456',
        sku: 'IP15-128-BLK',
        price: 20000000,
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: mockVariant,
      });

      const result = await productService.updateVariant('prod-456', 'var-123', { price: 20000000 });

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/products/prod-456/variants/var-123',
        { price: 20000000 }
      );
      expect(result).toEqual(mockVariant);
    });
  });

  describe('deleteVariant', () => {
    it('should call DELETE /products/:productId/variants/:variantId', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: { success: true },
      });

      await productService.deleteVariant('prod-456', 'var-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/products/prod-456/variants/var-123');
    });
  });

  describe('toggleVariantStatus', () => {
    it('should call PATCH /products/:productId/variants/:variantId with { isActive: true }', async () => {
      const mockResult = {
        id: 'var-123',
        productId: 'prod-456',
        isActive: true,
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: { data: mockResult },
      });

      const result = await productService.toggleVariantStatus('prod-456', 'var-123', true);

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/products/prod-456/variants/var-123',
        { isActive: true }
      );
      expect(result).toEqual(mockResult);
    });

    it('should call PATCH /products/:productId/variants/:variantId with { isActive: false }', async () => {
      const mockResult = {
        id: 'var-123',
        productId: 'prod-456',
        isActive: false,
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: { data: mockResult },
      });

      const result = await productService.toggleVariantStatus('prod-456', 'var-123', false);

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/products/prod-456/variants/var-123',
        { isActive: false }
      );
      expect(result).toEqual(mockResult);
    });
  });
});
