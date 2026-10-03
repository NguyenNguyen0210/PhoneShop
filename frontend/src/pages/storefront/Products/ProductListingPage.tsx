import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Drawer } from 'antd';
import { productService } from '../../../services/productService';
import type { Product, Brand } from '../../../types';
import { ProductCard } from '../../../components/storefront/ProductCard';
import { ProductFilterSidebar } from '../../../components/storefront/ProductFilterSidebar';
import { ProductSortToolbar } from '../../../components/storefront/ProductSortToolbar';

export const ProductListingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialBrand = searchParams.get('brand') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    initialBrand ? [initialBrand.toLowerCase()] : []
  );
  const [selectedStorages, setSelectedStorages] = useState<string[]>([]);
  const [selectedRams, setSelectedRams] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [onSaleOnly, setOnSaleOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<
    'default' | 'price-asc' | 'price-desc' | 'rating' | 'newest'
  >('default');
  const [searchKeyword, setSearchKeyword] = useState<string>(initialSearch);
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

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

  const toggleBrand = (brandName: string) => {
    const lower = brandName.toLowerCase();
    setSelectedBrands((prev) =>
      prev.includes(lower) ? prev.filter((b) => b !== lower) : [...prev, lower]
    );
  };

  const toggleStorage = (storage: string) => {
    setSelectedStorages((prev) =>
      prev.includes(storage) ? prev.filter((s) => s !== storage) : [...prev, storage]
    );
  };

  const toggleRam = (ram: string) => {
    setSelectedRams((prev) =>
      prev.includes(ram) ? prev.filter((r) => r !== ram) : [...prev, ram]
    );
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedStorages.length > 0 ||
    selectedRams.length > 0 ||
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
    setPriceRange([0, 50000000]);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setMinRating(null);
    setSearchKeyword('');
    setSortBy('default');
    setSearchParams({});
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

        // In Stock
        if (inStockOnly) {
          const inStock = p.variants?.some((v) => {
            const qty = v.inventoryQty ?? v.inventory?.availableQty ?? 0;
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
        return 0;
      });
  }, [
    products,
    searchKeyword,
    selectedBrands,
    priceRange,
    selectedStorages,
    selectedRams,
    inStockOnly,
    onSaleOnly,
    minRating,
    sortBy,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            onPriceRangeChange={setPriceRange}
            selectedStorages={selectedStorages}
            onToggleStorage={toggleStorage}
            selectedRams={selectedRams}
            onToggleRam={toggleRam}
            inStockOnly={inStockOnly}
            onToggleInStock={setInStockOnly}
            onSaleOnly={onSaleOnly}
            onToggleOnSale={setOnSaleOnly}
            minRating={minRating}
            onSelectMinRating={setMinRating}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
          />
        </aside>

        {/* Product Grid Area & Toolbar */}
        <div className="lg:col-span-3 space-y-6">
          <ProductSortToolbar
            searchKeyword={searchKeyword}
            onSearchChange={setSearchKeyword}
            sortBy={sortBy}
            onSortChange={setSortBy}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
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
          onPriceRangeChange={setPriceRange}
          selectedStorages={selectedStorages}
          onToggleStorage={toggleStorage}
          selectedRams={selectedRams}
          onToggleRam={toggleRam}
          inStockOnly={inStockOnly}
          onToggleInStock={setInStockOnly}
          onSaleOnly={onSaleOnly}
          onToggleOnSale={setOnSaleOnly}
          minRating={minRating}
          onSelectMinRating={setMinRating}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          className="border-0 shadow-none p-0"
        />
      </Drawer>
    </div>
  );
};
