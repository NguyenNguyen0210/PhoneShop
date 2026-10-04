import React, { useState, useEffect } from 'react';
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
  Truck,
  Sparkles,
  Lock,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { voucherService, type VoucherInfo } from '../../../services/voucherService';
import { flashSaleService } from '../../../services/flashSaleService';
import { productService } from '../../../services/productService';
import type { Product, FlashSaleCampaign } from '../../../types';
import { resolveColorHex } from '../../../utils/colorHelper';
import { FALLBACK_PRODUCT_IMAGE } from '../../../utils/imageFallback';

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
  const [voucherError, setVoucherError] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = useState(false);

  const subtotal = selectedSubtotal();
  const selectedCount = selectedTotalCount();
  // Free shipping threshold: all phone purchases get free shipping (over 500k)
  const isFreeShipping = subtotal > 500000 || subtotal === 0;
  const shippingFee = subtotal === 0 ? 0 : (isFreeShipping ? 0 : 30000);

  useEffect(() => {
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
    setVoucherError('');
    const code = (directCode || voucherCode).trim().toUpperCase();

    if (!code) {
      setVoucherError('Vui lòng nhập mã giảm giá.');
      return;
    }

    if (subtotal === 0) {
      setVoucherError('Giỏ hàng trống hoặc chưa chọn sản phẩm. Vui lòng chọn sản phẩm trước khi áp dụng mã.');
      return;
    }

    setVoucherLoading(true);
    try {
      const res = await voucherService.validateVoucher(code, subtotal);
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
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Mã giảm giá không hợp lệ hoặc không đủ điều kiện đơn hàng tối thiểu.';
      setVoucherError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError('');
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
                <span>Tra cứu bảo hành IMEI</span>
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
                    Hàng chính hãng phân phối nguyên seal, bảo hành điện tử 12-24 tháng
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                  ĐẶC QUYỀN MIỄN PHÍ VẬN CHUYỂN
                </span>
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                  ĐÃ KÍCH HOẠT
                </span>
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Đơn hàng của bạn trị giá trên 500.000₫ được hỗ trợ giao hỏa tốc 24-48h toàn quốc hoàn toàn miễn phí.
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
                        {/* Stepper */}
                        <div className="flex items-center border border-slate-200 bg-slate-50/80 rounded-xl overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer active:scale-95"
                            aria-label="Giảm số lượng"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-9 text-center font-mono font-bold text-xs text-slate-900 select-none">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer active:scale-95"
                            aria-label="Tăng số lượng"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price Breakdown for this item */}
                        <div className="text-right min-w-[110px]">
                          <div className={`text-sm sm:text-base font-black font-mono tabular-nums ${isFlash ? 'text-rose-600' : 'text-blue-600'}`}>
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
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Xóa thiết bị này khỏi giỏ"
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
                  <span>Bảo hành điện tử chính hãng 12 - 24 tháng toàn quốc</span>
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
              RIGHT COLUMN: VOUCHER ENGINE & ORDER SUMMARY (4 COLS)
              ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
            {/* Voucher Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    Mã khuyến mãi & Voucher
                  </h3>
                </div>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Áp dụng trực tiếp
                </span>
              </div>

              {/* Input Form */}
              <form onSubmit={(e) => handleApplyVoucher(e)} className="flex gap-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="Nhập mã ưu đãi..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs uppercase font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                />
                <button
                  type="submit"
                  disabled={voucherLoading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-xs active:scale-95"
                >
                  {voucherLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
                </button>
              </form>

              {/* Error Message */}
              {voucherError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{voucherError}</span>
                </div>
              )}

              {/* Applied Voucher Card */}
              {appliedVoucher && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-800">
                          {appliedVoucher.code}
                        </span>
                        <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                          -{formatPrice(appliedVoucher.discount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-0.5 line-clamp-1">
                        {appliedVoucher.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="p-1 rounded-md text-emerald-700 hover:text-rose-600 hover:bg-white transition cursor-pointer"
                    title="Gỡ mã giảm giá"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Active Vouchers Quick Select Chips */}
              {availableVouchers.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Mã ưu đãi có thể sử dụng (chạm để áp dụng):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableVouchers.map((v) => {
                      const isSelected = appliedVoucher?.code === v.code;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setVoucherCode(v.code);
                            void handleApplyVoucher(undefined, v.code);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-200'
                          }`}
                          title={v.description || v.name}
                        >
                          <Sparkles className="w-3 h-3 opacity-70" />
                          <span>{v.code}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 pb-3 border-b border-slate-100">
                Chi tiết thanh toán
              </h3>

              {/* Financial Breakdown */}
              <div className="space-y-3 text-xs">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tạm tính ({selectedCount} thiết bị đã chọn):</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {/* Shipping Fee */}
                <div className="flex justify-between items-center text-slate-600">
                  <div className="flex items-center gap-1">
                    <span>Phí vận chuyển toàn quốc:</span>
                  </div>
                  {shippingFee === 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-400 line-through text-[11px]">30.000₫</span>
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        MIỄN PHÍ
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-slate-900">{formatPrice(shippingFee)}</span>
                  )}
                </div>

                {/* Voucher Discount */}
                {appliedVoucher && (
                  <div className="flex justify-between items-center text-emerald-700">
                    <span>Giảm giá Voucher ({appliedVoucher.code}):</span>
                    <span className="font-mono font-bold text-sm">
                      -{formatPrice(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  {/* Total savings alert */}
                  {(discountAmount > 0 || isFreeShipping) && (
                    <div className="p-2.5 mb-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                      <span>Bạn tiết kiệm được:</span>
                      <span className="font-mono font-black text-amber-700">
                        {formatPrice(discountAmount + 30000)}
                      </span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-sm font-black text-slate-900 block">
                        Tổng thanh toán:
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (Đã bao gồm thuế GTGT VAT 8%)
                      </span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-blue-600 font-mono tracking-tight tabular-nums">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary CTA Button */}
              {selectedCount === 0 ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-4 bg-slate-200 text-slate-400 font-black text-sm rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>VUI LÒNG CHỌN SẢN PHẨM (0)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedCheckout}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-98 group"
                >
                  <span>TIẾN HÀNH ĐẶT HÀNG ({selectedCount})</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition duration-200" />
                </button>
              )}

              {/* Security & Gateways info */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-center">
                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mã hóa SSL 256-bit • Cổng Napas 24/7 & VNPay</span>
                </div>
                <div className="flex items-center justify-center gap-2 opacity-70">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                    VietQR Napas
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                    VNPay
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                    COD
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
