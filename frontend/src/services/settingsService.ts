import { apiClient } from './apiClient';

export interface GroupedSettings {
  payment: Record<string, string>;
  storage: Record<string, string>;
  email: Record<string, string>;
  general: Record<string, string>;
}

export interface SettingItem {
  key: string;
  value: string;
  group?: string;
  isSecret?: boolean;
  description?: string;
}

export interface PublicSettings {
  STORE_NAME: string;
  STORE_HOTLINE: string;
  STORE_EMAIL: string;
  STORE_ADDRESS: string;
  MAINTENANCE_MODE: string;
  PAYMENT_VNPAY_ENABLED: string;
  PAYMENT_VIETQR_ENABLED: string;
}

export interface TestVietQrPayload {
  bankId?: string;
  accountNo?: string;
  accountName?: string;
}

export interface TestStoragePayload {
  bucket?: string;
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface TestEmailPayload {
  toEmail?: string;
}

export const settingsService = {
  async getAdminSettings(): Promise<GroupedSettings> {
    const res = await apiClient.get<GroupedSettings>('/admin/settings');
    return res.data;
  },

  async updateAdminSettings(settings: SettingItem[]): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.patch<{ success: boolean; message: string }>('/admin/settings', { settings });
    return res.data;
  },

  async testVietQr(payload: TestVietQrPayload): Promise<{ success: boolean; qrUrl: string }> {
    const res = await apiClient.post<{ success: boolean; qrUrl: string }>('/admin/settings/test/vietqr', payload);
    return res.data;
  },

  async testStorage(payload: TestStoragePayload): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>('/admin/settings/test/storage', payload);
    return res.data;
  },

  async testEmail(payload: TestEmailPayload): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>('/admin/settings/test/email', payload);
    return res.data;
  },

  async getPublicSettings(): Promise<PublicSettings> {
    const res = await apiClient.get<PublicSettings>('/settings/public');
    return res.data;
  },
};

export default settingsService;
