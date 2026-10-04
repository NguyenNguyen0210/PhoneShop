# Kế hoạch Thực hiện: Hệ thống Hỗ trợ Trực tuyến & Nhắn tin Khách hàng - Nhân viên (Live Support Chat)

> **For agentic workers:** REQUIRED SUB-SKILL: Use dispatching-parallel-agents or subagent-driven-development to implement tasks across parallel streams. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng Floating Live Chat Widget ở Storefront cho khách hàng nhắn tin hỗ trợ với nhân viên CSKH, đồng bộ hóa 2 chiều với hệ thống Ticket & TicketMessage hiện có thông qua cơ chế Smart Polling và merge vào branch `Nguyen`.

**Architecture:** 
- Phía Storefront: Floating Live Chat Widget (`LiveSupportChatWidget.tsx`) tích hợp vào `StorefrontLayout`, quản lý phiên chat (nạp vé đang mở hoặc khởi tạo vé mới), gửi tin nhắn qua `ticketService`, và tự động thăm dò tin nhắn mới bằng Smart Polling (3.5s khi mở, ngắt khi đóng).
- Phía Admin: Nâng cấp `AdminTicketDetailPage.tsx` với cơ chế Smart Polling để nhân viên nhận tin nhắn mới từ khách hàng theo thời gian thực mà không cần tải lại trang.
- Chia làm 2 luồng song song độc lập hoàn toàn về file: Luồng 1 (Storefront Chat Widget) và Luồng 2 (Admin Ticket Realtime Polling & Quick Action Links).

**Tech Stack:** React 19, TypeScript, Lucide React, Ant Design, Zustand (useAuthStore), Vitest, Tailwind CSS.

---

## Danh mục tệp tin thay đổi (File Structure Map)

### Luồng 1: Storefront Live Support Chat Widget (Stream 1)
- Create: `frontend/src/components/storefront/LiveSupportChatWidget.tsx` (Component bong bóng chat nổi, quản lý mở/đóng, auth check, danh sách tin nhắn, form gửi tin và smart polling)
- Create: `frontend/src/components/storefront/__tests__/LiveSupportChatWidget.spec.tsx` (Unit test cho widget: mở/đóng, chưa login, đã login, gửi tin nhắn, polling)
- Modify: `frontend/src/layouts/StorefrontLayout.tsx` (Chèn `<LiveSupportChatWidget />` vào layout chung để hiển thị xuyên suốt mọi trang khách hàng)

### Luồng 2: Admin Ticket Realtime Polling & Integration (Stream 2)
- Modify: `frontend/src/pages/Admin/Tickets/AdminTicketDetailPage.tsx` (Thêm cơ chế auto polling 3.5s nạp tin nhắn mới khi đang xem chi tiết vé)
- Create: `frontend/src/pages/Admin/Tickets/__tests__/AdminTicketDetailPolling.spec.tsx` (Unit test kiểm tra cơ chế polling định kỳ trong trang chi tiết vé Admin)
- Modify: `frontend/src/components/storefront/Profile/components/TicketConversationModal.tsx` (Bổ sung polling 3.5s khi modal xem hội thoại vé của khách hàng đang mở)

---

## Luồng 1: Stream 1 - Storefront Live Support Chat Widget

### Task 1.1: Tạo Component `LiveSupportChatWidget.tsx`
**Files:**
- Create: `frontend/src/components/storefront/LiveSupportChatWidget.tsx`
- Modify: `frontend/src/layouts/StorefrontLayout.tsx`
- Test: `frontend/src/components/storefront/__tests__/LiveSupportChatWidget.spec.tsx`

- [ ] **Step 1: Viết test cho `LiveSupportChatWidget` (TDD)**
Tạo test `frontend/src/components/storefront/__tests__/LiveSupportChatWidget.spec.tsx`:
1. Render nút chat floating khi ở trạng thái thu gọn.
2. Click mở widget: Khi người dùng chưa đăng nhập (`user = null`), hiển thị banner yêu cầu đăng nhập và nút chuyển tới `/login`.
3. Khi người dùng đã đăng nhập: Gọi `ticketService.getMyTickets` để kiểm tra vé mở. Nếu có vé mở, gọi `ticketService.getTicketDetail` và hiển thị tin nhắn.
4. Gửi tin nhắn mới: Gọi `ticketService.replyTicket` và cập nhật danh sách tin nhắn.
5. Smart Polling: Kích hoạt timer polling khi mở widget và dọn dẹp khi đóng.

