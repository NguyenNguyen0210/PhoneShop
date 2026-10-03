# Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete end-to-end Notification system featuring enhanced backend query filtering (`type`, `isRead`), a global Zustand store with 60s visibility-aware polling, a Navbar bell dropdown popup with unread badge, and a dedicated `/notifications` management page with category tabs, pagination, and contextual navigation.

**Architecture:** The backend NestJS `notifications` module is enhanced to support filtering by `type` and `isRead` in `GET /notifications/my`. On the frontend, `useNotificationStore` (Zustand) centrally coordinates unread counts, quick preview items, and the full notification list with optimistic updates. The UI integrates a bell icon with dynamic badge into `Navbar.tsx`, renders a `NotificationDropdown` popup for quick actions, and adds a dedicated `NotificationPage` routed at `/notifications`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React 18, TypeScript, Tailwind CSS, Lucide React, Zustand, Axios, Jest, Vitest.

---

## File Structure Map

### Backend
- `backend/src/modules/notifications/notifications.controller.ts`: Add `type` and `isRead` query parameters to `getMyNotifications`.
- `backend/src/modules/notifications/notifications.service.ts`: Update `getMyNotifications` to filter by `type` and `isRead`.
- `backend/test/unit/notifications.spec.ts`: Unit tests for controller and service filtering and pagination.

### Frontend
- `frontend/src/types/index.ts`: Add `NotificationType`, `NotificationChannel`, `NotificationItem`, `NotificationPaginationResponse`, `NotificationFilterParams`.
- `frontend/src/services/notificationService.ts`: API service for all notification endpoints.
- `frontend/src/stores/useNotificationStore.ts`: Zustand store for notifications, unread count, optimistic updates, and polling.
- `frontend/src/stores/__tests__/useNotificationStore.spec.ts`: Unit tests for store actions and state transitions.
- `frontend/src/components/common/NotificationDropdown.tsx`: Bell dropdown popup component with preview list, unread badge, and quick actions.
- `frontend/src/components/common/Navbar.tsx`: Integrate `NotificationDropdown` on desktop and mobile navbar.
- `frontend/src/pages/storefront/Notifications/NotificationPage.tsx`: Full notification page with category tabs, filters, pagination, and empty/loading states.
- `frontend/src/pages/storefront/Notifications/NotificationDetailModal.tsx`: Modal for displaying complete notification content and metadata.
- `frontend/src/routes/AppRoutes.tsx`: Register `/notifications` protected route.

---

## Tasks Outline

- [ ] **Task 1: Backend API Enhancement & Unit Tests**
  Update `notifications.controller.ts` and `notifications.service.ts` to support `type` and `isRead` filtering; add unit tests.
- [ ] **Task 2: Frontend Types & Notification Service**
  Define TypeScript models in `types/index.ts` and implement `notificationService.ts`.
- [ ] **Task 3: Zustand Store with Polling & Optimistic Updates**
  Implement `useNotificationStore.ts` and write Vitest unit tests in `useNotificationStore.spec.ts`.
- [ ] **Task 4: Header Bell Icon & NotificationDropdown Component**
  Build `NotificationDropdown.tsx` and integrate it into `Navbar.tsx`.
- [ ] **Task 5: NotificationDetailModal Component**
  Build modal to view full details of system/general notifications.
- [ ] **Task 6: Dedicated Notifications Page (`/notifications`) & Routing**
  Build `NotificationPage.tsx`, wire `StorefrontPagination`, and configure route in `AppRoutes.tsx`.
- [ ] **Task 7: Contextual Redirection & Action Links**
  Wire click behavior to mark as read and navigate to orders, warranty, cart, or detail modal.
- [ ] **Task 8: End-to-End System Verification**
  Run backend test suite, frontend test suite, verify production build, and check with seeded demo data.

---

### Task 1: Backend API Enhancement & Unit Tests

**Files:**
- Modify: `backend/src/modules/notifications/notifications.controller.ts:20-33`
- Modify: `backend/src/modules/notifications/notifications.service.ts:28-44`
- Test: `backend/test/unit/notifications.spec.ts`

- [ ] **Step 1: Write failing unit tests for notifications filtering**

