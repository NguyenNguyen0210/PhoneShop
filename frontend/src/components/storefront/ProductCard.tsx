import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Star, Check, Heart } from 'lucide-react';
import { message } from 'antd';
import type { Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { useWishlistStore } from '../../stores/useWishlistStore';
import { getDistinctColors } from '../../utils/colorHelper';
import { FALLBACK_PRODUCT_IMAGE } from '../../utils/imageFallback';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCartStore();
  const [justAdded, setJustAdded] = useState(false);

  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);

  const primaryVariant = product.variants?.[0];
  const price = primaryVariant?.price || 0;
  const compareAtPrice = primaryVariant?.compareAtPrice;
  const discountPercent =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : null;

  // Format currency VND
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Helper to normalize uppercase product titles to clean Title Case
  const formatProductName = (name: string): string => {
    if (!name) return '';
    const letters = name.replace(/[^a-zA-Z]/g, '');
    const isAllCaps = letters.length > 3 && letters === letters.toUpperCase();
    if (isAllCaps) {
      return name
        .toLowerCase()
        .split(' ')
        .map((word) => {
          const upper = word.toUpperCase();
          if (['5G', '4G', 'AI', 'LTE', 'OIS', 'RAM', 'ROM', 'NFC', 'VI', 'IV', 'V', 'II', 'III', 'SE', 'FE'].includes(upper)) {
            return upper;
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    }
    return name;
  };

  // Quick specs summary (storage + chipset/specs)
  const storage = primaryVariant?.storage || '256GB';
  const chipset =
    product.specs?.['Chipset']?.split('(')?.[0]?.trim() ||
    product.specs?.['Màn hình']?.split('(')?.[0]?.trim() ||
    'Chính hãng';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (primaryVariant) {
      addItem(product, primaryVariant, 1);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem('mobilecommerce_access_token');
    if (!token) {
      message.warning('Vui lòng đăng nhập để lưu sản phẩm yêu thích!');
      navigate('/login', { state: { from: location } });
      return;
    }
    try {
      const isAdded = await toggleWishlist(product);
      message.success(isAdded ? 'Đã thêm vào danh sách yêu thích!' : 'Đã xóa khỏi danh sách yêu thích!');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể cập nhật danh sách yêu thích');
    }
  };

  const productThumb =
    product.thumbnail ||
    product.thumbnailUrl ||
    primaryVariant?.images?.[0] ||
    primaryVariant?.imageUrl ||
    FALLBACK_PRODUCT_IMAGE;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-slate-300">
      <div>
        {/* Top Badges: Brand & Discount */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {product.brand?.name || 'Chính hãng'}
          </span>
          {discountPercent ? (
            <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
              -{discountPercent}%
            </span>
          ) : (
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Trả góp 0%
            </span>
          )}
        </div>

        {/* Product Image (Consistent 1:1 Aspect Ratio) */}
        <div className="relative my-3">
          <Link
            to={`/products/${product.id}`}
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50/60 p-3 block"
          >
            <img
              src={productThumb}
              alt={product.name}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
              }}
            />
          </Link>
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={isInWishlist ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
            className={`absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs ring-1 ring-slate-200/80 shadow-2xs transition-all duration-200 hover:scale-110 hover:bg-white cursor-pointer active:scale-95 ${
              isInWishlist ? 'text-rose-500 shadow-rose-100' : 'text-slate-400 hover:text-rose-500'
            }`}
            title={isInWishlist ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          >
            <Heart
              className={`h-4 w-4 transition-all duration-200 ${
                isInWishlist ? 'fill-rose-500 stroke-rose-500 scale-105' : 'stroke-[2.2]'
              }`}
            />
          </button>
        </div>

        {/* Compact Tech Specs Pill */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600">
            {storage}
          </span>
          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 truncate max-w-[130px]">
            {chipset}
          </span>
        </div>

        {/* Product Title (Clean, Scannable Title Case) */}
        <Link to={`/products/${product.id}`} className="block">
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-600 line-clamp-1 leading-snug">
            {formatProductName(product.name)}
          </h3>
        </Link>

        {/* Rating and Color Swatches */}
        <div className="flex items-center justify-between mt-2 pt-1">
          {/* Star Rating — M18: null rating renders as "Mới" instead of fake 5.0 */}
          <div className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{product.rating ? Number(product.rating).toFixed(1) : 'Mới'}</span>
            <span className="text-slate-400 font-normal">({product.reviewCount ?? 0})</span>
          </div>

          {/* Authentic Real Device Color preview dots */}
          {(() => {
            const distinctColors = getDistinctColors(product.variants);
            if (distinctColors.length === 0) return null;

            return (
              <div
                className="flex items-center gap-1.5"
                title={`${distinctColors.length} màu sắc: ${distinctColors.map((c) => c.name).join(', ')}`}
              >
                <div className="flex items-center -space-x-1.5">
                  {distinctColors.slice(0, 4).map((c, idx) => (
                    <span
                      key={idx}
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs inline-block border border-slate-300/80 transition-transform duration-200 hover:scale-130 hover:z-20 cursor-pointer"
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
                {distinctColors.length > 4 && (
                  <span className="text-[10px] text-slate-500 font-mono font-medium">
                    +{distinctColors.length - 4}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Pricing & Full-Width Action Button */}
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        {/* Pricing */}
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-bold font-mono text-slate-950 tabular-nums tracking-tight">
            {formatPrice(price)}
          </span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-xs font-mono text-slate-400 line-through tabular-nums">
              {formatPrice(compareAtPrice)}
            </span>
          )}
        </div>

        {/* Full-Width Quick Add CTA */}
        <button
          type="button"
          onClick={handleQuickAdd}
          className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl font-semibold text-xs transition-all cursor-pointer active:scale-[0.98] ${
            justAdded
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800'
          }`}
          title="Thêm thiết bị này vào giỏ hàng"
        >
          {justAdded ? (
            <>
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Đã thêm vào giỏ!</span>
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              <span>Thêm vào giỏ</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
