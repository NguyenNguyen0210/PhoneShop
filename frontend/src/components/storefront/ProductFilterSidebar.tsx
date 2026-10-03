import React from 'react';
import { Slider } from 'antd';
import { Filter, RotateCcw, Check, Star } from 'lucide-react';
import type { Brand } from '../../types';
import { BrandLogo } from '../common/BrandLogo';

export interface ProductFilterSidebarProps {
  priceRange: [number, number];
  onPriceRangeChange: (val: [number, number]) => void;
  selectedStorages: string[];
  onToggleStorage: (storage: string) => void;
  selectedRams: string[];
  onToggleRam: (ram: string) => void;
  inStockOnly: boolean;
  onToggleInStock: (val: boolean) => void;
  onSaleOnly: boolean;
  onToggleOnSale: (val: boolean) => void;
  minRating: number | null;
  onSelectMinRating: (rating: number | null) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  showBrands?: boolean;
  brands?: Brand[];
  selectedBrands?: string[];
  onToggleBrand?: (name: string) => void;
  className?: string;
}

const STORAGE_OPTIONS = ['128GB', '256GB', '512GB', '1TB'];
const RAM_OPTIONS = ['8GB', '12GB', '16GB'];

export const ProductFilterSidebar: React.FC<ProductFilterSidebarProps> = ({
  priceRange,
  onPriceRangeChange,
  selectedStorages,
  onToggleStorage,
  selectedRams,
  onToggleRam,
  inStockOnly,
  onToggleInStock,
  onSaleOnly,
  onToggleOnSale,
  minRating,
  onSelectMinRating,
  hasActiveFilters,
  onResetFilters,
  showBrands = false,
  brands = [],
  selectedBrands = [],
  onToggleBrand,
  className = '',
}) => {
  return (
    <aside
      className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Bộ lọc tìm kiếm</h3>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {/* Brands (Conditional) */}
      {showBrands && brands.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Thương hiệu
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {brands.map((b) => {
              const checked = selectedBrands.some(
                (brandName) => brandName.toLowerCase() === b.name.toLowerCase()
              );
              return (
                <label
                  key={b.id || b.slug}
                  onClick={() => onToggleBrand?.(b.name)}
                  className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer hover:text-blue-600 select-none transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      checked
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <BrandLogo
                    name={b.name}
                    slug={b.slug}
                    logoUrl={b.logoUrl || b.logo}
                    isSelected={checked}
                  />
                  <span className="font-medium">{b.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Khoảng giá
          </h4>
          <span className="text-xs font-bold text-blue-600">
            {priceRange[0].toLocaleString('vi-VN')}₫ - {priceRange[1].toLocaleString('vi-VN')}₫
          </span>
        </div>
        <Slider
          range
          min={0}
          max={50000000}
          step={500000}
          value={priceRange}
          onChange={(val) => onPriceRangeChange(val as [number, number])}
          tooltip={{
            formatter: (val) => `${(val ?? 0).toLocaleString('vi-VN')}₫`,
          }}
        />
        <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
          <span>0₫</span>
          <span>50.000.000₫</span>
        </div>
      </div>

      {/* Storage (ROM) */}
      <div>
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
          Bộ nhớ trong (ROM)
        </h4>
        <div className="flex flex-wrap gap-2">
          {STORAGE_OPTIONS.map((opt) => {
            const active = selectedStorages.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggleStorage(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Memory (RAM) */}
      <div>
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
          Dung lượng RAM
        </h4>
        <div className="flex flex-wrap gap-2">
          {RAM_OPTIONS.map((opt) => {
            const active = selectedRams.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggleRam(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status & Promotions */}
      <div>
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Tình trạng & Ưu đãi
        </h4>
        <div className="space-y-2.5">
          <label
            onClick={() => onToggleInStock(!inStockOnly)}
            className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer hover:text-blue-600 select-none transition-colors"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                inStockOnly
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {inStockOnly && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span className="font-medium">Đang có hàng sẵn</span>
          </label>

          <label
            onClick={() => onToggleOnSale(!onSaleOnly)}
            className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer hover:text-blue-600 select-none transition-colors"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                onSaleOnly
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {onSaleOnly && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span className="font-medium">Đang giảm giá</span>
          </label>
        </div>
      </div>

      {/* User Rating */}
      <div>
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
          Đánh giá
        </h4>
        <label
          onClick={() => onSelectMinRating(minRating === 4 ? null : 4)}
          className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer hover:text-blue-600 select-none transition-colors"
        >
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              minRating === 4
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-300 bg-white'
            }`}
          >
            {minRating === 4 && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <div className="flex items-center gap-1 font-medium">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Từ 4 sao trở lên (★ 4.0+)</span>
          </div>
        </label>
      </div>
    </aside>
  );
};

export default ProductFilterSidebar;
