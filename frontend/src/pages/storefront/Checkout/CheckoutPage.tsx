import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  QrCode,
  Truck,
  CheckCircle2,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Sparkles,
  Check,
  Copy,
  X,
} from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { orderService } from '../../../services/orderService';
import { FALLBACK_PRODUCT_IMAGE } from '../../../utils/imageFallback';

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

  // VietQR Modal state
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
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
      setErrorMessage('Thời gian giữ máy của đơn hàng đã hết hạn. Vui lòng quay lại giỏ hàng để cập nhật.');
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

  const [sampleMemo] = useState(() => `ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  const sampleVietQrUrl = `https://img.vietqr.io/image/970422-0987654321-compact2.png?amount=${totalAmountDue}&addInfo=${encodeURIComponent(
    sampleMemo
  )}&accountName=${encodeURIComponent('CONG TY MOBILECOMMERCE')}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MobileCommerce • Thanh toán bảo mật</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Xác nhận Đơn hàng & Thanh toán
            </h1>
          </div>
          <Link
            to="/cart"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Quay lại giỏ hàng</span>
          </Link>
        </div>

        {/* 15-Minute Countdown Banner */}
        <div
          className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 shadow-xs ${
            secondsRemaining < 180
              ? 'bg-rose-50 border-rose-200 text-rose-950 animate-pulse'
              : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl border ${
                secondsRemaining < 180
                  ? 'bg-rose-100 border-rose-200 text-rose-600'
                  : 'bg-blue-100 border-blue-200 text-blue-600'
              }`}
            >
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm uppercase tracking-wide text-slate-900">
                  Đang giữ máy riêng cho bạn
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                    secondsRemaining < 180
                      ? 'bg-rose-100 border-rose-200 text-rose-800'
                      : 'bg-blue-100 border-blue-200 text-blue-800'
                  }`}
                >
                  Thời gian giữ máy: 15:00
                </span>
              </div>
              <p className="text-xs mt-1 text-slate-600">
                Thiết bị đang được giữ an toàn cho bạn trong{' '}
                <strong
                  className={`font-mono text-sm underline ${
                    secondsRemaining < 180 ? 'text-rose-600 font-black' : 'text-blue-700 font-bold'
                  }`}
                >
                  {timeFormatted}
                </strong>
                . Bạn hãy an tâm hoàn tất thông tin giao hàng và chuyển khoản!
              </p>
            </div>
          </div>

          <div
            className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 font-mono font-black text-2xl tracking-widest shrink-0 border ${
              secondsRemaining < 180
                ? 'bg-white border-rose-300 text-rose-600 shadow-xs'
                : 'bg-white border-blue-200 text-blue-700 shadow-xs'
            }`}
          >
            <span>{timeFormatted}</span>
          </div>
        </div>

        {/* Main Grid: Form (7 cols) + Summary (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form: Shipping & Payment (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleCheckoutSubmit} className="space-y-6">
              {/* Shipping Info Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Thông tin giao hàng & Liên hệ
                  </h3>
                </div>

                {errorMessage && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3 shadow-xs">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold text-sm block mb-0.5 text-rose-900">Đặt hàng không thành công</span>
                      <span>{errorMessage}</span>
                    </div>
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
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
                    placeholder="Giao giờ hành chính, gọi trước khi giao, đồng kiểm niêm phong..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                  />
                </div>
              </div>

              {/* Payment Method Selector Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Phương thức thanh toán
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* VietQR Option */}
                  <div
                    onClick={() => setPaymentMethod('VIETQR')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
                      paymentMethod === 'VIETQR'
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'VIETQR'}
                        onChange={() => setPaymentMethod('VIETQR')}
                        className="mt-1 accent-blue-600 cursor-pointer"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <QrCode className="w-5 h-5 text-blue-600" />
                          <span className="font-bold text-sm text-slate-900">
                            Chuyển khoản VietQR động (Napas 247)
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md">
                            Khuyên dùng • Kích hoạt tức thì
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Mã QR tự động tích hợp số tiền và nội dung đơn hàng. Xác nhận giao dịch tức thì qua kết nối Napas 247.
                        </p>

                        {/* Modal button if VietQR is active */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowQrModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5 text-blue-600" />
                            <span>Mở mã VietQR mẫu & Thông tin tài khoản</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VNPay Option */}
                  <div
                    onClick={() => setPaymentMethod('VNPAY')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
                      paymentMethod === 'VNPAY'
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'VNPAY'}
                        onChange={() => setPaymentMethod('VNPAY')}
                        className="mt-1 accent-blue-600 cursor-pointer"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CreditCard className="w-5 h-5 text-sky-600" />
                          <span className="font-bold text-sm text-slate-900">
                            Cổng thanh toán trực tuyến VNPAY
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Bảo mật SSL 256-bit</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Hỗ trợ thanh toán nhanh chóng và an toàn qua thẻ ATM nội địa, QR Pay, Visa hoặc Mastercard.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* COD Option */}
                  <div
                    onClick={() => setPaymentMethod('COD')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
                      paymentMethod === 'COD'
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="mt-1 accent-blue-600 cursor-pointer"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Truck className="w-5 h-5 text-slate-600" />
                          <span className="font-bold text-sm text-slate-900">
                            Thanh toán khi nhận hàng (COD)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Đồng kiểm niêm phong hộp và tem IMEI trước khi thanh toán tiền mặt cho nhân viên chuyển phát.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || secondsRemaining <= 0}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
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
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-200 flex items-center justify-between">
                <span>Đơn hàng ({items.length} mặt hàng)</span>
                <Link to="/cart" className="text-xs text-blue-600 font-semibold hover:underline">
                  Chỉnh sửa
                </Link>
              </h3>

              {/* Items list */}
              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {items.map((it) => (
                  <div key={it.id} className="flex gap-3 items-center text-xs">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={
                          it.variant.images?.[0] ||
                          (it.variant as any).imageUrl ||
                          it.product.thumbnail ||
                          (it.product as any).thumbnailUrl ||
                          FALLBACK_PRODUCT_IMAGE
                        }
                        alt={it.product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{it.product.name}</p>
                      <p className="text-slate-500 text-[11px]">
                        {it.variant.color} - {it.variant.storage} (x{it.quantity})
                      </p>
                    </div>
                    <span className="font-mono font-bold text-blue-600 tabular-nums shrink-0">
                      {formatPrice(it.price * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Calculations */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Giảm giá ({storedVoucher?.code}):</span>
                    <span className="font-mono tabular-nums">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 font-bold">Miễn phí</span>
                    ) : (
                      <span className="font-mono text-slate-900 tabular-nums">{formatPrice(shippingFee)}</span>
                    )}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">Tổng thanh toán:</span>
                  <span className="text-2xl font-black text-blue-600 font-mono tabular-nums">
                    {formatPrice(totalAmountDue)}
                  </span>
                </div>
              </div>

              {/* Safety guarantee */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span>Quyền lợi bảo toàn IMEI & Bảo hành:</span>
                </div>
                <p>• Mã IMEI được bảo toàn độc quyền trong 15 phút, không bị tranh chấp đơn hàng.</p>
                <p>• Tự động kích hoạt gói bảo hành chính hãng 12 tháng sau khi đơn chuyển sang Đã thanh toán.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VietQR Dynamic Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Cổng VietQR Napas 247</h3>
                  <span className="text-[10px] text-emerald-600 font-mono">● LIVE POLLING SẴN SÀNG</span>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-block p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <img
                  src={sampleVietQrUrl}
                  alt="VietQR Sample"
                  className="w-52 h-52 object-contain mx-auto"
                />
              </div>
              <p className="text-xs text-slate-500">
                Quét mã qua bất kỳ ứng dụng ngân hàng nào (Vietcombank, MB, Techcombank, VPBank,...)
              </p>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ngân hàng:</span>
                <span className="font-bold text-slate-900">MBBank (Quân Đội)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tài khoản:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900">0987654321</span>
                  <button
                    onClick={() => copyToClipboard('0987654321', 'stk')}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Sao chép STK"
                  >
                    {copiedText === 'stk' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <span className="font-bold text-slate-900">CONG TY MOBILECOMMERCE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tiền:</span>
                <span className="font-mono font-bold text-blue-600">{formatPrice(totalAmountDue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nội dung CK:</span>
                <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{sampleMemo}</span>
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Đóng và tiếp tục đặt hàng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
