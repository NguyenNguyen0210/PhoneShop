// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { orderService } from '../../../services/orderService';
import { voucherService } from '../../../services/voucherService';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { User } from '../../../types';

vi.mock('../../../services/orderService', () => ({
  orderService: { getMyOrders: vi.fn() },
}));

vi.mock('../../../services/voucherService', () => ({
  voucherService: { getActiveVouchers: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('../NotificationDropdown', () => ({
  NotificationDropdown: () => null,
}));

const customerUser = {
  id: 'u-1',
  email: 'customer@example.com',
  roles: ['USER'],
  fullName: 'Nguyen Nguyen',
} as unknown as User;

describe('Navbar orders badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: customerUser,
      accessToken: 'token',
      refreshToken: null,
      isLoading: false,
      error: null,
    });
  });

  it('does NOT label a freshly placed (PENDING) order as "Đang giao"', async () => {
    (orderService.getMyOrders as any).mockResolvedValue([
      { id: 'o-1', orderNumber: 'ORD-1', status: 'PENDING' },
    ]);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    );

    await waitFor(() => expect(orderService.getMyOrders).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Nguyen Nguyen'));

    await waitFor(() => {
      expect(screen.getByText('Đơn hàng của tôi')).toBeTruthy();
    });

    // The badge counts every unfinished order (PENDING..SHIPPING), so it must
    // not claim a PENDING order is already shipping.
    expect(screen.queryByText(/Đang giao/)).toBeNull();
    expect(screen.getByText(/1.*Đang xử lý/)).toBeTruthy();
  });
});
