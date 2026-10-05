// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProductDetailPage } from '../ProductDetailPage';
import { productService } from '../../../../services/productService';
import { flashSaleService } from '../../../../services/flashSaleService';

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

describe('ProductDetailPage flash sale variant switching (regression)', () => {
  const originalScrollTo = window.scrollTo;

  // 2 variant cùng Đen/256GB khác RAM; variant flash (var-1-flash) đứng SAU variant thường
  const mockProductMultiRam = {
    id: 'prod-multi-ram',
    name: 'Galaxy S24 Ultra',
    slug: 'galaxy-s24-ultra',
    brandId: 'b1',
    categoryId: 'c1',
    status: 'ACTIVE',
    variants: [
      {
        id: 'var-2',
        productId: 'prod-multi-ram',
        color: 'Đen',
        storage: '256GB',
        ram: '8GB',
        price: 28000000,
        sku: 'S24U-256-BLK-8',
      },
      {
        id: 'var-1-flash',
        productId: 'prod-multi-ram',
        color: 'Đen',
        storage: '256GB',
        ram: '12GB',
        price: 30000000,
        sku: 'S24U-256-BLK-12',
      },
      {
        id: 'var-3',
        productId: 'prod-multi-ram',
        color: 'Trắng',
        storage: '256GB',
        ram: '12GB',
        price: 31000000,
        sku: 'S24U-256-WHT-12',
      },
    ],
    images: ['/images/s24-1.webp'],
  };

  const mockFlashCampaign = {
    id: 'camp-1',
    name: 'Flash Sale Giữa Tháng',
    startAt: new Date(Date.now() - 3600000).toISOString(),
    endAt: new Date(Date.now() + 4 * 3600000).toISOString(),
    isActive: true,
    items: [
      {
        id: 'fi-1',
        campaignId: 'camp-1',
        variantId: 'var-1-flash',
        flashPrice: 25000000,
        stockLimit: 20,
        soldCount: 5,
      },
    ],
  };

  const renderWithFlashVariant = () =>
    render(
      <MemoryRouter initialEntries={['/products/prod-multi-ram?variantId=var-1-flash']}>
        <Routes>
          <Route path="/products/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

  beforeEach(() => {
    window.scrollTo = vi.fn();
    vi.mocked(productService.getProductById).mockResolvedValue(mockProductMultiRam as any);
    vi.mocked(flashSaleService.getActiveCampaign).mockResolvedValue(mockFlashCampaign as any);
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
    vi.restoreAllMocks();
  });

  it('giữ giá flash sale sau khi đổi cấu hình khác rồi chọn lại cấu hình flash', async () => {
    renderWithFlashVariant();

    // Ban đầu: đúng giá flash 25.000.000₫ + banner
    // (Intl VND có nbsp trước ₫ nên match nới lỏng khoảng trắng)
    await waitFor(() => {
      expect(screen.getByText(/FLASH SALE GIÁ SỐC/i)).toBeTruthy();
    });
    // (giá render ở cả price box + sticky bar nên dùng getAllByText)
    expect(screen.getAllByText(/25\.000\.000\s*₫/i).length).toBeGreaterThan(0);

    // Đổi sang màu Trắng (cấu hình thường)
    fireEvent.click(screen.getByRole('button', { name: 'Trắng' }));
    await waitFor(() => {
      expect(screen.queryByText(/FLASH SALE GIÁ SỐC/i)).toBeNull();
    });

    // Chọn lại màu Đen (cấu hình flash) → phải về giá flash, không kẹt ở variant thường
    fireEvent.click(screen.getByRole('button', { name: 'Đen' }));
    await waitFor(() => {
      expect(screen.getByText(/FLASH SALE GIÁ SỐC/i)).toBeTruthy();
    });
    expect(screen.getAllByText(/25\.000\.000\s*₫/i).length).toBeGreaterThan(0);
  });
});
