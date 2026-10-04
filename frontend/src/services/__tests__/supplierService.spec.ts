import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supplierService } from '../supplierService';
import { apiClient } from '../apiClient';
import type { CreateSupplierDto, UpdateSupplierDto, Supplier } from '../../types/supplier';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('supplierService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSuppliers', () => {
    it('calls GET /suppliers without activeOnly param when not provided', async () => {
      const mockSuppliers: Supplier[] = [
        {
          id: 'sup-1',
          name: 'Supplier A',
          contactName: 'John',
          email: 'a@example.com',
          phone: '0123456789',
          address: 'Hanoi',
          taxCode: 'TAX01',
          isActive: true,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSuppliers });

      const result = await supplierService.getSuppliers();

      expect(apiClient.get).toHaveBeenCalledWith('/suppliers', { params: {} });
      expect(result).toEqual(mockSuppliers);
    });

    it('calls GET /suppliers with activeOnly param when provided', async () => {
      const mockSuppliers: Supplier[] = [
        {
          id: 'sup-1',
          name: 'Supplier A',
          isActive: true,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockSuppliers } });

      const result = await supplierService.getSuppliers(true);

      expect(apiClient.get).toHaveBeenCalledWith('/suppliers', {
        params: { activeOnly: 'true' },
      });
      expect(result).toEqual(mockSuppliers);
    });
  });

  describe('getSupplierById', () => {
    it('calls GET /suppliers/:id and returns supplier', async () => {
      const mockSupplier: Supplier = {
        id: 'sup-1',
        name: 'Supplier A',
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockSupplier } });

      const result = await supplierService.getSupplierById('sup-1');

      expect(apiClient.get).toHaveBeenCalledWith('/suppliers/sup-1');
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('createSupplier', () => {
    it('calls POST /suppliers with dto and returns created supplier', async () => {
      const dto: CreateSupplierDto = {
        name: 'Supplier New',
        contactName: 'Alice',
        email: 'alice@example.com',
        phone: '0987654321',
        address: 'HCM',
        taxCode: 'TAX99',
      };
      const createdSupplier: Supplier = {
        id: 'sup-2',
        ...dto,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: createdSupplier } });

      const result = await supplierService.createSupplier(dto);

      expect(apiClient.post).toHaveBeenCalledWith('/suppliers', dto);
      expect(result).toEqual(createdSupplier);
    });
  });

  describe('updateSupplier', () => {
    it('calls PATCH /suppliers/:id with dto and returns updated supplier', async () => {
      const dto: UpdateSupplierDto = {
        name: 'Supplier Updated',
        isActive: false,
      };
      const updatedSupplier: Supplier = {
        id: 'sup-1',
        name: 'Supplier Updated',
        isActive: false,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
      };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { data: updatedSupplier } });

      const result = await supplierService.updateSupplier('sup-1', dto);

      expect(apiClient.patch).toHaveBeenCalledWith('/suppliers/sup-1', dto);
      expect(result).toEqual(updatedSupplier);
    });
  });

  describe('deleteSupplier', () => {
    it('calls DELETE /suppliers/:id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

      await supplierService.deleteSupplier('sup-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/suppliers/sup-1');
    });
  });
});
