import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
  ChevronRight,
  Star,
  AlertCircle,
} from 'lucide-react';
import { Modal, message } from 'antd';
import { useWishlistStore } from '../../../stores/useWishlistStore';
import { FALLBACK_PRODUCT_IMAGE } from '../../../utils/imageFallback';

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
        if (
          ['5G', '4G', 'AI', 'LTE', 'OIS', 'RAM', 'ROM', 'NFC', 'VI', 'IV', 'V', 'II', 'III', 'SE', 'FE'].includes(
            upper
          )
        ) {
          return upper;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
  return name;
};

// Currency formatter
const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const WishlistPage: React.FC = () => {
  const { items, isLoading, removeItem, clearAll, moveToCart, fetchWishlist } = useWishlistStore();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleMoveToCart = async (productId: string) => {
    try {
      setMovingId(productId);
      await moveToCart(productId);
      message.success('Đã chuyển sản phẩm vào giỏ hàng!');
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi chuyển vào giỏ hàng');
    } finally {
      setMovingId(null);
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      setRemovingId(productId);
      await removeItem(productId);
      message.info('Đã xóa khỏi danh sách yêu thích');
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi xóa khỏi danh sách yêu thích');
    } finally {
      setRemovingId(null);
    }
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: 'Xóa toàn bộ danh sách yêu thích?',
      icon: <AlertCircle className="w-5 h-5 text-rose-500 inline-block mr-2" />,
      content: 'Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi danh sách yêu thích không? Hành động này không thể hoàn tác.',
      okText: 'Xóa tất cả',
      okType: 'danger',
      cancelText: 'Giữ lại',
      centered: true,
      onOk: async () => {
        try {
          await clearAll();
          message.success('Đã xóa tất cả sản phẩm khỏi danh sách yêu thích');
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Lỗi khi xóa danh sách yêu thích');
        }
      },
    });
  };

  // 1. SKELETON LOADING STATE
  if (isLoading && items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Breadcrumb Skeleton */}
          <div className="h-4 bg-slate-200 rounded w-48 animate-pulse" />
          {/* Header Skeleton */}
          <div className="h-10 bg-slate-200 rounded w-72 animate-pulse" />
          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs animate-pulse space-y-4"
              >
                <div className="aspect-square bg-slate-100 rounded-xl w-full" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-4/5" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-6 bg-slate-100 rounded w-2/5" />
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="h-8 bg-slate-100 rounded-xl w-full" />
                  <div className="h-8 bg-slate-100 rounded-xl w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. EMPTY STATE
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">Sản phẩm yêu thích</span>
          </nav>

          {/* Empty Hero Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-14 text-center shadow-xs relative overflow-hidden">
            <div className="w-24 h-24 bg-gradient-to-tr from-rose-50 via-rose-100/50 to-pink-50 border border-rose-200/60 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-xs">
              <Heart className="w-12 h-12 stroke-[1.5] fill-rose-50" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Danh sách yêu thích của bạn đang trống
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2.5 max-w-md mx-auto leading-relaxed">
              Hãy lưu lại những mẫu điện thoại bạn yêu thích để dễ dàng theo dõi giá và so sánh bất cứ lúc nào.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/products"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <span>Khám phá điện thoại ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. MAIN WISHLIST GRID VIEW
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-blue-600 transition">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Sản phẩm yêu thích</span>
        </nav>

        {/* Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Sản phẩm yêu thích của bạn
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                {items.length} sản phẩm
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Danh sách các thiết bị bạn đang quan tâm và theo dõi giá
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl border border-rose-200 hover:border-rose-600 transition cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa tất cả</span>
          </button>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;

            const primaryVariant = product.variants?.[0];
            const price = primaryVariant?.price || 0;
            const compareAtPrice = primaryVariant?.compareAtPrice;
            const discountPercent =
              compareAtPrice && compareAtPrice > price
                ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
                : null;

            const storage = primaryVariant?.storage || '256GB';
            const chipset =
              product.specs?.['Chipset']?.split('(')?.[0]?.trim() ||
              product.specs?.['Màn hình']?.split('(')?.[0]?.trim() ||
              'Chính hãng';

            const totalAvailable =
              product.variants?.reduce(
                (sum, v) => sum + (v.inventory?.availableQty ?? 0),
                0
              ) ?? 0;
            const isInStock =
              product.variants && product.variants.length > 0
                ? totalAvailable > 0
                : product.status === 'ACTIVE';

            const productThumb =
              product.thumbnail ||
              product.thumbnailUrl ||
              primaryVariant?.images?.[0] ||
              primaryVariant?.imageUrl ||
              FALLBACK_PRODUCT_IMAGE;

            const isMoving = movingId === product.id;
            const isRemoving = removingId === product.id;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-slate-300"
              >
                <div>
                  {/* Top Badges: Brand & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {product.brand?.name || 'Chính hãng'}
                    </span>
                    {isInStock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Còn hàng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Tạm hết hàng
                      </span>
                    )}
                  </div>

                  {/* Product Thumbnail */}
                  <Link
                    to={`/products/${product.id}`}
                    className="relative my-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50/60 p-3 block"
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

                  {/* Tech Specs Pill */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600">
                      {storage}
                    </span>
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 truncate max-w-[130px]">
                      {chipset}
                    </span>
                  </div>

                  {/* Product Name (Title Case) */}
                  <Link to={`/products/${product.id}`} className="block">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-600 line-clamp-1 leading-snug">
                      {formatProductName(product.name)}
                    </h3>
                  </Link>

                  {/* Rating & Reviews */}
                  <div className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold mt-2 pt-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating ? Number(product.rating).toFixed(1) : 'Mới'}</span>
                    <span className="text-slate-400 font-normal">({product.reviewCount ?? 0})</span>
                  </div>
                </div>

                {/* Price & Action Buttons */}
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                  {/* Price & Compare-at-price with discount badge */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-bold font-mono text-slate-950 tabular-nums tracking-tight">
                      {formatPrice(price)}
                    </span>
                    {compareAtPrice && compareAtPrice > price && (
                      <span className="text-xs font-mono text-slate-400 line-through tabular-nums">
                        {formatPrice(compareAtPrice)}
                      </span>
                    )}
                    {discountPercent ? (
                      <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                        -{discountPercent}%
                      </span>
                    ) : null}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    {/* Action 1: Chuyển vào giỏ */}
                    <button
                      type="button"
                      onClick={() => handleMoveToCart(product.id)}
                      disabled={!isInStock || isMoving || isRemoving}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl shadow-xs transition ${
                        !isInStock
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{!isInStock ? 'Hết hàng' : isMoving ? 'Đang chuyển...' : 'Chuyển vào giỏ'}</span>
                    </button>

                    {/* Action 2: Bỏ thích */}
                    <button
                      type="button"
                      onClick={() => handleRemove(product.id)}
                      disabled={isMoving || isRemoving}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isRemoving ? 'Đang xóa...' : 'Bỏ thích'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
