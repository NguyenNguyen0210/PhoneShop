import { apiClient } from './apiClient';
import type {
  ManagedUser,
  UserFilterParams,
  UserListResponse,
  CreateUserPayload,
  UpdateUserPayload,
  UserAuditLog,
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
    const res = await apiClient.get<UserListResponse>('/users', { params });
    return res.data;
  },

  getUserById: async (id: string) => {
    const res = await apiClient.get<ManagedUser>(`/users/${id}`);
    return res.data;
  },

  createUser: async (payload: CreateUserPayload) => {
    const res = await apiClient.post<ManagedUser>('/users', payload);
    return res.data;
  },

  updateUser: async (id: string, payload: UpdateUserPayload) => {
    const res = await apiClient.patch<ManagedUser>(`/users/${id}`, payload);
    return res.data;
  },

  changeRole: async (id: string, roles: string[]) => {
    const res = await apiClient.patch<ManagedUser>(`/users/${id}`, { roles });
    return res.data;
  },

  resetPassword: async (id: string, password: string) => {
    const res = await apiClient.patch<ManagedUser>(`/users/${id}`, { password });
    return res.data;
  },

  activateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/activate`);
    return res.data;
  },

  deactivateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/deactivate`);
    return res.data;
  },

  banUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/ban`);
    return res.data;
  },

  getUserAuditLogs: async (userId: string) => {
    const res = await apiClient.get<{
      data: UserAuditLog[];
      total: number;
      page: number;
      limit: number;
    }>('/audit-logs', { params: { userId, limit: 50 } });
    return res.data;
  },
};
