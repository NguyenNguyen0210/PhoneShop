# Hero Banner Ambient Glow & Service Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Refactor and upgrade the storefront HomePage hero banner into a modern 3D Flagship Showcase with dynamic brand-driven ambient glow backdrops, floating specs badges, 5-second autoplay slider with hover pause, and an independent commercial service guarantee bar.

**Architecture:** Split the monolithic inline hero banner and guarantees from `HomePage.tsx` into two focused, reusable storefront components: `HeroBannerShowcase.tsx` (responsible for dynamic catalog slides, brand theme mapping, ambient glow, and auto-play slider) and `StorefrontServiceBar.tsx` (responsible for 4 retail commercial guarantees). Update `HomePage.tsx` to compose these two components cleanly.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, React Testing Library.

---

## File Structure Map

- **Create:**
  - `frontend/src/components/storefront/StorefrontServiceBar.tsx`: 4-column / 2x2 retail service guarantees bar.
  - `frontend/src/components/storefront/__tests__/StorefrontServiceBar.spec.tsx`: Unit tests for service guarantee bar.
  - `frontend/src/components/storefront/HeroBannerShowcase.tsx`: Flagship showcase slider with ambient glow and floating badges.
  - `frontend/src/components/storefront/__tests__/HeroBannerShowcase.spec.tsx`: Comprehensive unit tests for HeroBannerShowcase.
- **Modify:**
  - `frontend/src/pages/storefront/Home/HomePage.tsx`: Replace legacy monolithic hero and guarantees with the new components.

---

## Tasks

### Task 1: StorefrontServiceBar Component & Unit Tests

**Files:**
- Create: `frontend/src/components/storefront/StorefrontServiceBar.tsx`
- Test: `frontend/src/components/storefront/__tests__/StorefrontServiceBar.spec.tsx`

- [x] **Step 1: Write the failing test for StorefrontServiceBar**

Create `frontend/src/components/storefront/__tests__/StorefrontServiceBar.spec.tsx` testing rendering of the 4 retail commercial guarantees:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StorefrontServiceBar } from '../StorefrontServiceBar';

