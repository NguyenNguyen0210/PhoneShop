import { apiClient } from './apiClient';
import type { WishlistResponse, WishlistItem } from '../types';

export const wishlistService = {
  async getWishlist(): Promise<WishlistResponse> {
    const response = await apiClient.get('/wishlist');
    return response.data?.data ?? response.data;
  },

  async addToWishlist(productId: string): Promise<WishlistItem> {
    const response = await apiClient.post('/wishlist/items', { productId });
    return response.data?.data ?? response.data;
  },

  async removeFromWishlist(productId: string): Promise<void> {
    await apiClient.delete(`/wishlist/items/${productId}`);
  },

  async clearWishlist(): Promise<{ success: boolean }> {
    const response = await apiClient.delete('/wishlist/clear');
    return response.data?.data ?? response.data;
  },

  async checkProduct(productId: string): Promise<{ inWishlist: boolean }> {
    const response = await apiClient.get(`/wishlist/check/${productId}`);
    return response.data?.data ?? response.data;
  },

  async moveToCart(productId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/wishlist/items/${productId}/move-to-cart`);
    return response.data?.data ?? response.data;
  },
};
