// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPaymentsPage } from '../AdminPaymentsPage';
import { paymentService } from '../../../../services/paymentService';
import { returnService } from '../../../../services/returnService';
import { useAuthStore } from '../../../../stores/useAuthStore';

// MatchMedia Mock for Ant Design Tabs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// ResizeObserver Mock
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../../../services/paymentService', () => ({
  paymentService: {
    getAllPaymentsAdmin: vi.fn(),
    getTransactionHistoryAdmin: vi.fn(),
  },
}));

vi.mock('../../../../services/returnService', () => ({
  returnService: {
    getRefundHistory: vi.fn(),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('AdminPaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 'u1', role: 'ADMIN', roles: ['ADMIN'] },
    } as any);

    vi.mocked(paymentService.getAllPaymentsAdmin).mockResolvedValue([
      { id: 'p1', orderId: 'o1', method: 'VIETQR', status: 'PENDING', amount: 5000000, createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(paymentService.getTransactionHistoryAdmin).mockResolvedValue([]);
    vi.mocked(returnService.getRefundHistory).mockResolvedValue([]);
  });

  it('renders page header and tabs correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/payments']}>
        <AdminPaymentsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Quản lý Thanh toán & Dòng tiền')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/Giao dịch thanh toán/)).toBeTruthy();
      expect(screen.getByText(/Đối soát ngân hàng/)).toBeTruthy();
      expect(screen.getByText(/Sổ cái hoàn tiền/)).toBeTruthy();
      expect(screen.getByText(/Nhật ký Gateway/)).toBeTruthy();
    });
  });
});