Create `backend/test/unit/notifications.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../../src/modules/notifications/notifications.controller';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

describe('NotificationsController & Service', () => {
  let controller: NotificationsController;
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    notification: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should pass type and isRead filters to prisma query', async () => {
    mockPrisma.notification.count.mockResolvedValue(1);
    mockPrisma.notification.findMany.mockResolvedValue([
      { id: 'n1', userId: 'u1', type: NotificationType.ORDER, isRead: false },
    ]);

    const result = await controller.getMyNotifications(
      { id: 'u1' },
      '1',
      '10',
      NotificationType.ORDER,
      'false'
    );

    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'u1', type: NotificationType.ORDER, isRead: false },
    });
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', type: NotificationType.ORDER, isRead: false },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10,
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest test/unit/notifications.spec.ts`
Expected: FAIL because controller does not accept 4th/5th parameter yet.

- [ ] **Step 3: Update Controller and Service to support `type` and `isRead`**

In `backend/src/modules/notifications/notifications.controller.ts`:
```typescript
  @Get('my')
  @ApiOperation({ summary: 'Get my notifications (paginated and filtered)' })
  getMyNotifications(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: NotificationType,
    @Query('isRead') isRead?: string,
  ) {
    return this.notificationsService.getMyNotifications(
      user.id,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
      type,
      isRead,
    );
  }
```

In `backend/src/modules/notifications/notifications.service.ts`:
```typescript
  async getMyNotifications(
    userId: string,
    page = 1,
    limit = 20,
    type?: NotificationType,
    isRead?: string,
  ) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(100, Math.max(1, limit || 20));

    const where: any = { userId };
    if (type) {
      where.type = type;
    }
    if (isRead !== undefined && isRead !== '') {
      where.isRead = isRead === 'true';
    }

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
    ]);
    return { data, total, page: safePage, limit: safeLimit };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest test/unit/notifications.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/notifications/ backend/test/unit/notifications.spec.ts
git commit -m "feat(backend): support type and isRead query filters in getMyNotifications"
```

---

### Task 2: Frontend Types & Notification Service

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/notificationService.ts`

- [ ] **Step 1: Add Notification types to `frontend/src/types/index.ts`**

Append to `frontend/src/types/index.ts`:
```typescript
export type NotificationType =
  | 'ORDER'
  | 'PAYMENT'
  | 'SHIPPING'
  | 'PROMOTION'
  | 'SYSTEM'
  | 'WARRANTY'
  | 'RETURN';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPaginationResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationFilterParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}
```

- [ ] **Step 2: Create `frontend/src/services/notificationService.ts`**

```typescript
import { apiClient } from './apiClient';
import type {
  NotificationFilterParams,
  NotificationItem,
  NotificationPaginationResponse,
} from '../types';

export const notificationService = {
  getMyNotifications: async (
    params?: NotificationFilterParams
  ): Promise<NotificationPaginationResponse> => {
    const queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.type) queryParams.type = params.type;
    if (params?.isRead !== undefined) queryParams.isRead = String(params.isRead);

    const response = await apiClient.get<NotificationPaginationResponse>(
      '/notifications/my',
      { params: queryParams }
    );
    return response.data;
  },

  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await apiClient.get<{ unreadCount: number }>(
      '/notifications/my/unread-count'
    );
    return response.data;
  },

  markAsRead: async (id: string): Promise<NotificationItem> => {
    const response = await apiClient.put<NotificationItem>(
      `/notifications/my/${id}/read`
    );
    return response.data;
  },

  markAllAsRead: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>(
      '/notifications/my/read-all'
    );
    return response.data;
  },

  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/notifications/my/${id}`
    );
    return response.data;
  },
};
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd frontend && npm run build --dry-run` or `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/notificationService.ts
git commit -m "feat(frontend): add notification types and api service client"
```

---

### Task 3: Zustand Store with Polling & Optimistic Updates

**Files:**
- Create: `frontend/src/stores/useNotificationStore.ts`
- Test: `frontend/src/stores/__tests__/useNotificationStore.spec.ts`

- [ ] **Step 1: Write unit tests for `useNotificationStore`**

