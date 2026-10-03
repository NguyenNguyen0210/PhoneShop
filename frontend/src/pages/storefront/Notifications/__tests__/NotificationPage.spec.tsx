import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { NotificationPage } from '../NotificationPage';
import { useNotificationStore } from '../../../../stores/useNotificationStore';
import type { NotificationItem } from '../../../../types';

vi.mock('../../../../stores/useNotificationStore', () => ({
  useNotificationStore: vi.fn(),
}));

const mockUseNotificationStore = vi.mocked(useNotificationStore);

describe('NotificationPage', () => {
  const sampleNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: 'user-1',
      type: 'ORDER',
      channel: 'IN_APP',
      title: 'Đơn hàng #DH-1001 đã giao thành công',
      message: 'Kiện hàng của bạn đã được giao đến địa chỉ nhận hàng.',
      data: { orderId: 'DH-1001' },
      isRead: false,
      createdAt: '2026-03-20T10:00:00.000Z',
    },
    {
      id: 'notif-2',
      userId: 'user-1',
      type: 'PAYMENT',
      channel: 'IN_APP',
      title: 'Thanh toán thành công đơn hàng #DH-1002',
      message: 'Bạn đã thanh toán 2.500.000đ qua VNPay.',
      data: { orderId: 'DH-1002', amount: 2500000 },
      isRead: true,
      createdAt: '2026-03-19T14:30:00.000Z',
    },
    {
      id: 'notif-3',
      userId: 'user-1',
      type: 'PROMOTION',
      channel: 'IN_APP',
      title: 'Ưu đãi đặc biệt giảm 20%',
      message: 'Nhập mã GIAM20 khi thanh toán phụ kiện.',
      data: { code: 'GIAM20' },
      isRead: false,
      createdAt: '2026-03-18T09:15:00.000Z',
    },
    {
      id: 'notif-4',
      userId: 'user-1',
      type: 'WARRANTY',
      channel: 'IN_APP',
      title: 'Kích hoạt bảo hành điện tử thành công',
      message: 'Sản phẩm Galaxy S24 Ultra đã được bảo hành 12 tháng.',
      data: { code: 'BH-S24U' },
      isRead: true,
      createdAt: '2026-03-17T08:00:00.000Z',
    },
    {
      id: 'notif-5',
      userId: 'user-1',
      type: 'SYSTEM',
      channel: 'IN_APP',
      title: 'Nâng cấp hệ thống định kỳ',
      message: 'Hệ thống sẽ bảo trì từ 01:00 đến 03:00 sáng ngày mai.',
      data: null,
      isRead: false,
      createdAt: '2026-03-16T18:00:00.000Z',
    },
  ];

  const defaultStoreState = {
    unreadCount: 0,
    previewList: [] as NotificationItem[],
    items: [] as NotificationItem[],
    pagination: { page: 1, limit: 20, total: 0 },
    activeFilter: {},
    isLoading: false,
    isPreviewLoading: false,
    error: null as string | null,
    fetchUnreadCount: vi.fn().mockResolvedValue(undefined),
    fetchPreviewList: vi.fn().mockResolvedValue(undefined),
    fetchNotifications: vi.fn().mockResolvedValue(undefined),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
    startPolling: vi.fn().mockReturnValue(() => {}),
    clearState: vi.fn(),
  };

  const setStoreState = (state: Partial<typeof defaultStoreState>) => {
    mockUseNotificationStore.mockReturnValue({
      ...defaultStoreState,
      ...state,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setStoreState({});
  });

  it('renders page header, title, and all category tabs', () => {
    const html = renderToString(
      <MemoryRouter>
        <NotificationPage />
      </MemoryRouter>
    );

    expect(html).toContain('Thông báo của tôi');
    expect(html).toContain('Trang chủ');
    expect(html).toContain('Tất cả');
    expect(html).toContain('Đơn hàng');
    expect(html).toContain('Thanh toán');
    expect(html).toContain('Khuyến mại');
    expect(html).toContain('Bảo hành');
    expect(html).toContain('Hệ thống');
    expect(html).toContain('Chỉ hiện chưa đọc');
    expect(html).toContain('Đánh dấu tất cả đã đọc');
  });

  it('renders unread badge in header when unreadCount > 0', () => {
    setStoreState({ unreadCount: 7 });

    const html = renderToString(
      <MemoryRouter>
        <NotificationPage />
      </MemoryRouter>
    );

    expect(html).toContain('7');
  });

  it('renders notification items with title, type label, message, and action buttons', () => {
    setStoreState({
      items: sampleNotifications,
      pagination: { page: 1, limit: 20, total: sampleNotifications.length },
      unreadCount: 3,
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationPage />
      </MemoryRouter>
    );

    expect(html).toContain('Đơn hàng #DH-1001 đã giao thành công');
    expect(html).toContain('Thanh toán thành công đơn hàng #DH-1002');
    expect(html).toContain('Ưu đãi đặc biệt giảm 20%');
    expect(html).toContain('Kích hoạt bảo hành điện tử thành công');
    expect(html).toContain('Nâng cấp hệ thống định kỳ');

    // Type labels
    expect(html).toContain('Đơn hàng');
    expect(html).toContain('Thanh toán');
    expect(html).toContain('Khuyến mại');
    expect(html).toContain('Bảo hành');
    expect(html).toContain('Hệ thống');

    // Action buttons
    expect(html).toContain('Xem chi tiết');
    expect(html).toContain('aria-label="Xóa thông báo"');
  });

  it('renders empty state when there are no notifications', () => {
    setStoreState({
      items: [],
      isLoading: false,
      error: null,
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationPage />
      </MemoryRouter>
    );

    expect(html).toContain('Không có thông báo nào trong mục này');
    expect(html).toContain('Tiếp tục mua hàng');
  });

  it('renders loading skeleton when isLoading is true and items is empty', () => {
    setStoreState({
      items: [],
      isLoading: true,
      error: null,
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationPage />
      </MemoryRouter>
    );

    expect(html).toContain('animate-pulse');
  });

  it('renders error state with retry button when error is present and items is empty', () => {
    setStoreState({
      items: [],
      isLoading: false,
      error: 'Không thể kết nối máy chủ',
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationPage />
      </MemoryRouter>
    );

    expect(html).toContain('Không thể tải danh sách thông báo');
    expect(html).toContain('Không thể kết nối máy chủ');
    expect(html).toContain('Thử lại');
  });

  it('renders pagination when total > limit', () => {
    setStoreState({
      items: sampleNotifications,
      pagination: { page: 1, limit: 2, total: 10 },
    });

    const html = renderToString(
      <MemoryRouter>
        <NotificationPage />
      </MemoryRouter>
    );

    expect(html).toContain('Phân trang thông báo');
    expect(html).toContain('Hiển thị');
    expect(html).toContain('trên tổng số');
  });
});
