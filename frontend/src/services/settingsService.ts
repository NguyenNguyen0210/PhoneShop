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
  host?: string;
  port?: number | string;
  secure?: boolean | string;
  user?: string;
  pass?: string;
  from?: string;
}

export const settingsService = {
  async getAdminSettings(): Promise<GroupedSettings> {
    const res = await apiClient.get<any>('/admin/settings');
    const data = res.data?.data ?? res.data;
    return data;
  },

  async updateAdminSettings(settings: SettingItem[]): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.patch<any>('/admin/settings', { settings });
    return res.data?.data ?? res.data;
  },

  async testVietQr(payload: TestVietQrPayload): Promise<{ success: boolean; qrUrl: string }> {
    const res = await apiClient.post<any>('/admin/settings/test/vietqr', payload);
    return res.data?.data ?? res.data;
  },

  async testStorage(payload: TestStoragePayload): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<any>('/admin/settings/test/storage', payload);
    return res.data?.data ?? res.data;
  },

  async testEmail(payload: TestEmailPayload): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<any>('/admin/settings/test/email', payload);
    return res.data?.data ?? res.data;
  },

  async getPublicSettings(): Promise<PublicSettings> {
    const res = await apiClient.get<any>('/settings/public');
    return res.data?.data ?? res.data;
  },
};

export default settingsService;
