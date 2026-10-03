// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ProductVariantsTab } from '../ProductVariantsTab';
import { productService } from '../../../../../services/productService';
import type { ProductVariant } from '../../../../../types';

vi.mock('../../../../../services/productService', () => ({
  productService: {
    deleteVariant: vi.fn(),
    toggleVariantStatus: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});

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

const mockVariants: ProductVariant[] = [
  {
    id: 'var-1',
    productId: 'prod-1',
    sku: 'IP16PM-256-TI',
    name: 'iPhone 16 Pro Max 256GB Titan Tự Nhiên',
    color: 'Titan Tự Nhiên',
    storage: '256GB',
    ram: '8GB',
    price: 28990000,
    compareAtPrice: 32000000,
    isActive: true,
  },
  {
    id: 'var-2',
    productId: 'prod-1',
    sku: 'IP16PM-512-TI',
    name: 'iPhone 16 Pro Max 512GB Titan Sa Mạc',
    color: 'Titan Sa Mạc',
    storage: '512GB',
    ram: '8GB',
    price: 34990000,
    isActive: false,
  },
];

describe('ProductVariantsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders variants table with correct SKU, price and counts', () => {
    render(
      <ProductVariantsTab
        productId="prod-1"
        productName="iPhone 16 Pro Max"
        variants={mockVariants}
        onReload={vi.fn()}
      />
    );

    expect(screen.getByText('IP16PM-256-TI')).toBeDefined();
    expect(screen.getByText('IP16PM-512-TI')).toBeDefined();
    expect(screen.getByText('Titan Tự Nhiên')).toBeDefined();
    expect(screen.getByText('Titan Sa Mạc')).toBeDefined();
    expect(screen.getByText('2 biến thể')).toBeDefined();
  });

  it('opens VariantFormModal in create mode when clicking "+ Thêm biến thể mới"', () => {
    render(
      <ProductVariantsTab
        productId="prod-1"
        productName="iPhone 16 Pro Max"
        variants={mockVariants}
        onReload={vi.fn()}
      />
    );

    const addBtn = screen.getByRole('button', { name: /thêm biến thể mới/i });
    fireEvent.click(addBtn);

    expect(screen.getAllByText('Thêm biến thể mới').length).toBeGreaterThanOrEqual(2);
  });

  it('opens VariantFormModal in edit mode when clicking Sửa button', () => {
    render(
      <ProductVariantsTab
        productId="prod-1"
        productName="iPhone 16 Pro Max"
        variants={mockVariants}
        onReload={vi.fn()}
      />
    );

    const editBtns = screen.getAllByRole('button', { name: /sửa/i });
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Chỉnh sửa biến thể')).toBeDefined();
  });

  it('calls toggleVariantStatus when switching isActive', async () => {
    (productService.toggleVariantStatus as any).mockResolvedValueOnce({
      ...mockVariants[0],
      isActive: false,
    });
    const onReload = vi.fn();

    render(
      <ProductVariantsTab
        productId="prod-1"
        productName="iPhone 16 Pro Max"
        variants={mockVariants}
        onReload={onReload}
      />
    );

    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(productService.toggleVariantStatus).toHaveBeenCalledWith('prod-1', 'var-1', false);
      expect(onReload).toHaveBeenCalled();
    });
  });
});
