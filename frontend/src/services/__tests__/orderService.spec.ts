// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderService, type CheckoutPayload } from '../orderService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('orderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkout', () => {
    it('should pass shippingMethod and addressId to /orders/checkout when provided', async () => {
      vi.mocked(apiClient.post)
        .mockResolvedValueOnce({
          data: {
            data: {
              id: 'ord-123',
              orderNumber: 'ORD-123',
              totalAmount: 1500000,
              status: 'PENDING',
            },
          },
        })
        .mockResolvedValueOnce({
          data: { data: { id: 'pmt-1' } },
        });

      const payload: CheckoutPayload = {
        customerName: 'Le Van B',
        shippingPhone: '0987654321',
        shippingAddress: '456 Le Loi, Quan 1, TP.HCM',
        notes: 'Giao sau 18h',
        paymentMethod: 'COD',
        shippingMethod: 'EXPRESS_2H',
        addressId: 'addr-existing-1',
        voucherCode: 'SALE10',
        selectedItemIds: ['item-1', 'item-2'],
      };

      const result = await orderService.checkout(payload);

      // Should NOT call /addresses to auto-create when addressId is given
      expect(apiClient.post).toHaveBeenNthCalledWith(1, '/orders/checkout', {
        addressId: 'addr-existing-1',
        voucherCode: 'SALE10',
        customerNote: 'Giao sau 18h',
        paymentMethod: 'COD',
        installmentData: undefined,
        selectedItemIds: ['item-1', 'item-2'],
        shippingMethod: 'EXPRESS_2H',
      });

      // Should record payment for non-installment paymentMethod
      expect(apiClient.post).toHaveBeenNthCalledWith(2, '/payments', {
        orderId: 'ord-123',
        method: 'COD',
      });

      expect(result.id).toBe('ord-123');
    });

    it('should auto-create address if addressId is not provided', async () => {
      vi.mocked(apiClient.post)
        .mockResolvedValueOnce({
          data: { data: { id: 'addr-new-1' } },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              id: 'ord-456',
              orderNumber: 'ORD-456',
              totalAmount: 500000,
              status: 'PENDING',
            },
          },
        });

      const payload: CheckoutPayload = {
        customerName: 'Nguyen Van A',
        shippingPhone: '0901234567',
        shippingAddress: '789 Dien Bien Phu',
        city: 'Hà Nội',
        shippingMethod: 'ECONOMY',
      };

      const result = await orderService.checkout(payload);

      expect(apiClient.post).toHaveBeenNthCalledWith(1, '/addresses', {
        recipientName: 'Nguyen Van A',
        phone: '0901234567',
        addressLine1: '789 Dien Bien Phu',
        city: 'Hà Nội',
        country: 'Vietnam',
        isDefault: true,
      });

      expect(apiClient.post).toHaveBeenNthCalledWith(2, '/orders/checkout', {
        addressId: 'addr-new-1',
        voucherCode: undefined,
        customerNote: undefined,
        paymentMethod: undefined,
        installmentData: undefined,
        selectedItemIds: undefined,
        shippingMethod: 'ECONOMY',
      });

      expect(result.id).toBe('ord-456');
    });

    it('should refuse to fabricate a city when none is provided', async () => {
      const payload: CheckoutPayload = {
        customerName: 'Nguyen Van A',
        shippingPhone: '0901234567',
        shippingAddress: '789 Dien Bien Phu',
        shippingMethod: 'ECONOMY',
      };

      await expect(orderService.checkout(payload)).rejects.toThrow(
        'Vui lòng nhập tỉnh/thành phố nhận hàng.',
      );
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });
});
