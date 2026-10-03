# Thiết Kế Hệ Thống Mua Hàng Trả Góp Thẩm Định Hồ Sơ (Installment System Design)

- **Ngày tạo:** 03/10/2026
- **Tác giả:** PhoneShop Engineering Team
- **Trạng thái:** Approved by User / Ready for Implementation Planning
- **Phiên bản:** 1.0.0

---

## 1. Tổng Quan & Mục Tiêu

### 1.1. Bối cảnh
PhoneShop đã phát triển giao diện mô phỏng trả góp (Installment Simulation Modal) tại trang chi tiết sản phẩm (`/products/:id`). Tuy nhiên, ở tầng Backend và luồng Thanh toán (Checkout), hệ thống chưa có cấu trúc dữ liệu, API và quy trình nghiệp vụ để khách hàng đăng ký và nhân viên thẩm định hồ sơ mua hàng trả góp thực tế.

### 1.2. Mục tiêu
- **Cho Khách hàng (Storefront Customer):**
  - Đăng ký trả góp trực tiếp tại trang Checkout khi chọn phương thức thanh toán *"Trả góp qua công ty tài chính"*.
  - Lựa chọn đối tác tài chính (`Home Credit` / `FE Credit`), gói trả trước (0%, 20%, 30%, 50%) và kỳ hạn (3, 6, 9, 12 tháng).
  - Khai báo thông tin định danh (CCCD 12 số, ngày sinh, địa chỉ, thu nhập) và tải ảnh chụp 2 mặt CCCD qua Cloudflare R2.
  - Được giữ máy ưu tiên trong kho với thời hạn 24 giờ trong lúc chờ thẩm định.
  - Theo dõi trạng thái thẩm định hồ sơ trong phần Quản lý đơn hàng cá nhân.
- **Cho Nhân viên / Quản trị viên (Admin & Staff):**
  - Màn hình Quản trị chuyên dụng (`/admin/installments`) để tra cứu, lọc và xem chi tiết hồ sơ trả góp kèm ảnh CCCD gốc.
  - Thao tác Duyệt (`APPROVED`) hoặc Từ chối (`REJECTED` kèm lý do), tự động cập nhật trạng thái đơn hàng và điều tiết tồn kho thông minh.
  - Gửi thông báo email tự động xuyên suốt vòng đời thẩm định.

---

## 2. Kiến Trúc Dữ Liệu (Database Schema)

### 2.1. Cập nhật Enum hiện có trong `backend/prisma/schema.prisma`
```prisma
enum PaymentMethod {
  COD
  BANK_TRANSFER
  VNPAY
  MOMO
  ZALOPAY
  CREDIT_CARD
  DEBIT_CARD
  INSTALLMENT // Bổ sung phương thức trả góp thẩm định
}
```

### 2.2. Bổ sung các Enum mới
```prisma
enum InstallmentProvider {
  HOME_CREDIT
  FE_CREDIT
}

enum InstallmentStatus {
  PENDING    // Khách mới nộp hồ sơ, chờ thẩm định
  APPROVED   // Hồ sơ đã được duyệt -> Đơn hàng chuyển sang CONFIRMED
  REJECTED   // Hồ sơ bị từ chối -> Đơn hàng CANCELLED, hoàn trả tồn kho
  CANCELLED  // Khách chủ động hủy hồ sơ / đơn hàng
}
```

