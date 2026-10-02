import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  ShieldAlert,
  CreditCard,
  QrCode,
  Truck,
  CheckCircle2,
  ChevronLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { orderService } from '../../../services/orderService';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCartStore();
  const { user } = useAuthStore();

  // 15-minute Hold Countdown (15 * 60 = 900 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);

  // Form State
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VIETQR' | 'VNPAY'>('VIETQR');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Retrieve voucher if applied
  const storedVoucherRaw = sessionStorage.getItem('mobilecommerce_voucher');
  const storedVoucher = storedVoucherRaw ? JSON.parse(storedVoucherRaw) : null;

  const subtotal = totalAmount();
  const shippingFee = subtotal > 500000 || subtotal === 0 ? 0 : 30000;
  const discountAmount = storedVoucher ? storedVoucher.discount || 0 : 0;
  const totalAmountDue = Math.max(0, subtotal - discountAmount + shippingFee);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [items.length, navigate]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên người nhận.');
      return;
    }
    if (!shippingPhone.trim() || shippingPhone.trim().length < 9) {
      setErrorMessage('Vui lòng nhập số điện thoại hợp lệ để giao hàng.');
      return;
    }
    if (!shippingAddress.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ nhận hàng chi tiết.');
      return;
    }

    if (secondsRemaining <= 0) {
      setErrorMessage('Phiên khóa giữ thiết bị IMEI đã hết hạn! Vui lòng quay lại giỏ hàng.');
      return;
    }

    setLoading(true);
    try {
      const orderRes = await orderService.checkout({
        customerName,
        shippingPhone,
        shippingAddress,
        notes,
        paymentMethod,
        voucherCode: storedVoucher?.code,
      });

      if (!orderRes || !orderRes.id) {
        throw new Error('Không nhận được thông tin xác nhận đơn hàng từ máy chủ.');
      }

      const orderId = orderRes.id;
      const orderNumber = orderRes.orderNumber || orderId;

      // Store current checkout snapshot for receipt page
      sessionStorage.setItem(
        `order_${orderId}`,
        JSON.stringify({
          orderId,
          orderNumber,
          customerName,
          shippingPhone,
          shippingAddress,
          paymentMethod,
          totalAmount: totalAmountDue,
          items,
          discountAmount,
          shippingFee,
          createdAt: new Date().toISOString(),
        })
      );

      // Clear cart after successful checkout
      clearCart();
      sessionStorage.removeItem('mobilecommerce_voucher');

      navigate(`/order-success/${orderId}`);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Đặt hàng thất bại. Vui lòng thử lại!';
      setErrorMessage(
        Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 15-Minute Concurrency Alert Banner */}
      <div
        className={`rounded-3xl p-5 border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-md ${
          secondsRemaining < 180
            ? 'bg-red-500 text-white border-red-600 animate-pulse'
            : 'bg-amber-500 text-slate-950 border-amber-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-black/20 rounded-2xl">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm uppercase tracking-wide">
                Khóa giữ chỗ IMEI độc quyền (Atomic Hold Lock)
              </span>
              <span className="px-2 py-0.5 bg-black/30 text-white text-[10px] font-bold rounded-md">
                15:00
              </span>
            </div>
            <p className="text-xs mt-0.5 font-medium opacity-90">
              Thiết bị IMEI của bạn đang được khóa giữ chỗ trong{' '}
              <strong className="font-mono text-sm underline">{timeFormatted}</strong>. Vui lòng
              hoàn tất đặt hàng để không bị nhả kho cho khách hàng khác!
            </p>
          </div>
        </div>

        <div className="bg-black/25 px-5 py-2.5 rounded-2xl flex items-center gap-2 font-mono font-black text-xl text-white tracking-widest shrink-0">
          <span>{timeFormatted}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Shipping & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            {/* Shipping Info Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Thông tin giao hàng & Liên hệ
                </h3>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Họ và tên người nhận *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số điện thoại nhận hàng *
                  </label>
                  <input
                    type="tel"
                    required
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Địa chỉ nhận hàng chi tiết *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/TP"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ghi chú đơn hàng (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Giao giờ hành chính, gọi trước khi giao..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
                />
              </div>
            </div>

            {/* Payment Method Selector Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Phương thức thanh toán
                </h3>
              </div>

              <div className="space-y-3">
                {/* VietQR */}
                <label
                  onClick={() => setPaymentMethod('VIETQR')}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition ${
                    paymentMethod === 'VIETQR'
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'VIETQR'}
                    onChange={() => setPaymentMethod('VIETQR')}
                    className="mt-1 accent-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-xs text-slate-900">
                        Chuyển khoản VietQR động (Napas 247)
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                        Khuyên dùng
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Quét mã QR tự động điền số tiền và nội dung đơn hàng qua mọi ứng dụng ngân
                      hàng (Vietcombank, MB, Techcombank, v.v.). Kích hoạt bảo hành ngay khi tiền về.
                    </p>
                  </div>
                </label>

                {/* VNPay */}
                <label
                  onClick={() => setPaymentMethod('VNPAY')}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition ${
                    paymentMethod === 'VNPAY'
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'VNPAY'}
                    onChange={() => setPaymentMethod('VNPAY')}
                    className="mt-1 accent-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-xs text-slate-900">
                        Cổng thanh toán trực tuyến VNPay
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Thanh toán an toàn qua cổng VNPay Sandbox hỗ trợ thẻ ATM nội địa, Thẻ quốc tế
                      Visa/Mastercard hoặc ứng dụng ngân hàng.
                    </p>
                  </div>
                </label>

                {/* COD */}
                <label
                  onClick={() => setPaymentMethod('COD')}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition ${
                    paymentMethod === 'COD'
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="mt-1 accent-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-slate-600" />
                      <span className="font-bold text-xs text-slate-900">
                        Thanh toán khi nhận hàng (COD)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Kiểm tra niêm phong hộp và tem IMEI trước khi trả tiền cho nhân viên giao hàng.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-sm block mb-0.5">Đặt hàng không thành công</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || secondsRemaining <= 0}
              className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-red-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang khóa giữ IMEI và khởi tạo đơn hàng...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Xác nhận đặt hàng ({formatPrice(totalAmountDue)})</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Summary: Items & Totals (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Đơn hàng ({items.length} mặt hàng)</span>
              <Link to="/cart" className="text-xs text-blue-600 font-semibold hover:underline">
                Sửa
              </Link>
            </h3>

            {/* Items list */}
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3 items-center text-xs">
                  <img
                    src={it.variant.images?.[0] || it.product.thumbnail}
                    alt={it.product.name}
                    className="w-14 h-14 object-contain rounded-xl p-1 bg-slate-50 border border-slate-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{it.product.name}</p>
                    <p className="text-slate-500 text-[11px]">
                      {it.variant.color} - {it.variant.storage} (x{it.quantity})
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    {formatPrice(it.price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Giảm giá ({storedVoucher?.code}):</span>
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
                <span className="text-2xl font-black text-red-600">
                  {formatPrice(totalAmountDue)}
                </span>
              </div>
            </div>

            {/* Safety guarantee */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <span>Quyền lợi người mua thiết bị:</span>
              </div>
              <p>• Mã IMEI được bảo toàn độc quyền trong 15 phút, không bị tranh chấp đơn hàng.</p>
              <p>• Tự động kích hoạt gói bảo hành chính hãng 12 tháng sau khi đơn chuyển sang Đã thanh toán.</p>
            </div>
          </div>

          <Link
            to="/cart"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại chỉnh sửa giỏ hàng</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
