// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminSuppliersPage } from '../AdminSuppliersPage';
import { supplierService } from '../../../../services/supplierService';
import type { Supplier } from '../../../../types/supplier';

// Mock matchMedia for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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

(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../../../services/supplierService', () => ({
  supplierService: {
    getSuppliers: vi.fn(),
    getSupplierById: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    deleteSupplier: vi.fn(),
  },
}));

const mockSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Công ty Cổ phần Apple Việt Nam',
    contactName: 'Nguyễn Văn A',
    email: 'apple@example.com',
    phone: '0901234567',
    address: 'Hà Nội',
    taxCode: '0101234567',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sup-2',
    name: 'Samsung Electronics Vietnam',
    contactName: 'Trần Thị B',
    email: 'samsung@example.com',
    phone: '0987654321',
    address: 'Bắc Ninh',
    taxCode: '2300123456',
    isActive: false,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('AdminSuppliersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supplierService.getSuppliers).mockResolvedValue(mockSuppliers);
  });

  it('renders KPI cards and table with suppliers data', async () => {
    render(<AdminSuppliersPage />);

    expect(screen.getByText('Quản lý Nhà cung cấp')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Công ty Cổ phần Apple Việt Nam')).toBeDefined();
      expect(screen.getByText('Samsung Electronics Vietnam')).toBeDefined();
    });

    // Check KPI counts and labels
    expect(screen.getByText('Tổng nhà cung cấp')).toBeDefined();
    expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ngừng hoạt động').length).toBeGreaterThan(0);

    // Check Tax code tag and contact person
    expect(screen.getByText('MST: 0101234567')).toBeDefined();
    expect(screen.getByText('Nguyễn Văn A')).toBeDefined();
    expect(screen.getByText('Trần Thị B')).toBeDefined();
  });

  it('filters table by search keyword', async () => {
    render(<AdminSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Cổ phần Apple Việt Nam')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên, người liên hệ/i);

    // Search by name
    fireEvent.change(searchInput, { target: { value: 'Apple' } });
    expect(screen.getByText('Công ty Cổ phần Apple Việt Nam')).toBeDefined();
    expect(screen.queryByText('Samsung Electronics Vietnam')).toBeNull();

    // Search by phone
    fireEvent.change(searchInput, { target: { value: '0987654321' } });
    expect(screen.getByText('Samsung Electronics Vietnam')).toBeDefined();
    expect(screen.queryByText('Công ty Cổ phần Apple Việt Nam')).toBeNull();

    // Search by tax code
    fireEvent.change(searchInput, { target: { value: '0101234567' } });
    expect(screen.getByText('Công ty Cổ phần Apple Việt Nam')).toBeDefined();
    expect(screen.queryByText('Samsung Electronics Vietnam')).toBeNull();
  });

  it('opens create modal on "+ Thêm nhà cung cấp mới" click', async () => {
    render(<AdminSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Cổ phần Apple Việt Nam')).toBeDefined();
    });

    const addButton = screen.getByRole('button', { name: /\+ Thêm nhà cung cấp mới/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm mới nhà cung cấp')).toBeDefined();
    });
  });

  it('calls deleteSupplier on confirm', async () => {
    vi.mocked(supplierService.deleteSupplier).mockResolvedValue(undefined as any);

    render(<AdminSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Cổ phần Apple Việt Nam')).toBeDefined();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /Xóa nhà cung cấp/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/Bạn có chắc chắn muốn xóa "Công ty Cổ phần Apple Việt Nam"\?/)
      ).toBeDefined();
    });

    const confirmButton = screen.getByRole('button', { name: 'Xóa' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(supplierService.deleteSupplier).toHaveBeenCalledWith('sup-1');
    });
  });
});
