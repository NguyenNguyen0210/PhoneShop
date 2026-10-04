import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Drawer } from 'antd';
import { productService } from '../../../services/productService';
import type { Product, Brand } from '../../../types';
import { ProductCard } from '../../../components/storefront/ProductCard';
import { ProductFilterSidebar } from '../../../components/storefront/ProductFilterSidebar';
import {
  ProductSortToolbar,
  type ProductSortOption,
} from '../../../components/storefront/ProductSortToolbar';
import { StorefrontPagination } from '../../../components/storefront/StorefrontPagination';

export const ProductListingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialBrand = searchParams.get('brand') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const PAGE_SIZE = 12;

  const productListingRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    initialBrand ? [initialBrand.toLowerCase()] : []
  );
  const [selectedStorages, setSelectedStorages] = useState<string[]>([]);
  const [selectedRams, setSelectedRams] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [onSaleOnly, setOnSaleOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<ProductSortOption>('default');
  const [searchKeyword, setSearchKeyword] = useState<string>(initialSearch);
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

  // Hardware Specs & Extended Filters
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [has5GOnly, setHas5GOnly] = useState<boolean>(false);
  const [selectedScreenRanges, setSelectedScreenRanges] = useState<string[]>([]);
  const [selectedBatteryRanges, setSelectedBatteryRanges] = useState<string[]>([]);
  const [selectedOs, setSelectedOs] = useState<string[]>([]);
  const [selectedChipsets, setSelectedChipsets] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      productService.getProducts({ limit: 100 }),
      productService.getBrands(),
    ])
      .then(([res, brandsRes]) => {
        if (res.items) {
          setProducts(res.items);
        }
        if (Array.isArray(brandsRes)) {
          setBrands(brandsRes);
        }
      })
      .catch((err) => {
        console.error('Error fetching products from database:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Sync url param updates
  useEffect(() => {
    const urlBrand = searchParams.get('brand');
    const urlSearch = searchParams.get('search');
    if (!urlBrand && !urlSearch) return;

    const timer = setTimeout(() => {
      if (urlBrand) {
        const lower = urlBrand.toLowerCase();
        setSelectedBrands((prev) => (prev.includes(lower) ? prev : [lower]));
      }
      if (urlSearch) {
        setSearchKeyword(urlSearch);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    productListingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const toggleBrand = (brandName: string) => {
    const lower = brandName.toLowerCase();
    setSelectedBrands((prev) =>
      prev.includes(lower) ? prev.filter((b) => b !== lower) : [...prev, lower]
    );
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

  const handlePriceRangeChange = (range: [number, number]) => {
    setPriceRange(range);
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
    selectedBrands.length > 0 ||
    selectedStorages.length > 0 ||
    selectedRams.length > 0 ||
    selectedColors.length > 0 ||
    has5GOnly ||
    selectedScreenRanges.length > 0 ||
    selectedBatteryRanges.length > 0 ||
    selectedOs.length > 0 ||
    selectedChipsets.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < 50000000 ||
    inStockOnly ||
    onSaleOnly ||
    minRating !== null ||
    Boolean(searchKeyword.trim());

  const resetFilters = () => {
    setSelectedBrands([]);
    setSelectedStorages([]);
    setSelectedRams([]);
    setSelectedColors([]);
    setHas5GOnly(false);
    setSelectedScreenRanges([]);
    setSelectedBatteryRanges([]);
    setSelectedOs([]);
    setSelectedChipsets([]);
    setPriceRange([0, 50000000]);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setMinRating(null);
    setSearchKeyword('');
    setSortBy('default');
    setSearchParams({});
  };

  // Helper matching screen sizes
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

  // Helper matching battery
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

  // Helper matching chipsets
  const matchesChipset = (chipset?: string, selected?: string[]): boolean => {
    if (!selected || selected.length === 0) return true;
    if (!chipset) return false;
    const lower = chipset.toLowerCase();
    return selected.some((c) => {
      const chipLower = c.toLowerCase();
      return lower.includes(chipLower) || (c.includes('Apple') && lower.includes('apple'));
    });
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          const matchName = p.name.toLowerCase().includes(kw);
          const matchBrand = p.brand?.name?.toLowerCase().includes(kw);
          if (!matchName && !matchBrand) return false;
        }

        // Brand
        if (selectedBrands.length > 0) {
          const pBrand = p.brand?.name?.toLowerCase() || '';
          if (!selectedBrands.includes(pBrand)) return false;
        }

        // Price dual-range
        const variantPrices = p.variants?.map((v) => v.price) || [];
        const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
        if (minVariantPrice < priceRange[0] || minVariantPrice > priceRange[1]) return false;

        // Storage
        if (selectedStorages.length > 0) {
          const hasStorage = p.variants?.some((v) =>
            selectedStorages.some((s) => v.storage?.toLowerCase().includes(s.toLowerCase()))
          );
          if (!hasStorage) return false;
        }

        // RAM
        if (selectedRams.length > 0) {
          const hasRam = p.variants?.some((v) =>
            v.ram ? selectedRams.some((r) => v.ram?.toLowerCase().includes(r.toLowerCase())) : false
          );
          if (!hasRam) return false;
        }

        // Color
        if (selectedColors.length > 0) {
          const hasColor = p.variants?.some((v) =>
            v.color
              ? selectedColors.some((c) => v.color?.toLowerCase().includes(c.toLowerCase()))
              : false
          );
          if (!hasColor) return false;
        }

        // 5G Network
        if (has5GOnly) {
          const specs: any = p.specs || {};
          const is5G = specs.has5G === true || p.name.toUpperCase().includes('5G');
          if (!is5G) return false;
        }

        // Screen Size
        if (selectedScreenRanges.length > 0) {
          const specs: any = p.specs || {};
          if (!matchesScreen(specs.screenSize, selectedScreenRanges)) return false;
        }

        // Battery Capacity
        if (selectedBatteryRanges.length > 0) {
          const specs: any = p.specs || {};
          if (!matchesBattery(specs.batteryCapacity, selectedBatteryRanges)) return false;
        }

        // OS
        if (selectedOs.length > 0) {
          const specs: any = p.specs || {};
          const productOs = specs.os?.toLowerCase() || (p.name.includes('iPhone') ? 'ios' : 'android');
          const hasOs = selectedOs.some((o) => productOs.includes(o.toLowerCase()));
          if (!hasOs) return false;
        }

        // Chipset
        if (selectedChipsets.length > 0) {
          const specs: any = p.specs || {};
          if (!matchesChipset(specs.chipset, selectedChipsets)) return false;
        }

        // In Stock
        if (inStockOnly) {
          const inStock = p.variants?.some((v) => {
            const qty = v.inventory?.availableQty ?? 0;
            return qty > 0;
          });
          if (!inStock) return false;
        }

        // On Sale
        if (onSaleOnly) {
          const onSale = p.variants?.some((v) => Boolean(v.compareAtPrice && v.compareAtPrice > v.price));
          if (!onSale) return false;
        }

        // Rating
        if (minRating !== null && (p.rating ?? 0) < minRating) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a.variants?.[0]?.price || 0;
        const priceB = b.variants?.[0]?.price || 0;

        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'newest') {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        }
        if (sortBy === 'best-seller') {
          const countA = a.reviewCount || 0;
          const countB = b.reviewCount || 0;
          return countB - countA;
        }
        if (sortBy === 'top-discount') {
          const discountA = a.variants?.reduce((max, v) => {
            if (v.compareAtPrice && v.compareAtPrice > v.price) {
              const pct = (Number(v.compareAtPrice) - Number(v.price)) / Number(v.compareAtPrice);
              return Math.max(max, pct);
            }
            return max;
          }, 0) || 0;
          const discountB = b.variants?.reduce((max, v) => {
            if (v.compareAtPrice && v.compareAtPrice > v.price) {
              const pct = (Number(v.compareAtPrice) - Number(v.price)) / Number(v.compareAtPrice);
              return Math.max(max, pct);
            }
            return max;
          }, 0) || 0;
          return discountB - discountA;
        }
        return 0;
      });
  }, [
    products,
    searchKeyword,
    selectedBrands,
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
    <div ref={productListingRef} className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Tất cả Điện thoại Thông minh
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Khám phá các dòng điện thoại thông minh chính hãng với giá tốt nhất cùng nhiều ưu đãi hấp dẫn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 h-fit sticky top-20">
          <ProductFilterSidebar
            showBrands={true}
            brands={brands}
            selectedBrands={selectedBrands}
            onToggleBrand={toggleBrand}
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
        </aside>

        {/* Product Grid Area & Toolbar */}
        <div className="lg:col-span-3 space-y-6">
          <ProductSortToolbar
            searchKeyword={searchKeyword}
            onSearchChange={handleSearchChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            totalCount={filteredProducts.length}
            onToggleMobileFilter={() => setShowMobileFilter(true)}
          />

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <span>Đang tải danh sách thiết bị...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
              <p className="text-base font-semibold text-slate-800">
                Không tìm thấy sản phẩm phù hợp
              </p>
              <p className="text-xs text-slate-500">
                Hãy thử nới lỏng bộ lọc hoặc tìm kiếm theo tên hãng khác.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
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

      {/* Mobile Filter Drawer */}
      <Drawer
        title="Bộ lọc tìm kiếm"
        placement="left"
        onClose={() => setShowMobileFilter(false)}
        open={showMobileFilter}
        width={320}
        styles={{ body: { padding: '16px' } }}
      >
        <ProductFilterSidebar
          showBrands={true}
          brands={brands}
          selectedBrands={selectedBrands}
          onToggleBrand={toggleBrand}
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
      </Drawer>
    </div>
  );
};

export default ProductListingPage;
