import { create } from 'zustand';
import type {
  NotificationFilterParams,
  NotificationItem,
} from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
}

export interface NotificationState {
  unreadCount: number;
  previewList: NotificationItem[];
  items: NotificationItem[];
  pagination: NotificationPagination;
  activeFilter: NotificationFilterParams;
  isLoading: boolean;
  isPreviewLoading: boolean;
  error: string | null;

  fetchUnreadCount: () => Promise<void>;
  fetchPreviewList: () => Promise<void>;
  fetchNotifications: (filter?: NotificationFilterParams) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
  clearState: () => void;
}

const initialState = {
  unreadCount: 0,
  previewList: [] as NotificationItem[],
  items: [] as NotificationItem[],
  pagination: { page: 1, limit: 20, total: 0 },
  activeFilter: {} as NotificationFilterParams,
  isLoading: false,
  isPreviewLoading: false,
  error: null as string | null,
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  ...initialState,

  fetchUnreadCount: async () => {
    try {
      const res = await notificationService.getUnreadCount();
      set({ unreadCount: typeof res?.unreadCount === 'number' ? res.unreadCount : 0 });
    } catch {
      // Silently catch error
    }
  },

  fetchPreviewList: async () => {
    try {
      set({ isPreviewLoading: true, error: null });
      const res = await notificationService.getMyNotifications({ page: 1, limit: 8 });
      set({
        previewList: res?.data ?? [],
        isPreviewLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || 'Lỗi khi tải thông báo',
        isPreviewLoading: false,
      });
    }
  },

  fetchNotifications: async (filter?: NotificationFilterParams) => {
    try {
      set({ isLoading: true, error: null });
      const activeFilter = filter !== undefined ? filter : get().activeFilter;
      const res = await notificationService.getMyNotifications(activeFilter);
      set({
        items: res?.data ?? [],
        pagination: {
          page: res?.page ?? activeFilter?.page ?? 1,
          limit: res?.limit ?? activeFilter?.limit ?? 20,
          total: res?.total ?? 0,
        },
        activeFilter,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || 'Lỗi khi tải thông báo',
        isLoading: false,
      });
    }
  },

  markAsRead: async (id: string) => {
    const { unreadCount, items, previewList } = get();
    const targetInItems = items.find((item) => item.id === id);
    const targetInPreview = previewList.find((item) => item.id === id);
    const wasUnread =
      (targetInItems && !targetInItems.isRead) ||
      (targetInPreview && !targetInPreview.isRead) ||
      (!targetInItems && !targetInPreview);

    const nextUnreadCount = wasUnread ? Math.max(0, unreadCount - 1) : unreadCount;
    const now = new Date().toISOString();

    set({
      unreadCount: nextUnreadCount,
      items: items.map((item) =>
        item.id === id ? { ...item, isRead: true, readAt: item.readAt || now } : item
      ),
      previewList: previewList.map((item) =>
        item.id === id ? { ...item, isRead: true, readAt: item.readAt || now } : item
      ),
    });

    try {
      const updated = await notificationService.markAsRead(id);
      if (updated?.id) {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, ...updated, isRead: true } : i
          ),
          previewList: state.previewList.map((i) =>
            i.id === id ? { ...i, ...updated, isRead: true } : i
          ),
        }));
      }
    } catch (err: any) {
      // Rollback
      set({
        unreadCount,
        items,
        previewList,
        error: err.response?.data?.message || err.message || 'Lỗi khi đánh dấu đã đọc',
      });
      throw err;
    }
  },

  markAllAsRead: async () => {
    const { unreadCount, items, previewList } = get();

    set({
      unreadCount: 0,
      items: items.map((item) => ({ ...item, isRead: true })),
      previewList: previewList.map((item) => ({ ...item, isRead: true })),
    });

    try {
      await notificationService.markAllAsRead();
    } catch (err: any) {
      // Rollback
      set({
        unreadCount,
        items,
        previewList,
        error:
          err.response?.data?.message ||
          err.message ||
          'Lỗi khi đánh dấu tất cả đã đọc',
      });
      throw err;
    }
  },

  deleteNotification: async (id: string) => {
    const { unreadCount, items, previewList, pagination } = get();
    const targetInItems = items.find((item) => item.id === id);
    const targetInPreview = previewList.find((item) => item.id === id);
    const wasUnread =
      (targetInItems && !targetInItems.isRead) ||
      (targetInPreview && !targetInPreview.isRead) ||
      (!targetInItems && !targetInPreview);

    const nextUnreadCount = wasUnread ? Math.max(0, unreadCount - 1) : unreadCount;

    set({
      unreadCount: nextUnreadCount,
      items: items.filter((item) => item.id !== id),
      previewList: previewList.filter((item) => item.id !== id),
      pagination: {
        ...pagination,
        total: Math.max(0, pagination.total - (targetInItems ? 1 : 0)),
      },
    });

    try {
      await notificationService.deleteNotification(id);
    } catch (err: any) {
      // Rollback
      set({
        unreadCount,
        items,
        previewList,
        pagination,
        error: err.response?.data?.message || err.message || 'Lỗi khi xóa thông báo',
      });
      throw err;
    }
  },

  startPolling: (intervalMs = 60000) => {
    get().fetchUnreadCount();

    const intervalId = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        get().fetchUnreadCount();
      }
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        get().fetchUnreadCount();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  },

  clearState: () => {
    set({ ...initialState });
  },
}));
