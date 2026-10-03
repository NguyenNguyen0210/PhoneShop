import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from '../paymentService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('paymentService - Admin methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllPaymentsAdmin calls GET /payments and returns array', async () => {
    const mockPayments = [
      { id: 'pay-1', orderId: 'ord-1', method: 'VIETQR', status: 'PENDING', amount: 15000000 },
      { id: 'pay-2', orderId: 'ord-2', method: 'VNPAY', status: 'PAID', amount: 20000000 },
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockPayments } });

    const result = await paymentService.getAllPaymentsAdmin();
    expect(apiClient.get).toHaveBeenCalledWith('/payments');
    expect(result).toEqual(mockPayments);
  });

  it('getTransactionHistoryAdmin calls GET /payments/transactions', async () => {
    const mockTransactions = [
      { id: 'txn-1', transactionCode: 'TXN-1001', type: 'PAYMENT', status: 'SUCCESS', amount: 15000000 },
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockTransactions } });

    const result = await paymentService.getTransactionHistoryAdmin();
    expect(apiClient.get).toHaveBeenCalledWith('/payments/transactions');
    expect(result).toEqual(mockTransactions);
  });

  it('confirmPaymentAdmin calls PUT /payments/:id/confirm with providerRef', async () => {
    const mockResponse = { id: 'pay-1', status: 'PAID' };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: mockResponse } });

    const result = await paymentService.confirmPaymentAdmin('pay-1', 'FT261004123456');
    expect(apiClient.put).toHaveBeenCalledWith('/payments/pay-1/confirm', { providerRef: 'FT261004123456' });
    expect(result).toEqual(mockResponse);
  });

  it('failPaymentAdmin calls PUT /payments/:id/fail', async () => {
    const mockResponse = { id: 'pay-1', status: 'FAILED' };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: mockResponse } });

    const result = await paymentService.failPaymentAdmin('pay-1');
    expect(apiClient.put).toHaveBeenCalledWith('/payments/pay-1/fail');
    expect(result).toEqual(mockResponse);
  });
});
