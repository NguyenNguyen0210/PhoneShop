import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { mockProducts, mockBrands } from '../../../data/mockProducts';
import { productService } from '../../../services/productService';
import type { Product } from '../../../types';
import { ProductCard } from '../../../components/storefront/ProductCard';

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Flash sale countdown state: 04 hours, 32 minutes, 15 seconds
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 32, seconds: 15 });

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

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const heroBanners = [
    {
      id: 1,
      title: 'iPhone 15 Pro Max',
      tagline: 'Titan chuẩn hàng không vũ trụ. Chip A17 Pro siêu phân giải.',
      discount: 'Giảm ngay 5.000.000₫',
      buttonText: 'Sở hữu ngay',
      link: '/products/prod-iphone-15-pro-max',
      image:
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80',
      bgColor: 'from-slate-950 via-zinc-900 to-stone-900',
      accentColor: 'text-amber-400',
    },
    {
      id: 2,
      title: 'Galaxy S24 Ultra 5G',
      tagline: 'Mở ra kỷ nguyên quyền năng Galaxy AI. Camera mắt thần 200MP.',
      discount: 'Tặng Voucher 1.500.000₫ + Thu cũ đổi mới',
      buttonText: 'Khám phá Galaxy AI',
      link: '/products/prod-samsung-s24-ultra',
      image:
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1200&q=80',
      bgColor: 'from-slate-950 via-indigo-950 to-blue-950',
      accentColor: 'text-blue-400',
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroBanners.length) % heroBanners.length);
  };

  const banner = heroBanners[currentSlide];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Carousel Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 grid grid-cols-1 md:grid-cols-2 items-center gap-8 min-h-[480px] bg-gradient-to-r ${banner.bgColor} rounded-3xl my-4 transition-all duration-700`}
        >
          <div className="space-y-6 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Siêu phẩm công nghệ 2026</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {banner.title}
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-lg leading-relaxed">
              {banner.tagline}
            </p>

            <div className="flex items-center gap-3">
              <span className={`text-base font-bold ${banner.accentColor}`}>
                {banner.discount}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={banner.link}
                className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2 group"
              >
                <span>{banner.buttonText}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/products"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl backdrop-blur-md transition"
              >
                Xem tất cả
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-4/3 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src={banner.image}
                alt={banner.title}
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>

        {/* Carousel controls */}
        <button
          onClick={prevSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition hidden md:block"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition hidden md:block"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </section>

      {/* Brand logo strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="text-center mb-4">
            <span className="text-xs uppercase tracking-widest font-bold text-slate-400">
              Thương hiệu di động hàng đầu ủy quyền chính hãng
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-6 items-center">
            {mockBrands.map((b) => (
              <Link
                key={b.id}
                to={`/products?brand=${b.name}`}
                className="group flex flex-col items-center justify-center p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition"
              >
                <div className="h-9 flex items-center justify-center">
                  <span className="text-lg font-black text-slate-700 group-hover:text-blue-600 transition">
                    {b.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-600">
                  Phân phối chính hãng
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Flash Sale with Countdown Timer */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-red-500/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white text-red-600 rounded-2xl shadow-md animate-pulse">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">FLASH SALE ĐIỆN THOẠI</h2>
                  <span className="px-2 py-0.5 bg-yellow-300 text-yellow-950 font-black text-xs rounded-md uppercase">
                    HOT
                  </span>
                </div>
                <p className="text-red-100 text-xs sm:text-sm mt-0.5">
                  Số lượng máy IMEI có hạn - Giảm giá trực tiếp tới 5.000.000₫
                </p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20">
              <span className="text-xs font-semibold text-white/80">Kết thúc trong:</span>
              <div className="flex items-center gap-1 font-mono font-bold text-sm">
                <span className="bg-white text-red-600 px-2 py-1 rounded-md">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-white text-red-600 px-2 py-1 rounded-md">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-white text-red-600 px-2 py-1 rounded-md">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Flash sale products grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.slice(0, 3).map((product) => (
              <ProductCard key={`flash-${product.id}`} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Top Featured Phones Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ĐIỆN THOẠI NỔI BẬT NHẤT
              </h2>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Top các flagship bán chạy nhất với đầy đủ chứng nhận IMEI & kích hoạt bảo hành điện tử
            </p>
          </div>

          <Link
            to="/products"
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span>Xem tất cả thiết bị</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Concurrency & IMEI Commitment Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Hệ thống quản trị IMEI độc quyền</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Cam kết 1 Khách hàng - 1 Mã IMEI độc bản
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Mỗi chiếc điện thoại tại MobileCommerce được gán 1 mã IMEI 15 chữ số chuẩn Luhn quốc tế
              duy nhất. Khi bạn tiến hành thanh toán, hệ thống sẽ tự động khóa độc quyền máy trong 15
              phút để không ai có thể mua trùng thiết bị của bạn.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Không bán trùng máy</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Bảo hành theo serial máy</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hoàn tiền nếu phát hiện hàng nhái</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 text-center space-y-4">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              Tra cứu máy của bạn
            </span>
            <p className="text-xs text-slate-300">
              Kiểm tra tình trạng kích hoạt bảo hành, thời hạn và phụ kiện chính hãng
            </p>
            <Link
              to="/warranty-lookup"
              className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Tra cứu bảo hành theo IMEI
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
