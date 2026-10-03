# Customer Support (Hỗ trợ khách hàng) & Customer 360 Design Document

**Tài liệu đặc tả thiết kế hệ thống**  
**Ngày:** 2026-10-04  
**Trạng thái:** Đã phê duyệt  
**Phạm vi:** Backend (NestJS + Prisma + PostgreSQL) & Frontend (React + Ant Design + Vite + Tailwind CSS)

---

## 1. Tổng quan & Mục tiêu Nghiệp vụ (Overview & Goals)

Hệ thống thương mại điện tử hiện tại đang thiếu các công cụ hỗ trợ khách hàng và quản lý quan hệ khách hàng dành cho nhân viên (Staff):
1. **Xem thông tin khách hàng tổng quát / Customer 360**:
   - Các endpoint `GET /users` và `GET /users/:id` đang bị khóa cứng cho riêng `Role.ADMIN`.
   - Nhân viên CSKH (`STAFF`) chưa có giao diện tra cứu khách hàng và xem hồ sơ toàn cảnh (Customer 360: tổng chi tiêu, lịch sử đơn hàng, thiết bị bảo hành, hồ sơ trả góp, lịch sử khiếu nại).
2. **Xử lý Ticket / Trả lời Inquiry**:
   - Chưa có phân hệ Hỗ trợ khách hàng (Support Ticket) ở cả Backend lẫn Frontend.
   - Khách hàng chưa có kênh chính thức để gửi yêu cầu hỗ trợ, thắc mắc đơn hàng, khiếu nại đổi trả hoặc bảo hành trực tiếp từ website.
3. **Bảo mật dữ liệu nhạy cảm (Security & RBAC)**:
   - Nhân viên (`STAFF`) chỉ có quyền **Xem (Read-only)** đối với tài khoản khách hàng (`Role.USER`).
   - Tuyệt đối cấm `STAFF` xóa tài khoản, thay đổi quyền hạn (`Role`), mở/khóa tài khoản (`activate`/`deactivate`/`ban`) hoặc đặt lại mật khẩu của người dùng.
   - Mật khẩu luôn được băm (`bcrypt`) một chiều và tuyệt đối không bao giờ xuất hiện trong API response.

---

## 2. Kiến trúc & Phân quyền Bảo mật (Security & RBAC Architecture)

### 2.1 Ma trận phân quyền (Role-Based Access Matrix)

| Chức năng / Hành động | USER (Khách) | STAFF (Nhân viên CSKH) | ADMIN (Quản trị viên) |
| :--- | :---: | :---: | :---: |
| Tra cứu danh sách khách hàng (`GET /users`) | ❌ | ✅ (Chỉ thấy role `USER`) | ✅ (Toàn bộ user & role) |
| Xem chi tiết khách hàng & Customer 360 | ❌ (Chỉ xem `/users/profile`) | ✅ (Chỉ tài khoản `USER`) | ✅ (Toàn bộ user) |
| Cập nhật thông tin/khóa/xóa khách hàng | ❌ | ❌ (HTTP 403 Forbidden) | ✅ |
| Đổi quyền/gán vai trò (`Role`) | ❌ | ❌ (HTTP 403 Forbidden) | ✅ |
| Tạo Ticket hỗ trợ mới | ✅ (Cho chính mình) | ❌ (Staff xử lý vé) | ✅ |
| Xem danh sách Ticket cá nhân | ✅ (Chỉ vé của mình) | ❌ | ❌ |
| Quản lý & Phản hồi tất cả Ticket | ❌ | ✅ | ✅ |
| Xem & Viết ghi chú nội bộ (`isInternalNote`) | ❌ (Bị lọc bỏ hoàn toàn) | ✅ | ✅ |
| Đổi trạng thái vé / Phân công vé | ❌ | ✅ | ✅ |

