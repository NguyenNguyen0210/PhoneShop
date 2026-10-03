# Design Document: Notification System (Storefront & API)

**Date**: 2026-10-03  
**Status**: Approved  
**Author**: AI Assistant & Engineering Team  
**Scope**: Fullstack (NestJS Backend + React/TypeScript Frontend)

---

## 1. Executive Summary
Hệ thống Notification (Thông báo) hiện tại đã có cấu trúc cơ bản ở Backend (Prisma schema `Notification`, NestJS `NotificationsController`, `NotificationsService`), tuy nhiên Frontend chưa có bất kỳ giao diện nào để người dùng tiếp cận (thiếu icon chuông trên Header, thiếu Dropdown Popup xem nhanh, thiếu Trang chi tiết và chưa kết nối các API đánh dấu đã đọc).

Thiết kế này hoàn thiện toàn diện hệ thống Notification cho người dùng khách hàng (Storefront Customer):
1. **Nâng cấp Backend API**: Bổ sung bộ lọc `type` và `isRead` cho endpoint `GET /notifications/my` để hỗ trợ phân trang và lọc danh mục chuẩn xác từ database.
2. **Quản lý trạng thái Frontend (Zustand Store)**: Xây dựng `useNotificationStore` để quản lý `unreadCount`, danh sách xem nhanh (preview list), danh sách trang thông báo, optimistic update khi đọc/xóa, và cơ chế Polling thông minh (60s khi tab active).
3. **Header Bell & Dropdown Popup (`NotificationDropdown.tsx`)**: Đặt icon chuông trên Navbar giữa Yêu thích và Giỏ hàng, hiển thị badge số lượng chưa đọc, popup danh sách 6-8 thông báo mới nhất, nút Đánh dấu tất cả đã đọc, và liên kết xem tất cả.
4. **Trang Thông báo Độc lập (`/notifications` - `NotificationPage.tsx`)**: Trang chi tiết với thanh Tabs phân loại (Tất cả, Đơn hàng, Thanh toán, Khuyến mại, Bảo hành, Hệ thống), bộ lọc Chưa đọc, phân trang `StorefrontPagination`, nút xóa, và điều hướng ngữ cảnh khi click vào thông báo.

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                      Client (React)                    │
│                                                        │
│  [Navbar: Bell Icon + Badge] <──┐                      │
│               │                 │                      │
│               ▼                 │                      │
│  [NotificationDropdown]         │ (Sync State via      │
│  (Quick preview 6-8 items)      │  Zustand Store)      │
│               │                 │                      │
│               ▼                 │                      │
│  [Page: /notifications] ────────┘                      │
│  (Tabs, Filters, Pagination)                           │
│               │                                        │
│               ▼                                        │
│  useNotificationStore (Zustand)                        │
│   ├── unreadCount, previewList, items, pagination      │
│   └── Polling (60s visibility-aware)                   │
│               │                                        │
│               ▼                                        │
│  notificationService (Axios / apiClient)               │
└───────────────┼────────────────────────────────────────┘
                │ HTTP Requests (Bearer JWT)
                ▼
┌────────────────────────────────────────────────────────┐
│                   Backend (NestJS API)                 │
│                                                        │
│  NotificationsController                               │
│   ├── GET  /notifications/my?page&limit&type&isRead    │
│   ├── GET  /notifications/my/unread-count              │
│   ├── PUT  /notifications/my/:id/read                  │
│   ├── PUT  /notifications/my/read-all                  │
│   └── DELETE /notifications/my/:id                     │
│                                                        │
│  NotificationsService                                  │
│   └── PrismaService                                    │
│               │                                        │
│               ▼                                        │
│        PostgreSQL Database                             │
│     (Table: notifications)                             │
└────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Specifications

### 3.1 Backend Specifications

#### 3.1.1 Query Parameters cho `GET /notifications/my`
* File: `backend/src/modules/notifications/notifications.controller.ts`
* Method: `getMyNotifications`
* Hỗ trợ các query parameter:
  * `page?: string` (số nguyên dương, mặc định `1`)
  * `limit?: string` (số nguyên dương, mặc định `20`, tối đa `100`)
  * `type?: NotificationType` (`ORDER`, `PAYMENT`, `SHIPPING`, `PROMOTION`, `SYSTEM`, `WARRANTY`, `RETURN`)
  * `isRead?: string` (`'true'` hoặc `'false'`)

