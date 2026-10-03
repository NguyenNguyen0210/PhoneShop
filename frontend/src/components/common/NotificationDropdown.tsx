import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Package,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Truck,
  Info,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import type { NotificationItem, NotificationType } from '../../types';
import {
  formatRelativeTime,
  getNotificationTargetRoute,
} from '../../utils/notificationUtils';

interface NotificationDropdownProps {
  defaultOpen?: boolean;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    unreadCount,
    previewList,
    isPreviewLoading,
    fetchPreviewList,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchPreviewList();
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    markAsRead(item.id);
    setIsOpen(false);
    navigate(getNotificationTargetRoute(item));
  };

  const renderIcon = (type: NotificationType | string) => {
    switch (type) {
      case 'ORDER':
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
        );
      case 'PAYMENT':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        );
      case 'PROMOTION':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case 'WARRANTY':
        return (
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        );
      case 'SHIPPING':
        return (
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
        );
      case 'SYSTEM':
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-blue-600 rounded-xl transition cursor-pointer shadow-2xs group"
        aria-label="Thông báo"
        title="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 group-hover:scale-105 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-75">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">Thông báo</h3>
              {unreadCount > 0 ? (
                <span className="bg-rose-50 text-rose-600 text-[11px] font-bold px-1.5 py-0.5 rounded-full border border-rose-100">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-500 text-[11px] font-medium px-1.5 py-0.5 rounded-full">
                  0
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-slate-300 disabled:cursor-not-allowed font-medium transition cursor-pointer disabled:pointer-events-none"
              title="Đánh dấu đã đọc tất cả"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Đánh dấu đã đọc tất cả</span>
            </button>
          </div>

          {/* Content List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {isPreviewLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="flex gap-3 p-2 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-full" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : previewList.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <Bell className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-xs font-medium text-slate-600">Bạn chưa có thông báo mới nào</p>
              </div>
            ) : (
              previewList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition hover:bg-slate-50 cursor-pointer ${
                    !item.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  {renderIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-xs text-slate-800 truncate">{item.title}</p>
                      {item.data?.link && (
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 inline" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.message}</p>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 mt-1 border-t border-slate-100">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/60 rounded-xl transition"
            >
              <span>Xem tất cả thông báo</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
