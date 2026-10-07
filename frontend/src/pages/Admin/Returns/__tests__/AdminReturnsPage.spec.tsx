// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminReturnsPage } from '../AdminReturnsPage';
import { returnService } from '../../../../services/returnService';

// Mock window.matchMedia for Ant Design components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock ResizeObserver for Ant Design Table / Tabs
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../services/returnService', () => ({
  returnService: {
    getAllReturnsAdmin: vi.fn(),
    getReturnDetailAdmin: vi.fn(),
    approveReturn: vi.fn(),
    rejectReturn: vi.fn(),
    markShippingReturn: vi.fn(),
    receiveReturn: vi.fn(),
    inspectReturn: vi.fn(),
    completeReturn: vi.fn(),
    createRefund: vi.fn(),
    processRefund: vi.fn(),
    completeRefund: vi.fn(),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { role: 'STAFF' },
  }),
}));

const mockReturns = [
  {
    id: 'ret-1',
    orderId: 'ord-1',
    userId: 'usr-1',
    returnNumber: 'RET-001',
    status: 'REQUESTED',
    reason: 'Hỏng loa thoại',
    customerNote: 'Loa rè không nghe rõ',
    requestedAt: '2026-10-01T10:00:00Z',
    items: [
      {
        id: 'item-1',
        quantity: 1,
        orderItem: {
          productName: 'iPhone 15 Pro Max',
          unitPrice: 15000000,
          variant: { storage: '256GB' },
          imeiDevice: { imei: '864920192847101' },
        },
      },
    ],
    order: { orderNumber: 'ORD-101', totalAmount: 15000000, customerName: 'Nguyễn Văn A', shippingPhone: '0903123456' },
    user: { email: 'customer1@test.com' },
    refunds: [],
  },
  {
    id: 'ret-2',
    orderId: 'ord-2',
    userId: 'usr-2',
    returnNumber: 'RET-002',
    status: 'RECEIVED',
    reason: 'Lỗi pin phồng',
    customerNote: 'Pin tụt nhanh',
    requestedAt: '2026-10-02T10:00:00Z',
    items: [
      {
        id: 'item-2',
        quantity: 1,
        orderItem: {
          productName: 'Galaxy S24 Ultra',
          unitPrice: 20000000,
          variant: { storage: '512GB' },
          imeiDevice: { imei: '864920192847102' },
        },
      },
    ],
    order: { orderNumber: 'ORD-102', totalAmount: 20000000, customerName: 'Trần Thị B', shippingPhone: '0903654321' },
    user: { email: 'customer2@test.com' },
    refunds: [
      {
        id: 'ref-1',
        refundNumber: 'REF-001',
        amount: 20000000,
        status: 'COMPLETED',
        createdAt: '2026-10-02T12:00:00Z',
      },
    ],
  },
];

describe('AdminReturnsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders returns table and loads data', async () => {
    vi.mocked(returnService.getAllReturnsAdmin).mockResolvedValueOnce(mockReturns as any);

    render(<MemoryRouter><AdminReturnsPage /></MemoryRouter>);

    expect(screen.getByText('Quản lý Đổi trả & Hoàn tiền')).toBeDefined();
    expect(screen.getByText('Làm mới')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('#RET-001')).toBeDefined();
      expect(screen.getByText('#RET-002')).toBeDefined();
      expect(screen.getByText('Đơn: #ORD-101')).toBeDefined();
      expect(screen.getByText('Đơn: #ORD-102')).toBeDefined();
      expect(screen.getByText('Hỏng loa thoại')).toBeDefined();
      expect(screen.getByText('Lỗi pin phồng')).toBeDefined();
      // Thiết bị & IMEI hiển thị thay vì chỉ đếm số lượng
      expect(screen.getByText(/iPhone 15 Pro Max/)).toBeDefined();
      expect(screen.getByText(/IMEI: 864920192847101/)).toBeDefined();
      // Tên + SĐT khách hàng thay vì chỉ email
      expect(screen.getByText('Nguyễn Văn A')).toBeDefined();
      expect(screen.getByText('0903123456')).toBeDefined();
    });
  });

  it('shows return method badge (exchange vs refund)', async () => {
    vi.mocked(returnService.getAllReturnsAdmin).mockResolvedValueOnce(mockReturns as any);

    render(<MemoryRouter><AdminReturnsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getAllByText(/Trả hàng & Hoàn tiền/).length).toBeGreaterThan(0);
    });
  });

  it('filters data by search input', async () => {
    vi.mocked(returnService.getAllReturnsAdmin).mockResolvedValueOnce(mockReturns as any);

    render(<MemoryRouter><AdminReturnsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('#RET-001')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Tìm theo mã yêu cầu (RET), mã đơn, SĐT khách hàng...');
    fireEvent.change(searchInput, { target: { value: 'loa' } });

    await waitFor(() => {
      expect(screen.getByText('#RET-001')).toBeDefined();
      expect(screen.queryByText('#RET-002')).toBeNull();
    });
  });

  it('filters data by status tab', async () => {
    vi.mocked(returnService.getAllReturnsAdmin).mockResolvedValueOnce(mockReturns as any);

    render(<MemoryRouter><AdminReturnsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('#RET-001')).toBeDefined();
      expect(screen.getByText('#RET-002')).toBeDefined();
    });

    // Click on grouped tab: "Vận chuyển thiết bị (1)" chứa RECEIVED
    const transitTab = screen.getByText(/Vận chuyển thiết bị/);
    fireEvent.click(transitTab);

    await waitFor(() => {
      expect(screen.queryByText('#RET-001')).toBeNull();
      expect(screen.getByText('#RET-002')).toBeDefined();
    });
  });

  it('opens detail drawer when clicking action button', async () => {
    vi.mocked(returnService.getAllReturnsAdmin).mockResolvedValueOnce(mockReturns as any);

    render(<MemoryRouter><AdminReturnsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('#RET-001')).toBeDefined();
    });

    // REQUESTED → nút "Tiếp nhận"; RECEIVED → nút "Chi tiết"
    const receiveButtons = screen.getAllByRole('button', { name: /Tiếp nhận/i });
    expect(receiveButtons.length).toBeGreaterThan(0);
    fireEvent.click(receiveButtons[0]);

    await waitFor(() => {
      // The drawer opens showing return details
      expect(screen.getByText(/Thông tin Đơn hàng & Khách hàng/i)).toBeDefined();
    });
  });

  it('reloads data when clicking "Làm mới" button', async () => {
    vi.mocked(returnService.getAllReturnsAdmin).mockResolvedValue(mockReturns as any);

    render(<MemoryRouter><AdminReturnsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('#RET-001')).toBeDefined();
    });

    const refreshBtn = screen.getByRole('button', { name: /Làm mới/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(returnService.getAllReturnsAdmin).toHaveBeenCalledTimes(2);
    });
  });
});
