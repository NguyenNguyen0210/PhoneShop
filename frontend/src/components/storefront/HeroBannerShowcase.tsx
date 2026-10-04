import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ChevronRight, ChevronLeft, Sparkles, ShieldCheck } from 'lucide-react';
import type { Product } from '../../types';
import { FALLBACK_PRODUCT_IMAGE } from '../../utils/imageFallback';

export interface HeroBannerShowcaseProps {
  products: Product[];
  loading?: boolean;
  className?: string;
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

export const HeroBannerShowcase: React.FC<HeroBannerShowcaseProps> = ({
  products,
  loading = false,
  className = '',
}) => {
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
      <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 ${className}`} data-testid="hero-banner-skeleton">
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
      <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 ${className}`}>
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-white border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Khám phá Flagship Công Nghệ</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Hàng loạt điện thoại thông minh chính hãng với mức giá hấp dẫn đang chờ đón bạn.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md cursor-pointer"
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
    <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 ${className}`}>
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
                className={`px-7 py-3 rounded-xl text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer ${theme.primaryBtn}`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Mua ngay</span>
              </Link>
              <Link
                to={`/products/${current.id}`}
                className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm sm:text-base flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
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
                  type="button"
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
            <div
              className={`absolute w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full blur-3xl -z-10 pointer-events-none transition-all duration-700 ${theme.glowColor}`}
            />

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
                  type="button"
                  onClick={() => setCurrentIndex((prev) => (prev - 1 + heroItems.length) % heroItems.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Slide trước"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % heroItems.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
