// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrandSalesChartCard } from '../BrandSalesChartCard';
import type { BrandSalesReport } from '../../../../../types/report';

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

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 400, height: 220 }} data-testid="responsive-container">
        {children}
      </div>
    ),
  };
});

describe('BrandSalesChartCard', () => {
  const mockReport: BrandSalesReport = {
    totalRevenue: 100000000,
    brands: [
      {
        brandId: 'b1',
        brandName: 'Apple',
        logoUrl: null,
        quantitySold: 20,
        revenue: 60000000,
        percentage: 60,
      },
      {
        brandId: 'b2',
        brandName: 'Samsung',
        logoUrl: null,
        quantitySold: 15,
        revenue: 40000000,
        percentage: 40,
      },
    ],
  };

  it('renders loading skeleton when loading and data is null', () => {
    render(<BrandSalesChartCard data={null} loading={true} />);

    expect(screen.getByText('Doanh số theo Thương hiệu')).toBeDefined();
    expect(screen.getByTestId('brand-sales-skeleton')).toBeDefined();
  });

  it('renders empty state when data is empty and not loading', () => {
    render(<BrandSalesChartCard data={null} loading={false} />);

    expect(screen.getByText('Chưa có dữ liệu doanh số theo thương hiệu')).toBeDefined();
    expect(screen.getByTestId('brand-sales-empty')).toBeDefined();
  });

  it('renders table and donut chart when data is provided', () => {
    render(<BrandSalesChartCard data={mockReport} loading={false} />);

    expect(screen.getByText('Doanh số theo Thương hiệu')).toBeDefined();
    expect(screen.getByText('Apple')).toBeDefined();
    expect(screen.getByText('Samsung')).toBeDefined();
    expect(screen.getByText('60.0%')).toBeDefined();
    expect(screen.getByText('40.0%')).toBeDefined();
  });
});
