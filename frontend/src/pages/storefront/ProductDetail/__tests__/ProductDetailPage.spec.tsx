// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProductDetailPage } from '../ProductDetailPage';
import { productService } from '../../../../services/productService';

vi.mock('../../../../services/productService', () => ({
  productService: {
    getProductById: vi.fn(),
  },
}));

vi.mock('../../../../services/flashSaleService', () => ({
  flashSaleService: {
    getActiveCampaign: vi.fn().mockResolvedValue(null),
  },
}));

const mockProduct = {
  id: 'prod-test-1',
  name: 'iPhone 15 Pro Max',
  slug: 'iphone-15-pro-max',
  brandId: 'b1',
  categoryId: 'c1',
  status: 'ACTIVE',
  variants: [
    {
      id: 'var-1',
      productId: 'prod-test-1',
      color: 'Titan Tự Nhiên',
      storage: '256GB',
      price: 29990000,
      compareAtPrice: 34990000,
      stock: 10,
      sku: 'IP15PM-256-NAT',
    },
  ],
  specs: {
    'Màn hình': '6.7 inch OLED 120Hz',
    'Chipset': 'Apple A17 Pro',
  },
  images: ['/images/ip15-1.webp'],
};

describe('ProductDetailPage scroll behavior', () => {
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    window.scrollTo = vi.fn();
    document.documentElement.scrollTop = 1200;
    document.body.scrollTop = 1200;
    vi.mocked(productService.getProductById).mockResolvedValue(mockProduct as any);
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
    vi.restoreAllMocks();
  });

  it('scrolls to top when entering product details and after data is loaded', async () => {
    render(
      <MemoryRouter initialEntries={['/products/prod-test-1']}>
        <Routes>
          <Route path="/products/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial mount call
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);

    // Wait for product to be rendered
    await waitFor(() => {
      expect(productService.getProductById).toHaveBeenCalledWith('prod-test-1');
    });

    // Re-verified call on loaded product
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });
});
