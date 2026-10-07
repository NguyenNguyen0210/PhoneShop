import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export type ProductSortOption =
  | 'default'
  | 'price-asc'
  | 'price-desc'
  | 'rating'
  | 'newest'
  | 'best-seller'
  | 'top-discount';

export interface ProductSortToolbarProps {
  searchKeyword: string;
  onSearchChange: (kw: string) => void;
  sortBy: ProductSortOption | string;
  onSortChange: (sort: ProductSortOption | any) => void;
  totalCount: number;
  onToggleMobileFilter?: () => void;
  className?: string;
}

export const ProductSortToolbar: React.FC<ProductSortToolbarProps> = ({
  searchKeyword,
  onSearchChange,
  sortBy,
  onSortChange,
  totalCount,
  onToggleMobileFilter,
  className = '',
}) => {
  return (
    <div
      className={`bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-2 sm:gap-3 ${className}`}
    >
      {/* Left / Main area: Search input */}
      <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Lọc theo tên điện thoại..."
          className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 transition-colors"
        />
        {searchKeyword && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Xóa từ khóa tìm kiếm"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right area: Count, Mobile filter button & Sort dropdown */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Result count text (visible on desktop) */}
        <span className="hidden sm:inline-block text-xs sm:text-sm text-slate-500 whitespace-nowrap">
          Tìm thấy <span className="font-bold text-slate-900">{totalCount}</span> sản phẩm
        </span>

        {/* Mobile filter toggle button (visible on lg:hidden) */}
        {onToggleMobileFilter && (
          <button
            type="button"
            onClick={onToggleMobileFilter}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Bộ lọc</span>
          </button>
        )}

        {/* Sort select dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) =>
              onSortChange(
                e.target.value as ProductSortOption
              )
            }
            className="px-3 py-2 text-xs sm:text-sm font-medium bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:border-blue-500 cursor-pointer transition-colors"
          >
            <option value="default">Sắp xếp: Mặc định</option>
            <option value="best-seller">🔥 Bán chạy nhất</option>
            <option value="top-discount">💥 Khuyến mãi nhiều nhất</option>
            <option value="price-asc">Giá: Thấp đến Cao</option>
            <option value="price-desc">Giá: Cao đến Thấp</option>
            <option value="rating">Đánh giá cao nhất</option>
            <option value="newest">Sản phẩm mới nhất</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProductSortToolbar;
