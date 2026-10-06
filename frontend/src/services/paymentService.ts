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

/** Map the backend PaymentMethod enum back to the storefront label.
 * Backend stores VietQR as BANK_TRANSFER — the UI only knows VIETQR. */
export const fromBackendPaymentMethod = (method?: string | null): 'COD' | 'VIETQR' | 'VNPAY' | 'INSTALLMENT' => {
  if (!method) return 'COD';
  if (method === 'BANK_TRANSFER') return 'VIETQR';
  if (method === 'VNPAY' || method === 'COD' || method === 'INSTALLMENT') return method;
  return 'COD';
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
  // Backend returns a paginated { data: [...], total, ... } payload (wrapped
  // once more by the global ResponseInterceptor) — unwrap both levels.
  // Previously this only read `.items`, so the list was always [] and the
  // staff payments page showed all-zero stats with an empty table.
  async getAllPaymentsAdmin(): Promise<Payment[]> {
    const response = await apiClient.get('/payments');
    const body = response.data?.data ?? response.data;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    return body?.items ?? [];
  },

  async getTransactionHistoryAdmin(): Promise<PaymentTransaction[]> {
    const response = await apiClient.get('/payments/transactions');
    const body = response.data?.data ?? response.data;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    return body?.items ?? [];
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
