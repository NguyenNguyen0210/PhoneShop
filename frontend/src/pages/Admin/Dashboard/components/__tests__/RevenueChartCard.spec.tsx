// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RevenueChartCard } from '../RevenueChartCard';
import type { RevenueReport } from '../../../../../types/report';

// Mock matchMedia for Ant Design
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

// Mock ResizeObserver for Ant Design & Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

// Mock Recharts ResponsiveContainer for jsdom environment
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 800, height: 320 }} data-testid="responsive-container">
        {children}
      </div>
    ),
  };
});

describe('RevenueChartCard', () => {
  const mockReport: RevenueReport = {
    from: '2026-03-01',
    to: '2026-03-07',
    timeZone: 'Asia/Ho_Chi_Minh',
    totalRevenue: 55000000,
    refundedTotal: 5000000,
    netRevenue: 50000000,
    paymentCount: 15,
    dailyBreakdown: [
      { date: '2026-03-01', revenue: 10000000 },
      { date: '2026-03-02', revenue: 12000000 },
      { date: '2026-03-03', revenue: 8000000 },
      { date: '2026-03-04', revenue: 15000000 },
      { date: '2026-03-05', revenue: 5000000 },
    ],
  };

  it('renders loading skeleton when loading and data is null', () => {
    const { container } = render(<RevenueChartCard data={null} loading={true} />);

    expect(screen.getByText('Biến động Doanh thu theo ngày')).toBeDefined();
    expect(screen.getByTestId('revenue-chart-skeleton')).toBeDefined();
    expect(container.querySelector('.ant-skeleton')).toBeDefined();
  });

  it('renders empty state when data is null and not loading', () => {
    render(<RevenueChartCard data={null} loading={false} />);

    expect(screen.getByText('Biến động Doanh thu theo ngày')).toBeDefined();
    expect(
      screen.getByText('Không có dữ liệu giao dịch trong khoảng thời gian này'),
    ).toBeDefined();
    expect(screen.getByTestId('revenue-chart-empty')).toBeDefined();
  });

  it('renders empty state when dailyBreakdown is empty', () => {
    const emptyReport: RevenueReport = {
      ...mockReport,
      dailyBreakdown: [],
    };

    render(<RevenueChartCard data={emptyReport} loading={false} />);

    expect(
      screen.getByText('Không có dữ liệu giao dịch trong khoảng thời gian này'),
    ).toBeDefined();
  });

  it('renders chart card with title, payment count and net revenue when data is provided', () => {
    render(<RevenueChartCard data={mockReport} loading={false} />);

    expect(screen.getByText('Biến động Doanh thu theo ngày')).toBeDefined();
    expect(screen.getByText('15 giao dịch')).toBeDefined();
    expect(screen.getByText(/Tổng thực thu:/)).toBeDefined();
    expect(screen.getByTestId('revenue-chart-card')).toBeDefined();
    expect(screen.getByTestId('responsive-container')).toBeDefined();
  });
});
