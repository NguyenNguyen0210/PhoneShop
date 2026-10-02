import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  CheckCircle,
  Lock,
  Clock,
  Layers,
  ShoppingCart,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { mockProducts, mockBrands } from '../../../data/mockProducts';
import { productService } from '../../../services/productService';
import type { Product } from '../../../types';
import { useCartStore } from '../../../stores/useCartStore';

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const { addItem } = useCartStore();

  // 15-Minute Reservation Lock visual countdown
  const [lockTimer, setLockTimer] = useState({ minutes: 14, seconds: 59 });

  useEffect(() => {
    // Attempt to load from API, fallback to mockProducts
    productService
      .getProducts()
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setProducts(res.items);
        }
      })
      .catch(() => {
        // Keep mock products
      });

    // 15-minute countdown simulation
    const interval = setInterval(() => {
      setLockTimer((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return { minutes: 14, seconds: 59 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const spotlights = [
    {
      id: 'prod-iphone-15-pro-max',
      title: 'iPhone 16 Pro Max',
      badge: 'Titan Hàng Không Vũ Trụ',
      tagline: 'Kiến trúc Chip A18 Pro 3nm đột phá hiệu năng. Chuẩn định danh 1 Khách hàng - 1 IMEI độc bản.',
      price: '34.990.000₫',
      comparePrice: '39.990.000₫',
      specs: ['A18 Pro 3nm', 'OLED 120Hz ProMotion', 'Camera 5x Prism', 'Titan Grade 5'],
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80',
      link: '/products/prod-iphone-15-pro-max',
    },
    {
      id: 'prod-samsung-s24-ultra',
      title: 'Galaxy S24 Ultra 5G',
      badge: 'Galaxy AI Quyền Năng',
      tagline: 'Màn hình Dynamic AMOLED 2X chống lóa 2600 nits, camera 200MP Quad Tele và bút S-Pen tích hợp.',
      price: '27.990.000₫',
      comparePrice: '31.990.000₫',
      specs: ['Snapdragon 8 Gen 3', 'Màn hình 2600 nits', 'Camera 200MP', 'Khung Titanium'],
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1200&q=80',
      link: '/products/prod-samsung-s24-ultra',
    },
  ];

  const currentSpotlight = spotlights[spotlightIndex];

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
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
            p.brand?.name.toLowerCase() === selectedBrand.toLowerCase() ||
            p.brandId?.toLowerCase().includes(selectedBrand.toLowerCase())
        );

  return (
    <div className="space-y-12 pb-20 text-slate-100">
      {/* SECTION 1: HERO BENTO GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Large 2-column Flagship Spotlight */}
          <div className="lg:col-span-2 lg:row-span-2 rounded-3xl bg-gradient-to-br from-[#0e1526] via-[#111d35] to-[#07090e] border border-white/10 hover:border-indigo-500/40 transition-all duration-500 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group shadow-2xl">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              {/* Badges & Switcher */}
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-xs font-semibold text-slate-200 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentSpotlight.badge}</span>
                </div>

                {/* Flagship Toggle Switch */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  {spotlights.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => setSpotlightIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        spotlightIndex === idx
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {idx === 0 ? 'iPhone 16 Pro' : 'S24 Ultra'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Tagline */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  {currentSpotlight.title}
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-lg leading-relaxed">
                  {currentSpotlight.tagline}
                </p>
              </div>

              {/* Hardware Spec Tags */}
              <div className="flex flex-wrap gap-2 pt-1">
                {currentSpotlight.specs.map((spec) => (
                  <span
                    key={spec}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono text-[11px] font-medium"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Product Hero Image */}
            <div className="relative z-10 my-6 flex items-center justify-center">
              <div className="relative w-full max-w-md aspect-16/10 rounded-2xl overflow-hidden bg-black/20 border border-white/5 flex items-center justify-center p-4">
                <img
                  src={currentSpotlight.image}
                  alt={currentSpotlight.title}
                  className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Chính hãng 100% • Sẵn sàng khóa IMEI</span>
                </div>
              </div>
            </div>

            {/* Pricing & CTA */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Giá Mở Bán Trực Tuyến
                </div>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="text-[#38bdf8] font-black text-2xl sm:text-3xl tabular-nums">
                    {currentSpotlight.price}
                  </span>
                  <span className="text-slate-500 line-through text-xs sm:text-sm tabular-nums">
                    {currentSpotlight.comparePrice}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={currentSpotlight.link}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.35)] transition cursor-pointer"
                >
                  <span>Khóa giữ máy ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Live IMEI Radar */}
          <div className="rounded-3xl bg-[#0e1526] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 p-6 flex flex-col justify-between group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10b981]" />
                  </span>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                    Live IMEI Radar
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  ONLINE
                </span>
              </div>

              <div className="mt-2 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tabular-nums tracking-tight">
                    1.428
                  </span>
                  <span className="text-xs text-slate-400 font-medium">máy trong kho</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Mỗi thiết bị sở hữu mã IMEI 15 chữ số riêng biệt đạt chuẩn quốc tế Luhn Checksum.
                  Cam kết xuất kho nguyên seal, minh bạch nguồn gốc 100%.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Kho TP. Hồ Chí Minh</span>
                <span className="text-emerald-400 font-bold">746 sẵn sàng</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[65%]" />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span>Kho Hà Nội</span>
                <span className="text-emerald-400 font-bold">682 sẵn sàng</span>
              </div>
            </div>
          </div>

          {/* Card 3: 15-Minute Reservation Lock */}
          <div className="rounded-3xl bg-[#0e1526] border border-white/10 hover:border-amber-500/40 transition-all duration-300 p-6 flex flex-col justify-between group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                    Khóa Giữ Máy 15 Phút
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30">
                  ATOMIC LOCK
                </span>
              </div>

              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span className="font-mono text-2xl font-black text-amber-400 tabular-nums">
                    {String(lockTimer.minutes).padStart(2, '0')}:
                    {String(lockTimer.seconds).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Thuật toán <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded text-[11px]">FOR UPDATE SKIP LOCKED</code> cô
                  lập bản ghi IMEI độc quyền khi bạn checkout, loại bỏ hoàn toàn tình trạng bán trùng máy.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                <Zap className="w-3.5 h-3.5 fill-amber-300" />
                <span>Tự động hoàn kho sau 15:00</span>
              </span>
              <span className="text-slate-500 font-mono">BullMQ Active</span>
            </div>
          </div>

          {/* Card 4: Electronic Warranty Card */}
          <div className="rounded-3xl bg-[#0e1526] border border-white/10 hover:border-sky-500/40 transition-all duration-300 p-6 flex flex-col justify-between group shadow-xl md:col-span-2 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span className="text-xs uppercase font-extrabold tracking-wider text-sky-400">
                    Bảo Hành Điện Tử
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/60 text-sky-400 border border-sky-500/30 font-bold ml-2">
                    Chính hãng 100%
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Tra cứu bảo hành thiết bị theo IMEI & Serial
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">
                  Kiểm tra tức thì ngày kích hoạt, thời hạn 12 tháng chính hãng của Apple, Samsung,
                  Xiaomi và lịch sử bảo hành phần cứng.
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  to="/warranty-lookup"
                  className="px-5 py-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <span>Tra cứu bảo hành ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chuẩn mã WRT-XXXXXXXX</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cập nhật realtime qua webhook</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: METALLIC BRAND DOCK CAROUSEL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0e1526]/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <span>Thương Hiệu Ủy Quyền:</span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedBrand('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                selectedBrand === 'all'
                  ? 'bg-sky-950/60 border-sky-400 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                  : 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
              }`}
            >
              Tất cả ({products.length})
            </button>

            {mockBrands.map((b) => {
              const brandCount = products.filter(
                (p) =>
                  p.brand?.name.toLowerCase() === b.name.toLowerCase() ||
                  p.brandId?.toLowerCase() === b.id.toLowerCase()
              ).length;
              const isActive = selectedBrand.toLowerCase() === b.name.toLowerCase();

              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrand(b.name)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
                    isActive
                      ? 'bg-sky-950/60 border-sky-400 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span>{b.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({brandCount})</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: OBSIDIAN PRODUCT CATALOG GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                DANH MỤC THIẾT BỊ CHÍNH HÃNG
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Khám phá các smartphone cao cấp với mã định danh IMEI thực, hỗ trợ khóa giữ máy 15 phút.
            </p>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Hiển thị <span className="text-sky-400 font-bold">{filteredProducts.length}</span> thiết bị
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map((product) => {
            const primaryVariant = product.variants?.[0];
            const price = primaryVariant?.price || 0;
            const compareAtPrice = primaryVariant?.compareAtPrice;
            const discountPercent =
              compareAtPrice && compareAtPrice > price
                ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
                : null;

            // Extract key specs for badges
            const chipsetSpec = product.specs?.['Chipset'] || 'Silicon Chip';
            const displaySpec = product.specs?.['Màn hình']?.split(',')?.[0] || 'OLED 120Hz';
            const shortChip = chipsetSpec.split('(')?.[0]?.trim() || chipsetSpec;

            const isJustAdded = addedProductId === product.id;

            return (
              <div
                key={product.id}
                className="bg-[#0e1526] border border-white/10 hover:border-indigo-500/40 transition-all duration-300 rounded-2xl p-4 flex flex-col justify-between group relative overflow-hidden shadow-lg hover:shadow-indigo-500/10"
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                      {product.brand?.name || 'Chính hãng 100%'}
                    </span>
                    {discountPercent && (
                      <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>

                  {/* Product Image */}
                  <Link
                    to={`/products/${product.id}`}
                    className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#07090e]/60 flex items-center justify-center p-4 my-2 block"
                  >
                    <img
                      src={
                        product.thumbnail ||
                        primaryVariant?.images?.[0] ||
                        'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </Link>

                  {/* Hardware Spec Badges */}
                  <div className="flex flex-wrap gap-1.5 my-2.5">
                    <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[130px]">
                      {shortChip}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[110px]">
                      {displaySpec.length > 15 ? displaySpec.substring(0, 15) + '...' : displaySpec}
                    </span>
                  </div>

                  {/* Title */}
                  <Link to={`/products/${product.id}`}>
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Live IMEI Radar Status */}
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Kho: {primaryVariant?.inventoryQty ?? 12} IMEI sẵn sàng</span>
                  </div>
                </div>

                {/* Price & Action Button */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <span className="text-[#38bdf8] font-black text-lg tabular-nums">
                      {formatPrice(price)}
                    </span>
                    {compareAtPrice && compareAtPrice > price && (
                      <span className="text-slate-500 line-through text-xs tabular-nums">
                        {formatPrice(compareAtPrice)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/products/${product.id}`}
                      className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold text-center transition"
                    >
                      Chi tiết
                    </Link>
                    <button
                      onClick={(e) => handleQuickAdd(e, product)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
                        isJustAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã thêm</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Thêm vào giỏ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: HARDWARE COMMITMENT & ATOMIC LOCK BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#0e1526] border border-white/10 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center shadow-xl">
          <div className="lg:col-span-2 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Kiến Trúc Concurrency Chống Bán Trùng</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              1 Khách Hàng - 1 Bản Ghi IMEI Duy Nhất
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Hệ thống MobileCommerce tích hợp trực tiếp với cơ chế khóa hàng tự động của Redis
              BullMQ. Khi bạn tiến hành thanh toán, thiết bị được giữ chỗ trong 15 phút với mã IMEI
              xác thực, bảo đảm trải nghiệm mua sắm minh bạch tuyệt đối.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Không bán trùng IMEI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Bảo hành theo serial điện tử</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Chính hãng 100% nguyên seal</span>
              </div>
            </div>
          </div>

          <div className="bg-[#07090e] rounded-2xl p-5 border border-white/10 text-center space-y-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Tra Cứu Máy Của Bạn
            </span>
            <p className="text-xs text-slate-300">
              Kiểm tra tình trạng kích hoạt, thời hạn và nguồn gốc xuất xứ qua mã IMEI
            </p>
            <Link
              to="/warranty-lookup"
              className="inline-block w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
            >
              Tra cứu bảo hành theo IMEI
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
