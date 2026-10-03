import { apiClient } from './apiClient';
import type { Order, PaymentMethod, InstallmentFormData, ShippingMethod } from '../types';
import { toBackendPaymentMethod } from './paymentService';

const VALID_PAYMENT_METHODS: Array<PaymentMethod | string> = [
  'COD',
  'VIETQR',
  'VNPAY',
  'INSTALLMENT',
];

export interface CheckoutPayload {
  customerName: string;
  shippingPhone: string;
  shippingAddress: string;
  notes?: string;
  paymentMethod?: PaymentMethod | string;
  installmentData?: InstallmentFormData | any;
  voucherCode?: string;
  addressId?: string;
  selectedItemIds?: string[];
  shippingMethod?: ShippingMethod;
}

export interface PaginatedOrders {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const orderService = {
  async checkout(payload: CheckoutPayload): Promise<Order> {
    if (payload.paymentMethod && !VALID_PAYMENT_METHODS.includes(payload.paymentMethod)) {
      throw new Error(`Phương thức thanh toán không hợp lệ: ${payload.paymentMethod}`);
    }

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

    if (!addressId) {
      throw new Error('Vui lòng chọn địa chỉ giao hàng trước khi đặt hàng.');
    }

    const backendPaymentMethod = payload.paymentMethod
      ? toBackendPaymentMethod(payload.paymentMethod)
      : undefined;

    const orderRes = await apiClient.post('/orders/checkout', {
      addressId,
      voucherCode: payload.voucherCode || undefined,
      customerNote: payload.notes || undefined,
      paymentMethod: backendPaymentMethod,
      installmentData: payload.installmentData,
      selectedItemIds: payload.selectedItemIds,
      shippingMethod: payload.shippingMethod,
    });

    const orderData: Order = orderRes.data?.data ?? orderRes.data;

    // Attach chosen payment method if provided (backend handles INSTALLMENT in order transaction)
    if (backendPaymentMethod && backendPaymentMethod !== 'INSTALLMENT' && orderData?.id) {
      try {
        await apiClient.post('/payments', {
          orderId: orderData.id,
          method: backendPaymentMethod,
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

  async getAllOrdersAdmin(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedOrders> {
    const response = await apiClient.get('/orders', { params });
    const resData = response.data?.data ?? response.data;
    if (Array.isArray(resData)) {
      return Object.assign([...resData], {
        data: resData,
        total: resData.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? (resData.length || 10),
        totalPages: 1,
      }) as unknown as PaginatedOrders;
    }
    const data = Array.isArray(resData?.data)
      ? resData.data
      : Array.isArray(resData?.items)
      ? resData.items
      : [];
    const limit = resData?.limit ?? params?.limit ?? 10;
    const total = resData?.total ?? data.length;
    return Object.assign([...data], {
      data,
      total,
      page: resData?.page ?? params?.page ?? 1,
      limit,
      totalPages: resData?.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 1),
    }) as unknown as PaginatedOrders;
  },

  async cancelMyOrder(id: string, reason: string): Promise<Order> {
    const response = await apiClient.put(`/orders/my/${id}/cancel`, { reason });
    return response.data?.data ?? response.data;
  },

  async updateOrderStatus(
    id: string,
    action: 'confirm' | 'process' | 'pack' | 'ship' | 'deliver' | 'complete' | 'cancel',
    payload?:
      | {
          reason?: string;
          providerName?: string;
          trackingNumber?: string;
          estimatedDeliveryDate?: string;
        }
      | string
  ): Promise<Order> {
    const body = typeof payload === 'string' ? { reason: payload } : payload || {};
    const response = await apiClient.put(`/orders/${id}/${action}`, body);
    return response.data?.data ?? response.data;
  },

  async updateOrderShipping(
    orderId: string,
    payload: { providerName?: string; trackingNumber?: string; estimatedDeliveryDate?: string }
  ): Promise<any> {
    const response = await apiClient.patch(`/shipping/order/${orderId}`, payload);
    return response.data?.data ?? response.data;
  },
};
