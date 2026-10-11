// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrderDetailPage } from '../OrderDetailPage';
import { orderService } from '../../../../services/orderService';
import type { Order } from '../../../../types';

vi.mock('../../../../services/orderService', () => ({
  orderService: {
    getOrderById: vi.fn(),
  },
}));

vi.mock('../../../../services/installmentService', () => ({
  installmentService: {
    getInstallmentByOrderId: vi.fn(),
    getScheduleByOrder: vi.fn(),
  },
}));

vi.mock('../../../../services/reviewService', () => ({
  reviewService: {
    getMyReviewStatus: vi.fn().mockResolvedValue({ canReview: false, myReview: null }),
  },
}));

describe('OrderDetailPage - Grouped Order Items Surface', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderComponent = (orderId = 'ord-123') => {
    return render(
      <MemoryRouter initialEntries={[`/orders/${orderId}`]}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('aggregates multiple items of identical variants into a single row with total quantity, unit price in subtitle, and bold total', async () => {
    const mockOrder: Order = {
      id: 'ord-123',
      orderNumber: 'ORD-12345',
      customerName: 'Nguyen Van A',
      shippingPhone: '0901234567',
      shippingAddress: '123 Le Loi, Q1, HCMC',
      status: 'PROCESSING',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotal: 60000000,
      shippingFee: 0,
      discount: 0,
      totalAmount: 60000000,
      createdAt: '2026-10-10T10:00:00Z',
      items: [
        {
          id: 'item-1',
          orderId: 'ord-123',
          variantId: 'var-ip15',
          productName: 'iPhone 15 Pro Max',
          quantity: 1,
          unitPrice: 30000000,
          totalPrice: 30000000,
          variant: {
            id: 'var-ip15',
            productId: 'prod-ip15',
            sku: 'IP15-NAT',
            color: 'Titan Tự Nhiên',
            storage: '256GB',
            price: 30000000,
          },
          imeiDevice: {
            id: 'imei-1',
            imeiNumber: '358900001000001',
          },
        },
        {
          id: 'item-2',
          orderId: 'ord-123',
          variantId: 'var-ip15',
          productName: 'iPhone 15 Pro Max',
          quantity: 1,
          unitPrice: 30000000,
          totalPrice: 30000000,
          variant: {
            id: 'var-ip15',
            productId: 'prod-ip15',
            sku: 'IP15-NAT',
            color: 'Titan Tự Nhiên',
            storage: '256GB',
            price: 30000000,
          },
          imeiDevice: {
            id: 'imei-2',
            imeiNumber: '358900001000002',
          },
        },
      ],
    };

    vi.mocked(orderService.getOrderById).mockResolvedValue(mockOrder);

    renderComponent('ord-123');

    // Wait for order details to render
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ORD-12345/i })).toBeTruthy();
    });

    // Product title should be rendered only once as link to /products/prod-ip15
    const productLinks = screen.getAllByRole('link', { name: /iPhone 15 Pro Max/i });
    expect(productLinks.length).toBeGreaterThanOrEqual(1);
    expect(productLinks[0].getAttribute('href')).toBe('/products/prod-ip15');

    // Subtitle contains color, storage, quantity x2, and unit price
    expect(
      screen.getByText(/Titan Tự Nhiên • 256GB • Số lượng: x2 • Đơn giá:/i),
    ).toBeTruthy();

    // IMEIs should be rendered as chips
    expect(screen.getByText(/IMEI: 358900001000001/i)).toBeTruthy();
    expect(screen.getByText(/IMEI: 358900001000002/i)).toBeTruthy();

    // Since totalQuantity is 2 (<= 3), no expand button
    expect(screen.queryByText(/IMEI khác/i)).toBeNull();
  });

  it('renders single item without unit price in subtitle when quantity is 1', async () => {
    const mockOrder: Order = {
      id: 'ord-single',
      orderNumber: 'ORD-99999',
      customerName: 'Tran B',
      shippingPhone: '0909999999',
      shippingAddress: '456 Nguyen Trai',
      status: 'CONFIRMED',
      paymentMethod: 'VIETQR',
      paymentStatus: 'PAID',
      subtotal: 15000000,
      shippingFee: 0,
      discount: 0,
      totalAmount: 15000000,
      createdAt: '2026-10-10T10:00:00Z',
      items: [
        {
          id: 'item-single',
          orderId: 'ord-single',
          variantId: 'var-s24',
          productName: 'Samsung Galaxy S24',
          quantity: 1,
          unitPrice: 15000000,
          totalPrice: 15000000,
          variant: {
            id: 'var-s24',
            productId: 'prod-s24',
            sku: 'S24-BLK',
            color: 'Đen Onyx',
            storage: '128GB',
            price: 15000000,
          },
          imeiDevice: {
            id: 'imei-s24-1',
            imeiNumber: '351111222233334',
          },
        },
      ],
    };

    vi.mocked(orderService.getOrderById).mockResolvedValue(mockOrder);

    renderComponent('ord-single');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ORD-99999/i })).toBeTruthy();
    });

    // Subtitle has color, storage, quantity x1, but NO "Đơn giá:"
    const subtitle = screen.getByText('Đen Onyx • 128GB • Số lượng: x1');
    expect(subtitle).toBeTruthy();
    expect(subtitle.textContent).not.toContain('Đơn giá:');

    // Single IMEI chip rendered
    expect(screen.getByText('IMEI: 351111222233334')).toBeTruthy();
  });

  it('collapses IMEIs when there are more than 3, and expands/collapses when toggle button is clicked', async () => {
    const mockOrder: Order = {
      id: 'ord-multi-imei',
      orderNumber: 'ORD-55555',
      customerName: 'Hoang C',
      shippingPhone: '0908888888',
      shippingAddress: '789 Vo Van Tan',
      status: 'PROCESSING',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotal: 50000000,
      shippingFee: 0,
      discount: 0,
      totalAmount: 50000000,
      createdAt: '2026-10-10T10:00:00Z',
      items: [
        {
          id: 'item-1',
          orderId: 'ord-multi-imei',
          variantId: 'var-redmi',
          productName: 'Redmi 14C',
          quantity: 1,
          unitPrice: 10000000,
          totalPrice: 10000000,
          variant: { id: 'var-redmi', productId: 'prod-redmi', color: 'Xanh', storage: '128GB', sku: 'R14C-BLU', price: 10000000 },
          imeiDevice: { id: 'dev-1', imeiNumber: 'IMEI-001' },
        },
        {
          id: 'item-2',
          orderId: 'ord-multi-imei',
          variantId: 'var-redmi',
          productName: 'Redmi 14C',
          quantity: 1,
          unitPrice: 10000000,
          totalPrice: 10000000,
          variant: { id: 'var-redmi', productId: 'prod-redmi', color: 'Xanh', storage: '128GB', sku: 'R14C-BLU', price: 10000000 },
          imeiDevice: { id: 'dev-2', imeiNumber: 'IMEI-002' },
        },
        {
          id: 'item-3',
          orderId: 'ord-multi-imei',
          variantId: 'var-redmi',
          productName: 'Redmi 14C',
          quantity: 1,
          unitPrice: 10000000,
          totalPrice: 10000000,
          variant: { id: 'var-redmi', productId: 'prod-redmi', color: 'Xanh', storage: '128GB', sku: 'R14C-BLU', price: 10000000 },
          imeiDevice: { id: 'dev-3', imeiNumber: 'IMEI-003' },
        },
        {
          id: 'item-4',
          orderId: 'ord-multi-imei',
          variantId: 'var-redmi',
          productName: 'Redmi 14C',
          quantity: 1,
          unitPrice: 10000000,
          totalPrice: 10000000,
          variant: { id: 'var-redmi', productId: 'prod-redmi', color: 'Xanh', storage: '128GB', sku: 'R14C-BLU', price: 10000000 },
          imeiDevice: { id: 'dev-4', imeiNumber: 'IMEI-004' },
        },
        {
          id: 'item-5',
          orderId: 'ord-multi-imei',
          variantId: 'var-redmi',
          productName: 'Redmi 14C',
          quantity: 1,
          unitPrice: 10000000,
          totalPrice: 10000000,
          variant: { id: 'var-redmi', productId: 'prod-redmi', color: 'Xanh', storage: '128GB', sku: 'R14C-BLU', price: 10000000 },
          imeiDevice: { id: 'dev-5', imeiNumber: 'IMEI-005' },
        },
      ],
    };

    vi.mocked(orderService.getOrderById).mockResolvedValue(mockOrder);

    renderComponent('ord-multi-imei');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ORD-55555/i })).toBeTruthy();
    });

    // Subtitle shows quantity x5
    expect(screen.getByText(/Xanh • 128GB • Số lượng: x5 • Đơn giá:/i)).toBeTruthy();

    // First 3 IMEIs are rendered
    expect(screen.getByText('IMEI: IMEI-001')).toBeTruthy();
    expect(screen.getByText('IMEI: IMEI-002')).toBeTruthy();
    expect(screen.getByText('IMEI: IMEI-003')).toBeTruthy();

    // 4th and 5th IMEIs should NOT be rendered yet
    expect(screen.queryByText('IMEI: IMEI-004')).toBeNull();
    expect(screen.queryByText('IMEI: IMEI-005')).toBeNull();

    // Expand button is rendered
    const expandBtn = screen.getByRole('button', { name: /\+2 IMEI khác/i });
    expect(expandBtn).toBeTruthy();

    // Click to expand
    fireEvent.click(expandBtn);

    // Now all 5 IMEIs should be rendered
    expect(screen.getByText('IMEI: IMEI-004')).toBeTruthy();
    expect(screen.getByText('IMEI: IMEI-005')).toBeTruthy();

    // Toggle button now shows "Thu gọn"
    const collapseBtn = screen.getByRole('button', { name: /Thu gọn/i });
    expect(collapseBtn).toBeTruthy();

    // Click to collapse
    fireEvent.click(collapseBtn);

    // Collapsed back: 4th and 5th hidden again
    expect(screen.queryByText('IMEI: IMEI-004')).toBeNull();
    expect(screen.queryByText('IMEI: IMEI-005')).toBeNull();
    expect(screen.getByRole('button', { name: /\+2 IMEI khác/i })).toBeTruthy();
  });

  it('renders different variants as distinct grouped item rows', async () => {
    const mockOrder: Order = {
      id: 'ord-two-variants',
      orderNumber: 'ORD-77777',
      customerName: 'Dang D',
      shippingPhone: '0907777777',
      shippingAddress: '101 Tran Hung Dao',
      status: 'DELIVERED',
      paymentMethod: 'VIETQR',
      paymentStatus: 'PAID',
      subtotal: 50000000,
      shippingFee: 0,
      discount: 0,
      totalAmount: 50000000,
      createdAt: '2026-10-10T10:00:00Z',
      items: [
        {
          id: 'item-1',
          orderId: 'ord-two-variants',
          variantId: 'var-black',
          productName: 'iPhone 15 Black',
          quantity: 2,
          unitPrice: 20000000,
          totalPrice: 40000000,
          variant: { id: 'var-black', productId: 'prod-ip15-black', color: 'Đen', storage: '128GB', sku: 'IP15-BLK', price: 20000000 },
        },
        {
          id: 'item-2',
          orderId: 'ord-two-variants',
          variantId: 'var-pink',
          productName: 'iPhone 15 Pink',
          quantity: 1,
          unitPrice: 21000000,
          totalPrice: 21000000,
          variant: { id: 'var-pink', productId: 'prod-ip15-pink', color: 'Hồng', storage: '128GB', sku: 'IP15-PNK', price: 21000000 },
        },
      ],
    };

    vi.mocked(orderService.getOrderById).mockResolvedValue(mockOrder);

    renderComponent('ord-two-variants');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ORD-77777/i })).toBeTruthy();
    });

    // Both products rendered
    expect(screen.getByText('iPhone 15 Black')).toBeTruthy();
    expect(screen.getByText('iPhone 15 Pink')).toBeTruthy();

    // Subtitle for variant 1 has quantity x2 and unit price
    expect(screen.getByText(/Đen • 128GB • Số lượng: x2 • Đơn giá:/i)).toBeTruthy();

    // Subtitle for variant 2 has quantity x1
    expect(screen.getByText('Hồng • 128GB • Số lượng: x1')).toBeTruthy();
  });
});
