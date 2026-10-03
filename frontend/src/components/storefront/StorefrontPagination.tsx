import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface StorefrontPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  totalItems?: number;
  itemLabel?: string;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const getPaginationWindow = (currentPage: number, totalPages: number): (number | string)[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

export const StorefrontPagination: React.FC<StorefrontPaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  totalItems,
  itemLabel = 'sản phẩm',
  pageSize,
  onPageChange,
  className = '',
}) => {
  const count = totalCount ?? totalItems ?? 0;

  if (totalPages <= 1) {
    if (count === 0) return null;
    return (
      <div
        className={`bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs sm:text-sm text-slate-500 ${className}`}
      >
        <span>
          Hiển thị <span className="font-bold text-slate-900">{count}</span> trên tổng số{' '}
          <span className="font-bold text-slate-900">{count}</span> {itemLabel}
        </span>
      </div>
    );
  }

  const from = count === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, count);
  const pages = getPaginationWindow(currentPage, totalPages);

  return (
    <div
      className={`bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      {/* Item Summary */}
      <div className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
        Hiển thị <span className="font-bold text-slate-900">{from} - {to}</span> trên tổng số{' '}
        <span className="font-bold text-slate-900">{count}</span> {itemLabel}
      </div>

      {/* Pagination Controls */}
      <nav aria-label={`Phân trang ${itemLabel}`} className="flex items-center gap-1.5 sm:gap-2">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Trang trước"
          className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1 transition-all border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Numbered Page Buttons & Ellipses */}
        {pages.map((pageItem, idx) => {
          if (typeof pageItem === 'string') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 text-xs sm:text-sm select-none"
              >
                ...
              </span>
            );
          }

          const isActive = pageItem === currentPage;
          return (
            <button
              key={pageItem}
              type="button"
              onClick={() => onPageChange(pageItem)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Trang ${pageItem}`}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20 border-transparent'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {pageItem}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Trang kế tiếp"
          className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1 transition-all border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white cursor-pointer"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
};
