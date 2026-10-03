import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  ShoppingCart,
  Zap,
  Clock,
  ChevronRight,
  Cpu,
  Check,
  CreditCard,
} from 'lucide-react';
import { productService } from '../../../services/productService';
import type { Product, ProductVariant } from '../../../types';
import { useCartStore } from '../../../stores/useCartStore';
import { resolveColorHex } from '../../../utils/colorHelper';
import { FALLBACK_PRODUCT_IMAGE } from '../../../utils/imageFallback';
import {
  ProductPromotionBox,
  ProductInstallmentModal,
  ProductSpecsModal,
  ProductSpecsSummaryCard,
  ProductHighlightsSection,
} from '../../../components/storefront/pdp';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    productService
      .getProductById(id)
      .then((data) => {
        if (data && data.variants && data.variants.length > 0) {
          setProduct(data);
          setSelectedVariant(data.variants[0]);
          setActiveImage(data.images?.[0] || data.thumbnail || '');
        }
      })
      .catch((err) => {
        console.error('Failed to fetch product from database API:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Handle scroll for sticky purchase bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 420) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center py-24 text-slate-500">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-600">Đang tải thông tin sản phẩm PhoneShop...</p>
        </div>
      </div>
    );
  }

  if (!product || !selectedVariant) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 py-16 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy sản phẩm</h2>
          <p className="text-sm text-slate-600">
            Sản phẩm này có thể đã ngừng kinh doanh hoặc đường dẫn không chính xác.
          </p>
          <Link
            to="/products"
            className="inline-block mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Quay lại danh mục sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  // Extract unique colors and unique storages
  const availableColors = Array.from(new Set(product.variants.map((v) => v.color)));
  const availableStorages = Array.from(new Set(product.variants.map((v) => v.storage)));

  const handleColorChange = (color: string) => {
    const matched =
      product.variants.find((v) => v.color === color && v.storage === selectedVariant.storage) ||
      product.variants.find((v) => v.color === color);
    if (matched) {
      setSelectedVariant(matched);
      if (matched.images?.[0]) {
        setActiveImage(matched.images[0]);
      }
    }
  };

  const handleStorageChange = (storage: string) => {
    const matched =
      product.variants.find((v) => v.storage === storage && v.color === selectedVariant.color) ||
      product.variants.find((v) => v.storage === storage);
    if (matched) {
      setSelectedVariant(matched);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleAddToCart = () => {
    addItem(product, selectedVariant, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!product || !selectedVariant) return;
    addItem(product, selectedVariant, 1);
    navigate('/checkout');
  };

  const scrollToReviews = () => {
    const el = document.getElementById('reviews-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fallbackImg = FALLBACK_PRODUCT_IMAGE;

  const imagesList = product.images?.length
    ? product.images
    : [product.thumbnail || product.thumbnailUrl || fallbackImg];

  const discountPercent =
    selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price
      ? Math.round(
          ((selectedVariant.compareAtPrice - selectedVariant.price) /
            selectedVariant.compareAtPrice) *
            100
        )
      : null;

  const inventoryAvailable =
    selectedVariant.inventory?.availableQty ?? selectedVariant.inventoryQty ?? 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/products" className="hover:text-blue-600 transition-colors">
            Điện thoại
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-800 font-semibold truncate max-w-xs sm:max-w-md">
            {product.name}
          </span>
        </nav>

        {/* SECTION 1: HERO SECTION - GALLERY & COMMERCIAL PURCHASE AREA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left: Light Elevated Gallery Viewport (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className="bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center justify-center aspect-square overflow-hidden shadow-xs relative group"
              style={{ boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}
            >
              {/* Authentic Seal */}
              <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold backdrop-blur-md shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chính hãng 100% • Nguyên Seal</span>
              </div>

              {/* Discount Badge */}
              {discountPercent && (
                <span className="absolute top-4 right-4 z-10 bg-rose-50 text-rose-600 border border-rose-200 font-extrabold text-xs px-2.5 py-1 rounded-full backdrop-blur-md">
                  -{discountPercent}%
                </span>
              )}

              {/* Main Image */}
              <img
                src={activeImage || fallbackImg}
                alt={product.name}
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 z-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallbackImg;
                }}
              />
            </div>

            {/* Thumbnail Carousel */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 rounded-2xl border-2 p-1.5 bg-white shrink-0 overflow-hidden transition-all cursor-pointer ${
                    activeImage === img
                      ? 'border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                      : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={img}
                    alt="thumbnail"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackImg;
                    }}
                  />
                </button>
              ))}
            </div>

            {/* PhoneShop Commitment Banner */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-600 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cam kết dịch vụ tại PhoneShop:</span>
              </div>
              <ul className="space-y-1.5 pl-5 list-disc text-slate-600 text-xs">
                <li>Máy mới 100% nguyên seal hộp, kiểm tra máy trước khi nhận hàng.</li>
                <li>Giữ máy 15 phút tại bước thanh toán – Yên tâm không lo mất suất.</li>
                <li>Kích hoạt bảo hành điện tử chính hãng 12 tháng theo số IMEI.</li>
                <li>Đổi mới trong 30 ngày nếu phát sinh bất kỳ lỗi phần cứng nào.</li>
              </ul>
            </div>
          </div>

          {/* Right: Commercial Purchase Area (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Header & Title */}
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-1.5">
                <span className="font-bold text-blue-600">{product.brand?.name || 'Chính hãng'}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">SKU: {selectedVariant.sku}</span>
              </div>

              {/* CRITICAL: Simplified Title in <h1> (Line name without bundled color/storage) */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                Điện thoại {product.name}
              </h1>

              {/* Rating & Live Stock Radar */}
              <div className="flex flex-wrap items-center gap-3 mt-2.5">
                <button
                  type="button"
                  onClick={scrollToReviews}
                  className="flex items-center gap-1 text-xs text-amber-500 font-bold hover:underline cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span className="text-amber-600">
                    {product.rating ? Number(product.rating).toFixed(1) : '5.0'}
                  </span>
                  <span className="text-slate-500 font-normal">
                    ({product.reviewCount ?? product.reviews?.length ?? 0} đánh giá)
                  </span>
                </button>
                <span className="text-slate-300 hidden sm:inline">|</span>

                {/* Simplified Live Stock Indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
                  </span>
                  <span>
                    {inventoryAvailable > 0 ? `🟢 Còn ${inventoryAvailable} máy tại kho` : '🔴 Tạm hết hàng'}
                  </span>
                </div>
              </div>
            </div>

            {/* Commercial Price Box (#E11D48 / text-rose-600) */}
            <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-4 sm:p-5 flex flex-wrap items-baseline gap-3.5 shadow-xs">
              <span className="text-3xl sm:text-4xl font-black text-rose-600 tabular-nums font-mono">
                {formatPrice(selectedVariant.price)}
              </span>
              {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
                <span className="text-base text-slate-400 line-through tabular-nums font-mono">
                  {formatPrice(selectedVariant.compareAtPrice)}
                </span>
              )}
              {discountPercent && (
                <span className="text-xs font-extrabold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full border border-rose-200">
                  -{discountPercent}%
                </span>
              )}
              <span className="text-xs px-2.5 py-1 bg-white border border-slate-200 text-slate-600 font-medium rounded-md shadow-xs ml-auto">
                Đã gồm VAT & Miễn phí vận chuyển
              </span>
            </div>

            {/* SELECTOR 1: Colors */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Chọn màu sắc:
                </label>
                <span className="text-xs font-semibold text-rose-600">
                  {selectedVariant.color}
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {availableColors.map((color) => {
                  const isSelected = selectedVariant.color === color;
                  const vMatch = product.variants.find((v) => v.color === color);

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorChange(color)}
                      className={`relative flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/50 text-rose-950 ring-2 ring-rose-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-inner shrink-0"
                        style={{ backgroundColor: resolveColorHex(color, vMatch?.colorHex) }}
                      />
                      <span>{color}</span>
                      {isSelected && (
                        <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 ml-0.5">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELECTOR 2: Storage (2-line cards) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Chọn phiên bản dung lượng:
                </label>
                <span className="text-xs font-mono text-slate-600 font-semibold">
                  {selectedVariant.storage} {selectedVariant.ram ? `(${selectedVariant.ram} RAM)` : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {availableStorages.map((storage) => {
                  const isSelected = selectedVariant.storage === storage;
                  const v =
                    product.variants.find(
                      (item) => item.storage === storage && item.color === selectedVariant.color
                    ) || product.variants.find((item) => item.storage === storage);

                  return (
                    <button
                      key={storage}
                      type="button"
                      onClick={() => handleStorageChange(storage)}
                      className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/40 text-rose-950 ring-2 ring-rose-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold tracking-tight text-slate-900">
                          {storage} {v?.ram ? `• ${v.ram}` : ''}
                        </span>
                        <Cpu className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-600' : 'text-slate-400'}`} />
                      </div>

                      <div className="mt-1.5">
                        <div className="text-xs font-black text-rose-600 font-mono">
                          {v ? formatPrice(v.price) : 'Liên hệ'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Promotion Box (Khuyến mại đặc quyền) */}
            <ProductPromotionBox />

            {/* Action CTAs: Dual-stream (MUA NGAY + TRẢ GÓP 0%) & Quick Cart */}
            <div className="pt-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* MUA NGAY (Red #E11D48) */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="sm:col-span-6 bg-rose-600 hover:bg-rose-700 text-white p-3.5 rounded-2xl flex flex-col items-center justify-center shadow-md shadow-rose-600/20 transition cursor-pointer group active:scale-[0.99]"
                >
                  <span className="font-extrabold text-sm sm:text-base leading-tight tracking-wide flex items-center gap-1.5">
                    <Zap className="w-4 h-4 fill-white" />
                    MUA NGAY
                  </span>
                  <span className="text-[11px] text-rose-100 font-medium mt-0.5">
                    Giao tận nơi hoặc nhận tại cửa hàng
                  </span>
                </button>

                {/* TRẢ GÓP 0% (Blue #2563eb) */}
                <button
                  type="button"
                  onClick={() => setIsInstallmentModalOpen(true)}
                  className="sm:col-span-6 bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-2xl flex flex-col items-center justify-center shadow-md shadow-blue-600/20 transition cursor-pointer group active:scale-[0.99]"
                >
                  <span className="font-extrabold text-sm sm:text-base leading-tight tracking-wide flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    TRẢ GÓP 0%
                  </span>
                  <span className="text-[11px] text-blue-100 font-medium mt-0.5">
                    Duyệt nhanh qua CCCD / Thẻ tín dụng
                  </span>
                </button>
              </div>

              {/* Quick Add To Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                className={`w-full py-3 px-4 border font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                  justAdded
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Đã thêm vào giỏ hàng thành công!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 text-slate-600" />
                    <span>Thêm vào giỏ hàng</span>
                  </>
                )}
              </button>
            </div>

            {/* Value Proposition Micro Grid */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-center text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <Truck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="font-semibold block text-slate-900">Giao hoả tốc 2h</span>
                <span className="text-[10px] text-slate-500">Miễn phí toàn quốc</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <RotateCcw className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <span className="font-semibold block text-slate-900">Đổi mới 30 ngày</span>
                <span className="text-[10px] text-slate-500">Nếu lỗi nhà sản xuất</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <span className="font-semibold block text-slate-900">Giữ máy 15 phút</span>
                <span className="text-[10px] text-slate-500">An tâm thanh toán</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: 2-COLUMN LAYOUT (65:35) - HIGHLIGHTS VS TECHNICAL SPECS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (65% width): Highlights, Article & Customer Reviews */}
          <div className="lg:col-span-8">
            <ProductHighlightsSection product={product} />
          </div>

          {/* Right Column (35% width): Compact Zebra Specs Table & Trust Box */}
          <div className="lg:col-span-4">
            <ProductSpecsSummaryCard
              specs={product.specs}
              onOpenFullSpecs={() => setIsSpecsModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: FLOATING STICKY PURCHASE BAR */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-4 sm:px-8 shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={activeImage}
                alt={product.name}
                className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-1 border border-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  Điện thoại {product.name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  {selectedVariant.color} • {selectedVariant.storage}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-rose-600 font-black text-base sm:text-lg tabular-nums font-mono">
                  {formatPrice(selectedVariant.price)}
                </div>
                {selectedVariant.compareAtPrice &&
                  selectedVariant.compareAtPrice > selectedVariant.price && (
                    <div className="text-slate-400 line-through text-xs tabular-nums font-mono">
                      {formatPrice(selectedVariant.compareAtPrice)}
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Giỏ hàng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInstallmentModalOpen(true)}
                  className="hidden md:flex py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Trả góp 0%</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Mua ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: 0% INSTALLMENT CALCULATOR */}
      <ProductInstallmentModal
        open={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        productName={`Điện thoại ${product.name} (${selectedVariant.color} - ${selectedVariant.storage})`}
        price={selectedVariant.price}
        onProceedCheckout={handleBuyNow}
      />

      {/* MODAL 2: FULL DETAILED OEM HARDWARE SPECS */}
      <ProductSpecsModal
        open={isSpecsModalOpen}
        onClose={() => setIsSpecsModalOpen(false)}
        productName={`Điện thoại ${product.name}`}
        specs={product.specs}
      />
    </div>
  );
};
