import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Check,
  ChevronRight,
  Truck,
  Award,
} from 'lucide-react';
import { mockProducts, mockBrands } from '../../../data/mockProducts';
import { productService } from '../../../services/productService';
import type { Product } from '../../../types';
import { useCartStore } from '../../../stores/useCartStore';

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const { addItem } = useCartStore();

  // Featured flagship showcase index
  const [heroIndex, setHeroIndex] = useState(0);

  const heroShowcases = [
    {
      id: 'prod-iphone-16-pro-max',
      brand: 'Apple',
      tagline: 'Tuyệt tác Titan sa mạc • Chip A18 Pro',
      name: 'iPhone 16 Pro Max',
      description:
        'Màn hình Super Retina XDR 6.9 inch tràn viền mỏng kỷ lục, nút Điều khiển Camera cảm ứng lực hoàn toàn mới và hệ thống camera 48MP Fusion đỉnh cao.',
      price: 34990000,
      comparePrice: 37990000,
      monthlyPay: '2.915.000₫/tháng (Trả góp 0%)',
      image: '/images/products/iphone-16-pro-max.png',
      badge: 'Flagship Mới Nhất 2026',
      stockStatus: 'Còn 5 máy tại kho – Giao nhanh 2h',
    },
    {
      id: 'prod-samsung-s24-ultra',
      brand: 'Samsung',
      tagline: 'Kỷ nguyên Galaxy AI • Khung viền Titanium',
      name: 'Galaxy S24 Ultra 5G',
      description:
        'Quyền năng Galaxy AI trợ lý đắc lực, camera 200MP zoom mắt thần Quad Tele 100x và bút S-Pen tích hợp đa năng trong khung viền titan siêu bền.',
      price: 27990000,
      comparePrice: 31990000,
      monthlyPay: '2.330.000₫/tháng (Trả góp 0%)',
      image: '/images/products/samsung-s24-ultra.png',
      badge: 'Galaxy AI Đỉnh Cao',
      stockStatus: 'Còn 8 máy tại kho – Sẵn sàng xuất kho',
    },
    {
      id: 'prod-samsung-z-fold6',
      brand: 'Samsung',
      tagline: 'Tuyệt tác màn hình gập mỏng nhẹ nhất',
      name: 'Galaxy Z Fold6 5G',
      description:
        'Bản lề FlexHinge rãnh kép phẳng mượt, màn hình mở rộng 7.6 inch đa nhiệm thông minh cùng khung viền Armor Aluminum gia cường bền bỉ.',
      price: 39990000,
      comparePrice: 43990000,
      monthlyPay: '3.330.000₫/tháng (Trả góp 0%)',
      image: '/images/products/samsung-z-fold6.png',
      badge: 'Đột Phá Màn Hình Gập',
      stockStatus: 'Còn 4 máy tại kho – Đặt giữ chỗ ngay',
    },
  ];

  const currentHero = heroShowcases[heroIndex];

  useEffect(() => {
    // Attempt to load from API, fallback to mockProducts
    productService
      .getProducts()
      .then((res) => {
        if (res.items && res.items.length >= 6) {
          setProducts(res.items);
        } else {
          setProducts(mockProducts);
        }
      })
      .catch(() => {
        setProducts(mockProducts);
      });
  }, []);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const primaryVariant = product.variants?.[0];
    if (primaryVariant) {
      addItem(product, primaryVariant, 1);
      setAddedProductId(product.id);
      setTimeout(() => {
        setAddedProductId(null);
      }, 1500);
    }
  };

  // Filter products by brand
  const filteredProducts =
    selectedBrand === 'all'
      ? products
      : products.filter(
          (p) =>
            p.brand?.name.toLowerCase().includes(selectedBrand.toLowerCase()) ||
            p.brandId?.toLowerCase().includes(selectedBrand.toLowerCase())
        );

  return (
    <div className="space-y-12 pb-24 bg-[#F8FAFC] text-slate-800 min-h-screen">
      {/* SECTION 1: GRAND RETAIL HERO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="relative rounded-3xl bg-white border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 space-y-6">
              {/* Badges & Trust signals */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{currentHero.badge}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chính hãng 100%</span>
                </span>
              </div>

              {/* Headline & Subhead */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
                  {currentHero.brand} • {currentHero.tagline}
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  {currentHero.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed pt-1">
                  {currentHero.description}
                </p>
              </div>

              {/* Retail Value Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Giao hàng hoả tốc 2 giờ miễn phí</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bảo hành 12 tháng 1 đổi 1 chính hãng</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Giữ máy 15 phút an tâm thanh toán</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Nguyên seal hộp • Đầy đủ hoá đơn VAT</span>
                </div>
              </div>

              {/* Price & Payment Reassurance */}
              <div className="pt-2 flex flex-wrap items-baseline gap-3 sm:gap-4 border-t border-slate-100">
                <div className="text-3xl sm:text-4xl font-black text-blue-600 tabular-nums">
                  {formatPrice(currentHero.price)}
                </div>
                <div className="text-sm sm:text-base text-slate-400 line-through tabular-nums">
                  {formatPrice(currentHero.comparePrice)}
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  {currentHero.monthlyPay}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={`/products/${currentHero.id}`}
                  className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-blue-500/25 transition cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Mua ngay</span>
                </Link>

                <Link
                  to={`/products/${currentHero.id}`}
                  className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm sm:text-base flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Xem chi tiết</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>

                <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 ml-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{currentHero.stockStatus}</span>
                </div>
              </div>

              {/* Hero Switcher Indicators */}
              <div className="flex items-center gap-2 pt-2">
                {heroShowcases.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      heroIndex === idx ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                    aria-label={`Showcase ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Right Product Visual (5 Cols) */}
            <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50/50 to-slate-100/40 border-t lg:border-t-0 lg:border-l border-slate-100">
              <Link to={`/products/${currentHero.id}`} className="group relative block w-full max-w-sm">
                <div className="relative aspect-square w-full flex items-center justify-center p-4">
                  <img
                    src={currentHero.image}
                    alt={currentHero.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="text-center mt-2">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                    {currentHero.name} • Đổi mới 30 ngày →
                  </span>
                </div>
              </Link>

              {/* Direct Warranty Quick Link */}
              <div className="mt-4 pt-4 border-t border-slate-200/60 w-full flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Tra cứu bảo hành theo IMEI</span>
                </span>
                <Link
                  to="/warranty-lookup"
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <span>Tra cứu ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: BRAND FILTER DOCK */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Thương hiệu di động hàng đầu
            </h2>
            <p className="text-xs text-slate-500">
              Chọn thương hiệu để lọc sản phẩm chính hãng sẵn có tại cửa hàng
            </p>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-500">
            Hiển thị {filteredProducts.length} sản phẩm
          </span>
        </div>

        {/* Clean Brand Selector Pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedBrand('all')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedBrand === 'all'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:text-blue-600'
            }`}
          >
            Tất cả thiết bị ({products.length})
          </button>

          {mockBrands.map((b) => {
            const count = products.filter(
              (p) =>
                p.brand?.name.toLowerCase().includes(b.name.toLowerCase()) ||
                p.brandId?.toLowerCase().includes(b.id.toLowerCase())
            ).length;

            return (
              <button
                key={b.id}
                onClick={() => setSelectedBrand(b.name)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                  selectedBrand.toLowerCase() === b.name.toLowerCase()
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:text-blue-600'
                }`}
              >
                <span>{b.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedBrand.toLowerCase() === b.name.toLowerCase()
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: PRODUCT CATALOG GRID (BALANCED 2x4 COLS, NO ORPHAN CARDS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Danh mục Smartphone Chính Hãng
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cam kết nguyên seal 100% • Kích hoạt bảo hành điện tử theo số IMEI
            </p>
          </div>
        </div>

        {/* 4-column balanced grid on desktop, 2-column on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => {
            const primaryVariant = product.variants?.[0];
            const price = primaryVariant?.price || 0;
            const comparePrice = primaryVariant?.compareAtPrice;
            const discountPercent =
              comparePrice && comparePrice > price
                ? Math.round(((comparePrice - price) / comparePrice) * 100)
                : null;

            // Simplified, elegant single spec line requested by user
            const storage = primaryVariant?.storage || '256GB';
            const color = primaryVariant?.color || 'Titan';
            const chipset = product.specs?.['Chipset']?.split('(')?.[0]?.trim() || 'Chipset Cao Cấp';

            const isJustAdded = addedProductId === product.id;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100/90 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Top Info Bar inside Card */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {product.brand?.name || 'Chính hãng 100%'}
                    </span>
                    {discountPercent ? (
                      <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                        -{discountPercent}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Trả góp 0%
                      </span>
                    )}
                  </div>

                  {/* Clean Smartphone Product Image */}
                  <Link
                    to={`/products/${product.id}`}
                    className="relative aspect-square w-full rounded-xl bg-slate-50/70 flex items-center justify-center p-3 my-2 block overflow-hidden"
                  >
                    <img
                      src={product.thumbnail || product.images?.[0]}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </Link>

                  {/* Concise Single-Line Specs (No border clutter!) */}
                  <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-2">
                    {storage} • {color} • {chipset}
                  </p>

                  {/* Product Title */}
                  <Link to={`/products/${product.id}`} className="block mt-1">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                  </Link>
                </div>

                {/* Bottom Price & Add To Cart Button */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-blue-600 font-extrabold text-base sm:text-lg tabular-nums">
                      {formatPrice(price)}
                    </div>
                    {comparePrice && comparePrice > price && (
                      <div className="text-[11px] text-slate-400 line-through tabular-nums">
                        {formatPrice(comparePrice)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleAddToCart(e, product)}
                    className={`p-2.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      isJustAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white'
                    }`}
                    title="Thêm vào giỏ hàng"
                  >
                    {isJustAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span className="hidden sm:inline">Đã thêm!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span className="hidden sm:inline">Thêm giỏ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: TRUST & SERVICE BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Chính sách bán hàng minh bạch 100%</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Tra cứu thời hạn bảo hành thiết bị trực tuyến
            </h3>
            <p className="text-xs text-slate-600 max-w-xl">
              Mỗi máy bán ra tại MobileCommerce đều được định danh bằng số IMEI duy nhất. Khách hàng có thể tự kiểm tra ngày kích hoạt và thời hạn bảo hành 12 tháng bất cứ lúc nào.
            </p>
          </div>

          <Link
            to="/warranty-lookup"
            className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 transition cursor-pointer shrink-0"
          >
            <span>Tra cứu bảo hành ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
