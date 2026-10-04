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
import { flashSaleService } from '../../../services/flashSaleService';
import type { Product, Brand, FlashSaleCampaign } from '../../../types';
import { ProductCard } from '../../../components/storefront/ProductCard';
import { FlashSaleSection } from '../../../components/storefront/FlashSaleSection';
import { BrandLogo } from '../../../components/common/BrandLogo';
import { ProductFilterSidebar } from '../../../components/storefront/ProductFilterSidebar';
import {
  ProductSortToolbar,
  type ProductSortOption,
} from '../../../components/storefront/ProductSortToolbar';
import { StorefrontPagination } from '../../../components/storefront/StorefrontPagination';
import { FALLBACK_PRODUCT_IMAGE } from '../../../utils/imageFallback';

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const PAGE_SIZE = 12;

  const productGridRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeFlashSale, setActiveFlashSale] = useState<FlashSaleCampaign | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBrand, setSelectedBrand] = useState<string>(() => searchParams.get('brand') || 'all');

  // Advanced Filter & Sort states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
  const [selectedStorages, setSelectedStorages] = useState<string[]>([]);
  const [selectedRams, setSelectedRams] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [has5GOnly, setHas5GOnly] = useState<boolean>(false);
  const [selectedScreenRanges, setSelectedScreenRanges] = useState<string[]>([]);
  const [selectedBatteryRanges, setSelectedBatteryRanges] = useState<string[]>([]);
  const [selectedOs, setSelectedOs] = useState<string[]>([]);
  const [selectedChipsets, setSelectedChipsets] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [onSaleOnly, setOnSaleOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>(() => searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<ProductSortOption>('default');
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

  const lastScrolledParamsRef = useRef<string | null>(null);

  // Synchronize URL search params (?search=..., ?brand=...) and auto-scroll to products
  useEffect(() => {
    const searchParam = searchParams.get('search');
    const brandParam = searchParams.get('brand');

    if (searchParam !== null) {
      setSearchKeyword(searchParam);
    }

    if (brandParam !== null) {
      const matchedBrand = brands.find(
        (b) =>
          b.name.toLowerCase() === brandParam.toLowerCase() ||
          b.slug?.toLowerCase() === brandParam.toLowerCase()
      );
      setSelectedBrand(matchedBrand ? matchedBrand.name : brandParam);
    }

    if (searchParam || brandParam) {
      const currentParamKey = `${searchParam ?? ''}__${brandParam ?? ''}`;
      if (lastScrolledParamsRef.current !== currentParamKey) {
        lastScrolledParamsRef.current = currentParamKey;
        productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [searchParams, brands]);

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

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // STATIC_HERO marketing copy — paired with live catalog data below.
  // Ids, names, prices and images always come from productService.getProducts(),
  // never from hardcoded values, so the banner can never drift from the DB.
  const HERO_COPY = [
    {
      tagline: 'Flagship nổi bật • Chính hãng 100%',
      badge: 'Nổi Bật Nhất',
      stockStatus: 'Sẵn hàng tại kho – Giao hỏa tốc hôm nay',
    },
    {
      tagline: 'Công nghệ đỉnh cao • Trả góp 0%',
      badge: 'Công Nghệ Đỉnh Cao',
      stockStatus: 'Sẵn sàng xuất kho ngay',
    },
    {
      tagline: 'Thiết kế đột phá • Ưu đãi hôm nay',
      badge: 'Đáng Mua Nhất',
      stockStatus: 'Đặt giữ ưu đãi ngay',
    },
  ];

  const heroShowcases = useMemo(() => {
    return products.slice(0, 3).map((p, i) => {
      const primary = p.variants?.[0];
      const price = primary?.price ?? 0;
      const comparePrice = primary?.compareAtPrice ?? price;
      const copy = HERO_COPY[i % HERO_COPY.length];
      return {
        id: p.id,
        brand: p.brand?.name ?? '',
        tagline: copy.tagline,
        name: p.name,
        description: p.description ?? '',
        price,
        comparePrice,
        monthlyPay: `${new Intl.NumberFormat('vi-VN').format(Math.round(price / 12))}₫/tháng`,
        image: p.thumbnail ?? p.thumbnailUrl ?? FALLBACK_PRODUCT_IMAGE,
        badge: copy.badge,
        stockStatus: copy.stockStatus,
      };
    });
  }, [products]);

  const currentHero = heroShowcases.length > 0 ? heroShowcases[heroIndex % heroShowcases.length] : null;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productService.getProducts({ limit: 100 }),
      productService.getBrands(),
      flashSaleService.getActiveCampaign().catch(() => null),
    ])
      .then(([prodRes, brandsRes, flashSaleRes]) => {
        if (prodRes.items) {
          setProducts(prodRes.items);
        }
        if (Array.isArray(brandsRes) && brandsRes.length > 0) {
          setBrands(brandsRes);
        }
        if (flashSaleRes) {
          setActiveFlashSale(flashSaleRes);
        }
      })
      .catch((err) => {
        console.error('Failed to load catalog from database:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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

  const toggleColor = (color: string) => {
    const lower = color.toLowerCase();
    setSelectedColors((prev) =>
      prev.includes(lower) ? prev.filter((c) => c !== lower) : [...prev, lower]
    );
    resetPageToFirst();
  };

  const toggle5G = (val: boolean) => {
    setHas5GOnly(val);
    resetPageToFirst();
  };

  const toggleScreenRange = (range: string) => {
    setSelectedScreenRanges((prev) =>
      prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range]
    );
    resetPageToFirst();
  };

  const toggleBatteryRange = (range: string) => {
    setSelectedBatteryRanges((prev) =>
      prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range]
    );
    resetPageToFirst();
  };

  const toggleOs = (os: string) => {
    setSelectedOs((prev) =>
      prev.includes(os) ? prev.filter((o) => o !== os) : [...prev, os]
    );
    resetPageToFirst();
  };

  const toggleChipset = (chip: string) => {
    setSelectedChipsets((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
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

  const handleSortChange = (sort: ProductSortOption) => {
    setSortBy(sort);
    resetPageToFirst();
  };

  const hasActiveFilters =
    selectedBrand !== 'all' ||
    priceRange[0] > 0 ||
    priceRange[1] < 50000000 ||
    selectedStorages.length > 0 ||
    selectedRams.length > 0 ||
    selectedColors.length > 0 ||
    has5GOnly ||
    selectedScreenRanges.length > 0 ||
    selectedBatteryRanges.length > 0 ||
    selectedOs.length > 0 ||
    selectedChipsets.length > 0 ||
    inStockOnly ||
    onSaleOnly ||
    minRating !== null ||
    searchKeyword.trim() !== '';

  const resetFilters = () => {
    setSelectedBrand('all');
    setPriceRange([0, 50000000]);
    setSelectedStorages([]);
    setSelectedRams([]);
    setSelectedColors([]);
    setHas5GOnly(false);
    setSelectedScreenRanges([]);
    setSelectedBatteryRanges([]);
    setSelectedOs([]);
    setSelectedChipsets([]);
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

  const matchesScreen = (screenSize?: number, ranges?: string[]): boolean => {
    if (!ranges || ranges.length === 0) return true;
    if (!screenSize) return false;
    return ranges.some((range) => {
      if (range === '< 6.1"') return screenSize < 6.1;
      if (range === '6.1" - 6.7"') return screenSize >= 6.1 && screenSize <= 6.7;
      if (range === '> 6.7"') return screenSize > 6.7;
      return true;
    });
  };

  const matchesBattery = (battery?: number, ranges?: string[]): boolean => {
    if (!ranges || ranges.length === 0) return true;
    if (!battery) return false;
    return ranges.some((range) => {
      if (range === '< 4000 mAh') return battery < 4000;
      if (range === '4000 - 5000 mAh') return battery >= 4000 && battery <= 5000;
      if (range === '> 5000 mAh') return battery > 5000;
      return true;
    });
  };

  const matchesChipset = (chipset?: string, selected?: string[]): boolean => {
    if (!selected || selected.length === 0) return true;
    if (!chipset) return false;
    const lower = chipset.toLowerCase();
    return selected.some((c) => {
      const chipLower = c.toLowerCase();
      return lower.includes(chipLower) || (c.includes('Apple') && lower.includes('apple'));
    });
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

      // Color filter
      if (selectedColors.length > 0) {
        const matchesColor = p.variants?.some((v) =>
          v.color
            ? selectedColors.some((c) => v.color?.toLowerCase().includes(c.toLowerCase()))
            : false
        );
        if (!matchesColor) return false;
      }

      // 5G Network filter
      if (has5GOnly) {
        const specs: any = p.specs || {};
        const is5G = specs.has5G === true || p.name.toUpperCase().includes('5G');
        if (!is5G) return false;
      }

      // Screen size filter
      if (selectedScreenRanges.length > 0) {
        const specs: any = p.specs || {};
        if (!matchesScreen(specs.screenSize, selectedScreenRanges)) return false;
      }

      // Battery capacity filter
      if (selectedBatteryRanges.length > 0) {
        const specs: any = p.specs || {};
        if (!matchesBattery(specs.batteryCapacity, selectedBatteryRanges)) return false;
      }

      // OS filter
      if (selectedOs.length > 0) {
        const specs: any = p.specs || {};
        const productOs = specs.os?.toLowerCase() || (p.name.includes('iPhone') ? 'ios' : 'android');
        const hasOs = selectedOs.some((o) => productOs.includes(o.toLowerCase()));
        if (!hasOs) return false;
      }

      // Chipset filter
      if (selectedChipsets.length > 0) {
        const specs: any = p.specs || {};
        if (!matchesChipset(specs.chipset, selectedChipsets)) return false;
      }

      // In stock only filter
      if (inStockOnly) {
        const inStock = p.variants?.some(
          (v) => (v.inventory?.availableQty ?? 0) > 0
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
    } else if (sortBy === 'best-seller') {
      filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    } else if (sortBy === 'top-discount') {
      filtered.sort((a, b) => {
        const discountA = a.variants?.reduce((max, v) => {
          if (typeof v.compareAtPrice === 'number' && v.compareAtPrice > v.price) {
            return Math.max(max, (v.compareAtPrice - v.price) / v.compareAtPrice);
          }
          return max;
        }, 0) || 0;
        const discountB = b.variants?.reduce((max, v) => {
          if (typeof v.compareAtPrice === 'number' && v.compareAtPrice > v.price) {
            return Math.max(max, (v.compareAtPrice - v.price) / v.compareAtPrice);
          }
          return max;
        }, 0) || 0;
        return discountB - discountA;
      });
    }

    return filtered;
  }, [
    products,
    selectedBrand,
    searchKeyword,
    priceRange,
    selectedStorages,
    selectedRams,
    selectedColors,
    has5GOnly,
    selectedScreenRanges,
    selectedBatteryRanges,
    selectedOs,
    selectedChipsets,
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
        {currentHero ? (
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
        ) : (
          <div className="relative rounded-3xl bg-white border border-slate-200/80 p-10 text-center text-sm text-slate-400 animate-pulse">
            Đang tải sản phẩm nổi bật...
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          1.5. FLASH SALE CAMPAIGN SECTION
          ───────────────────────────────────────────────────────────── */}
      {activeFlashSale && <FlashSaleSection campaign={activeFlashSale} />}

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
              selectedColors={selectedColors}
              onToggleColor={toggleColor}
              has5GOnly={has5GOnly}
              onToggle5G={toggle5G}
              selectedScreenRanges={selectedScreenRanges}
              onToggleScreenRange={toggleScreenRange}
              selectedBatteryRanges={selectedBatteryRanges}
              onToggleBatteryRange={toggleBatteryRange}
              selectedOs={selectedOs}
              onToggleOs={toggleOs}
              selectedChipsets={selectedChipsets}
              onToggleChipset={toggleChipset}
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
                selectedColors={selectedColors}
                onToggleColor={toggleColor}
                has5GOnly={has5GOnly}
                onToggle5G={toggle5G}
                selectedScreenRanges={selectedScreenRanges}
                onToggleScreenRange={toggleScreenRange}
                selectedBatteryRanges={selectedBatteryRanges}
                onToggleBatteryRange={toggleBatteryRange}
                selectedOs={selectedOs}
                onToggleOs={toggleOs}
                selectedChipsets={selectedChipsets}
                onToggleChipset={toggleChipset}
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
