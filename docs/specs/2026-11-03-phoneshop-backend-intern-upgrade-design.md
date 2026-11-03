# Thiết Kế Chi Tiết: Nâng Cấp PhoneShop Toàn Diện (Backend Intern / Fresher)

- **Ngày tạo:** 03-11-2026
- **Trạng thái:** Đã phê duyệt (Approved)
- **Mục tiêu:** Ổn định nghiệp vụ cốt lõi, sửa lỗi logic, chuẩn hóa kiến trúc và nâng cao chất lượng code của PhoneShop (NestJS 11 + Prisma 7 + PostgreSQL + React 19) đạt tiêu chuẩn Backend Intern / Fresher có chiều sâu kỹ thuật.
- **Phạm vi:** 4 giai đoạn hoàn thiện tuần tự (Core Stability -> Testing -> Business Completeness -> Polish & Delivery).

---

## 1. Bối cảnh & Hiện trạng hệ thống

PhoneShop là hệ thống thương mại điện tử chuyên ngành điện thoại di động với stack:
- **Backend:** NestJS 11, Prisma ORM 7, PostgreSQL, Passport JWT, ScheduleModule, Throttler.
- **Frontend:** React 19, Vite, Tailwind CSS, Zustand, React Router.

Báo cáo audit kỹ thuật ghi nhận:
- **Điểm mạnh cần phát huy:** Cơ chế transaction quản lý số serial/IMEI độc nhất cho từng sản phẩm, chống race condition khi áp dụng voucher, refresh token rotation và kiểm tra chữ ký webhook thanh toán.
- **Điểm yếu & lỗi tồn đọng:**
  1. Thiếu cơ chế tự động giải phóng giữ hàng (hold expiration) khi đơn hàng online quá hạn 15 phút chưa thanh toán.
  2. Lệch cấu trúc dữ liệu giữa `schema.prisma` và lịch sử migration PostgreSQL.
  3. Thiếu vắng bộ kiểm thử tự động (automated tests) cho các luồng nghiệp vụ mua hàng nhạy cảm.
  4. Đơn hàng chuyển sang `RETURNED` chưa có nghiệp vụ hoàn tiền (Refund) và lịch sử giao dịch tương ứng.
  5. API quên mật khẩu tiết lộ thông tin người dùng (email enumeration).
  6. Xử lý phân quyền vai trò nhân viên (Staff / Manager) chưa đồng nhất.
  7. Cấu hình hệ thống (Admin Settings) lưu vào DB nhưng các service đọc trực tiếp từ `.env`.
  8. Lệch contract giữa Frontend và Backend (shipping method, hiển thị trạng thái thanh toán, tra cứu bảo hành).

---

## 2. Kiến trúc & Nguyên tắc cốt lõi (Invariants)

### 2.1. Phân lớp trách nhiệm (Layered Modular Monolith)
- **Controller:** Tiếp nhận request, gắn `ValidationPipe` toàn cục, ủy quyền xử lý nghiệp vụ cho Service, trả response chuẩn hóa qua `ResponseInterceptor`.
- **Service:** Đảm nhận toàn bộ quy tắc nghiệp vụ, tính toán tiền bạc, phân quyền và kiểm soát invariant.
- **Prisma Interactive Transaction:** Đảm bảo tính nhất quán (ACID) cho các thao tác thay đổi nhiều bảng liên quan mật thiết (Order, Payment, Inventory, IMEI, Voucher, Warranty).
- **Quy tắc Side-effect:** Tuyệt đối không `await` các tác vụ I/O ngoài (như gửi email Brevo hoặc gọi webhook ngân hàng) bên trong DB transaction.

### 2.2. Các Invariant bất biến
1. **Inventory & IMEI Invariant:** Mỗi IMEI vật lý chỉ được gán cho duy nhất 1 đơn hàng tại một thời điểm (`AVAILABLE` -> `RESERVED` -> `SOLD`). Khi đơn hủy hoặc hold hết hạn, IMEI bắt buộc phải quay lại trạng thái `AVAILABLE` và số lượng tồn kho `availableQty` được cộng hoàn lại chính xác.
2. **Hold Expiration Policy:**
   - Đơn Online (`VNPAY`, `VIETQR`): `holdExpiresAt = now + 15 phút`. Quá 15 phút không thanh toán, scheduler tự động giải phóng kho và hủy đơn.
   - Đơn COD: `holdExpiresAt = null`. Không bị scheduler hủy tự động, được giữ hàng để đóng gói và vận chuyển.
