import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { StarRatingInput } from './StarRatingInput';
import { ReviewImageUploader } from './ReviewImageUploader';
import { reviewService } from '../../../services/reviewService';
import type { Review } from '../../../types';

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productImage?: string;
  initialData?: Review | null;
  onSuccess: () => void;
}

const ReviewModalContent: React.FC<Omit<ReviewModalProps, 'isOpen'>> = ({
  onClose,
  productId,
  productName,
  productImage,
  initialData,
  onSuccess,
}) => {
  const isEditing = Boolean(initialData?.id);
  const [rating, setRating] = useState<number>(initialData?.rating || 5);
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Vui lòng chọn số sao đánh giá (1 đến 5 sao).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && initialData?.id) {
        await reviewService.updateReview(initialData.id, {
          rating,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          images,
        });
      } else {
        await reviewService.createReview({
          productId,
          rating,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          images,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj.response?.data?.message ||
          'Có lỗi xảy ra khi lưu đánh giá. Vui lòng thử lại sau.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 id="review-modal-title" className="text-base font-bold text-slate-900">
              {isEditing ? 'Chỉnh sửa đánh giá' : 'Đánh giá sản phẩm'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Product brief */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            {productImage ? (
              <img
                src={productImage}
                alt={productName}
                className="w-12 h-12 object-contain rounded-xl bg-white p-1 border border-slate-200/60 shrink-0"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 font-medium">Sản phẩm bạn đã mua:</p>
              <h4 className="text-sm font-bold text-slate-900 truncate">{productName}</h4>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Đánh giá chung <span className="text-red-500">*</span>
            </label>
            <StarRatingInput value={rating} onChange={setRating} disabled={loading} />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="review-title-input" className="block text-xs font-bold text-slate-700">
              Tiêu đề <span className="text-slate-400 font-normal">(không bắt buộc)</span>
            </label>
            <input
              id="review-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="Tóm tắt cảm nhận của bạn (VD: Rất đáng tiền, máy đẹp mượt mà...)"
              maxLength={255}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label htmlFor="review-content-textarea" className="block text-xs font-bold text-slate-700">
              Nội dung nhận xét <span className="text-slate-400 font-normal">(không bắt buộc)</span>
            </label>
            <textarea
              id="review-content-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              rows={4}
              maxLength={2000}
              placeholder="Chia sẻ thêm về chất lượng sản phẩm, thời lượng pin, camera, cảm giác sử dụng thực tế..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
            />
            <div className="text-right text-[11px] text-slate-400 font-mono">
              {content.length}/2000 ký tự
            </div>
          </div>

          {/* Image Uploader */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Ảnh thực tế đính kèm
            </label>
            <ReviewImageUploader
              images={images}
              onChange={setImages}
              disabled={loading}
              maxImages={5}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-100">
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? 'Lưu thay đổi' : 'Gửi đánh giá'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <ReviewModalContent key={props.initialData?.id || 'new'} {...props} />;
};

export default ReviewModal;
