# Design Specification: Dynamic System Configuration & Admin Settings (Cấu hình hệ thống động)

**Ngày tạo:** 2026-10-04  
**Trạng thái:** Pending User Final Review  
**Tác giả:** Antigravity Engineering & Architecture  
**Mục tiêu:** Xây dựng hệ thống cấu hình động (Dynamic System Configuration) toàn diện từ Cơ sở dữ liệu (PostgreSQL/Prisma), tầng Service toàn cục (Global Settings Service có Redis cache & Fallback .env mượt mà), bộ công cụ chẩn đoán kết nối trực tiếp (Diagnostics & Test Connections), cho đến Giao diện Quản trị web `/admin/settings` (Admin Settings Portal) với 4 nhóm cấu hình chính: Cổng thanh toán (VNPay, VietQR), Lưu trữ Cloud (Cloudflare R2), Dịch vụ Email (SMTP), và Vận hành chung.

---

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

### 1.1. Hiện trạng (Current State)
* **Cấu hình Cổng thanh toán (VNPay, VietQR):** 
  * Các tham số như `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` được hardcode nạp từ biến môi trường `ConfigService` (`.env`).
  * Khi cần thay đổi tài khoản ngân hàng nhận tiền hoặc đổi key VNPay sandbox/production, quản trị viên phải can thiệp trực tiếp file `.env` trên máy chủ và khởi động lại backend service.