Create `frontend/src/stores/__tests__/useNotificationStore.spec.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from '../useNotificationStore';
import { notificationService } from '../../services/notificationService';

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
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.getState().clearState();
    localStorage.setItem('mobilecommerce_access_token', 'test-token');
  });

  it('initializes with default values', () => {
    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.items).toEqual([]);
    expect(state.previewList).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it('fetchUnreadCount updates unreadCount', async () => {
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 5 });
    await useNotificationStore.getState().fetchUnreadCount();
    expect(useNotificationStore.getState().unreadCount).toBe(5);
  });

  it('markAsRead performs optimistic update and calls service', async () => {
    const mockItem = {
      id: 'n1',
      userId: 'u1',
      type: 'ORDER' as const,
      channel: 'IN_APP' as const,
      title: 'Order shipped',
      message: 'Your order is on the way',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    useNotificationStore.setState({
      unreadCount: 2,
      previewList: [mockItem],
      items: [mockItem],
    });

    vi.mocked(notificationService.markAsRead).mockResolvedValue({
      ...mockItem,
      isRead: true,
      readAt: new Date().toISOString(),
    });

    await useNotificationStore.getState().markAsRead('n1');

    expect(useNotificationStore.getState().unreadCount).toBe(1);
    expect(useNotificationStore.getState().items[0].isRead).toBe(true);
    expect(useNotificationStore.getState().previewList[0].isRead).toBe(true);
    expect(notificationService.markAsRead).toHaveBeenCalledWith('n1');
  });

  it('markAllAsRead sets unreadCount to 0 and all items to read', async () => {
    const mockItems = [
      { id: '1', userId: 'u1', type: 'ORDER' as const, channel: 'IN_APP' as const, title: 'T1', message: 'M1', isRead: false, createdAt: '' },
      { id: '2', userId: 'u1', type: 'PAYMENT' as const, channel: 'IN_APP' as const, title: 'T2', message: 'M2', isRead: false, createdAt: '' },
    ];
    useNotificationStore.setState({ unreadCount: 2, items: mockItems, previewList: mockItems });
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue({ success: true });

    await useNotificationStore.getState().markAllAsRead();

    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(useNotificationStore.getState().items.every((i) => i.isRead)).toBe(true);
    expect(useNotificationStore.getState().previewList.every((i) => i.isRead)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/stores/__tests__/useNotificationStore.spec.ts`
Expected: FAIL with module `useNotificationStore` not found.

- [ ] **Step 3: Implement `useNotificationStore.ts`**

Create `frontend/src/stores/useNotificationStore.ts`:
```typescript
import { create } from 'zustand';
import type {
  NotificationFilterParams,
  NotificationItem,
} from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationState {
  unreadCount: number;
  previewList: NotificationItem[];
  items: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
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

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  previewList: [],
  items: [],
  pagination: { page: 1, limit: 10, total: 0 },
  activeFilter: { page: 1, limit: 10 },
  isLoading: false,
  isPreviewLoading: false,
  error: null,

  fetchUnreadCount: async () => {
    const token = localStorage.getItem('mobilecommerce_access_token');
    if (!token) {
      set({ unreadCount: 0 });
      return;
    }
    try {
      const res = await notificationService.getUnreadCount();
      set({ unreadCount: res.unreadCount || 0 });
    } catch {
      // Keep silent on background polling failure
    }
  },

  fetchPreviewList: async () => {
    const token = localStorage.getItem('mobilecommerce_access_token');
    if (!token) return;
    try {
      set({ isPreviewLoading: true });
      const res = await notificationService.getMyNotifications({ page: 1, limit: 8 });
      set({ previewList: res.data || [], isPreviewLoading: false });
    } catch (err: any) {
      set({ isPreviewLoading: false, error: err.message });
    }
  },

  fetchNotifications: async (filter?: NotificationFilterParams) => {
    const token = localStorage.getItem('mobilecommerce_access_token');
    if (!token) return;
    try {
      set({ isLoading: true, error: null });
      const currentFilter = { ...get().activeFilter, ...filter };
      const res = await notificationService.getMyNotifications(currentFilter);
      set({
        items: res.data || [],
        pagination: { page: res.page, limit: res.limit, total: res.total },
        activeFilter: currentFilter,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Lỗi khi tải thông báo' });
    }
  },

  markAsRead: async (id: string) => {
    const { items, previewList, unreadCount } = get();
    const targetItem = items.find((i) => i.id === id) || previewList.find((i) => i.id === id);
    const wasUnread = targetItem && !targetItem.isRead;

    // Optimistic update
    set({
      unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
      items: items.map((i) => (i.id === id ? { ...i, isRead: true, readAt: new Date().toISOString() } : i)),
      previewList: previewList.map((i) => (i.id === id ? { ...i, isRead: true, readAt: new Date().toISOString() } : i)),
    });

    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      // Rollback on failure
      set({ unreadCount, items, previewList });
      throw err;
    }
  },

  markAllAsRead: async () => {
    const { items, previewList, unreadCount } = get();
    const now = new Date().toISOString();

    // Optimistic update
    set({
      unreadCount: 0,
      items: items.map((i) => ({ ...i, isRead: true, readAt: i.readAt || now })),
      previewList: previewList.map((i) => ({ ...i, isRead: true, readAt: i.readAt || now })),
    });

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      set({ unreadCount, items, previewList });
      throw err;
    }
  },

  deleteNotification: async (id: string) => {
    const { items, previewList, unreadCount, pagination } = get();
    const target = items.find((i) => i.id === id) || previewList.find((i) => i.id === id);
    const wasUnread = target && !target.isRead;

    set({
      unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
      items: items.filter((i) => i.id !== id),
      previewList: previewList.filter((i) => i.id !== id),
      pagination: { ...pagination, total: Math.max(0, pagination.total - 1) },
    });

    try {
      await notificationService.deleteNotification(id);
    } catch (err) {
      set({ unreadCount, items, previewList, pagination });
      throw err;
    }
  },

  startPolling: (intervalMs = 60000) => {
    get().fetchUnreadCount();

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        get().fetchUnreadCount();
      }
    }, intervalMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        get().fetchUnreadCount();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  },

  clearState: () => {
    set({
      unreadCount: 0,
      previewList: [],
      items: [],
      pagination: { page: 1, limit: 10, total: 0 },
      activeFilter: { page: 1, limit: 10 },
      isLoading: false,
      isPreviewLoading: false,
      error: null,
    });
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- src/stores/__tests__/useNotificationStore.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/useNotificationStore.ts frontend/src/stores/__tests__/useNotificationStore.spec.ts
git commit -m "feat(frontend): implement useNotificationStore with optimistic updates and polling"
```

