// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditProfileModal } from '../components/EditProfileModal';
import { authService } from '../../../../services/authService';
import type { User } from '../../../../types';

vi.mock('../../../../services/authService', () => ({
  authService: {
    updateProfile: vi.fn(),
  },
}));

vi.mock('../../../../utils/notify', () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  getErrorMessage: (err: unknown) => (err as any)?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
}));

import { notifyError } from '../../../../utils/notify';

describe('EditProfileModal', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'customer@gmail.com',
    fullName: 'Customer Nguyen',
    phone: '0901234567',
    role: 'USER',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    user: mockUser,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with initial user info when open', () => {
    render(<EditProfileModal {...defaultProps} />);

    expect(screen.getByText('Chỉnh sửa thông tin cá nhân')).toBeDefined();
    expect(screen.getByDisplayValue('Customer Nguyen')).toBeDefined();
    expect(screen.getByDisplayValue('0901234567')).toBeDefined();
    expect(screen.getByDisplayValue('customer@gmail.com')).toBeDefined();
  });

  it('validates empty fullName and shows error toast', async () => {
    render(<EditProfileModal {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Họ và tên/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Vui lòng nhập họ và tên của bạn.');
    });
    expect(authService.updateProfile).not.toHaveBeenCalled();
  });

  it('validates invalid phone number format', async () => {
    render(<EditProfileModal {...defaultProps} />);

    const phoneInput = screen.getByLabelText(/Số điện thoại/i);
    fireEvent.change(phoneInput, { target: { value: '12345' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith(
        expect.stringContaining('Số điện thoại không hợp lệ')
      );
    });
    expect(authService.updateProfile).not.toHaveBeenCalled();
  });

  it('calls authService.updateProfile on valid submission and triggers onSuccess', async () => {
    const updatedUser = {
      ...mockUser,
      fullName: 'Nguyen Van B',
      phone: '0987654321',
    };
    vi.mocked(authService.updateProfile).mockResolvedValue(updatedUser as any);

    render(<EditProfileModal {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Họ và tên/i);
    fireEvent.change(nameInput, { target: { value: 'Nguyen Van B' } });

    const phoneInput = screen.getByLabelText(/Số điện thoại/i);
    fireEvent.change(phoneInput, { target: { value: '0987654321' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.updateProfile).toHaveBeenCalledWith({
        firstName: 'Van B',
        lastName: 'Nguyen',
        phone: '0987654321',
      });
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(updatedUser);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows error toast when updateProfile fails', async () => {
    vi.mocked(authService.updateProfile).mockRejectedValue({
      response: {
        data: {
          message: 'Số điện thoại này đã được đăng ký bởi tài khoản khác.',
        },
      },
    });

    render(<EditProfileModal {...defaultProps} />);

    const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalled();
    });
  });
});
