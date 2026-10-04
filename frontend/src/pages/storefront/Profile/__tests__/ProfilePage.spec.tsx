// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from '../ProfilePage';
import { useAuthStore } from '../../../../stores/useAuthStore';

vi.mock('../../../../stores/useAuthStore');
vi.mock('../../../../services/orderService', () => ({
  orderService: {
    getMyOrders: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../../../services/returnService', () => ({
  returnService: {
    getMyReturns: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../../../services/storageService', () => ({
  storageService: {
    uploadFile: vi.fn(),
  },
}));
vi.mock('../components/CustomerTicketsTab', () => ({
  CustomerTicketsTab: () => <div data-testid="mock-tickets-tab" />,
}));
vi.mock('../components/ChangePasswordCard', () => ({
  ChangePasswordCard: () => <div data-testid="mock-change-password" />,
}));

describe('ProfilePage - Personal Info & Phone Number', () => {
  const mockUser = {
    id: 'user-1',
    fullName: 'Customer Nguyen',
    email: 'customer@gmail.com',
    phone: '0901234567',
    role: 'USER',
    avatar: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      updateUser: vi.fn(),
      fetchProfile: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('renders phone number and personal info section', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Thông tin cá nhân')).toBeDefined();
    expect(screen.getByText('Họ và tên')).toBeDefined();
    expect(screen.getByText('Số điện thoại')).toBeDefined();
    expect(screen.getByText('0901234567')).toBeDefined();
    expect(screen.getByText('Địa chỉ Email')).toBeDefined();
    expect(screen.getAllByText('customer@gmail.com').length).toBeGreaterThanOrEqual(1);
  });

  it('renders "Chưa cập nhật" when user does not have a phone number', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { ...mockUser, phone: undefined },
      updateUser: vi.fn(),
      fetchProfile: vi.fn().mockResolvedValue(undefined),
    } as any);

    await act(async () => {
      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Chưa cập nhật')).toBeDefined();
  });

  it('opens EditProfileModal when clicking "Chỉnh sửa thông tin"', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );
    });

    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa thông tin/i });
    await act(async () => {
      fireEvent.click(editBtn);
    });

    expect(screen.getByText('Chỉnh sửa thông tin cá nhân')).toBeDefined();
  });
});

