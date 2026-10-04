// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddressesTab } from '../components/AddressesTab';
import { addressService } from '../../../../services/addressService';

vi.mock('../../../../services/addressService', () => ({
  addressService: {
    getAddresses: vi.fn(),
    setDefaultAddress: vi.fn(),
    deleteAddress: vi.fn(),
  },
}));

describe('AddressesTab', () => {
  const mockAddresses = [
    {
      id: 'addr-1',
      recipientName: 'Nguyen Van A',
      phone: '0901234567',
      addressLine1: '123 Le Loi',
      ward: 'Ben Nghe',
      district: 'Quan 1',
      city: 'Ho Chi Minh',
      isDefault: true,
      type: 'HOME' as const,
      userId: 'user-1',
      country: 'Vietnam',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'addr-2',
      recipientName: 'Nguyen Van B',
      phone: '0988776655',
      addressLine1: '456 Hai Ba Trung',
      city: 'Ho Chi Minh',
      isDefault: false,
      type: 'OFFICE' as const,
      userId: 'user-1',
      country: 'Vietnam',
      createdAt: '',
      updatedAt: '',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders address list with default badges', async () => {
    vi.mocked(addressService.getAddresses).mockResolvedValue(mockAddresses);

    render(<AddressesTab />);

    expect(await screen.findByText('Nguyen Van A')).toBeDefined();
    expect(screen.getByText(/0901234567/)).toBeDefined();
    expect(screen.getByText('Mặc định')).toBeDefined();
    expect(screen.getByText('Nguyen Van B')).toBeDefined();
  });

  it('calls setDefaultAddress when clicking "Đặt làm mặc định"', async () => {
    vi.mocked(addressService.getAddresses).mockResolvedValue(mockAddresses);
    vi.mocked(addressService.setDefaultAddress).mockResolvedValue(mockAddresses[1]);

    render(<AddressesTab />);

    const setDefaultBtn = await screen.findByRole('button', { name: /Đặt làm mặc định/i });
    fireEvent.click(setDefaultBtn);

    await waitFor(() => {
      expect(addressService.setDefaultAddress).toHaveBeenCalledWith('addr-2');
    });
  });

  it('calls deleteAddress with confirmation', async () => {
    vi.mocked(addressService.getAddresses).mockResolvedValue(mockAddresses);
    vi.mocked(addressService.deleteAddress).mockResolvedValue();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AddressesTab />);

    await screen.findByText('Nguyen Van A');
    const deleteButtons = screen.getAllByTitle('Xóa địa chỉ');
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(addressService.deleteAddress).toHaveBeenCalledWith('addr-1');
    });
    confirmSpy.mockRestore();
  });
});
