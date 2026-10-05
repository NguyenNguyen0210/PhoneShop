// @vitest-environment jsdom
// Repro: storefront filter does not work with REAL API-shaped data.
// Prisma Decimal serializes to STRING in JSON, e.g. price: "25000000".
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../HomePage';
import { productService } from '../../../../services/productService';
import { useCatalogStore } from '../../../../stores/useCatalogStore';

vi.mock('../../../../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    getBrands: vi.fn(),
  },
}));

vi.mock('../../../../services/flashSaleService', () => ({
  flashSaleService: {
    getActiveCampaign: vi.fn().mockResolvedValue(null),
  },
}));

// API-shaped: prices are STRINGS (Prisma Decimal -> JSON), colors Vietnamese,
// specs like seed data.
const mockProducts = [
  {
    id: 'prod-1',
    name: 'iPhone 17 Pro Max',
    slug: 'iphone-17-pro-max',
    description: 'Apple flagship',
    brandId: 'b1',
    brand: { id: 'b1', name: 'Apple', slug: 'apple', isActive: true },
    categoryId: 'cat-1',
    status: 'ACTIVE',
    rating: 4.5,
    reviewCount: 10,
    specs: { has5G: true, os: 'iOS', chipset: 'Apple A-Series A19 Pro', screenSize: 6.9, batteryCapacity: 4832 },
    variants: [
      {
        id: 'var-1',
        productId: 'prod-1',
        sku: 'APL-IP17PM-256-TITAN',
        color: 'Titan',
        storage: '256GB',
        ram: '8GB',
        price: '34990000',
        compareAtPrice: '37990000',
        inventory: { availableQty: 25 },
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Samsung Galaxy A16 4G',
    slug: 'galaxy-a16-4g',
    description: 'Samsung budget 4G',
    brandId: 'b2',
    brand: { id: 'b2', name: 'Samsung', slug: 'samsung', isActive: true },
    categoryId: 'cat-1',
    status: 'ACTIVE',
    rating: 3.5,
    reviewCount: 4,
    specs: { has5G: false, os: 'Android', chipset: 'Exynos 1330', screenSize: 6.7, batteryCapacity: 5000 },
    variants: [
      {
        id: 'var-2',
        productId: 'prod-2',
        sku: 'SAM-A164G-128-XANH',
        color: 'Xanh',
        storage: '128GB',
        ram: '4GB',
        price: '4490000',
        compareAtPrice: null,
        inventory: { availableQty: 50 },
      },
    ],
  },
  {
    id: 'prod-3',
    name: 'Xiaomi Redmi Note 14',
    slug: 'redmi-note-14',
    description: 'Xiaomi mid',
    brandId: 'b3',
    brand: { id: 'b3', name: 'Xiaomi', slug: 'xiaomi', isActive: true },
    categoryId: 'cat-1',
    status: 'ACTIVE',
    rating: 4.0,
    reviewCount: 6,
    specs: { has5G: true, os: 'Android', chipset: 'Dimensity 7025 Ultra', screenSize: 6.67, batteryCapacity: 5110 },
    variants: [
      {
        id: 'var-3',
        productId: 'prod-3',
        sku: 'XMI-RN14-128-XANH',
        color: 'Xanh',
        storage: '128GB',
        ram: '6GB',
        price: '5990000',
        compareAtPrice: '6990000',
        inventory: { availableQty: 0 },
      },
    ],
  },
];

const mockBrands = [
  { id: 'b1', name: 'Apple', slug: 'apple', isActive: true },
  { id: 'b2', name: 'Samsung', slug: 'samsung', isActive: true },
  { id: 'b3', name: 'Xiaomi', slug: 'xiaomi', isActive: true },
];

describe('HomePage filter with API-shaped data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCatalogStore.getState().resetFilters();
    (productService.getProducts as any).mockResolvedValue({
      items: mockProducts,
      total: mockProducts.length,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    (productService.getBrands as any).mockResolvedValue(mockBrands);
    window.HTMLElement.prototype.scrollIntoView = vi.fn() as any;
  });

  it('RAM filter narrows the grid', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 17 Pro Max' })).toBeTruthy();
    });
    // Desktop sidebar has RAM 8GB button
    fireEvent.click(screen.getAllByText('8GB')[0]);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 3, name: 'Samsung Galaxy A16 4G' })).toBeNull();
    });
    expect(screen.getByRole('heading', { level: 3, name: 'iPhone 17 Pro Max' })).toBeTruthy();
  });

  it('onSale filter keeps discounted products', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 17 Pro Max' })).toBeTruthy();
    });
    fireEvent.click(screen.getByText('🔥 Đang giảm giá'));
    await waitFor(() => {
      // prod-2 has no compareAtPrice -> must be filtered out,
      // prod-1 and prod-3 have compareAtPrice > price -> must stay
      expect(screen.queryByRole('heading', { level: 3, name: 'Samsung Galaxy A16 4G' })).toBeNull();
    });
    expect(screen.getByRole('heading', { level: 3, name: 'iPhone 17 Pro Max' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Xiaomi Redmi Note 14' })).toBeTruthy();
  });

  it('price range via store narrows the grid', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 17 Pro Max' })).toBeTruthy();
    });
    // Simulate dragging price slider to 10M-20M: only... actually none of
    // 34.99M / 4.49M / 5.99M is in range -> expect empty state.
    // First use a range that keeps only the iPhone: 30M-40M.
    useCatalogStore.getState().setPriceRange([30000000, 40000000]);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 3, name: 'Samsung Galaxy A16 4G' })).toBeNull();
    });
    expect(screen.getByRole('heading', { level: 3, name: 'iPhone 17 Pro Max' })).toBeTruthy();
  });
});
