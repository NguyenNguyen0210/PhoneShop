import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Edit3,
  Trash2,
  PlusCircle,
  X,
  Clock,
} from 'lucide-react';
import { isShopReply, type Product, type Review } from '../../../types';
import { reviewService, type MyReviewStatusResponse } from '../../../services/reviewService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { ReviewModal, ReviewDeleteDialog } from '../reviews';
import { apiClient } from '../../../services/apiClient';

export interface ProductHighlightsSectionProps {
  product: Product;
  className?: string;
}

function findSpec(
  specs: Record<string, string> | undefined,
  keys: string[],
  fallbackKeyPhrases: string[]
): string | undefined {
  if (!specs) return undefined;
  for (const k of keys) {
    if (specs[k]) return specs[k];
    const match = Object.keys(specs).find(
      (specKey) => specKey.trim().toLowerCase() === k.toLowerCase()
    );
    if (match && specs[match]) return specs[match];
  }
  for (const phrase of fallbackKeyPhrases) {
    const match = Object.keys(specs).find((specKey) =>
      specKey.toLowerCase().includes(phrase.toLowerCase())
    );
    if (match && specs[match]) return specs[match];
  }
  return undefined;
}

export const ProductHighlightsSection: React.FC<ProductHighlightsSectionProps> = ({
  product,
  className = '',
}) => {
  const specs = product.specs;

  // Dynamic values for 4 micro-cards
  const screenSpec =
    findSpec(
      specs,
      ['Màn hình', 'Công nghệ màn hình', 'Màn hình rộng', 'Kích thước màn hình'],
      ['màn hình', 'screen', 'display']
    ) || 'OLED / AMOLED 120Hz sắc nét';

  const cpuSpec =
    findSpec(
      specs,
      ['Vi xử lý', 'Chipset', 'CPU', 'Chip xử lý', 'Chip'],
      ['chipset', 'cpu', 'vi xử lý', 'chip']
    ) || 'Vi xử lý thế hệ mới, tối ưu AI';

  const cameraSpec =
    findSpec(
      specs,
      ['Camera sau', 'Camera chính', 'Hệ thống camera sau', 'Camera'],
      ['camera sau', 'camera', 'sau']
    ) || 'Cụm camera sắc nét, chống rung OIS';

  const batteryAndCharge = findSpec(
    specs,
    ['Pin & Công nghệ sạc', 'Pin & Sạc', 'Pin, Sạc'],
    ['pin &', 'pin và']
  );
  const battery = findSpec(specs, ['Pin', 'Dung lượng pin'], ['pin', 'dung lượng pin', 'battery']);
  const charging = findSpec(specs, ['Sạc', 'Công nghệ sạc'], ['sạc', 'charging']);
  const powerSpec =
    batteryAndCharge ||
    (battery && charging ? `${battery} (${charging})` : battery || charging) ||
    'Pin dung lượng cao, sạc siêu nhanh';

  const techHighlights = [
    {
      badgeEmoji: '📱',
      title: 'Màn hình',
      value: screenSpec,
    },
    {
      badgeEmoji: '⚡',
      title: 'Hiệu năng',
      value: cpuSpec,
    },
    {
      badgeEmoji: '📸',
      title: 'Camera',
      value: cameraSpec,
    },
    {
      badgeEmoji: '🔋',
      title: 'Pin & Sạc',
      value: powerSpec,
    },
  ];

  // Review State & Management
  const { user } = useAuthStore();
  const [reviewsList, setReviewsList] = useState<Review[]>(product.reviews || []);
  const [myReviewStatus, setMyReviewStatus] = useState<MyReviewStatusResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<Review | null>(null);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchReviewsAndStatus = async () => {
    try {
      if (user) {
        const status = await reviewService.getMyReviewStatus(product.id);
        setMyReviewStatus(status);
      } else {
        setMyReviewStatus(null);
      }
      const res = await apiClient.get<Review[]>('/reviews', { params: { productId: product.id } });
      if (Array.isArray(res.data)) {
        setReviewsList(res.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setReviewsList(product.reviews || []);
    if (product.id) {
      fetchReviewsAndStatus();
    }
  }, [product.id, user]);

  const myReview = myReviewStatus?.myReview;
  // If myReview is already approved, remove it from otherReviews to avoid duplicating it
  const otherReviews = reviewsList.filter((r) => r.id !== myReview?.id);
  const displayReviews = myReview ? [myReview, ...otherReviews] : reviewsList;

  // Ratings calculation
  const numericRating =
    displayReviews.length > 0
      ? displayReviews.reduce((acc, r) => acc + r.rating, 0) / displayReviews.length
      : product.rating != null
      ? Number(product.rating)
      : 5.0;

  const formattedRating = numericRating.toFixed(1);
  const totalReviews = displayReviews.length;

  return (
    <div className={`space-y-6 ${className}`.trim()}>
      {/* CARD 1: Đặc điểm nổi bật & Trải nghiệm thực tế */}
      <div
        className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-5"
        style={{ boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}
      >
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
          <span>Đặc điểm nổi bật & Trải nghiệm thực tế</span>
        </h2>

        {/* Product description with nice typography */}
        <div className="leading-relaxed text-slate-600 text-sm whitespace-pre-line space-y-2">
          {product.description ||
            'Sản phẩm chính hãng với thiết kế đột phá, cấu hình phần cứng đỉnh cao cùng chế độ hậu mãi chuẩn PhoneShop mang lại sự an tâm tuyệt đối cho người dùng.'}
        </div>

        {/* 4 Tech Highlight micro-cards (2x2 grid) */}
        <div className="pt-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Thông số phần cứng cốt lõi
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {techHighlights.map((item) => (
              <div
                key={item.title}
                className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/60 flex items-center justify-center shrink-0 shadow-2xs text-base">
                  <span>{item.badgeEmoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900">{item.title}</div>
                  <div
                    className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-2"
                    title={item.value}
                  >
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CARD 2: Đánh giá từ khách hàng đã mua */}
      <div
        id="reviews-section"
        className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6"
        style={{ boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" aria-hidden="true" />
            <span>Đánh giá từ khách hàng đã mua</span>
          </h2>

          {/* Action trigger button */}
          {myReviewStatus?.canReview ? (
            <button
              type="button"
              onClick={() => {
                setModalInitialData(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Viết đánh giá</span>
            </button>
          ) : myReview ? (
            <button
              type="button"
              onClick={() => {
                setModalInitialData(myReview);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Xem / Sửa đánh giá của bạn</span>
            </button>
          ) : !user ? (
            <span className="text-[11px] text-slate-400">
              Đăng nhập để đánh giá sau khi mua hàng
            </span>
          ) : null}
        </div>

        {/* Score and summary badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-amber-500 font-black text-3xl tabular-nums">
                {formattedRating}
              </span>
              <span className="text-slate-400 font-bold text-sm"> / 5</span>
            </div>
            <div className="space-y-1">
              <div
                className="flex items-center gap-0.5 text-amber-400"
                aria-label={`Đánh giá ${formattedRating} sao`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(numericRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {totalReviews} khách hàng đã đánh giá
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 sm:text-right">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>100% đánh giá xác thực từ đơn hàng thành công</span>
          </div>
        </div>

        {/* Reviews List */}
        {displayReviews.length > 0 ? (
          <div className="space-y-5 divide-y divide-slate-100">
            {displayReviews.map((rev) => {
              const isCurrentUserReview = myReview?.id === rev.id;
              const reviewerName = isCurrentUserReview
                ? 'Đánh giá của bạn'
                : rev.user
                ? `${rev.user.lastName || ''} ${rev.user.firstName || ''}`.trim() ||
                  'Khách hàng PhoneShop'
                : 'Khách hàng PhoneShop';

              const reviewDate = rev.createdAt
                ? new Date(rev.createdAt).toLocaleDateString('vi-VN')
                : '';

              const replies = Array.isArray(rev.replies) ? rev.replies : [];

              return (
                <div
                  key={rev.id}
                  className={`pt-4 first:pt-0 space-y-2.5 rounded-2xl ${
                    isCurrentUserReview
                      ? 'p-4 bg-amber-50/30 border border-amber-200/60 shadow-2xs'
                      : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{reviewerName}</span>
                      {isCurrentUserReview && rev.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" aria-hidden="true" />
                          <span>Đang chờ quản trị viên duyệt</span>
                        </span>
                      )}
                      {rev.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                          <span>Đã mua tại PhoneShop</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {reviewDate && (
                        <span className="text-[11px] text-slate-400 font-mono">{reviewDate}</span>
                      )}
                      {isCurrentUserReview && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setModalInitialData(rev);
                              setIsModalOpen(true);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white transition-colors"
                            title="Chỉnh sửa đánh giá"
                            aria-label="Chỉnh sửa đánh giá"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteReviewId(rev.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-white transition-colors"
                            title="Xóa đánh giá"
                            aria-label="Xóa đánh giá"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Star rating */}
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Review Title & Content */}
                  {rev.title && (
                    <h4 className="text-xs font-bold text-slate-900">{rev.title}</h4>
                  )}
                  {rev.content && (
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {rev.content}
                    </p>
                  )}

                  {/* Review Images Gallery */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {rev.images.map((imgUrl, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => setLightboxImage(imgUrl)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-white hover:opacity-90 hover:ring-2 hover:ring-blue-500/50 transition-all focus:outline-none"
                          aria-label={`Xem ảnh đánh giá ${imgIdx + 1}`}
                        >
                          <img
                            src={imgUrl}
                            alt="Ảnh đính kèm từ khách hàng"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Replies from PhoneShop */}
                  {replies.length > 0 && (
                    <div className="pt-2 pl-3 sm:pl-4 space-y-2 border-l-2 border-blue-200 ml-1">
                      {replies.map((rep) => {
                        const isShop = isShopReply(rep) || !rep.user;
                        const replierName = rep.user
                          ? `${rep.user.lastName || ''} ${rep.user.firstName || ''}`.trim() ||
                            'PhoneShop CSKH'
                          : 'PhoneShop CSKH';

                        return (
                          <div
                            key={rep.id}
                            className="bg-slate-50 border border-slate-200/70 rounded-xl px-3.5 py-2.5 space-y-1"
                          >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                              <span className="font-bold text-slate-900">{replierName}</span>
                              {isShop && (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                                  Phản hồi từ PhoneShop
                                </span>
                              )}
                              {rep.createdAt && (
                                <span className="text-slate-400 text-[10px] ml-auto">
                                  {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{rep.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Friendly empty state message */
          <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-bold text-slate-700">
              Chưa có đánh giá nào cho sản phẩm này
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hãy là người đầu tiên sở hữu và chia sẻ trải nghiệm thực tế để giúp các khách hàng khác
              lựa chọn dễ dàng hơn!
            </p>
          </div>
        )}
      </div>

      {/* Review Modal for Create / Edit */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId={product.id}
        productName={product.name}
        productImage={product.thumbnail}
        initialData={modalInitialData}
        onSuccess={() => {
          fetchReviewsAndStatus();
        }}
      />

      {/* Review Delete Dialog */}
      <ReviewDeleteDialog
        isOpen={Boolean(deleteReviewId)}
        reviewId={deleteReviewId || ''}
        onClose={() => setDeleteReviewId(null)}
        onSuccess={() => {
          fetchReviewsAndStatus();
        }}
      />

      {/* Full Size Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-white/90 hover:bg-white text-slate-800 rounded-full shadow-lg transition-transform hover:scale-105"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Ảnh phóng to"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductHighlightsSection;