- [ ] **Step 2: Chạy test để xác nhận FAIL**
Run: `cd frontend; npx vitest run src/components/storefront/__tests__/LiveSupportChatWidget.spec.tsx`

- [ ] **Step 3: Triển khai `LiveSupportChatWidget.tsx`**
1. Lấy trạng thái đăng nhập từ `useAuthStore`.
2. UI Floating Button: Nút tròn góc phải dưới (`fixed bottom-6 right-6 z-50`) có icon `MessageCircle`, hiệu ứng hover, pulse nhẹ khi có tin nhắn chưa đọc.
3. UI Chat Window:
   - Header: Tên "Hỗ trợ trực tuyến PhoneShop", chấm xanh "Online", nút thu nhỏ và đóng.
   - Body:
     - Chưa đăng nhập: Form nhắc đăng nhập.
     - Chưa có vé mở: Form bắt đầu chat với danh mục (`Tư vấn sản phẩm`, `Đơn hàng`, `Bảo hành`, `Khác`) và ô nhập tin nhắn đầu tiên.
     - Đang có vé mở: Danh sách tin nhắn dạng bong bóng (tin khách hàng màu xanh căn phải, tin nhân viên màu xám căn trái). Bỏ qua tin nhắn có `isInternal: true`. Tự động cuộn xuống cuối (`messagesEndRef`).
   - Footer Input: Textarea/Input gõ tin nhắn, phím Enter gửi tin, nút gửi (`Send`).
4. Smart Polling: `useEffect` với `setInterval(3500)` khi widget mở và có `ticketId`. Clear interval khi unmount hoặc đóng widget.
5. Tích hợp vào `frontend/src/layouts/StorefrontLayout.tsx`.

- [ ] **Step 4: Chạy test để xác nhận PASS**
Run: `cd frontend; npx vitest run src/components/storefront/__tests__/LiveSupportChatWidget.spec.tsx`

---

## Luồng 2: Stream 2 - Admin Ticket Polling & Modal Sync

### Task 2.1: Thêm Polling vào Admin Ticket Detail & Customer Modal
**Files:**
- Modify: `frontend/src/pages/Admin/Tickets/AdminTicketDetailPage.tsx`
- Modify: `frontend/src/pages/storefront/Profile/components/TicketConversationModal.tsx`
- Create: `frontend/src/pages/Admin/Tickets/__tests__/AdminTicketDetailPolling.spec.tsx`

- [ ] **Step 1: Viết test cho Admin Ticket Polling**
Tạo file test `frontend/src/pages/Admin/Tickets/__tests__/AdminTicketDetailPolling.spec.tsx` kiểm tra:
1. Render trang chi tiết vé Admin và nạp dữ liệu vé ban đầu.
2. Sau mỗi chu kỳ interval (3.5s), tự động gọi lại `ticketService.getAdminTicketDetail` để cập nhật tin nhắn mới mà không làm mất nội dung đang gõ trong reply form.
3. Clear interval khi component unmount.

- [ ] **Step 2: Triển khai Polling trong `AdminTicketDetailPage.tsx`**
Thêm `useEffect` chạy polling định kỳ mỗi 3.5 giây gọi `loadTicket(false)` (không set lại `loading: true` toàn trang để tránh giật lag UI).

- [ ] **Step 3: Triển khai Polling trong `TicketConversationModal.tsx`**
Thêm polling định kỳ 3.5 giây khi modal đang mở (`open === true` và `ticketId` tồn tại).

- [ ] **Step 4: Chạy test xác nhận PASS**
Run: `cd frontend; npx vitest run src/pages/Admin/Tickets/__tests__/AdminTicketDetailPolling.spec.tsx`

---

## Giai đoạn Hoàn tất & Merge: Kiểm tra tích hợp và Merge vào `Nguyen`

### Task 3.1: Kiểm tra toàn diện & Merge
- [ ] **Step 1: Chạy kiểm tra TypeScript `tsc -b`**
Run: `cd frontend; npx tsc -b`

- [ ] **Step 2: Chạy kiểm tra toàn bộ test suites mới**
Run: `cd frontend; npx vitest run src/components/storefront/__tests__/LiveSupportChatWidget.spec.tsx src/pages/Admin/Tickets/__tests__/AdminTicketDetailPolling.spec.tsx`

- [ ] **Step 3: Build frontend production**
Run: `cd frontend; npm run build`

- [ ] **Step 4: Commit và Merge vào branch `Nguyen`**
Commit các thay đổi và merge an toàn vào branch `Nguyen`.
