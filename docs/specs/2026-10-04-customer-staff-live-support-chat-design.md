# Đặc tả Thiết kế: Hệ thống Hỗ trợ Trực tuyến & Nhắn tin Khách hàng - Nhân viên (Live Support Chat)

**Ngày tạo:** 2026-10-04  
**Trạng thái:** Đã duyệt (Approved)  
**Mục tiêu:** Xây dựng tính năng hỗ trợ trực tuyến và nhắn tin 2 chiều giữa khách hàng và nhân viên thông qua Floating Live Chat Widget ở Storefront, tích hợp trực tiếp vào hệ thống Ticket & TicketMessage hiện có với cơ chế Smart Polling thời gian thực.

---

## 1. Bối cảnh & Mục tiêu
- **Hiện trạng:**
  - Hệ thống backend đã có module `tickets` (`Ticket`, `TicketMessage`) với đầy đủ các API tạo vé, trả lời vé, phân công nhân viên, đóng vé và ghi chú nội bộ.
  - Phía Admin đã có `AdminTicketsPage` và `AdminTicketDetailPage` để quản lý và phản hồi.
  - Phía Khách hàng (Storefront) chỉ có tab quản lý vé trong trang cá nhân (`ProfilePage`), chưa có kênh nhắn tin hỗ trợ trực tiếp, nhanh chóng và tiện lợi khi đang xem hàng trên website.
- **Mục tiêu:**
  - Cung cấp Floating Live Chat Widget (bong bóng chat) cố định ở góc dưới bên phải màn hình Storefront (áp dụng cho tất cả các trang khách hàng).
  - Khách hàng đã đăng nhập có thể mở chat, gửi thắc mắc, nhận phản hồi từ nhân viên CSKH theo thời gian thực (Smart Polling 3s).
  - Nhân viên CSKH nhận tin nhắn và phản hồi trực tiếp từ trang chi tiết vé `/admin/tickets/:id` (cũng được bổ sung Smart Polling).

---

## 2. Kiến trúc & Thiết kế Chi tiết

### 2.1. Storefront Floating Chat Widget (`LiveSupportChatWidget.tsx`)
- **Vị trí hiển thị:** `fixed bottom-6 right-6 z-50` nằm trên `StorefrontLayout.tsx`.
- **Trạng thái thu gọn (Floating Button):**
  - Nút tròn bo tròn mềm mại (`w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all`).
  - Icon `MessageCircle` hoặc `Headphones`, hiển thị tooltip: *"Cần hỗ trợ? Chat ngay"*.
  - Có badge hiển thị số tin nhắn chưa đọc hoặc chấm xanh trực tuyến.
- **Trạng thái mở rộng (Chat Window Modal/Card):**
  - Kích thước: `w-[380px] h-[520px] max-h-[85vh]` (trên desktop), hiển thị responsive linh hoạt trên mobile.
  - **Header:**
    - Tiêu đề: *"Hỗ trợ khách hàng PhoneShop"*, trạng thái trực tuyến (*"Nhân viên sẵn sàng hỗ trợ"*).
    - Nút thu nhỏ (`Minus`), nút đóng (`X`), nút làm mới (`RefreshCw`).
  - **Body - Phân luồng trải nghiệm:**
    1. *Khách chưa đăng nhập:* Hiển thị thông báo thân thiện: *"Vui lòng đăng nhập để bắt đầu trò chuyện với nhân viên hỗ trợ"* kèm nút *"Đăng nhập ngay"* trỏ tới `/login`.
    2. *Khách đã đăng nhập & Chưa có vé mở:* Hiển thị form khởi tạo chat nhanh:
       - Chọn chủ đề hỗ trợ: *Tư vấn sản phẩm*, *Tra cứu đơn hàng*, *Bảo hành & Khiếu nại*, *Chủ đề khác*.
       - Ô nhập tin nhắn đầu tiên.
       - Nút *"Bắt đầu trò chuyện"*.
    3. *Khách đã đăng nhập & Đang có vé mở:* Hiển thị danh sách tin nhắn dạng bong bóng thoại:
       - Tin nhắn của khách: Căn phải, nền xanh `bg-blue-600 text-white`.
       - Tin nhắn của nhân viên: Căn trái, nền `bg-slate-100 text-slate-800`, kèm tên nhân viên và nhãn *"CSKH"*.
       - Tự động cuộn xuống tin nhắn mới nhất.
       - Tin nhắn nội bộ (`isInternal: true`): Tuyệt đối không hiển thị cho khách hàng.
    4. *Vé đã đóng (`CLOSED` hoặc `RESOLVED`):* Hiển thị banner thông báo cuộc trò chuyện đã kết thúc, kèm nút *"Tạo yêu cầu mới"*.
  - **Footer Input:**
    - Input nhập tin nhắn hỗ trợ gõ phím `Enter` để gửi, `Shift + Enter` để xuống dòng.
    - Nút bấm `Gửi` (`SendIcon`).

