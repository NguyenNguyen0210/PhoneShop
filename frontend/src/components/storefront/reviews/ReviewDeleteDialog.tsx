import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { reviewService } from '../../../services/reviewService';
import { notifyError } from '../../../utils/notify';

export interface ReviewDeleteDialogProps {
  isOpen: boolean;
  reviewId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewDeleteDialogContent: React.FC<Omit<ReviewDeleteDialogProps, 'isOpen'>> = ({
  reviewId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

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

  const handleDelete = async () => {
    setLoading(true);
    try {
      await reviewService.deleteReview(reviewId);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      notifyError(err, 'Không thể xóa đánh giá. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-center space-y-1">
          <h3 id="delete-dialog-title" className="text-base font-bold text-slate-900">
            Xóa đánh giá của bạn?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hành động này không thể hoàn tác. Bạn sẽ có thể viết đánh giá mới cho sản phẩm này sau khi xóa.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const ReviewDeleteDialog: React.FC<ReviewDeleteDialogProps> = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <ReviewDeleteDialogContent key={props.reviewId} {...props} />;
};

export default ReviewDeleteDialog;
