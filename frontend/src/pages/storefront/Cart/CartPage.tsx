import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Tag,
  Ticket,
  ChevronRight,
  Check,
  ShieldCheck,
  ChevronLeft,
  Truck,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { voucherService, type VoucherInfo } from '../../../services/voucherService';
import { flashSaleService } from '../../../services/flashSaleService';
import { productService } from '../../../services/productService';
import type { Product, FlashSaleCampaign } from '../../../types';
import { resolveColorHex } from '../../../utils/colorHelper';
import { FALLBACK_PRODUCT_IMAGE } from '../../../utils/imageFallback';
import { notifyError } from '../../../utils/notify';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    selectedItemIds,
    updateQuantity,
    removeItem,
    clearCart,
    totalCount,
    toggleSelectItem,
    selectAll,
    deselectAll,
    removeSelectedItems,
    selectedSubtotal,
    selectedTotalCount,
    isAllSelected,
  } = useCartStore();

  const [voucherCode, setVoucherCode] = useState('');
  const [availableVouchers, setAvailableVouchers] = useState<VoucherInfo[]>([]);
  const [activeFlashSale, setActiveFlashSale] = useState<FlashSaleCampaign | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const subtotal = selectedSubtotal();
  const selectedCount = selectedTotalCount();
  // Free shipping threshold: all phone purchases get free shipping (over 500k)
  const isFreeShipping = subtotal > 500000 || subtotal === 0;
  const shippingFee = subtotal === 0 ? 0 : (isFreeShipping ? 0 : 30000);

  useEffect(() => {
    // Giỏ có thể đổi từ nơi khác (chatbot AI, tab khác) → luôn tải mới khi mở trang.
    useCartStore.getState().syncWithBackend().catch(() => {});

    // 1. Fetch active vouchers from database API
    voucherService
      .getActiveVouchers()
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableVouchers(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load active vouchers:', err);
      });

    // 1.5. Fetch active flash sale campaign
    flashSaleService
      .getActiveCampaign()
      .then((data) => {
        if (data) {
          setActiveFlashSale(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load active flash sale campaign in cart:', err);
      });

    // 2. Fetch suggested phones from database API for cross-selling & empty state
    productService
      .getProducts({ limit: 4 })
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setSuggestedProducts(res.items);
        }
      })
      .catch((err) => {
        console.warn('Failed to load suggested products:', err);
      });

    // 3. Restore any previously applied voucher from session
    const stored = sessionStorage.getItem('phoneshop_voucher');
    if (stored) {
      try {
        setAppliedVoucher(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem('phoneshop_voucher');
      }
    }
  }, []);

  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const isItemFlashSale = (item: any) => {
    const unitPrice = item.unitPrice ?? item.price ?? 0;
    if (item.isFlashSale) return true;
    if (item.originalPrice && unitPrice < item.originalPrice) return true;
    if (item.variant?.price && unitPrice < item.variant.price) return true;
    if (activeFlashSale?.items?.some((fi) => fi.variantId === item.variantId)) return true;
    return false;
  };

  const handleApplyVoucher = async (e?: React.FormEvent, directCode?: string) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const code = (directCode || voucherCode).trim().toUpperCase();

    if (!code) {
      notifyError('Vui lòng nhập mã giảm giá.');
      return;
    }

    if (subtotal === 0) {
      notifyError('Giỏ hàng trống hoặc chưa chọn sản phẩm. Vui lòng chọn sản phẩm trước khi áp dụng mã.');
      return;
    }

    setVoucherLoading(true);
    try {
      const res = await voucherService.validateVoucher(code, subtotal, selectedItemIds);
      if (res && res.valid && res.voucher) {
        const voucherData = {
          code: res.voucher.code,
          discount: res.discount,
          description: res.voucher.name || res.voucher.description || 'Áp dụng mã giảm giá thành công',
        };
        setAppliedVoucher(voucherData);
        setVoucherCode(res.voucher.code);
        sessionStorage.setItem('phoneshop_voucher', JSON.stringify(voucherData));
      }
    } catch (err: any) {
      notifyError(err, 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện đơn hàng tối thiểu.');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    sessionStorage.removeItem('phoneshop_voucher');
  };

  const handleProceedCheckout = () => {
    if (selectedCount === 0) return;
    if (appliedVoucher) {
      sessionStorage.setItem('phoneshop_voucher', JSON.stringify(appliedVoucher));
    }
    navigate('/checkout');
  };

  // ─────────────────────────────────────────────────────────────
  // 1. EMPTY STATE VIEW
  // ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-10 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Breadcrumb Header */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link to="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <span>/</span>
            <span className="text-slate-900">Giỏ hàng của bạn</span>
          </div>

          {/* Empty Hero Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-14 text-center shadow-xs relative overflow-hidden">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-sm">
              <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Giỏ hàng của bạn đang trống
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2.5 max-w-md mx-auto leading-relaxed">
              Bạn chưa thêm thiết bị di động nào vào giỏ hàng. Hãy khám phá ngay các mẫu smartphone chính hãng với giá ưu đãi tốt nhất tại PhoneShop!
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <span>Khám phá danh mục điện thoại</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/warranty-lookup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Tra cứu bảo hành</span>
              </Link>
            </div>
          </div>

          {/* Suggested Smart-Phones Grid */}
          {suggestedProducts.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Gợi ý điện thoại nổi bật cho bạn
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hàng chính hãng nguyên seal, bảo hành 12-24 tháng
                  </p>
                </div>
                <Link
                  to="/"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <span>Xem tất cả</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {suggestedProducts.map((p) => {
                  const v0 = p.variants?.[0];
                  const thumb = p.thumbnail || p.thumbnailUrl || v0?.imageUrl || FALLBACK_PRODUCT_IMAGE;
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md hover:border-blue-200 transition group flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-3 p-3 flex items-center justify-center">
                          <img
                            src={thumb}
                            alt={p.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {p.brand?.name || 'Chính hãng'}
                        </span>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 mt-1.5 line-clamp-2 leading-snug group-hover:text-blue-600 transition">
                          {p.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          {v0 ? `${v0.color} • ${v0.storage}` : 'Bản tiêu chuẩn'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">Giá từ</span>
                          <span className="font-extrabold text-xs sm:text-sm text-red-600 font-mono">
                            {formatPrice(v0?.price || 0)}
                          </span>
                        </div>
                        <Link
                          to={`/products/${p.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold text-xs rounded-lg transition"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. POPULATED CART VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation & Stepper */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/" className="hover:text-blue-600 transition">Trang chủ</Link>
              <span>/</span>
              <span className="text-blue-600 font-bold">Giỏ hàng ({totalCount()} thiết bị)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Giỏ hàng của bạn
            </h1>
          </div>

          {/* Interactive Checkout Progress Stepper */}
          <div className="flex items-center gap-2 text-xs font-bold bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-blue-600">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                1
              </span>
              <span>Giỏ hàng</span>
            </div>
            <span className="text-slate-300">→</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black">
                2
              </span>
              <span>Đặt hàng & Thanh toán</span>
            </div>
            <span className="text-slate-300">→</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black">
                3
              </span>
              <span>Hoàn tất</span>
            </div>
          </div>
        </div>

        {/* Free Shipping Alert Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-emerald-900">
                <span className="font-bold">🎉 Chúc mừng bạn!</span> Đơn hàng đủ điều kiện{' '}
                <span className="font-bold">Miễn phí vận chuyển toàn quốc</span>.
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Giao hỏa tốc 24-48h cho đơn từ 500.000₫.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-300/60 inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              Tiết kiệm 30.000₫ cước vận chuyển
            </span>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ─────────────────────────────────────────────────────────────
              LEFT COLUMN: ITEM LIST & CONTROLS (8 COLS)
              ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Table Top Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected()}
                      onChange={(e) => {
                        if (e.target.checked) selectAll();
                        else deselectAll();
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      Chọn tất cả ({items.length})
                    </span>
                  </label>
                  <span className="text-slate-400 hidden sm:inline">•</span>
                  <span className="text-xs text-emerald-600 font-medium hidden sm:inline">
                    Cam kết chính hãng &amp; giao nhanh 2h
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {selectedItemIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteSelectedConfirm(true)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa mục đã chọn ({selectedItemIds.length})</span>
                    </button>
                  )}

                  {/* Bulk Clear Action */}
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs text-slate-400 hover:text-rose-600 font-medium flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa giỏ hàng</span>
                  </button>
                </div>
              </div>

              {/* Delete Selected Confirmation Bar */}
              {showDeleteSelectedConfirm && (
                <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-900 animate-fadeIn">
                  <span className="font-medium">
                    Bạn có chắc chắn muốn xóa {selectedItemIds.length} sản phẩm đã chọn khỏi giỏ hàng?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        removeSelectedItems();
                        setShowDeleteSelectedConfirm(false);
                      }}
                      className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition cursor-pointer"
                    >
                      Xác nhận xóa
                    </button>
                    <button
                      onClick={() => setShowDeleteSelectedConfirm(false)}
                      className="px-3 py-1 bg-white border border-rose-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Clear Confirmation Bar */}
              {showClearConfirm && (
                <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-900 animate-fadeIn">
                  <span className="font-medium">
                    Bạn có chắc chắn muốn xóa toàn bộ {totalCount()} sản phẩm trong giỏ hàng?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        clearCart();
                        setShowClearConfirm(false);
                      }}
                      className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition"
                    >
                      Xác nhận xóa
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1 bg-white border border-rose-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const productThumb =
                    item.variant?.imageUrl ||
                    item.product?.thumbnail ||
                    item.product?.thumbnailUrl ||
                    FALLBACK_PRODUCT_IMAGE;
                  const isFlash = isItemFlashSale(item);
                  const unitPrice = item.unitPrice ?? item.price ?? 0;
                  const origPrice = item.originalPrice || item.variant?.price || unitPrice;

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition duration-150"
                    >
                      {/* Left: Checkbox + Image & Info */}
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        <div className="pt-2 sm:pt-4 flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedItemIds.includes(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                            aria-label={`Chọn ${item.product?.name || 'sản phẩm'}`}
                          />
                        </div>

                        <Link
                          to={`/products/${item.product?.id || item.variant?.productId || ''}`}
                          className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 border border-slate-200/80 rounded-2xl p-2 shrink-0 flex items-center justify-center group overflow-hidden"
                        >
                          <img
                            src={productThumb}
                            alt={item.product?.name || 'Sản phẩm'}
                            className="w-full h-full object-contain group-hover:scale-105 transition duration-200"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                FALLBACK_PRODUCT_IMAGE;
                            }}
                          />
                        </Link>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Brand Tag & Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              {item.product?.brand?.name || 'Chính hãng'}
                            </span>
                            {isFlash && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                ⚡ Flash Sale
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-400">
                              SKU: {item.variant?.sku}
                            </span>
                          </div>

                          {/* Product Name */}
                          <Link
                            to={`/products/${item.product?.id || item.variant?.productId || ''}`}
                            className="block font-bold text-sm sm:text-base text-slate-900 hover:text-blue-600 transition leading-snug line-clamp-2"
                          >
                            {item.product?.name}
                          </Link>

                          {/* Selected Variant Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {/* Color */}
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                style={{ backgroundColor: resolveColorHex(item.variant?.color, item.variant?.colorHex) }}
                              />
                              <span>{item.variant?.color}</span>
                            </div>

                            {/* Storage */}
                            <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700">
                              {item.variant?.storage}
                            </div>
                          </div>

                          {/* Stock status indicator */}
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium pt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Còn hàng • Giao hàng hoả tốc 2h</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity Stepper & Price */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* Stepper: khối liền mạch */}
                        <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden h-8 bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-full bg-slate-50 hover:bg-slate-100 text-gray-600 font-bold text-sm flex items-center justify-center transition cursor-pointer active:scale-95"
                            aria-label="Giảm số lượng"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <span className="w-10 h-full flex items-center justify-center text-center text-xs font-semibold text-gray-800 border-x border-gray-200 select-none tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-full bg-slate-50 hover:bg-slate-100 text-gray-600 font-bold text-sm flex items-center justify-center transition cursor-pointer active:scale-95"
                            aria-label="Tăng số lượng"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>

                        {/* Price Breakdown for this item */}
                        <div className="text-right min-w-[110px]">
                          <div className="text-sm sm:text-base font-black font-mono tabular-nums text-red-600">
                            {formatPrice(unitPrice * item.quantity)}
                          </div>
                          {isFlash && origPrice > unitPrice && (
                            <div className="text-[10px] font-mono text-slate-400 line-through tabular-nums">
                              {formatPrice(origPrice * item.quantity)}
                            </div>
                          )}
                          {item.quantity > 1 && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {formatPrice(unitPrice)} / máy
                            </div>
                          )}
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Xóa thiết bị này khỏi giỏ"
                          aria-label="Xóa sản phẩm khỏi giỏ hàng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table Bottom Navigation Bar */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <Link
                  to="/"
                  className="flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Tiếp tục chọn thêm thiết bị di động</span>
                </Link>

                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Bảo hành chính hãng 12 - 24 tháng toàn quốc</span>
                </div>
              </div>
            </div>

            {/* Service Commitments Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">100% Nguyên Seal</h4>
                  <p className="text-[11px] text-slate-500">Phân phối chính hãng</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">30 Ngày Đổi Mới</h4>
                  <p className="text-[11px] text-slate-500">Lỗi phần cứng 1 đổi 1</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Thanh Toán An Toàn</h4>
                  <p className="text-[11px] text-slate-500">Bảo mật thông tin 100%</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT COLUMN: ORDER SUMMARY (4 COLS) — 1 CARD DUY NHẤT
              ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
              <h3 className="font-bold text-gray-900 text-base">Tóm tắt đơn hàng</h3>

              {/* Khối Voucher chuẩn UX */}
              <div>
                <span className="block text-xs font-semibold text-gray-600 mb-2 uppercase">
                  Mã ưu đãi / Voucher
                </span>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(true)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 transition text-left cursor-pointer group"
                >
                  <Ticket className="w-4.5 h-4.5 w-5 h-5 text-blue-600 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-900">PhoneShop Voucher</span>
                    <span className="block text-xs text-gray-500 truncate">
                      {appliedVoucher
                        ? `${appliedVoucher.code} — Giảm ${formatPrice(appliedVoucher.discount)}`
                        : 'Chọn hoặc nhập mã giảm giá'}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                </button>

                <form onSubmit={(e) => handleApplyVoucher(e)} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Nhập mã giảm giá..."
                    className="flex-1 min-w-0 px-3.5 py-2 text-sm bg-slate-50 border border-gray-200 rounded-xl uppercase font-mono tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                  />
                  <button
                    type="submit"
                    disabled={voucherLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shrink-0 cursor-pointer active:scale-95"
                  >
                    {voucherLoading ? '...' : 'Áp dụng'}
                  </button>
                </form>

                {/* Đã áp dụng */}
                {appliedVoucher && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </span>
                      <div className="min-w-0">
                        <span className="font-mono font-black text-emerald-800">
                          {appliedVoucher.code}
                        </span>
                        <span className="ml-1.5 text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                          -{formatPrice(appliedVoucher.discount)}
                        </span>
                        <p className="text-[11px] text-emerald-700 mt-0.5 line-clamp-1">
                          {appliedVoucher.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="p-1 rounded-md text-emerald-700 hover:text-rose-600 hover:bg-white transition cursor-pointer shrink-0"
                      title="Gỡ mã giảm giá"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Gợi ý tối đa 2 voucher tốt nhất — có đầy đủ quyền lợi */}
                {!appliedVoucher && availableVouchers.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {availableVouchers.slice(0, 2).map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-slate-50/60 hover:border-blue-200 transition"
                      >
                        <span className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Tag className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {v.type === 'FREE_SHIPPING'
                              ? 'Miễn phí vận chuyển'
                              : v.type === 'PERCENTAGE'
                                ? `Giảm ${v.value}%${v.maxDiscountAmount ? ` (tối đa ${formatPrice(v.maxDiscountAmount)})` : ''}`
                                : `Giảm ${formatPrice(v.value)}`}
                            {v.minOrderValue ? ` • Đơn từ ${formatPrice(v.minOrderValue)}` : ''}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {v.code} • HSD: {v.endAt ? new Date(v.endAt).toLocaleDateString('vi-VN') : '31/10/2026'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVoucherCode(v.code);
                            void handleApplyVoucher(undefined, v.code);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition shrink-0 cursor-pointer"
                        >
                          Áp dụng
                        </button>
                      </div>
                    ))}
                    {availableVouchers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowVoucherModal(true)}
                        className="w-full text-center text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Xem tất cả {availableVouchers.length} voucher →
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-200 pt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({selectedCount} sản phẩm):</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-gray-600">
                  <span>Phí vận chuyển:</span>
                  {shippingFee === 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 line-through tabular-nums">30.000 ₫</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        MIỄN PHÍ
                      </span>
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {formatPrice(shippingFee)}
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Giảm giá voucher:</span>
                  <span className="font-semibold text-red-600 tabular-nums">
                    - {formatPrice(discountAmount)}
                  </span>
                </div>
              </div>

              {/* Tổng tiền & Nút Đặt hàng */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-gray-900">Tổng thanh toán:</span>
                  <span className="text-2xl font-black text-red-600 tabular-nums">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
                <p className="text-right text-[11px] text-gray-400 mb-4">(Đã bao gồm thuế VAT)</p>

                {selectedCount === 0 ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 bg-slate-200 text-slate-400 font-bold text-sm rounded-xl cursor-not-allowed uppercase tracking-wide"
                  >
                    Vui lòng chọn sản phẩm (0)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedCheckout}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 transition uppercase tracking-wide cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2 group"
                  >
                    <span>Tiến hành đặt hàng ({selectedCount})</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </button>
                )}
              </div>

              {/* Trust chân card */}
              <div className="pt-1 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bảo mật thanh toán SSL 256-bit • VietQR / VNPay / COD</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal chọn Voucher (Ticket Cards) ── */}
        {showVoucherModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setShowVoucherModal(false)}
          >
            <div
              className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">PhoneShop Voucher</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="px-5 pt-3 text-xs text-gray-500">
                Chọn 1 mã áp dụng cho đơn hàng • {availableVouchers.length} ưu đãi khả dụng
              </p>
              <div className="p-5 space-y-3 overflow-y-auto">
                {availableVouchers.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Hiện chưa có voucher khả dụng.
                  </p>
                )}
                {availableVouchers.map((v) => {
                  const isApplied = appliedVoucher?.code === v.code;
                  return (
                    <div
                      key={v.id}
                      className={`flex items-stretch rounded-2xl border overflow-hidden transition ${
                        isApplied ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-gray-200'
                      }`}
                    >
                      <div className="w-20 shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex flex-col items-center justify-center gap-1 py-3">
                        <Ticket className="w-5 h-5" />
                        <span className="text-[10px] font-mono font-bold px-1 text-center break-all leading-tight">
                          {v.code}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 p-3">
                        <p className="text-sm font-bold text-gray-900">
                          {v.type === 'FREE_SHIPPING'
                            ? 'Miễn phí vận chuyển'
                            : v.type === 'PERCENTAGE'
                              ? `Giảm ${v.value}%${v.maxDiscountAmount ? ` tối đa ${formatPrice(v.maxDiscountAmount)}` : ''}`
                              : `Giảm ${formatPrice(v.value)}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Cho đơn từ {formatPrice(v.minOrderValue || 0)}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          HSD: {v.endAt ? new Date(v.endAt).toLocaleDateString('vi-VN') : '31/10/2026'}
                        </p>
                      </div>
                      <div className="flex items-center pr-3">
                        <button
                          type="button"
                          onClick={() => {
                            setVoucherCode(v.code);
                            void handleApplyVoucher(undefined, v.code);
                            setShowVoucherModal(false);
                          }}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
                            isApplied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isApplied ? 'Đang dùng' : 'Áp dụng'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
