// @vitest-environment jsdom
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HeroBannerShowcase } from '../HeroBannerShowcase';
import { getHeroCutoutImage, TRANSPARENT_PHONE_CUTOUTS } from '../../../utils/heroCutouts';
import type { Product } from '../../../types';

const mockProducts: Product[] = [
  {
    id: 'prod-honor',
    name: 'HONOR X9b 5G',
    slug: 'honor-x9b-5g',
    description: 'Chiến binh không thể phá vỡ màn hình chống rơi vỡ',
    brand: { id: 'b1', name: 'Honor', slug: 'honor', isActive: true },
    brandId: 'b1',
    categoryId: 'cat-1',
    thumbnail: '/images/honor-x9b.png',
    variants: [
      {
        id: 'v1',
        productId: 'prod-honor',
        sku: 'HONOR-1',
        color: 'Orange',
        storage: '256GB',
        price: 7990000,
        compareAtPrice: 8990000,
        inventory: { availableQty: 10 },
      },
    ],
    specs: { batteryCapacity: 5800, screenSize: 6.78, chipset: 'Snapdragon 6 Gen 1' },
    status: 'ACTIVE',
    createdAt: '2026-01-01',
  },
  {
    id: 'prod-apple',
    name: 'iPhone 16 Pro Max',
    slug: 'iphone-16-pro-max',
    description: 'Titan Sa Mạc Đỉnh Cao Công Nghệ',
    brand: { id: 'b2', name: 'Apple', slug: 'apple', isActive: true },
    brandId: 'b2',
    categoryId: 'cat-1',
    thumbnail: '/images/iphone-16.png',
    variants: [
      {
        id: 'v2',
        productId: 'prod-apple',
        sku: 'IP16-1',
        color: 'Titan Desert',
        storage: '256GB',
        price: 34990000,
        compareAtPrice: 36990000,
        inventory: { availableQty: 5 },
      },
    ],
    specs: { batteryCapacity: 4685, chipset: 'Apple A18 Pro' },
    status: 'ACTIVE',
    createdAt: '2026-01-01',
  },
];