describe('StorefrontServiceBar', () => {
  it('renders all 4 service guarantee items with title and subtitle', () => {
    render(<StorefrontServiceBar />);

    expect(screen.getByText('Giao hỏa tốc 2h')).toBeDefined();
    expect(screen.getByText('Miễn phí nội thành')).toBeDefined();

    expect(screen.getByText('Bảo hành 12 tháng')).toBeDefined();
    expect(screen.getByText('Chính hãng toàn quốc')).toBeDefined();

    expect(screen.getByText('1 đổi 1 trong 30 ngày')).toBeDefined();
    expect(screen.getByText('Nếu lỗi nhà sản xuất')).toBeDefined();

    expect(screen.getByText('Thu cũ đổi mới')).toBeDefined();
    expect(screen.getByText('Trợ giá đến 2.000.000₫')).toBeDefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/storefront/__tests__/StorefrontServiceBar.spec.tsx --run` (in `frontend`)
Expected: FAIL with "Cannot find module '../StorefrontServiceBar'"

- [x] **Step 3: Implement StorefrontServiceBar component**

Create `frontend/src/components/storefront/StorefrontServiceBar.tsx`:
```tsx
import React from 'react';
import { Truck, ShieldCheck, RotateCcw, ArrowLeftRight } from 'lucide-react';

export const StorefrontServiceBar: React.FC = () => {
  const guarantees = [
    {
      icon: Truck,
      iconBg: 'bg-blue-100 text-blue-600',
      title: 'Giao hỏa tốc 2h',
      subtitle: 'Miễn phí nội thành',
    },
    {
      icon: ShieldCheck,
      iconBg: 'bg-emerald-100 text-emerald-600',
      title: 'Bảo hành 12 tháng',
      subtitle: 'Chính hãng toàn quốc',
    },
    {
      icon: RotateCcw,
      iconBg: 'bg-indigo-100 text-indigo-600',
      title: '1 đổi 1 trong 30 ngày',
      subtitle: 'Nếu lỗi nhà sản xuất',
    },
    {
      icon: ArrowLeftRight,
      iconBg: 'bg-amber-100 text-amber-600',
      title: 'Thu cũ đổi mới',
      subtitle: 'Trợ giá đến 2.000.000₫',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6" aria-label="Cam kết dịch vụ">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {guarantees.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">{item.title}</div>
                <div className="text-[11px] sm:text-xs text-slate-500 truncate">{item.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/storefront/__tests__/StorefrontServiceBar.spec.tsx --run` (in `frontend`)
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/storefront/StorefrontServiceBar.tsx frontend/src/components/storefront/__tests__/StorefrontServiceBar.spec.tsx
git commit -m "feat(storefront): add StorefrontServiceBar component with tests"
```
### Task 2: HeroBannerShowcase Component & Unit Tests

**Files:**
- Create: `frontend/src/components/storefront/HeroBannerShowcase.tsx`
- Test: `frontend/src/components/storefront/__tests__/HeroBannerShowcase.spec.tsx`

- [x] **Step 1: Write the failing test for HeroBannerShowcase**

Create `frontend/src/components/storefront/__tests__/HeroBannerShowcase.spec.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HeroBannerShowcase } from '../HeroBannerShowcase';
import type { Product } from '../../../types';

const mockProducts: Product[] = [
  {
    id: 'prod-honor',
    name: 'HONOR X9b 5G',
    slug: 'honor-x9b-5g',
    description: 'Chiến binh không thể phá vỡ màn hình chống rơi vỡ',
    brand: { id: 'b1', name: 'Honor', slug: 'honor' },
    brandId: 'b1',
    thumbnail: '/images/honor-x9b.png',
    variants: [
      { id: 'v1', sku: 'HONOR-1', price: 7990000, compareAtPrice: 8990000, stock: 10 },
    ],
    specs: { batteryCapacity: 5800, screenSize: 6.78, chipset: 'Snapdragon 6 Gen 1' },
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'prod-apple',
    name: 'iPhone 16 Pro Max',
    slug: 'iphone-16-pro-max',
    description: 'Titan Sa Mạc Đỉnh Cao Công Nghệ',
    brand: { id: 'b2', name: 'Apple', slug: 'apple' },
    brandId: 'b2',
    thumbnail: '/images/iphone-16.png',
    variants: [
      { id: 'v2', sku: 'IP16-1', price: 34990000, compareAtPrice: 36990000, stock: 5 },
    ],
    specs: { batteryCapacity: 4685, chipset: 'Apple A18 Pro' },
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
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

  it('renders product information, formatted price, and specs floating badges', () => {
    render(
      <MemoryRouter>
        <HeroBannerShowcase products={mockProducts} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('HONOR X9b 5G')).toBeDefined();
    expect(screen.getByText(/7.990.000/)).toBeDefined();
    expect(screen.getByText(/5.800 mAh/)).toBeDefined();
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

  it('advances slides automatically via timer and pauses on mouse enter', () => {
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
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/storefront/__tests__/HeroBannerShowcase.spec.tsx --run` (in `frontend`)
Expected: FAIL with "Cannot find module '../HeroBannerShowcase'"

- [x] **Step 3: Implement HeroBannerShowcase component**

Create `frontend/src/components/storefront/HeroBannerShowcase.tsx`:
```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ChevronRight, ChevronLeft, Sparkles, ShieldCheck } from 'lucide-react';
import type { Product } from '../../types';
import { FALLBACK_PRODUCT_IMAGE } from '../../utils/imageFallback';

export interface HeroBannerShowcaseProps {
  products: Product[];
  loading?: boolean;
}

interface BrandTheme {
  bgGradient: string;
  glowColor: string;
  badgeStyle: string;
  primaryBtn: string;
  priceColor: string;
  accentText: string;
}

const getBrandTheme = (brandName?: string, productName?: string): BrandTheme => {
  const brand = (brandName || '').toLowerCase();
  const name = (productName || '').toLowerCase();

  if (brand.includes('honor') || brand.includes('xiaomi') || name.includes('honor') || name.includes('xiaomi')) {
    return {
      bgGradient: 'from-orange-50/80 via-amber-50/20 to-white',
      glowColor: 'bg-orange-500/35',
      badgeStyle: 'bg-orange-100 text-orange-800 border-orange-200/60',
      primaryBtn: 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/25',
      priceColor: 'text-orange-600',
      accentText: 'text-orange-700',
    };
  }

  if (brand.includes('apple') || name.includes('iphone')) {
    return {
      bgGradient: 'from-amber-100/40 via-stone-50/30 to-white',
      glowColor: 'bg-amber-600/25',
      badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200/60',
      primaryBtn: 'bg-stone-900 hover:bg-black shadow-stone-900/25',
      priceColor: 'text-amber-700',
      accentText: 'text-amber-800',
    };
  }

  if (brand.includes('samsung') || name.includes('galaxy')) {
    return {
      bgGradient: 'from-blue-50/80 via-sky-50/20 to-white',
      glowColor: 'bg-blue-500/30',
      badgeStyle: 'bg-blue-100 text-blue-800 border-blue-200/60',
      primaryBtn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25',
      priceColor: 'text-blue-600',
      accentText: 'text-blue-700',
    };
  }

  return {
    bgGradient: 'from-indigo-50/70 via-slate-50/30 to-white',
    glowColor: 'bg-indigo-500/25',
    badgeStyle: 'bg-indigo-100 text-indigo-800 border-indigo-200/60',
    primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25',
    priceColor: 'text-indigo-600',
    accentText: 'text-indigo-700',
  };
};

export const HeroBannerShowcase: React.FC<HeroBannerShowcaseProps> = ({ products, loading = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const heroItems = useMemo(() => {
    return products.slice(0, 5).map((p) => {
      const primaryVariant = p.variants?.[0];
      const price = primaryVariant?.price ?? 0;
      const comparePrice = primaryVariant?.compareAtPrice ?? price;
      const monthlyPay = `${new Intl.NumberFormat('vi-VN').format(Math.round(price / 12))}₫/tháng`;
      const image = p.thumbnail ?? p.thumbnailUrl ?? FALLBACK_PRODUCT_IMAGE;
      const theme = getBrandTheme(p.brand?.name, p.name);

      const specs: any = p.specs || {};
      const floatingBadges = [];

      if (specs.batteryCapacity) {
        floatingBadges.push({
          icon: '🔋',
          label: 'Pin khủng',
          value: `${new Intl.NumberFormat('vi-VN').format(specs.batteryCapacity)} mAh`,
        });
      } else {
        floatingBadges.push({
          icon: '🛡️',
          label: 'Bền bỉ',
          value: 'Ultra-Bounce 360°',
        });
      }

      if (specs.chipset) {
        floatingBadges.push({
          icon: '⚡',
          label: 'Hiệu năng',
          value: specs.chipset,
        });
      } else if (specs.screenSize) {
        floatingBadges.push({
          icon: '📱',
          label: 'Màn hình',
          value: `${specs.screenSize}" OLED 120Hz`,
        });
      } else {
        floatingBadges.push({
          icon: '✨',
          label: 'Chính hãng',
          value: '100% Nguyên Seal',
        });
      }

      return {
        id: p.id,
        brand: p.brand?.name ?? '',
        name: p.name,
        description: p.description ?? 'Trải nghiệm đỉnh cao công nghệ với thiết kế hiện đại và hiệu năng vượt trội.',
        price,
        comparePrice,
        monthlyPay,
        image,
        theme,
        floatingBadges,
      };
    });
  }, [products]);

  // Autoplay timer 5s
  useEffect(() => {
    if (isPaused || heroItems.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroItems.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, heroItems.length]);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6" data-testid="hero-banner-skeleton">
        <div className="relative rounded-3xl bg-white border border-slate-200/80 p-10 sm:p-14 text-center animate-pulse">
          <div className="h-6 w-36 bg-slate-200 rounded-full mx-auto mb-4" />
          <div className="h-10 w-3/4 max-w-md bg-slate-200 rounded-xl mx-auto mb-4" />
          <div className="h-5 w-1/2 max-w-sm bg-slate-200 rounded-lg mx-auto" />
        </div>
      </section>
    );
  }

  if (heroItems.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-white border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Khám phá Flagship Công Nghệ</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Hàng loạt điện thoại thông minh chính hãng với mức giá hấp dẫn đang chờ đón bạn.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md"
            >
              <span>Xem tất cả sản phẩm</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const current = heroItems[currentIndex % heroItems.length];
  const { theme } = current;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <div
        data-testid="hero-banner-container"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={`group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br ${theme.bgGradient} p-6 sm:p-10 lg:p-12 shadow-xs hover:shadow-md transition-all duration-700`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Cột trái: Nội dung (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${theme.badgeStyle}`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{current.brand ? `${current.brand} • Flagship Nổi Bật` : 'Flagship Nổi Bật'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chính hãng 100%</span>
              </span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                {current.name}
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 line-clamp-2 max-w-xl leading-relaxed">
                {current.description}
              </p>
            </div>

            {/* Khối giá & Trả góp */}
            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <span className={`text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight tabular-nums ${theme.priceColor}`}>
                {formatPrice(current.price)}
              </span>
              {current.comparePrice > current.price && (
                <>
                  <span className="text-sm sm:text-base text-slate-400 line-through font-mono tabular-nums">
                    {formatPrice(current.comparePrice)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200/80 text-rose-600 text-xs font-bold font-mono">
                    -{Math.round(((current.comparePrice - current.price) / current.comparePrice) * 100)}%
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200/70 text-slate-700 text-xs font-semibold shadow-2xs">
                Trả góp 0% chỉ {current.monthlyPay}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={`/products/${current.id}`}
                className={`px-7 py-3 rounded-xl text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg transition-all active:scale-[0.98] ${theme.primaryBtn}`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Mua ngay</span>
              </Link>
              <Link
                to={`/products/${current.id}`}
                className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm sm:text-base flex items-center gap-1.5 transition shadow-2xs"
              >
                <span>Xem thông số kỹ thuật</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            {/* Slider Dots */}
            <div className="flex items-center gap-2 pt-2">
              {heroItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Chuyển tới slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Cột phải: Hình ảnh với Quầng sáng Ambient Glow & Floating Badges (5 Cols) */}
          <div className="lg:col-span-5 relative flex items-center justify-center p-4">
            {/* Ambient Glow */}
            <div className={`absolute w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full blur-3xl -z-10 pointer-events-none transition-all duration-700 ${theme.glowColor}`} />

            <div className="relative group/device">
              <Link to={`/products/${current.id}`} className="block">
                <img
                  src={current.image}
                  alt={current.name}
                  className="max-h-[300px] sm:max-h-[360px] w-auto object-contain filter drop-shadow-2xl group-hover/device:scale-105 transition-transform duration-500"
                />
              </Link>

              {/* Floating Badge 1 (Top Right) */}
              {current.floatingBadges[0] && (
                <div className="absolute -top-3 -right-4 sm:-right-6 bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-2.5 pointer-events-none">
                  <span className="text-xl">{current.floatingBadges[0].icon}</span>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium leading-none">{current.floatingBadges[0].label}</div>
                    <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">{current.floatingBadges[0].value}</div>
                  </div>
                </div>
              )}

              {/* Floating Badge 2 (Bottom Left) */}
              {current.floatingBadges[1] && (
                <div className="absolute -bottom-3 -left-4 sm:-left-6 bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-2.5 pointer-events-none">
                  <span className="text-xl">{current.floatingBadges[1].icon}</span>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium leading-none">{current.floatingBadges[1].label}</div>
                    <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">{current.floatingBadges[1].value}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Prev / Next Arrows */}
            {heroItems.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentIndex((prev) => (prev - 1 + heroItems.length) % heroItems.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Slide trước"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % heroItems.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Slide tiếp theo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/storefront/__tests__/HeroBannerShowcase.spec.tsx --run` (in `frontend`)
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/storefront/HeroBannerShowcase.tsx frontend/src/components/storefront/__tests__/HeroBannerShowcase.spec.tsx
git commit -m "feat(storefront): add HeroBannerShowcase component with ambient glow and dynamic themes"
```
### Task 3: Integrate HeroBannerShowcase and StorefrontServiceBar into HomePage

**Files:**
- Modify: `frontend/src/pages/storefront/Home/HomePage.tsx`
- Test: `frontend/src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx`

- [x] **Step 1: Check existing HomePage test to establish baseline**

Run: `npm test -- src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx --run` (in `frontend`)
Verify tests pass and note behavior.

- [x] **Step 2: Update HomePage.tsx to use HeroBannerShowcase and StorefrontServiceBar**

Edit `frontend/src/pages/storefront/Home/HomePage.tsx`:
- Import `HeroBannerShowcase` from `../../../components/storefront/HeroBannerShowcase`
- Import `StorefrontServiceBar` from `../../../components/storefront/StorefrontServiceBar`
- Remove legacy unused imports (`Truck`, `RotateCcw`, `ArrowLeftRight`, `CreditCard` if only used in the old hero block)
- Remove legacy `heroIndex`, `HERO_COPY`, and `heroShowcases` state/memo
- Replace the legacy `<section className="max-w-7xl mx-auto px-4 ...">` block (lines 565-711) with:
```tsx
      {/* ─────────────────────────────────────────────────────────────
          1. FLAGSHIP HERO BANNER SHOWCASE (AMBIENT GLOW & THEMES)
          ───────────────────────────────────────────────────────────── */}
      <HeroBannerShowcase products={products} loading={loading} />

      {/* ─────────────────────────────────────────────────────────────
          1.2. COMMERCIAL SERVICE GUARANTEES BAR
          ───────────────────────────────────────────────────────────── */}
      <StorefrontServiceBar />
```

- [x] **Step 3: Run HomePage unit tests to verify no regression**

Run: `npm test -- src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx --run` (in `frontend`)
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add frontend/src/pages/storefront/Home/HomePage.tsx
git commit -m "refactor(home): integrate HeroBannerShowcase and StorefrontServiceBar"
```

---

### Task 4: End-to-End Verification & Regression Testing

**Files:**
- Test: `frontend/src/components/storefront/__tests__/HeroBannerShowcase.spec.tsx`
- Test: `frontend/src/components/storefront/__tests__/StorefrontServiceBar.spec.tsx`
- Test: `frontend/src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx`

- [x] **Step 1: Run all related storefront tests**

Run:
```bash
npm test -- src/components/storefront/__tests__/HeroBannerShowcase.spec.tsx src/components/storefront/__tests__/StorefrontServiceBar.spec.tsx src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx --run
```
Expected: All tests pass.

- [x] **Step 2: Run frontend build to verify type checking and bundling**

Run: `npm --prefix frontend run build` (or `npm run build` in `frontend`)
Expected: Build passes with 0 errors.

- [x] **Step 3: Commit plan completion**

```bash
git add docs/plans/2026-10-04-hero-banner-ambient-glow.md
git commit -m "docs: finalize hero banner ambient glow implementation plan"
```