---

### Task 4: Header Bell Icon & NotificationDropdown Component

**Files:**
- Create: `frontend/src/components/common/NotificationDropdown.tsx`
- Modify: `frontend/src/components/common/Navbar.tsx:220-255, 470-495`

- [ ] **Step 1: Create `NotificationDropdown.tsx`**

Create `frontend/src/components/common/NotificationDropdown.tsx`:
- Render Bell button with unread count badge.
- Open/close floating popover card when clicked.
- Handle outside click and Escape key.
- Show quick action "Đánh dấu tất cả đã đọc".
- Render list of 8 items with corresponding contextual icon and color based on `type`.
- Show relative time (e.g., "5 phút trước", "Hôm qua").
- Provide link "Xem tất cả thông báo" pointing to `/notifications`.

- [ ] **Step 2: Integrate `NotificationDropdown` into `Navbar.tsx`**

Edit `frontend/src/components/common/Navbar.tsx`:
- Import `NotificationDropdown` and `useNotificationStore`.
- Place `<NotificationDropdown />` between Wishlist and Cart icon on desktop header.
- Add notification link / dropdown into Mobile navigation drawer as well.
- Initialize `startPolling()` inside `Navbar`'s `useEffect` when `user` is authenticated, and clean up polling on unmount/logout.

- [ ] **Step 3: Verify visually in browser or unit test**

Run: `cd frontend && npm test`
Verify that `Navbar` renders without crashing when user is logged in or out.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/common/NotificationDropdown.tsx frontend/src/components/common/Navbar.tsx
git commit -m "feat(frontend): integrate notification bell and dropdown popover in navbar"
```

---

### Task 5: NotificationDetailModal Component

**Files:**
- Create: `frontend/src/pages/storefront/Notifications/NotificationDetailModal.tsx`

- [ ] **Step 1: Implement `NotificationDetailModal.tsx`**

Create `frontend/src/pages/storefront/Notifications/NotificationDetailModal.tsx`:
```typescript
import React from 'react';
import { X, Calendar, Bell, CheckCircle2 } from 'lucide-react';
import type { NotificationItem } from '../../../types';

