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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold tracking-wide">Giỏ hàng của bạn ({totalCount()})</h2>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-slate-800 transition"
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
                        item.product.thumbnail ||
                        'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=200&q=80'
                      }
                      alt={item.product.name}
                      className="w-18 h-18 object-cover rounded-lg border border-gray-100 bg-gray-50 shrink-0"
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
            <div className="border-t border-gray-100 bg-gray-50 p-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Tạm tính:</span>
                <span className="text-lg font-bold text-gray-900">{formatPrice(totalAmount())}</span>
              </div>
              <p className="text-xs text-gray-500">
                Chưa bao gồm giảm giá voucher và phí vận chuyển. Thiết bị sẽ được khóa IMEI trong 15
                phút ở bước thanh toán.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleViewCart}
                  className="w-full py-2.5 px-4 border border-gray-300 hover:border-gray-400 text-gray-700 bg-white font-medium text-sm rounded-lg transition text-center shadow-xs"
                >
                  Xem chi tiết giỏ
                </button>
                <button
                  onClick={handleCheckout}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-1.5 shadow-md shadow-red-200"
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
