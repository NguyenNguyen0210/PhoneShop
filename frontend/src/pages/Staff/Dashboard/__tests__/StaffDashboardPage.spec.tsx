// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { StaffDashboardPage } from '../StaffDashboardPage';

// Import services to verify mocks and call assertions
import { orderService } from '../../../../services/orderService';
import { ticketService } from '../../../../services/ticketService';
import { returnService } from '../../../../services/returnService';
import { installmentService } from '../../../../services/installmentService';
import { inventoryService } from '../../../../services/inventoryService';
import { reportService } from '../../../../services/reportService';

declare module 'vitest' {
  interface Assertion<R extends void | Promise<void>, T> {
    toBeInTheDocument(): R;
  }
}

expect.extend({
  toBeInTheDocument(received) {
    const pass =
      received !== null &&
      received !== undefined &&
      (document.body.contains(received as Node) || false);
    return {
      pass,
      message: () => `expected element ${pass ? 'not ' : ''}to be in document`,
    };
  },
});

// Mock matchMedia and ResizeObserver for Ant Design components in JSDOM
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

// Mock the services
vi.mock('../../../../services/orderService', () => ({
  orderService: {
    getAllOrdersAdmin: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}));

vi.mock('../../../../services/ticketService', () => ({
  ticketService: {
    getAdminTickets: vi.fn(),
  },
}));

vi.mock('../../../../services/returnService', () => ({
  returnService: {
    getAdminReturns: vi.fn(),
    getAllReturnsAdmin: vi.fn(),
  },
}));

vi.mock('../../../../services/installmentService', () => ({
  installmentService: {
    getInstallments: vi.fn(),
    getAdminInstallments: vi.fn(),
  },
}));

vi.mock('../../../../services/inventoryService', () => ({
  inventoryService: {
    getStockLevels: vi.fn(),
    getInventoryList: vi.fn(),
  },
}));

vi.mock('../../../../services/reportService', () => ({
  reportService: {
    getDashboardSummary: vi.fn(),
    getRevenueReport: vi.fn(),
    getOrderStatusReport: vi.fn(),
    getBrandSalesReport: vi.fn(),
    getTopSellingProducts: vi.fn(),
    getLowStockReport: vi.fn(),
  },
}));

describe('StaffDashboardPage', () => {
  const mockOrders = [
    {
      id: 'order-1',
      orderNumber: 'ORD-1001',
      customerName: 'Nguyễn Văn A',
      shippingPhone: '0901234567',
      totalAmount: 15000000,
      status: 'PENDING',
    },
    {
      id: 'order-2',
      orderNumber: 'ORD-1002',
      customerName: 'Trần Thị B',
      shippingPhone: '0912345678',
      totalAmount: 25000000,
      status: 'CONFIRMED',
    },
    {
      id: 'order-3',
      orderNumber: 'ORD-1003',
      customerName: 'Lê Văn C',
      shippingPhone: '0923456789',
      totalAmount: 8500000,
      status: 'PROCESSING',
    },
  ];

  const mockTickets = {
    items: [
      {
        id: 'ticket-1',
        code: 'TK-101',
        title: 'Màn hình bị sọc xanh',
        priority: 'URGENT',
        status: 'OPEN',
        user: { fullName: 'Phạm Thị D' },
      },
      {
        id: 'ticket-2',
        code: 'TK-102',
        title: 'Hỗ trợ đổi trả hàng',
        priority: 'HIGH',
        status: 'OPEN',
        user: { fullName: 'Hoàng Văn E' },
      },
    ],
    total: 7,
  };

  const mockReturns = {
    items: [
      { id: 'ret-1', status: 'PENDING' },
      { id: 'ret-2', status: 'PENDING' },
      { id: 'ret-3', status: 'PENDING' },
    ],
    total: 3,
  };

  const mockInstallments = {
    items: [
      { id: 'inst-1', status: 'SUBMITTED' },
      { id: 'inst-2', status: 'SUBMITTED' },
      { id: 'inst-3', status: 'SUBMITTED' },
      { id: 'inst-4', status: 'SUBMITTED' },
    ],
    total: 4,
  };

  const mockInventory = [
    {
      id: 'inv-1',
      variantId: 'var-1',
      quantity: 2,
      availableQty: 2,
      reservedQty: 0,
      reorderLevel: 5,
      variant: {
        id: 'var-1',
        sku: 'IP15PM-256',
        color: 'Titan Tự Nhiên',
        storage: '256GB',
        price: 29000000,
        product: { id: 'prod-1', name: 'iPhone 15 Pro Max' },
      },
    },
    {
      id: 'inv-2',
      variantId: 'var-2',
      quantity: 30,
      availableQty: 25,
      reservedQty: 5,
      reorderLevel: 10,
      variant: {
        id: 'var-2',
        sku: 'SS-S24U-512',
        color: 'Xám Titan',
        storage: '512GB',
        price: 31000000,
        product: { id: 'prod-2', name: 'Samsung Galaxy S24 Ultra' },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(orderService.getAllOrdersAdmin).mockResolvedValue({
      data: mockOrders,
      total: mockOrders.length,
      page: 1,
      limit: 10,
      totalPages: 1,
    } as any);

    vi.mocked(ticketService.getAdminTickets).mockResolvedValue(mockTickets as any);
    vi.mocked(returnService.getAdminReturns).mockResolvedValue(mockReturns as any);
    vi.mocked(installmentService.getInstallments).mockResolvedValue(mockInstallments as any);
    vi.mocked(inventoryService.getStockLevels).mockResolvedValue(mockInventory as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('CRITICAL: NEVER calls reportService to avoid 403 Forbidden', async () => {
    render(
      <BrowserRouter>
        <StaffDashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bảng Vận Hành Nhân Viên')).toBeInTheDocument();
    });

    // Verify operational services were called
    expect(orderService.getAllOrdersAdmin).toHaveBeenCalledTimes(1);
    expect(ticketService.getAdminTickets).toHaveBeenCalledWith({ status: 'OPEN', limit: 10 });
    expect(returnService.getAdminReturns).toHaveBeenCalledWith({ status: 'PENDING', limit: 10 });
    expect(installmentService.getInstallments).toHaveBeenCalledWith({ status: 'SUBMITTED', limit: 10 });
    expect(inventoryService.getStockLevels).toHaveBeenCalledWith({ limit: 50 });

    // CRITICAL: reportService must NEVER be called
    expect(reportService.getDashboardSummary).not.toHaveBeenCalled();
    expect(reportService.getRevenueReport).not.toHaveBeenCalled();
    expect(reportService.getOrderStatusReport).not.toHaveBeenCalled();
    expect(reportService.getBrandSalesReport).not.toHaveBeenCalled();
    expect(reportService.getTopSellingProducts).not.toHaveBeenCalled();
    expect(reportService.getLowStockReport).not.toHaveBeenCalled();
  });

  it('renders all 5 counter cards with correct counts, titles, and navigation links', async () => {
    render(
      <BrowserRouter>
        <StaffDashboardPage />
      </BrowserRouter>
    );

    // 1. Pending orders (1 order with status PENDING)
    await waitFor(() => {
      expect(screen.getByText('Đơn chờ xác nhận')).toBeInTheDocument();
    });
    const pendingCard = screen.getByTestId('card-pending-orders');
    expect(pendingCard).toBeInTheDocument();
    expect(pendingCard.closest('a')?.getAttribute('href')).toBe('/staff/orders?status=PENDING');
    expect(screen.getByTestId('card-pending-orders-count').textContent).toContain('1');

    // 2. Packing orders (1 CONFIRMED + 1 PROCESSING = 2 orders)
    expect(screen.getByText('Đơn cần đóng gói')).toBeInTheDocument();
    const packingCard = screen.getByTestId('card-packing-orders');
    expect(packingCard).toBeInTheDocument();
    expect(packingCard.closest('a')?.getAttribute('href')).toBe('/staff/orders?status=CONFIRMED');
    expect(screen.getByTestId('card-packing-orders-count').textContent).toContain('2');

    // 3. Open tickets (7 total tickets)
    expect(screen.getByText('Ticket CSKH chờ phản hồi')).toBeInTheDocument();
    const ticketsCard = screen.getByTestId('card-open-tickets');
    expect(ticketsCard).toBeInTheDocument();
    expect(ticketsCard.closest('a')?.getAttribute('href')).toBe('/staff/tickets?status=OPEN');
    expect(screen.getByTestId('card-open-tickets-count').textContent).toContain('7');

    // 4. Pending returns (3 pending returns)
    expect(screen.getByText('Đổi trả chờ xử lý')).toBeInTheDocument();
    const returnsCard = screen.getByTestId('card-pending-returns');
    expect(returnsCard).toBeInTheDocument();
    expect(returnsCard.closest('a')?.getAttribute('href')).toBe('/staff/returns?status=PENDING');
    expect(screen.getByTestId('card-pending-returns-count').textContent).toContain('3');

    // 5. Submitted installments (4 submitted installments)
    expect(screen.getByText('Hồ sơ trả góp')).toBeInTheDocument();
    const installmentsCard = screen.getByTestId('card-submitted-installments');
    expect(installmentsCard).toBeInTheDocument();
    expect(installmentsCard.closest('a')?.getAttribute('href')).toBe('/staff/installments?status=SUBMITTED');
    expect(screen.getByTestId('card-submitted-installments-count').textContent).toContain('4');
  });

  it('renders orders queue with required columns and action buttons', async () => {
    render(
      <BrowserRouter>
        <StaffDashboardPage />
      </BrowserRouter>
    );

    // Queue card header & link
    await waitFor(() => {
      expect(screen.getByText('Hàng đợi Đơn hàng Cần xử lý')).toBeInTheDocument();
    });
    const allOrdersLink = screen.getByTestId('link-all-orders');
    expect(allOrdersLink).toBeInTheDocument();
    expect(allOrdersLink.getAttribute('href')).toBe('/staff/orders');

    // Columns
    expect(screen.getByText('Mã đơn')).toBeInTheDocument();
    expect(screen.getByText('Khách hàng')).toBeInTheDocument();
    expect(screen.getByText('Tổng tiền')).toBeInTheDocument();
    expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    expect(screen.getByText('Thao tác nhanh')).toBeInTheDocument();

    // Rows
    expect(screen.getByText('ORD-1001')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('ORD-1002')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument();

    // Confirm button for PENDING order
    const confirmBtn = screen.getByTestId('confirm-btn-order-1');
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn.textContent).toContain('Xác nhận');

    // Pack button for CONFIRMED order
    const packBtn = screen.getByTestId('pack-btn-order-2');
    expect(packBtn).toBeInTheDocument();
    expect(packBtn.textContent).toContain('Đóng gói');

    // Chi tiết button
    const detailBtn1 = screen.getByTestId('detail-btn-order-1');
    expect(detailBtn1).toBeInTheDocument();
    expect(detailBtn1.textContent).toContain('Chi tiết');
  });

  it('handles quick actions: confirms PENDING order and packs CONFIRMED order', async () => {
    vi.mocked(orderService.updateOrderStatus).mockResolvedValue({} as any);

    render(
      <BrowserRouter>
        <StaffDashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('confirm-btn-order-1')).toBeInTheDocument();
    });

    // Click Confirm on order-1
    fireEvent.click(screen.getByTestId('confirm-btn-order-1'));
    await waitFor(() => {
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith('order-1', 'confirm');
    });

    // Click Pack on order-2
    fireEvent.click(screen.getByTestId('pack-btn-order-2'));
    await waitFor(() => {
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith('order-2', 'pack');
    });
  });

  it('renders alerts sidebar with low stock items and open tickets', async () => {
    render(
      <BrowserRouter>
        <StaffDashboardPage />
      </BrowserRouter>
    );

    // Card 1: Cảnh báo sắp hết kho
    await waitFor(() => {
      expect(screen.getByText('Cảnh báo sắp hết kho')).toBeInTheDocument();
    });
    // Low stock item: iPhone 15 Pro Max (available 2 <= reorder 5)
    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getByText('Nguy cấp')).toBeInTheDocument();
    // Normal stock item Samsung Galaxy S24 Ultra (available 25 > 10) must NOT be in low stock
    expect(screen.queryByText('Samsung Galaxy S24 Ultra')).toBeNull();

    // Card 2: Ticket CSKH mới mở
    expect(screen.getByText('Ticket CSKH mới mở')).toBeInTheDocument();
    expect(screen.getByText('Màn hình bị sọc xanh')).toBeInTheDocument();
    expect(screen.getByText('Khẩn cấp')).toBeInTheDocument();
    expect(screen.getByText('Hỗ trợ đổi trả hàng')).toBeInTheDocument();
    expect(screen.getByText('Ưu tiên cao')).toBeInTheDocument();

    // Ticket links to /staff/tickets/:id
    const ticketLink1 = screen.getByTestId('ticket-link-ticket-1');
    expect(ticketLink1.getAttribute('href')).toBe('/staff/tickets/ticket-1');
    const ticketLink2 = screen.getByTestId('ticket-link-ticket-2');
    expect(ticketLink2.getAttribute('href')).toBe('/staff/tickets/ticket-2');
  });

  it('shows error alert with retry button when a service fails, and refetches when clicked', async () => {
    vi.mocked(ticketService.getAdminTickets).mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <StaffDashboardPage />
      </BrowserRouter>
    );

    // Error alert should appear
    await waitFor(() => {
      expect(screen.getByText('Lỗi tải dữ liệu')).toBeInTheDocument();
      expect(screen.getByTestId('retry-btn')).toBeInTheDocument();
    });

    // Reset mock to succeed on retry
    vi.mocked(ticketService.getAdminTickets).mockResolvedValueOnce(mockTickets as any);

    // Click retry button
    fireEvent.click(screen.getByTestId('retry-btn'));

    await waitFor(() => {
      expect(ticketService.getAdminTickets).toHaveBeenCalledTimes(2);
    });
  });

  it('refetches data when the top Refresh button is clicked', async () => {
    render(
      <BrowserRouter>
        <StaffDashboardPage />
      </BrowserRouter>
    );

    // Wait until initial loading completes
    await waitFor(() => {
      expect(screen.getByText('Bảng Vận Hành Nhân Viên')).toBeInTheDocument();
      expect(screen.getByTestId('card-pending-orders-count')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /làm mới/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(orderService.getAllOrdersAdmin).toHaveBeenCalledTimes(2);
    });
  });
});
