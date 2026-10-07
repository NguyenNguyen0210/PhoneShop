import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, useNavigationType, Link } from 'react-router-dom';
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
  PackageCheck,
  Award,
  Heart,
  ArrowLeft,
} from 'lucide-react';
import { message } from 'antd';
import { productService } from '../../../services/productService';
import { flashSaleService } from '../../../services/flashSaleService';
import type { Product, ProductVariant, FlashSaleCampaign } from '../../../types';
import { useCartStore } from '../../../stores/useCartStore';
import { useWishlistStore } from '../../../stores/useWishlistStore';
import { useCatalogStore } from '../../../stores/useCatalogStore';
import { resolveColorStyle } from '../../../utils/colorHelper';
import { resolveVariantBySpecs, getStoragesForColor } from '../../../utils/variantResolver';
import {
  getFlashQuotaLeft,
  getInventoryAvailable,
  getEffectiveFlashQuota,
  isFlashSaleActiveForVariant,
} from '../../../utils/flashSaleAvailability';
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
  const [searchParams] = useSearchParams();
  const queryVariantId = searchParams.get('variantId') || searchParams.get('variant');
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const { addItem, buyNow } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);
  const [activeFlashSale, setActiveFlashSale] = useState<FlashSaleCampaign | null>(
    () => useCatalogStore.getState().activeFlashSale
  );
  const [flashTimeLeft, setFlashTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const hasAutoSelectedVariantRef = useRef(false);
  const activeFlashSaleRef = useRef<FlashSaleCampaign | null>(activeFlashSale);

  useEffect(() => {
    activeFlashSaleRef.current = activeFlashSale;
  }, [activeFlashSale]);

  useEffect(() => {
    hasAutoSelectedVariantRef.current = false;
  }, [id]);

  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product?.id || ''));
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);

  // Variant đang flash sale còn suất VÀ còn tồn kho — ưu tiên giữ deal khi lựa chọn
  // cấu hình mơ hồ (2 variant cùng màu+dung lượng nhưng khác RAM, UI không phân biệt được)
  const flashVariantIds = (() => {
    const now = Date.now();
    const ongoing =
      !!activeFlashSale &&
      (!activeFlashSale.startAt || new Date(activeFlashSale.startAt).getTime() <= now) &&
      (!activeFlashSale.endAt || new Date(activeFlashSale.endAt).getTime() > now);
    if (!ongoing) return new Set<string>();
    const inventoryByVariant = new Map(
      (product?.variants || []).map((v) => [
        String(v.id),
        Number(v.inventory?.availableQty ?? (v.inventory as any)?.quantity ?? 0),
      ])
    );
    return new Set(
      (activeFlashSale!.items || [])
        .filter((fi) => {
          if (getFlashQuotaLeft(fi) <= 0) return false;
          // Khi đã có product: loại variant hết hàng khỏi ưu tiên flash
          if (product && inventoryByVariant.has(String(fi.variantId))) {
            return (inventoryByVariant.get(String(fi.variantId)) || 0) > 0;
          }
          return true;
        })
        .map((fi) => String(fi.variantId))
    );
  })();

  useEffect(() => {
    // Fetch active flash sale campaign
    flashSaleService
      .getActiveCampaign()
      .then((campaign) => {
        if (campaign) {
          setActiveFlashSale(campaign);
        }
      })
      .catch((err) => {
        console.warn('Failed to load active flash sale in PDP:', err);
      });
  }, []);

  // Flash Sale countdown timer
  useEffect(() => {
    if (!activeFlashSale?.endAt) return;

    const updateTimer = () => {
      const diff = new Date(activeFlashSale.endAt).getTime() - Date.now();
      if (diff <= 0) {
        setFlashTimeLeft(null);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setFlashTimeLeft({ days, hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeFlashSale?.endAt]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    productService
      .getProductById(id)
      .then((data) => {
        if (data && data.variants && data.variants.length > 0) {
          setProduct(data);

          // 1. If variantId is specified in URL query params:
          let targetVariant: ProductVariant | undefined;
          if (queryVariantId) {
            targetVariant = data.variants.find(
              (v) => v.id === queryVariantId || v.sku === queryVariantId
            );
            if (targetVariant) {
              hasAutoSelectedVariantRef.current = true;
            }
          }

          // 2. If no variant specified in URL, check if any variant is in active flash sale:
          if (!targetVariant && activeFlashSaleRef.current?.items) {
            targetVariant = data.variants.find((v) =>
              activeFlashSaleRef.current!.items.some(
                (fi) =>
                  fi.variantId === v.id &&
                  getFlashQuotaLeft(fi) > 0 &&
                  getInventoryAvailable(v) > 0
              )
            );
            if (targetVariant) {
              hasAutoSelectedVariantRef.current = true;
            }
          }

          const chosen = targetVariant || data.variants[0];
          setSelectedVariant(chosen);
          setActiveImage(chosen.images?.[0] || data.images?.[0] || data.thumbnail || '');
        }
      })
      .catch((err) => {
        console.error('Failed to fetch product from database API:', err);
      })
      .finally(() => setLoading(false));
  }, [id, queryVariantId]);

  // Auto-select flash sale variant once if product has one and no specific variant was requested via URL
  useEffect(() => {
    if (!product || !activeFlashSale?.items || queryVariantId || hasAutoSelectedVariantRef.current) return;

    const flashVariant = product.variants.find((v) =>
      activeFlashSale.items.some(
        (fi) =>
          fi.variantId === v.id && getFlashQuotaLeft(fi) > 0 && getInventoryAvailable(v) > 0
      )
    );
    if (flashVariant) {
      hasAutoSelectedVariantRef.current = true;
      setSelectedVariant(flashVariant);
      if (flashVariant.images?.[0]) {
        setActiveImage(flashVariant.images[0]);
      }
    }
  }, [activeFlashSale, product, queryVariantId]);

  // Ensure scroll is at the top when entering product details or changing product id (PUSH only)
  useEffect(() => {
    if (navigationType !== 'POP' && !location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [id, location.hash, navigationType]);

  // Re-verify scroll is at the top once product details finish loading and replace skeleton/spinner (PUSH only)
  useEffect(() => {
    if (navigationType !== 'POP' && product && !location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [product, location.hash, navigationType]);

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
            to="/"
            className="inline-block mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Quay lại danh mục sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  // Extract unique colors and storages tồn tại của màu đang chọn (selector phụ thuộc:
  // màu nào chỉ hiện bản đó — không cho bấm bản không tồn tại rồi nhảy sang màu khác)
  const availableColors = Array.from(new Set(product.variants.map((v) => v.color)));
  const availableStorages = getStoragesForColor(product.variants, selectedVariant.color);

  const handleColorChange = (color: string) => {
    const ram = selectedVariant.ram || '';
    const matched = resolveVariantBySpecs(
      product.variants,
      [
        { color, storage: selectedVariant.storage, ram },
        { color, storage: selectedVariant.storage },
        { color },
      ],
      flashVariantIds
    );
    if (matched) {
      setSelectedVariant(matched);
      if (matched.images?.[0]) {
        setActiveImage(matched.images[0]);
      }
    }
  };

  const handleStorageChange = (storage: string) => {
    const ram = selectedVariant.ram || '';
    const matched = resolveVariantBySpecs(
      product.variants,
      [
        { storage, color: selectedVariant.color, ram },
        { storage, color: selectedVariant.color },
        { storage },
      ],
      flashVariantIds
    );
    if (matched) {
      setSelectedVariant(matched);
    }
  };

  const formatPrice = (val: number | string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  // Flash sale matching item & active status
  // NGUỒN SỰ THẬT DUY NHẤT: tồn kho thật (inventory) chặn flash sale.
  // Hết hàng (availableQty=0) thì không còn flash dù quota còn.
  const inventoryAvailable = getInventoryAvailable(selectedVariant);

  const isCampaignOngoing =
    activeFlashSale &&
    (!activeFlashSale.startAt || new Date(activeFlashSale.startAt).getTime() <= Date.now()) &&
    (!activeFlashSale.endAt || new Date(activeFlashSale.endAt).getTime() > Date.now());

  const matchingFlashItem = activeFlashSale?.items?.find(
    (item) => item.variantId === selectedVariant.id
  );
  const flashQuotaLeft = matchingFlashItem ? getFlashQuotaLeft(matchingFlashItem) : 0;
  const effectiveFlashQuotaLeft = getEffectiveFlashQuota(flashQuotaLeft, inventoryAvailable);
  const isOutOfStock = inventoryAvailable <= 0;
  const isFlashSaleActive = isFlashSaleActiveForVariant({
    campaignOngoing: !!isCampaignOngoing,
    hasMatchingItem: !!matchingFlashItem,
    flashQuotaLeft,
    inventoryAvailable,
  });

  // Đếm ngược trung thực: quá 24h thì hiện số NGÀY thay vì dồn giờ (tránh "86:11:31").
  // Muốn FOMO mạnh (<12h) thì admin đặt endAt trong ngày thay vì campaign nhiều ngày.
  const flashCountdownFormatted = (() => {
    if (!flashTimeLeft) return '00:00:00';
    const hh = String(flashTimeLeft.hours).padStart(2, '0');
    const mm = String(flashTimeLeft.minutes).padStart(2, '0');
    const ss = String(flashTimeLeft.seconds).padStart(2, '0');
    if (flashTimeLeft.days > 0) {
      return `${String(flashTimeLeft.days).padStart(2, '0')} NGÀY ${hh}:${mm}:${ss}`;
    }
    return `${hh}:${mm}:${ss}`;
  })();

  const currentPrice = isFlashSaleActive
    ? Number(matchingFlashItem.flashPrice)
    : Number(selectedVariant.price);

  const originalPrice = isFlashSaleActive
    ? Number(selectedVariant.price)
    : Number(selectedVariant.compareAtPrice || 0);

  const handleAddToCart = () => {
    if (isOutOfStock) {
      message.warning('Sản phẩm tạm hết hàng, vui lòng chọn phiên bản khác!');
      return;
    }
    addItem(
      product,
      selectedVariant,
      1,
      isFlashSaleActive ? Number(matchingFlashItem.flashPrice) : undefined,
      isFlashSaleActive
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!product || !selectedVariant) return;
    if (isOutOfStock) {
      message.warning('Sản phẩm tạm hết hàng, vui lòng chọn phiên bản khác!');
      return;
    }
    buyNow(
      product,
      selectedVariant,
      1,
      isFlashSaleActive ? Number(matchingFlashItem.flashPrice) : undefined,
      isFlashSaleActive
    );
    navigate('/checkout');
  };

  const handleBuyInstallment = (plan: { prepayPercent: number; termMonths: number }) => {
    if (!product || !selectedVariant) return;
    if (isOutOfStock) {
      message.warning('Sản phẩm tạm hết hàng, vui lòng chọn phiên bản khác!');
      return;
    }
    buyNow(
      product,
      selectedVariant,
      1,
      isFlashSaleActive ? Number(matchingFlashItem.flashPrice) : undefined,
      isFlashSaleActive
    );
    // Land on checkout with the INSTALLMENT tab preselected and the
    // calculator plan carried over — CheckoutPage consumes + clears this.
    try {
      sessionStorage.setItem(
        'phoneshop_checkout_pref',
        JSON.stringify({ paymentMethod: 'INSTALLMENT', installmentPlan: plan })
      );
    } catch {
      // Storage unavailable — checkout still works, defaults to VIETQR.
    }
    setIsInstallmentModalOpen(false);
    navigate('/checkout');
  };

  const handleToggleWishlist = async () => {
    const token = localStorage.getItem('phoneshop_access_token');
    if (!token) {
      message.warning('Vui lòng đăng nhập để lưu sản phẩm yêu thích!');
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!product) return;
    try {
      const isAdded = await toggleWishlist(product);
      message.success(isAdded ? 'Đã thêm vào danh sách yêu thích!' : 'Đã xóa khỏi danh sách yêu thích!');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể cập nhật danh sách yêu thích');
    }
  };

  const scrollToReviews = () => {
    const el = document.getElementById('reviews-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fallbackImg = FALLBACK_PRODUCT_IMAGE;

  // Gallery: gộp ảnh thật của biến thể đang chọn + ảnh chung sản phẩm (khử trùng).
  // Không tự "đẻ" ảnh góc máy — muốn 4+ thumbnail thì bổ sung images cho variant/product.
  const galleryViews = (() => {
    if (!product) return [];

    const seen = new Set<string>();
    const push = (url?: string | null) => {
      if (url && !seen.has(url)) seen.add(url);
    };
    (selectedVariant?.images || []).forEach(push);
    if (selectedVariant?.imageUrl) push(selectedVariant.imageUrl);
    (product.images || []).forEach(push);
    push(product.thumbnail || product.thumbnailUrl);

    const rawList = seen.size > 0 ? Array.from(seen) : [fallbackImg];

    const LABELS = ['Tổng thể', 'Mặt trước', 'Mặt lưng', 'Cạnh viền', 'Mở hộp'];
    return rawList.map((url, i) => ({
      url,
      label: LABELS[i] || `Góc nhìn ${i + 1}`,
    }));
  })();

  const discountPercent = isFlashSaleActive
    ? Math.round(
        ((Number(selectedVariant.price) - Number(matchingFlashItem.flashPrice)) / Number(selectedVariant.price)) *
          100
      )
    : selectedVariant.compareAtPrice &&
      Number(selectedVariant.compareAtPrice) > Number(selectedVariant.price)
    ? Math.round(
        ((Number(selectedVariant.compareAtPrice) - Number(selectedVariant.price)) /
          Number(selectedVariant.compareAtPrice)) *
          100
      )
    : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb Navigation & Back Action */}
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Điện thoại
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold truncate max-w-xs sm:max-w-md">
              {product.name}
            </span>
          </nav>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Quay lại danh sách sản phẩm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
        </div>

        {/* SECTION 1: HERO SECTION - GALLERY & COMMERCIAL PURCHASE AREA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left: Light Elevated Gallery Viewport (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className="bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center justify-center aspect-square overflow-hidden shadow-xs relative group"
              style={{ boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}
            >
              {/* Authentic Seal — duy nhất trên ảnh, badge % chỉ giữ cạnh giá */}
              <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold backdrop-blur-md shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chính hãng 100% • Nguyên Seal</span>
              </div>

              {/* Main Image */}
              <img
                src={activeImage || galleryViews[0]?.url || fallbackImg}
                alt={product.name}
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 z-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallbackImg;
                }}
              />
            </div>

            {/* Thumbnail Carousel with Labels */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {galleryViews.map((item, idx) => {
                const isSelected = activeImage === item.url || (!activeImage && idx === 0);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(item.url)}
                    className={`w-20 h-22 rounded-2xl border-2 p-1.5 bg-white shrink-0 overflow-hidden transition-all cursor-pointer flex flex-col items-center justify-between shadow-xs ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/20'
                        : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                    }`}
                    title={item.label}
                  >
                    <div className="w-full h-13 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.label}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = fallbackImg;
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-bold truncate max-w-full px-1 ${
                        isSelected ? 'text-blue-600' : 'text-slate-600'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* PhoneShop Commitment Banner - Trust Badges with Specialized Icons */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm pb-1 border-b border-slate-200/70">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Cam kết dịch vụ độc quyền tại PhoneShop:</span>
              </div>

              <div className="space-y-2.5 pt-0.5">
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <PackageCheck className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span className="leading-relaxed">
                    <strong>Máy mới 100% nguyên seal hộp</strong>, kiểm tra máy trước khi nhận hàng.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Clock className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span className="leading-relaxed">
                    <strong>Giữ máy 15 phút</strong> tại bước thanh toán – Yên tâm không lo mất suất.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Award className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span className="leading-relaxed">
                    <strong>Kích hoạt bảo hành điện tử chính hãng 12 tháng</strong> theo số IMEI.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-indigo-100/80 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span className="leading-relaxed">
                    <strong>1 đổi 1 trong 30 ngày</strong> nếu phát sinh bất kỳ lỗi phần cứng nào.
                  </span>
                </div>
              </div>
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

                {/* Position A: Wishlist badge */}
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer active:scale-95 ${
                    isInWishlist
                      ? 'border-rose-200 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-rose-300 hover:text-rose-600'
                  }`}
                  title={isInWishlist ? 'Đã lưu trong yêu thích' : 'Lưu vào yêu thích'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isInWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{isInWishlist ? 'Đã yêu thích' : 'Yêu thích'}</span>
                </button>
              </div>
            </div>

            {/* Flash Sale Urgency Banner if active for this variant */}
            {isFlashSaleActive && (
              <div className="rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-3 sm:p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-white/20 text-amber-300">
                    <Zap className="w-4 h-4 fill-amber-300" />
                  </span>
                  <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">
                    ⚡ FLASH SALE GIÁ SỐC - KẾT THÚC SAU [{flashCountdownFormatted}]
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold text-amber-200 bg-black/25 px-2.5 py-1 rounded-lg"
                    title={`Đã bán ${matchingFlashItem.soldCount}/${matchingFlashItem.stockLimit} suất • Kho còn ${inventoryAvailable} máy`}
                  >
                    🔥 Còn lại {effectiveFlashQuotaLeft} suất Flash Sale
                    {inventoryAvailable < flashQuotaLeft && <> (kho còn {inventoryAvailable} máy)</>}
                  </span>
                </div>
              </div>
            )}

            {/* Commercial Price Box - Modern Grouped Layout */}
            <div
              className={`rounded-2xl p-4 sm:p-5 shadow-xs transition-colors ${
                isFlashSaleActive
                  ? 'bg-rose-50/70 border-2 border-rose-300/80'
                  : 'bg-slate-50/80 border border-slate-200/90'
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-red-600 tabular-nums font-mono">
                  {formatPrice(currentPrice)}
                </span>
                {originalPrice && originalPrice > currentPrice && (
                  <span className="text-base sm:text-lg text-slate-400 line-through tabular-nums font-mono">
                    {formatPrice(originalPrice)}
                  </span>
                )}
                {discountPercent && (
                  <span className="text-xs font-black px-2.5 py-0.5 bg-red-600 text-white rounded-full shadow-2xs">
                    -{discountPercent}%
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <span>(Đã bao gồm VAT & Miễn phí vận chuyển toàn quốc)</span>
                {isFlashSaleActive && (
                  <span className="text-rose-600 font-bold text-[11px] font-mono">
                    Đã bán: {matchingFlashItem.soldCount}/{matchingFlashItem.stockLimit} suất
                  </span>
                )}
              </div>
            </div>

            {/* SELECTOR 1: Colors */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Chọn màu sắc:
                </label>
                <span className="text-xs font-bold text-slate-900">
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
                          ? 'border-blue-600 bg-blue-50/40 text-blue-950 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      {/* Swatch Dot with authentic finish & subtle border */}
                      <span
                        className="w-5 h-5 rounded-full border shadow-inner shrink-0"
                        style={resolveColorStyle(color, vMatch?.colorHex)}
                        title={color}
                      />
                      <span className="font-bold text-slate-900">{color}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] ml-0.5" />
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
                  // Dùng chung resolver với handleStorageChange để giá preview
                  // trên nút luôn bằng giá sau khi bấm
                  const v = resolveVariantBySpecs(
                    product.variants,
                    [
                      { storage, color: selectedVariant.color, ram: selectedVariant.ram || '' },
                      { storage, color: selectedVariant.color },
                      { storage },
                    ],
                    flashVariantIds
                  );

                  return (
                    <button
                      key={storage}
                      type="button"
                      onClick={() => handleStorageChange(storage)}
                      className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/30 text-slate-900 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold tracking-tight text-slate-900">
                          {storage} {v?.ram ? `• ${v.ram}` : ''}
                        </span>
                        <Cpu className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>

                      <div className="mt-1.5">
                        <div className="text-red-600">
                          {(() => {
                            if (!v) return 'Liên hệ';
                            const vStock = getInventoryAvailable(v);
                            const fi = activeFlashSale?.items?.find(
                              (item) => item.variantId === v.id && getFlashQuotaLeft(item) > 0
                            );
                            if (fi && isCampaignOngoing && vStock > 0) {
                              return (
                                <span className="flex flex-col gap-0.5">
                                  <span className="text-sm font-black leading-tight">{formatPrice(fi.flashPrice)}</span>
                                  <span className="text-[11px] text-slate-400 line-through font-normal leading-tight">{formatPrice(v.price)}</span>
                                </span>
                              );
                            }
                            return <span className="text-sm font-black leading-tight">{formatPrice(v.price)}</span>;
                          })()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Promotion Box (Khuyến mại đặc quyền) */}
            <ProductPromotionBox />

            {/* Action CTAs: Cart + MUA NGAY + TRẢ GÓP 0% (nút Lưu chỉ giữ cạnh tiêu đề) */}
            <div className="pt-2">
              <div className="flex items-stretch gap-2.5 sm:gap-3">
                {/* Cart Button (Outline Button, ~16-18% width) */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`w-16 sm:w-20 py-2.5 px-2 rounded-2xl border-2 flex flex-col items-center justify-center transition-all shrink-0 shadow-xs active:scale-[0.98] ${
                    isOutOfStock
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : justAdded
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 cursor-pointer'
                        : 'border-red-600 bg-white text-red-600 hover:bg-red-50/80 cursor-pointer'
                  }`}
                  title={isOutOfStock ? 'Tạm hết hàng' : 'Thêm vào giỏ hàng'}
                >
                  {justAdded && !isOutOfStock ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-600" />
                      <span className="text-[10px] font-bold mt-0.5">Đã thêm</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart
                        className={`w-5 h-5 ${isOutOfStock ? 'text-slate-400' : 'text-red-600'}`}
                      />
                      <span className="text-[10px] font-bold mt-0.5 leading-tight">
                        {isOutOfStock ? 'Hết hàng' : 'Thêm giỏ'}
                      </span>
                    </>
                  )}
                </button>

                {/* MUA NGAY (Red #E11D48 / red-600) */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`flex-1 p-3 rounded-2xl flex flex-col items-center justify-center shadow-md transition-all group active:scale-[0.99] ${
                    isOutOfStock
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 cursor-pointer'
                  }`}
                >
                  <span className="font-black text-sm sm:text-base leading-tight tracking-wide flex items-center gap-1.5">
                    <Zap className="w-4 h-4 fill-white" />
                    {isOutOfStock ? 'TẠM HẾT HÀNG' : 'MUA NGAY'}
                  </span>
                  <span
                    className={`text-[10.5px] sm:text-[11px] font-medium mt-0.5 line-clamp-1 ${
                      isOutOfStock ? 'text-slate-500' : 'text-red-100'
                    }`}
                  >
                    {isOutOfStock
                      ? 'Vui lòng chọn phiên bản khác'
                      : 'Giao tận nơi hoặc nhận tại cửa hàng'}
                  </span>
                </button>

                {/* TRẢ GÓP 0% (Blue #2563eb / blue-600) */}
                <button
                  type="button"
                  onClick={() => {
                    if (isOutOfStock) {
                      message.warning('Sản phẩm tạm hết hàng, vui lòng chọn phiên bản khác!');
                      return;
                    }
                    setIsInstallmentModalOpen(true);
                  }}
                  disabled={isOutOfStock}
                  className={`flex-1 p-3 rounded-2xl flex flex-col items-center justify-center shadow-md transition-all group active:scale-[0.99] ${
                    isOutOfStock
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 cursor-pointer'
                  }`}
                >
                  <span className="font-black text-sm sm:text-base leading-tight tracking-wide flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    TRẢ GÓP 0%
                  </span>
                  <span className="text-[10.5px] sm:text-[11px] text-blue-100 font-medium mt-0.5 line-clamp-1">
                    Duyệt nhanh qua CCCD / Thẻ tín dụng
                  </span>
                </button>
              </div>
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
                <div className="text-red-600 font-black text-base sm:text-lg tabular-nums font-mono">
                  {formatPrice(currentPrice)}
                </div>
                {originalPrice && originalPrice > currentPrice && (
                  <div className="text-slate-400 line-through text-xs tabular-nums font-mono">
                    {formatPrice(originalPrice)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  aria-label={isInWishlist ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                  className={`py-2 px-2.5 rounded-xl border-2 text-xs font-bold flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 ${
                    isInWishlist
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-white hover:border-rose-300 text-slate-500 hover:text-rose-600'
                  }`}
                  title={isInWishlist ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                >
                  <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`py-2 px-3 sm:px-3.5 rounded-xl border-2 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                    justAdded
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-red-600 bg-white hover:bg-red-50 text-red-600'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">{justAdded ? 'Đã thêm' : 'Thêm giỏ'}</span>
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
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer"
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
        price={currentPrice}
        onProceedCheckout={handleBuyInstallment}
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
