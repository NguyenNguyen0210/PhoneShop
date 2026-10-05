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
  const flashPrice = Number(item.flashPrice) || 0;
  const originalPrice = Number(variant?.price || variant?.compareAtPrice || flashPrice);
  const discountPercent =
    originalPrice > flashPrice
      ? Math.round(((originalPrice - flashPrice) / originalPrice) * 100)
      : null;

  const productThumb =
    variant?.imageUrl ||
    (variant as any)?.images?.[0] ||
    variant?.product?.thumbnailUrl ||
    (variant?.product as any)?.thumbnail ||
    FALLBACK_PRODUCT_IMAGE;

  const productTarget =
    variant?.product?.slug || variant?.product?.id || item.variantId;
  const productUrl = `/products/${productTarget}?variantId=${item.variantId}`;

  // Format currency VND with thousand separators (e.g. 11.871.000₫)
  const formatPrice = (amount: number | string) => {
    const num = Math.round(Number(amount) || 0);
    return `${num.toLocaleString('vi-VN')}₫`;
  };

  // Progress bar calculation & label
  const stockLimit = item.stockLimit || 1;
  const soldCount = item.soldCount || 0;
  const percent = Math.min(100, Math.max(0, Math.round((soldCount / stockLimit) * 100)));

  let soldStatusText = `Đã bán ${soldCount}/${stockLimit}`;
  if (soldCount === 0) {
    soldStatusText = 'Vừa mở bán';
  } else if (soldCount / stockLimit >= 0.8) {
    soldStatusText = `Sắp cháy hàng (${soldCount}/${stockLimit})`;
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white p-3.5 sm:p-4 border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-rose-300 transition-all duration-300 hover:-translate-y-1">
      <div>
        {/* Top Badges — chỉ giữ badge % giảm giá góc phải cho thoáng */}
        <div className="flex items-center justify-end gap-1.5 min-h-[22px]">
          {discountPercent ? (
            <span className="rounded-md bg-rose-600 px-2 py-0.5 text-xs font-black text-white shadow-xs">
              -{discountPercent}%
            </span>
          ) : (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Hot
            </span>
          )}
        </div>

        {/* Product Image — khung cố định để mọi máy cân đối */}
        <Link
          to={productUrl}
          className="relative my-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50/70 p-2 block"
        >
          <img
            src={productThumb}
            alt={productName}
            className="max-h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
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
          <span className="text-base sm:text-lg font-black text-rose-600 tabular-nums tracking-tight">
            {formatPrice(flashPrice)}
          </span>
          {originalPrice > flashPrice && (
            <span className="text-xs text-slate-400 line-through tabular-nums font-medium">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {/* Urgency Progress Bar — track nhạt + fill đỏ cam + chữ trắng tương phản cao */}
        <div className="space-y-1">
          <div
            className="relative w-full h-5 bg-red-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={soldStatusText}
            title={soldStatusText}
          >
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-red-600 rounded-full flex items-center justify-end pr-1 transition-all duration-500"
              style={{ width: `${Math.max(percent, soldCount > 0 ? 12 : 0)}%` }}
            >
              {percent > 8 && (
                <span className="text-[10px] leading-none" aria-hidden="true">
                  🔥
                </span>
              )}
            </div>
            <span
              className={
                percent === 0
                  ? 'absolute inset-0 flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider text-red-800 select-none px-2 truncate'
                  : 'absolute inset-0 flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider text-white [text-shadow:0_1px_3px_rgba(127,29,29,0.9)] select-none px-2 truncate'
              }
            >
              {soldStatusText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