### 2.2. Cơ chế Đồng bộ Tin nhắn (Smart Polling)
- **Khi Widget Mở:**
  - Kích hoạt `setInterval` với tần suất **3.5 giây** gọi API `GET /tickets/:id` để kéo tin nhắn mới nhất.
  - Cập nhật danh sách tin nhắn mà không làm giật lag giao diện (đối chiếu `id` tin nhắn để chỉ thêm tin mới).
  - Tự động cuộn xuống đáy khi có tin nhắn mới đến.
- **Khi Widget Đóng:**
  - Hủy ngay `interval` để tiết kiệm băng thông và tài nguyên CPU của trình duyệt và máy chủ.
- **Khi Gửi Tin:**
  - Áp dụng Optimistic Update: Thêm ngay tin nhắn của khách vào UI trong lúc chờ API trả về, kèm trạng thái đang gửi (`sending`) và nút thử lại nếu thất bại.

### 2.3. Nâng cấp Phía Nhân viên (`AdminTicketDetailPage.tsx`)
- Thêm cơ chế Smart Polling (3.5 giây) khi trang chi tiết vé `/admin/tickets/:id` đang mở.
- Khi khách hàng nhắn từ Storefront, nhân viên sẽ thấy tin nhắn mới xuất hiện tức thì trong khung hội thoại mà không cần tải lại trang.

---

## 3. Quản lý Trạng thái & Xử lý Ngoại lệ (State Coverage)
| Trạng thái | Hành vi Giao diện |
|------------|-------------------|
| **Chưa đăng nhập** | Banner nhắc đăng nhập + nút "Đăng nhập ngay" (chuyển sang `/login`). |
| **Đang tải ban đầu** | Hiển thị 3 bong bóng tin nhắn Skeleton nhấp nháy. |
| **Trống (Chưa có cuộc trò chuyện)** | Màn hình khởi tạo chọn chủ đề và nhập tin nhắn đầu tiên. |
| **Đang gửi tin** | Tin nhắn hiển thị mờ nhẹ kèm biểu tượng xoay hoặc đồng hồ nhỏ. |
| **Gửi thất bại (Mất mạng)** | Icon cảnh báo đỏ cạnh tin nhắn + nút "Thử lại". |
| **Cuộc trò chuyện đã đóng** | Banner màu xám/vàng: "Phiên hỗ trợ đã hoàn tất", nút "Bắt đầu cuộc trò chuyện mới". |

---

## 4. Kế hoạch Kiểm thử & Xác minh (Verification Plan)
1. **Unit Test Widget Storefront (`LiveSupportChatWidget.spec.tsx`):**
   - Kiểm tra mở/đóng widget.
   - Kiểm tra khi chưa đăng nhập: Hiển thị đúng lời nhắc đăng nhập.
   - Kiểm tra khi đã đăng nhập: Tải và hiển thị danh sách tin nhắn.
   - Kiểm tra gửi tin nhắn: Gọi đúng API `POST /tickets/:id/replies`.
   - Kiểm tra Smart Polling: Lắng nghe interval và gọi nạp tin nhắn định kỳ khi mở, dừng khi đóng.
2. **Unit Test Admin Polling (`AdminTicketDetailPage.spec.tsx`):**
   - Xác nhận poll tin nhắn mới định kỳ khi đang xem chi tiết vé.
3. **Build & Type Check:**
   - Chạy `npx tsc -b` và `npm run build` không có lỗi.
