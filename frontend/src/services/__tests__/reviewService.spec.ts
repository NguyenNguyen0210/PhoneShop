import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reviewService } from '../reviewService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('reviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyReviewStatus', () => {
    it('fetches review status and returns response data', async () => {
      const mockStatus = {
        hasPurchased: true,
        canReview: true,
        myReview: null,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockStatus });

      const result = await reviewService.getMyReviewStatus('prod-123');

      expect(apiClient.get).toHaveBeenCalledWith('/reviews/product/prod-123/my-review');
      expect(result).toEqual(mockStatus);
    });

    it('unwraps nested data if response has data property', async () => {
      const mockStatus = {
        hasPurchased: true,
        canReview: false,
        myReview: { id: 'rev-1', rating: 5, productId: 'prod-123', userId: 'u-1', createdAt: '2026-10-03' },
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockStatus } });

      const result = await reviewService.getMyReviewStatus('prod-123');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('createReview', () => {
    it('posts review payload and returns created review', async () => {
      const payload = {
        productId: 'prod-123',
        rating: 5,
        title: 'Tuyệt vời',
        content: 'Sản phẩm dùng rất tốt',
        images: ['https://example.com/img1.jpg'],
      };
      const mockCreated = {
        id: 'rev-1',
        ...payload,
        userId: 'u-1',
        createdAt: '2026-10-03',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockCreated });

      const result = await reviewService.createReview(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/reviews', payload);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateReview', () => {
    it('patches review by id and returns updated review', async () => {
      const payload = {
        rating: 4,
        title: 'Cập nhật tiêu đề',
      };
      const mockUpdated = {
        id: 'rev-1',
        productId: 'prod-123',
        userId: 'u-1',
        rating: 4,
        title: 'Cập nhật tiêu đề',
        createdAt: '2026-10-03',
      };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockUpdated });

      const result = await reviewService.updateReview('rev-1', payload);

      expect(apiClient.patch).toHaveBeenCalledWith('/reviews/rev-1', payload);
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deleteReview', () => {
    it('deletes review by id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });

      await reviewService.deleteReview('rev-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/reviews/rev-1');
    });
  });

  describe('uploadReviewImages', () => {
    it('uploads files via FormData and extracts urls', async () => {
      const file1 = new File(['dummy content 1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['dummy content 2'], 'test2.png', { type: 'image/png' });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: [
          { url: 'https://cdn.example.com/test1.jpg' },
          { url: 'https://cdn.example.com/test2.png' },
        ],
      });

      const result = await reviewService.uploadReviewImages([file1, file2]);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/storage/upload-review-images',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      expect(result).toEqual([
        'https://cdn.example.com/test1.jpg',
        'https://cdn.example.com/test2.png',
      ]);
    });
  });
});
