// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminCustomersPage } from '../AdminCustomersPage';
import { customerService } from '../../../../services/customerService';
import { useAuthStore } from '../../../../stores/useAuthStore';

// Mock window.matchMedia for Ant Design
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

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../services/customerService', () => ({
  customerService: {
    getCustomers: vi.fn(),
    activateUser: vi.fn(),
    deactivateUser: vi.fn(),
    banUser: vi.fn(),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockCustomersData = [
  {
    id: 'c-1',
    email: 'vy.nguyenkhanh98@gmail.com',
    firstName: 'Vy',
    lastName: 'Nguyễn Khánh',
    phone: '0901234540',
    avatarUrl: null,
    status: 'ACTIVE' as const,
    createdAt: '2026-09-01T14:57:39.124Z',
    lastLoginAt: '2026-10-06T12:33:39.124Z',
    totalSpent: 71470000,
    orderCount: 3,
    lastOrderDate: '2026-09-16T17:56:05.790Z',
    loyaltyTier: 'VIP' as const,
  },
  {
    id: 'c-2',
    email: 'an.nguyen92@gmail.com',
    firstName: 'An',
    lastName: 'Nguyễn Văn',
    phone: '0903841928',
    avatarUrl: null,
    status: 'ACTIVE' as const,
    createdAt: '2026-02-15T10:00:00.000Z',
    lastLoginAt: '2026-10-05T08:00:00.000Z',
    totalSpent: 18500000,
    orderCount: 2,
    lastOrderDate: '2026-08-20T10:00:00.000Z',
    loyaltyTier: 'SILVER' as const,
  },
  {
    id: 'c-3',
    email: 'banned.user@gmail.com',
    firstName: 'Long',
    lastName: 'Đặng Thành',
    phone: '0948291038',
    avatarUrl: null,
    status: 'BANNED' as const,
    createdAt: '2026-03-01T10:00:00.000Z',
    lastLoginAt: null,
    totalSpent: 0,
    orderCount: 0,
    lastOrderDate: null,
    loyaltyTier: 'STANDARD' as const,
  },
];

describe('AdminCustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue({
      isAdmin: () => true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders reconciled database-wide KPI counts and retail CRM table columns', async () => {
    vi.mocked(customerService.getCustomers).mockResolvedValueOnce({
      data: mockCustomersData,
      total: 42,
      page: 1,
      limit: 10,
      totalPages: 5,
      stats: {
        total: 42,
        active: 40,
        inactive: 0,
        banned: 2,
      },
    });

    render(
      <BrowserRouter>
        <AdminCustomersPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Quản lý Khách hàng & Tra cứu 360°')).toBeTruthy();

    await waitFor(() => {
      // Reconciled KPI cards across all 42 accounts
      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('40')).toBeTruthy();
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);

      // Customer Names and Emails
      expect(screen.getByText('Nguyễn Khánh Vy')).toBeTruthy();
      expect(screen.getByText('vy.nguyenkhanh98@gmail.com')).toBeTruthy();
      expect(screen.getByText('Nguyễn Văn An')).toBeTruthy();

      // Retail CRM Badges and LTV
      expect(screen.getByText('VIP')).toBeTruthy();
      expect(screen.getByText('71.470.000 đ')).toBeTruthy();
      expect(screen.getByText('3 đơn')).toBeTruthy();

      expect(screen.getByText('Bạc')).toBeTruthy();
      expect(screen.getByText('18.500.000 đ')).toBeTruthy();
      expect(screen.getByText('2 đơn')).toBeTruthy();

      // Phone numbers
      expect(screen.getByText('0901234540')).toBeTruthy();
      expect(screen.getByText('0903841928')).toBeTruthy();
    });
  });

  it('opens mandatory lock modal when locking an account and submits reason', async () => {
    vi.mocked(customerService.getCustomers).mockResolvedValue({
      data: mockCustomersData,
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
      stats: { total: 3, active: 2, inactive: 0, banned: 1 },
    });
    vi.mocked(customerService.banUser).mockResolvedValueOnce({ success: true });

    render(
      <BrowserRouter>
        <AdminCustomersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Khánh Vy')).toBeTruthy();
    });

    // Find the more options button for the first customer
    const moreButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('.anticon-more'));
    expect(moreButtons.length).toBeGreaterThan(0);
    fireEvent.click(moreButtons[0]);

    // Click "Khóa tài khoản..." in dropdown menu
    await waitFor(() => {
      const banOption = screen.getByText('Khóa tài khoản...');
      expect(banOption).toBeTruthy();
      fireEvent.click(banOption);
    });

    // Modal should now be open
    await waitFor(() => {
      expect(screen.getByText('Thao tác có mức độ ảnh hưởng bảo mật')).toBeTruthy();
      expect(screen.getByText(/Lý do ghi nhận kiểm toán CRM/)).toBeTruthy();
    });

    // Enter lock reason
    const textarea = screen.getByPlaceholderText(/Nhập lý do chi tiết/);
    fireEvent.change(textarea, { target: { value: 'Nghi vấn lừa đảo giao dịch thẻ' } });

    // Click confirm lock
    const confirmButton = screen.getByText('Xác nhận khóa tài khoản');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(customerService.banUser).toHaveBeenCalledWith('c-1', 'Nghi vấn lừa đảo giao dịch thẻ');
    });
  });
});
