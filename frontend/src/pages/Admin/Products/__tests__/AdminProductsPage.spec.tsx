// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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

    render(<AdminProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeDefined();
    });

    const editButtons = screen.getAllByRole('button', { name: /sửa/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(productService.getProductById).toHaveBeenCalledWith('prod-abc');
    });
  });
});
