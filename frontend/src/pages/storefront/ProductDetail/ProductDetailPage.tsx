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
  Info,
  Cpu,
  Check,
} from 'lucide-react';
import { mockProducts } from '../../../data/mockProducts';
import { productService } from '../../../services/productService';
import type { Product, ProductVariant } from '../../../types';
import { useCartStore } from '../../../stores/useCartStore';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const localInitial = mockProducts.find((p) => p.id === id || p.slug === id) || null;
  const [product, setProduct] = useState<Product | null>(localInitial);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    localInitial?.variants[0] || null
  );
  const [activeImage, setActiveImage] = useState<string>(
    localInitial?.images?.[0] || localInitial?.thumbnail || ''
  );
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews' | 'imei-policy'>('specs');
  const [loading, setLoading] = useState(!localInitial);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!id) return;

    productService
      .getProductById(id)
      .then((data) => {
        if (data && data.variants && data.variants.length > 0) {
          setProduct(data);
          setSelectedVariant(data.variants[0]);
          setActiveImage(data.images?.[0] || data.thumbnail || '');
        } else if (!localInitial && mockProducts.length > 0) {
          const fallback = mockProducts[0];
          setProduct(fallback);
          setSelectedVariant(fallback.variants[0]);
          setActiveImage(fallback.images?.[0] || fallback.thumbnail || '');
        }
      })
      .catch(() => {
        // If API fails and local wasn't found, default to first mock product
        if (!localInitial && mockProducts.length > 0) {
          const fallback = mockProducts[0];
          setProduct(fallback);
          setSelectedVariant(fallback.variants[0]);
          setActiveImage(fallback.images?.[0] || fallback.thumbnail || '');
        }
      })
      .finally(() => setLoading(false));
  }, [id, localInitial]);

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

  if (loading || !product || !selectedVariant) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="font-mono text-xs">Đang tải thông tin phần cứng thiết bị...</p>
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
    addItem(product, selectedVariant, 1);
    navigate('/checkout');
  };

  const imagesList = product.images?.length
    ? product.images
    : [product.thumbnail || 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5'];

  const discountPercent =
    selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price
      ? Math.round(
          ((selectedVariant.compareAtPrice - selectedVariant.price) /
            selectedVariant.compareAtPrice) *
            100
        )
      : null;

  const basePrice = product.variants[0]?.price || selectedVariant.price;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 text-slate-100">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-mono">
        <Link to="/" className="hover:text-sky-400 transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <Link to="/products" className="hover:text-sky-400 transition-colors">
          Điện thoại
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-slate-200 font-semibold truncate max-w-xs sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {/* SECTION 1: MAIN PRODUCT HARDWARE SHOWCASE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left: Dark Elevated Gallery Viewport (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0e1526] rounded-3xl border border-white/10 p-6 flex items-center justify-center aspect-square overflow-hidden shadow-2xl relative group">
            {/* Ambient Backlight Glow */}
            <div className="absolute inset-0 bg-radial from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />

            {/* Authenticity Badge */}
            <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Chính hãng 100% • Nguyên Seal</span>
            </div>

            {/* Discount Badge */}
            {discountPercent && (
              <span className="absolute top-4 right-4 z-10 bg-rose-500/20 text-rose-400 border border-rose-500/30 font-extrabold text-xs px-2.5 py-1 rounded-full backdrop-blur-md">
                -{discountPercent}%
              </span>
            )}

            {/* Main Image */}
            <img
              src={activeImage}
              alt={product.name}
              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 z-0"
            />
          </div>

          {/* Zoom Thumbnail Carousel */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {imagesList.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`w-20 h-20 rounded-2xl border-2 p-1.5 bg-[#0e1526] shrink-0 overflow-hidden transition-all cursor-pointer ${
                  activeImage === img
                    ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)] ring-2 ring-sky-400/20'
                    : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                }`}
              >
                <img src={img} alt="thumbnail" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>

          {/* Hardware Authenticity & Guarantee Banner */}
          <div className="bg-[#0e1526] border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs text-slate-300 shadow-lg">
            <div className="flex items-center gap-2 font-bold text-sky-400">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Cam kết độc quyền tại MobileCommerce:</span>
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-slate-300 font-mono text-[11px]">
              <li>Mỗi máy 1 mã IMEI chuẩn Luhn quốc tế, không bán trùng thiết bị</li>
              <li>Khóa giữ máy tự động 15 phút tại bước thanh toán (Redis BullMQ)</li>
              <li>Kích hoạt bảo hành điện tử chính hãng 12 tháng tức thì khi nhận máy</li>
              <li>Đổi mới trong 30 ngày nếu phát sinh bất kỳ lỗi phần cứng</li>
            </ul>
          </div>
        </div>

        {/* Right: Hardware Matrix & Variant Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header & Title */}
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider mb-2">
              <span className="font-bold">{product.brand?.name || 'Apple'}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">SKU: {selectedVariant.sku}</span>
            </div>

            {/* CRITICAL: Main Title in <h1> tag */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug">
              {product.name} ({selectedVariant.color} - {selectedVariant.storage})
            </h1>

            {/* Rating & Live Stock Radar */}
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{product.rating || '4.9'}</span>
                <span className="text-slate-400 font-normal">
                  ({product.reviewCount || 150} đánh giá phần cứng)
                </span>
              </div>
              <span className="text-slate-700 hidden sm:inline">|</span>

              {/* Live IMEI Radar Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
                </span>
                <span>
                  Radar Kho: Còn{' '}
                  <strong className="text-white font-bold">{selectedVariant.inventoryQty ?? 18}</strong>{' '}
                  IMEI sẵn sàng xuất kho
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Box in Cyber Sky */}
          <div className="bg-[#0e1526] border border-white/10 rounded-2xl p-5 flex flex-wrap items-baseline gap-4 shadow-xl">
            <span className="text-3xl sm:text-4xl font-black text-[#38bdf8] tabular-nums">
              {formatPrice(selectedVariant.price)}
            </span>
            {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
              <span className="text-base text-slate-500 line-through tabular-nums">
                {formatPrice(selectedVariant.compareAtPrice)}
              </span>
            )}
            <span className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 text-slate-300 font-medium rounded-md">
              Đã gồm VAT & Giao hàng miễn phí
            </span>
          </div>

          {/* HARDWARE MATRIX SELECTOR 1: Titanium Colors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                1. Chọn màu sắc Titanium:
              </label>
              <span className="text-xs font-mono text-sky-400 font-semibold">
                {selectedVariant.color}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              {availableColors.map((color) => {
                const isSelected = selectedVariant.color === color;
                const vMatch = product.variants.find((v) => v.color === color);

                return (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-400 bg-sky-950/40 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)] ring-2 ring-sky-400/30'
                        : 'border-white/10 bg-[#0e1526] hover:border-white/30 text-slate-300'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                      style={{ backgroundColor: vMatch?.colorHex || '#475569' }}
                    />
                    <span>{color}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* HARDWARE MATRIX SELECTOR 2: Semiconductor Storage Chips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                2. Chọn Dung Lượng (Hardware Matrix):
              </label>
              <span className="text-xs font-mono text-sky-400 font-semibold">
                {selectedVariant.storage} {selectedVariant.ram ? `(${selectedVariant.ram} RAM)` : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {availableStorages.map((storage) => {
                const isSelected = selectedVariant.storage === storage;
                const v =
                  product.variants.find(
                    (item) => item.storage === storage && item.color === selectedVariant.color
                  ) || product.variants.find((item) => item.storage === storage);

                const priceDiff = v ? v.price - basePrice : 0;
                const diffLabel =
                  priceDiff === 0
                    ? 'Giá tiêu chuẩn'
                    : priceDiff > 0
                    ? `+${formatPrice(priceDiff)}`
                    : `-${formatPrice(Math.abs(priceDiff))}`;

                return (
                  <button
                    key={storage}
                    onClick={() => handleStorageChange(storage)}
                    className={`relative p-3.5 rounded-xl border text-left font-mono transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/50 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] ring-1 ring-indigo-500'
                        : 'border-white/10 bg-[#0e1526] hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-black tracking-wider">{storage}</span>
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    </div>

                    <div className="mt-2">
                      <div className="text-xs font-bold text-[#38bdf8]">
                        {v ? formatPrice(v.price) : 'Liên hệ'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{diffLabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action CTAs: Add to Cart & Buy Now */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <button
              onClick={handleAddToCart}
              className={`py-3.5 px-6 border-2 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer ${
                justAdded
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400'
                  : 'border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-400'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>Đã thêm vào giỏ hàng!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span>Thêm vào giỏ</span>
                </>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              className="py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.35)] transition cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-white" />
              <span>Khóa máy 15:00 (Mua ngay)</span>
            </button>
          </div>

          {/* Value Proposition Micro Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3 bg-[#0e1526] rounded-xl border border-white/5">
              <Truck className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <span className="font-semibold block text-slate-200">Giao hoả tốc 2h</span>
              <span className="text-[10px] text-slate-400">Nội thành HN & HCM</span>
            </div>
            <div className="p-3 bg-[#0e1526] rounded-xl border border-white/5">
              <RotateCcw className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <span className="font-semibold block text-slate-200">Đổi mới 30 ngày</span>
              <span className="text-[10px] text-slate-400">Lỗi nhà sản xuất</span>
            </div>
            <div className="p-3 bg-[#0e1526] rounded-xl border border-white/5">
              <Clock className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <span className="font-semibold block text-slate-200">Khóa máy 15:00</span>
              <span className="text-[10px] text-slate-400">Giữ IMEI độc quyền</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: OBSIDIAN SPECS ACCORDION & TECHNICAL TABS */}
      <div className="bg-[#0e1526] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Tabs Bar */}
        <div className="flex border-b border-white/10 bg-[#07090e]/60 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-4 px-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'specs'
                ? 'border-sky-400 text-sky-400 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Thông số kỹ thuật phần cứng
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-sky-400 text-sky-400 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Đánh giá xác thực IMEI ({product.reviewCount || 150})
          </button>
          <button
            onClick={() => setActiveTab('imei-policy')}
            className={`py-4 px-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'imei-policy'
                ? 'border-sky-400 text-sky-400 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Quy trình Khóa Giữ IMEI 15 Phút & Redis BullMQ
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">
          {activeTab === 'specs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Bảng thông số kỹ thuật phần cứng</h3>
                <span className="text-xs text-slate-400 font-mono">Chuẩn OEM Phân Phối</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.specs &&
                  Object.entries(product.specs).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center py-3 px-4 bg-[#07090e]/80 rounded-xl text-xs border border-white/5 font-mono"
                    >
                      <span className="text-slate-400">{key}:</span>
                      <span className="font-semibold text-slate-100 text-right">{val}</span>
                    </div>
                  ))}
              </div>

              {product.description && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Mô tả kiến trúc sản phẩm
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{product.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-[#07090e]/80 border border-white/10 rounded-2xl p-6">
                <div className="text-center sm:text-left">
                  <span className="text-4xl font-black text-amber-400 tabular-nums">
                    {product.rating || '4.9'}
                  </span>
                  <div className="flex text-amber-400 text-sm mt-1">★★★★★</div>
                  <span className="text-[11px] text-slate-400 font-mono block mt-1">
                    Dựa trên {product.reviewCount || 150} lượt xác thực
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">Đánh giá minh bạch 100% từ khách hàng sở hữu máy thật</p>
                  <p className="text-slate-400">
                    Mỗi bình luận gắn liền với đơn hàng đã thanh toán qua VietQR/VNPay và kích hoạt thành
                    công chứng chỉ bảo hành điện tử WRT trên hệ thống.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="border-b border-white/5 pb-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Nguyễn Văn Hùng</span>
                    <span className="text-slate-500 font-mono text-[11px]">3 ngày trước (Đã mua qua VietQR)</span>
                  </div>
                  <div className="text-amber-400 text-xs">★★★★★</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Máy chuẩn nguyên seal, quét mã IMEI trên hệ thống tra cứu bảo hành hiển thị ngay thời
                    hạn kích hoạt 12 tháng. Quy trình khóa máy 15 phút tại bước checkout rất an tâm!
                  </p>
                </div>

                <div className="border-b border-white/5 pb-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Trần Thị Bích</span>
                    <span className="text-slate-500 font-mono text-[11px]">1 tuần trước (Đã mua qua VNPay)</span>
                  </div>
                  <div className="text-amber-400 text-xs">★★★★★</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Màu sắc Titan sa mạc bên ngoài thực sự ấn tượng, sang trọng hơn nhiều so với hình ảnh.
                    Giao hàng hỏa tốc trong 1 giờ.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'imei-policy' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-mono">
              <div className="flex items-center gap-2 font-bold text-white text-sm font-sans">
                <Info className="w-5 h-5 text-sky-400 shrink-0" />
                <span>Kiến trúc quản trị định danh IMEI tự động tại MobileCommerce:</span>
              </div>
              <ol className="list-decimal pl-6 space-y-3 text-slate-300">
                <li>
                  <strong className="text-white">Khóa nguyên tử 15 phút (Atomic Concurrency):</strong> Khi bạn nhấn
                  checkout, hệ thống kích hoạt câu lệnh <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">SELECT ... FOR UPDATE SKIP LOCKED</code> để
                  cô lập chính xác 1 bản ghi IMEI khả dụng trong PostgreSQL. Đồng hồ đếm ngược 15:00 bắt đầu chạy.
                </li>
                <li>
                  <strong className="text-white">Giải phóng kho tự động qua Redis BullMQ:</strong> Nếu giao dịch không
                  hoàn tất trong vòng 15 phút hoặc bạn hủy đơn hàng, hệ thống BullMQ background job sẽ lập tức hoàn trả
                  IMEI về trạng thái <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">AVAILABLE</code> cho khách hàng tiếp theo.
                </li>
                <li>
                  <strong className="text-white">Kích hoạt chứng chỉ bảo hành điện tử WRT:</strong> Sau khi cổng thanh
                  toán (VietQR/VNPay) gửi Webhook xác nhận giao dịch thành công, máy chuyển sang trạng thái <code className="text-sky-300 bg-black/40 px-1 py-0.5 rounded">SOLD</code> và
                  tự động phát hành mã bảo hành có hiệu lực 12 tháng.
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: FLOATING STICKY PURCHASE BAR */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e1526]/95 backdrop-blur-xl border-t border-white/10 py-3 px-4 sm:px-8 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={activeImage}
                alt={product.name}
                className="w-12 h-12 rounded-xl object-contain bg-[#07090e] p-1 border border-white/10 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-white truncate">{product.name}</div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  {selectedVariant.color} • {selectedVariant.storage}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-[#38bdf8] font-black text-base sm:text-lg tabular-nums">
                  {formatPrice(selectedVariant.price)}
                </div>
                {selectedVariant.compareAtPrice &&
                  selectedVariant.compareAtPrice > selectedVariant.price && (
                    <div className="text-slate-500 line-through text-xs tabular-nums">
                      {formatPrice(selectedVariant.compareAtPrice)}
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddToCart}
                  className="py-2.5 px-4 rounded-xl border border-indigo-500/60 hover:bg-indigo-500/10 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Thêm vào giỏ</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Khóa máy 15:00</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
