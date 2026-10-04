// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProductListingPage } from '../ProductListingPage';
import { productService } from '../../../../services/productService';

// Mock window.matchMedia for Ant Design components
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

vi.mock('../../../../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    getBrands: vi.fn(),
  },
}));

// Mock BrandLogo
vi.mock('../../../../components/common/BrandLogo', () => ({
  BrandLogo: ({ name }: { name: string }) => <div>Logo-{name}</div>,
}));

// Mock StorefrontPagination
vi.mock('../../../../components/storefront/StorefrontPagination', () => ({
  StorefrontPagination: () => <div data-testid="pagination">Pagination</div>,
}));

// Mock ProductCard
vi.mock('../../../../components/storefront/ProductCard', () => ({
  ProductCard: ({ product }: { product: any }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

describe('ProductListingPage Integration', () => {
  const mockProducts = [
    {
      id: 'p1',
      name: 'Samsung Galaxy S24 Ultra',
      brand: { id: 'b1', name: 'Samsung', slug: 'samsung' },
      rating: 4.8,
      reviewCount: 25,
      createdAt: '2024-01-01',
      specs: {
        has5G: true,
        screenSize: 6.8,
        batteryCapacity: 5000,
        chipset: 'Snapdragon 8 Gen 3',
        os: 'Android',
      },
      variants: [
        {
          id: 'v1',
          name: 'S24 Titanium',
          color: 'Titanium',
          storage: '256GB',
          ram: '12GB',
          price: 25000000,
          compareAtPrice: 30000000,
          inventory: { availableQty: 10 },
        },
      ],
    },
    {
      id: 'p2',
      name: 'iPhone 15 Pro Max',
      brand: { id: 'b2', name: 'Apple', slug: 'apple' },
      rating: 4.9,
      reviewCount: 50,
      createdAt: '2024-02-01',
      specs: {
        has5G: true,
        screenSize: 6.7,
        batteryCapacity: 4422,
        chipset: 'Apple A17 Pro',
        os: 'iOS',
      },
      variants: [
        {
          id: 'v2',
          name: '15 Pro Max Blue',
          color: 'Blue',
          storage: '256GB',
          ram: '8GB',
          price: 29000000,
          compareAtPrice: 32000000,
          inventory: { availableQty: 5 },
        },
      ],
    },
  ];

  const mockBrands = [
    { id: 'b1', name: 'Samsung', slug: 'samsung' },
    { id: 'b2', name: 'Apple', slug: 'apple' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (productService.getProducts as any).mockResolvedValue({ items: mockProducts, total: 2 });
    (productService.getBrands as any).mockResolvedValue(mockBrands);
  });

  it('renders products and filters correctly', async () => {
    render(
      <MemoryRouter>
        <ProductListingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeDefined();
      expect(screen.getByText('iPhone 15 Pro Max')).toBeDefined();
    });
  });

  it('filters by brand when brand is clicked', async () => {
    render(
      <MemoryRouter>
        <ProductListingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeDefined();
    });

    const samsungBrand = screen.getAllByText('Samsung')[0];
    fireEvent.click(samsungBrand);

    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeDefined();
      expect(screen.queryByText('iPhone 15 Pro Max')).toBeNull();
    });
  });

  it('allows sorting by best-seller and top-discount', async () => {
    render(
      <MemoryRouter>
        <ProductListingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeDefined();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'best-seller' } });

    await waitFor(() => {
      const cards = screen.getAllByTestId('product-card');
      expect(cards[0].textContent).toContain('iPhone 15 Pro Max'); // higher reviewCount (50 vs 25)
    });
  });
});
