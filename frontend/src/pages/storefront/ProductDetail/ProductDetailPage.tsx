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
import { productService } from '../../../services/productService';
import type { Product, ProductVariant } from '../../../types';
import { useCartStore } from '../../../stores/useCartStore';
import { resolveColorHex } from '../../../utils/colorHelper';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews' | 'imei-policy'>('specs');
  const [loading, setLoading] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

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
    if (!product || !selectedVariant) return;
    addItem(product, selectedVariant, 1);
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 py-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Đang tải thông tin sản phẩm từ cơ sở dữ liệu...</p>
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

  const fallbackImg = '/images/products/iphone-16-pro-max.png';

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
                src={activeImage || fallbackImg}
                alt={product.name}
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 z-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallbackImg;
                }}
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

            {/* Hardware Authenticity & Guarantee Banner */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-600 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cam kết dịch vụ tại MobileCommerce:</span>
              </div>
              <ul className="space-y-1.5 pl-5 list-disc text-slate-600 text-xs">
                <li>Máy mới 100% nguyên seal hộp, kiểm tra máy trước khi nhận hàng</li>
                <li>Giữ máy 15 phút tại bước thanh toán – Yên tâm không lo mất suất</li>
                <li>Kích hoạt bảo hành điện tử chính hãng 12 tháng theo số IMEI</li>
                <li>Đổi mới trong 30 ngày nếu phát sinh bất kỳ lỗi phần cứng</li>
              </ul>
            </div>
          </div>

        {/* Right: Hardware Matrix & Variant Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header & Title */}
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-2">
              <span className="font-bold text-blue-600">{product.brand?.name || 'Chính hãng'}</span>
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
                <span className="text-amber-600">
                  {product.rating ? Number(product.rating).toFixed(1) : 'Mới'}
                </span>
                <span className="text-slate-500 font-normal">
                  ({product.reviewCount ?? product.reviews?.length ?? 0} đánh giá phần cứng)
                </span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>

              {/* Live Stock Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
                </span>
                <span>
                  Tình trạng: Còn{' '}
                  <strong className="text-slate-900 font-bold">
                    {selectedVariant.inventory?.availableQty ?? selectedVariant.inventoryQty ?? 0}
                  </strong>{' '}
                  máy sẵn sàng xuất kho
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

          {/* SELECTOR 1: Colors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Chọn màu sắc:
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
                      style={{ backgroundColor: resolveColorHex(color, vMatch?.colorHex) }}
                    />
                    <span>{color}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SELECTOR 2: Storage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Chọn dung lượng bộ nhớ:
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
              <span>Mua ngay (Giữ máy 15 phút)</span>
            </button>
          </div>

          {/* Value Proposition Micro Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
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

      {/* SECTION 2: SPECS ACCORDION & TECHNICAL TABS */}
      <div
        className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs"
        style={{ boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}
      >
        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200/80 bg-slate-50/60 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-4 px-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'specs'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Thông số kỹ thuật
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Đánh giá khách hàng ({product.reviewCount ?? product.reviews?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('imei-policy')}
            className={`py-4 px-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'imei-policy'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Chính sách giữ máy 15 phút & Bảo hành
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
                    Đặc điểm nổi bật
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
                    {product.rating ? Number(product.rating).toFixed(1) : '—'}
                  </span>
                  <div className="flex text-amber-500 text-sm mt-1">★★★★★</div>
                  <span className="text-[11px] text-slate-500 font-mono block mt-1">
                    {product.reviewCount ?? product.reviews?.length ?? 0} khách hàng đã đánh giá
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-900">Đánh giá thực tế từ người dùng sở hữu máy</p>
                  <p className="text-slate-500">
                    Mọi đánh giá đều được xác thực từ khách hàng đã nhận máy và kích hoạt bảo hành điện tử chính hãng thành công.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {product.reviews && product.reviews.length > 0 ? (
                  product.reviews.map((rev: any) => {
                    const reviewerName = rev.user
                      ? `${rev.user.lastName || ''} ${rev.user.firstName || ''}`.trim()
                      : 'Khách hàng PhoneShop';
                    const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
                    const replies = Array.isArray(rev.replies) ? rev.replies : [];
                    return (
                      <div key={rev.id} className="border-b border-slate-100 pb-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{reviewerName}</span>
                          <span className="text-slate-400 text-[11px]">
                            {new Date(rev.createdAt).toLocaleDateString('vi-VN')} {rev.isVerified ? '(Đã xác thực mua hàng)' : ''}
                          </span>
                        </div>
                        <div className="text-amber-500 text-xs">{stars}</div>
                        {rev.title && <p className="text-xs font-semibold text-slate-800">{rev.title}</p>}
                        <p className="text-xs text-slate-600 leading-relaxed">{rev.content}</p>

                        {/* Shop / customer replies */}
                        {replies.length > 0 && (
                          <div className="pt-2 pl-3 sm:pl-4 space-y-2.5 border-l-2 border-blue-200 ml-1">
                            {replies.map((rep: any) => {
                              const replyerName = rep.user
                                ? `${rep.user.lastName || ''} ${rep.user.firstName || ''}`.trim()
                                : 'PhoneShop';
                              const roles: string[] = Array.isArray(rep.user?.roles)
                                ? rep.user.roles.map((r: any) => r?.role?.name).filter(Boolean)
                                : [];
                              const isShop = roles.some((r) => ['ADMIN', 'STAFF', 'MANAGER'].includes(r));
                              return (
                                <div key={rep.id} className="bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5 space-y-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                                    <span className="font-bold text-slate-900">{replyerName}</span>
                                    {isShop && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                                        Phản hồi từ PhoneShop
                                      </span>
                                    )}
                                    <span className="text-slate-400">
                                      {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">{rep.content}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên mua và đánh giá!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'imei-policy' && (
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed font-sans">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Chính sách giữ hàng 15 phút & Bảo hành an tâm tại MobileCommerce:</span>
              </div>
              <ol className="list-decimal pl-6 space-y-3">
                <li>
                  <strong className="text-slate-900">Giữ máy 15 phút chính xác 100%:</strong> Khi bạn bấm tiến hành thanh toán, hệ thống tự động giữ riêng thiết bị cho bạn trong 15 phút. Bạn hoàn toàn yên tâm điền thông tin và thanh toán chuyển khoản mà không sợ bị khách hàng khác mua mất máy.
                </li>
                <li>
                  <strong className="text-slate-900">Tự động hoàn trả kho nếu quá hạn:</strong> Nếu sau 15 phút bạn chưa hoàn tất thanh toán hoặc quyết định hủy đơn, máy sẽ tự động được mở lại trên website cho khách hàng tiếp theo có nhu cầu.
                </li>
                <li>
                  <strong className="text-slate-900">Kích hoạt bảo hành điện tử chính hãng 12 tháng:</strong> Ngay sau khi đơn hàng được thanh toán thành công, mã bảo hành điện tử gắn liền với số IMEI của thiết bị sẽ được kích hoạt tức thì. Bạn có thể tra cứu hạn bảo hành bất cứ lúc nào tại trang Tra Cứu Bảo Hành.
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
                  <span>Mua ngay (Giữ máy 15p)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
