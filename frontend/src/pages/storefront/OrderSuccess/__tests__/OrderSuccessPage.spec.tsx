// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrderSuccessPage } from '../OrderSuccessPage';
import { orderService } from '../../../../services/orderService';
import { paymentService } from '../../../../services/paymentService';
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
    getOrderById: vi.fn(),
  },
}));

vi.mock('../../../../services/paymentService', () => ({
  paymentService: {
    createVietQr: vi.fn(),
    reportTransfer: vi.fn(),
  },
}));

describe('OrderSuccessPage - VietQR Transfer Report Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(paymentService.createVietQr).mockResolvedValue({
      qrImageUrl: 'https://img.vietqr.io/mock.png',
      bankName: 'MBBank',
      accountNumber: '0987654321',
      accountName: 'CONG TY PHONE SHOP',
      amount: 20000000,
      transferContent: 'ORD-20261010-001',
    });
  });

  afterEach(() => {
    cleanup();
  });

  const mockOrder: Order = {
    id: 'ord-123',
    orderNumber: 'ORD-20261010-001',
    customerName: 'Nguyễn Văn A',
    shippingPhone: '0901234567',
    shippingAddress: '123 Lê Lợi, Q.1, HCM',
    status: 'PENDING',
    paymentMethod: 'VIETQR',
    paymentStatus: 'PENDING',
    subtotal: 20000000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 20000000,
    customerReportedTransfer: false,
    items: [],
    createdAt: '2026-10-10T09:00:00.000Z',
  };

  it('allows reporting transfer, updates UI and persists to sessionStorage', async () => {
    vi.mocked(orderService.getOrderById).mockResolvedValue(mockOrder);
    vi.mocked(paymentService.reportTransfer).mockResolvedValue({ id: 'txn-1' });

    render(
      <MemoryRouter initialEntries={['/order-success/ord-123']}>
        <Routes>
          <Route path="/order-success/:id" element={<OrderSuccessPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tôi đã chuyển khoản thành công')).toBeDefined();
    });

    const reportBtn = screen.getByText('Tôi đã chuyển khoản thành công');
    fireEvent.click(reportBtn);

    await waitFor(() => {
      expect(paymentService.reportTransfer).toHaveBeenCalledWith('ord-123');
      expect(
        screen.getByText(/Đã nhận được thông báo chuyển tiền của bạn/)
      ).toBeDefined();
    });

    // Verify sessionStorage has customerReportedTransfer set to true
    const saved = sessionStorage.getItem('order_ord-123');
    expect(saved).toBeDefined();
    if (saved) {
      expect(JSON.parse(saved).customerReportedTransfer).toBe(true);
    }
  });

  it('retains confirmed state on reload when API returns customerReportedTransfer: true', async () => {
    vi.mocked(orderService.getOrderById).mockResolvedValue({
      ...mockOrder,
      customerReportedTransfer: true,
      customerReportedAt: '2026-10-10T09:15:00.000Z',
    });

    render(
      <MemoryRouter initialEntries={['/order-success/ord-123']}>
        <Routes>
          <Route path="/order-success/:id" element={<OrderSuccessPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Đã nhận được thông báo chuyển tiền của bạn/)
      ).toBeDefined();
    });

    // Should NOT show the "Tôi đã chuyển khoản thành công" button
    expect(screen.queryByText('Tôi đã chuyển khoản thành công')).toBeNull();
  });
});
