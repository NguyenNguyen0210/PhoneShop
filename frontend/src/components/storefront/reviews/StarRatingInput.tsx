import React, { useState } from 'react';
import { Star } from 'lucide-react';

export interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời',
};

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const activeRating = hoverRating ?? value;

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(5, (value || star) + 1);
      onChange(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = Math.max(1, (value || star) - 1);
      onChange(prev);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div
        className="flex items-center gap-1.5"
        role="radiogroup"
        aria-label="Đánh giá sao"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => !disabled && setHoverRating(null)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            className={`p-1 rounded-lg transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400 ${
              disabled
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:scale-110 active:scale-95'
            }`}
            aria-label={`${star} sao - ${RATING_LABELS[star]}`}
            role="radio"
            aria-checked={value === star}
            tabIndex={disabled ? -1 : value === star || (!value && star === 1) ? 0 : -1}
          >
            <Star
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                star <= activeRating
                  ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                  : 'text-slate-200'
              }`}
            />
          </button>
        ))}
      </div>
      {activeRating > 0 && (
        <span className="text-sm font-semibold text-amber-600 sm:ml-2 animate-fadeIn">
          {RATING_LABELS[activeRating]}
        </span>
      )}
    </div>
  );
};

export default StarRatingInput;