### 2.2 Quy tắc bảo mật dữ liệu nhạy cảm
- **Loại bỏ thông tin nhạy cảm**: Trường `passwordHash`, `refreshTokens`, `passwordResetTokens` bị loại trừ ở tầng Prisma query (`select` cụ thể hoặc `delete (user as any).passwordHash`).
- **Staff Scope Enforcement**: Tại controller và service của `GET /users`, khi user thực hiện là `STAFF`, query Prisma tự động gắn thêm điều kiện `{ roles: { some: { role: { name: 'USER' } } } }` để Staff không thể xem danh sách nhân sự hay admin khác.

---

## 3. Thiết kế Cơ sở Dữ liệu (Prisma Schema)

### 3.1 Cập nhật Enum & Enum mới

```prisma
enum TicketCategory {
  ORDER_INQUIRY       // Thắc mắc đơn hàng & vận chuyển
  PRODUCT_INQUIRY     // Tư vấn thông số, tính năng sản phẩm
  WARRANTY_SUPPORT    // Hỗ trợ bảo hành & kỹ thuật
  RETURN_REFUND       // Khiếu nại đổi hàng / hoàn tiền
  PAYMENT_INSTALLMENT // Vấn đề thanh toán & xét duyệt trả góp
  ACCOUNT_GENERAL     // Thắc mắc chung / Tài khoản
}

enum TicketStatus {
  OPEN                // Chờ tiếp nhận
  IN_PROGRESS         // Đang giải quyết
  RESOLVED            // Đã giải quyết / Đã phản hồi
  CLOSED              // Đã đóng
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// Bổ sung SUPPORT vào NotificationType hiện tại:
enum NotificationType {
  ORDER
  PAYMENT
  SHIPPING
  PROMOTION
  SYSTEM
  WARRANTY
  RETURN
  SUPPORT             // Thông báo mới cho module CSKH
}
```

### 3.2 Models mới: `Ticket` và `TicketMessage`

```prisma
model Ticket {
  id            String          @id @default(uuid()) @db.Uuid
  code          String          @unique @db.VarChar(30) // TK-YYYYMM-XXXX
  title         String          @db.VarChar(255)
  category      TicketCategory  @default(ACCOUNT_GENERAL)
  priority      TicketPriority  @default(MEDIUM)
  status        TicketStatus    @default(OPEN)
  
  userId        String          @map("user_id") @db.Uuid
  user          User            @relation("UserTickets", fields: [userId], references: [id], onDelete: Cascade)
  
  orderId       String?         @map("order_id") @db.Uuid
  order         Order?          @relation(fields: [orderId], references: [id], onDelete: SetNull)
  
  assignedToId  String?         @map("assigned_to_id") @db.Uuid
  assignedTo    User?           @relation("StaffAssignedTickets", fields: [assignedToId], references: [id], onDelete: SetNull)
  
  lastRepliedAt DateTime?       @map("last_replied_at")
  resolvedAt    DateTime?       @map("resolved_at")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  messages      TicketMessage[]

  @@index([userId])
  @@index([status])
  @@index([assignedToId])
  @@index([createdAt])
  @@map("tickets")
}

model TicketMessage {
  id              String        @id @default(uuid()) @db.Uuid
  ticketId        String        @map("ticket_id") @db.Uuid
  ticket          Ticket        @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  senderId        String        @map("sender_id") @db.Uuid
  sender          User          @relation(fields: [senderId], references: [id], onDelete: Cascade)
  
  message         String        @db.Text
  attachments     String[]      @default([]) // URLs lưu tại Cloudflare R2
  isInternalNote  Boolean       @default(false) @map("is_internal_note")
  
  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([ticketId])
  @@map("ticket_messages")
}
```

### 3.3 Mở rộng Model `User` hiện tại
Thêm các quan hệ:
- `tickets: Ticket[] @relation("UserTickets")`
- `assignedTickets: Ticket[] @relation("StaffAssignedTickets")`
- `ticketMessages: TicketMessage[]`

---

## 4. Đặc tả API Backend (NestJS)

### 4.1 Module Users & Customer 360 (`src/modules/users`)