describe('HeroBannerShowcase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading skeleton when loading prop is true', () => {
    render(
      <MemoryRouter>
        <HeroBannerShowcase products={[]} loading={true} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('hero-banner-skeleton')).toBeDefined();
  });

  it('renders fallback banner when products list is empty', () => {
    render(
      <MemoryRouter>
        <HeroBannerShowcase products={[]} loading={false} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Khám phá Flagship Công Nghệ/i)).toBeDefined();
  });

  it('renders product information, formatted price, compare price discount, and specs floating badges', () => {
    render(
      <MemoryRouter>
        <HeroBannerShowcase products={mockProducts} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('HONOR X9b 5G')).toBeDefined();
    expect(screen.getByText(/7\.990\.000/)).toBeDefined();
    expect(screen.getByText(/-11%/)).toBeDefined();
    expect(screen.getByText(/5\.800 mAh/)).toBeDefined();
    expect(screen.getByText(/Snapdragon 6 Gen 1/)).toBeDefined();
  });

  it('switches slide on indicator dot click', () => {
    render(
      <MemoryRouter>
        <HeroBannerShowcase products={mockProducts} loading={false} />
      </MemoryRouter>
    );

    const dots = screen.getAllByRole('button', { name: /Chuyển tới slide/i });
    expect(dots.length).toBe(2);

    fireEvent.click(dots[1]);
    expect(screen.getByText('iPhone 16 Pro Max')).toBeDefined();
  });

  it('advances slides automatically via timer (5s) and pauses on mouse enter', () => {
    render(
      <MemoryRouter>
        <HeroBannerShowcase products={mockProducts} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('HONOR X9b 5G')).toBeDefined();

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('iPhone 16 Pro Max')).toBeDefined();

    // Hover pauses timer
    const banner = screen.getByTestId('hero-banner-container');
    fireEvent.mouseEnter(banner);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Should still be on iPhone 16 Pro Max because paused
    expect(screen.getByText('iPhone 16 Pro Max')).toBeDefined();

    // Mouse leave resumes timer
    fireEvent.mouseLeave(banner);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('HONOR X9b 5G')).toBeDefined();
  });

  it('navigates with previous and next chevron buttons', () => {
    render(
      <MemoryRouter>
        <HeroBannerShowcase products={mockProducts} loading={false} />
      </MemoryRouter>
    );

    const nextBtn = screen.getByRole('button', { name: /Slide tiếp theo/i });
    const prevBtn = screen.getByRole('button', { name: /Slide trước/i });

    fireEvent.click(nextBtn);
    expect(screen.getByText('iPhone 16 Pro Max')).toBeDefined();

    fireEvent.click(prevBtn);
    expect(screen.getByText('HONOR X9b 5G')).toBeDefined();
  });

  it('renders fallback floating badges when specs are missing', () => {
    const productsNoSpecs: Product[] = [
      {
        id: 'prod-fallback',
        name: 'Basic Smartphone',
        slug: 'basic-smartphone',
        description: 'Mô tả cơ bản',
        brand: { id: 'b3', name: 'Other', slug: 'other', isActive: true },
        brandId: 'b3',
        categoryId: 'cat-1',
        variants: [
          {
            id: 'v3',
            productId: 'prod-fallback',
            sku: 'BS-1',
            color: 'Black',
            storage: '128GB',
            price: 5000000,
          },
        ],
        status: 'ACTIVE',
        createdAt: '2026-01-01',
      },
    ];

    render(
      <MemoryRouter>
        <HeroBannerShowcase products={productsNoSpecs} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Basic Smartphone')).toBeDefined();
    expect(screen.getByText('Ultra-Bounce 360°')).toBeDefined();
    expect(screen.getByText('100% Nguyên Seal')).toBeDefined();
  });

  it('renders Samsung blue theme when brand is Samsung', () => {
    const samsungProduct: Product[] = [
      {
        id: 'prod-sam',
        name: 'Galaxy S24 Ultra',
        slug: 'galaxy-s24-ultra',
        description: 'Quyền năng Galaxy AI',
        brand: { id: 'b4', name: 'Samsung', slug: 'samsung', isActive: true },
        brandId: 'b4',
        categoryId: 'cat-1',
        variants: [
          {
            id: 'v4',
            productId: 'prod-sam',
            sku: 'SAM-1',
            color: 'Gray',
            storage: '256GB',
            price: 29990000,
          },
        ],
        status: 'ACTIVE',
        createdAt: '2026-01-01',
      },
    ];

    const { container } = render(
      <MemoryRouter>
        <HeroBannerShowcase products={samsungProduct} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Galaxy S24 Ultra')).toBeDefined();
    // Ambient glow should have blue theme class
    const glowDiv = container.querySelector('.bg-blue-500\\/30');
    expect(glowDiv).not.toBeNull();
  });

  it('correctly maps known flagship slugs to high-resolution transparent cutouts', () => {
    const testCutoutProduct = {
      id: 'prod-honor-200',
      name: 'HONOR 200 5G',
      slug: 'honor-200-5g',
      thumbnail: 'https://example.com/honor-200.jpg',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      brandId: 'b1',
      categoryId: 'cat-1',
      description: 'Honor phone',
      variants: [],
    } as unknown as Product;

    expect(getHeroCutoutImage(testCutoutProduct)).toBe('/products/transparent/honor-200-5g.webp');
    expect(TRANSPARENT_PHONE_CUTOUTS['honor-200-5g']).toBeDefined();
  });

  it('falls back to thumbnail when transparent cutout is unavailable', () => {
    const fallbackProduct = {
      id: 'prod-custom',
      name: 'Custom Unbranded Phone',
      slug: 'custom-unbranded-phone',
      thumbnail: 'https://example.com/custom.jpg',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      brandId: 'b9',
      categoryId: 'cat-1',
      description: 'Custom phone',
      variants: [],
    } as unknown as Product;

    expect(getHeroCutoutImage(fallbackProduct)).toBe('https://example.com/custom.jpg');
  });

  it('renders Sony theme and transparent cutout for Sony Xperia devices', () => {
    const sonyProduct: Product[] = [
      {
        id: 'prod-sony',
        name: 'Sony Xperia 1 VI',
        slug: 'sony-xperia-1-vi',
        description: 'Chuyên gia điện ảnh và âm thanh đẳng cấp',
        brand: { id: 'b-sony', name: 'Sony', slug: 'sony', isActive: true },
        brandId: 'b-sony',
        categoryId: 'cat-1',
        thumbnail: 'https://example.com/sony.jpg',
        variants: [
          {
            id: 'v-sony',
            productId: 'prod-sony',
            sku: 'XP-1',
            color: 'Black',
            storage: '256GB',
            price: 31990000,
          },
        ],
        status: 'ACTIVE',
        createdAt: '2026-01-01',
      },
    ];

    const { container } = render(
      <MemoryRouter>
        <HeroBannerShowcase products={sonyProduct} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Sony Xperia 1 VI')).toBeDefined();
    // Ambient glow should have Sony teal theme class
    const glowDiv = container.querySelector('.bg-teal-500\\/25');
    expect(glowDiv).not.toBeNull();

    // Check rendered image src matches transparent cutout
    const img = screen.getByRole('img', { name: 'Sony Xperia 1 VI' }) as HTMLImageElement;
    expect(img.src).toContain('/products/transparent/sony-xperia-1-vi.webp');
  });
});