#### 3.1.2 Xử lý Service & Database Query
* File: `backend/src/modules/notifications/notifications.service.ts`
* Xây dựng điều kiện `where`:
  ```typescript
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(type ? { type } : {}),
    ...(isRead !== undefined ? { isRead: isRead === 'true' } : {}),
  };
  ```
* Truy vấn song song đếm tổng số bản ghi và lấy danh sách có phân trang:
  ```typescript
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
  ```

#### 3.1.3 Các Endpoint Hiện Có Giữ Nguyên
* `GET /notifications/my/unread-count`: Trả về `{ unreadCount: number }`.
* `PUT /notifications/my/:id/read`: Đánh dấu một thông báo đã đọc, cập nhật `readAt`.
* `PUT /notifications/my/read-all`: Đánh dấu tất cả thông báo của người dùng đã đọc.
* `DELETE /notifications/my/:id`: Xóa thông báo của người dùng (kiểm tra quyền sở hữu `userId`).

---

### 3.2 Frontend Data Models & Services

#### 3.2.1 TypeScript Interfaces (`frontend/src/types/index.ts`)
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

#### 3.2.2 API Service Client (`frontend/src/services/notificationService.ts`)
* `getMyNotifications(params?: NotificationFilterParams): Promise<NotificationPaginationResponse>`
* `getUnreadCount(): Promise<{ unreadCount: number }>`
* `markAsRead(id: string): Promise<NotificationItem>`
* `markAllAsRead(): Promise<{ success: boolean }>`
* `deleteNotification(id: string): Promise<{ success: boolean }>`

#### 3.2.3 Zustand State Store (`frontend/src/stores/useNotificationStore.ts`)
* **State**:
  * `unreadCount: number`: Số lượng thông báo chưa đọc.
  * `previewList: NotificationItem[]`: Danh sách 6–8 thông báo xem nhanh cho dropdown.
  * `items: NotificationItem[]`: Danh sách thông báo đầy đủ cho trang `/notifications`.
  * `pagination: { page: number; limit: number; total: number }`: Metadata phân trang.
  * `activeFilter: NotificationFilterParams`: Bộ lọc đang áp dụng.
  * `isLoading: boolean`: Trạng thái tải dữ liệu trang.
  * `isPreviewLoading: boolean`: Trạng thái tải dữ liệu popup.
* **Actions**:
  * `fetchUnreadCount()`: Gọi API và cập nhật `unreadCount`.
  * `fetchPreviewList()`: Gọi `getMyNotifications({ page: 1, limit: 8 })` cho popup.
  * `fetchNotifications(filter?: NotificationFilterParams)`: Gọi API tải trang theo bộ lọc.
  * `markAsRead(id: string)`:
    * Optimistic update: Giảm `unreadCount` đi 1, chuyển `isRead: true` trong `previewList` và `items`.
    * Gọi `notificationService.markAsRead(id)`. Hoàn tác nếu lỗi.
  * `markAllAsRead()`:
    * Optimistic update: Chuyển toàn bộ thành `isRead: true`, đặt `unreadCount = 0`.
    * Gọi `notificationService.markAllAsRead()`.
  * `deleteNotification(id: string)`:
    * Loại bỏ item khỏi `items` và `previewList`, giảm `total` và giảm `unreadCount` nếu item chưa đọc.
    * Gọi `notificationService.deleteNotification(id)`.
  * `startPolling(intervalMs?: number)` & `stopPolling()`:
    * Chạy timer 60s gọi `fetchUnreadCount()`.
    * Lắng nghe sự kiện `visibilitychange`: Tạm dừng khi tab ẩn, refetch ngay khi mở lại tab.

---

### 3.3 UI & UX Component Specifications

#### 3.3.1 Icon Chuông & Dropdown (`Navbar.tsx` & `NotificationDropdown.tsx`)
* **Vị trí**: Đặt giữa icon `Heart` (Wishlist) và icon `ShoppingCart` (Giỏ hàng) trên thanh điều hướng chính, hiển thị khi người dùng đã đăng nhập (`user !== null`).
* **Badge chưa đọc**:
  * Hiển thị khi `unreadCount > 0`.
  * Số hiển thị: `unreadCount > 99 ? '99+' : unreadCount`.
  * Màu nền `bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-75`.
