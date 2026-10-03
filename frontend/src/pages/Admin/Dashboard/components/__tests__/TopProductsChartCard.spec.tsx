// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TopProductsChartCard } from '../TopProductsChartCard';
import type { TopProductItem } from '../../../../../types/report';

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
      <div style={{ width: 600, height: 320 }} data-testid="responsive-container">
        {children}
      </div>
    ),
  };
});

describe('TopProductsChartCard', () => {
  const mockProducts: TopProductItem[] = [
    {
      variantId: 'v1',
      productName: 'iPhone 15 Pro Max',
      variantName: '256GB Titan',
      sku: 'IP15PM-256',
      totalQuantitySold: 35,
      totalRevenue: 1050000000,
    },
    {
      variantId: 'v2',
      productName: 'Samsung Galaxy S24 Ultra',
      variantName: '512GB Gray',
      sku: 'S24U-512',
      totalQuantitySold: 20,
      totalRevenue: 600000000,
    },
  ];

  it('renders loading skeleton when loading and data is empty', () => {
    render(<TopProductsChartCard data={[]} loading={true} />);

    expect(screen.getByText('Top sản phẩm bán chạy')).toBeDefined();
    expect(screen.getByTestId('top-products-skeleton')).toBeDefined();
  });

  it('renders empty state when data is empty and not loading', () => {
    render(<TopProductsChartCard data={[]} loading={false} />);

    expect(screen.getByText('Không có dữ liệu sản phẩm bán chạy')).toBeDefined();
    expect(screen.getByTestId('top-products-empty')).toBeDefined();
  });

  it('renders chart and radio buttons when data is provided', () => {
    render(<TopProductsChartCard data={mockProducts} loading={false} />);

    expect(screen.getByText('Top sản phẩm bán chạy')).toBeDefined();
    expect(screen.getByText('Theo số lượng')).toBeDefined();
    expect(screen.getByText('Theo doanh thu')).toBeDefined();

    // Toggle to revenue
    const revenueRadio = screen.getByLabelText('Theo doanh thu');
    fireEvent.click(revenueRadio);
    expect(screen.getByTestId('top-products-card')).toBeDefined();
  });
});