### 2.3. Bảng mới: `InstallmentApplication` (Hồ sơ trả góp)
```prisma
model InstallmentApplication {
  id              String              @id @default(uuid()) @db.Uuid
  orderId         String              @unique @map("order_id") @db.Uuid
  userId          String              @map("user_id") @db.Uuid
  provider        InstallmentProvider @default(HOME_CREDIT)
  status          InstallmentStatus   @default(PENDING)
  
  // Gói tài chính
  termMonths      Int                 @map("term_months")       // 3, 6, 9, 12 tháng
  prepayPercent   Int                 @map("prepay_percent")    // 0, 20, 30, 50 (%)
  prepayAmount    Decimal             @map("prepay_amount") @db.Decimal(15, 2)
  loanAmount      Decimal             @map("loan_amount") @db.Decimal(15, 2)
  monthlyAmount   Decimal             @map("monthly_amount") @db.Decimal(15, 2)
  
  // Thông tin định danh cá nhân & CCCD
  fullName        String              @map("full_name") @db.VarChar(255)
  citizenId       String              @map("citizen_id") @db.VarChar(20) // CCCD 12 số gắn chip
  birthDate       DateTime            @map("birth_date") @db.Date
  phoneNumber     String              @map("phone_number") @db.VarChar(20)
  currentAddress  String              @map("current_address") @db.Text
  incomeRange     String              @map("income_range") @db.VarChar(50) // "<10M", "10M-20M", ">20M"
  
  // Ảnh chứng từ định danh (Cloudflare R2 URL)
  cccdFrontUrl    String              @map("cccd_front_url") @db.Text
  cccdBackUrl     String              @map("cccd_back_url") @db.Text
  
  // Thông tin thẩm định từ Staff
  reviewedBy      String?             @map("reviewed_by") @db.Uuid
  reviewedAt      DateTime?           @map("reviewed_at")
  staffNotes      String?             @map("staff_notes") @db.Text
  rejectionReason String?             @map("rejection_reason") @db.Text

  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")

  order           Order               @relation(fields: [orderId], references: [id], onDelete: Cascade)
  user            User                @relation(fields: [userId], references: [id], onDelete: Restrict)
  reviewer        User?               @relation("StaffReviewedInstallments", fields: [reviewedBy], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([status])
  @@index([citizenId])
  @@map("installment_applications")
}
```

### 2.4. Cập nhật quan hệ trong `model Order` và `model User`
- Trong `Order`:
  ```prisma
  installmentApplication InstallmentApplication?
  ```
- Trong `User`:
  ```prisma
  installmentApplications InstallmentApplication[]
  reviewedInstallments    InstallmentApplication[] @relation("StaffReviewedInstallments")
  ```

---

## 3. Kiến Trúc Backend (`backend/src`)

### 3.1. Cấu trúc Module mới: `backend/src/modules/installments/`
```
backend/src/modules/installments/
├── dto/
│   ├── create-installment-application.dto.ts
│   ├── review-installment.dto.ts
│   └── query-installment.dto.ts
├── installments.controller.ts        # Client & Admin endpoints
├── installments.service.ts           # Core business logic & transitions
└── installments.module.ts            # NestJS Module integration
```

### 3.2. Cập nhật Module Đơn Hàng (`backend/src/modules/orders/`)
- Mở rộng `CreateOrderDto`:
  ```typescript
  export class CreateOrderDto {
    @IsUUID()
    addressId: string;

    @IsOptional()
    @IsString()
    voucherCode?: string;

    @IsOptional()
    @IsString()
    customerNote?: string;

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateInstallmentApplicationDto)
    installmentData?: CreateInstallmentApplicationDto;
  }
  ```

### 3.3. Quy trình xử lý tại `orders.service.ts`:
1. **Kiểm tra tồn kho & Đặt giữ máy 24 giờ:**
   - Khi `paymentMethod === PaymentMethod.INSTALLMENT`:
     - Xác thực `installmentData` bắt buộc có mặt, đầy đủ ảnh CCCD 2 mặt và số CCCD chuẩn 12 chữ số.
     - Thời hạn giữ máy trong kho: `holdExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)` (24 tiếng).
     - Trừ tồn kho có sẵn `availableQty -= quantity`, tăng tồn kho giữ chỗ `reservedQty += quantity`.
2. **Transaction Database:**
   - Tạo bản ghi `Order` với trạng thái `PENDING`.
   - Tạo bản ghi `Payment` với `method: INSTALLMENT, status: PENDING, amount: totalAmount`.
   - Tạo bản ghi `InstallmentApplication` liên kết với `order.id` và `user.id`.
3. **Email thông báo:**
   - Gửi email tự động xác nhận đã tiếp nhận hồ sơ trả góp và hẹn thời gian phản hồi trong 2-4 giờ làm việc.

