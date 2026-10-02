# Design Specification: MobileCommerce Big Refactor

- **Date:** 2026-10-02
- **Author:** Antigravity AI
- **Status:** Draft / In Review
- **Target Stack:** 
  - Frontend: React 19 + Vite 8 + Tailwind CSS + Ant Design 5 + TanStack Query + Zustand
  - Backend: Node.js + NestJS 11 + Prisma ORM 7 + Supabase PostgreSQL + Redis (BullMQ + Cache)
  - Infrastructure: Docker Compose + Nginx Reverse Proxy

---

## 1. Executive Summary & Goals

Dự án **MobileCommerce** cần một đợt **Big Refactor** toàn diện để nâng cấp từ phiên bản hiện tại thành một nền tảng thương mại điện tử chuyên biệt cho thiết bị di động đạt tiêu chuẩn thực tế cao:
1. **Kiểm soát vòng đời IMEI nghiêm ngặt:** Đảm bảo không bao giờ bán trùng máy, khóa giữ chỗ IMEI tự động 15 phút khi checkout, tự động nhả kho khi hết hạn qua Redis BullMQ, và tự động kích hoạt bảo hành theo IMEI khi thanh toán thành công.
2. **Cổng thanh toán thực tế tại Việt Nam:** COD, VietQR động (chuyển khoản quét mã), và cổng trực tuyến VNPay Sandbox chuẩn IPN.
3. **Bộ dữ liệu mẫu thực tế (Seed Data):** Các hãng lớn (Apple, Samsung, Xiaomi), sản phẩm thực tế, biến thể màu/dung lượng, tồn kho, danh sách IMEI hợp lệ chuẩn Luhn, tài khoản Admin/Staff/Khách hàng.
4. **Giao diện Frontend hoàn chỉnh & phân tách rõ ràng:**
   - **Storefront (Khách hàng):** Tailwind CSS hiện đại, tối ưu mobile-first, mượt mà và trực quan.
   - **Admin Portal (Quản trị):** Ant Design 5 chuyên nghiệp cho data table, form nhập liệu, bảng quản lý lô IMEI, điều phối đơn hàng và báo cáo doanh thu.
   - **State Management:** TanStack Query (cache server state) + Zustand (client state).

---

## 2. Kiến trúc Hệ thống (System Architecture)

```text
                                  CLIENT BROWSERS
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
             STOREFRONT (Tailwind CSS)           ADMIN PORTAL (Ant Design)
             Khách hàng mua sắm                  Quản trị viên & Nhân viên
                        │                                 │
                        └────────────────┬────────────────┘
                                         ▼
                                   NGINX REVERSE PROXY
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
                 FRONTEND (Vite)                   BACKEND (NestJS 11)
               Static Assets (Port 80/5173)        API Gateway (/api - Port 3000)
                                                          │
                                         ┌────────────────┼────────────────┐
                                         ▼                ▼                ▼
                                    Auth & RBAC       Idempotency     Rate Limiter
                                         │                │                │
                                         └────────────────┼────────────────┘
                                                          │
                                         ┌────────────────┴────────────────┐
                                         ▼                                 ▼
                                  REDIS INSTANCE                   SUPABASE CLOUD
                                 ├── Cache Manager                 ├── PostgreSQL (Prisma 7)
                                 ├── BullMQ (Jobs/Delay)           └── Object Storage
                                 └── Distributed Lock
```

---

## 3. Thiết kế Cơ sở dữ liệu & Seed Data (Database & Prisma)

### 3.1 Cải tiến Prisma Schema
1. **OrderItem & IMEI:**
   - Trường `imeiDeviceId` trong `OrderItem` lưu liên kết 1-1 với `ImeiDevice`.
   - Bổ sung `holdExpiresAt` trong `OrderItem` / `Order` để theo dõi thời gian 15 phút giữ chỗ.
2. **Tự động kích hoạt Bảo hành:**
   - Bảng `Warranty` liên kết trực tiếp với `ImeiDevice` và `OrderItem`, sinh mã `WRT-...` ngay khi đơn hàng chuyển sang `PAID` hoặc `DELIVERED`.
3. **Audit Log & Idempotency:**
   - Giữ nguyên bảng `idempotency_records` và `audit_logs` để ghi vết giao dịch nhạy cảm.

### 3.2 Kế hoạch Seed Data Thực tế (`prisma/seed.ts`)
- **Roles:** `ADMIN`, `STAFF`, `USER`.
- **Users:**
  - Admin: `admin@mobilecommerce.vn` / `Admin@123456`
  - Staff: `staff@mobilecommerce.vn` / `Staff@123456`
  - Customer: `customer@gmail.com` / `Customer@123456`
- **Brands:** Apple, Samsung, Xiaomi, OPPO, Sony.
- **Categories:** Flagship Smartphone, Tầm trung - Giá rẻ, Gaming Phone, Máy tính bảng, Phụ kiện chính hãng.
- **Sản phẩm & Biến thể thực tế:**
  - *iPhone 15 Pro Max*: Titan Tự Nhiên, Titan Xanh (256GB, 512GB, 1TB)
  - *Samsung Galaxy S24 Ultra*: Xám Titan, Đen Titan (12GB-256GB, 12GB-512GB)
  - *Xiaomi 14 Ultra*: Đen, Trắng (16GB-512GB)
