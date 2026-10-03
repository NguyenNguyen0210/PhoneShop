import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { NotificationDropdown } from '../NotificationDropdown';
import {
  formatRelativeTime,
  getNotificationTargetRoute,
} from '../../../utils/notificationUtils';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import type { NotificationItem } from '../../../types';

vi.mock('../../../stores/useNotificationStore', () => ({
  useNotificationStore: vi.fn(),
}));

const mockUseNotificationStore = vi.mocked(useNotificationStore);

describe('formatRelativeTime helper', () => {
  it('returns empty string for null/undefined/invalid date', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime(undefined)).toBe('');
    expect(formatRelativeTime('invalid-date')).toBe('');
  });

  it('returns "Vừa xong" for dates less than 60 seconds ago or future', () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe('Vừa xong');
  });

  it('returns minutes ago for dates within an hour', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe('5 phút trước');
  });

  it('returns hours ago for dates within 24 hours', () => {
    const date = new Date(Date.now() - 3 * 3600 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe('3 giờ trước');
  });

  it('returns days ago for dates within 7 days', () => {
    const date = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe('2 ngày trước');
  });

  it('returns formatted date for dates older than 7 days', () => {
    const date = new Date('2025-01-15T12:00:00Z');
    const result = formatRelativeTime(date.toISOString());
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('getNotificationTargetRoute', () => {
  it('routes to order detail when orderId exists in data', () => {
    const item: NotificationItem = {
      id: '1',
      userId: 'u1',
      type: 'ORDER',
      channel: 'IN_APP',
      title: 'Order',
      message: 'Msg',
      data: { orderId: 'ord-999' },
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    expect(getNotificationTargetRoute(item)).toBe('/orders/ord-999');
  });

  it('routes to /orders when type is ORDER but orderId is missing', () => {
    const item: NotificationItem = {
      id: '1',
      userId: 'u1',
      type: 'ORDER',
      channel: 'IN_APP',
      title: 'Order',
      message: 'Msg',
      data: null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    expect(getNotificationTargetRoute(item)).toBe('/orders');
  });

  it('routes to /warranty-lookup for WARRANTY type', () => {
    const item: NotificationItem = {
      id: '1',
      userId: 'u1',
      type: 'WARRANTY',
      channel: 'IN_APP',
      title: 'Warranty',
      message: 'Msg',
      data: null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    expect(getNotificationTargetRoute(item)).toBe('/warranty-lookup');
  });

  it('routes to /notifications for SYSTEM, PROMOTION, SHIPPING etc.', () => {
    const item: NotificationItem = {
      id: '1',
      userId: 'u1',
      type: 'SYSTEM',
      channel: 'IN_APP',
      title: 'System',
      message: 'Msg',
      data: null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    expect(getNotificationTargetRoute(item)).toBe('/notifications');
  });
});

describe('NotificationDropdown component', () => {
  const sampleNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: 'u1',
      type: 'ORDER',
      channel: 'IN_APP',
      title: 'Đơn hàng mới',
      message: 'Đơn hàng #123 đã được xác nhận',
      data: { orderId: 'ord-123' },
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
    {
      id: 'notif-2',
      userId: 'u1',
      type: 'PAYMENT',
      channel: 'IN_APP',
      title: 'Thanh toán thành công',
      message: 'Thanh toán đơn hàng đã hoàn tất',
      data: null,
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
    {
      id: 'notif-3',
      userId: 'u1',
      type: 'WARRANTY',
      channel: 'IN_APP',
      title: 'Kích hoạt bảo hành',
      message: 'Thiết bị đã được kích hoạt bảo hành điện tử',
      data: null,
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 3600).toISOString(),
    },
    {
      id: 'notif-4',
      userId: 'u1',
      type: 'PROMOTION',
      channel: 'IN_APP',
      title: 'Khuyến mãi đặc biệt',
      message: 'Mã giảm giá mới có hiệu lực ngay hôm nay',
      data: { link: 'https://example.com' },
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
    },
    {
      id: 'notif-5',
      userId: 'u1',
      type: 'SHIPPING',
      channel: 'IN_APP',
      title: 'Giao hàng',
      message: 'Đơn hàng đang trên đường giao',
      data: null,
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 3600 * 5).toISOString(),
    },
    {
      id: 'notif-6',
      userId: 'u1',
      type: 'SYSTEM',
      channel: 'IN_APP',
      title: 'Thông báo hệ thống',
      message: 'Hệ thống bảo trì định kỳ',
      data: null,
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 3600 * 10).toISOString(),
    },
  ];

  const defaultStoreState = {
    unreadCount: 0,
    previewList: [],
    items: [],
    pagination: { page: 1, limit: 20, total: 0 },
    activeFilter: {},
    isLoading: false,
    isPreviewLoading: false,
    error: null,
    fetchUnreadCount: vi.fn(),
    fetchPreviewList: vi.fn(),
    fetchNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    startPolling: vi.fn(),
    clearState: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotificationStore.mockReturnValue({ ...defaultStoreState });
  });

  it('renders bell button without badge when unreadCount is 0', () => {
    const html = renderToString(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    expect(html).toContain('aria-label="Thông báo"');
    expect(html).not.toContain('bg-rose-500');
  });

  it('renders unread badge when unreadCount > 0 and handles >99 display', () => {
    mockUseNotificationStore.mockReturnValue({
      ...defaultStoreState,
      unreadCount: 5,
    });

    let html = renderToString(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    expect(html).toContain('bg-rose-500');
    expect(html).toContain('5</span>');

    mockUseNotificationStore.mockReturnValue({
      ...defaultStoreState,
      unreadCount: 150,
    });
    html = renderToString(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    expect(html).toContain('99+</span>');
  });

  it('renders empty state when open and previewList is empty', () => {
    mockUseNotificationStore.mockReturnValue({
      ...defaultStoreState,
      previewList: [],
      isPreviewLoading: false,
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationDropdown defaultOpen={true} />
      </MemoryRouter>
    );

    expect(html).toContain('Thông báo');
    expect(html).toContain('Bạn chưa có thông báo mới nào');
    expect(html).toContain('Xem tất cả thông báo');
  });

  it('renders loading skeleton when isPreviewLoading is true', () => {
    mockUseNotificationStore.mockReturnValue({
      ...defaultStoreState,
      isPreviewLoading: true,
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationDropdown defaultOpen={true} />
      </MemoryRouter>
    );

    expect(html).toContain('animate-pulse');
  });

  it('renders notification items with titles, messages, and icons', () => {
    mockUseNotificationStore.mockReturnValue({
      ...defaultStoreState,
      previewList: sampleNotifications,
      unreadCount: 3,
      isPreviewLoading: false,
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationDropdown defaultOpen={true} />
      </MemoryRouter>
    );

    expect(html).toContain('Đơn hàng mới');
    expect(html).toContain('Đơn hàng #123 đã được xác nhận');
    expect(html).toContain('Thanh toán thành công');
    expect(html).toContain('Kích hoạt bảo hành');
    expect(html).toContain('Khuyến mãi đặc biệt');
    expect(html).toContain('Giao hàng');
    expect(html).toContain('Thông báo hệ thống');
    expect(html).toContain('Đánh dấu đã đọc tất cả');
    expect(html).toContain('Xem tất cả thông báo');
    // Blue dot for unread item
    expect(html).toContain('bg-blue-600 shrink-0 self-center');
    // Unread background
    expect(html).toContain('bg-blue-50/40');
  });

  it('renders markAllAsRead as disabled when unreadCount is 0', () => {
    mockUseNotificationStore.mockReturnValue({
      ...defaultStoreState,
      unreadCount: 0,
      previewList: sampleNotifications,
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationDropdown defaultOpen={true} />
      </MemoryRouter>
    );

    expect(html).toContain('disabled=""');
  });

  it('renders markAllAsRead as enabled when unreadCount > 0', () => {
    mockUseNotificationStore.mockReturnValue({
      ...defaultStoreState,
      unreadCount: 4,
      previewList: sampleNotifications,
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationDropdown defaultOpen={true} />
      </MemoryRouter>
    );

    // Should not be disabled
    expect(html).not.toMatch(/disabled=""/);
  });
});
