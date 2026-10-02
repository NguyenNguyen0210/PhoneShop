import { apiClient } from './apiClient';
import type { User, AuthResponse } from '../types';

export const authService = {
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data?.data ?? response.data;
  },

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/register', data);
    return response.data?.data ?? response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('mobilecommerce_access_token');
      localStorage.removeItem('mobilecommerce_refresh_token');
      localStorage.removeItem('mobilecommerce_user');
    }
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get('/users/profile');
    return response.data?.data ?? response.data;
  },
};
