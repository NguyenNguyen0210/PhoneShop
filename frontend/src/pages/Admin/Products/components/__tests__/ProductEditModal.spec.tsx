// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { ProductEditModal } from '../ProductEditModal';
import { productService } from '../../../../../services/productService';

vi.mock('../../../../../services/productService', () => ({
  productService: {
    getProductById: vi.fn(),
    getBrands: vi.fn().mockResolvedValue([
      { id: 'br-1', name: 'Apple' },
      { id: 'br-2', name: 'Samsung' },
    ]),
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-1', name: 'Điện thoại' },
    ]),
    updateProduct: vi.fn(),
  },
}));

// Mock ResizeObserver for Ant Design Tabs
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

const mockProduct = {
  id: 'prod-101',
  name: 'iPhone 16 Pro Max',
  slug: 'iphone-16-pro-max',
  description: 'Flagship phone from Apple with A18 Pro',
  brandId: 'br-1',
  categoryId: 'cat-1',
  status: 'ACTIVE',
  condition: 'NEW',
  warrantyMonths: 12,
  thumbnailUrl: 'https://example.com/thumb.png',
  variants: [
    {
      id: 'var-1',
      productId: 'prod-101',
      sku: 'IP16PM-256',
      name: 'iPhone 16 Pro Max 256GB Titan',
      color: 'Titan Tự Nhiên',
      storage: '256GB',
      ram: '8GB',
      price: 28990000,
      isActive: true,
    },
  ],
  specs: {
    'Màn hình': '6.9 inch OLED',
    'Chipset / CPU': 'Apple A18 Pro',
  },
};

describe('ProductEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads product details and renders 3 tabs', async () => {
    (productService.getProductById as any).mockResolvedValueOnce(mockProduct);

    render(
      <ProductEditModal
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Thông tin chung')).toBeDefined();
      expect(screen.getByText(/quản lý biến thể/i)).toBeDefined();
      expect(screen.getByText(/thông số kỹ thuật/i)).toBeDefined();
    });

    expect(screen.getByDisplayValue('iPhone 16 Pro Max')).toBeDefined();
    expect(screen.getByDisplayValue('iphone-16-pro-max')).toBeDefined();
  });
});
