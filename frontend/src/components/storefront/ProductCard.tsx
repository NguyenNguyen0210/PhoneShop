import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Eye } from 'lucide-react';
import type { Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCartStore();

  const primaryVariant = product.variants?.[0];
  const price = primaryVariant?.price || 0;
  const compareAtPrice = primaryVariant?.compareAtPrice;
  const discountPercent =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : null;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (primaryVariant) {
      addItem(product, primaryVariant, 1);
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* Discount badge */}
      {discountPercent && (
        <div className="absolute top-3 left-3 z-10 bg-red-600 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-full shadow-sm">
          -{discountPercent}%
        </div>
      )}

      {/* Brand badge */}
      <div className="absolute top-3 right-3 z-10 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
        {product.brand?.name || 'Chính hãng'}
      </div>

      {/* Image container */}
      <Link
        to={`/products/${product.id}`}
        className="relative pt-[85%] overflow-hidden bg-slate-50 flex items-center justify-center p-4 block"
      >
        <img
          src={
            product.thumbnail ||
            primaryVariant?.images?.[0] ||
            'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=400&q=80'
          }
          alt={product.name}
          className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </Link>

      {/* Content info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Storage tags */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {product.variants?.slice(0, 3).map((v) => (
              <span
                key={v.id}
                className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md"
              >
                {v.storage}
              </span>
            ))}
          </div>

          <Link to={`/products/${product.id}`}>
            <h3 className="text-sm font-bold text-slate-900 hover:text-blue-600 transition line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Color options dots */}
          <div className="flex items-center gap-1.5 my-2">
            {product.variants?.map((v) => (
              <span
                key={v.id}
                title={v.color}
                className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                style={{ backgroundColor: v.colorHex || '#94a3b8' }}
              />
            ))}
            <span className="text-[11px] text-slate-400 ml-1">
              ({product.variants?.length || 1} màu)
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold mb-3">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{product.rating || '4.9'}</span>
            <span className="text-slate-400 font-normal">({product.reviewCount || 120})</span>
          </div>
        </div>

        {/* Pricing & Actions */}
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-base font-extrabold text-red-600">{formatPrice(price)}</span>
            {compareAtPrice && compareAtPrice > price && (
              <span className="text-xs text-slate-400 line-through">
                {formatPrice(compareAtPrice)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            <Link
              to={`/products/${product.id}`}
              className="col-span-3 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem chi tiết</span>
            </Link>
            <button
              onClick={handleQuickAdd}
              className="col-span-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition shadow-xs"
              title="Thêm vào giỏ"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Mua</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