- **Danh sách IMEI:** Mỗi biến thể khởi tạo sẵn 5 - 10 mã IMEI 15 số hợp lệ (chuẩn thuật toán Luhn), trạng thái `AVAILABLE`.
- **Vouchers:** `WELCOME50` (giảm 50k), `FREESHIP` (miễn phí vận chuyển), `VIP10` (giảm 10% tối đa 1 triệu).

---

## 4. Backend Refactoring & Nghiệp vụ cốt lõi

### 4.1 Cơ chế Đặt hàng & Khóa IMEI Concurrency (15 Phút)
- **Luồng Checkout:**
  1. Kiểm tra giỏ hàng và số lượng tồn kho `availableQty`.
  2. Bắt đầu một **Prisma Transaction**:
     - Với mỗi sản phẩm trong giỏ: Tìm `n` bản ghi `ImeiDevice` thuộc `variantId` có trạng thái `AVAILABLE` (sử dụng câu lệnh có khóa dòng hoặc atomic update).
     - Cập nhật các bản ghi IMEI đó sang `RESERVED`.
     - Trừ `availableQty`, cộng `reservedQty` trong `Inventory`.
     - Tạo `Order` (trạng thái `PENDING`), tạo các `OrderItem` kèm ID của từng IMEI vừa giữ chỗ.
  3. Đẩy một job vào BullMQ `order-queue`: `jobName: 'expire-order-hold'`, delay: `15 * 60 * 1000` (15 phút).
- **Luồng Xử lý Hết hạn (BullMQ Worker):**
  - Worker kiểm tra nếu sau 15 phút `Order` vẫn ở trạng thái `PENDING`:
    - Chuyển `Order.status = CANCELLED` (lý do: Quá hạn thanh toán).
    - Cập nhật các `ImeiDevice` liên quan từ `RESERVED` về `AVAILABLE`.
    - Trừ `reservedQty`, hoàn lại `availableQty` trong `Inventory`.
- **Luồng Thanh toán thành công:**
  - Cập nhật `Order.status = CONFIRMED`, `Payment.status = PAID`.
  - Cập nhật `ImeiDevice.status = SOLD`, gán `soldAt = now()`.
  - Tự động tạo bản ghi `Warranty` tương ứng với mã bảo hành `WRT-XXX` và thời hạn (12 tháng).
  - Gửi email xác nhận đơn hàng qua `EmailService`.

### 4.2 Module Thanh toán (Payments)
1. **COD (Cash on Delivery):**
   - Tạo đơn thanh toán với trạng thái `PENDING`, nhân viên xác nhận đơn và thanh toán hoàn tất khi giao hàng (`DELIVERED`).
2. **VietQR (Chuyển khoản Ngân hàng tự động):**
   - Sinh link ảnh QR động theo chuẩn Napas 247:
     `https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png?amount={TOTAL}&addInfo={ORDER_NUMBER}&accountName={ACCOUNT_NAME}`
   - Cho phép khách quét trực tiếp từ app ngân hàng với đúng số tiền và nội dung đơn.
   - Nút kiểm tra trạng thái / xác nhận đã chuyển khoản.
3. **VNPay Sandbox:**
   - Endpoint `POST /api/payments/vnpay/create-url`: Ký chuỗi HMAC-SHA512 với secret key, sinh URL chuyển hướng khách sang cổng thanh toán VNPay.
   - Endpoint `GET /api/payments/vnpay/ipn`: Xử lý Webhook (IPN) server-to-server, verify chữ ký, cập nhật trạng thái đơn hàng an toàn.
   - Endpoint `GET /api/payments/vnpay/return`: Nhận kết quả redirect người dùng quay lại giao diện web và hiển thị trạng thái thanh toán.

### 4.3 Chuẩn hóa Codebase Backend
- Loại bỏ toàn bộ `as any` casting, định nghĩa DTOs chặt chẽ với `class-validator`.
- Chuẩn hóa format phản hồi qua `ResponseInterceptor`: `{ success: true, statusCode: 200, message: "...", data: ... }`.
- Phân quyền RBAC qua `@Roles(Role.ADMIN, Role.STAFF)` và `RolesGuard`.

---

## 5. Kiến trúc & Thiết kế Frontend (React + Vite)

