import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { items, isDrawerOpen, setDrawerOpen, updateQuantity, removeItem, totalAmount, totalCount } =
    useCartStore();

  if (!isDrawerOpen) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCheckout = () => {
    setDrawerOpen(false);
    navigate('/checkout');
  };

  const handleViewCart = () => {
    setDrawerOpen(false);
    navigate('/cart');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 bg-white text-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Giỏ hàng ({totalCount()})</h2>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Đóng giỏ hàng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <p className="text-lg font-medium text-gray-700">Giỏ hàng đang trống</p>
                <p className="text-sm text-gray-500 mt-1">Chưa có thiết bị công nghệ nào được chọn</p>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/products');
                  }}
                  className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
                >
                  Khám phá điện thoại ngay
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="py-4 flex gap-4 items-center">
                    <img
                      src={
                        item.variant.images?.[0] ||
                        (item.variant as any).imageUrl ||
                        item.product.thumbnail ||
                        (item.product as any).thumbnailUrl ||
                        '/images/products/iphone-16-pro-max.png'
                      }
                      alt={item.product.name}
                      className="w-18 h-18 object-contain rounded-lg border border-gray-100 bg-gray-50 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/products/iphone-16-pro-max.png';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Màu: <span className="font-medium text-gray-700">{item.variant.color}</span> |{' '}
                        {item.variant.storage}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-red-600">
                          {formatPrice(item.price)}
                        </span>

                        <div className="flex items-center border border-gray-200 rounded-md">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-gray-600 hover:bg-gray-100 transition rounded-l"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-semibold text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-gray-600 hover:bg-gray-100 transition rounded-r"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                      title="Xóa khỏi giỏ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/80 p-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Tạm tính:</span>
                <span className="text-xl font-black font-mono text-blue-600 tabular-nums">{formatPrice(totalAmount())}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Chưa bao gồm giảm giá voucher và ưu đãi vận chuyển. Quý khách có thể áp dụng mã ưu đãi ở bước thanh toán.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleViewCart}
                  className="w-full py-3 px-4 border border-slate-200 hover:border-slate-300 text-slate-700 bg-white font-bold text-xs sm:text-sm rounded-xl transition text-center shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  Xem chi tiết giỏ
                </button>
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <span>Thanh toán</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
