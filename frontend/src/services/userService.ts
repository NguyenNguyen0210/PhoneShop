import { apiClient } from './apiClient';
import type {
  UserFilterParams,
  CreateUserPayload,
  UpdateUserPayload,
} from '../types/userManagement';

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

export const userService = {
  changePassword: async (data: ChangePasswordPayload): Promise<ChangePasswordResponse> => {
    const response = await apiClient.post('/users/change-password', data);
    return response.data?.data ?? response.data;
  },

  getUsers: async (params?: UserFilterParams) => {
    const res = await apiClient.get('/users', { params });
    if (res.data?.data && typeof res.data.data === 'object' && 'total' in res.data.data) {
      return res.data.data;
    }
    if (res.data && typeof res.data === 'object' && 'total' in res.data) {
      return res.data;
    }
    return res.data?.data ?? res.data;
  },

  getUserById: async (id: string) => {
    const res = await apiClient.get(`/users/${id}`);
    return res.data?.data ?? res.data;
  },

  createUser: async (payload: CreateUserPayload) => {
    const res = await apiClient.post('/users', payload);
    return res.data?.data ?? res.data;
  },

  updateUser: async (id: string, payload: UpdateUserPayload) => {
    const res = await apiClient.patch(`/users/${id}`, payload);
    return res.data?.data ?? res.data;
  },

  changeRole: async (id: string, roles: string[]) => {
    const res = await apiClient.patch(`/users/${id}`, { roles });
    return res.data?.data ?? res.data;
  },

  resetPassword: async (id: string, password: string) => {
    const res = await apiClient.patch(`/users/${id}`, { password });
    return res.data?.data ?? res.data;
  },

  activateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/activate`);
    return res.data?.data ?? res.data;
  },

  deactivateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/deactivate`);
    return res.data?.data ?? res.data;
  },

  banUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/ban`);
    return res.data?.data ?? res.data;
  },

  getUserAuditLogs: async (userId: string) => {
    const res = await apiClient.get('/audit-logs', { params: { userId, limit: 50 } });
    if (res.data?.data && typeof res.data.data === 'object' && 'total' in res.data.data) {
      return res.data.data;
    }
    if (res.data && typeof res.data === 'object' && 'total' in res.data) {
      return res.data;
    }
    return res.data?.data ?? res.data;
  },
};
