import { apiClient } from './apiClient';
import type {
  NotificationFilterParams,
  NotificationItem,
  NotificationPaginationResponse,
} from '../types';

export const notificationService = {
  async getMyNotifications(
    params?: NotificationFilterParams
  ): Promise<NotificationPaginationResponse> {
    const response = await apiClient.get('/notifications/my', { params });
    return response.data?.data ?? response.data;
  },

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    const response = await apiClient.get('/notifications/my/unread-count');
    return response.data?.data ?? response.data;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const response = await apiClient.put(`/notifications/my/${id}/read`);
    return response.data?.data ?? response.data;
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    const response = await apiClient.put('/notifications/my/read-all');
    return response.data?.data ?? response.data;
  },

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/notifications/my/${id}`);
    return response.data?.data ?? response.data;
  },
};
