import type { NotificationItem } from '../types';

export const formatRelativeTime = (dateString?: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'Vừa xong';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Vừa xong';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const getNotificationTargetRoute = (item: NotificationItem): string => {
  if (item.data?.orderId || item.type === 'ORDER') {
    const orderId = item.data?.orderId ? item.data.orderId : '';
    return orderId ? `/orders/${orderId}` : '/orders';
  }
  if (item.type === 'WARRANTY') {
    return '/warranty-lookup';
  }
  return '/notifications';
};
