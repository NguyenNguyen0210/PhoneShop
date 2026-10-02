import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Tag,
  Check,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, totalAmount } = useCartStore();

  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);
  const [voucherError, setVoucherError] = useState('');

  const subtotal = totalAmount();
  const shippingFee = subtotal > 500000 || subtotal === 0 ? 0 : 30000;

  let discountAmount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.code === 'WELCOME50') {
      discountAmount = 50000;
    } else if (appliedVoucher.code === 'FREESHIP') {
      discountAmount = shippingFee;
    } else if (appliedVoucher.code === 'VIP10') {
      discountAmount = Math.min(Math.round(subtotal * 0.1), 1000000);
    } else {
      discountAmount = appliedVoucher.discount;
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError('');
    const code = voucherCode.trim().toUpperCase();

    if (!code) {
      setVoucherError('Vui lòng nhập mã giảm giá');
      return;
    }

    if (code === 'WELCOME50') {
      setAppliedVoucher({
        code: 'WELCOME50',
        discount: 50000,
        description: 'Giảm 50.000₫ cho khách hàng mới',
      });
    } else if (code === 'FREESHIP') {
      setAppliedVoucher({
        code: 'FREESHIP',
        discount: 30000,
        description: 'Miễn phí vận chuyển toàn quốc',
      });
    } else if (code === 'VIP10') {
      setAppliedVoucher({
        code: 'VIP10',
        discount: Math.round(subtotal * 0.1),
        description: 'Giảm 10% tối đa 1.000.000₫ cho thành viên VIP',
      });
    } else {
      setVoucherError('Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng.');
    }
  };

  const handleProceedCheckout = () => {
    // Pass applied voucher in query or sessionStorage
    if (appliedVoucher) {
      sessionStorage.setItem('mobilecommerce_voucher', JSON.stringify(appliedVoucher));
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Giỏ hàng của bạn đang trống</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Không có sản phẩm nào trong giỏ hàng. Hãy khám phá danh sách điện thoại chính hãng của chúng
          tôi ngay hôm nay!
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Tiếp tục mua sắm</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Giỏ hàng của bạn ({items.reduce((s, i) => s + i.quantity, 0)} sản phẩm)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kiểm tra thông tin biến thể màu sắc, dung lượng và chuẩn bị khóa giữ IMEI
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-red-600 hover:text-red-700 font-semibold hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa tất cả</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-6 divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-5 items-center">
                {/* Product image */}
                <img
                  src={
                    item.variant.images?.[0] ||
                    item.product.thumbnail ||
                    'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5'
                  }
                  alt={item.product.name}
                  className="w-24 h-24 object-contain rounded-2xl p-2 bg-slate-50 border border-slate-100 shrink-0"
                />

                {/* Details */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <Link
                    to={`/products/${item.product.id}`}
                    className="text-sm font-bold text-slate-900 hover:text-blue-600 transition truncate block"
                  >
                    {item.product.name}
                  </Link>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1 text-xs text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700">
                      Màu: {item.variant.color}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700">
                      Bộ nhớ: {item.variant.storage}
                    </span>
                    <span className="text-slate-400">SKU: {item.variant.sku}</span>
                  </div>

                  <div className="mt-2 text-sm font-bold text-red-600">
                    {formatPrice(item.price)}
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-l-xl transition"
                      aria-label="Giảm"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3.5 text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-r-xl transition"
                      aria-label="Tăng"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Total for this line item */}
                  <div className="text-right min-w-[100px] hidden sm:block">
                    <span className="text-xs text-slate-400 block">Thành tiền</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="Xóa sản phẩm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <Link
              to="/products"
              className="flex items-center gap-1 font-semibold text-blue-600 hover:underline"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Tiếp tục chọn thêm thiết bị</span>
            </Link>
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Bảo vệ quyền lợi khách hàng 100%</span>
            </div>
          </div>
        </div>

        {/* Right: Summary & Voucher Box (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Voucher Box */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
              <Tag className="w-4 h-4 text-blue-600" />
              <span>Mã giảm giá ưu đãi</span>
            </div>

            <form onSubmit={handleApplyVoucher} className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Nhập mã: WELCOME50, FREESHIP..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs uppercase font-semibold focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition shrink-0"
              >
                Áp dụng
              </button>
            </form>

            {voucherError && <p className="text-xs text-red-600 font-medium">{voucherError}</p>}

            {appliedVoucher && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold">{appliedVoucher.code}</span>
                    <p className="text-[11px] text-emerald-700">{appliedVoucher.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAppliedVoucher(null)}
                  className="text-xs text-red-500 hover:underline font-semibold"
                >
                  Gỡ
                </button>
              </div>
            )}

            <div className="text-[11px] text-slate-400 space-y-1">
              <p>Mã gợi ý: <span className="font-mono font-bold text-slate-600">WELCOME50</span> (giảm 50k), <span className="font-mono font-bold text-slate-600">VIP10</span> (giảm 10%)</p>
            </div>
          </div>

          {/* Order Summary Box */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Chi tiết đơn hàng
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} máy):</span>
                <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Giảm giá Voucher:</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-emerald-600 font-bold">Miễn phí</span>
                  ) : (
                    formatPrice(shippingFee)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Tổng thanh toán:</span>
                <span className="text-2xl font-black text-red-600">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleProceedCheckout}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition cursor-pointer"
            >
              <span>Tiến hành đặt hàng (Khóa giữ IMEI)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Thiết bị IMEI sẽ được hệ thống khóa độc quyền trong 15:00 ở bước kế tiếp để đảm bảo không bị trùng kho.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
