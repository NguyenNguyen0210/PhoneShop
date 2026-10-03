import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addressService } from '../addressService';
import { apiClient } from '../apiClient';
import type { Address, CreateAddressPayload } from '../../types';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('addressService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAddress: Address = {
    id: 'addr-1',
    userId: 'user-1',
    type: 'HOME',
    recipientName: 'Nguyen Van A',
    phone: '0901234567',
    addressLine1: '123 Nguyen Hue',
    ward: 'Ben Nghe',
    district: 'Quan 1',
    city: 'Ho Chi Minh',
    country: 'Vietnam',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  describe('getAddresses', () => {
    it('should call GET /addresses and return array from res.data.data', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: [mockAddress] },
      });

      const result = await addressService.getAddresses();
      expect(apiClient.get).toHaveBeenCalledWith('/addresses');
      expect(result).toEqual([mockAddress]);
    });

    it('should handle direct array response in res.data', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: [mockAddress],
      });

      const result = await addressService.getAddresses();
      expect(result).toEqual([mockAddress]);
    });

    it('should return empty array if data is null/undefined', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: null,
      });

      const result = await addressService.getAddresses();
      expect(result).toEqual([]);
    });
  });

  describe('createAddress', () => {
    it('should call POST /addresses with payload and return created address', async () => {
      const payload: CreateAddressPayload = {
        recipientName: 'Nguyen Van A',
        phone: '0901234567',
        addressLine1: '123 Nguyen Hue',
        city: 'Ho Chi Minh',
        type: 'HOME',
        isDefault: true,
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { data: mockAddress },
      });

      const result = await addressService.createAddress(payload);
      expect(apiClient.post).toHaveBeenCalledWith('/addresses', payload);
      expect(result).toEqual(mockAddress);
    });
  });

  describe('setDefaultAddress', () => {
    it('should call PUT /addresses/:id/default and return updated address', async () => {
      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: { data: { ...mockAddress, isDefault: true } },
      });

      const result = await addressService.setDefaultAddress('addr-1');
      expect(apiClient.put).toHaveBeenCalledWith('/addresses/addr-1/default');
      expect(result.isDefault).toBe(true);
    });
  });

  describe('deleteAddress', () => {
    it('should call DELETE /addresses/:id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });

      await addressService.deleteAddress('addr-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/addresses/addr-1');
    });
  });
});
