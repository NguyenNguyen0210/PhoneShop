// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline';
import type { Order } from '../../../../types';

describe('OrderTrackingTimeline', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const baseOrder: Order = {
    id: 'test-order-1',
    orderNumber: 'ORD-12345',
    customerName: 'Nguyen Van A',
    shippingPhone: '0901234567',
    shippingAddress: '123 Le Loi, Q1, HCMC',
    status: 'SHIPPING',
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    subtotal: 20000000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 20000000,
    items: [],
    createdAt: '2026-10-01T10:00:00Z',
    shipping: {
      id: 'ship-1',
      orderId: 'test-order-1',
      providerName: 'Giao Hàng Nhanh (GHN)',
      trackingNumber: 'GHN123456VN',
      status: 'IN_TRANSIT',
      shippingFee: 0,
      estimatedDeliveryDate: '2026-10-05T00:00:00Z',
      createdAt: '2026-10-01T10:00:00Z',
    },
  };

  it('renders shipping carrier and tracking number when present', () => {
    render(<OrderTrackingTimeline order={baseOrder} />);
    expect(screen.getByText(/Giao Hàng Nhanh/i)).toBeTruthy();
    expect(screen.getByText('GHN123456VN')).toBeTruthy();
  });

  it('renders default carrier name when shipping.providerName is missing', () => {
    const orderWithoutCarrier: Order = {
      ...baseOrder,
      shipping: undefined,
    };
    render(<OrderTrackingTimeline order={orderWithoutCarrier} />);
    expect(screen.getByText(/Giao Hàng Tiêu Chuẩn \(Happy Express\)/i)).toBeTruthy();
  });

  it('renders estimated delivery date when available', () => {
    render(<OrderTrackingTimeline order={baseOrder} />);
    expect(screen.getByText(/Dự kiến nhận hàng:/i)).toBeTruthy();
  });

  it('renders cancelled alert banner when order is cancelled', () => {
    const cancelledOrder: Order = {
      ...baseOrder,
      status: 'CANCELLED',
      cancelledAt: '2026-10-02T15:30:00Z',
      cancelledReason: 'Khách hàng đổi ý',
    };
    render(<OrderTrackingTimeline order={cancelledOrder} />);
    expect(screen.getByText(/Đơn hàng đã bị hủy/i)).toBeTruthy();
    expect(screen.getByText(/Khách hàng đổi ý/i)).toBeTruthy();
    expect(screen.getByText(/Thời gian hủy:/i)).toBeTruthy();
  });

  it('handles tracking number copy to clipboard with feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<OrderTrackingTimeline order={baseOrder} />);
    const copyButton = screen.getByRole('button', { name: /Sao chép mã vận đơn/i });
    expect(copyButton).toBeTruthy();

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('GHN123456VN');
    });
  });

  it('renders correct current step for different order statuses', () => {
    const { rerender } = render(<OrderTrackingTimeline order={{ ...baseOrder, status: 'PENDING' }} />);
    expect(screen.getByText('Đã đặt hàng')).toBeTruthy();
    expect(screen.getByText('Hiện tại')).toBeTruthy();

    rerender(<OrderTrackingTimeline order={{ ...baseOrder, status: 'PROCESSING' }} />);
    expect(screen.getByText('Đã xác nhận & Đóng gói')).toBeTruthy();

    rerender(<OrderTrackingTimeline order={{ ...baseOrder, status: 'DELIVERED' }} />);
    expect(screen.getByText('Đã giao hàng')).toBeTruthy();

    rerender(<OrderTrackingTimeline order={{ ...baseOrder, status: 'COMPLETED' }} />);
    expect(screen.getByText('Hoàn tất & Bảo hành')).toBeTruthy();
  });

  it('renders active return request banner when returns are present', () => {
    const orderWithReturn: Order = {
      ...baseOrder,
      status: 'DELIVERED',
      returns: [
        {
          id: 'ret-1',
          orderId: 'test-order-1',
          userId: 'user-1',
          returnNumber: 'RET-0001',
          status: 'REQUESTED',
          reason: 'Lỗi phần cứng',
          requestedAt: '2026-10-02T10:00:00Z',
          items: [],
        },
      ],
    };
    render(<OrderTrackingTimeline order={orderWithReturn} />);
    expect(screen.getByText(/Đơn hàng đang có yêu cầu đổi trả \(RET-0001\)/i)).toBeTruthy();
    expect(screen.getByText(/Xem chi tiết/i)).toBeTruthy();
  });
});