#### 1. `GET /users`
- **Guards:** `JwtAuthGuard`, `RolesGuard`
- **Roles:** `Role.ADMIN`, `Role.STAFF`
- **Query Parameters:**
  - `page`: number (default: 1)
  - `limit`: number (default: 10, max: 100)
  - `search`: string (tìm theo họ tên, email, số điện thoại)
  - `status`: `UserStatus` (`ACTIVE`, `INACTIVE`, `BANNED`)
  - `role`: string (Chỉ ADMIN mới được truyền `role=STAFF` hoặc `ADMIN`)
- **Logic:**
  - Nếu `currentUser.roles.includes(Role.STAFF)` và không có `Role.ADMIN`: Cố định lọc chỉ những User có role `USER`.
  - Trả về `PaginatedResponse<UserDto>` đã làm sạch dữ liệu mật khẩu.

#### 2. `GET /users/:id`
- **Guards:** `JwtAuthGuard`, `RolesGuard`
- **Roles:** `Role.ADMIN`, `Role.STAFF`
- **Logic:**
  - Nếu `currentUser` là `STAFF`: Kiểm tra target user xem có role `USER` không. Nếu là Staff/Admin khác -> ném ngoại lệ `ForbiddenException('Staff chỉ có quyền xem thông tin khách hàng')`.
  - Trả về thông tin cơ bản của user và danh sách địa chỉ.

#### 3. `GET /users/:id/customer-360`
- **Guards:** `JwtAuthGuard`, `RolesGuard`
- **Roles:** `Role.ADMIN`, `Role.STAFF`
- **Logic Tổng hợp:**
  - `metrics`:
    - `totalSpent`: Tổng tiền VND từ các Order của user có `paymentStatus: PAID` hoặc `status: COMPLETED`.
    - `orderCount`: Tổng số đơn, số đơn hoàn tất, số đơn hủy, số đơn đang xử lý.
    - `ticketCount`: Tổng số vé, số vé đang mở (`OPEN`, `IN_PROGRESS`).
    - `activeWarranties`: Số thiết bị bảo hành có `status: ACTIVE`.
    - `installmentCount`: Tổng số hồ sơ nộp, số hồ sơ được duyệt.
  - `recentOrders`: 10 đơn hàng mới nhất (id, orderNumber, createdAt, totalAmount, status, paymentStatus).
  - `addresses`: Toàn bộ địa chỉ đã lưu.
  - `warranties`: Danh sách các mục bảo hành thiết bị.
  - `installments`: Danh sách hồ sơ trả góp.
  - `tickets`: Danh sách các vé hỗ trợ của khách hàng.

---

### 4.2 Module Tickets (`src/modules/tickets`)

#### 1. Dành cho Khách hàng (Customer Endpoints)
- **`POST /tickets`**: Khách hàng tạo vé.
  - Body: `{ title: string, category: TicketCategory, priority?: TicketPriority, orderId?: string, message: string, attachments?: string[] }`
  - Logic: Tự sinh mã `code` dạng `TK-YYYYMM-XXXX`. Tạo bản ghi `Ticket` cùng tin nhắn khởi tạo đầu tiên trong transaction.
- **`GET /tickets/my`**: Khách xem danh sách vé của mình (hỗ trợ phân trang, lọc theo `status`).
- **`GET /tickets/:id`**: Khách xem chi tiết vé và lịch sử trao đổi.
  - **Bảo mật:** `where: { id, userId: currentUser.id }`. Danh sách `messages` tự động lọc bỏ `{ isInternalNote: false }`.
- **`POST /tickets/:id/messages`**: Khách gửi tin nhắn phản hồi.
  - Body: `{ message: string, attachments?: string[] }`
  - Logic: `isInternalNote` luôn được set là `false`. Nếu ticket đang ở trạng thái `RESOLVED`, tự động đổi lại thành `IN_PROGRESS`.
- **`PATCH /tickets/:id/close`**: Khách chủ động đóng vé. Cập nhật `status = CLOSED`, `resolvedAt = now()`.

