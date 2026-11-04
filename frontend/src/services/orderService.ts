import { apiClient } from './apiClient';
import type { Order, PaymentMethod, ShippingMethod } from '../types';
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
  // Prefer a settled payment when an order contains historical failed/pending attempts.
  const paymentRank: Record<string, number> = {
    REFUNDED: 5,
    PARTIALLY_REFUNDED: 4,
    PAID: 3,
    PENDING: 2,
    FAILED: 1,
  };
  const primaryPayment = [...payments].sort(
    (a, b) => (paymentRank[b?.status] ?? 0) - (paymentRank[a?.status] ?? 0),
  )[0] ?? null;
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
];

export interface CheckoutPayload {
  customerName: string;
  shippingPhone: string;
  shippingAddress: string;
  /** Manual-entry city — used only when auto-creating the address (no addressId). Never defaulted. */
  city?: string;
  notes?: string;
  paymentMethod?: PaymentMethod | string;
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
    if (payload.selectedItemIds && payload.selectedItemIds.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một sản phẩm để đặt hàng.');
    }
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
      if (typeof localStorage !== 'undefined' && localStorage.getItem('phoneshop_access_token')) {
        // Wait for previous add/update/delete requests to settle before taking
        // the cart snapshot; a late add can otherwise double the order quantity.
        await useCartStore.getState().waitForCartWrites();
        const storeItems = useCartStore.getState().items;
        const selected = payload.selectedItemIds ? new Set(payload.selectedItemIds) : null;
        const itemsToSync = selected
          ? storeItems.filter((item) => selected.has(item.id) || selected.has(item.variantId))
          : storeItems;
        if (selected && itemsToSync.length !== selected.size) {
          throw new Error('Giỏ hàng đã thay đổi. Vui lòng kiểm tra lại sản phẩm trước khi đặt hàng.');
        }
        const backendCart = await cartService.getCart();
        const backendItemsByVariant = new Map(
          (backendCart?.items || []).map((i: any) => [i.variantId, i] as const),
        );
        // Only purchased lines need syncing. An unrelated stale or sold-out
        // item must not block checkout for the products the buyer selected.
        for (const item of itemsToSync) {
          const existing = backendItemsByVariant.get(item.variantId);
          if (!existing) {
            await cartService.addToCart(item.variantId, item.quantity);
          } else if (existing.quantity !== item.quantity) {
            // Cart PATCH sets an absolute quantity. Checkout must use the
            // quantities the buyer actually reviewed on the local page.
            await cartService.updateCartItem(existing.id, item.quantity);
          }
        }
      }
    } catch (error) {
      // A failed cart sync must stop checkout, otherwise selectedItemIds can
      // point to missing rows and the server may charge for the wrong cart.
      throw error;
    }

    const orderRes = await apiClient.post('/orders/checkout', {
      addressId,
      voucherCode: payload.voucherCode || undefined,
      customerNote: payload.notes || undefined,
      paymentMethod: backendPaymentMethod,
      selectedItemIds: payload.selectedItemIds,
      shippingMethod: payload.shippingMethod,
    });

    const orderData: Order = orderRes.data?.data ?? orderRes.data;

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

  async refundOrder(
    id: string,
    payload: { reason: string; providerReference: string; amount: number }
  ): Promise<Order> {
    const response = await apiClient.post(`/orders/${id}/refund`, payload);
    const result = response.data?.data ?? response.data;
    return normalizeOrder(result?.order ?? result);
  },
};
