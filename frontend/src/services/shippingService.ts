import { apiClient } from './apiClient';
import type { Shipping, ShippingStatus } from '../types';

export interface AssignShippingPayload {
  orderId: string;
  providerName: string;
  trackingNumber?: string;
  shippingFee?: number;
  estimatedDeliveryDate?: string;
}

export interface UpdateShippingStatusPayload {
  status: ShippingStatus;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
}

export interface UpdateShippingPayload {
  providerName?: string;
  trackingNumber?: string;
  shippingFee?: number;
  estimatedDeliveryDate?: string;
}

export const CARRIER_PRESETS = [
  { key: 'GHN', name: 'Giao Hàng Nhanh (GHN)' },
  { key: 'VIETTEL_POST', name: 'Viettel Post' },
  { key: 'GHTK', name: 'Giao Hàng Tiết Kiệm (GHTK)' },
  { key: 'JT_EXPRESS', name: 'J&T Express' },
  { key: 'VNPOST', name: 'Bưu Điện Việt Nam (VNPost)' },
  { key: 'HAPPY_EXPRESS', name: 'Hỏa Tốc Happy Express' },
];

export const shippingService = {
  async assignShipping(payload: AssignShippingPayload): Promise<Shipping> {
    const res = await apiClient.post('/shipping/assign', payload);
    return res.data?.data ?? res.data;
  },

  async updateShippingStatus(
    id: string,
    payload: UpdateShippingStatusPayload,
  ): Promise<Shipping> {
    const res = await apiClient.patch(`/shipping/${id}/status`, payload);
    return res.data?.data ?? res.data;
  },

  async updateShipping(
    id: string,
    payload: UpdateShippingPayload,
  ): Promise<Shipping> {
    const res = await apiClient.patch(`/shipping/${id}`, payload);
    return res.data?.data ?? res.data;
  },

  async getShippingByOrderId(orderId: string): Promise<Shipping | null> {
    try {
      const res = await apiClient.get(`/shipping/order/${orderId}`);
      return res.data?.data ?? res.data;
    } catch {
      return null;
    }
  },

  getCarrierTrackingUrl(providerName?: string, trackingNumber?: string): string | null {
    if (!trackingNumber) return null;
    const name = (providerName || '').toLowerCase();
    if (name.includes('ghn') || name.includes('giao hàng nhanh')) {
      return `https://donhang.ghn.vn/?order_code=${encodeURIComponent(trackingNumber)}`;
    }
    if (name.includes('viettel')) {
      return `https://viettelpost.vn/tra-cuu-hanh-trinh-don?code=${encodeURIComponent(trackingNumber)}`;
    }
    if (name.includes('ghtk') || name.includes('tiết kiệm')) {
      return `https://i.ghtk.vn/${encodeURIComponent(trackingNumber)}`;
    }
    if (name.includes('j&t') || name.includes('jt')) {
      return `https://jtexpress.vn/vi/tracking?billcode=${encodeURIComponent(trackingNumber)}`;
    }
    if (name.includes('vnpost') || name.includes('bưu điện')) {
      return `https://www.vnpost.vn/vi-vn/dinh-vi/buu-pham?key=${encodeURIComponent(trackingNumber)}`;
    }
    return null;
  },
};
