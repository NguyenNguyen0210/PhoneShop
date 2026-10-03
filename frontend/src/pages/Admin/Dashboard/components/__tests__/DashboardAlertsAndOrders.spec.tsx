// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DashboardAlertsAndOrders } from '../DashboardAlertsAndOrders';
import type { Order } from '../../../../../types';
import type { LowStockItem } from '../../../../../types/report';

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

describe('DashboardAlertsAndOrders', () => {
  const mockOrders: Partial<Order>[] = [
    {
      id: 'ord-1',
      orderNumber: 'ORD-1001',
      customerName: 'Nguyễn Văn A',
      shippingPhone: '0901234567',
      paymentMethod: 'COD',
      totalAmount: 15000000,
      status: 'CONFIRMED',
    },
    {
      id: 'ord-2',
      orderNumber: 'ORD-1002',
      customerName: 'Trần Thị B',
      shippingPhone: '0912345678',
      paymentMethod: 'VNPAY',
      totalAmount: 25000000,
      status: 'SHIPPING',
    },
  ];

  const mockLowStockItems: LowStockItem[] = [
    {
      variantId: 'v1',
      productName: 'iPhone 15 Pro 128GB',
      sku: 'IP15P-128',
      availableQty: 2,
      reorderLevel: 10,
      deficit: 8,
    },
  ];

  it('renders orders tab and links correctly', () => {
    render(
      <BrowserRouter>
        <DashboardAlertsAndOrders
          orders={mockOrders as Order[]}
          lowStockItems={mockLowStockItems}
          loading={false}
        />
      </BrowserRouter>,
    );

    expect(screen.getByText('Đơn hàng phát sinh gần đây')).toBeDefined();
    expect(screen.getByText('Cảnh báo tồn kho thấp')).toBeDefined();
    expect(screen.getByText('Xem tất cả đơn')).toBeDefined();

    expect(screen.getByText('ORD-1001')).toBeDefined();
    expect(screen.getByText('Nguyễn Văn A')).toBeDefined();
    expect(screen.getByText('ĐÃ XÁC NHẬN')).toBeDefined();
    expect(screen.getByText('ORD-1002')).toBeDefined();
    expect(screen.getByText('Trần Thị B')).toBeDefined();
    expect(screen.getByText('ĐANG GIAO HÀNG')).toBeDefined();
  });

  it('switches to low stock tab and displays alert table', () => {
    render(
      <BrowserRouter>
        <DashboardAlertsAndOrders
          orders={mockOrders as Order[]}
          lowStockItems={mockLowStockItems}
          loading={false}
        />
      </BrowserRouter>,
    );

    const lowStockTab = screen.getByText('Cảnh báo tồn kho thấp');
    fireEvent.click(lowStockTab);

    expect(screen.getByText('iPhone 15 Pro 128GB')).toBeDefined();
    expect(screen.getByText('IP15P-128')).toBeDefined();
    expect(screen.getByText('Thiếu 8')).toBeDefined();
    expect(screen.getByText('Nhập kho ngay')).toBeDefined();
  });
});
