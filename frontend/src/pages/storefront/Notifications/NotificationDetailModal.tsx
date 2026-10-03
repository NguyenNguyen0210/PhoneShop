import React, { useEffect } from 'react';
import { X, Calendar, Bell, ExternalLink, Package, CreditCard, Sparkles, ShieldCheck, Truck, Info } from 'lucide-react';
import type { NotificationItem } from '../../../types';

export interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onActionClick?: (notification: NotificationItem) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
  onActionClick,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !notification) {
    return null;
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ORDER':
        return { label: 'Đơn hàng', className: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'PAYMENT':
        return { label: 'Thanh toán', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'PROMOTION':
        return { label: 'Khuyến mại', className: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'WARRANTY':
        return { label: 'Bảo hành', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'SHIPPING':
        return { label: 'Vận chuyển', className: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'RETURN':
        return { label: 'Trả hàng', className: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'SYSTEM':
        return { label: 'Hệ thống', className: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { label: type || 'Thông báo', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ORDER':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'PAYMENT':
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'PROMOTION':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'WARRANTY':
        return <ShieldCheck className="w-5 h-5 text-amber-600" />;
      case 'SHIPPING':
        return <Truck className="w-5 h-5 text-sky-600" />;
      case 'SYSTEM':
        return <Info className="w-5 h-5 text-slate-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const badge = getTypeBadge(notification.type);

  const formattedDate = (() => {
    try {
      const d = new Date(notification.createdAt);
      return isNaN(d.getTime()) ? notification.createdAt : d.toLocaleString('vi-VN');
    } catch {
      return notification.createdAt;
    }
  })();

  const dataEntries =
    notification.data && typeof notification.data === 'object'
      ? Object.entries(notification.data).filter(
          ([_, val]) => val !== null && val !== undefined && val !== ''
        )
      : [];

  const hasAction =
    onActionClick &&
    (notification.data?.orderId ||
      notification.type === 'WARRANTY' ||
      notification.data?.url ||
      notification.data?.code);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-modal-title"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Icon, Type Badge & Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
              {getTypeIcon(notification.type)}
            </div>
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}
              >
                {badge.label}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <h3
          id="notification-modal-title"
          className="text-lg font-bold text-slate-900 mt-4 leading-snug"
        >
          {notification.title}
        </h3>

        {/* Message body */}
        <div className="mt-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
          {notification.message}
        </div>

        {/* Metadata Details (orderId, code, etc.) */}
        {dataEntries.length > 0 && (
          <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
            <div className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
              Chi tiết liên quan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              {dataEntries.map(([key, value]) => {
                const label =
                  key === 'orderId'
                    ? 'Mã đơn hàng'
                    : key === 'code'
                    ? 'Mã tra cứu / voucher'
                    : key === 'amount'
                    ? 'Số tiền'
                    : key === 'trackingCode'
                    ? 'Mã vận đơn'
                    : key;

                const displayVal =
                  typeof value === 'object' ? JSON.stringify(value) : String(value);

                return (
                  <div
                    key={key}
                    className="flex flex-col bg-white p-2 rounded-lg border border-slate-100"
                  >
                    <span className="text-[11px] text-slate-400 font-medium">{label}</span>
                    <span className="font-semibold text-slate-800 break-all">{displayVal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Đóng
          </button>

          {hasAction && (
            <button
              type="button"
              onClick={() => onActionClick(notification)}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Xem chi tiết liên quan</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailModal;
