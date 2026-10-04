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
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/register', {
      ...data,
      email: data.email.trim().toLowerCase(),
    });
    return response.data?.data ?? response.data;
  },

  async getGoogleAuthUrl(): Promise<{ url: string; state: string }> {
    const response = await apiClient.get('/auth/google/url');
    const data = response.data?.data ?? response.data;
    return { url: data.url, state: data.state };
  },

  async googleLogin(code: string, state?: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/google/callback', { code, state });
    return response.data?.data ?? response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('phoneshop_access_token');
      localStorage.removeItem('phoneshop_refresh_token');
      localStorage.removeItem('phoneshop_user');
    }
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get('/users/profile');
    const data = response.data?.data ?? response.data;
    if (data && data.avatarUrl && !data.avatar) {
      data.avatar = data.avatarUrl;
    }
    return data;
  },

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<User> {
    try {
      const response = await apiClient.put('/users/profile', data);
      return response.data?.data ?? response.data;
    } catch {
      const response = await apiClient.patch('/users/profile', data);
      return response.data?.data ?? response.data;
    }
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data?.data ?? response.data;
  },

  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const response = await apiClient.get('/auth/verify-reset-token', { params: { token } });
    return response.data?.data ?? response.data;
  },

  async resetPassword(data: { token: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data?.data ?? response.data;
  },
};