* **Dropdown Menu**:
  * Chiều rộng 380px, bo tròn `rounded-2xl`, bóng đổ `shadow-2xl border border-slate-200/90`.
  * **Header**: "Thông báo", badge số chưa đọc, nút "Đánh dấu tất cả đã đọc" (icon `CheckCheck`, disabled khi `unreadCount === 0`).
  * **Danh sách cuộn (max-height 420px)**:
    * Icon đại diện theo `type` (gồm nền màu nhẹ và icon Lucide tương ứng).
    * Tiêu đề thông báo đậm, nội dung tóm tắt (2 dòng truncate).
    * Thời gian tương đối (VD: "10 phút trước", "Hôm qua").
    * Chấm tròn xanh chỉ thị chưa đọc.
  * **Footer**: Nút "Xem tất cả thông báo" dẫn sang trang `/notifications`.

#### 3.3.2 Trang Thông báo (`/notifications` - `NotificationPage.tsx`)
* **Route**: `/notifications`, được bọc bởi `ProtectedRoute`.
* **Layout**:
  * Breadcrumb: `Trang chủ > Thông báo`.
  * Tiêu đề trang nổi bật với số lượng chưa đọc.
* **Thanh Danh mục (Category Tabs)**:
  * Tất cả (`ALL`)
  * Đơn hàng (`ORDER`)
  * Thanh toán (`PAYMENT`)
  * Khuyến mại (`PROMOTION`)
  * Bảo hành (`WARRANTY`)
  * Hệ thống (`SYSTEM`)
* **Thanh Công cụ**:
  * Checkbox/Button lọc: "Chỉ hiện chưa đọc".
  * Nút "Đánh dấu tất cả đã đọc".
* **Item Thông báo Chi tiết**:
  * Card hiển thị trạng thái đã đọc/chưa đọc rõ rệt.
  * Nút hành động trực tiếp: "Xem chi tiết" (điều hướng ngữ cảnh) và "Xóa" (`Trash2`).
* **Phân trang**: Tích hợp `StorefrontPagination` chuẩn của dự án.
* **Trạng thái giao diện đầy đủ (UX State Coverage)**:
  * *Loading*: Skeleton placeholder nhấp nháy 4 items.
  * *Empty*: Hình minh họa chuông rỗng + thông điệp "Không có thông báo nào trong mục này".
  * *Error*: Báo lỗi kết nối + nút Thử lại.

#### 3.3.3 Hành vi Điều hướng Ngữ cảnh (Contextual Redirection)
* Khi click vào một thông báo:
  * Đánh dấu đã đọc (`markAsRead(id)`).
  * Nếu thông báo chứa `data.orderId` hoặc thuộc loại `ORDER`/`PAYMENT`: Chuyển hướng tới `/orders/${data.orderId}` (hoặc `/profile?tab=orders` nếu không có ID cụ thể).
  * Nếu thuộc loại `WARRANTY`: Chuyển hướng tới `/warranty-lookup`.
  * Nếu thuộc loại `PROMOTION`: Chuyển hướng tới `/cart` hoặc mở modal Voucher.
  * Nếu là `SYSTEM` hoặc thông báo chung: Hiển thị Modal xem chi tiết nội dung đầy đủ.

---

## 4. Testing & Verification Plan

1. **Backend Unit / Integration Tests**:
   * Kiểm thử `GET /notifications/my` với các tham số `page`, `limit`, `type`, `isRead`.
   * Kiểm thử `PUT /notifications/my/:id/read` và `PUT /notifications/my/read-all`.
   * Kiểm thử tính bảo mật: Người dùng A không thể đọc/xóa thông báo của Người dùng B.
2. **Frontend Component & Store Tests**:
   * Kiểm thử `useNotificationStore`: Hành vi fetch unread count, optimistic update khi đọc/xóa.
   * Kiểm thử hiển thị Badge và đóng mở Dropdown trên Header.
   * Kiểm thử chuyển tab và phân trang trên `/notifications`.
   * Kiểm thử hành vi click thông báo và điều hướng ngữ cảnh.
3. **End-to-End Verification**:
   * Đăng nhập với tài khoản có sẵn dữ liệu thông báo seed (`seed_demo.ts`).
   * Xác nhận số badge xuất hiện chính xác.
   * Bấm đọc thông báo -> badge giảm ngay lập tức.
   * Bấm "Đánh dấu tất cả đã đọc" -> badge biến mất.
   * Chuyển tab trên trang `/notifications` -> dữ liệu lọc chuẩn xác từ backend.
