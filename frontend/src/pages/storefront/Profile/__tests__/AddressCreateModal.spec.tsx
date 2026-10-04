// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddressCreateModal } from '../components/AddressCreateModal';
import { addressService } from '../../../../services/addressService';

vi.mock('../../../../services/addressService', () => ({
  addressService: {
    createAddress: vi.fn(),
  },
}));

describe('AddressCreateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with required fields', () => {
    render(<AddressCreateModal {...defaultProps} />);
    expect(screen.getByText('Thêm địa chỉ nhận hàng')).toBeDefined();
    expect(screen.getByLabelText(/Họ và tên người nhận/i)).toBeDefined();
    expect(screen.getByLabelText(/Số điện thoại/i)).toBeDefined();
    expect(screen.getByLabelText(/Tỉnh \/ Thành phố/i)).toBeDefined();
    expect(screen.getByLabelText(/Địa chỉ chi tiết/i)).toBeDefined();
  });

  it('validates Vietnamese phone number', async () => {
    render(<AddressCreateModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Họ và tên người nhận/i), {
      target: { value: 'Nguyen Van A' },
    });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText(/Tỉnh \/ Thành phố/i), {
      target: { value: 'Ho Chi Minh' },
    });
    fireEvent.change(screen.getByLabelText(/Địa chỉ chi tiết/i), {
      target: { value: '123 Le Loi' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu địa chỉ/i }));

    expect(await screen.findByText(/Số điện thoại không hợp lệ/i)).toBeDefined();
    expect(addressService.createAddress).not.toHaveBeenCalled();
  });

  it('calls addressService.createAddress with valid payload', async () => {
    const mockCreated = {
      id: 'addr-1',
      recipientName: 'Nguyen Van A',
      phone: '0901234567',
      addressLine1: '123 Le Loi',
      city: 'Ho Chi Minh',
      isDefault: true,
      type: 'HOME' as const,
      userId: 'user-1',
      country: 'Vietnam',
      createdAt: '',
      updatedAt: '',
    };
    vi.mocked(addressService.createAddress).mockResolvedValue(mockCreated);

    render(<AddressCreateModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Họ và tên người nhận/i), {
      target: { value: 'Nguyen Van A' },
    });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), {
      target: { value: '0901234567' },
    });
    fireEvent.change(screen.getByLabelText(/Tỉnh \/ Thành phố/i), {
      target: { value: 'Ho Chi Minh' },
    });
    fireEvent.change(screen.getByLabelText(/Địa chỉ chi tiết/i), {
      target: { value: '123 Le Loi' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu địa chỉ/i }));

    await waitFor(() => {
      expect(addressService.createAddress).toHaveBeenCalled();
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockCreated);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
