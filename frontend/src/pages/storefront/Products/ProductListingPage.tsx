import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Search,
  Check,
} from 'lucide-react';
import { productService } from '../../../services/productService';
import type { Product, Brand } from '../../../types';
import { ProductCard } from '../../../components/storefront/ProductCard';

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
  const [priceRange, setPriceRange] = useState<number>(50000000); // Max 50M
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating'>('default');
  const [searchKeyword, setSearchKeyword] = useState<string>(initialSearch);

  useEffect(() => {
    setLoading(true);
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

  const resetFilters = () => {
    setSelectedBrands([]);
    setSelectedStorages([]);
    setSelectedRams([]);
    setPriceRange(50000000);
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
          const matchBrand = p.brand?.name.toLowerCase().includes(kw);
          if (!matchName && !matchBrand) return false;
        }

        // Brand
        if (selectedBrands.length > 0) {
          const pBrand = p.brand?.name.toLowerCase() || '';
          if (!selectedBrands.includes(pBrand)) return false;
        }

        // Price (at least one variant within priceRange)
        const minVariantPrice = Math.min(...p.variants.map((v) => v.price));
        if (minVariantPrice > priceRange) return false;

        // Storage
        if (selectedStorages.length > 0) {
          const hasStorage = p.variants.some((v) =>
            selectedStorages.some((s) => v.storage.toLowerCase().includes(s.toLowerCase()))
          );
          if (!hasStorage) return false;
        }

        // RAM
        if (selectedRams.length > 0) {
          const hasRam = p.variants.some((v) =>
            v.ram ? selectedRams.some((r) => v.ram?.toLowerCase().includes(r.toLowerCase())) : false
          );
          if (!hasRam) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a.variants[0]?.price || 0;
        const priceB = b.variants[0]?.price || 0;
        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return 0;
      });
  }, [products, searchKeyword, selectedBrands, priceRange, selectedStorages, selectedRams, sortBy]);

  const storageOptions = ['128GB', '256GB', '512GB', '1TB'];
  const ramOptions = ['8GB', '12GB', '16GB'];

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Tất cả Điện thoại Thông minh
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tìm thấy <strong className="text-blue-600">{filteredProducts.length}</strong> sản phẩm chính hãng sẵn sàng giao ngay
          </p>
        </div>

        {/* Sort & Quick search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Lọc tên điện thoại..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 w-44 sm:w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
              <option value="rating">Đánh giá cao nhất</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <aside className="lg:col-span-1 space-y-6 bg-white p-5 rounded-2xl border border-slate-200 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Bộ lọc tìm kiếm</h3>
            </div>
            {(selectedBrands.length > 0 ||
              selectedStorages.length > 0 ||
              selectedRams.length > 0 ||
              priceRange < 50000000 ||
              searchKeyword) && (
              <button
                onClick={resetFilters}
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          {/* Filter: Brands */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Thương hiệu
            </h4>
            <div className="space-y-2">
              {brands.map((b) => {
                const checked = selectedBrands.includes(b.name.toLowerCase());
                return (
                  <label
                    key={b.id || b.slug}
                    onClick={() => toggleBrand(b.name)}
                    className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer hover:text-blue-600 select-none"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                        checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="font-medium">{b.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Filter: Price Range */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Mức giá tối đa
              </h4>
              <span className="text-xs font-bold text-blue-600">{formatPrice(priceRange)}</span>
            </div>
            <input
              type="range"
              min="10000000"
              max="50000000"
              step="1000000"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>10.000.000₫</span>
              <span>50.000.000₫</span>
            </div>
          </div>

          {/* Filter: Storage */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Bộ nhớ trong (ROM)
            </h4>
            <div className="flex flex-wrap gap-2">
              {storageOptions.map((st) => {
                const active = selectedStorages.includes(st);
                return (
                  <button
                    key={st}
                    onClick={() => toggleStorage(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter: RAM */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Dung lượng RAM
            </h4>
            <div className="flex flex-wrap gap-2">
              {ramOptions.map((ram) => {
                const active = selectedRams.includes(ram);
                return (
                  <button
                    key={ram}
                    onClick={() => toggleRam(ram)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {ram}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-3">
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
                onClick={resetFilters}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
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
    </div>
  );
};
