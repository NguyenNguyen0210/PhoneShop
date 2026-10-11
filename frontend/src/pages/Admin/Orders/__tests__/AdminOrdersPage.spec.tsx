// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminOrdersPage } from '../AdminOrdersPage';
import { orderService } from '../../../../services/orderService';
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
    getAllOrdersAdmin: vi.fn(),
    getOrderById: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}));

vi.mock('../../../../services/paymentService', () => ({
  paymentService: {
    getPaymentsByOrder: vi.fn(),
    confirmPaymentAdmin: vi.fn(),
  },
}));

vi.mock('../components/ShippingDispatchModal', () => ({
  ShippingDispatchModal: () => null,
}));

describe('AdminOrdersPage - VietQR Confirmation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockVietQrOrder: Order = {
    id: 'ord-vietqr-1',
    orderNumber: 'ORD-20261010-001',
    customerName: 'Trần Thị B',
    shippingPhone: '0988776655',
    shippingAddress: '456 Hai Bà Trưng, Q.3, HCM',
    status: 'PENDING',
    paymentMethod: 'VIETQR',
    paymentStatus: 'PENDING',
    subtotal: 20000000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 20000000,
    customerReportedTransfer: true,
    customerReportedAt: '2026-10-10T09:15:00.000Z',
    items: [],
    payments: [
      {
        id: 'pay-vqr-1',
        orderId: 'ord-vietqr-1',
        amount: 20000000,
        method: 'VIETQR',
        status: 'PENDING',
        createdAt: '2026-10-10T09:00:00.000Z',
        updatedAt: '2026-10-10T09:00:00.000Z',
      },
    ],
    createdAt: '2026-10-10T09:00:00.000Z',
  };

  it('renders "Khách đã báo CK" tag in the table and opens reconciliation modal on click', async () => {
    vi.mocked(orderService.getAllOrdersAdmin).mockResolvedValue({
      data: [mockVietQrOrder],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Khách đã báo CK')).toBeDefined();
    });

    const reportedTag = screen.getByText('Khách đã báo CK');
    fireEvent.click(reportedTag);

    await waitFor(() => {
      expect(
        screen.getByText('Xác nhận Đối soát Giao dịch Chuyển khoản')
      ).toBeDefined();
    });
  });

  it('displays "Xác nhận đã nhận tiền CK (VietQR)" in order detail modal for pending VietQR order', async () => {
    vi.mocked(orderService.getAllOrdersAdmin).mockResolvedValue({
      data: [mockVietQrOrder],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    vi.mocked(orderService.getOrderById).mockResolvedValue(mockVietQrOrder);

    render(
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/001/)).toBeDefined();
    });

    // Open detail modal by clicking order number
    const orderNumBtn = screen.getByRole('button', { name: /001/i });
    fireEvent.click(orderNumBtn);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết đơn hàng: ORD-20261010-001')).toBeDefined();
      expect(screen.getByText('Xác nhận đã nhận tiền CK (VietQR)')).toBeDefined();
    });
  });
});

