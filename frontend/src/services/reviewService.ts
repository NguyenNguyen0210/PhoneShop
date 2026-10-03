import { apiClient } from './apiClient';
import type { Review } from '../types';

export interface MyReviewStatusResponse {
  hasPurchased: boolean;
  canReview: boolean;
  myReview: Review | null;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
}

export interface UpdateReviewPayload {
  rating?: number;
  title?: string;
  content?: string;
  images?: string[];
}

export const reviewService = {
  async getMyReviewStatus(productId: string): Promise<MyReviewStatusResponse> {
    const response = await apiClient.get<MyReviewStatusResponse>(
      `/reviews/product/${productId}/my-review`,
    );
    return (response.data as unknown as { data?: MyReviewStatusResponse })?.data ?? response.data;
  },

  async createReview(payload: CreateReviewPayload): Promise<Review> {
    const response = await apiClient.post<Review>('/reviews', payload);
    return (response.data as unknown as { data?: Review })?.data ?? response.data;
  },

  async updateReview(id: string, payload: UpdateReviewPayload): Promise<Review> {
    const response = await apiClient.patch<Review>(`/reviews/${id}`, payload);
    return (response.data as unknown as { data?: Review })?.data ?? response.data;
  },

  async deleteReview(id: string): Promise<void> {
    await apiClient.delete(`/reviews/${id}`);
  },

  async uploadReviewImages(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post<Array<{ url: string }>>(
      '/storage/upload-review-images',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    const raw = (response.data as unknown as { data?: Array<{ url: string }> })?.data ?? response.data;
    return (Array.isArray(raw) ? raw : []).map((item: { url: string }) => item.url);
  },
};
