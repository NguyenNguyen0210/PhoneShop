// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReturnCard } from '../components/ReturnCard';
import type { ReturnRequest, ReturnStatus } from '../../../../types';

const baseReturnRequest: ReturnRequest = {
  id: 'ret-100',
  orderId: 'order-12345',
  userId: 'user-1',
  returnNumber: 'RET-202610-001',
  status: 'REQUESTED',
  reason: 'Lỗi kỹ thuật phần cứng (Lỗi do nhà sản xuất)',
  customerNote: 'Màn hình bị sọc khi khởi động',
  adminNote: 'Đã tiếp nhận yêu cầu, vui lòng chuẩn bị máy',
  requestedAt: '2026-10-02T08:30:00.000Z',
  items: [
    {
      id: 'ret-item-1',
      returnId: 'ret-100',
      orderItemId: 'order-item-1',
      quantity: 1,
      orderItem: {
        id: 'order-item-1',
        orderId: 'order-12345',
        variantId: 'v-1',
        productName: 'Samsung Galaxy S24 Ultra',
        quantity: 1,
        unitPrice: 28000000,
        totalPrice: 28000000,
        variant: {
          id: 'v-1',
          productId: 'p-1',
          sku: 'S24U-GREY',
          color: 'Titanium Gray',
          storage: '512GB',
          price: 28000000,
        },
        imeiDevice: {
          id: 'imei-1',
          imeiNumber: '351234567890123',
        },
      },
    },
  ],
};

describe('ReturnCard', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders return number, reason, notes, and returned items', () => {
    render(<ReturnCard returnRequest={baseReturnRequest} />);

    expect(screen.getByText('#RET-202610-001')).toBeDefined();
    expect(
      screen.getByText('Lỗi kỹ thuật phần cứng (Lỗi do nhà sản xuất)')
    ).toBeDefined();
    expect(screen.getByText('Màn hình bị sọc khi khởi động')).toBeDefined();
    expect(
      screen.getByText('Đã tiếp nhận yêu cầu, vui lòng chuẩn bị máy')
    ).toBeDefined();

    // Items list
    expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeDefined();
    expect(screen.getByText('Titanium Gray • 512GB')).toBeDefined();
    expect(screen.getByText('IMEI: 351234567890123')).toBeDefined();
    expect(screen.getByText('x1')).toBeDefined();
  });

  const statuses: { status: ReturnStatus; expectedLabel: string; expectedClassSubstr: string }[] = [
    { status: 'REQUESTED', expectedLabel: 'Chờ duyệt', expectedClassSubstr: 'bg-amber-50' },
    { status: 'APPROVED', expectedLabel: 'Đã duyệt gửi hàng', expectedClassSubstr: 'bg-blue-50' },
    { status: 'SHIPPING', expectedLabel: 'Đang gửi hàng hoàn', expectedClassSubstr: 'bg-purple-50' },
    { status: 'RECEIVED', expectedLabel: 'Đã nhận hàng hoàn', expectedClassSubstr: 'bg-indigo-50' },
    { status: 'INSPECTING', expectedLabel: 'Đang kiểm định', expectedClassSubstr: 'bg-orange-50' },
    { status: 'COMPLETED', expectedLabel: 'Hoàn tất', expectedClassSubstr: 'bg-emerald-50' },
    { status: 'REJECTED', expectedLabel: 'Từ chối', expectedClassSubstr: 'bg-rose-50' },
    { status: 'CANCELLED', expectedLabel: 'Đã hủy', expectedClassSubstr: 'bg-slate-100' },
  ];

  statuses.forEach(({ status, expectedLabel, expectedClassSubstr }) => {
    it(`renders status badge correctly for status: ${status}`, () => {
      const returnReq: ReturnRequest = {
        ...baseReturnRequest,
        status,
      };

      render(<ReturnCard returnRequest={returnReq} />);
      const badge = screen.getByTestId('return-status-badge');
      expect(badge.textContent).toContain(expectedLabel);
      expect(badge.className).toContain(expectedClassSubstr);
    });
  });

  it('renders "Hủy yêu cầu" button and triggers onCancel when status is REQUESTED', () => {
    const onCancel = vi.fn();
    render(
      <ReturnCard
        returnRequest={{ ...baseReturnRequest, status: 'REQUESTED' }}
        onCancel={onCancel}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Hủy yêu cầu' });
    expect(cancelBtn).toBeDefined();

    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith('ret-100');
  });

  it('does NOT render "Hủy yêu cầu" button when status is not REQUESTED', () => {
    const onCancel = vi.fn();
    render(
      <ReturnCard
        returnRequest={{ ...baseReturnRequest, status: 'APPROVED' }}
        onCancel={onCancel}
      />
    );

    expect(screen.queryByRole('button', { name: 'Hủy yêu cầu' })).toBeNull();
  });
});
