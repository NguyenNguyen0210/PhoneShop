import { apiClient } from './apiClient';
import type { Review, ReviewReply } from '../types';

export interface AdminReviewQueryParams {
  productId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdminReviewListResponse {
  data: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

  async getAdminReviews(params?: AdminReviewQueryParams): Promise<AdminReviewListResponse> {
    const response = await apiClient.get<AdminReviewListResponse>('/reviews/admin/all', { params });
    const payload = response.data as any;
    if (payload?.data && payload?.total !== undefined) {
      return payload;
    }
    if (payload?.data && payload.data?.total !== undefined) {
      return payload.data;
    }
    return payload?.data ?? payload;
  },

  async approveReview(id: string): Promise<Review> {
    const response = await apiClient.put<Review>(`/reviews/${id}/approve`);
    return (response.data as unknown as { data?: Review })?.data ?? response.data;
  },

  async rejectReview(id: string): Promise<Review> {
    const response = await apiClient.put<Review>(`/reviews/${id}/reject`);
    return (response.data as unknown as { data?: Review })?.data ?? response.data;
  },

  async createReply(reviewId: string, content: string): Promise<ReviewReply> {
    const response = await apiClient.post<ReviewReply>(`/reviews/${reviewId}/replies`, { content });
    return (response.data as unknown as { data?: ReviewReply })?.data ?? response.data;
  },

  async deleteReply(replyId: string): Promise<void> {
    await apiClient.delete(`/reviews/replies/${replyId}`);
  },

  async deleteReviewAdmin(id: string): Promise<void> {
    await apiClient.delete(`/reviews/${id}`);
  },
};
