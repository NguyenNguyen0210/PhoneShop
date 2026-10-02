import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  ShoppingCart,
  Zap,
  CheckCircle,
  Clock,
  ChevronRight,
  Info,
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

  useEffect(() => {
    if (!id) return;

    productService
      .getProductById(id)
      .then((data) => {
        if (data && data.variants && data.variants.length > 0) {
          setProduct(data);
          setSelectedVariant(data.variants[0]);
          setActiveImage(data.images?.[0] || data.thumbnail || '');
        }
      })
      .catch(() => {
        // If api fails and local wasn't found, default to first mock product
        if (!localInitial && mockProducts.length > 0) {
          const fallback = mockProducts[0];
          setProduct(fallback);
          setSelectedVariant(fallback.variants[0]);
          setActiveImage(fallback.images?.[0] || fallback.thumbnail || '');
        }
      })
      .finally(() => setLoading(false));
  }, [id, localInitial]);

  if (loading || !product || !selectedVariant) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p>Đang tải thông tin thiết bị...</p>
      </div>
    );
  }

  // Extract unique colors and unique storages
  const availableColors = Array.from(new Set(product.variants.map((v) => v.color)));
  const availableStorages = Array.from(new Set(product.variants.map((v) => v.storage)));

  const handleColorChange = (color: string) => {
    // Keep current storage if possible, else pick first with this color
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link to="/" className="hover:text-blue-600">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/products" className="hover:text-blue-600">
          Điện thoại
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-semibold">{product.name}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Gallery (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-center aspect-square overflow-hidden shadow-xs relative">
            {discountPercent && (
              <span className="absolute top-4 left-4 bg-red-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-md">
                Giảm {discountPercent}%
              </span>
            )}
            <img
              src={activeImage}
              alt={product.name}
              className="max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {imagesList.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`w-20 h-20 rounded-xl border-2 p-1.5 bg-white shrink-0 overflow-hidden transition ${
                  activeImage === img ? 'border-blue-600 shadow-md' : 'border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="thumbnail" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>

          {/* Trust points card */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-2.5 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-bold text-blue-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Chính sách phân phối độc quyền tại MobileCommerce:</span>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc text-slate-700">
              <li>100% máy mới nguyên seal, định danh IMEI điện tử</li>
              <li>Khóa giữ máy 15 phút tại bước Checkout chống bán trùng</li>
              <li>Bảo hành chính hãng 12 tháng tại các TTBH ủy quyền</li>
              <li>Đổi mới trong 30 ngày nếu phát sinh lỗi phần cứng</li>
            </ul>
          </div>
        </div>

        {/* Right: Info & Variant Switcher (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
              <span>{product.brand?.name || 'Chính hãng'}</span>
              <span>•</span>
              <span>Mã SKU: {selectedVariant.sku}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {product.name} ({selectedVariant.color} - {selectedVariant.storage})
            </h1>

            {/* Rating & In stock */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{product.rating || '4.9'}</span>
                <span className="text-slate-400 font-normal">({product.reviewCount || 150} đánh giá)</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                <span>Còn hàng ({selectedVariant.inventoryQty ?? 15} thiết bị sẵn sàng xuất kho)</span>
              </div>
            </div>
          </div>

          {/* Real-time Price Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-wrap items-baseline gap-4">
            <span className="text-3xl sm:text-4xl font-black text-red-600">
              {formatPrice(selectedVariant.price)}
            </span>
            {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
              <span className="text-base text-slate-400 line-through">
                {formatPrice(selectedVariant.compareAtPrice)}
              </span>
            )}
            <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-md">
              Đã bao gồm VAT & Miễn phí vận chuyển
            </span>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              1. Chọn màu sắc:{' '}
              <span className="text-blue-600 font-semibold normal-case">
                {selectedVariant.color}
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
              {availableColors.map((color) => {
                const isSelected = selectedVariant.color === color;
                const vMatch = product.variants.find((v) => v.color === color);
                return (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                      style={{ backgroundColor: vMatch?.colorHex || '#475569' }}
                    />
                    <span>{color}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Storage / RAM Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              2. Chọn dung lượng lưu trữ:{' '}
              <span className="text-blue-600 font-semibold normal-case">
                {selectedVariant.storage} {selectedVariant.ram ? `(${selectedVariant.ram} RAM)` : ''}
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
              {availableStorages.map((storage) => {
                const isSelected = selectedVariant.storage === storage;
                const v = product.variants.find(
                  (item) => item.storage === storage && item.color === selectedVariant.color
                ) || product.variants.find((item) => item.storage === storage);
                return (
                  <button
                    key={storage}
                    onClick={() => handleStorageChange(storage)}
                    className={`px-5 py-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{storage}</div>
                    {v && (
                      <div className="text-[11px] text-red-600 font-semibold mt-0.5">
                        {formatPrice(v.price)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: Add to Cart & Buy Now */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={handleAddToCart}
              className="py-3.5 px-6 border-2 border-blue-600 hover:bg-blue-50 text-blue-600 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Thêm vào giỏ hàng</span>
            </button>
            <button
              onClick={handleBuyNow}
              className="py-3.5 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-white" />
              <span>Mua ngay (Khóa giữ IMEI)</span>
            </button>
          </div>

          {/* Summary Perks */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-slate-600 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Truck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <span className="font-semibold block">Giao nhanh 2h</span>
              <span className="text-[10px] text-slate-400">Nội thành HCM/HN</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <RotateCcw className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <span className="font-semibold block">Đổi mới 30 ngày</span>
              <span className="text-[10px] text-slate-400">Lỗi do nhà sản xuất</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <span className="font-semibold block">Khóa máy 15:00</span>
              <span className="text-[10px] text-slate-400">Giữ chỗ không mất cọc</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Specifications & Reviews & IMEI Policy */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="flex border-b border-slate-200 bg-slate-50/70 text-xs font-bold">
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-4 px-6 border-b-2 transition ${
              activeTab === 'specs'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Thông số kỹ thuật chi tiết
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-6 border-b-2 transition ${
              activeTab === 'reviews'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Đánh giá khách hàng ({product.reviewCount || 150})
          </button>
          <button
            onClick={() => setActiveTab('imei-policy')}
            className={`py-4 px-6 border-b-2 transition ${
              activeTab === 'imei-policy'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Quy trình khóa giữ IMEI & Bảo hành
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === 'specs' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-900">Bảng thông số kỹ thuật phần cứng</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.specs &&
                  Object.entries(product.specs).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between py-2.5 px-4 bg-slate-50 rounded-xl text-xs border border-slate-100"
                    >
                      <span className="font-semibold text-slate-600">{key}:</span>
                      <span className="font-medium text-slate-900 text-right">{val}</span>
                    </div>
                  ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 leading-relaxed">{product.description}</p>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="text-center">
                  <span className="text-3xl font-black text-amber-600">{product.rating || '4.9'}</span>
                  <div className="flex text-amber-500 justify-center mt-1">
                    {'★★★★★'}
                  </div>
                </div>
                <div className="text-xs text-slate-600">
                  <p className="font-bold text-slate-900">Đánh giá chung từ khách hàng đã mua IMEI thật</p>
                  <p>100% đánh giá được ghi nhận từ các đơn hàng đã thanh toán thành công và kích hoạt bảo hành.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">Nguyễn Văn Hùng</span>
                    <span className="text-slate-400">3 ngày trước (Đã mua qua VietQR)</span>
                  </div>
                  <div className="text-amber-500 text-xs mb-1">★★★★★</div>
                  <p className="text-xs text-slate-600">
                    Máy chuẩn seal Apple Việt Nam, quét IMEI trên hệ thống tra cứu bảo hành hiển thị ngay thời hạn 12 tháng.
                    Giao hàng cực nhanh trong 1 giờ.
                  </p>
                </div>
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">Trần Thị Bích</span>
                    <span className="text-slate-400">1 tuần trước (Đã mua qua VNPay)</span>
                  </div>
                  <div className="text-amber-500 text-xs mb-1">★★★★★</div>
                  <p className="text-xs text-slate-600">
                    Màu titan bên ngoài nhìn sang chảnh hơn trong ảnh nhiều. Nhân viên tư vấn nhiệt tình, đóng gói kỹ càng 3 lớp chống sốc.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'imei-policy' && (
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Info className="w-5 h-5 text-blue-600" />
                <span>Quy trình quản lý định danh IMEI tự động tại MobileCommerce:</span>
              </div>
              <ol className="list-decimal pl-6 space-y-2">
                <li>
                  <strong>15-Minute Hold Concurrency:</strong> Khi bạn nhấn đặt hàng hoặc checkout, hệ thống thực hiện atomic lock
                  giữ chính xác 1 mã IMEI khả dụng trong kho cơ sở dữ liệu. Đồng hồ 15:00 bắt đầu đếm ngược.
                </li>
                <li>
                  <strong>Tự động nhả kho qua Redis BullMQ:</strong> Nếu trong 15 phút giao dịch chưa hoàn tất thanh toán hoặc người dùng
                  hủy giỏ, máy IMEI sẽ tự động được hoàn trả vào kho hàng (AVAILABLE) cho khách hàng khác mua.
                </li>
                <li>
                  <strong>Kích hoạt bảo hành điện tử tức thì:</strong> Khi giao dịch thanh toán thành công (COD/VietQR/VNPay), hệ thống chuyển
                  IMEI sang trạng thái SOLD và tự động khởi tạo mã bảo hành WRT-XXX có hiệu lực 12 tháng.
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
