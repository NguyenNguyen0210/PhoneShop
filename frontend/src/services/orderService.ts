import { apiClient } from './apiClient';
import type { Order, PaymentMethod, InstallmentFormData } from '../types';

export interface CheckoutPayload {
  customerName: string;
  shippingPhone: string;
  shippingAddress: string;
  notes?: string;
  paymentMethod?: PaymentMethod | string;
  installmentData?: InstallmentFormData | any;
  voucherCode?: string;
  addressId?: string;
}

export const orderService = {
  async checkout(payload: CheckoutPayload): Promise<Order> {
    let addressId = payload.addressId;

    if (!addressId) {
      try {
        const addressRes = await apiClient.post('/addresses', {
          recipientName: payload.customerName,
          phone: payload.shippingPhone,
          addressLine1: payload.shippingAddress,
          city: 'Hồ Chí Minh',
          country: 'Vietnam',
          isDefault: true,
        });
        const createdAddress = addressRes.data?.data ?? addressRes.data;
        addressId = createdAddress.id;
      } catch (err) {
        console.warn('Could not auto-create address:', err);
      }
    }

    const orderRes = await apiClient.post('/orders/checkout', {
      addressId: addressId || '00000000-0000-0000-0000-000000000000',
      voucherCode: payload.voucherCode || undefined,
      customerNote: payload.notes || undefined,
      paymentMethod: payload.paymentMethod,
      installmentData: payload.installmentData,
    });

    const orderData: Order = orderRes.data?.data ?? orderRes.data;

    // Attach chosen payment method if provided (backend handles INSTALLMENT in order transaction)
    if (payload.paymentMethod && payload.paymentMethod !== 'INSTALLMENT' && orderData?.id) {
      try {
        await apiClient.post('/payments', {
          orderId: orderData.id,
          amount: orderData.totalAmount,
          method: payload.paymentMethod,
        });
      } catch (paymentErr) {
        console.warn('Payment record creation deferred or handled elsewhere:', paymentErr);
      }
    }

    return orderData;
  },

  async getMyOrders(): Promise<Order[]> {
    const response = await apiClient.get('/orders/my');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getOrderById(id: string): Promise<Order> {
    try {
      const response = await apiClient.get(`/orders/my/${id}`);
      return response.data?.data ?? response.data;
    } catch {
      // Fallback to admin/staff findOne if customer lookup fails or for staff
      const response = await apiClient.get(`/orders/${id}`);
      return response.data?.data ?? response.data;
    }
  },

  async getAllOrdersAdmin(): Promise<Order[]> {
    const response = await apiClient.get('/orders');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async updateOrderStatus(
    id: string,
    action: 'confirm' | 'process' | 'ship' | 'deliver' | 'complete' | 'cancel',
    reason?: string
  ): Promise<Order> {
    const body = action === 'cancel' && reason ? { reason } : {};
    const response = await apiClient.put(`/orders/${id}/${action}`, body);
    return response.data?.data ?? response.data;
  },
};
