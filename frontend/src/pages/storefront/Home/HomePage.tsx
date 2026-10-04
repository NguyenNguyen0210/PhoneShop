import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RotateCcw,
  LayoutGrid,
  Smartphone,
  X,
  Filter,
} from 'lucide-react';
import { productService } from '../../../services/productService';
import { flashSaleService } from '../../../services/flashSaleService';
import type { Product } from '../../../types';
import { ProductCard } from '../../../components/storefront/ProductCard';
import { FlashSaleSection } from '../../../components/storefront/FlashSaleSection';
import { BrandLogo } from '../../../components/common/BrandLogo';
import { ProductFilterSidebar } from '../../../components/storefront/ProductFilterSidebar';
import {
  ProductSortToolbar,
  type ProductSortOption,
} from '../../../components/storefront/ProductSortToolbar';
import { StorefrontPagination } from '../../../components/storefront/StorefrontPagination';
import { HeroBannerShowcase } from '../../../components/storefront/HeroBannerShowcase';
import { useCatalogStore } from '../../../stores/useCatalogStore';

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const PAGE_SIZE = 12;

  const productGridRef = useRef<HTMLDivElement>(null);

  const {
    products,
    brands,
    activeFlashSale,
    hasLoaded,
    selectedBrand,
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
    searchKeyword,
    sortBy,
    scrollPosition,
    setCatalogData,
    setSelectedBrand,
    setPriceRange,
    setSelectedStorages,
    setSelectedRams,
    setSelectedColors,
    setHas5GOnly,
    setSelectedScreenRanges,
    setSelectedBatteryRanges,
    setSelectedOs,
    setSelectedChipsets,
    setInStockOnly,
    setOnSaleOnly,
    setMinRating,
    setSearchKeyword,
    setSortBy,
    resetFilters: resetStoreFilters,
    setScrollPosition,
  } = useCatalogStore();

  const [loading, setLoading] = useState<boolean>(!hasLoaded);
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

  const lastScrolledParamsRef = useRef<string | null>(
    scrollPosition > 0 ? `${searchParams.get('search') ?? ''}__${searchParams.get('brand') ?? ''}` : null
  );

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

  useEffect(() => {
    if (!hasLoaded) {
      setLoading(true);
    }
    Promise.all([
      productService.getProducts({ limit: 100 }),
      productService.getBrands(),
      flashSaleService.getActiveCampaign().catch(() => null),
    ])
      .then(([prodRes, brandsRes, flashSaleRes]) => {
        setCatalogData({
          products: prodRes.items || [],
          brands: Array.isArray(brandsRes) ? brandsRes : [],
          activeFlashSale: flashSaleRes || null,
        });
      })
      .catch((err) => {
        console.error('Failed to load catalog from database:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hasLoaded, setCatalogData]);

  // Continuously record scroll position on HomePage
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setScrollPosition(y);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      handleScroll();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [setScrollPosition]);

  // Restore scroll position when returning to HomePage
  useEffect(() => {
    if (hasLoaded && scrollPosition > 0) {
      window.scrollTo({ top: scrollPosition, left: 0, behavior: 'instant' });
      const timer = setTimeout(() => {
        window.scrollTo({ top: scrollPosition, left: 0, behavior: 'instant' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [hasLoaded]);

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
    resetStoreFilters();
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
          1. FLAGSHIP HERO BANNER SHOWCASE (AMBIENT GLOW & THEMES)
          ───────────────────────────────────────────────────────────── */}
      <HeroBannerShowcase products={products} loading={loading} />

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
