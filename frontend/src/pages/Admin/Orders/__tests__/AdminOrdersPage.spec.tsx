// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminOrdersPage } from '../AdminOrdersPage';
import { orderService } from '../../../../services/orderService';
import type { Order } from '../../../../types';

beforeAll(() => {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock('../../../../services/orderService', () => ({
  orderService: {
    getAllOrdersAdmin: vi.fn(),
    getOrderById: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}));

vi.mock('../../../../services/paymentService', () => ({
  paymentService: {
    getPaymentsByOrder: vi.fn(),
    confirmPaymentAdmin: vi.fn(),
  },
}));

describe('AdminOrdersPage - VietQR Confirmation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockVietQrOrder: Order = {
    id: 'ord-vietqr-1',
    orderNumber: 'ORD-20261010-001',
    customerName: 'Trần Thị B',
    shippingPhone: '0988776655',
    shippingAddress: '456 Hai Bà Trưng, Q.3, HCM',
    status: 'PENDING',
    paymentMethod: 'VIETQR',
    paymentStatus: 'PENDING',
    subtotal: 20000000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 20000000,
    customerReportedTransfer: true,
    customerReportedAt: '2026-10-10T09:15:00.000Z',
    items: [],
    payments: [
      {
        id: 'pay-vqr-1',
        orderId: 'ord-vietqr-1',
        amount: 20000000,
        method: 'VIETQR',
        status: 'PENDING',
        createdAt: '2026-10-10T09:00:00.000Z',
        updatedAt: '2026-10-10T09:00:00.000Z',
      },
    ],
    createdAt: '2026-10-10T09:00:00.000Z',
  };

  it('renders "Khách đã báo CK" tag in the table and opens reconciliation modal on click', async () => {
    vi.mocked(orderService.getAllOrdersAdmin).mockResolvedValue({
      data: [mockVietQrOrder],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Khách đã báo CK')).toBeDefined();
    });

    const reportedTag = screen.getByText('Khách đã báo CK');
    fireEvent.click(reportedTag);

    await waitFor(() => {
      expect(
        screen.getByText('Xác nhận Đối soát Giao dịch Chuyển khoản')
      ).toBeDefined();
    });
  });

  it('displays "Xác nhận đã nhận tiền CK (VietQR)" in order detail modal for pending VietQR order', async () => {
    vi.mocked(orderService.getAllOrdersAdmin).mockResolvedValue({
      data: [mockVietQrOrder],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/001/)).toBeDefined();
    });

    // Open detail modal by clicking order number
    const orderNumBtn = screen.getByRole('button', { name: /001/i });
    fireEvent.click(orderNumBtn);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết đơn hàng: ORD-20261010-001')).toBeDefined();
      expect(screen.getByText('Xác nhận đã nhận tiền CK (VietQR)')).toBeDefined();
    });
  });
});
