// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminProductsPage } from '../AdminProductsPage';
import { productService } from '../../../../services/productService';

vi.mock('../../../../services/productService', () => ({
  productService: {
    getAllProductsAdmin: vi.fn(),
    getBrands: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn(),
    deleteProduct: vi.fn(),
    updateProduct: vi.fn(),
    createProduct: vi.fn(),
  },
}));

vi.mock('../../../../services/supplierService', () => ({
  supplierService: {
    getSuppliers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../../services/inventoryService', () => ({
  inventoryService: {
    getInventoryList: vi.fn().mockResolvedValue([]),
    getVariantLedger: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

afterEach(() => {
  cleanup();
});

describe('AdminProductsPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clicking "Sửa" button opens ProductEditModal with selected product ID', async () => {
    (productService.getAllProductsAdmin as any).mockResolvedValueOnce({
      items: [
        {
          id: 'prod-abc',
          name: 'Samsung Galaxy S24 Ultra',
          brand: { name: 'Samsung' },
          variants: [],
          status: 'ACTIVE',
        },
      ],
      total: 1,
    });
    (productService.getProductById as any).mockResolvedValueOnce({
      id: 'prod-abc',
      name: 'Samsung Galaxy S24 Ultra',
      variants: [],
      specs: {},
      status: 'ACTIVE',
    });

    render(
      <MemoryRouter>
        <AdminProductsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeDefined();
    });

    const editButtons = screen.getAllByRole('button', { name: /sửa/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(productService.getProductById).toHaveBeenCalledWith('prod-abc');
    });
  });

  it('clicking "Xem chi tiết" button opens ProductDetailDrawer with selected product ID', async () => {
    (productService.getAllProductsAdmin as any).mockResolvedValueOnce({
      items: [
        {
          id: 'prod-xyz',
          name: 'iPhone 16 Pro Max',
          brand: { name: 'Apple' },
          variants: [],
          status: 'ACTIVE',
        },
      ],
      total: 1,
    });
    (productService.getProductById as any).mockResolvedValueOnce({
      id: 'prod-xyz',
      name: 'iPhone 16 Pro Max',
      variants: [],
      specs: {},
      status: 'ACTIVE',
    });

    render(
      <MemoryRouter>
        <AdminProductsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('iPhone 16 Pro Max')).toBeDefined();
    });

    const detailButtons = screen.getAllByRole('button', { name: /xem chi tiết/i });
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(productService.getProductById).toHaveBeenCalledWith('prod-xyz');
    });

    await waitFor(() => {
      expect(screen.getByText('Tổng quan sản phẩm')).toBeDefined();
    });
  });
});