interface NotificationDetailModalProps {
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
  if (!isOpen || !notification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {notification.type}
              </span>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(notification.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {notification.title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {notification.message}
          </p>

          {notification.data && Object.keys(notification.data).length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-600">
              {notification.data.orderId && (
                <p>Mã đơn hàng: <strong className="text-slate-800">{notification.data.orderId}</strong></p>
              )}
              {notification.data.code && (
                <p>Mã ưu đãi: <strong className="text-amber-600">{notification.data.code}</strong></p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Đóng
          </button>
          {onActionClick && (
            <button
              type="button"
              onClick={() => {
                onActionClick(notification);
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
            >
              Xem chi tiết liên quan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/storefront/Notifications/NotificationDetailModal.tsx
git commit -m "feat(frontend): add NotificationDetailModal component"
```

---

### Task 6: Dedicated Notifications Page (`/notifications`) & Routing

**Files:**
- Create: `frontend/src/pages/storefront/Notifications/NotificationPage.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx:15-20, 60-70`

- [ ] **Step 1: Create `NotificationPage.tsx`**

Create `frontend/src/pages/storefront/Notifications/NotificationPage.tsx`:
- Render category filter tabs: Tất cả (`ALL`), Đơn hàng (`ORDER`), Thanh toán (`PAYMENT`), Khuyến mại (`PROMOTION`), Bảo hành (`WARRANTY`), Hệ thống (`SYSTEM`).
- Render toggle/checkbox "Chỉ hiện chưa đọc".
- Render button "Đánh dấu tất cả đã đọc" with icon `CheckCheck`.
- Render list of notification cards with:
  - Contextual icon according to type.
  - Title and full formatted message.
  - Read/unread visual distinction (blue highlight for unread).
  - Time formatted nicely.
  - Actions: Click to read & navigate, and Delete button with confirmation/instant toast.
- Render `StorefrontPagination` component when total items > limit.
- Handle Loading skeleton states, Empty states per tab, and Error states with retry.

- [ ] **Step 2: Register `/notifications` route in `AppRoutes.tsx`**

Edit `frontend/src/routes/AppRoutes.tsx`:
- Import `NotificationPage`.
- Add protected route inside `<Route element={<StorefrontLayout />}>`:
```tsx
<Route
  path="/notifications"
  element={
    <ProtectedRoute>
      <NotificationPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Verify TypeScript compilation and route tests**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/storefront/Notifications/NotificationPage.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(frontend): create full NotificationPage and register /notifications route"
```

---

### Task 7: Contextual Redirection & Action Links

**Files:**
- Modify: `frontend/src/components/common/NotificationDropdown.tsx`
- Modify: `frontend/src/pages/storefront/Notifications/NotificationPage.tsx`

- [ ] **Step 1: Implement helper `handleNotificationNavigation`**

Ensure that whenever a notification is clicked in either dropdown or page:
1. `markAsRead(notification.id)` is dispatched.
2. Route navigation based on notification data/type:
   - If `notification.data?.orderId` or `type === 'ORDER'`: Navigate to `/orders/${notification.data?.orderId || ''}`.
   - If `type === 'WARRANTY'`: Navigate to `/warranty-lookup`.
   - If `type === 'PROMOTION'`: Navigate to `/products` or open voucher modal.
   - If `type === 'SYSTEM'` or general text: Open `NotificationDetailModal`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/common/NotificationDropdown.tsx frontend/src/pages/storefront/Notifications/
git commit -m "feat(frontend): wire contextual redirection and detail modal on notification click"
```

---

### Task 8: End-to-End System Verification

**Files:**
- Test verification across backend and frontend.

- [ ] **Step 1: Run Backend Tests**

Run: `cd backend && npm test`
Expected: All backend unit tests pass, including `notifications.spec.ts`.

- [ ] **Step 2: Run Frontend Tests**

Run: `cd frontend && npm test`
Expected: All frontend tests pass, including `useNotificationStore.spec.ts`.

- [ ] **Step 3: Run Frontend Production Build**

Run: `cd frontend && npm run build`
Expected: Build succeeds without TypeScript or bundling errors.

- [ ] **Step 4: Verify with Seeded Notifications Data**

Log in as demo customer (`customer@test.com` / `Customer@123`).
Verify:
1. Bell badge appears with unread count.
2. Clicking bell opens dropdown popover with 5 seeded notifications.
3. Clicking an unread item marks it as read and unread badge decrements.
4. Clicking "Đánh dấu tất cả đã đọc" clears the badge.
5. Clicking "Xem tất cả thông báo" navigates to `/notifications`.
6. Tab filtering (Đơn hàng, Khuyến mại, Thanh toán...) fetches filtered data correctly from the backend.

- [ ] **Step 5: Final Git Commit**

```bash
git add .
git commit -m "feat(notifications): complete end-to-end notification system"
```