* **Cấu hình Lưu trữ & Email & Cloud:**
  * Cloudflare R2 (`CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_PUBLIC_URL`) và Email SMTP (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`) phụ thuộc hoàn toàn vào file `.env`.
* **Trang Quản trị Hệ thống (Admin Settings UI):**
  * Chưa có bảng cơ sở dữ liệu `system_settings` trong Prisma schema.
  * Chưa có module `SettingsModule` / `SystemSettingsService`.
  * Chưa có trang `/admin/settings` trên giao diện web Admin Portal (`frontend`), chưa có mục "Cấu hình Hệ thống" trong thanh điều hướng sidebar.

### 1.2. Mục tiêu đạt được (Target State)
1. **Mô hình Dữ liệu Linh hoạt (Flexible Database Model):**
   * Bảng `system_settings` theo cấu trúc Key-Value phân nhóm (`group`) với cờ bảo mật `isSecret`. Cho phép mở rộng thêm bất kỳ cấu hình mới nào mà không cần sửa schema Prisma hay chạy lại migration.
2. **Cơ chế Fallback .env & Redis Cache Không gián đoạn (Zero-Downtime & High Performance):**
   * Cung cấp `SystemSettingsService` toàn cục. Hệ thống luôn ưu tiên đọc cấu hình từ Redis cache (sub-millisecond) $\rightarrow$ nếu miss đọc PostgreSQL $\rightarrow$ nếu trong DB chưa có giá trị, tự động fallback về biến môi trường `.env`.
   * Chuyển đổi an toàn, mã nguồn cũ không bao giờ bị gãy vỡ kể cả khi chưa có dữ liệu trong DB.
3. **Bảo vệ Secret & Ghi vết Lịch sử (Security & Audit Trail):**
   * Các tham số nhạy cảm (`isSecret: true`) tự động được làm mặt nạ (`••••••••••••`) khi trả về frontend.
   * Cơ chế Safe-Update: Giữ nguyên secret cũ nếu admin không nhập giá trị mới.
   * Mọi thay đổi cấu hình đều được ghi vào bảng `audit_logs` với action `SYSTEM_SETTINGS_UPDATE`.
4. **Bộ công cụ Kiểm tra Kết nối Trực tiếp (Diagnostic Test Tools):**
   * Cho phép Admin bấm nút test trực tiếp: Thử kết nối R2 Bucket, Gửi email kiểm tra SMTP tới hòm thư admin, Tạo mã QR VietQR mẫu quét thử.
5. **Giao diện Admin Settings Chuyên nghiệp (`/admin/settings`):**
   * Thiết kế theo chuẩn *Clean Corporate Obsidian Slate* với thanh Tabs ngang chia 4 nhóm:
     1. 💳 Cổng thanh toán (VNPay & VietQR)
     2. ☁️ Lưu trữ Cloud (Cloudflare R2)
     3. ✉️ Dịch vụ Email (SMTP)
     4. ⚙️ Cài đặt chung & Vận hành sàn (Thông tin shop, Chế độ bảo trì)
   * Tích hợp đầy đủ vào `AdminSidebar.tsx`, `AdminLayout.tsx` và cấu hình phân quyền nghiêm ngặt cho `Role.ADMIN` trong `AppRoutes.tsx`.

---

## 2. Kiến trúc Cơ sở dữ liệu (Database Schema)

### 2.1. Model `SystemSetting` trong `backend/prisma/schema.prisma`
```prisma
model SystemSetting {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String   @db.Text
  group       String   // 'PAYMENT' | 'STORAGE' | 'EMAIL' | 'GENERAL'
  isSecret    Boolean  @default(false)
  description String?
  updatedBy   String?  // Lưu ID của Admin cập nhật gần nhất
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  @@index([group])
  @@map("system_settings")
}
```

### 2.2. Danh sách Cấu hình Chuẩn & Seed Mặc định (Default Keys)
| Nhóm (`group`) | Khóa (`key`) | `isSecret` | Giá trị mặc định / Fallback .env | Ý nghĩa |
| :--- | :--- | :---: | :--- | :--- |
| **PAYMENT** | `PAYMENT_VNPAY_ENABLED` | `false` | `true` | Bật/tắt phương thức thanh toán VNPay |
| **PAYMENT** | `VNPAY_TMN_CODE` | `false` | `process.env.VNPAY_TMN_CODE` | Mã Terminal của VNPay |
| **PAYMENT** | `VNPAY_HASH_SECRET` | `true` | `process.env.VNPAY_HASH_SECRET` | Chuỗi bí mật mã hóa checksum VNPay |
| **PAYMENT** | `VNPAY_URL` | `false` | `process.env.VNPAY_URL` | URL cổng thanh toán VNPay |
| **PAYMENT** | `VNPAY_RETURN_URL` | `false` | `process.env.VNPAY_RETURN_URL` | URL callback sau khi thanh toán |
| **PAYMENT** | `PAYMENT_VIETQR_ENABLED` | `false` | `true` | Bật/tắt phương thức chuyển khoản VietQR |
| **PAYMENT** | `VIETQR_BANK_ID` | `false` | `process.env.VIETQR_BANK_ID` | Mã ngân hàng VietQR (MB, VCB, ICB...) |
| **PAYMENT** | `VIETQR_ACCOUNT_NO` | `false` | `process.env.VIETQR_ACCOUNT_NO` | Số tài khoản ngân hàng nhận tiền |
| **PAYMENT** | `VIETQR_ACCOUNT_NAME` | `false` | `process.env.VIETQR_ACCOUNT_NAME` | Tên chủ sở hữu tài khoản ngân hàng |
| **PAYMENT** | `VIETQR_TEMPLATE` | `false` | `compact` | Mẫu hiển thị QR (`compact`, `qr_only`) |
| **STORAGE** | `CLOUDFLARE_R2_ACCOUNT_ID`| `false` | `process.env.CLOUDFLARE_R2_ACCOUNT_ID` | ID tài khoản Cloudflare |
| **STORAGE** | `CLOUDFLARE_R2_BUCKET` | `false` | `process.env.CLOUDFLARE_R2_BUCKET` | Tên bucket R2 |
| **STORAGE** | `CLOUDFLARE_R2_ACCESS_KEY_ID` | `false` | `process.env.CLOUDFLARE_R2_ACCESS_KEY_ID` | S3 Access Key ID cho R2 |
| **STORAGE** | `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | `true` | `process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY` | S3 Secret Access Key cho R2 |
| **STORAGE** | `CLOUDFLARE_R2_PUBLIC_URL`| `false` | `process.env.CLOUDFLARE_R2_PUBLIC_URL` | Public Domain / CDN URL của media |
| **EMAIL** | `EMAIL_HOST` | `false` | `process.env.EMAIL_HOST` | Địa chỉ máy chủ SMTP (smtp.gmail.com) |
| **EMAIL** | `EMAIL_PORT` | `false` | `process.env.EMAIL_PORT` \|\| `587` | Cổng SMTP (587 / 465) |
| **EMAIL** | `EMAIL_SECURE` | `false` | `false` | Sử dụng kết nối SSL/TLS trực tiếp |
| **EMAIL** | `EMAIL_USER` | `false` | `process.env.EMAIL_USER` | Tên đăng nhập / Email gửi mail |
| **EMAIL** | `EMAIL_PASS` | `true` | `process.env.EMAIL_PASS` | Mật khẩu ứng dụng SMTP |
| **EMAIL** | `EMAIL_FROM` | `false` | `process.env.EMAIL_FROM` | Tên người gửi hiển thị (From header) |
| **GENERAL** | `STORE_NAME` | `false` | `MobileCommerce Store` | Tên cửa hàng / Sàn thương mại |
| **GENERAL** | `STORE_HOTLINE` | `false` | `1900 6868` | Số hotline chăm sóc khách hàng |
| **GENERAL** | `STORE_EMAIL` | `false` | `support@mobilecommerce.vn` | Email hỗ trợ khách hàng |
| **GENERAL** | `STORE_ADDRESS` | `false` | `Hồ Chí Minh, Việt Nam` | Địa chỉ showroom / văn phòng |
| **GENERAL** | `MAINTENANCE_MODE` | `false` | `false` | Bật/tắt chế độ bảo trì hệ thống |

---

## 3. Kiến trúc Backend & Tầng Service (Backend Specifications)

### 3.1. `SystemSettingsModule` & `SystemSettingsService` Toàn cục
* Đặt tại: `backend/src/modules/settings/`
* Khai báo `@Global()` trong `SettingsModule` và đăng ký vào `AppModule`.
* **Cơ chế hoạt động của `SystemSettingsService`:**
  ```typescript
  @Injectable()
  export class SystemSettingsService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly config: ConfigService,
      @Inject(CACHE_MANAGER) private readonly cache: Cache,
      private readonly auditLogService: AuditLogService,
    ) {}

    // Lấy cấu hình theo key (Cache -> DB -> Fallback .env)
    async get<T = string>(key: string, defaultValue?: T): Promise<T> {
      const cacheKey = `settings:key:${key}`;
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== undefined && cached !== null) return cached;

      const record = await this.prisma.systemSetting.findUnique({ where: { key } });
      if (record && record.value !== null && record.value !== '') {
        const val = record.value as unknown as T;
        await this.cache.set(cacheKey, val, 3600); // 1 hour TTL
        return val;
      }

      // Fallback về .env qua ConfigService
      const envVal = this.config.get<T>(key, defaultValue as T);
      return envVal;
    }

    // Cập nhật cấu hình có bảo vệ secret & audit logging
    async updateBatch(
      settings: Array<{ key: string; value: string; group?: string }>,
      adminUserId: string,
    ): Promise<void>
  }
  ```

### 3.2. Refactor Tích hợp vào các Service Hiện có
1. **`PaymentsService` (`backend/src/modules/payments/payments.service.ts`):**
   * Thay thế các lệnh gọi tĩnh `this.configService.get('VNPAY_TMN_CODE')` bằng `await this.settingsService.get('VNPAY_TMN_CODE')`.
   * Kiểm tra `PAYMENT_VNPAY_ENABLED`: Nếu `false`, từ chối tạo giao dịch thanh toán VNPay và báo lỗi phương thức đang tạm dừng.
2. **`VietqrService` (`backend/src/modules/payments/vietqr.service.ts`):**
   * Nạp `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` từ `settingsService`.
   * Kiểm tra `PAYMENT_VIETQR_ENABLED`: Nếu `false`, báo phương thức chuyển khoản tạm ngưng.
3. **`StorageService` (`backend/src/infrastructure/storage/storage.service.ts`):**
   * Khởi tạo S3Client linh hoạt dựa trên cấu hình trả về từ `settingsService`.
4. **`EmailService` (`backend/src/infrastructure/email/email.service.ts`):**
   * Tái tạo transporter nếu cấu hình SMTP trong DB thay đổi.

### 3.3. Danh sách REST Endpoints
* **`GET /admin/settings`**: Lấy toàn bộ cấu hình theo 4 nhóm (`payment`, `storage`, `email`, `general`), các trường bí mật được che phủ `••••••••••••`.
* **`PATCH /admin/settings`**: Cập nhật danh sách key-value, kiểm tra nếu giá trị là `••••••••••••` thì bỏ qua không ghi đè, xóa cache Redis, ghi Audit Log.
* **`POST /admin/settings/test/storage`**: Khởi tạo thử nghiệm S3Client với tham số cấu hình và gọi `ListObjectsV2Command` (MaxKeys=1) đến Cloudflare R2 bucket.
* **`POST /admin/settings/test/email`**: Gửi 1 email kiểm thử với nội dung test kết nối đến email của Admin đang gọi API.
* **`POST /admin/settings/test/vietqr`**: Tạo payload và link ảnh mã QR VietQR mẫu 10,000 VNĐ.
* **`GET /settings/public`**: Public endpoint phục vụ khách hàng / Storefront lấy tên shop, hotline, trạng thái bảo trì và cổng thanh toán khả dụng.

---

## 4. Giao diện Người dùng Admin Settings (Frontend Specification)

### 4.1. Cấu trúc Trang `/admin/settings` (`frontend/src/pages/Admin/Settings/`)
* **Thành phần chính:**
  * `AdminSettingsPage.tsx`: Trang chủ quản lý tab, lưu cấu hình tổng thể, nạp dữ liệu.
  * `PaymentSettingsTab.tsx`: Cấu hình VNPay & VietQR kèm nút test QR và test VNPay.
  * `StorageSettingsTab.tsx`: Cấu hình Cloudflare R2 kèm nút test kết nối bucket.
  * `EmailSettingsTab.tsx`: Cấu hình SMTP Server kèm nút gửi mail kiểm tra.
  * `GeneralSettingsTab.tsx`: Cấu hình thông tin sàn, hotline, địa chỉ, chế độ bảo trì.
  * `VietQRTestModal.tsx`: Modal popup hiển thị ảnh mã QR VietQR mẫu 10,000đ để quét thử.

### 4.2. Ma trận Trạng thái Giao diện (State Coverage)
| Trạng thái (State) | Biểu hiện trên Giao diện |
| :--- | :--- |
| **Loading** | Hiển thị Skeleton card và tabs khi đang nạp dữ liệu ban đầu từ `GET /admin/settings`. |
| **Default / Env Fallback** | Đối với các input đang lấy giá trị mặc định từ `.env`, hiển thị một tag Badge nhỏ `(Mặc định .env)` bên cạnh label để Admin phân biệt. |
| **Unsaved Changes** | Khi Admin chỉnh sửa bất kỳ ô input nào, nút "Lưu thay đổi" chuyển sang trạng thái kích hoạt (Active Blue) kèm dot badge cam báo "Có thay đổi chưa lưu". |
| **Submitting** | Nút lưu hiển thị icon xoay loading, toàn bộ form chuyển sang disabled để chống click trùng lặp (double submit). |
| **Success Toast** | Hiển thị notification: "Đã cập nhật cấu hình hệ thống thành công. Cache hệ thống đã được làm mới." |
| **Test Connection Dialog** | Khi bấm nút test R2 / Email / VietQR: Hiển thị loading spinner trong nút $\rightarrow$ mở Modal hiển thị chi tiết phản hồi kết nối (Xanh lá nếu thành công, Đỏ nếu thất bại kèm mã lỗi chi tiết). |

### 4.3. Tích hợp Điều hướng & Phân quyền
* **`frontend/src/components/admin/AdminSidebar.tsx` & `AdminLayout.tsx`:**
  * Thêm mục:
    ```typescript
    {
      key: '/admin/settings',
      icon: <SettingOutlined style={{ fontSize: 16 }} />,
      label: 'Cấu hình Hệ thống',
    }
    ```
* **`frontend/src/routes/AppRoutes.tsx`:**
  * Đăng ký route và kiểm tra quyền hạn `Role.ADMIN`:
    ```tsx
    <Route
      path="/admin/settings"
      element={
        <ProtectedRoute allowedRoles={[Role.ADMIN]}>
          <AdminSettingsPage />
        </ProtectedRoute>
      }
    />
    ```

---

## 5. Kế hoạch Kiểm thử & Xác minh (Verification & Testing Plan)

1. **Unit Tests (Backend):**
   * Kiểm thử `SystemSettingsService`:
     * Đọc giá trị ưu tiên: Redis Cache $\rightarrow$ PostgreSQL $\rightarrow$ Fallback ConfigService.
     * Kiểm thử hàm `updateBatch`: Giữ nguyên secret khi nhận chuỗi `••••••••••••`, xóa cache Redis, ghi Audit Log chính xác.
   * Kiểm thử `SettingsController`: Quyền hạn truy cập `Role.ADMIN`, endpoint `/settings/public` không làm lộ secret.
2. **Integration Tests (Connection Diagnostics):**
   * Endpoint test VietQR sinh link QR hợp lệ.
   * Endpoint test Storage xử lý đúng khi bucket sai / credentials sai.
   * Endpoint test Email xử lý đúng khi SMTP host không phản hồi.
3. **Frontend E2E & Component Tests (Vitest + Playwright):**
   * Kiểm tra giao diện `/admin/settings` nạp đúng 4 tabs.
   * Kiểm tra việc chỉnh sửa giá trị và submit form.
   * Kiểm tra modal popup Test QR và thông báo kết quả test R2/Email.
