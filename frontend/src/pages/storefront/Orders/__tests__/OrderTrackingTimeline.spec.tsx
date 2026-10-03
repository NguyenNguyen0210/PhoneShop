// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline';
import type { Order } from '../../../../types';

describe('OrderTrackingTimeline 2-Layer', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const baseOrder: Order = {
    id: 'ord-1',
    orderNumber: 'ORD-1001',
    customerName: 'Trần Thị B',
    shippingPhone: '0988776655',
    shippingAddress: '456 Hai Bà Trưng, Q.3, HCM',
    status: 'SHIPPING',
    subtotal: 25000000,
    shippingFee: 30000,
    discount: 0,
    totalAmount: 25000000,
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    items: [],
    createdAt: '2026-10-03T08:00:00Z',
    shipping: {
      id: 'ship-1',
      orderId: 'ord-1',
      providerName: 'Giao Hàng Nhanh (GHN)',
      trackingNumber: 'GHN88291039VN',
      status: 'IN_TRANSIT',
      shippingFee: 30000,
      estimatedDeliveryDate: '2026-10-06T00:00:00Z',
      shippedAt: '2026-10-03T14:00:00Z',
      createdAt: '2026-10-03T09:00:00Z',
    },
  };

  it('renders carrier name, tracking number and carrier lookup link', () => {
    render(<OrderTrackingTimeline order={baseOrder} />);

    expect(screen.getByText(/Giao Hàng Nhanh/i)).toBeDefined();
    expect(screen.getByText('GHN88291039VN')).toBeDefined();
    const link = screen.getByRole('link', { name: /tra cứu/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toContain('donhang.ghn.vn');
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
    expect(copyButton).toBeDefined();

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('GHN88291039VN');
    });
  });

  it('renders 5-step stepper and activity log entries', () => {
    render(<OrderTrackingTimeline order={baseOrder} />);

    expect(screen.getByText('Đã đặt hàng')).toBeDefined();
    expect(screen.getByText('Đã đóng gói')).toBeDefined();
    expect(screen.getByText('Bưu tá đã lấy')).toBeDefined();
    expect(screen.getByText('Đang giao hàng')).toBeDefined();
    expect(screen.getByText('Đã nhận hàng')).toBeDefined();
    expect(screen.getByText(/Lịch sử hành trình bưu kiện/i)).toBeDefined();
  });

  it('renders reverse chronological activity log with vi-VN timestamps', () => {
    const orderWithHistory: Order = {
      ...baseOrder,
      shipping: {
        ...baseOrder.shipping!,
        updatedAt: '2026-10-03T16:00:00Z',
        deliveredAt: '2026-10-04T09:30:00Z',
      },
    };
    render(<OrderTrackingTimeline order={orderWithHistory} />);

    expect(screen.getByText(/Lịch sử hành trình bưu kiện/i)).toBeDefined();
    expect(screen.getByText('Giao hàng thành công')).toBeDefined();
    expect(screen.getByText('Đang vận chuyển')).toBeDefined();
    expect(screen.getByText(/Bưu tá đã lấy hàng/i)).toBeDefined();
    expect(screen.getByText(/Đã đóng gói & Tạo mã vận đơn/i)).toBeDefined();
    expect(screen.getByText('Đơn hàng đã đặt')).toBeDefined();
  });

  it('renders correct current step based on shipping.status and falls back to order.status', () => {
    const { rerender } = render(
      <OrderTrackingTimeline
        order={{
          ...baseOrder,
          shipping: { ...baseOrder.shipping!, status: 'READY_TO_SHIP' },
        }}
      />
    );
    expect(screen.getByText('Đã đóng gói')).toBeDefined();

    rerender(
      <OrderTrackingTimeline
        order={{
          ...baseOrder,
          shipping: { ...baseOrder.shipping!, status: 'PICKED_UP' },
        }}
      />
    );
    expect(screen.getByText('Bưu tá đã lấy')).toBeDefined();

    rerender(
      <OrderTrackingTimeline
        order={{
          ...baseOrder,
          shipping: { ...baseOrder.shipping!, status: 'DELIVERED' },
        }}
      />
    );
    expect(screen.getByText('Đã nhận hàng')).toBeDefined();

    // Fallback when shipping is undefined
    rerender(
      <OrderTrackingTimeline
        order={{
          ...baseOrder,
          shipping: undefined,
          status: 'PENDING',
        }}
      />
    );
    expect(screen.getByText('Đã đặt hàng')).toBeDefined();
    expect(screen.getByText('Hiện tại')).toBeDefined();
  });

  it('renders special alerts for cancelled, failed, and returned', () => {
    const cancelledOrder: Order = {
      ...baseOrder,
      status: 'CANCELLED',
      cancelledAt: '2026-10-02T15:30:00Z',
      cancelledReason: 'Khách hàng đổi ý',
    };
    const { rerender } = render(<OrderTrackingTimeline order={cancelledOrder} />);
    expect(screen.getByText(/Đơn hàng đã bị hủy/i)).toBeDefined();
    expect(screen.getByText(/Khách hàng đổi ý/i)).toBeDefined();

    rerender(
      <OrderTrackingTimeline
        order={{
          ...baseOrder,
          shipping: { ...baseOrder.shipping!, status: 'FAILED' },
        }}
      />
    );
    expect(screen.getByText(/Giao hàng không thành công/i)).toBeDefined();

    rerender(
      <OrderTrackingTimeline
        order={{
          ...baseOrder,
          shipping: { ...baseOrder.shipping!, status: 'RETURNED' },
        }}
      />
    );
    expect(screen.getByText(/Kiện hàng đã chuyển hoàn/i)).toBeDefined();
  });

  it('renders default carrier name when shipping.providerName is missing', () => {
    const orderWithoutCarrier: Order = {
      ...baseOrder,
      shipping: undefined,
    };
    render(<OrderTrackingTimeline order={orderWithoutCarrier} />);
    expect(screen.getByText(/Giao Hàng Tiêu Chuẩn \(Happy Express\)/i)).toBeDefined();
  });

  it('renders estimated delivery date when available', () => {
    render(<OrderTrackingTimeline order={baseOrder} />);
    expect(screen.getByText(/Dự kiến nhận hàng:/i)).toBeDefined();
  });

  it('renders active return request banner when returns are present', () => {
    const orderWithReturn: Order = {
      ...baseOrder,
      status: 'DELIVERED',
      returns: [
        {
          id: 'ret-1',
          orderId: 'ord-1',
          userId: 'user-1',
          returnNumber: 'RET-0001',
          status: 'REQUESTED',
          reason: 'Lỗi phần cứng',
          requestedAt: '2026-10-02T10:00:00Z',
          items: [],
        },
      ],
    };
    render(<OrderTrackingTimeline order={orderWithReturn} />);
    expect(screen.getByText(/Đơn hàng đang có yêu cầu đổi trả \(RET-0001\)/i)).toBeDefined();
  });
});