#### 2. Dành cho Nhân viên & Quản trị (Admin/Staff Endpoints)
- **`GET /admin/tickets`**:
  - Roles: `Role.ADMIN`, `Role.STAFF`
  - Query: `page`, `limit`, `status`, `category`, `priority`, `assignedToId`, `search` (mã vé, tiêu đề, tên/email khách hàng).
- **`GET /admin/tickets/:id`**:
  - Roles: `Role.ADMIN`, `Role.STAFF`
  - Hiển thị đầy đủ thông tin vé, khách hàng, đơn hàng liên quan, cùng toàn bộ tin nhắn bao gồm cả **Ghi chú nội bộ (`isInternalNote: true`)**.
- **`POST /admin/tickets/:id/messages`**:
  - Body: `{ message: string, attachments?: string[], isInternalNote?: boolean }`
  - Logic:
    - Nếu `isInternalNote == false`: Tự động cập nhật `status = IN_PROGRESS`, cập nhật `lastRepliedAt = now()`. Tự động tạo In-app Notification cho khách hàng qua `NotificationsService`.
    - Nếu `isInternalNote == true`: Lưu dưới dạng trao đổi kỹ thuật nội bộ, không bắn thông báo cho khách.
- **`PATCH /admin/tickets/:id/status`**:
  - Body: `{ status: TicketStatus }`
  - Logic: Đổi trạng thái vé. Khi chuyển sang `RESOLVED`, cập nhật `resolvedAt = now()` và gửi thông báo in-app cho khách hàng.
- **`PATCH /admin/tickets/:id/assign`**:
  - Body: `{ assignedToId: string }`
  - Phân công nhân viên tiếp nhận và xử lý vé.

---

## 5. Đặc tả Giao diện & Trải nghiệm Người dùng (Frontend UI/UX)

### 5.1 Cổng Quản trị Staff & Admin Portal

1. **Thanh điều hướng (`AdminSidebar.tsx`)**:
   - Thêm mục **Khách hàng** (`/admin/customers` - Icon `UserOutlined`).
   - Thêm mục **Hỗ trợ khách hàng** (`/admin/tickets` - Icon `CustomerServiceOutlined`).
2. **Trang Danh sách Khách hàng (`/admin/customers`)**:
   - Thanh công cụ: Tìm kiếm từ khóa, Lọc trạng thái, Nút làm mới.
   - Bảng dữ liệu: Cột Thông tin khách hàng (Avatar + Tên + Email + SĐT), Ngày đăng ký, Trạng thái hoạt động, Nút hành động "Xem Customer 360°".
   - Phân quyền: Nút khóa/mở khóa/reset quyền chỉ render khi người đăng nhập có role `ADMIN`.
3. **Trang Hồ sơ Toàn cảnh Customer 360° (`/admin/customers/:id`)**:
   - Thẻ thông tin cá nhân: Họ tên, Email, SĐT, Badge phân loại khách hàng.
   - Thẻ thống kê: Tổng chi tiêu (VND), Số đơn thành công/hủy, Thiết bị đang bảo hành, Số vé hỗ trợ đã gửi.
   - Khung Tab chi tiết:
     - Tab 1: **Lịch sử Đơn hàng** (Bảng đơn, mã đơn, tổng tiền, trạng thái, nút xem chi tiết đơn).
     - Tab 2: **Hồ sơ Trả góp** (Danh sách hợp đồng trả góp của khách).
     - Tab 3: **Thiết bị & Bảo hành** (Mã IMEI, sản phẩm, hạn bảo hành).
     - Tab 4: **Vé hỗ trợ (Tickets)** (Lịch sử khiếu nại/hỗ trợ của khách, link sang trang xử lý ticket).
     - Tab 5: **Sổ địa chỉ** (Danh sách địa chỉ giao hàng).
4. **Trang Danh sách Vé Hỗ trợ (`/admin/tickets`)**:
   - Thẻ thống kê nhanh: Vé mới (`OPEN`), Đang xử lý (`IN_PROGRESS`), Đã xử lý (`RESOLVED`), Khẩn cấp (`URGENT`).
   - Bộ lọc đa chiều: Trạng thái, Phân loại, Mức độ ưu tiên, Nhân viên phụ trách.
   - Bảng danh sách vé với nhãn màu trực quan theo mức độ ưu tiên và trạng thái.
