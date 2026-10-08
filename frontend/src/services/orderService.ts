import { apiClient } from './apiClient';
import type { Order, PaymentMethod, InstallmentFormData, ShippingMethod } from '../types';
import { toBackendPaymentMethod, fromBackendPaymentMethod } from './paymentService';
import { cartService } from './cartService';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';

/** Normalize a raw backend order into the storefront Order shape.
 * Backend stores VietQR as BANK_TRANSFER and (for older rows) may return
 * discountAmount/customerNote/payments[] instead of the derived fields —
 * always derive them here so the UI never falls back to COD by accident. */
const normalizeOrder = (raw: any): Order => {
  if (!raw || typeof raw !== 'object') return raw;
  const payments = Array.isArray(raw.payments) ? raw.payments : [];
  const primaryPayment = payments[0] ?? null;
  const rawMethod: string | undefined =
    raw.paymentMethod ?? primaryPayment?.method ?? undefined;
  const paymentMethod = fromBackendPaymentMethod(rawMethod) as PaymentMethod;
  const paymentStatus = raw.paymentStatus ?? primaryPayment?.status ?? 'PENDING';
  const address = raw.address ?? null;
  const customerName =
    raw.customerName || address?.recipientName || raw.recipientName || '';
  const shippingPhone = raw.shippingPhone || address?.phone || '';
  const shippingAddress =
    raw.shippingAddress ||
    (address
      ? [address.addressLine1, address.ward, address.district, address.city]
          .filter(Boolean)
          .join(', ')
      : '');
  const discount =
    raw.discount ??
    (raw.discountAmount !== undefined ? Number(raw.discountAmount) : 0);
  const notes = raw.notes ?? raw.customerNote ?? undefined;
  return {
    ...raw,
    paymentMethod,
    paymentStatus,
    customerName,
    shippingPhone,
    shippingAddress,
    discount,
    notes,
  } as Order;
};

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
  /** Manual-entry city — used only when auto-creating the address (no addressId). Never defaulted. */
  city?: string;
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
      const manualCity = (payload.city || '').trim();
      if (!manualCity) {
        throw new Error('Vui lòng nhập tỉnh/thành phố nhận hàng.');
      }
      try {
        const addressRes = await apiClient.post('/addresses', {
          recipientName: payload.customerName,
          phone: payload.shippingPhone,
          addressLine1: payload.shippingAddress,
          city: manualCity,
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

    // Ensure cart items are synchronized with backend database cart
    try {
      const token = localStorage.getItem('phoneshop_access_token');
      if (typeof localStorage !== 'undefined' && token) {
        const storeItems = useCartStore.getState().items;
        const backendCart = await cartService.getCart();
        const existingVariantIds = new Set((backendCart?.items || []).map((i: any) => i.variantId));
        for (const item of storeItems) {
          if (!existingVariantIds.has(item.variantId)) {
            await cartService.addToCart(item.variantId, item.quantity).catch(() => {});
          }
        }
      }
    } catch {
      // Continue to checkout if pre-sync throws
    }

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

    // Backend now creates the PENDING payment row atomically inside checkout
    // for every method (COD / BANK_TRANSFER / VNPAY / INSTALLMENT). The extra
    // POST is kept as a dedup-safe backstop for orders created before that
    // fix — PaymentsService.create reuses the pending row instead of stacking.
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

    // Keep the storefront label (VIETQR) on the returned object so callers
    // never see the backend BANK_TRANSFER enum.
    if (payload.paymentMethod && orderData) {
      (orderData as any).paymentMethod = payload.paymentMethod;
    }

    return normalizeOrder({ ...orderData, paymentMethod: payload.paymentMethod ?? (orderData as any).paymentMethod });
  },

  async getMyOrders(): Promise<Order[]> {
    const response = await apiClient.get('/orders/my');
    const data = response.data?.data ?? response.data;
    const list: any[] = Array.isArray(data) ? data : data?.items ?? [];
    return list.map(normalizeOrder);
  },

  async getOrderById(id: string): Promise<Order> {
    const isStaffOrAdmin = useAuthStore.getState().isStaffOrAdmin?.() || false;
    if (isStaffOrAdmin) {
      const response = await apiClient.get(`/orders/${id}`);
      return normalizeOrder(response.data?.data ?? response.data);
    }

    try {
      const response = await apiClient.get(`/orders/my/${id}`);
      return normalizeOrder(response.data?.data ?? response.data);
    } catch {
      // Fallback to admin/staff findOne if customer lookup fails or token allows
      const response = await apiClient.get(`/orders/${id}`);
      return normalizeOrder(response.data?.data ?? response.data);
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
