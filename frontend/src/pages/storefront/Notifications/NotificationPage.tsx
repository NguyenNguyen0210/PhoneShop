import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  Package,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Truck,
  Info,
  Trash2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { StorefrontPagination } from '../../../components/storefront/StorefrontPagination';
import { NotificationDetailModal } from './NotificationDetailModal';
import type { NotificationItem, NotificationType } from '../../../types';

type CategoryTab = 'ALL' | 'ORDER' | 'PAYMENT' | 'PROMOTION' | 'WARRANTY' | 'SYSTEM';

interface TabItem {
  id: CategoryTab;
  label: string;
}

const CATEGORY_TABS: TabItem[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ORDER', label: 'Đơn hàng' },
  { id: 'PAYMENT', label: 'Thanh toán' },
  { id: 'PROMOTION', label: 'Khuyến mại' },
  { id: 'WARRANTY', label: 'Bảo hành' },
  { id: 'SYSTEM', label: 'Hệ thống' },
];

export const NotificationPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    items,
    pagination,
    activeFilter,
    isLoading,
    unreadCount,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<CategoryTab>('ALL');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load notifications based on current tab & unread filter
  const loadNotifications = useCallback(
    (tab: CategoryTab, unread: boolean, page: number = 1) => {
      fetchNotifications({
        page,
        limit: 20,
        type: tab === 'ALL' ? undefined : (tab as NotificationType),
        isRead: unread ? false : undefined,
      });
    },
    [fetchNotifications]
  );

  useEffect(() => {
    loadNotifications(activeTab, unreadOnly, 1);
    fetchUnreadCount();
  }, [activeTab, unreadOnly, loadNotifications, fetchUnreadCount]);

  const handleTabChange = (tabId: CategoryTab) => {
    setActiveTab(tabId);
  };

  const handleToggleUnreadOnly = () => {
    setUnreadOnly((prev) => !prev);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    try {
      setMarkingAll(true);
      await markAllAsRead();
    } catch {
      // Store captures error
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsRead(item.id).catch(() => {});
    }

    if (item.data?.orderId) {
      navigate(`/orders/${item.data.orderId}`);
      return;
    }

    if (item.type === 'WARRANTY') {
      navigate('/warranty-lookup');
      return;
    }

    // Default or SYSTEM notifications open detail modal
    setSelectedNotification(item);
    setIsModalOpen(true);
  };

  const handleModalActionClick = (notification: NotificationItem) => {
    setIsModalOpen(false);

    if (notification.data?.orderId) {
      navigate(`/orders/${notification.data.orderId}`);
      return;
    }

    if (notification.type === 'WARRANTY') {
      navigate('/warranty-lookup');
      return;
    }

    if (notification.data?.url) {
      navigate(notification.data.url);
      return;
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setDeletingId(id);
      await deleteNotification(id);
    } catch {
      // Store handles rollback and error
    } finally {
      setDeletingId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchNotifications({
      ...activeFilter,
      page: newPage,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getNotificationIcon = (type: string) => {
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

  const getIconContainerStyle = (type: string) => {
    switch (type) {
      case 'ORDER':
        return 'bg-blue-50 border-blue-100';
      case 'PAYMENT':
        return 'bg-emerald-50 border-emerald-100';
      case 'PROMOTION':
        return 'bg-purple-50 border-purple-100';
      case 'WARRANTY':
        return 'bg-amber-50 border-amber-100';
      case 'SHIPPING':
        return 'bg-sky-50 border-sky-100';
      case 'SYSTEM':
        return 'bg-slate-100 border-slate-200';
      default:
        return 'bg-blue-50 border-blue-100';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ORDER':
        return 'Đơn hàng';
      case 'PAYMENT':
        return 'Thanh toán';
      case 'PROMOTION':
        return 'Khuyến mại';
      case 'WARRANTY':
        return 'Bảo hành';
      case 'SHIPPING':
        return 'Vận chuyển';
      case 'SYSTEM':
        return 'Hệ thống';
      default:
        return type || 'Thông báo';
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 py-6 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav
          className="flex items-center gap-2 text-xs font-semibold text-slate-500"
          aria-label="Breadcrumb"
        >
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-800">Thông báo của tôi</span>
        </nav>

        {/* Page Header */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Thông báo của tôi
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-2xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Theo dõi tình trạng đơn hàng, bảo hành và chương trình ưu đãi
              </p>
            </div>
          </div>

          {/* Action Button: Mark all as read */}
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markingAll}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-blue-600" />
            <span>Đánh dấu tất cả đã đọc</span>
          </button>
        </div>

        {/* Filters & Category Tabs */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Unread Only Toggle */}
          <div className="flex items-center justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm font-medium text-slate-700 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/60">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={handleToggleUnreadOnly}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer accent-blue-600"
              />
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Chỉ hiện chưa đọc</span>
            </label>
          </div>
        </div>

        {/* Notification List Section */}
        <div className="space-y-3">
          {/* 1. Loading Skeleton */}
          {isLoading && items.length === 0 && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs animate-pulse flex items-start gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-3.5 bg-slate-100 rounded w-4/5" />
                    <div className="h-3 bg-slate-100 rounded w-1/4 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Error State */}
          {!isLoading && error && items.length === 0 && (
            <div className="bg-white rounded-2xl border border-rose-200 shadow-xs p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">Không thể tải danh sách thông báo</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">{error}</p>
              <button
                type="button"
                onClick={() => loadNotifications(activeTab, unreadOnly, pagination.page)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* 3. Empty State */}
          {!isLoading && items.length === 0 && !error && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-10 sm:p-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-200/60">
                <BellOff className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
                Không có thông báo nào trong mục này
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6">
                {unreadOnly
                  ? 'Bạn đã đọc tất cả thông báo trong mục này.'
                  : 'Các cập nhật về đơn hàng, khuyến mại và bảo hành sẽ xuất hiện tại đây.'}
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-xs"
              >
                <span>Tiếp tục mua hàng</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* 4. Loaded List */}
          {items.map((item) => {
            const isUnread = !item.isRead;
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isUnread
                    ? 'bg-blue-50/30 border-blue-200 hover:bg-blue-50/50 hover:border-blue-300 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
                  {/* Contextual Icon */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${getIconContainerStyle(
                      item.type
                    )}`}
                  >
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {isUnread && (
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"
                          aria-label="Chưa đọc"
                          title="Chưa đọc"
                        />
                      )}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>

                    <h4
                      className={`text-sm sm:text-base leading-snug line-clamp-1 ${
                        isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                      }`}
                    >
                      {item.title}
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <span>Xem chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(e, item.id)}
                    disabled={deletingId === item.id}
                    title="Xóa thông báo"
                    aria-label="Xóa thông báo"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. Pagination */}
        {pagination.total > pagination.limit && (
          <StorefrontPagination
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit)}
            totalItems={pagination.total}
            totalCount={pagination.total}
            itemLabel="thông báo"
            pageSize={pagination.limit}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Notification Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedNotification(null);
        }}
        onActionClick={handleModalActionClick}
      />
    </div>
  );
};

export default NotificationPage;
