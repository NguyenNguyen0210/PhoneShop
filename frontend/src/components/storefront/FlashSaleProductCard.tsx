import React from 'react';
import { Link } from 'react-router-dom';
import type { FlashSaleItem } from '../../types';
import { FALLBACK_PRODUCT_IMAGE } from '../../utils/imageFallback';

interface FlashSaleProductCardProps {
  item: FlashSaleItem;
}

export const FlashSaleProductCard: React.FC<FlashSaleProductCardProps> = ({ item }) => {
  const variant = item.variant;
  const productName = variant?.product?.name || variant?.name || 'Sản phẩm';
  const originalPrice = variant?.price || variant?.compareAtPrice || item.flashPrice;
  const discountPercent =
    originalPrice > item.flashPrice
      ? Math.round(((originalPrice - item.flashPrice) / originalPrice) * 100)
      : null;

  const productThumb =
    variant?.imageUrl ||
    (variant as any)?.images?.[0] ||
    variant?.product?.thumbnailUrl ||
    (variant?.product as any)?.thumbnail ||
    FALLBACK_PRODUCT_IMAGE;

  const productTarget =
    variant?.product?.slug || variant?.product?.id || item.variantId;
  const productUrl = `/products/${productTarget}`;

  // Format currency VND without breaking space to match tests and clean typography
  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString('vi-VN')}₫`;
  };

  // Progress bar calculation & label
  const stockLimit = item.stockLimit || 1;
  const soldCount = item.soldCount || 0;
  const percent = Math.min(100, Math.max(0, Math.round((soldCount / stockLimit) * 100)));

  let soldStatusText = `🔥 ĐÃ BÁN ${soldCount}/${stockLimit}`;
  if (soldCount === 0) {
    soldStatusText = 'VỪA MỞ BÁN';
  } else if (soldCount / stockLimit >= 0.8) {
    soldStatusText = `🔥 SẮP CHÁY HÀNG (${soldCount}/${stockLimit})`;
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white p-3.5 sm:p-4 border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-rose-300 transition-all duration-300 hover:-translate-y-1">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-1.5 min-h-[22px]">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
            ⚡ Giá Sốc
          </span>
          {discountPercent ? (
            <span className="rounded-md bg-rose-600 px-2 py-0.5 text-xs font-black text-white shadow-xs">
              -{discountPercent}%
            </span>
          ) : null}
        </div>

        {/* Product Image */}
        <Link
          to={productUrl}
          className="relative my-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50/70 p-2.5 block"
        >
          <img
            src={productThumb}
            alt={productName}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
            }}
          />
        </Link>

        {/* Specs Pill (Color, Storage) */}
        {(variant?.color || variant?.storage) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {variant.storage && (
              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-700">
                {variant.storage}
              </span>
            )}
            {variant.color && (
              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 truncate max-w-[120px]">
                {variant.color}
              </span>
            )}
          </div>
        )}

        {/* Product Title */}
        <Link to={productUrl} className="block">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-2 leading-snug">
            {productName}
          </h3>
        </Link>
      </div>

      {/* Pricing & Progress Bar */}
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-base sm:text-lg font-black font-mono text-rose-600 tabular-nums tracking-tight">
            {formatPrice(item.flashPrice)}
          </span>
          {originalPrice > item.flashPrice && (
            <span className="text-xs font-mono text-slate-400 line-through tabular-nums">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {/* Urgency Progress Bar */}
        <div className="space-y-1">
          <div className="relative w-full h-4 sm:h-4.5 bg-rose-100 rounded-full overflow-hidden flex items-center justify-center shadow-inner">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 transition-all duration-500 rounded-full"
              style={{ width: `${percent}%` }}
            />
            <span className="relative z-10 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-rose-950 px-2 drop-shadow-2xs select-none">
              {soldStatusText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
