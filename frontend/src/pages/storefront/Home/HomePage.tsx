import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Sparkles,
  ShoppingCart,
  ChevronRight,
  Truck,
  RotateCcw,
  ArrowLeftRight,
  CreditCard,
} from 'lucide-react';
import { productService } from '../../../services/productService';
import type { Product, Brand } from '../../../types';
import { ProductCard } from '../../../components/storefront/ProductCard';

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

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
      price: 30990000,
      comparePrice: 34990000,
      monthlyPay: '2.580.000₫/tháng',
      image: '/images/products/iphone-16-pro-max.png',
      badge: 'Flagship Mới Nhất 2026',
      stockStatus: 'Còn 5 suất ưu đãi tại kho – Giao hỏa tốc hôm nay',
    },
    {
      id: 'prod-samsung-s24-ultra',
      brand: 'Samsung',
      tagline: 'Kỷ nguyên Galaxy AI • Khung viền Titanium',
      name: 'Galaxy S24 Ultra 5G',
      description:
        'Quyền năng Galaxy AI trợ lý đắc lực, camera 200MP zoom mắt thần Quad Tele 100x và bút S-Pen tích hợp đa năng trong khung viền titan siêu bền.',
      price: 25290000,
      comparePrice: 31990000,
      monthlyPay: '2.107.000₫/tháng',
      image: '/images/products/samsung-s24-ultra.png',
      badge: 'Galaxy AI Đỉnh Cao',
      stockStatus: 'Còn 8 máy tại kho – Sẵn sàng xuất kho ngay',
    },
    {
      id: 'prod-samsung-z-fold6',
      brand: 'Samsung',
      tagline: 'Tuyệt tác màn hình gập mỏng nhẹ nhất',
      name: 'Galaxy Z Fold6 5G',
      description:
        'Bản lề FlexHinge rãnh kép phẳng mượt, màn hình mở rộng 7.6 inch đa nhiệm thông minh cùng khung viền Armor Aluminum gia cường bền bỉ.',
      price: 37590000,
      comparePrice: 43990000,
      monthlyPay: '3.132.000₫/tháng',
      image: '/images/products/samsung-z-fold6.png',
      badge: 'Đột Phá Màn Hình Gập',
      stockStatus: 'Còn 4 máy tại kho – Đặt giữ ưu đãi ngay',
    },
  ];

  const currentHero = heroShowcases[heroIndex];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productService.getProducts({ limit: 100 }),
      productService.getBrands(),
    ])
      .then(([prodRes, brandsRes]) => {
        if (prodRes.items) {
          setProducts(prodRes.items);
        }
        if (Array.isArray(brandsRes) && brandsRes.length > 0) {
          setBrands(brandsRes);
        }
      })
      .catch((err) => {
        console.error('Failed to load catalog from database:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
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
    <div className="space-y-12 sm:space-y-16 pb-20 bg-[#F8FAFC] text-slate-800 min-h-screen">
      {/* ─────────────────────────────────────────────────────────────
          1. CLEAN WHITE SHOWCASE HERO BANNER
          ───────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="relative rounded-3xl bg-white border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-300">
          {/* Subtle Ambient Tech Spotlight behind device */}
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-blue-50 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 p-6 sm:p-10 lg:p-12">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badges & Trust signals */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{currentHero.badge}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chính hãng 100% Nguyên Seal</span>
                </span>
              </div>

              {/* Headline & Subhead */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
                  {currentHero.brand} • {currentHero.tagline}
                </p>
                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  {currentHero.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed pt-1">
                  {currentHero.description}
                </p>
              </div>

              {/* 4 Commercial Retail Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs font-medium text-slate-700 hover:bg-slate-100/60 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-semibold">Giao hỏa tốc 2h miễn phí</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs font-medium text-slate-700 hover:bg-slate-100/60 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-semibold">Bảo hành 12T chính hãng toàn quốc</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs font-medium text-slate-700 hover:bg-slate-100/60 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-semibold">1 đổi 1 30 ngày nếu lỗi NSX</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs font-medium text-slate-700 hover:bg-slate-100/60 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-600 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-semibold">Thu cũ trợ giá đến 2.000.000₫</span>
                </div>
              </div>

              {/* Price & Installment Group */}
              <div className="pt-2 flex flex-wrap items-baseline gap-3 sm:gap-4 border-t border-slate-100">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                  {formatPrice(currentHero.price)}
                </div>
                <div className="text-sm sm:text-base text-slate-400 line-through font-mono tabular-nums">
                  {formatPrice(currentHero.comparePrice)}
                </div>
                {currentHero.comparePrice > currentHero.price && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200/80 text-rose-600 text-xs font-bold font-mono">
                    -{Math.round(((currentHero.comparePrice - currentHero.price) / currentHero.comparePrice) * 100)}%
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>Trả góp 0% chỉ {currentHero.monthlyPay}</span>
                </span>
              </div>

              {/* Action Buttons & Real-time Urgency */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`/products/${currentHero.id}`}
                    className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-blue-500/25 transition cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Mua ngay</span>
                  </Link>

                  <Link
                    to={`/products/${currentHero.id}`}
                    className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm sm:text-base flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <span>Xem cấu hình chi tiết</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 pt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>{currentHero.stockStatus}</span>
                </div>
              </div>

              {/* Showcase Switcher Indicators */}
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

            {/* Right Product Showcase (5 Cols) */}
            <div className="lg:col-span-5 flex items-center justify-center p-4">
              <Link to={`/products/${currentHero.id}`} className="group relative block w-full max-w-sm">
                <div className="relative aspect-square w-full flex items-center justify-center p-4">
                  <img
                    src={currentHero.image}
                    alt={currentHero.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. UNIFIED CATEGORY & BRAND FILTER SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                Danh Mục Smartphone Chính Hãng
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {products.length} sản phẩm phân phối chính hãng • Đầy đủ hoá đơn VAT & kiểm định IMEI
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">
              Hiển thị {filteredProducts.length} sản phẩm
            </span>
          </div>

          {/* Integrated Segmented Brand Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => setSelectedBrand('all')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedBrand === 'all'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              Tất cả ({products.length})
            </button>

            {brands.map((b) => {
              const count = products.filter(
                (p) =>
                  p.brand?.name.toLowerCase().includes(b.name.toLowerCase()) ||
                  p.brand?.slug.toLowerCase().includes(b.slug.toLowerCase()) ||
                  p.brandId?.toLowerCase() === b.id.toLowerCase()
              ).length;

              const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();

              return (
                <button
                  key={b.id || b.slug}
                  type="button"
                  onClick={() => setSelectedBrand(b.name)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{b.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4-column balanced grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 h-80 animate-pulse flex flex-col justify-between"
              >
                <div className="w-full aspect-square bg-slate-100 rounded-xl mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                  <div className="h-5 bg-slate-200 rounded-md w-2/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