5. **Trang Xử lý Vé Chi tiết (`/admin/tickets/:id`)**:
   - **Cột trái (Trao đổi & Timeline)**:
     - Hiển thị luồng trao đổi theo thời gian.
     - Khối tin nhắn khách hàng (trái), khối phản hồi của CSKH (phải).
     - Khối ghi chú nội bộ (nền cam nhạt, icon 🔒, tiêu đề "Ghi chú nội bộ - Khách không nhìn thấy").
     - Khung soạn thảo phản hồi: Có Switch hoặc 2 Tab: *"Trả lời khách hàng"* / *"Ghi chú nội bộ"*. Nút đính kèm ảnh tải trực tiếp lên Cloudflare R2.
   - **Cột phải (Thông tin & Điều phối)**:
     - Dropdown đổi trạng thái vé nhanh.
     - Dropdown phân công nhân viên CSKH phụ trách.
     - Thẻ thông tin khách hàng kèm nút chuyển nhanh sang trang Customer 360°.
     - Thẻ đơn hàng liên quan (nếu vé gắn với đơn hàng).

---

### 5.2 Giao diện Khách hàng (Storefront)

1. **Khu vực Tài khoản cá nhân (`/profile`)**:
   - Bổ sung Tab **"Hỗ trợ & Khiếu nại"**:
     - Danh sách vé đã tạo của khách, hiển thị mã vé, trạng thái dạng Badge (`Chờ tiếp nhận`, `Đang xử lý`, `Đã phản hồi`, `Đã đóng`).
     - Nút **"Tạo yêu cầu hỗ trợ"**: Mở Modal tạo vé (chọn phân loại, tiêu đề, chọn đơn hàng liên quan từ danh sách đơn đã mua, nội dung chi tiết, upload ảnh minh chứng).
     - Bấm vào vé để mở modal hoặc trang xem chi tiết và trao đổi tin nhắn phản hồi với CSKH.
2. **Chi tiết đơn hàng (`/orders/:id`)**:
   - Thêm nút hành động nhanh: **"Yêu cầu hỗ trợ về đơn này"**.
   - Khi bấm, mở modal tạo ticket với trường `orderId` đã được chọn sẵn.

---

## 6. Kế hoạch Kiểm thử & Xác minh (Verification & Testing Plan)

1. **Kiểm thử Bảo mật Phân quyền (RBAC Tests)**:
   - Viết unit test xác nhận user có role `STAFF` gọi `GET /users` chỉ lấy được danh sách user có role `USER`.
   - Viết test xác nhận `STAFF` gọi các API `POST /users`, `PATCH /users/:id`, `PUT /users/:id/ban` bị trả về `403 Forbidden`.
   - Viết test xác nhận không có trường `passwordHash` trong response của `GET /users`, `GET /users/:id`, `GET /users/:id/customer-360`.
2. **Kiểm thử Module Tickets**:
   - Test tạo vé tự sinh mã `TK-YYYYMM-XXXX`.
   - Test phân quyền: Khách hàng A không thể xem vé của khách hàng B (`403 Forbidden`).
   - Test bảo mật ghi chú nội bộ: Khách hàng gọi `GET /tickets/:id` không bao giờ nhận được tin nhắn có `isInternalNote = true`.
   - Test kích hoạt thông báo: Khi Staff gửi tin nhắn thường, bản ghi `Notification` mới được tạo cho khách hàng. Khi gửi `isInternalNote = true`, không tạo notification.
3. **Kiểm thử Frontend (Vitest & UI render)**:
   - Kiểm tra hiển thị menu `AdminSidebar` đối với vai trò `STAFF` và `ADMIN`.
   - Kiểm tra render trang Customer 360 với đầy đủ các thẻ KPI và danh sách đơn hàng / bảo hành.
   - Kiểm tra luồng gửi phản hồi và chuyển đổi tab "Ghi chú nội bộ" trong giao diện xử lý ticket.
