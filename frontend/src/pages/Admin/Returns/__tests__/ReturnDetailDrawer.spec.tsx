// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ReturnDetailDrawer } from '../components/ReturnDetailDrawer';
import type { ReturnRequest } from '../../../../types';

// Mock useAuthStore
const mockUseAuthStore = vi.fn();
vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

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

// Mock ResizeObserver for Ant Design components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

const sampleReturn: ReturnRequest = {
  id: 'ret-101',
  orderId: 'ord-202',
  userId: 'usr-303',
  returnNumber: 'RET-1741-TEST',
  status: 'RECEIVED',
  reason: 'Màn hình bị sọc xanh ngang dọc',
  customerNote: 'Máy mới nhận hôm qua mở lên đã bị sọc, còn nguyên hộp và sạc',
  adminNote: 'Kiểm tra ngoại quan máy chưa trầy xước',
  requestedAt: '2026-10-01T10:00:00Z',
  receivedAt: '2026-10-02T14:00:00Z',
  order: {
    id: 'ord-202',
    orderNumber: 'ORD-9988',
    totalAmount: 25000000,
    status: 'DELIVERED',
    items: [],
    shippingAddress: {
      recipientName: 'Nguyen Van A',
      phone: '0987654321',
      addressLine: '123 Le Loi',
      ward: 'Ben Nghe',
      district: 'Quan 1',
      province: 'TP.HCM',
    },
    createdAt: '2026-09-28T09:00:00Z',
  } as any,
  user: {
    id: 'usr-303',
    email: 'khachhang@example.com',
    firstName: 'Van A',
    lastName: 'Nguyen',
  },
  items: [
    {
      id: 'item-1',
      returnId: 'ret-101',
      orderItemId: 'oi-1',
      quantity: 1,
      reason: 'Lỗi tấm nền OLED',
      condition: 'Nguyên vẹn',
    },
  ],
  refunds: [],
};

describe('ReturnDetailDrawer - Evidence & RBAC', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders return reasons, customer note evidence, and order info', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'STAFF' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={sampleReturn}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    expect(screen.getByText('RET-1741-TEST')).toBeDefined();
    expect(screen.getByText('Màn hình bị sọc xanh ngang dọc')).toBeDefined();
    expect(screen.getByText(/Máy mới nhận hôm qua mở lên đã bị sọc/)).toBeDefined();
    expect(screen.getByText(/Kiểm tra ngoại quan máy chưa trầy xước/)).toBeDefined();
    expect(screen.getByText('ORD-9988')).toBeDefined();
  });

  it('disables Complete and Refund buttons with lock icon for STAFF user', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'STAFF' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={sampleReturn}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    const completeBtn = screen.getByTestId('btn-complete-return');
    const refundBtn = screen.getByTestId('btn-create-refund');

    expect(completeBtn).toBeDefined();
    expect(completeBtn.hasAttribute('disabled')).toBe(true);

    expect(refundBtn).toBeDefined();
    expect(refundBtn.hasAttribute('disabled')).toBe(true);
  });

  it('enables Complete and Refund buttons for MANAGER user', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'MANAGER' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={sampleReturn}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    const completeBtn = screen.getByTestId('btn-complete-return');
    const refundBtn = screen.getByTestId('btn-create-refund');

    expect(completeBtn.hasAttribute('disabled')).toBe(false);
    expect(refundBtn.hasAttribute('disabled')).toBe(false);
  });

  it('enables Complete and Refund buttons for ADMIN user', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'ADMIN' },
    });

    render(
      <ReturnDetailDrawer
        open={true}
        returnRecord={sampleReturn}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    const completeBtn = screen.getByTestId('btn-complete-return');
    const refundBtn = screen.getByTestId('btn-create-refund');

    expect(completeBtn.hasAttribute('disabled')).toBe(false);
    expect(refundBtn.hasAttribute('disabled')).toBe(false);
  });

  it('renders status-based action buttons for REQUESTED status', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'STAFF' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={{ ...sampleReturn, status: 'REQUESTED' }}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    expect(screen.getByText('Duyệt tiếp nhận')).toBeDefined();
    expect(screen.getByText('Từ chối')).toBeDefined();
  });

  it('renders status-based action buttons for APPROVED status', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'STAFF' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={{ ...sampleReturn, status: 'APPROVED' }}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    expect(screen.getByText('Đang gửi về kho')).toBeDefined();
    expect(screen.getByText('Xác nhận nhận hàng')).toBeDefined();
  });

  it('renders status-based action buttons for SHIPPING status', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'STAFF' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={{ ...sampleReturn, status: 'SHIPPING' }}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    expect(screen.getByText('Xác nhận nhận hàng')).toBeDefined();
  });

  it('renders status-based action buttons for INSPECTING status', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'STAFF' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={{ ...sampleReturn, status: 'INSPECTING' }}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    expect(screen.getByText('Từ chối sau kiểm định')).toBeDefined();
    expect(screen.getByTestId('btn-complete-return')).toBeDefined();
    expect(screen.getByTestId('btn-create-refund')).toBeDefined();
  });

  it('returns null when returnRecord is null', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'STAFF' },
    });

    const { container } = render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={null}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
