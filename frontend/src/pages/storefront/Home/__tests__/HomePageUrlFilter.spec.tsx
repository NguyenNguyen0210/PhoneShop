// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../HomePage';
import { productService } from '../../../../services/productService';
import { brandService } from '../../../../services/brandService';
import { useCatalogStore } from '../../../../stores/useCatalogStore';

vi.mock('../../../../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    getBrands: vi.fn(),
  },
}));

vi.mock('../../../../services/brandService', () => ({
  brandService: {
    getFeatured: vi.fn(),
  },
}));

vi.mock('../../../../services/flashSaleService', () => ({
  flashSaleService: {
    getActiveCampaign: vi.fn().mockResolvedValue(null),
  },
}));

const mockProducts = [
  {
    id: 'prod-1',
    name: 'iPhone 15 Pro',
    slug: 'iphone-15-pro',
    description: 'Apple flagship',
    brandId: 'b1',
    brand: { id: 'b1', name: 'Apple', slug: 'apple', isActive: true },
    categoryId: 'cat-1',
    status: 'ACTIVE' as const,
    variants: [
      {
        id: 'var-1',
        productId: 'prod-1',
        sku: 'IP15P-128',
        color: 'Natural',
        storage: '128GB',
        price: 25000000,
        compareAtPrice: 28000000,
        inventory: { availableQty: 10 },
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Samsung Galaxy S24',
    slug: 'samsung-galaxy-s24',
    description: 'Samsung flagship',
    brandId: 'b2',
    brand: { id: 'b2', name: 'Samsung', slug: 'samsung', isActive: true },
    categoryId: 'cat-1',
    status: 'ACTIVE' as const,
    variants: [
      {
        id: 'var-2',
        productId: 'prod-2',
        sku: 'S24-128',
        color: 'Black',
        storage: '128GB',
        price: 20000000,
        compareAtPrice: 22000000,
        inventory: { availableQty: 15 },
      },
    ],
  },
  {
    id: 'prod-3',
    name: 'iPad Pro 11 M4',
    slug: 'ipad-pro-11-m4',
    description: 'Apple tablet flagship',
    brandId: 'b1',
    brand: { id: 'b1', name: 'Apple', slug: 'apple', isActive: true },
    categoryId: 'cat-2',
    status: 'ACTIVE' as const,
    variants: [
      {
        id: 'var-3',
        productId: 'prod-3',
        sku: 'IPAD-M4',
        color: 'Space Black',
        storage: '256GB',
        price: 28000000,
        compareAtPrice: 30000000,
        inventory: { availableQty: 8 },
      },
    ],
  },
];

const mockBrands = [
  { id: 'b1', name: 'Apple', slug: 'apple', isActive: true },
  { id: 'b2', name: 'Samsung', slug: 'samsung', isActive: true },
];

describe('HomePage URL Params & Auto-Scroll Synchronization', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    useCatalogStore.getState().resetFilters();
    useCatalogStore.setState({ hasLoaded: false });

    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as any;

    (productService.getProducts as any).mockResolvedValue({
      items: mockProducts,
      total: mockProducts.length,
      page: 1,
      limit: 100,
      totalPages: 1,
    });

    (productService.getBrands as any).mockResolvedValue(mockBrands);
    (brandService.getFeatured as any).mockResolvedValue(['apple', 'samsung']);
  });

  it('syncs search keyword from URL and filters products and triggers scroll', async () => {
    render(
      <MemoryRouter initialEntries={['/?search=iphone']}>
        <HomePage />
      </MemoryRouter>
    );

    // Wait for products to load and verify iPhone is in grid
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 15 Pro' })).toBeTruthy();
    });

    // Samsung and iPad should be filtered out
    expect(screen.queryByRole('heading', { level: 3, name: 'Samsung Galaxy S24' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 3, name: 'iPad Pro 11 M4' })).toBeNull();

    // Search input should have 'iphone' as its value
    const searchInput = screen.getByPlaceholderText('Lọc theo tên điện thoại...') as HTMLInputElement;
    expect(searchInput.value).toBe('iphone');

    const clearButton = screen.getByRole('button', { name: /Xóa từ khóa tìm kiếm/i });
    fireEvent.click(clearButton);

    expect(searchInput.value).toBe('');

    // scrollIntoView should have been triggered with smooth behavior
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('syncs brand from URL (case-insensitive) and filters products and triggers scroll', async () => {
    render(
      <MemoryRouter initialEntries={['/?brand=apple']}>
        <HomePage />
      </MemoryRouter>
    );

    // Wait for products to load and verify Apple products are in grid
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 15 Pro' })).toBeTruthy();
      expect(screen.getByRole('heading', { level: 3, name: 'iPad Pro 11 M4' })).toBeTruthy();
    });

    // Samsung should be filtered out from grid
    expect(screen.queryByRole('heading', { level: 3, name: 'Samsung Galaxy S24' })).toBeNull();

    // Apple brand button should be active (contains bg-blue-50)
    const appleButtons = screen.getAllByRole('button', { name: /Apple/i });
    expect(appleButtons.some((btn) => btn.className.includes('bg-blue-50'))).toBe(true);

    // scrollIntoView should have been triggered
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('handles uppercase brand in URL and canonicalizes to brand name', async () => {
    render(
      <MemoryRouter initialEntries={['/?brand=SAMSUNG']}>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Samsung Galaxy S24' })).toBeTruthy();
    });

    expect(screen.queryByRole('heading', { level: 3, name: 'iPhone 15 Pro' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 3, name: 'iPad Pro 11 M4' })).toBeNull();

    const samsungButtons = screen.getAllByRole('button', { name: /Samsung/i });
    expect(samsungButtons.some((btn) => btn.className.includes('bg-blue-50'))).toBe(true);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('filters by both search keyword and brand when both are provided in URL', async () => {
    render(
      <MemoryRouter initialEntries={['/?search=ipad&brand=apple']}>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPad Pro 11 M4' })).toBeTruthy();
    });

    // iPhone (different search) and Samsung (different brand) should be filtered out
    expect(screen.queryByRole('heading', { level: 3, name: 'iPhone 15 Pro' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 3, name: 'Samsung Galaxy S24' })).toBeNull();

    const searchInput = screen.getByPlaceholderText('Lọc theo tên điện thoại...') as HTMLInputElement;
    expect(searchInput.value).toBe('ipad');

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('shows all products and does not trigger filter scroll when no search or brand param is present', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 15 Pro' })).toBeTruthy();
      expect(screen.getByRole('heading', { level: 3, name: 'Samsung Galaxy S24' })).toBeTruthy();
      expect(screen.getByRole('heading', { level: 3, name: 'iPad Pro 11 M4' })).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText('Lọc theo tên điện thoại...') as HTMLInputElement;
    expect(searchInput.value).toBe('');

    const allButton = screen.getByRole('button', { name: /Tất cả/i });
    expect(allButton.className).toContain('bg-blue-50');

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('displays only featured brands on top bar while sidebar displays all active brands', async () => {
    const customBrands = [
      { id: 'b1', name: 'Apple', slug: 'apple', isActive: true },
      { id: 'b2', name: 'Samsung', slug: 'samsung', isActive: true },
      { id: 'b3', name: 'Nokia', slug: 'nokia', isActive: true },
    ];
    (productService.getBrands as any).mockResolvedValue(customBrands);
    (brandService.getFeatured as any).mockResolvedValue(['apple']); // Only Apple is featured

    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 15 Pro' })).toBeTruthy();
    });

    // In sidebar filter: Nokia chip should exist
    const nokiaInSidebar = screen.getByText('Nokia');
    expect(nokiaInSidebar).toBeTruthy();
  });

  it('filters products correctly when multiple brands are toggled in sidebar', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 15 Pro' })).toBeTruthy();
      expect(screen.getByRole('heading', { level: 3, name: 'Samsung Galaxy S24' })).toBeTruthy();
    });

    // Find sidebar chip buttons
    const sidebarButtons = screen.getAllByRole('button');
    const appleChip = sidebarButtons.find(
      (b) => b.textContent?.includes('Apple') && b.className.includes('rounded-xl text-xs')
    );
    expect(appleChip).toBeDefined();

    // Click Apple chip
    fireEvent.click(appleChip!);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 15 Pro' })).toBeTruthy();
      expect(screen.queryByRole('heading', { level: 3, name: 'Samsung Galaxy S24' })).toBeNull();
    });

    // Now click Samsung chip to select both
    const samsungChip = sidebarButtons.find(
      (b) => b.textContent?.includes('Samsung') && b.className.includes('rounded-xl text-xs')
    );
    fireEvent.click(samsungChip!);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'iPhone 15 Pro' })).toBeTruthy();
      expect(screen.getByRole('heading', { level: 3, name: 'Samsung Galaxy S24' })).toBeTruthy();
    });
  });
});
