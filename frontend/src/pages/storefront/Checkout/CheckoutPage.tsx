import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Sparkles,
  Building2,
  MapPin,
} from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { orderService } from '../../../services/orderService';
import { addressService } from '../../../services/addressService';
import { FALLBACK_PRODUCT_IMAGE } from '../../../utils/imageFallback';
import { InstallmentFormCard } from '../../../components/storefront/checkout/InstallmentFormCard';
import { AddressSelectModal } from '../../../components/storefront/checkout/AddressSelectModal';
import {
  ShippingMethodSelector,
  calculateShippingFee,
} from '../../../components/storefront/checkout/ShippingMethodSelector';
import { CheckoutCouponSection } from '../../../components/storefront/checkout/CheckoutCouponSection';
import { notifyError } from '../../../utils/notify';
import type { PaymentMethod, InstallmentFormData, Address, ShippingMethod } from '../../../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedItems, selectedSubtotal, removeSelectedItems } = useCartStore();
  const checkoutItems = selectedItems();
  const { user } = useAuthStore();

  // 15-minute Hold Countdown (15 * 60 = 900 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);

  // Form State
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIETQR');

  // Address State
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [useManualAddress, setUseManualAddress] = useState(false);

  // Shipping Method State
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('STANDARD');

  // Installment State
  const [installmentData, setInstallmentData] = useState<InstallmentFormData>({
    provider: 'HOME_CREDIT',
    termMonths: 6,
    prepayPercent: 20,
    fullName: user?.fullName || '',
    citizenId: '',
    birthDate: '',
    phoneNumber: user?.phone || '',
    currentAddress: '',
    incomeRange: '10 - 20 triệu',
    cccdFrontUrl: '',
    cccdBackUrl: '',
  });
  const [installmentErrors, setInstallmentErrors] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);

  // Guard: sau khi đặt hàng thành công, removeSelectedItems() làm
  // checkoutItems rỗng — effect bên dưới sẽ bắn navigate('/cart') và đè lên
  // navigate('/order-success/:id'). Ref này chặn redirect đó.
  const orderPlacedRef = useRef(false);

  // Voucher State
  const [appliedVoucher, setAppliedVoucher] = useState<any>(() => {
    try {
      const raw = sessionStorage.getItem('phoneshop_voucher');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.voucher || parsed;
    } catch {
      return null;
    }
  });
  const [discountAmount, setDiscountAmount] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem('phoneshop_voucher');
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return parsed.discount || 0;
    } catch {
      return 0;
    }
  });

  const subtotal = selectedSubtotal();
  const shippingFeeInfo = calculateShippingFee(shippingMethod, subtotal);
  const shippingFee = shippingFeeInfo.fee;

  // Reactively calculate discount amount based on applied voucher rules
  useEffect(() => {
    if (!appliedVoucher) {
      setDiscountAmount(0);
      return;
    }

    let calculatedDiscount = 0;
    if (appliedVoucher.type === 'FREE_SHIPPING') {
      calculatedDiscount = Math.min(Number(appliedVoucher.value) || 0, shippingFee);
    } else if (appliedVoucher.type === 'PERCENTAGE') {
      const pctDiscount = (subtotal * (Number(appliedVoucher.value) || 0)) / 100;
      const maxCap = appliedVoucher.maxDiscountAmount ? Number(appliedVoucher.maxDiscountAmount) : Infinity;
      calculatedDiscount = Math.min(pctDiscount, maxCap);
    } else if (appliedVoucher.type === 'FIXED_AMOUNT') {
      calculatedDiscount = Math.min(Number(appliedVoucher.value) || 0, subtotal);
    } else if (typeof appliedVoucher.discount === 'number') {
      calculatedDiscount = appliedVoucher.discount;
    }

    setDiscountAmount(calculatedDiscount);
  }, [appliedVoucher, shippingFee, subtotal]);

  const totalAmountDue = Math.max(0, subtotal - discountAmount + shippingFee);

  // Fetch saved addresses if user is logged in
  useEffect(() => {
    if (user) {
      addressService
        .getAddresses()
        .then((addrs) => {
          setSavedAddresses(addrs);
          if (addrs.length > 0) {
            const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
            setSelectedAddress(defaultAddr);
            setCustomerName(defaultAddr.recipientName);
            setShippingPhone(defaultAddr.phone);
            setShippingAddress(defaultAddr.addressLine1);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch saved addresses:', err);
        });
    }
  }, [user]);

  useEffect(() => {
    if (orderPlacedRef.current) return;
    if (checkoutItems.length === 0) {
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
  }, [checkoutItems.length, navigate]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      notifyError('Vui lòng nhập họ và tên người nhận.');
      return;
    }
    if (!shippingPhone.trim() || shippingPhone.trim().length < 9) {
      notifyError('Vui lòng nhập số điện thoại hợp lệ để giao hàng.');
      return;
    }
    if (!shippingAddress.trim()) {
      notifyError('Vui lòng nhập địa chỉ nhận hàng chi tiết.');
      return;
    }

    if (secondsRemaining <= 0) {
      notifyError('Đơn này đã hết thời gian giữ. Bạn quay lại giỏ hàng để đặt lại giúp shop nhé.');
      return;
    }

    // Validate installment fields if method is INSTALLMENT
    if (paymentMethod === 'INSTALLMENT') {
      const fieldErrors: Record<string, string> = {};
      if (!installmentData.fullName.trim() || installmentData.fullName.trim().length < 2) {
        fieldErrors.fullName = 'Vui lòng nhập họ và tên đầy đủ theo CCCD.';
      }
      if (!installmentData.citizenId.trim() || !/^[0-9]{12}$/.test(installmentData.citizenId.trim())) {
        fieldErrors.citizenId = 'Số CCCD gắn chip phải đúng 12 chữ số.';
      }
      if (!installmentData.birthDate) {
        fieldErrors.birthDate = 'Vui lòng chọn ngày sinh.';
      } else {
        const dob = new Date(installmentData.birthDate);
        const now = new Date();
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
          age--;
        }
        if (isNaN(dob.getTime()) || age < 18) {
          fieldErrors.birthDate = 'Khách hàng phải từ đủ 18 tuổi trở lên để làm hồ sơ trả góp.';
        }
      }
      if (
        !installmentData.phoneNumber.trim() ||
        !/^(0[3|5|7|8|9])[0-9]{8}$/.test(installmentData.phoneNumber.trim())
      ) {
        fieldErrors.phoneNumber = 'Vui lòng nhập số điện thoại di động Việt Nam (10 số).';
      }
      if (!installmentData.currentAddress.trim() || installmentData.currentAddress.trim().length < 5) {
        fieldErrors.currentAddress = 'Vui lòng nhập địa chỉ thường trú/tạm trú chi tiết (tối thiểu 5 ký tự).';
      }
      if (!installmentData.cccdFrontUrl) {
        fieldErrors.cccdFrontUrl = 'Vui lòng tải lên ảnh mặt trước CCCD.';
      }
      if (!installmentData.cccdBackUrl) {
        fieldErrors.cccdBackUrl = 'Vui lòng tải lên ảnh mặt sau CCCD.';
      }

      if (Object.keys(fieldErrors).length > 0) {
        setInstallmentErrors(fieldErrors);
        notifyError('Vui lòng kiểm tra lại thông tin hồ sơ trả góp còn thiếu hoặc chưa hợp lệ.');
        return;
      }
      setInstallmentErrors({});
    }

    setLoading(true);
    try {
      const orderRes = await orderService.checkout({
        customerName,
        shippingPhone,
        shippingAddress,
        notes,
        paymentMethod,
        installmentData: paymentMethod === 'INSTALLMENT' ? installmentData : undefined,
        voucherCode: appliedVoucher?.code,
        selectedItemIds: checkoutItems.map((i) => i.variantId || i.id),
        shippingMethod,
        addressId: !useManualAddress && selectedAddress ? selectedAddress.id : undefined,
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
          installmentData: paymentMethod === 'INSTALLMENT' ? installmentData : undefined,
          totalAmount: totalAmountDue,
          items: checkoutItems,
          discountAmount,
          shippingFee,
          shippingMethod,
          createdAt: new Date().toISOString(),
        })
      );

      // Clear ONLY selected items from cart.
      // Đặt flag TRƯỚC khi xóa để guard effect không bắn về /cart.
      orderPlacedRef.current = true;
      removeSelectedItems();
      sessionStorage.removeItem('phoneshop_voucher');

      navigate(`/order-success/${orderId}`);
    } catch (err: any) {
      notifyError(err, 'Đặt hàng thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phone Shop • Thanh toán bảo mật</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Xác nhận Đơn hàng & Thanh toán
            </h1>
          </div>
          <Link
            to="/cart"
            onClick={(e) => {
              if (window.history.length > 1) {
                e.preventDefault();
                navigate(-1);
              }
            }}
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
                  Đơn này đang được giữ cho bạn
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                    secondsRemaining < 180
                      ? 'bg-rose-100 border-rose-200 text-rose-800'
                      : 'bg-blue-100 border-blue-200 text-blue-800'
                  }`}
                >
                  Thời gian giữ đơn: 15:00
                </span>
              </div>
              <p className="text-xs mt-1 text-slate-600">
                Bạn cứ thong thả hoàn tất thông tin giao hàng nhé! Đơn sẽ tự hết giữ sau{' '}
                <strong
                  className={`font-mono text-sm underline ${
                    secondsRemaining < 180 ? 'text-rose-600 font-black' : 'text-blue-700 font-bold'
                  }`}
                >
                  {timeFormatted}
                </strong>
                . Bạn hãy an tâm hoàn tất thanh toán!
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
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Thông tin giao hàng & Liên hệ
                    </h3>
                  </div>
                  {savedAddresses.length > 0 && useManualAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        setUseManualAddress(false);
                        const def =
                          selectedAddress ||
                          savedAddresses.find((a) => a.isDefault) ||
                          savedAddresses[0];
                        if (def) {
                          setSelectedAddress(def);
                          setCustomerName(def.recipientName);
                          setShippingPhone(def.phone);
                          setShippingAddress(def.addressLine1);
                        }
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Chọn từ sổ địa chỉ đã lưu</span>
                    </button>
                  )}
                </div>

                {selectedAddress && !useManualAddress ? (
                  <div className="space-y-4">
                    {/* Selected Address Display Card */}
                    <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-2xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900">
                                {selectedAddress.recipientName}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="text-xs font-mono font-semibold text-slate-700">
                                {selectedAddress.phone}
                              </span>
                              {selectedAddress.isDefault && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-md">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {[
                                selectedAddress.addressLine1,
                                selectedAddress.ward,
                                selectedAddress.district,
                                selectedAddress.city,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddressModal(true)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-blue-600 font-bold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-2xs"
                        >
                          Thay đổi
                        </button>
                      </div>

                      <div className="pt-2.5 mt-3 border-t border-blue-200/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setUseManualAddress(true)}
                          className="text-xs text-slate-500 hover:text-slate-800 hover:underline transition cursor-pointer"
                        >
                          Nhập địa chỉ nhận hàng khác
                        </button>
                      </div>
                    </div>

                    {/* Order Notes */}
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
                ) : (
                  <div className="space-y-4">
                    {savedAddresses.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-200/80">
                        <span className="text-xs text-slate-600">
                          Bạn có {savedAddresses.length} địa chỉ đã lưu trong sổ địa chỉ.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setUseManualAddress(false);
                            const def =
                              selectedAddress ||
                              savedAddresses.find((a) => a.isDefault) ||
                              savedAddresses[0];
                            if (def) {
                              setSelectedAddress(def);
                              setCustomerName(def.recipientName);
                              setShippingPhone(def.phone);
                              setShippingAddress(def.addressLine1);
                            }
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          Chọn từ sổ địa chỉ đã lưu
                        </button>
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
                )}
              </div>

              {/* Shipping Method Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Phương thức vận chuyển
                  </h3>
                </div>

                <ShippingMethodSelector
                  subtotal={subtotal}
                  selectedMethod={shippingMethod}
                  onChange={setShippingMethod}
                />
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
                            Quét mã QR để chuyển khoản
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md">
                            Khuyên dùng • Kích hoạt tức thì
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Mã QR có sẵn số tiền và nội dung, tiền vào ngay sau khi bạn quét.
                        </p>

                        {/* Real VietQR is generated after the order exists — see OrderSuccess page. */}
                        <div className="pt-2">
                          <p className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl">
                            <QrCode className="w-3.5 h-3.5 text-blue-600" />
                            <span>Mã QR sẽ hiện ra sau khi bạn đặt hàng xong</span>
                          </p>
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
                            Thanh toán online qua VNPay
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>An toàn & bảo mật</span>
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
                            Thanh toán khi nhận hàng
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Được mở hộp kiểm tra máy cùng shipper rồi mới trả tiền mặt.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* INSTALLMENT Option */}
                  <div
                    onClick={() => setPaymentMethod('INSTALLMENT')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
                      paymentMethod === 'INSTALLMENT'
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'INSTALLMENT'}
                        onChange={() => setPaymentMethod('INSTALLMENT')}
                        className="mt-1 accent-blue-600 cursor-pointer"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <span className="font-bold text-sm text-slate-900">
                            Trả góp qua công ty tài chính
                          </span>
                          <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-md uppercase tracking-wider animate-pulse">
                            HOT
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md">
                            0% Lãi suất
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Duyệt hồ sơ nhanh 24h - 0% lãi suất. Trả trước chỉ từ 0%, kỳ hạn linh hoạt 3 - 12 tháng qua Home Credit hoặc FE Credit.
                        </p>
                      </div>
                    </div>

                    {/* When INSTALLMENT is selected: Render InstallmentFormCard */}
                    {paymentMethod === 'INSTALLMENT' && (
                      <div className="mt-4 pt-4 border-t border-blue-200/80" onClick={(e) => e.stopPropagation()}>
                        <InstallmentFormCard
                          totalAmount={totalAmountDue}
                          value={installmentData}
                          onChange={setInstallmentData}
                          errors={installmentErrors}
                        />
                      </div>
                    )}
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
                    <span>Đang tạo đơn hàng cho bạn...</span>
                  </>
                ) : paymentMethod === 'INSTALLMENT' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      Xác nhận nộp hồ sơ trả góp (Trả trước{' '}
                      {formatPrice(
                        Math.round((totalAmountDue * (installmentData.prepayPercent ?? 0)) / 100)
                      )}
                      )
                    </span>
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
                <span>Đơn hàng ({checkoutItems.length} mặt hàng)</span>
                <Link to="/cart" className="text-xs text-blue-600 font-semibold hover:underline">
                  Chỉnh sửa
                </Link>
              </h3>

              {/* Items list */}
              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {checkoutItems.map((it) => {
                  const itemPrice = it.unitPrice ?? it.price ?? 0;
                  const isFlash = (it as any).isFlashSale || (it.variant && itemPrice < it.variant.price);
                  const origPrice = (it as any).originalPrice || it.variant?.price || itemPrice;
                  return (
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 truncate">{it.product.name}</p>
                          {isFlash && (
                            <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded shrink-0">
                              ⚡ Flash Sale
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          {it.variant.color} - {it.variant.storage} (x{it.quantity})
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-mono font-bold tabular-nums ${isFlash ? 'text-rose-600' : 'text-blue-600'}`}>
                          {formatPrice(itemPrice * it.quantity)}
                        </span>
                        {isFlash && origPrice > itemPrice && (
                          <div className="text-[10px] font-mono text-slate-400 line-through tabular-nums">
                            {formatPrice(origPrice * it.quantity)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon / Voucher Section */}
              <div className="pt-4 border-t border-slate-200">
                <CheckoutCouponSection
                  subtotal={subtotal}
                  appliedVoucher={appliedVoucher}
                  onApplyVoucher={(v, disc) => {
                    setAppliedVoucher(v);
                    setDiscountAmount(disc);
                    sessionStorage.setItem(
                      'phoneshop_voucher',
                      JSON.stringify({ code: v.code, discount: disc, voucher: v })
                    );
                  }}
                  onRemoveVoucher={() => {
                    setAppliedVoucher(null);
                    setDiscountAmount(0);
                    sessionStorage.removeItem('phoneshop_voucher');
                  }}
                />
              </div>

              {/* Price Calculations */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Giảm giá ({appliedVoucher?.code}):</span>
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

                {paymentMethod === 'INSTALLMENT' && (
                  <div className="pt-3 border-t border-blue-200/80 space-y-2 text-xs bg-blue-50/50 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>
                        Gói trả góp 0% (
                        {installmentData.provider === 'HOME_CREDIT' ? 'Home Credit' : 'FE Credit'}
                        )
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Thu khi nhận máy ({installmentData.prepayPercent}%):</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatPrice(
                          Math.round((totalAmountDue * (installmentData.prepayPercent ?? 0)) / 100)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Số tiền vay tài chính:</span>
                      <span className="font-mono font-bold text-blue-700">
                        {formatPrice(
                          Math.max(
                            0,
                            totalAmountDue -
                              Math.round(
                                (totalAmountDue * (installmentData.prepayPercent ?? 0)) / 100
                              )
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-blue-200/60">
                      <span>Góp mỗi tháng ({installmentData.termMonths} tháng):</span>
                      <span className="font-mono font-black text-red-600">
                        {formatPrice(
                          installmentData.termMonths > 0
                            ? Math.round(
                                (totalAmountDue -
                                  Math.round(
                                    (totalAmountDue * (installmentData.prepayPercent ?? 0)) / 100
                                  )) /
                                  installmentData.termMonths
                              )
                            : 0
                        )}
                        /tháng
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Safety guarantee */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span>Yên tâm mua sắm:</span>
                </div>
                <p>• Máy của bạn được giữ riêng trong 15 phút.</p>
                <p>• Bảo hành chính hãng 12 tháng có hiệu lực ngay khi bạn thanh toán xong.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Select / Create Modal */}
      <AddressSelectModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        selectedAddressId={selectedAddress?.id}
        onSelectAddress={(addr) => {
          setSelectedAddress(addr);
          setCustomerName(addr.recipientName);
          setShippingPhone(addr.phone);
          setShippingAddress(addr.addressLine1);
          setUseManualAddress(false);
        }}
      />
    </div>
  );
};
