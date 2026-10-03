import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Sparkles,
  ShoppingCart,
  ChevronRight,
  Truck,
  RotateCcw,
  ArrowLeftRight,
  CreditCard,
  LayoutGrid,
  Smartphone,
  X,
  Filter,
} from 'lucide-react';
import { productService } from '../../../services/productService';
import type { Product, Brand } from '../../../types';
import { ProductCard } from '../../../components/storefront/ProductCard';
import { BrandLogo } from '../../../components/common/BrandLogo';
import { ProductFilterSidebar } from '../../../components/storefront/ProductFilterSidebar';
import { ProductSortToolbar } from '../../../components/storefront/ProductSortToolbar';
import { StorefrontPagination } from '../../../components/storefront/StorefrontPagination';
import { FALLBACK_PRODUCT_IMAGE, r2Url } from '../../../utils/imageFallback';

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const PAGE_SIZE = 12;

  const productGridRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  // Advanced Filter & Sort states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
  const [selectedStorages, setSelectedStorages] = useState<string[]>([]);
  const [selectedRams, setSelectedRams] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [onSaleOnly, setOnSaleOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating' | 'newest'>('default');
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

  // Lock body scroll when mobile filter drawer is open
  useEffect(() => {
    if (showMobileFilter) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileFilter]);

  // Featured flagship showcase index
  const [heroIndex, setHeroIndex] = useState(0);

  const heroShowcases = [
    {
      id: 'prod-iphone-16-pro-max',
      brand: 'Apple',
      tagline: 'Tuyệt tác Titan sa mạc • Chip A18 Pro',
      name: 'iPhone 16 Pro Max',
      description:
        'Màn hình Super Retina XDR 6.9 inch tràn viền mỏng kỷ lục, nút Điều khiển Camera cảm ứng lực hoàn toàn mới và hệ thống camera 48MP Fusion đỉnh cao.',
      price: 30990000,
      comparePrice: 34990000,
      monthlyPay: '2.580.000₫/tháng',
      image: FALLBACK_PRODUCT_IMAGE,
      badge: 'Flagship Mới Nhất 2026',
      stockStatus: 'Còn 5 suất ưu đãi tại kho – Giao hỏa tốc hôm nay',
    },
    {
      id: 'prod-samsung-s24-ultra',
      brand: 'Samsung',
      tagline: 'Kỷ nguyên Galaxy AI • Khung viền Titanium',
      name: 'Galaxy S24 Ultra 5G',
      description:
        'Quyền năng Galaxy AI trợ lý đắc lực, camera 200MP zoom mắt thần Quad Tele 100x và bút S-Pen tích hợp đa năng trong khung viền titan siêu bền.',
      price: 25290000,
      comparePrice: 31990000,
      monthlyPay: '2.107.000₫/tháng',
      image: r2Url('products/samsung-s24-ultra.webp'),
      badge: 'Galaxy AI Đỉnh Cao',
      stockStatus: 'Còn 8 máy tại kho – Sẵn sàng xuất kho ngay',
    },
    {
      id: 'prod-samsung-z-fold6',
      brand: 'Samsung',
      tagline: 'Tuyệt tác màn hình gập mỏng nhẹ nhất',
      name: 'Galaxy Z Fold6 5G',
      description:
        'Bản lề FlexHinge rãnh kép phẳng mượt, màn hình mở rộng 7.6 inch đa nhiệm thông minh cùng khung viền Armor Aluminum gia cường bền bỉ.',
      price: 37590000,
      comparePrice: 43990000,
      monthlyPay: '3.132.000₫/tháng',
      image: r2Url('products/samsung-z-fold6.webp'),
      badge: 'Đột Phá Màn Hình Gập',
      stockStatus: 'Còn 4 máy tại kho – Đặt giữ ưu đãi ngay',
    },
  ];

  const currentHero = heroShowcases[heroIndex];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productService.getProducts({ limit: 100 }),
      productService.getBrands(),
    ])
      .then(([prodRes, brandsRes]) => {
        if (prodRes.items) {
          setProducts(prodRes.items);
        }
        if (Array.isArray(brandsRes) && brandsRes.length > 0) {
          setBrands(brandsRes);
        }
      })
      .catch((err) => {
        console.error('Failed to load catalog from database:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetPageToFirst = () => {
    setSearchParams((prev) => {
      if (!prev.has('page') || prev.get('page') === '1') {
        return prev;
      }
      const next = new URLSearchParams(prev);
      next.set('page', '1');
      return next;
    });
  };

  const handleSelectBrand = (brandName: string) => {
    setSelectedBrand(brandName);
    resetPageToFirst();
  };

  const handlePriceRangeChange = (range: [number, number]) => {
    setPriceRange(range);
    resetPageToFirst();
  };

  const toggleStorage = (storage: string) => {
    setSelectedStorages((prev) =>
      prev.includes(storage) ? prev.filter((s) => s !== storage) : [...prev, storage]
    );
    resetPageToFirst();
  };

  const toggleRam = (ram: string) => {
    setSelectedRams((prev) =>
      prev.includes(ram) ? prev.filter((r) => r !== ram) : [...prev, ram]
    );
    resetPageToFirst();
  };

  const handleInStockChange = (val: boolean) => {
    setInStockOnly(val);
    resetPageToFirst();
  };

  const handleOnSaleChange = (val: boolean) => {
    setOnSaleOnly(val);
    resetPageToFirst();
  };

  const handleMinRatingChange = (val: number | null) => {
    setMinRating(val);
    resetPageToFirst();
  };

  const handleSearchChange = (kw: string) => {
    setSearchKeyword(kw);
    resetPageToFirst();
  };

  const handleSortChange = (sort: 'default' | 'price-asc' | 'price-desc' | 'rating' | 'newest') => {
    setSortBy(sort);
    resetPageToFirst();
  };

  const hasActiveFilters =
    selectedBrand !== 'all' ||
    priceRange[0] > 0 ||
    priceRange[1] < 50000000 ||
    selectedStorages.length > 0 ||
    selectedRams.length > 0 ||
    inStockOnly ||
    onSaleOnly ||
    minRating !== null ||
    searchKeyword.trim() !== '';

  const resetFilters = () => {
    setSelectedBrand('all');
    setPriceRange([0, 50000000]);
    setSelectedStorages([]);
    setSelectedRams([]);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setMinRating(null);
    setSearchKeyword('');
    setSortBy('default');
    setSearchParams((prev) => {
      if (!prev.has('page')) return prev;
      const next = new URLSearchParams(prev);
      next.delete('page');
      return next;
    });
  };

  const getMinVariantPrice = (p: Product): number => {
    if (!p.variants || p.variants.length === 0) return 0;
    const prices = p.variants
      .map((v) => v.price)
      .filter((pr) => typeof pr === 'number' && !isNaN(pr));
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  // Filter & Sort products memo
  const filteredProducts = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();

    const filtered = products.filter((p) => {
      // Brand filter
      if (selectedBrand !== 'all') {
        const brandMatch =
          p.brand?.name?.toLowerCase() === selectedBrand.toLowerCase() ||
          (p.brandId && p.brandId.toLowerCase() === selectedBrand.toLowerCase());
        if (!brandMatch) return false;
      }

      // Search keyword filter
      if (kw) {
        const nameMatch = p.name?.toLowerCase().includes(kw);
        const brandMatch = p.brand?.name?.toLowerCase().includes(kw);
        if (!nameMatch && !brandMatch) return false;
      }

      // Dual-range price filter
      const minPrice = getMinVariantPrice(p);
      if (minPrice < priceRange[0] || minPrice > priceRange[1]) {
        return false;
      }

      // Storage filter
      if (selectedStorages.length > 0) {
        const matchesStorage = p.variants?.some((v) =>
          selectedStorages.some(
            (s) => v.storage?.trim().toLowerCase() === s.trim().toLowerCase()
          )
        );
        if (!matchesStorage) return false;
      }

      // RAM filter
      if (selectedRams.length > 0) {
        const matchesRam = p.variants?.some((v) =>
          selectedRams.some(
            (r) => v.ram?.trim().toLowerCase() === r.trim().toLowerCase()
          )
        );
        if (!matchesRam) return false;
      }

      // In stock only filter
      if (inStockOnly) {
        const inStock = p.variants?.some(
          (v) => (v.inventoryQty ?? v.inventory?.availableQty ?? 0) > 0
        );
        if (!inStock) return false;
      }

      // On sale only filter
      if (onSaleOnly) {
        const onSale = p.variants?.some(
          (v) => typeof v.compareAtPrice === 'number' && v.compareAtPrice > v.price
        );
        if (!onSale) return false;
      }

      // Rating filter
      if (minRating !== null) {
        if ((p.rating ?? 0) < minRating) {
          return false;
        }
      }

      return true;
    });

    // Sort logic
    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => getMinVariantPrice(a) - getMinVariantPrice(b));
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => getMinVariantPrice(b) - getMinVariantPrice(a));
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'newest') {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    return filtered;
  }, [
    products,
    selectedBrand,
    searchKeyword,
    priceRange,
    selectedStorages,
    selectedRams,
    inStockOnly,
    onSaleOnly,
    minRating,
    sortBy,
  ]);

  const totalCount = filteredProducts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const safeCurrentPage = totalPages > 0 ? Math.min(Math.max(1, currentPage), totalPages) : 1;

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safeCurrentPage]);

  // Adjust URL page if out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('page', String(totalPages));
          return next;
        },
        { replace: true }
      );
    }
  }, [currentPage, totalPages, setSearchParams]);

  return (
    <div className="space-y-12 sm:space-y-16 pb-20 bg-[#F8FAFC] text-slate-800 min-h-screen">
      {/* ─────────────────────────────────────────────────────────────
          1. CLEAN WHITE SHOWCASE HERO BANNER
          ───────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="relative rounded-3xl bg-white border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-300">
          {/* Subtle Ambient Tech Spotlight behind device */}
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-blue-50 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 p-6 sm:p-10 lg:p-12">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badges & Trust signals */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{currentHero.badge}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chính hãng 100% Nguyên Seal</span>
                </span>
              </div>

              {/* Headline & Subhead */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
                  {currentHero.brand} • {currentHero.tagline}
                </p>
                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  {currentHero.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed pt-1">
                  {currentHero.description}
                </p>
              </div>

              {/* 4 Commercial Retail Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs font-medium text-slate-700 hover:bg-slate-100/60 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-semibold">Giao hỏa tốc 2h miễn phí</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs font-medium text-slate-700 hover:bg-slate-100/60 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-semibold">Bảo hành 12T chính hãng toàn quốc</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs font-medium text-slate-700 hover:bg-slate-100/60 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-semibold">1 đổi 1 30 ngày nếu lỗi NSX</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs font-medium text-slate-700 hover:bg-slate-100/60 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-600 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-semibold">Thu cũ trợ giá đến 2.000.000₫</span>
                </div>
              </div>

              {/* Price & Installment Group */}
              <div className="pt-2 flex flex-wrap items-baseline gap-3 sm:gap-4 border-t border-slate-100">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                  {formatPrice(currentHero.price)}
                </div>
                <div className="text-sm sm:text-base text-slate-400 line-through font-mono tabular-nums">
                  {formatPrice(currentHero.comparePrice)}
                </div>
                {currentHero.comparePrice > currentHero.price && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200/80 text-rose-600 text-xs font-bold font-mono">
                    -{Math.round(((currentHero.comparePrice - currentHero.price) / currentHero.comparePrice) * 100)}%
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>Trả góp 0% chỉ {currentHero.monthlyPay}</span>
                </span>
              </div>

              {/* Action Buttons & Real-time Urgency */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`/products/${currentHero.id}`}
                    className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-blue-500/25 transition cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Mua ngay</span>
                  </Link>

                  <Link
                    to={`/products/${currentHero.id}`}
                    className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm sm:text-base flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <span>Xem cấu hình chi tiết</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 pt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>{currentHero.stockStatus}</span>
                </div>
              </div>

              {/* Showcase Switcher Indicators */}
              <div className="flex items-center gap-2 pt-2">
                {heroShowcases.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      heroIndex === idx ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                    aria-label={`Showcase ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Right Product Showcase (5 Cols) */}
            <div className="lg:col-span-5 flex items-center justify-center p-4">
              <Link to={`/products/${currentHero.id}`} className="group relative block w-full max-w-sm">
                <div className="relative aspect-square w-full flex items-center justify-center p-4">
                  <img
                    src={currentHero.image}
                    alt={currentHero.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. UNIFIED CATEGORY & BRAND FILTER SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                Danh Mục Smartphone Chính Hãng
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {products.length} sản phẩm phân phối chính hãng • Đầy đủ hoá đơn VAT & kiểm định IMEI
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">
              Hiển thị {filteredProducts.length} sản phẩm
            </span>
          </div>

          {/* Integrated Segmented Brand Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => handleSelectBrand('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                selectedBrand === 'all'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tất cả</span>
            </button>

            {brands.map((b) => {
              const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();

              return (
                <button
                  key={b.id || b.slug}
                  type="button"
                  onClick={() => handleSelectBrand(b.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <BrandLogo
                    name={b.name}
                    slug={b.slug}
                    logoUrl={b.logoUrl || b.logo}
                    isSelected={isSelected}
                  />
                  <span>{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Responsive Layout: Sidebar Filter + Main Products Column */}
        <div ref={productGridRef} className="scroll-mt-24 flex flex-col lg:flex-row items-start gap-6 pt-2">
          {/* Left Column: Filter Sidebar (Desktop) */}
          <div className="hidden lg:block w-72 shrink-0 sticky top-24 self-start">
            <ProductFilterSidebar
              showBrands={false}
              priceRange={priceRange}
              onPriceRangeChange={handlePriceRangeChange}
              selectedStorages={selectedStorages}
              onToggleStorage={toggleStorage}
              selectedRams={selectedRams}
              onToggleRam={toggleRam}
              inStockOnly={inStockOnly}
              onToggleInStock={handleInStockChange}
              onSaleOnly={onSaleOnly}
              onToggleOnSale={handleOnSaleChange}
              minRating={minRating}
              onSelectMinRating={handleMinRatingChange}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={resetFilters}
            />
          </div>

          {/* Right Column: Sort Toolbar + Product Grid */}
          <div className="flex-1 w-full min-w-0 space-y-5">
            <ProductSortToolbar
              searchKeyword={searchKeyword}
              onSearchChange={handleSearchChange}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              totalCount={filteredProducts.length}
              onToggleMobileFilter={() => setShowMobileFilter(true)}
            />

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 h-80 animate-pulse flex flex-col justify-between"
                  >
                    <div className="w-full aspect-square bg-slate-100 rounded-xl mb-3" />
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                      <div className="h-5 bg-slate-200 rounded-md w-2/3 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Không tìm thấy điện thoại nào phù hợp
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Rất tiếc, không có sản phẩm nào khớp với tiêu chí lọc hoặc từ khóa tìm kiếm của bạn. Hãy thử thay đổi hoặc xóa bớt bộ lọc.
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer shadow-sm shadow-blue-500/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Xóa tất cả bộ lọc</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                <StorefrontPagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={PAGE_SIZE}
                  onPageChange={handlePageChange}
                  className="mt-6"
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Filter Modal / Drawer */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end lg:hidden">
          <div
            className="absolute inset-0"
            onClick={() => setShowMobileFilter(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-white flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Bộ lọc tìm kiếm</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilter(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Đóng bộ lọc"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <ProductFilterSidebar
                showBrands={false}
                priceRange={priceRange}
                onPriceRangeChange={handlePriceRangeChange}
                selectedStorages={selectedStorages}
                onToggleStorage={toggleStorage}
                selectedRams={selectedRams}
                onToggleRam={toggleRam}
                inStockOnly={inStockOnly}
                onToggleInStock={handleInStockChange}
                onSaleOnly={onSaleOnly}
                onToggleOnSale={handleOnSaleChange}
                minRating={minRating}
                onSelectMinRating={handleMinRatingChange}
                hasActiveFilters={hasActiveFilters}
                onResetFilters={resetFilters}
                className="border-0 shadow-none p-0"
              />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowMobileFilter(false)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer shadow-sm text-center text-sm"
              >
                Áp dụng ({filteredProducts.length} sản phẩm)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
