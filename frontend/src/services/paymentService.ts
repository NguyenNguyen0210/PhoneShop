import { apiClient } from './apiClient';
import type { Payment, PaymentTransaction } from '../types';

export type BackendPaymentMethod =
  | 'COD'
  | 'BANK_TRANSFER'
  | 'VNPAY'
  | 'MOMO'
  | 'ZALOPAY'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'INSTALLMENT';

/** Map the storefront payment label to the backend PaymentMethod enum. */
export const toBackendPaymentMethod = (method: string): BackendPaymentMethod => {
  if (method === 'VIETQR') return 'BANK_TRANSFER';
  return method as BackendPaymentMethod;
};

export interface CreatePaymentDto {
  orderId: string;
  method: BackendPaymentMethod;
}

export interface VietQrData {
  paymentId?: string;
  orderId?: string;
  qrImageUrl: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  transferContent: string;
}

const mapVietQrResponse = (data: any): VietQrData => ({
  paymentId: data?.paymentId,
  orderId: data?.orderId,
  qrImageUrl: data?.qrImageUrl ?? data?.qrUrl ?? '',
  bankName: data?.bankName ?? data?.bankId ?? '',
  accountNumber: data?.accountNumber ?? data?.accountNo ?? '',
  accountName: data?.accountName ?? '',
  amount: Number(data?.amount ?? 0),
  transferContent: data?.transferContent ?? data?.orderNumber ?? '',
});

export const paymentService = {
  async createPayment(dto: CreatePaymentDto) {
    const response = await apiClient.post('/payments', dto);
    return response.data?.data ?? response.data;
  },

  /** Generate a VietQR dynamic code for an existing order (memo = orderNumber). */
  async createVietQr(orderId: string): Promise<VietQrData> {
    const res = await apiClient.post(`/payments/vietqr/${orderId}`);
    const data = res.data?.data ?? res.data;
    return mapVietQrResponse(data);
  },

  async createVnpayUrl(data: {
    orderId: string;
    bankCode?: string;
    ipAddr?: string;
  }): Promise<{ paymentUrl: string }> {
    const response = await apiClient.post('/payments/vnpay/create-url', data);
    return response.data?.data ?? response.data;
  },

  async verifyVnpayReturn(params: Record<string, string>): Promise<{
    success: boolean;
    isValid: boolean;
    orderNumber?: string;
    amount?: number;
    responseCode?: string;
    transactionNo?: string;
    message?: string;
  }> {
    const response = await apiClient.get('/payments/vnpay/return', { params });
    return response.data?.data ?? response.data;
  },

  // Admin methods
  async getAllPaymentsAdmin(): Promise<Payment[]> {
    const response = await apiClient.get('/payments');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getTransactionHistoryAdmin(): Promise<PaymentTransaction[]> {
    const response = await apiClient.get('/payments/transactions');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async confirmPaymentAdmin(paymentId: string, providerRef: string): Promise<Payment> {
    const response = await apiClient.put(`/payments/${paymentId}/confirm`, { providerRef });
    return response.data?.data ?? response.data;
  },

  async failPaymentAdmin(paymentId: string): Promise<Payment> {
    const response = await apiClient.put(`/payments/${paymentId}/fail`);
    return response.data?.data ?? response.data;
  },
};
