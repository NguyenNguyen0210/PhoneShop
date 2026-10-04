// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { message } from 'antd';
import { AdminImeiPage } from '../AdminImeiPage';
import { imeiService } from '../../../../services/imeiService';
import { productService } from '../../../../services/productService';
import { supplierService } from '../../../../services/supplierService';

// Mock ResizeObserver for Ant Design components
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

// Mock window.matchMedia for Ant Design in jsdom
beforeAll(() => {
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
});

vi.mock('../../../../services/imeiService', () => ({
  imeiService: {
    getImeis: vi.fn(),
    validateLuhn: vi.fn(),
    importImeis: vi.fn(),
    updateImeiStatus: vi.fn(),
  },
}));

vi.mock('../../../../services/productService', () => ({
  productService: {
    getAllProductsAdmin: vi.fn(),
  },
}));

vi.mock('../../../../services/supplierService', () => ({
  supplierService: {
    getSuppliers: vi.fn(),
  },
}));

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    message: {
      ...actual.message,
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

describe('AdminImeiPage - Supplier Dropdown Import Integration', () => {
  const mockProducts = [
    {
      id: 'prod-1',
      name: 'iPhone 15 Pro',
      variants: [
        {
          id: 'var-1',
          sku: 'IP15P-128-NAT',
          color: 'Titan Tự Nhiên',
          storage: '128GB',
          price: 25000000,
        },
      ],
    },
  ];

  const mockSuppliers = [
    {
      id: 'sup-1',
      name: 'Apple Vietnam',
      contactName: 'Nguyen Van A',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'sup-2',
      name: 'Digiworld',
      contactName: null,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(imeiService.getImeis).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    } as any);
    vi.mocked(productService.getAllProductsAdmin).mockResolvedValue({
      items: mockProducts as any,
      total: 1,
    } as any);
    vi.mocked(supplierService.getSuppliers).mockResolvedValue(mockSuppliers);
    vi.mocked(imeiService.validateLuhn).mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('loads active suppliers and renders them in the import modal dropdown', async () => {
    render(<AdminImeiPage />);

    // Open import modal
    const importBtn = screen.getByRole('button', { name: /Nhập lô IMEI/i });
    fireEvent.click(importBtn);

    // Modal title should appear
    expect(await screen.findByText(/Nhập lô mã IMEI \(Bulk Batch Import\)/i)).toBeDefined();

    // Verify supplierService.getSuppliers(true) was called
    expect(supplierService.getSuppliers).toHaveBeenCalledWith(true);

    // Verify supplier dropdown exists
    const supplierSelect = screen.getByLabelText(/Nhà cung cấp nhập hàng \(Tùy chọn\)/i);
    expect(supplierSelect).toBeDefined();

    // Open supplier dropdown and check options
    fireEvent.mouseDown(supplierSelect);

    const option1 = await screen.findByText('Apple Vietnam (Nguyen Van A)');
    const option2 = await screen.findByText('Digiworld');
    expect(option1).toBeDefined();
    expect(option2).toBeDefined();

    // Select a supplier
    fireEvent.click(option1);
  });

  it('submits IMEI import with selected supplier and includes supplier name in success message', async () => {
    vi.mocked(imeiService.importImeis).mockResolvedValue({ imported: 1, total: 1 } as any);

    render(<AdminImeiPage />);

    // Open import modal
    fireEvent.click(screen.getByRole('button', { name: /Nhập lô IMEI/i }));

    await screen.findByText(/Nhập lô mã IMEI \(Bulk Batch Import\)/i);

    // Select supplier
    const supplierSelect = screen.getByLabelText(/Nhà cung cấp nhập hàng \(Tùy chọn\)/i);
    fireEvent.mouseDown(supplierSelect);
    const option1 = await screen.findByText('Apple Vietnam (Nguyen Van A)');
    fireEvent.click(option1);

    // Enter IMEI list
    const imeiInput = screen.getByLabelText(/Danh sách mã IMEI/i);
    fireEvent.change(imeiInput, { target: { value: '353245081234567' } });

    // Submit import form
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận nhập kho/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(imeiService.importImeis).toHaveBeenCalledWith('var-1', ['353245081234567']);
      expect(message.success).toHaveBeenCalledWith(
        'Đã nhập thành công 1 thiết bị IMEI từ NCC Apple Vietnam vào kho!'
      );
    });
  });

  it('submits IMEI import without supplier and shows default success message', async () => {
    vi.mocked(imeiService.importImeis).mockResolvedValue({ imported: 1, total: 1 } as any);

    render(<AdminImeiPage />);

    fireEvent.click(screen.getByRole('button', { name: /Nhập lô IMEI/i }));

    await screen.findByText(/Nhập lô mã IMEI \(Bulk Batch Import\)/i);

    const imeiInput = screen.getByLabelText(/Danh sách mã IMEI/i);
    fireEvent.change(imeiInput, { target: { value: '353245081234567' } });

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận nhập kho/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(imeiService.importImeis).toHaveBeenCalledWith('var-1', ['353245081234567']);
      expect(message.success).toHaveBeenCalledWith(
        'Đã nhập thành công 1 thiết bị IMEI vào kho!'
      );
    });
  });
});
