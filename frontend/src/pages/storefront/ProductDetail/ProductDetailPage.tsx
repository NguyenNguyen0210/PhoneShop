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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center py-24 text-slate-500">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-600">Đang tải thông tin phần cứng thiết bị...</p>
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

        {/* SECTION 1: MAIN PRODUCT HARDWARE SHOWCASE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left: Light Elevated Gallery Viewport (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-center aspect-square overflow-hidden shadow-sm relative group"
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
                  className={`w-20 h-20 rounded-2xl border-2 p-1.5 bg-white shrink-0 overflow-hidden transition-all cursor-pointer ${
                    activeImage === img
                      ? 'border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>

            {/* Hardware Authenticity & Guarantee Banner */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs text-slate-600 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Cam kết độc quyền tại MobileCommerce:</span>
              </div>
              <ul className="space-y-1.5 pl-5 list-disc text-slate-600 font-mono text-[11px]">
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
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-2">
              <span className="font-bold text-blue-600">{product.brand?.name || 'Apple'}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">SKU: {selectedVariant.sku}</span>
            </div>

            {/* CRITICAL: Main Title in <h1> tag */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-snug">
              {product.name} ({selectedVariant.color} - {selectedVariant.storage})
            </h1>

            {/* Rating & Live Stock Radar */}
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span className="text-amber-600">{product.rating || '4.9'}</span>
                <span className="text-slate-500 font-normal">
                  ({product.reviewCount || 150} đánh giá phần cứng)
                </span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>

              {/* Live IMEI Radar Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
                </span>
                <span>
                  Radar Kho: Còn{' '}
                  <strong className="text-slate-900 font-bold">{selectedVariant.inventoryQty ?? 18}</strong>{' '}
                  IMEI sẵn sàng xuất kho
                </span>
              </div>
            </div>
          </div>

          {/* Price Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-baseline gap-4 shadow-sm">
            <span className="text-3xl sm:text-4xl font-black text-blue-600 tabular-nums">
              {formatPrice(selectedVariant.price)}
            </span>
            {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
              <span className="text-base text-slate-400 line-through tabular-nums">
                {formatPrice(selectedVariant.compareAtPrice)}
              </span>
            )}
            <span className="text-xs px-2.5 py-1 bg-white border border-slate-200 text-slate-600 font-medium rounded-md shadow-xs">
              Đã gồm VAT & Giao hàng miễn phí
            </span>
          </div>

          {/* HARDWARE MATRIX SELECTOR 1: Titanium Colors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Chọn màu sắc Titanium:
              </label>
              <span className="text-xs font-mono text-blue-600 font-semibold">
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
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-slate-300 shadow-inner"
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
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Chọn Dung Lượng (Hardware Matrix):
              </label>
              <span className="text-xs font-mono text-blue-600 font-semibold">
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
                    className={`relative p-3.5 rounded-xl border text-left font-mono transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-black tracking-wider text-slate-900">{storage}</span>
                      <Cpu className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>

                    <div className="mt-2">
                      <div className="text-xs font-bold text-blue-600">
                        {v ? formatPrice(v.price) : 'Liên hệ'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{diffLabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action CTAs: Add to Cart & Buy Now */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <button
              onClick={handleAddToCart}
              className={`py-3.5 px-6 border font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                justAdded
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-5 h-5 text-emerald-600" />
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
              className="py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-white" />
              <span>Khóa máy 15:00 (Mua ngay)</span>
            </button>
          </div>

          {/* Value Proposition Micro Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <Truck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <span className="font-semibold block text-slate-900">Giao hoả tốc 2h</span>
              <span className="text-[10px] text-slate-500">Nội thành HN & HCM</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <RotateCcw className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <span className="font-semibold block text-slate-900">Đổi mới 30 ngày</span>
              <span className="text-[10px] text-slate-500">Lỗi nhà sản xuất</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <span className="font-semibold block text-slate-900">Khóa máy 15:00</span>
              <span className="text-[10px] text-slate-500">Giữ IMEI độc quyền</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SPECS ACCORDION & TECHNICAL TABS */}
      <div
        className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
        style={{ boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}
      >
        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-4 px-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'specs'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Thông số kỹ thuật phần cứng
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Đánh giá xác thực IMEI ({product.reviewCount || 150})
          </button>
          <button
            onClick={() => setActiveTab('imei-policy')}
            className={`py-4 px-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'imei-policy'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
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
                <h3 className="text-base font-bold text-slate-900">Bảng thông số kỹ thuật phần cứng</h3>
                <span className="text-xs text-slate-500 font-mono">Chuẩn OEM Phân Phối</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.specs &&
                  Object.entries(product.specs).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-xl text-xs border border-slate-200/80 font-mono"
                    >
                      <span className="text-slate-500">{key}:</span>
                      <span className="font-semibold text-slate-900 text-right">{val}</span>
                    </div>
                  ))}
              </div>

              {product.description && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Mô tả kiến trúc sản phẩm
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="text-center sm:text-left">
                  <span className="text-4xl font-black text-amber-500 tabular-nums">
                    {product.rating || '4.9'}
                  </span>
                  <div className="flex text-amber-500 text-sm mt-1">★★★★★</div>
                  <span className="text-[11px] text-slate-500 font-mono block mt-1">
                    Dựa trên {product.reviewCount || 150} lượt xác thực
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-900">Đánh giá minh bạch 100% từ khách hàng sở hữu máy thật</p>
                  <p className="text-slate-500">
                    Mỗi bình luận gắn liền với đơn hàng đã thanh toán qua VietQR/VNPay và kích hoạt thành
                    công chứng chỉ bảo hành điện tử WRT trên hệ thống.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="border-b border-slate-100 pb-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Nguyễn Văn Hùng</span>
                    <span className="text-slate-400 font-mono text-[11px]">3 ngày trước (Đã mua qua VietQR)</span>
                  </div>
                  <div className="text-amber-500 text-xs">★★★★★</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Máy chuẩn nguyên seal, quét mã IMEI trên hệ thống tra cứu bảo hành hiển thị ngay thời
                    hạn kích hoạt 12 tháng. Quy trình khóa máy 15 phút tại bước checkout rất an tâm!
                  </p>
                </div>

                <div className="border-b border-slate-100 pb-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Trần Thị Bích</span>
                    <span className="text-slate-400 font-mono text-[11px]">1 tuần trước (Đã mua qua VNPay)</span>
                  </div>
                  <div className="text-amber-500 text-xs">★★★★★</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Màu sắc Titan sa mạc bên ngoài thực sự ấn tượng, sang trọng hơn nhiều so với hình ảnh.
                    Giao hàng hỏa tốc trong 1 giờ.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'imei-policy' && (
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed font-sans">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Kiến trúc quản trị định danh IMEI tự động tại MobileCommerce:</span>
              </div>
              <ol className="list-decimal pl-6 space-y-3">
                <li>
                  <strong className="text-slate-900">Khóa nguyên tử 15 phút (Atomic Concurrency):</strong> Khi bạn nhấn
                  checkout, hệ thống kích hoạt câu lệnh <code className="text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded font-mono text-[11px]">SELECT ... FOR UPDATE SKIP LOCKED</code> để
                  cô lập chính xác 1 bản ghi IMEI khả dụng trong PostgreSQL. Đồng hồ đếm ngược 15:00 bắt đầu chạy.
                </li>
                <li>
                  <strong className="text-slate-900">Giải phóng kho tự động qua Redis BullMQ:</strong> Nếu giao dịch không
                  hoàn tất trong vòng 15 phút hoặc bạn hủy đơn hàng, hệ thống BullMQ background job sẽ lập tức hoàn trả
                  IMEI về trạng thái <code className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded font-mono text-[11px]">AVAILABLE</code> cho khách hàng tiếp theo.
                </li>
                <li>
                  <strong className="text-slate-900">Kích hoạt chứng chỉ bảo hành điện tử WRT:</strong> Sau khi cổng thanh
                  toán (VietQR/VNPay) gửi Webhook xác nhận giao dịch thành công, máy chuyển sang trạng thái <code className="text-blue-800 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded font-mono text-[11px]">SOLD</code> và
                  tự động phát hành mã bảo hành có hiệu lực 12 tháng.
                </li>
              </ol>
            </div>
          )}
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
                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{product.name}</div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  {selectedVariant.color} • {selectedVariant.storage}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-blue-600 font-black text-base sm:text-lg tabular-nums">
                  {formatPrice(selectedVariant.price)}
                </div>
                {selectedVariant.compareAtPrice &&
                  selectedVariant.compareAtPrice > selectedVariant.price && (
                    <div className="text-slate-400 line-through text-xs tabular-nums">
                      {formatPrice(selectedVariant.compareAtPrice)}
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddToCart}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Thêm vào giỏ</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Khóa máy 15:00 (Mua ngay)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