3. **Idempotency & Race Condition Prevention:**
   - Webhook thanh toán và job quét hold hết hạn sử dụng conditional update (`status: PENDING`) để tránh xung đột giữa thanh toán vừa tới và scheduler vừa quét.
   - Không xử lý thanh toán lặp hoặc hoàn tiền lặp trên cùng một giao dịch.
4. **Security & Data Privacy:**
   - Endpoint quên mật khẩu trả response chung, không tiết lộ email có tồn tại hay không.
   - Không lưu trữ hoặc log các dữ liệu nhạy cảm (mật khẩu thô, token, CVV, thông tin thẻ ngân hàng).

---

## 3. Thiết kế chi tiết theo 4 Giai đoạn

### Giai đoạn 1: Core Stability (Ổn định Nghiệp vụ Cốt lõi)

#### 1.1. Tự động giải phóng Hold hết hạn & Phân biệt đơn COD
- **Thành phần:** `backend/src/modules/orders/orders.scheduler.ts` và `orders.service.ts`.
- **Logic tạo đơn (`createOrder`):**
  - Nếu `paymentMethod` là `VNPAY` hoặc `VIETQR`: gán `holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000)`.
  - Nếu `paymentMethod` là `COD`: gán `holdExpiresAt = null`, chuyển đơn sang chờ đóng gói.
- **Cơ chế Scheduler (`handleExpiredHolds`):**
  - Chạy cron job mỗi phút 1 lần (`@Cron(CronExpression.EVERY_MINUTE)`).
  - Tìm tối đa 50 đơn hàng thỏa mãn: `status = PENDING` và `holdExpiresAt <= now()`.
  - Với mỗi đơn, gọi `releaseOrderReservation(tx, order, options)` trong transaction riêng biệt.
- **Hàm dùng chung `releaseOrderReservation`:**
  - Conditional update: Chuyển `Order.status` từ `PENDING` sang `CANCELLED`. Nếu `count === 0` (đơn vừa được thanh toán), abort ngay.
  - Cập nhật các bản ghi thanh toán `PENDING` thành `CANCELLED`.
  - Cập nhật IMEI từ `RESERVED` về `AVAILABLE`.
  - Cập nhật tồn kho `Inventory.availableQty += quantity`.
  - Rollback `VoucherUsage` nếu có voucher áp dụng.
  - Rollback `FlashSaleItem.soldCount` nếu sản phẩm nằm trong chiến dịch flash sale.

#### 1.2. Chuẩn hóa Prisma Migration & Khắc phục Drift
- **Thành phần:** `backend/prisma/migrations/20261103100000_sync_schema/migration.sql` và `schema.prisma`.
- **Mục tiêu:** Đồng bộ toàn diện schema để có thể dựng lại database trắng (`fresh database`) bằng lệnh `prisma migrate deploy` mà không phát sinh lỗi lệch kiểu enum hay thiếu bảng.
- **Nội dung migration:**
  - Khởi tạo an toàn các enum: `StockMovementType`, `ShippingMethod`, `ShippingStatus`, `TicketStatus`, `TicketPriority`, `FlashSaleStatus`.
  - Bổ sung các giá trị mới vào enum: `OrderStatus.RETURNED`, `InventoryStatus.RETURNED/WARRANTY`, `ImeiStatus.RETURNED/WARRANTY/BLOCKED`, `PaymentStatus.REFUNDED/PARTIALLY_REFUNDED/CANCELLED`.
  - Bổ sung các cột thiếu: `orders.hold_expires_at`, `orders.shipping_fee`, `orders.shipping_method`, `orders.customer_note`, `orders.cancelled_reason`, `users.phone`, `users.avatar_url`, `products.warranty_months`.
  - Tạo bảng `stock_movements`.

#### 1.3. Bảo mật Quên mật khẩu & Phân quyền Staff
- **Forgot Password (`auth.service.ts`):** Chuẩn hóa phản hồi generic:
  `{ success: true, message: 'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn.' }`
  Ngăn chặn kẻ tấn công dò tìm danh sách email người dùng đăng ký.
- **Phân quyền Nhân viên (`jwt.strategy.ts` & `RolesGuard`):**
  - Đảm bảo trích xuất đầy đủ mảng `roles: string[]` từ quan hệ người dùng - vai trò.
  - Xác định `primaryRole` theo thứ tự ưu tiên `ADMIN` > `MANAGER` > `STAFF` > `USER`.
  - `RolesGuard` đối chiếu mảng `roles` của người dùng với metadata của endpoint để cấp quyền chính xác.

---

