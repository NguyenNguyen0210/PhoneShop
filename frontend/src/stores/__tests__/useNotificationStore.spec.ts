import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNotificationStore } from '../useNotificationStore';
import { notificationService } from '../../services/notificationService';
import type { NotificationItem } from '../../types';

vi.mock('../../services/notificationService', () => ({
  notificationService: {
    getMyNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

describe('useNotificationStore', () => {
  const mockNotification1: NotificationItem = {
    id: 'n-1',
    userId: 'u-1',
    type: 'ORDER',
    channel: 'IN_APP',
    title: 'Order Placed',
    message: 'Your order was placed successfully',
    isRead: false,
    createdAt: '2026-03-01T00:00:00Z',
  };

  const mockNotification2: NotificationItem = {
    id: 'n-2',
    userId: 'u-1',
    type: 'PAYMENT',
    channel: 'IN_APP',
    title: 'Payment Received',
    message: 'Your payment was confirmed',
    isRead: false,
    createdAt: '2026-03-02T00:00:00Z',
  };

  const mockNotificationRead: NotificationItem = {
    id: 'n-3',
    userId: 'u-1',
    type: 'PROMOTION',
    channel: 'IN_APP',
    title: 'Discount',
    message: 'Special discount for you',
    isRead: true,
    readAt: '2026-03-02T10:00:00Z',
    createdAt: '2026-03-02T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.getState().clearState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Default Values', () => {
    it('should initialize with correct default state', () => {
      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(0);
      expect(state.previewList).toEqual([]);
      expect(state.items).toEqual([]);
      expect(state.pagination).toEqual({ page: 1, limit: 20, total: 0 });
      expect(state.activeFilter).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.isPreviewLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchUnreadCount', () => {
    it('should fetch and update unread count', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValueOnce({ unreadCount: 5 });

      await useNotificationStore.getState().fetchUnreadCount();

      expect(notificationService.getUnreadCount).toHaveBeenCalledTimes(1);
      expect(useNotificationStore.getState().unreadCount).toBe(5);
    });

    it('should silently catch errors and not crash', async () => {
      vi.mocked(notificationService.getUnreadCount).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        useNotificationStore.getState().fetchUnreadCount()
      ).resolves.toBeUndefined();

      expect(useNotificationStore.getState().unreadCount).toBe(0);
      expect(useNotificationStore.getState().error).toBeNull();
    });
  });

  describe('fetchPreviewList', () => {
    it('should fetch preview list with page 1 and limit 8', async () => {
      vi.mocked(notificationService.getMyNotifications).mockResolvedValueOnce({
        data: [mockNotification1, mockNotification2],
        total: 2,
        page: 1,
        limit: 8,
      });

      await useNotificationStore.getState().fetchPreviewList();

      expect(notificationService.getMyNotifications).toHaveBeenCalledWith({
        page: 1,
        limit: 8,
      });
      expect(useNotificationStore.getState().previewList).toEqual([
        mockNotification1,
        mockNotification2,
      ]);
      expect(useNotificationStore.getState().isPreviewLoading).toBe(false);
    });

    it('should handle preview list fetch errors', async () => {
      vi.mocked(notificationService.getMyNotifications).mockRejectedValueOnce(
        new Error('Fetch failed')
      );

      await useNotificationStore.getState().fetchPreviewList();

      expect(useNotificationStore.getState().previewList).toEqual([]);
      expect(useNotificationStore.getState().isPreviewLoading).toBe(false);
      expect(useNotificationStore.getState().error).toBe('Fetch failed');
    });
  });

  describe('fetchNotifications', () => {
    it('should fetch notifications with default filter and update state', async () => {
      vi.mocked(notificationService.getMyNotifications).mockResolvedValueOnce({
        data: [mockNotification1],
        total: 1,
        page: 1,
        limit: 20,
      });

      await useNotificationStore.getState().fetchNotifications();

      expect(notificationService.getMyNotifications).toHaveBeenCalledWith({});
      expect(useNotificationStore.getState().items).toEqual([mockNotification1]);
      expect(useNotificationStore.getState().pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
      });
      expect(useNotificationStore.getState().isLoading).toBe(false);
    });

    it('should fetch notifications with specific filter params', async () => {
      const filter = { page: 2, limit: 10, type: 'ORDER' as const, isRead: false };
      vi.mocked(notificationService.getMyNotifications).mockResolvedValueOnce({
        data: [mockNotification1],
        total: 15,
        page: 2,
        limit: 10,
      });

      await useNotificationStore.getState().fetchNotifications(filter);

      expect(notificationService.getMyNotifications).toHaveBeenCalledWith(filter);
      expect(useNotificationStore.getState().activeFilter).toEqual(filter);
      expect(useNotificationStore.getState().pagination).toEqual({
        page: 2,
        limit: 10,
        total: 15,
      });
    });

    it('should handle errors when fetching notifications', async () => {
      vi.mocked(notificationService.getMyNotifications).mockRejectedValueOnce(
        new Error('Failed to load')
      );

      await useNotificationStore.getState().fetchNotifications();

      expect(useNotificationStore.getState().isLoading).toBe(false);
      expect(useNotificationStore.getState().error).toBe('Failed to load');
    });
  });

  describe('markAsRead - optimistic update & rollback', () => {
    beforeEach(() => {
      useNotificationStore.setState({
        unreadCount: 2,
        items: [mockNotification1, mockNotification2],
        previewList: [mockNotification1, mockNotification2],
      });
    });

    it('should optimistically mark notification as read and decrement unreadCount', async () => {
      const updatedItem = { ...mockNotification1, isRead: true, readAt: '2026-03-03T12:00:00Z' };
      vi.mocked(notificationService.markAsRead).mockResolvedValueOnce(updatedItem);

      const promise = useNotificationStore.getState().markAsRead('n-1');

      // Optimistic state check
      expect(useNotificationStore.getState().unreadCount).toBe(1);
      expect(
        useNotificationStore.getState().items.find((i) => i.id === 'n-1')?.isRead
      ).toBe(true);
      expect(
        useNotificationStore.getState().previewList.find((i) => i.id === 'n-1')?.isRead
      ).toBe(true);

      await promise;

      expect(notificationService.markAsRead).toHaveBeenCalledWith('n-1');
      expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it('should not decrement unreadCount if the notification was already read', async () => {
      useNotificationStore.setState({
        unreadCount: 2,
        items: [mockNotificationRead],
        previewList: [mockNotificationRead],
      });

      vi.mocked(notificationService.markAsRead).mockResolvedValueOnce(mockNotificationRead);

      await useNotificationStore.getState().markAsRead('n-3');

      expect(useNotificationStore.getState().unreadCount).toBe(2);
    });

    it('should rollback to previous state if markAsRead fails', async () => {
      vi.mocked(notificationService.markAsRead).mockRejectedValueOnce(
        new Error('Server error')
      );

      await expect(
        useNotificationStore.getState().markAsRead('n-1')
      ).rejects.toThrow('Server error');

      // Restored
      expect(useNotificationStore.getState().unreadCount).toBe(2);
      expect(
        useNotificationStore.getState().items.find((i) => i.id === 'n-1')?.isRead
      ).toBe(false);
      expect(
        useNotificationStore.getState().previewList.find((i) => i.id === 'n-1')?.isRead
      ).toBe(false);
      expect(useNotificationStore.getState().error).toBe('Server error');
    });
  });

  describe('markAllAsRead - optimistic update & rollback', () => {
    beforeEach(() => {
      useNotificationStore.setState({
        unreadCount: 3,
        items: [mockNotification1, mockNotification2, mockNotificationRead],
        previewList: [mockNotification1, mockNotification2],
      });
    });

    it('should optimistically set unreadCount to 0 and all items to isRead: true', async () => {
      vi.mocked(notificationService.markAllAsRead).mockResolvedValueOnce({ success: true });

      const promise = useNotificationStore.getState().markAllAsRead();

      expect(useNotificationStore.getState().unreadCount).toBe(0);
      expect(
        useNotificationStore.getState().items.every((i) => i.isRead)
      ).toBe(true);
      expect(
        useNotificationStore.getState().previewList.every((i) => i.isRead)
      ).toBe(true);

      await promise;

      expect(notificationService.markAllAsRead).toHaveBeenCalledTimes(1);
    });

    it('should rollback if markAllAsRead fails', async () => {
      vi.mocked(notificationService.markAllAsRead).mockRejectedValueOnce(
        new Error('Failed to mark all')
      );

      await expect(
        useNotificationStore.getState().markAllAsRead()
      ).rejects.toThrow('Failed to mark all');

      expect(useNotificationStore.getState().unreadCount).toBe(3);
      expect(
        useNotificationStore.getState().items.find((i) => i.id === 'n-1')?.isRead
      ).toBe(false);
      expect(
        useNotificationStore.getState().previewList.find((i) => i.id === 'n-1')?.isRead
      ).toBe(false);
      expect(useNotificationStore.getState().error).toBe('Failed to mark all');
    });
  });

  describe('deleteNotification - optimistic update & rollback', () => {
    beforeEach(() => {
      useNotificationStore.setState({
        unreadCount: 2,
        items: [mockNotification1, mockNotification2],
        previewList: [mockNotification1, mockNotification2],
        pagination: { page: 1, limit: 20, total: 2 },
      });
    });

    it('should optimistically remove item, decrement unreadCount and total', async () => {
      vi.mocked(notificationService.deleteNotification).mockResolvedValueOnce({ success: true });

      const promise = useNotificationStore.getState().deleteNotification('n-1');

      // Optimistic check
      expect(useNotificationStore.getState().unreadCount).toBe(1);
      expect(
        useNotificationStore.getState().items.find((i) => i.id === 'n-1')
      ).toBeUndefined();
      expect(
        useNotificationStore.getState().previewList.find((i) => i.id === 'n-1')
      ).toBeUndefined();
      expect(useNotificationStore.getState().pagination.total).toBe(1);

      await promise;

      expect(notificationService.deleteNotification).toHaveBeenCalledWith('n-1');
    });

    it('should rollback if deleteNotification fails', async () => {
      vi.mocked(notificationService.deleteNotification).mockRejectedValueOnce(
        new Error('Delete error')
      );

      await expect(
        useNotificationStore.getState().deleteNotification('n-1')
      ).rejects.toThrow('Delete error');

      expect(useNotificationStore.getState().unreadCount).toBe(2);
      expect(
        useNotificationStore.getState().items.find((i) => i.id === 'n-1')
      ).toBeDefined();
      expect(
        useNotificationStore.getState().previewList.find((i) => i.id === 'n-1')
      ).toBeDefined();
      expect(useNotificationStore.getState().pagination.total).toBe(2);
      expect(useNotificationStore.getState().error).toBe('Delete error');
    });
  });

  describe('startPolling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should fetch immediately and register interval polling when visible', () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 1 });

      const cleanup = useNotificationStore.getState().startPolling(5000);

      // Called immediately
      expect(notificationService.getUnreadCount).toHaveBeenCalledTimes(1);

      // Advance timer by 5000ms
      vi.advanceTimersByTime(5000);
      expect(notificationService.getUnreadCount).toHaveBeenCalledTimes(2);

      // Advance again
      vi.advanceTimersByTime(5000);
      expect(notificationService.getUnreadCount).toHaveBeenCalledTimes(3);

      cleanup();

      // Should not call after cleanup
      vi.advanceTimersByTime(5000);
      expect(notificationService.getUnreadCount).toHaveBeenCalledTimes(3);
    });

    it('should fetch on visibilitychange when tab becomes visible', () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 2 });

      const listeners: Record<string, Function> = {};
      const mockDoc = {
        visibilityState: 'hidden',
        addEventListener: vi.fn((event: string, cb: Function) => {
          listeners[event] = cb;
        }),
        removeEventListener: vi.fn((event: string) => {
          delete listeners[event];
        }),
      };

      vi.stubGlobal('document', mockDoc);

      const cleanup = useNotificationStore.getState().startPolling(60000);
      expect(notificationService.getUnreadCount).toHaveBeenCalledTimes(1);

      // Tab becomes visible
      mockDoc.visibilityState = 'visible';
      listeners['visibilitychange']?.();

      expect(notificationService.getUnreadCount).toHaveBeenCalledTimes(2);

      cleanup();
      expect(mockDoc.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      vi.unstubAllGlobals();
    });
  });

  describe('clearState', () => {
    it('should reset store to default values', () => {
      useNotificationStore.setState({
        unreadCount: 10,
        items: [mockNotification1],
        previewList: [mockNotification1],
        pagination: { page: 3, limit: 10, total: 30 },
        activeFilter: { type: 'ORDER' },
        isLoading: true,
        isPreviewLoading: true,
        error: 'Some error',
      });

      useNotificationStore.getState().clearState();

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(0);
      expect(state.previewList).toEqual([]);
      expect(state.items).toEqual([]);
      expect(state.pagination).toEqual({ page: 1, limit: 20, total: 0 });
      expect(state.activeFilter).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.isPreviewLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
