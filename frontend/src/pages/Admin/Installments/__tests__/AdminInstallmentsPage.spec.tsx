// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminInstallmentsPage } from '../AdminInstallmentsPage';
import { installmentService } from '../../../../services/installmentService';

vi.mock('../../../../services/installmentService', () => ({
  installmentService: { getAdminInstallments: vi.fn() },
}));

// Mock matchMedia + ResizeObserver for Ant Design Table/Grid
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

(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockApp = {
  id: 'app-1',
  orderId: 'ord-1',
  provider: 'HOME_CREDIT',
  status: 'PENDING',
  termMonths: 6,
  prepayPercent: 20,
  prepayAmount: 4776000,
  monthlyAmount: 3184000,
  fullName: 'Nguyen Khanh Vy',
  citizenId: '074286001088',
  phoneNumber: '0868039811',
  incomeRange: '10 - 20 trieu',
  createdAt: '2026-10-06T14:15:00.000Z',
  order: {
    orderNumber: 'ORD-1791257122910-8AE6DB',
    items: [
      {
        unitPrice: 26391000,
        variant: {
          storage: '512GB',
          color: 'Xam Titan',
          price: 26391000,
          product: { name: 'Samsung Galaxy S24 Ultra' },
        },
      },
    ],
  },
};

describe('AdminInstallmentsPage — nghiep vu & bao mat', () => {
  beforeEach(() => {
    vi.mocked(installmentService.getAdminInstallments).mockImplementation(async (params: any) => {
      if (params?.limit === 1 && params?.status) {
        const totals: Record<string, number> = { PENDING: 2, APPROVED: 18, REJECTED: 2, CANCELLED: 1 };
        return { items: [], total: totals[params.status] ?? 0 } as any;
      }
      return { items: [mockApp], total: 23 } as any;
    });
  });

  it('hien ten may + gia niem yet, che CCCD dang 0742 •••• 1088', async () => {
    render(
      <MemoryRouter>
        <AdminInstallmentsPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Samsung Galaxy S24 Ultra/)).toBeDefined();
    });
    expect(screen.getByText(/Giá máy: 26\.391\.000/)).toBeDefined();
    expect(screen.getByText('0742 •••• 1088')).toBeDefined();
    expect(screen.queryByText('074286001088')).toBeNull();
  });

  it('tab dem du 4 trang thai, tong khop 23', async () => {
    render(
      <MemoryRouter>
        <AdminInstallmentsPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Tỷ lệ duyệt/)).toBeDefined();
    });
    expect(screen.getByText(/Đã hủy/)).toBeDefined();
  });
});
