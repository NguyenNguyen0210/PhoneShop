import React from 'react';
import {
  Sparkles,
  Smartphone,
  Cpu,
  Camera,
  BatteryCharging,
  Star,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import type { Product } from '../../../types';

export interface ProductHighlightsSectionProps {
  product: Product;
  className?: string;
}

export const ProductHighlightsSection: React.FC<ProductHighlightsSectionProps> = ({
  product,
  className = '',
}) => {
  const specs = product.specs || {};

  const findSpec = (patterns: string[], fallback: string): string => {
    for (const [k, v] of Object.entries(specs)) {
      const lower = k.toLowerCase();
      if (patterns.some((p) => lower.includes(p.toLowerCase()))) {
        return v;
      }
    }
    return fallback;
  };

  const screenHighlight = findSpec(['màn hình', 'screen', 'display'], 'AMOLED sắc nét, 120Hz mượt mà');
  const chipHighlight = findSpec(['chip', 'vi xử lý', 'cpu', 'soc'], 'Vi xử lý tối ưu tác vụ mạnh mẽ');
  const cameraHighlight = findSpec(['camera sau', 'camera', 'máy ảnh'], 'Cụm camera độ phân giải cao chụp sắc nét');
  const batteryHighlight = findSpec(['pin', 'battery', 'sạc'], 'Pin dung lượng cao kèm sạc nhanh');

  const ratingValue = product.rating ? Number(product.rating).toFixed(1) : '5.0';
  const reviews = product.reviews || [];
  const reviewCount = product.reviewCount ?? reviews.length;

  return (
    <div className={`space-y-6 ${className}`.trim()}>
      {/* 1. Feature Highlights Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Đặc điểm nổi bật & Trải nghiệm thực tế
          </h2>
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="text-slate-600 text-sm leading-relaxed mb-6 space-y-2">
            <p className="whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {/* 4 Feature Cards (2x2 Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-200 transition">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs mb-1">
              <Smartphone className="w-4 h-4" />
              <span>Màn hình hiển thị đỉnh cao</span>
            </div>
            <p className="text-xs text-slate-800 font-medium font-mono line-clamp-2">{screenHighlight}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-200 transition">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs mb-1">
              <Cpu className="w-4 h-4" />
              <span>Hiệu năng mượt mà</span>
            </div>
            <p className="text-xs text-slate-800 font-medium font-mono line-clamp-2">{chipHighlight}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-200 transition">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs mb-1">
              <Camera className="w-4 h-4" />
              <span>Nhiếp ảnh chân thực</span>
            </div>
            <p className="text-xs text-slate-800 font-medium font-mono line-clamp-2">{cameraHighlight}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-200 transition">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs mb-1">
              <BatteryCharging className="w-4 h-4" />
              <span>Pin & Công nghệ sạc</span>
            </div>
            <p className="text-xs text-slate-800 font-medium font-mono line-clamp-2">{batteryHighlight}</p>
          </div>
        </div>
      </div>

      {/* 2. Customer Reviews Card */}
      <div id="reviews-section" className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Đánh giá từ khách hàng đã mua
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">{reviewCount} lượt đánh giá</span>
        </div>

        {/* Rating Overview Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-amber-200/60 mb-6">
          <div className="text-center sm:text-left flex items-baseline sm:flex-col gap-2 sm:gap-0">
            <div className="text-3xl sm:text-4xl font-black text-amber-500 font-mono">
              {ratingValue} <span className="text-lg font-semibold text-amber-400">/ 5</span>
            </div>
            <div className="flex text-amber-500 text-sm mt-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-amber-500 text-amber-500" />
              ))}
            </div>
          </div>
          <div className="sm:border-l sm:border-amber-200/80 sm:pl-5 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-900">100% đánh giá xác thực từ người dùng PhoneShop</p>
            <p className="text-slate-500">
              Mỗi đánh giá đều gắn liền với đơn hàng đã kích hoạt bảo hành điện tử chính hãng theo số IMEI.
            </p>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((rev: any) => {
              const reviewerName = rev.user
                ? `${rev.user.lastName || ''} ${rev.user.firstName || ''}`.trim()
                : 'Khách hàng PhoneShop';
              const ratingNum = rev.rating || 5;
              const replies = Array.isArray(rev.replies) ? rev.replies : [];

              return (
                <div key={rev.id} className="border-b border-slate-100 last:border-0 pb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{reviewerName}</span>
                      {rev.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200/80">
                          <CheckCircle2 className="w-3 h-3" />
                          Đã mua tại PhoneShop
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>

                  <div className="flex text-amber-500 text-xs">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i <= ratingNum ? 'fill-amber-500 text-amber-500' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  {rev.title && <p className="text-xs font-bold text-slate-800">{rev.title}</p>}
                  <p className="text-xs text-slate-600 leading-relaxed">{rev.content}</p>

                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="mt-2.5 pt-2 pl-3 sm:pl-4 space-y-2 border-l-2 border-blue-200 ml-1">
                      {replies.map((rep: any) => {
                        const replyerName = rep.user
                          ? `${rep.user.lastName || ''} ${rep.user.firstName || ''}`.trim()
                          : 'PhoneShop';
                        return (
                          <div
                            key={rep.id}
                            className="bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5 space-y-1"
                          >
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="font-bold text-slate-900">{replyerName}</span>
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                                Phản hồi từ PhoneShop
                              </span>
                              <span className="text-slate-400">
                                {rep.createdAt ? new Date(rep.createdAt).toLocaleDateString('vi-VN') : ''}
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
            <div className="text-center py-8 text-slate-400 text-xs">
              Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên trải nghiệm và để lại nhận xét!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductHighlightsSection;