### 3.4. API dành cho Quản trị viên (Admin & Staff):
- `GET /api/admin/installments`:
  - Phân trang, lọc theo `status` (PENDING, APPROVED, REJECTED), `provider` (HOME_CREDIT, FE_CREDIT).
  - Tìm kiếm toàn văn theo: Mã đơn hàng (`orderNumber`), Họ tên khách, Số điện thoại, Số CCCD.
- `GET /api/admin/installments/:id`:
  - Trả về toàn bộ chi tiết hồ sơ: Ảnh 2 mặt CCCD, kỳ hạn, số tiền trả trước, số tiền vay, mức thu nhập, và thông tin chi tiết các sản phẩm trong đơn.
- `PATCH /api/admin/installments/:id/review`:
  - Body: `{ status: 'APPROVED' | 'REJECTED', staffNotes?: string, rejectionReason?: string }`
  - Nếu `APPROVED`:
    - Cập nhật hồ sơ `status = APPROVED, reviewedBy = staffId, reviewedAt = now()`.
    - Chuyển trạng thái đơn hàng sang `OrderStatus.CONFIRMED`.
    - Gửi email chúc mừng và thông báo lịch giao máy/nhận máy kèm số tiền trả trước cần chuẩn bị.
  - Nếu `REJECTED`:
    - Cập nhật hồ sơ `status = REJECTED, rejectionReason = ..., reviewedBy = staffId`.
    - Chuyển trạng thái đơn hàng sang `OrderStatus.CANCELLED`.
    - Tự động hoàn trả tồn kho (`reservedQty -> availableQty`).
    - Gửi email thông báo lý do từ chối hồ sơ.

### 3.5. Background Job tự động hết hạn (`hold-expiry.sweeper.ts`):
- Mở rộng cronjob quét định kỳ:
  - Nếu đơn hàng có `holdExpiresAt < now()` và `status === PENDING` với phương thức `INSTALLMENT`:
  - Tự động chuyển `InstallmentApplication.status = CANCELLED`, `Order.status = CANCELLED, cancelledReason = 'Hết thời hạn 24h thẩm định hồ sơ'`.
  - Hoàn trả lại số lượng tồn kho `availableQty`.

---

## 4. Kiến Trúc Frontend (`frontend/src`)

### 4.1. Cập nhật Trang Thanh Toán (`frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`)
- Bổ sung tùy chọn phương thức thanh toán thứ 4:
  - `VIETQR` (Chuyển khoản QR)
  - `VNPAY` (Cổng VNPAY)
  - `COD` (Thanh toán khi nhận hàng)
  - **`INSTALLMENT` (Trả góp xét duyệt 0% qua Home Credit / FE Credit)**
- Khi người dùng click chọn `INSTALLMENT`, giao diện mở rộng form thẩm định hồ sơ tích hợp:
  1. **Chọn đối tác tài chính:** Radio card chọn `Home Credit` hoặc `FE Credit`.
  2. **Chọn thông số gói:** Dropdown kỳ hạn (3, 6, 9, 12 tháng) và % trả trước (0%, 20%, 30%, 50%).
  3. **Bảng tóm tắt tài chính:** Hiển thị trực quan:
     - Số tiền trả trước (thu khi nhận hàng): `formatPrice(prepayAmount)`
     - Số tiền vay trả góp: `formatPrice(loanAmount)`
     - Số tiền góp mỗi tháng: `formatPrice(monthlyAmount)`
  4. **Form thông tin CCCD & Định danh:**
     - Họ và tên (tự động điền theo tài khoản, có thể sửa).
     - Số điện thoại liên hệ chính.
     - Số CCCD gắn chip (Validation: đúng 12 chữ số).
     - Ngày sinh (Date Picker, ràng buộc >= 18 tuổi).
     - Địa chỉ hiện tại.
     - Mức thu nhập hàng tháng (Dưới 10tr, 10-20tr, Trên 20tr).
  5. **Upload 2 mặt CCCD:**
     - Tích hợp component tải ảnh lên Cloudflare R2 trực tiếp (`POST /api/upload`), có preview ảnh và nút xóa/chụp lại.