describe('AdminOrdersPage - Grouped order items and IMEI display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockOrderWithIdenticalVariants: Order = {
    id: 'ord-100',
    orderNumber: 'ORD-10001',
    customerName: 'Nguyễn Văn Test',
    shippingPhone: '0901234567',
    shippingAddress: '456 Hai Bà Trưng, Q.1, TP.HCM',
    status: 'CONFIRMED',
    totalAmount: 60000000,
    subtotal: 60000000,
    shippingFee: 0,
    discount: 0,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    createdAt: '2026-10-10T08:00:00Z',
    items: [
      {
        id: 'item-1',
        orderId: 'ord-100',
        variantId: 'var-iphone-15-pm',
        productName: 'iPhone 15 Pro Max',
        quantity: 1,
        unitPrice: 30000000,
        totalPrice: 30000000,
        variant: {
          id: 'var-iphone-15-pm',
          productId: 'prod-iphone-15-pm',
          sku: 'IP15PM-256-NAT',
          price: 30000000,
          color: 'Titan Tự Nhiên',
          storage: '256GB',
          product: {
            id: 'prod-iphone-15-pm',
            name: 'iPhone 15 Pro Max',
          },
        },
        imeiDevice: {
          id: 'imei-device-1',
          imeiNumber: '358912345678901',
          status: 'LOCKED',
        },
      },
      {
        id: 'item-2',
        orderId: 'ord-100',
        variantId: 'var-iphone-15-pm',
        productName: 'iPhone 15 Pro Max',
        quantity: 1,
        unitPrice: 30000000,
        totalPrice: 30000000,
        variant: {
          id: 'var-iphone-15-pm',
          productId: 'prod-iphone-15-pm',
          sku: 'IP15PM-256-NAT',
          price: 30000000,
          color: 'Titan Tự Nhiên',
          storage: '256GB',
          product: {
            id: 'prod-iphone-15-pm',
            name: 'iPhone 15 Pro Max',
          },
        },
        imeiDevice: {
          id: 'imei-device-2',
          imeiNumber: '358912345678902',
          status: 'LOCKED',
        },
      },
    ],
  };

  it('groups multiple order items with the same variant into 1 card showing total quantity and all assigned IMEIs', async () => {
    vi.mocked(orderService.getAllOrdersAdmin).mockResolvedValue({
      data: [mockOrderWithIdenticalVariants],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    vi.mocked(orderService.getOrderById).mockResolvedValue(mockOrderWithIdenticalVariants);

    render(
      <MemoryRouter initialEntries={['/admin/orders']}>
        <AdminOrdersPage />
      </MemoryRouter>
    );

    // Wait for table to load
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Test')).toBeDefined();
    });

    // Click "Chi tiết" button to open modal
    const detailButton = screen.getByRole('button', { name: /Chi tiết/i });
    fireEvent.click(detailButton);

    // Modal title or header divider
    await waitFor(() => {
      expect(screen.getByText('Danh sách thiết bị & Mã IMEI định danh đã khóa')).toBeDefined();
    });

    // Grouped total quantity tag
    expect(screen.getByText('x2 máy')).toBeDefined();

    // Product name
    expect(screen.getByText('iPhone 15 Pro Max')).toBeDefined();

    // Subtitle check: Biến thể: Titan Tự Nhiên - 256GB • Đơn giá: ...
    expect(screen.getByText(/Biến thể:\s*Titan Tự Nhiên\s*-\s*256GB/i)).toBeDefined();

    // IMEI header check: Danh sách 2 mã IMEI định danh đã khóa (Đã gán 2/2 máy)
    expect(
      screen.getByText(/Danh sách 2 mã IMEI định danh đã khóa \(Đã gán 2\/2 máy\)/i)
    ).toBeDefined();

    // Check IMEI chips
    expect(screen.getByText('358912345678901')).toBeDefined();
    expect(screen.getByText('358912345678902')).toBeDefined();
    expect(screen.getByText('Máy 1')).toBeDefined();
    expect(screen.getByText('Máy 2')).toBeDefined();

    // Badges
    const assignedTags = screen.getAllByText('ĐÃ GÁN ĐƠN');
    expect(assignedTags.length).toBe(2);
  });

  it('supports collapsible view when there are more than 3 assigned IMEIs', async () => {
    const mockOrderWith4Imeis: Order = {
      ...mockOrderWithIdenticalVariants,
      id: 'ord-200',
      orderNumber: 'ORD-20002',
      items: [
        ...mockOrderWithIdenticalVariants.items,
        {
          id: 'item-3',
          orderId: 'ord-200',
          variantId: 'var-iphone-15-pm',
          productName: 'iPhone 15 Pro Max',
          quantity: 1,
          unitPrice: 30000000,
          totalPrice: 30000000,
          variant: {
            id: 'var-iphone-15-pm',
            productId: 'prod-iphone-15-pm',
            sku: 'IP15PM-256-NAT',
            price: 30000000,
            color: 'Titan Tự Nhiên',
            storage: '256GB',
          },
          imeiDevice: {
            id: 'imei-device-3',
            imeiNumber: '358912345678903',
            status: 'LOCKED',
          },
        },
        {
          id: 'item-4',
          orderId: 'ord-200',
          variantId: 'var-iphone-15-pm',
          productName: 'iPhone 15 Pro Max',
          quantity: 1,
          unitPrice: 30000000,
          totalPrice: 30000000,
          variant: {
            id: 'var-iphone-15-pm',
            productId: 'prod-iphone-15-pm',
            sku: 'IP15PM-256-NAT',
            price: 30000000,
            color: 'Titan Tự Nhiên',
            storage: '256GB',
          },
          imeiDevice: {
            id: 'imei-device-4',
            imeiNumber: '358912345678904',
            status: 'LOCKED',
          },
        },
      ],
    };

    vi.mocked(orderService.getAllOrdersAdmin).mockResolvedValue({
      data: [mockOrderWith4Imeis],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    vi.mocked(orderService.getOrderById).mockResolvedValue(mockOrderWith4Imeis);

    render(
      <MemoryRouter initialEntries={['/admin/orders']}>
        <AdminOrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Test')).toBeDefined();
    });

    const detailButton = screen.getByRole('button', { name: /Chi tiết/i });
    fireEvent.click(detailButton);

    await waitFor(() => {
      expect(screen.getByText('x4 máy')).toBeDefined();
    });

    expect(
      screen.getByText(/Danh sách 4 mã IMEI định danh đã khóa \(Đã gán 4\/4 máy\)/i)
    ).toBeDefined();

    // First 3 IMEIs are visible
    expect(screen.getByText('358912345678901')).toBeDefined();
    expect(screen.getByText('358912345678902')).toBeDefined();
    expect(screen.getByText('358912345678903')).toBeDefined();
    // 4th IMEI is collapsed
    expect(screen.queryByText('358912345678904')).toBeNull();

    // Expand button is shown
    const expandButton = screen.getByRole('button', { name: /Xem thêm \(1 máy\) ▾/i });
    expect(expandButton).toBeDefined();

    // Click expand
    fireEvent.click(expandButton);

    // Now all 4 IMEIs should be visible
    expect(screen.getByText('358912345678904')).toBeDefined();
    const collapseButton = screen.getByRole('button', { name: /Thu gọn ▴/i });
    expect(collapseButton).toBeDefined();

    // Click collapse
    fireEvent.click(collapseButton);
    expect(screen.queryByText('358912345678904')).toBeNull();
    expect(screen.getByRole('button', { name: /Xem thêm \(1 máy\) ▾/i })).toBeDefined();
  });
});
