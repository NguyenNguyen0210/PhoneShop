import { apiClient } from './apiClient';
import type { CartItem } from '../types';

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount?: number;
}

export const cartService = {
  async getCart(): Promise<CartResponse> {
    const response = await apiClient.get('/cart');
    return response.data?.data ?? response.data;
  },

  async addToCart(variantId: string, quantity = 1): Promise<CartResponse> {
    const response = await apiClient.post('/cart/items', { variantId, quantity });
    return response.data?.data ?? response.data;
  },

  async updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
    const response = await apiClient.patch(`/cart/items/${itemId}`, { quantity });
    return response.data?.data ?? response.data;
  },

  async removeFromCart(itemId: string): Promise<CartResponse> {
    const response = await apiClient.delete(`/cart/items/${itemId}`);
    return response.data?.data ?? response.data;
  },

  async clearCart(): Promise<void> {
    await apiClient.delete('/cart/clear');
  },

  async removeBulk(itemIds: string[]): Promise<void> {
    await apiClient.delete('/cart/items/bulk', { data: { itemIds } });
  },
};