### 4.2. Trang Chi Tiết Đơn Hàng Khách Hàng (`/orders/:id`)
- Hiển thị khối thông tin trả góp riêng:
  - Badge trạng thái: `Đang thẩm định hồ sơ (Vui lòng chờ cuộc gọi xác nhận)`, `Hồ sơ đã được duyệt`, hoặc `Hồ sơ bị từ chối`.
  - Hiển thị rõ số tiền trả trước cần chuẩn bị khi nhận hàng.

### 4.3. Trang Quản Trị Viên (`/admin/installments`)
- Bổ sung menu item **"Hồ sơ trả góp"** tại Admin Sidebar (trong nhóm Quản lý Đơn hàng).
- Giao diện danh sách hồ sơ:
  - Bảng dữ liệu Ant Design / Tailwind với các cột: Mã hồ sơ, Mã đơn hàng, Khách hàng, SĐT, Số CCCD, Đơn vị tài chính, Gói góp, Trạng thái, Ngày nộp.
  - Bộ lọc Tabs: `Tất cả`, `Chờ duyệt` (có badge số lượng), `Đã duyệt`, `Đã từ chối`.
- Modal Chi Tiết & Thẩm Định:
  - Xem ảnh phóng to mặt trước và mặt sau CCCD (kèm rotate/zoom).
  - Đối chiếu thông tin cá nhân và đơn hàng.
  - 2 nút hành động: `Duyệt hồ sơ` hoặc `Từ chối hồ sơ` (mở popup nhập lý do từ chối).

---

## 5. Ma Trận Xử Lý Trạng Thái & Rủi Ro (Edge Cases)

| Tình huống rủi ro | Giải pháp xử lý |
|---|---|
| Khách upload ảnh CCCD bị lỗi mạng hoặc vượt dung lượng | Client kiểm tra định dạng (.jpg, .png, .webp) và giới hạn dung lượng <= 5MB trước khi upload lên Cloudflare R2. Nếu upload thất bại, hiển thị toast thông báo rõ ràng và không cho submit form. |
| Khách chưa đủ 18 tuổi | Validate client + server: `birthDate` phải đảm bảo đủ 18 tuổi tính đến thời điểm nộp đơn. |
| Sản phẩm trong giỏ bị hết hàng trong khi khách đang điền form CCCD | Backend transaction kiểm tra tồn kho một lần nữa ngay lúc submit `POST /api/orders`. Nếu hết hàng, trả về mã lỗi `OUT_OF_STOCK` kèm thông báo. |
| Quá 24 giờ nhân viên không liên lạc được với khách | Cron job `hold-expiry.sweeper` tự động hủy đơn và giải phóng tồn kho về lại trạng thái bán bình thường. |
| Hai nhân viên cùng mở duyệt một hồ sơ cùng lúc | Xử lý Optimistic locking / kiểm tra trạng thái: Nếu hồ sơ không còn ở trạng thái `PENDING`, trả về thông báo lỗi `Hồ sơ này đã được xử lý bởi nhân viên khác`. |

---

## 6. Kế Hoạch Kiểm Thử & Nghiệm Thu (Verification Plan)

1. **Database & Migration:** Chạy migration Prisma, kiểm tra sinh enum và bảng `installment_applications` trong cơ sở dữ liệu Supabase Postgres.
2. **Backend Unit & Integration Tests:**
   - Test tạo đơn hàng trả góp thành công kèm giữ máy 24 giờ.
   - Test validation dữ liệu CCCD và độ tuổi.
   - Test API Staff duyệt hồ sơ (`APPROVED`) -> Đơn chuyển sang `CONFIRMED`.
   - Test API Staff từ chối hồ sơ (`REJECTED`) -> Đơn chuyển sang `CANCELLED`, tồn kho hoàn trả nguyên vẹn.
3. **Frontend E2E Flow:**
   - Điền form Checkout với phương thức Trả góp -> Tạo đơn thành công.
   - Đăng nhập tài khoản Staff/Admin -> Mở `/admin/installments` -> Duyệt hồ sơ -> Kiểm tra đơn hàng của khách chuyển sang Đã xác nhận.
   - Kiểm tra hiển thị responsive trên thiết bị di động và desktop.
