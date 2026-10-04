import React, { useState } from 'react';
import { Slider } from 'antd';
import { Filter, RotateCcw, Check, Star, ChevronDown } from 'lucide-react';
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
  selectedColors?: string[];
  onToggleColor?: (c: string) => void;
  has5GOnly?: boolean;
  onToggle5G?: (v: boolean) => void;
  selectedScreenRanges?: string[];
  onToggleScreenRange?: (r: string) => void;
  selectedBatteryRanges?: string[];
  onToggleBatteryRange?: (r: string) => void;
  selectedOs?: string[];
  onToggleOs?: (os: string) => void;
  selectedChipsets?: string[];
  onToggleChipset?: (chip: string) => void;
  className?: string;
}

const QUICK_PRICES = [
  { label: '< 5 triệu', min: 0, max: 5000000 },
  { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
  { label: '10 - 20 triệu', min: 10000000, max: 20000000 },
  { label: '> 20 triệu', min: 20000000, max: 50000000 },
];

const RAM_OPTIONS = ['4GB', '6GB', '8GB', '12GB', '16GB'];
const STORAGE_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB'];

const SCREEN_OPTIONS = [
  { label: '< 6.1"', value: '< 6.1"' },
  { label: '6.1" - 6.7"', value: '6.1" - 6.7"' },
  { label: '> 6.7"', value: '> 6.7"' },
];

const BATTERY_OPTIONS = [
  { label: '< 4000 mAh', value: '< 4000 mAh' },
  { label: '4000 - 5000 mAh', value: '4000 - 5000 mAh' },
  { label: '> 5000 mAh', value: '> 5000 mAh' },
];

const OS_OPTIONS = ['iOS', 'Android'];
const CHIPSET_OPTIONS = ['Apple A-Series', 'Snapdragon', 'Dimensity', 'Exynos'];

const COLOR_OPTIONS = [
  { name: 'Đen', hex: '#000000' },
  { name: 'Trắng', hex: '#ffffff' },
  { name: 'Xanh', hex: '#2563eb' },
  { name: 'Titan', hex: '#78716c' },
  { name: 'Vàng', hex: '#eab308' },
  { name: 'Tím', hex: '#9333ea' },
  { name: 'Xanh lá', hex: '#16a34a' },
];

const RATING_OPTIONS = [
  { label: '★ 5.0 (Tuyệt đối)', value: 5 },
  { label: '★ Từ 4.0 trở lên', value: 4 },
  { label: '★ Từ 3.0 trở lên', value: 3 },
];

interface AccordionItemProps {
  title: string;
  badgeCount?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  badgeCount = 0,
  isOpen,
  onToggle,
  children,
}) => (
  <div className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 text-left cursor-pointer group select-none"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
          {title}
        </span>
        {badgeCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
            {badgeCount}
          </span>
        )}
      </div>
      <ChevronDown
        className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
    {isOpen && <div className="pt-2">{children}</div>}
  </div>
);

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
  showBrands = true,
  brands = [],
  selectedBrands = [],
  onToggleBrand,
  selectedColors = [],
  onToggleColor,
  has5GOnly = false,
  onToggle5G,
  selectedScreenRanges = [],
  onToggleScreenRange,
  selectedBatteryRanges = [],
  onToggleBatteryRange,
  selectedOs = [],
  onToggleOs,
  selectedChipsets = [],
  onToggleChipset,
  className = '',
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true,
    brands: true,
    specs: true,
    screenBattery: true,
    osChipset: true,
    colors: true,
    rating: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Badges per group
  const priceBadges =
    (priceRange[0] > 0 || priceRange[1] < 50000000 ? 1 : 0) +
    (has5GOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (inStockOnly ? 1 : 0);
  const brandBadges = selectedBrands.length;
  const specBadges = selectedRams.length + selectedStorages.length;
  const screenBatteryBadges = selectedScreenRanges.length + selectedBatteryRanges.length;
  const osChipsetBadges = selectedOs.length + selectedChipsets.length;
  const colorBadges = selectedColors.length;
  const ratingBadges = minRating !== null ? 1 : 0;

  const totalActive =
    priceBadges +
    brandBadges +
    specBadges +
    screenBatteryBadges +
    osChipsetBadges +
    colorBadges +
    ratingBadges;

  return (
    <aside
      className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Bộ lọc tìm kiếm</h3>
          {totalActive > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700">
              {totalActive}
            </span>
          )}
        </div>
        {(hasActiveFilters || totalActive > 0) && (
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

      {/* Group 1: Khoảng giá & Nhu cầu */}
      <AccordionItem
        title="Khoảng giá & Nhu cầu"
        badgeCount={priceBadges}
        isOpen={Boolean(openSections.price)}
        onToggle={() => toggleSection('price')}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Mức giá:</span>
            <span className="font-bold text-blue-600">
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

          {/* Quick Price Buttons */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {QUICK_PRICES.map((qp) => {
              const active = priceRange[0] === qp.min && priceRange[1] === qp.max;
              return (
                <button
                  key={qp.label}
                  type="button"
                  onClick={() => {
                    if (active) {
                      onPriceRangeChange([0, 50000000]);
                    } else {
                      onPriceRangeChange([qp.min, qp.max]);
                    }
                  }}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  {qp.label}
                </button>
              );
            })}
          </div>

          {/* Feature Toggle Chips */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onToggle5G?.(!has5GOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer select-none ${
                has5GOnly
                  ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span>⚡ Hỗ trợ 5G</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleOnSale(!onSaleOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer select-none ${
                onSaleOnly
                  ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span>🔥 Đang giảm giá</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleInStock(!inStockOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer select-none ${
                inStockOnly
                  ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span>📦 Có sẵn hàng</span>
            </button>
          </div>
        </div>
      </AccordionItem>

      {/* Group 2: Thương hiệu */}
      {showBrands && brands.length > 0 && (
        <AccordionItem
          title="Thương hiệu"
          badgeCount={brandBadges}
          isOpen={Boolean(openSections.brands)}
          onToggle={() => toggleSection('brands')}
        >
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {brands.map((b) => {
              const checked = selectedBrands.some(
                (brandName) =>
                  brandName.toLowerCase() === b.name.toLowerCase() ||
                  brandName.toLowerCase() === b.slug.toLowerCase()
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
        </AccordionItem>
      )}

      {/* Group 3: Cấu hình (RAM & ROM) */}
      <AccordionItem
        title="Cấu hình (RAM & ROM)"
        badgeCount={specBadges}
        isOpen={Boolean(openSections.specs)}
        onToggle={() => toggleSection('specs')}
      >
        <div className="space-y-3">
          <div>
            <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Dung lượng RAM
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {RAM_OPTIONS.map((opt) => {
                const active = selectedRams.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onToggleRam(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Bộ nhớ trong (ROM)
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {STORAGE_OPTIONS.map((opt) => {
                const active = selectedStorages.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onToggleStorage(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AccordionItem>

      {/* Group 4: Màn hình & Pin */}
      <AccordionItem
        title="Màn hình & Pin"
        badgeCount={screenBatteryBadges}
        isOpen={Boolean(openSections.screenBattery)}
        onToggle={() => toggleSection('screenBattery')}
      >
        <div className="space-y-3">
          <div>
            <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Kích thước màn hình
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {SCREEN_OPTIONS.map((item) => {
                const active = selectedScreenRanges.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onToggleScreenRange?.(item.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Dung lượng Pin
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {BATTERY_OPTIONS.map((item) => {
                const active = selectedBatteryRanges.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onToggleBatteryRange?.(item.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AccordionItem>

      {/* Group 5: Hệ điều hành & Chipset */}
      <AccordionItem
        title="Hệ điều hành & Chipset"
        badgeCount={osChipsetBadges}
        isOpen={Boolean(openSections.osChipset)}
        onToggle={() => toggleSection('osChipset')}
      >
        <div className="space-y-3">
          <div>
            <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Hệ điều hành
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {OS_OPTIONS.map((os) => {
                const active = selectedOs.includes(os);
                return (
                  <button
                    key={os}
                    type="button"
                    onClick={() => onToggleOs?.(os)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {os}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Chipset
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {CHIPSET_OPTIONS.map((chip) => {
                const active = selectedChipsets.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => onToggleChipset?.(chip)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AccordionItem>

      {/* Group 6: Bảng màu sắc (Color swatches) */}
      <AccordionItem
        title="Bảng màu sắc"
        badgeCount={colorBadges}
        isOpen={Boolean(openSections.colors)}
        onToggle={() => toggleSection('colors')}
      >
        <div className="grid grid-cols-2 gap-2">
          {COLOR_OPTIONS.map((c) => {
            const active = selectedColors.some(
              (sc) => sc.toLowerCase() === c.name.toLowerCase()
            );
            const isLight = c.hex.toLowerCase() === '#ffffff';
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onToggleColor?.(c.name)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                    isLight ? 'border-slate-300' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {active && (
                    <Check
                      className={`w-2.5 h-2.5 stroke-[3] ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                  )}
                </span>
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
      </AccordionItem>

      {/* Group 7: Đánh giá */}
      <AccordionItem
        title="Đánh giá"
        badgeCount={ratingBadges}
        isOpen={Boolean(openSections.rating)}
        onToggle={() => toggleSection('rating')}
      >
        <div className="space-y-2">
          {RATING_OPTIONS.map((item) => {
            const checked = minRating === item.value;
            return (
              <label
                key={item.value}
                onClick={() => onSelectMinRating(checked ? null : item.value)}
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
                <div className="flex items-center gap-1 font-medium">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{item.label}</span>
                </div>
              </label>
            );
          })}
        </div>
      </AccordionItem>
    </aside>
  );
};

export default ProductFilterSidebar;
