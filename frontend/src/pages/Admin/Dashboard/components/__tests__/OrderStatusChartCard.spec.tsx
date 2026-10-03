// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OrderStatusChartCard } from '../OrderStatusChartCard';
import type { OrderStatusItem } from '../../../../../types/report';

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
      <div style={{ width: 400, height: 210 }} data-testid="responsive-container">
        {children}
      </div>
    ),
  };
});

describe('OrderStatusChartCard', () => {
  const mockData: OrderStatusItem[] = [
    { status: 'PENDING', count: 5 },
    { status: 'CONFIRMED', count: 10 },
    { status: 'PROCESSING', count: 8 },
    { status: 'SHIPPING', count: 12 },
    { status: 'DELIVERED', count: 25 },
    { status: 'COMPLETED', count: 15 },
    { status: 'CANCELLED', count: 2 },
  ];

  it('renders loading skeleton when loading and data is empty', () => {
    render(<OrderStatusChartCard data={[]} loading={true} />);

    expect(screen.getByText('Trạng thái Đơn hàng')).toBeDefined();
    expect(screen.getByTestId('order-status-skeleton')).toBeDefined();
  });

  it('renders empty state when data is empty and not loading', () => {
    render(<OrderStatusChartCard data={[]} loading={false} />);

    expect(screen.getByText('Không có dữ liệu trạng thái đơn hàng')).toBeDefined();
    expect(screen.getByTestId('order-status-empty')).toBeDefined();
  });

  it('renders donut chart with center count and status legend grid', () => {
    render(<OrderStatusChartCard data={mockData} loading={false} />);

    expect(screen.getByText('Trạng thái Đơn hàng')).toBeDefined();
    // Total orders: 5+10+8+12+25+15+2 = 77
    expect(screen.getByText('77')).toBeDefined();
    expect(screen.getByText('Tổng đơn')).toBeDefined();

    // Status labels
    expect(screen.getByText('Chờ xử lý')).toBeDefined();
    expect(screen.getByText('Đã xác nhận')).toBeDefined();
    expect(screen.getByText('Đang xử lý')).toBeDefined();
    expect(screen.getByText('Đang giao hàng')).toBeDefined();
    expect(screen.getByText('Đã giao hàng')).toBeDefined();
    expect(screen.getByText('Hoàn tất')).toBeDefined();
    expect(screen.getByText('Đã hủy')).toBeDefined();
  });
});
