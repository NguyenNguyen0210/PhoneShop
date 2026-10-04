// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DashboardKpiCards } from '../DashboardKpiCards';
import type { DashboardSummary } from '../../../../../types/report';

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

const mockSummary: DashboardSummary = {
  totalOrders: 120,
  pendingOrders: 8,
  totalRevenue: 250000000,
  refundedTotal: 15000000,
  netRevenue: 235000000,
  totalUsers: 95,
  totalProducts: 42,
  totalLowStock: 6,
};

describe('DashboardKpiCards', () => {
  it('renders 4 skeleton cards when loading is true and summary is null', () => {
    const { container } = render(
      <BrowserRouter>
        <DashboardKpiCards summary={null} loading={true} />
      </BrowserRouter>
    );

    const skeletons = container.querySelectorAll('[data-testid="kpi-skeleton-card"]');
    expect(skeletons.length).toBe(4);
  });

  it('renders 4 KPI cards with correct data when summary is present', () => {
    render(
      <BrowserRouter>
        <DashboardKpiCards summary={mockSummary} loading={false} />
      </BrowserRouter>
    );

    // Card 1: Doanh thu thuần
    expect(screen.getByText('Doanh thu thuần')).toBeDefined();
    expect(screen.getByText(/235\.000\.000/)).toBeDefined();
    expect(screen.getByText(/15\.000\.000/)).toBeDefined();

    // Card 2: Tổng đơn hàng
    expect(screen.getByText('Tổng đơn hàng')).toBeDefined();
    expect(screen.getByText(/8 đơn đang chờ xử lý/i)).toBeDefined();

    // Card 3: Thiết bị dưới mức tồn kho
    expect(screen.getByText('Thiết bị dưới mức tồn kho')).toBeDefined();
    expect(screen.getByText('6')).toBeDefined();
    const inventoryLink = screen.getByRole('link', { name: /xem tồn kho/i });
    expect(inventoryLink.getAttribute('href')).toBe('/admin/inventory');

    // Card 4: Giá trị trung bình / đơn (AOV = 235.000.000 / 120)
    expect(screen.getByText('Giá trị trung bình / đơn')).toBeDefined();
    expect(screen.getByText(/1\.958\.333/)).toBeDefined();
    expect(screen.getByText(/đơn trong kỳ/i)).toBeDefined();
  });
});
