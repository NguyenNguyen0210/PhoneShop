import { apiClient } from './apiClient';

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

export const userService = {
  async changePassword(data: ChangePasswordPayload): Promise<ChangePasswordResponse> {
    const response = await apiClient.post('/users/change-password', data);
    return response.data?.data ?? response.data;
  },
};