### Giai đoạn 2: Automated Testing & CI Pipeline

#### 2.1. Cấu hình Jest & Khắc phục các bài test bị lỗi
- Sửa 3 bài test hiện đang lỗi type/mock trong thư mục `backend/test/`:
  1. `test/vouchers-limits.spec.ts`: Đổi assertion sang `result.discount` phù hợp với schema trả về của `VouchersService.validate`.
  2. `test/payments-concurrency.spec.ts`: Sửa tên import thành `VietqrService` khớp với khai báo export của service.
  3. `test/orders-release-reservation.spec.ts`: Bổ sung kiểm tra an toàn hoặc mock `tx.flashSaleItem?.findMany` trong utility rollback flash sale.
- Kiểm tra toàn bộ 6 test suites đạt kết quả PASS 100%:
  - `orders-hold.spec.ts`: Invariant hold 15 phút và scheduler.
  - `orders-release-reservation.spec.ts`: Invariant hoàn tồn kho, giải phóng IMEI và hủy bảo hành.
  - `payments-concurrency.spec.ts`: Invariant chống thanh toán lặp và xử lý callback đồng thời.
  - `vouchers-limits.spec.ts`: Invariant giới hạn số lần sử dụng và chiết khấu voucher.
  - `staff-role-parity.spec.ts`: Invariant phân quyền RBAC cho Staff/Manager.
  - `auth-security.spec.ts`: Invariant bảo mật forgot password.

#### 2.2. Thiết lập GitHub Actions CI Pipeline
- Tạo file `.github/workflows/backend-ci.yml`.
- Tự động chạy trên mọi nhánh khi có `push` hoặc `pull_request`:
  - Khởi tạo môi trường Node.js.
  - Cài đặt dependencies (`npm ci`).
  - Sinh Prisma client (`npx prisma generate`).
  - Chạy kiểm tra kiểu TypeScript và build (`npm run build`).
  - Chạy toàn bộ automated unit & integration test (`npm test`).

---

### Giai đoạn 3: Business Completeness (Hoàn thiện Nghiệp vụ)

#### 3.1. Thiết kế Quy trình Hoàn tiền (Refund Workflow)
- **Cấu trúc Dữ liệu:** Sử dụng các bảng `Payment` và `PaymentTransaction`:
  - `Payment.status`: chuyển thành `REFUNDED` (hoặc `PARTIALLY_REFUNDED`).
  - `PaymentTransaction`: tạo bản ghi với `type: TransactionType.REFUND`, `status: TransactionStatus.SUCCESS`, lưu trữ số tiền hoàn, mã giao dịch tham chiếu và thời điểm hoàn.
- **Nghiệp vụ `processRefund` trong `PaymentsService` / `OrdersService`:**
  - Kiểm tra điều kiện: Đơn hàng phải ở trạng thái `DELIVERED` hoặc `RETURNED`, và trạng thái thanh toán trước đó phải là `PAID`.
  - Kiểm tra số tiền hoàn hợp lệ (`amount <= payment.amount`).
  - Bọc toàn bộ thao tác trong Prisma interactive transaction:
    1. Tạo bản ghi `PaymentTransaction` loại `REFUND`.
    2. Cập nhật `Payment.status` thành `REFUNDED`.
    3. Cập nhật `Order.status` thành `RETURNED`.
    4. Xử lý kho: Cập nhật IMEI sang trạng thái `RETURNED` hoặc `WARRANTY`, tạo bản ghi `StockMovement` loại `IMPORT_RETURN`.
    5. Hủy hiệu lực bảo hành (`Warranty`) của các IMEI tương ứng.
    6. Ghi `AuditLog` chi tiết: Quản trị viên duyệt, số tiền hoàn, lý do hoàn.
    7. Gửi `Notification` đến khách hàng thông báo hoàn tiền thành công.

#### 3.2. Đồng bộ Cấu hình Hệ thống (System Settings)
- **Cơ chế phân giải cấu hình (Resolution Strategy):**
  - Ưu tiên: `Database (SystemSetting)` > `DEFAULT_DEFINITIONS (Code default)` > `ConfigService (.env)`.
  - Có cơ chế memory cache với TTL 1 giờ hoặc tự động xóa cache khi Admin cập nhật giá trị.
- **Tác động nghiệp vụ:**
  - `OrdersService` kiểm tra cấu hình cổng thanh toán (`PAYMENT_COD_ENABLED`, `PAYMENT_VNPAY_ENABLED`, `PAYMENT_VIETQR_ENABLED`) trước khi cho phép tạo đơn.
  - Kiểm tra cờ `MAINTENANCE_MODE`: Từ chối tạo đơn mới khi hệ thống bật chế độ bảo trì.