### 5.1 Cấu trúc Thư mục Frontend
```text
frontend/src/
├── assets/             # Logo, banners, placeholder images
├── components/
│   ├── common/         # Button, Input, Modal, Loading, Pagination, Badge
│   ├── layout/         # Header, Footer, AdminSidebar, AdminHeader, Breadcrumbs
│   ├── storefront/     # ProductCard, VariantSelector, PriceTag, CartDrawer, ImeiLookupCard
│   └── admin/          # DataTable, StatusTag, StatCard, ImeiBatchModal, OrderActionModal
├── layouts/
│   ├── StorefrontLayout.tsx   # Header + Navbar + Outlet + Footer
│   ├── AdminLayout.tsx        # AntD Sider + Header + Content + Outlet
│   └── AuthLayout.tsx         # Clean centered layout for Login/Register
├── pages/
│   ├── storefront/
│   │   ├── Home/              # Hero banner, Flash sale, Brand grid, Top phones
│   │   ├── Products/          # Product listing with filters (Brand, RAM, ROM, Price)
│   │   ├── ProductDetail/     # Image gallery, Variant selector, Specs, Reviews
│   │   ├── Cart/              # Full cart page with coupon input
│   │   ├── Checkout/          # Address selection, payment method (COD/VietQR/VNPay), 15m countdown
│   │   ├── OrderSuccess/      # Order receipt, VietQR view (if chosen), payment status
│   │   ├── WarrantyLookup/    # Tra cứu bảo hành công khai bằng mã IMEI hoặc số điện thoại
│   │   └── Profile/           # My Orders, My Warranties, Address book
│   ├── admin/
│   │   ├── Dashboard/         # Doanh thu, Đơn hàng mới, Cảnh báo tồn kho, Biểu đồ
│   │   ├── Products/          # Quản lý sản phẩm, biến thể, giá cả
│   │   ├── InventoryImei/     # Quản lý kho, Danh sách IMEI từng máy, Nhập lô IMEI
│   │   ├── Orders/            # Quản lý và duyệt trạng thái đơn hàng (Pending -> Delivered)
│   │   ├── Vouchers/          # Quản lý mã giảm giá
│   │   └── Users/             # Phân quyền nhân viên và khách hàng
│   └── auth/
│       ├── Login.tsx
│       └── Register.tsx
├── services/
│   ├── apiClient.ts           # Axios instance with JWT interceptor & auto-refresh token
│   ├── authService.ts
│   ├── productService.ts
│   ├── cartService.ts
│   ├── orderService.ts
│   ├── paymentService.ts
│   ├── imeiService.ts
│   └── warrantyService.ts
├── stores/
│   ├── useAuthStore.ts        # Zustand: user, token, login, logout
│   └── useCartStore.ts        # Zustand: cart items, drawer open/close
└── routes/
    ├── AppRoutes.tsx
    ├── ProtectedRoute.tsx
    └── AdminRoute.tsx
```

### 5.2 Ngôn ngữ Thiết kế UI/UX
- **Storefront:**
  - Màu chủ đạo: Dark Navy (`#0f172a`) và Accent Blue/Red (`#2563eb` / `#e11d48`).
  - Giao diện hiện đại phong cách Apple/Thế Giới Di Động.
  - Variant selector: Bấm chọn màu sắc & dung lượng nhảy giá và trạng thái tồn kho ngay lập tức.
  - Countdown Timer: Đồng hồ đếm ngược 15:00 giữ chỗ IMEI trên trang Checkout để kích thích chuyển đổi và cảnh báo người dùng.
- **Admin Portal:**
  - Giao diện Ant Design 5 chuẩn doanh nghiệp (Thư viện `antd` + `@ant-design/icons`).
  - Bảng dữ liệu có phân trang, lọc theo trạng thái (`AVAILABLE`, `RESERVED`, `SOLD`).
  - Thao tác nhanh: Nhập danh sách IMEI theo lô (mỗi dòng 1 IMEI, có kiểm tra lỗi trước khi lưu).

---

## 6. Chiến lược Kiểm thử & Đảm bảo Chất lượng (Quality & Testing)
1. **Luhn Algorithm Check:** Unit test kiểm tra tính chính xác của hàm validate IMEI 15 chữ số.
2. **Concurrency Test:** Giả lập 2 yêu cầu checkout cùng lúc cho cùng một biến thể chỉ còn 1 IMEI duy nhất để đảm bảo chỉ có 1 đơn thành công, đơn còn lại báo hết hàng.
3. **Hold Expiry Test:** Kiểm tra BullMQ worker tự giải phóng IMEI sau khi hết hạn 15 phút.
4. **End-to-End Build Verification:** Cả backend (`nest build`) và frontend (`vite build`) phải biên dịch thành công 100% không có lỗi type.

---

## 7. Phân kỳ Kế hoạch Triển khai (Implementation Phases)
- **Phase 1: Backend Foundation & Real Seed Data** (Schema, Seed, Transaction & IMEI Lock, BullMQ Timeout Worker).
- **Phase 2: Payment Integrations** (VietQR Generator, VNPay Sandbox URL & IPN Webhook, COD).
- **Phase 3: Frontend Foundation & Setup** (Tailwind + Ant Design, Axios Client, Auth & Cart Stores, Routing).
- **Phase 4: Storefront Development** (Home, Product Catalog, Product Detail with live variant switch, Cart, Checkout with 15m timer, Order Success & VietQR Modal, Warranty Lookup).
- **Phase 5: Admin Portal Development** (Dashboard, Product CRUD, IMEI & Inventory Manager with batch import, Order Fulfillment).
- **Phase 6: Integration, Testing & Final Verification** (Test toàn bộ flow mua hàng từ frontend đến backend, kiểm tra build production).
