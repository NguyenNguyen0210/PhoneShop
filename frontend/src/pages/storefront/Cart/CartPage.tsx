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
  Clock,
  Sparkles,
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
    if (appliedVoucher) {
      sessionStorage.setItem('mobilecommerce_voucher', JSON.stringify(appliedVoucher));
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-[#0e1526] border border-white/10 rounded-3xl p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-20 h-20 bg-[#151d30] border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
            <ShoppingBag className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Giỏ hàng của bạn đang trống</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Không có thiết bị nào trong giỏ hàng. Hãy khám phá kho smartphone chính hãng với chế độ khóa giữ IMEI 15 phút ngay!
          </p>
          <Link
            to="/products"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Tiếp tục mua sắm thiết bị</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>TERMINAL // GIỎ HÀNG THIẾT BỊ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Giỏ hàng ({items.reduce((s, i) => s + i.quantity, 0)} sản phẩm)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Kiểm tra thông số cấu hình và xác nhận biến thể trước khi kích hoạt phiên khóa giữ IMEI
            </p>
          </div>
          <button
            onClick={clearCart}
            className="self-start sm:self-center text-xs text-rose-400 hover:text-rose-300 font-medium hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa toàn bộ giỏ</span>
          </button>
        </div>

        {/* 15-Minute Reservation Notification Banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-amber-300 tracking-wide">
                  Cơ chế khóa giữ IMEI độc quyền (Atomic 15-Minute Hold)
                </span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold rounded-md border border-amber-500/30">
                  15:00
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-200/80 mt-0.5">
                Hệ thống sẽ tự động kích hoạt khóa giữ máy 15 phút khi tiến hành thanh toán để đảm bảo thiết bị không bị tranh chấp kho.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono font-semibold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1.5 rounded-lg shrink-0">
            FOR UPDATE SKIP LOCKED
          </div>
        </div>

        {/* Content Layout: 8 cols items + 4 cols summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Items List (8 cols) */}
          <div className="lg:col-span-8 bg-[#0e1526] rounded-3xl border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 divide-y divide-white/5">
              {items.map((item) => (
                <div key={item.id} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-5 items-center">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 rounded-2xl bg-[#151d30] border border-white/10 p-2 flex items-center justify-center shrink-0">
                    <img
                      src={
                        item.variant.images?.[0] ||
                        item.product.thumbnail ||
                        'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5'
                      }
                      alt={item.product.name}
                      className="w-full h-full object-contain hover:scale-105 transition"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
                    <Link
                      to={`/products/${item.product.id}`}
                      className="text-sm sm:text-base font-bold text-white hover:text-indigo-400 transition truncate block"
                    >
                      {item.product.name}
                    </Link>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                      <span className="px-2.5 py-0.5 bg-[#151d30] border border-white/10 rounded-md font-medium text-slate-300">
                        Màu: {item.variant.color}
                      </span>
                      <span className="px-2.5 py-0.5 bg-[#151d30] border border-white/10 rounded-md font-medium text-slate-300">
                        Bộ nhớ: {item.variant.storage}
                      </span>
                      <span className="px-2.5 py-0.5 bg-black/40 border border-white/5 rounded-md font-mono text-[10px] text-slate-400">
                        SKU: {item.variant.sku}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-sky-400 font-mono tabular-nums">
                      {formatPrice(item.price)}
                    </div>
                  </div>

                  {/* Quantity Stepper & Subtotal */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-white/10 rounded-xl bg-[#151d30] overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        aria-label="Giảm số lượng"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3.5 text-xs font-mono font-bold text-white tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        aria-label="Tăng số lượng"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total for this line item */}
                    <div className="text-right min-w-[110px] hidden sm:block">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">Thành tiền</span>
                      <span className="text-sm font-black text-sky-400 font-mono tabular-nums">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                      title="Xóa sản phẩm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom bar of table */}
            <div className="p-4 bg-[#151d30]/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <Link
                to="/products"
                className="flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Tiếp tục chọn thêm thiết bị</span>
              </Link>
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Bảo vệ quyền lợi khách hàng 100% & Khóa giữ IMEI độc quyền</span>
              </div>
            </div>
          </div>

          {/* Right Column: Voucher & Summary (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Voucher Box */}
            <div className="bg-[#0e1526] rounded-3xl border border-white/10 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                <Tag className="w-4 h-4 text-indigo-400" />
                <span>Mã giảm giá ưu đãi</span>
              </div>

              <form onSubmit={handleApplyVoucher} className="flex gap-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="WELCOME50, VIP10..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs uppercase font-mono font-semibold text-white placeholder-slate-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Áp dụng
                </button>
              </form>

              {voucherError && (
                <p className="text-xs text-rose-400 font-medium">{voucherError}</p>
              )}

              {appliedVoucher && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-mono font-bold text-emerald-400">{appliedVoucher.code}</span>
                      <p className="text-[11px] text-emerald-200/90">{appliedVoucher.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppliedVoucher(null)}
                    className="text-xs text-rose-400 hover:underline font-semibold cursor-pointer ml-2"
                  >
                    Gỡ
                  </button>
                </div>
              )}

              <div className="text-[11px] text-slate-400 space-y-1">
                <p>
                  Mã gợi ý:{' '}
                  <span className="font-mono font-bold text-slate-300">WELCOME50</span> (giảm 50k),{' '}
                  <span className="font-mono font-bold text-slate-300">FREESHIP</span> (miễn phí ship),{' '}
                  <span className="font-mono font-bold text-slate-300">VIP10</span> (giảm 10%)
                </p>
              </div>
            </div>

            {/* Order Summary Box */}
            <div className="bg-[#0e1526] rounded-3xl border border-white/10 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-white/10">
                Chi tiết đơn hàng
              </h3>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Tạm tính ({items.reduce((s, i) => s + i.quantity, 0)} máy):</span>
                  <span className="font-mono font-bold text-white tabular-nums">{formatPrice(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Giảm giá Voucher:</span>
                    <span className="font-mono tabular-nums">-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="text-emerald-400 font-bold">Miễn phí</span>
                    ) : (
                      <span className="font-mono text-white tabular-nums">{formatPrice(shippingFee)}</span>
                    )}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Tổng thanh toán:</span>
                  <span className="text-2xl font-black text-sky-400 font-mono tabular-nums">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleProceedCheckout}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition cursor-pointer"
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
    </div>
  );
};