#### 3.3. Tích hợp Thông báo (Notifications) & Ghi vết (Audit Log)
- **Notifications:** Kích hoạt gửi thông báo in-app tự động qua `NotificationsService.sendToUser`:
  - Tạo đơn thành công.
  - Thanh toán thành công.
  - Cập nhật trạng thái giao hàng (`SHIPPED`, `DELIVERED`, `CANCELLED`).
  - Hoàn tiền thành công.
- **Audit Log:** Tích hợp ghi vết hành động quản trị qua `AuditLogService`:
  - Thao tác duyệt hoàn tiền / hủy đơn hàng của nhân viên.
  - Thao tác điều chỉnh cấu hình hệ thống (`SystemSetting`).
  - Thao tác điều chỉnh tồn kho thủ công (`StockMovementType.ADJUSTMENT`).

---

### Giai đoạn 4: Polish & Delivery (Chuẩn hóa & Bàn giao)

#### 4.1. Chuẩn hóa Input Validation & DTOs
- Bật cấu hình an toàn cho `ValidationPipe` trong `main.ts`:
  - `whitelist: true`: Tự động loại bỏ các field thừa không khai báo trong DTO.
  - `forbidNonWhitelisted: true`: Bắn lỗi nếu có field lạ.
  - `transform: true`: Tự động convert types.
- Đảm bảo toàn bộ DTO tiếp nhận dữ liệu có đầy đủ decorators: `@IsUUID()`, `@IsInt()`, `@Min(1)`, `@IsEnum()`, `@IsString()`, `@IsNotEmpty()`.
- Tuyệt đối không nhận giá sản phẩm hoặc tổng tiền từ frontend gửi lên; toàn bộ số tiền phải do backend tính toán độc lập từ database.

#### 4.2. Khắc phục Sai lệch Contract giữa Frontend và Backend
- Đồng bộ các hằng số phương thức giao hàng (`STANDARD`, `EXPRESS`, `EXPRESS_2H`, `ECONOMY`) và logic tính phí ship giữa frontend và backend.
- Chuẩn hóa endpoint tra cứu thông tin bảo hành thiết bị theo IMEI/SĐT.
- Thống nhất response lỗi qua `HttpExceptionFilter` để frontend hiển thị toast notification rõ ràng.

#### 4.3. Cập nhật Tài liệu & Artifacts phục vụ Phỏng vấn
- Cập nhật `README.md`: Hướng dẫn cài đặt 1 chạm với Docker, Prisma migrate, database seeding.
- Sơ đồ kiến trúc & luồng dữ liệu (Mermaid diagrams) cho 3 bài toán trọng tâm:
  1. *Hold 15 phút & Concurrency giải phóng kho.*
  2. *Chống Race Condition voucher & flash sale.*
  3. *Quy trình Hoàn tiền & Transaction an toàn.*
- Sơ đồ cơ sở dữ liệu (ERD) cập nhật các quan hệ bảng mới.
- Báo cáo kết quả kiểm thử tự động (Test execution report).

---

## 4. Kế hoạch Kiểm tra & Nghiệm thu (Verification Plan)

| Hạng mục | Phương pháp xác minh | Kết quả kỳ vọng |
|---|---|---|
| **Bộ Automated Tests** | Chạy lệnh `npm test` trong thư mục `backend` | Toàn bộ 6/6 test suites PASS, 0 fail, 0 compile error |
| **Typecheck & Build** | Chạy lệnh `npm run build` | NestJS build thành công không có lỗi TypeScript |
| **Prisma Schema Check** | Chạy `npx prisma validate` | Schema hợp lệ, không có cú pháp lỗi |
| **Hold Expiration** | Unit test `orders-hold.spec.ts` | Đơn online quá 15 phút tự hủy và trả IMEI; đơn COD không bị hủy |
| **Release Reservation** | Unit test `orders-release-reservation.spec.ts` | Trả đúng tồn kho, trả IMEI về AVAILABLE, rollback voucher và soldCount |
| **Idempotent Payment** | Unit test `payments-concurrency.spec.ts` | Gọi webhook thanh toán lần 2 không lặp tiền |
| **Forgot Password Security** | Unit test `auth-security.spec.ts` | Email tồn tại hay không tồn tại đều trả cùng 1 format |
| **CI Pipeline** | Kiểm tra syntax file workflow `.github/workflows/backend-ci.yml` | Workflow file hợp lệ |
