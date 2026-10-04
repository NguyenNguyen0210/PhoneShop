import apiClient from './api';
import type { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../types/supplier';

export const supplierService = {
  async getSuppliers(activeOnly?: boolean): Promise<Supplier[]> {
    const params = activeOnly !== undefined ? { activeOnly: String(activeOnly) } : {};
    const res = await apiClient.get('/suppliers', { params });
    return res.data;
  },

  async getSupplierById(id: string): Promise<Supplier> {
    const res = await apiClient.get(`/suppliers/${id}`);
    return res.data;
  },

  async createSupplier(dto: CreateSupplierDto): Promise<Supplier> {
    const res = await apiClient.post('/suppliers', dto);
    return res.data;
  },

  async updateSupplier(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const res = await apiClient.patch(`/suppliers/${id}`, dto);
    return res.data;
  },

  async deleteSupplier(id: string): Promise<void> {
    await apiClient.delete(`/suppliers/${id}`);
  },
};
