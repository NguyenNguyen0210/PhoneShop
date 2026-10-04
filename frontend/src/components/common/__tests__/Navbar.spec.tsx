// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useCartStore } from '../../../stores/useCartStore';
import { useWishlistStore } from '../../../stores/useWishlistStore';

vi.mock('../../../stores/useAuthStore');
vi.mock('../../../stores/useCartStore');
vi.mock('../../../stores/useWishlistStore');
const { mockUseNotificationStore } = vi.hoisted(() => {
  const mockFn: any = vi.fn((selector?: any) => {
    const state = { unreadCount: 0, startPolling: () => () => {} };
    return selector ? selector(state) : state;
  });
  mockFn.getState = vi.fn(() => ({
    unreadCount: 0,
    startPolling: () => () => {},
  }));
  return { mockUseNotificationStore: mockFn };
});

vi.mock('../../../stores/useNotificationStore', () => ({
  useNotificationStore: mockUseNotificationStore,
}));
vi.mock('../../../services/orderService', () => ({
  orderService: {
    getMyOrders: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../../services/voucherService', () => ({
  voucherService: {
    getActiveVouchers: vi.fn().mockResolvedValue([]),
  },
}));

describe('Navbar - User Menu Items', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCartStore).mockReturnValue({
      totalCount: () => 0,
    } as any);

    vi.mocked(useWishlistStore).mockReturnValue({
      items: [],
      fetchWishlist: vi.fn(),
    } as any);

    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: 'user-1',
        fullName: 'Customer Nguyen',
        email: 'customer@gmail.com',
        role: 'CUSTOMER',
      },
      logout: vi.fn(),
      isStaffOrAdmin: () => false,
    } as any);
  });

  it('contains "Đổi mật khẩu" linking to /profile#password and removes "Thiết bị & Bảo hành" from user dropdown', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      );
    });

    // Open user dropdown
    const userButton = screen.getByText('Customer Nguyen');
    await act(async () => {
      fireEvent.click(userButton);
    });

    // Should include "Đổi mật khẩu"
    const changePasswordLink = screen.getByText('Đổi mật khẩu');
    expect(changePasswordLink).toBeDefined();
    expect(changePasswordLink.closest('a')?.getAttribute('href')).toBe('/profile#password');

    // Should NOT have "Thiết bị & Bảo hành" in the user dropdown
    expect(screen.queryByText(/Thiết bị & Bảo hành/i)).toBeNull();
  });
});
