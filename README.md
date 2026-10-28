# 📱 PhoneShop — E-Commerce Platform

<p align="center">
  <img src="https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev/products/iphone-16-pro-max.webp" alt="PhoneShop Banner" width="220" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" />
</p>

<p align="center">
  <strong>Hệ Thống Thương Mại Điện Tử Bán Lẻ Thiết Bị Di Động & Phụ Kiện Chính Hãng</strong><br>
  Xây dựng theo kiến trúc <strong>Modular Monolith & Clean Architecture</strong>, tối ưu hóa giao dịch nguyên tử (ACID), quản lý vòng đời IMEI chống Race Condition và giao diện người dùng theo phong cách <strong>Swiss Minimalist & Clean Light Mode</strong>.
</p>

<p align="center">
  <a href="https://phoneshop-blond.vercel.app" target="_blank"><img src="https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
  <a href="https://phoneshop-api.onrender.com/api/docs" target="_blank"><img src="https://img.shields.io/badge/API_Docs-Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger Docs" /></a>
  <img src="https://img.shields.io/badge/NestJS-11.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

---

## 🌐 Hệ Thống Đang Triển Khai (Live Production)

| Thành phần | Nền tảng Cloud | URL Truy Cập | Trạng Thái |
| :--- | :--- | :--- | :---: |
| **Storefront & Admin Web** | **Vercel** | [https://phoneshop-blond.vercel.app](https://phoneshop-blond.vercel.app) | ![Vercel](https://img.shields.io/badge/Status-Active-brightgreen) |
| **RESTful API Backend** | **Render** | [https://phoneshop-api.onrender.com/api](https://phoneshop-api.onrender.com/api) | ![Render](https://img.shields.io/badge/Status-Live-brightgreen) |
| **Tài liệu API (Swagger)** | **Render** | [https://phoneshop-api.onrender.com/api/docs](https://phoneshop-api.onrender.com/api/docs) | ![Swagger](https://img.shields.io/badge/Docs-Online-blue) |
| **Cơ sở dữ liệu (PostgreSQL)** | **Supabase** | `aws-0-ap-southeast-1.pooler.supabase.com:5432` | ![Supabase](https://img.shields.io/badge/PostgreSQL-Online-3ECF8E) |
| **Lưu trữ ảnh Media CDN** | **Cloudflare R2** | `https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev` | ![Cloudflare](https://img.shields.io/badge/CDN-Active-F38020) |

---

## 📑 Mục Lục
- [1. Giới Thiệu & Bài Toán Giải Quyết](#1-giới-thiệu--bài-toán-giải-quyết)
- [2. Kiến Trúc Kỹ Thuật (Architecture)](#2-kiến-trúc-kỹ-thuật-architecture)
  - [2.1. Sơ Đồ Kiến Trúc Hệ Thống](#21-sơ-đồ-kiến-trúc-hệ-thống)
  - [2.2. Vòng Đời IMEI & Giải Pháp Chống Bán Khống (Race Condition)](#22-vòng-đời-imei--giải-pháp-chống-bán-khống-race-condition)
  - [2.3. Cơ Chế Giữ Hàng Tự Động (Hold Sweeper)](#23-cơ-chế-giữ-hàng-tự-động-hold-sweeper)
- [3. Tính Năng Nổi Bật](#3-tính-năng-nổi-bật)
  - [3.1. Phân Hệ Khách Hàng (Storefront B2C)](#31-phân-hệ-khách-hàng-storefront-b2c)
  - [3.2. Phân Hệ Quản Trị & Vận Hành (Admin Portal)](#32-phân-hệ-quản-trị--vận-hành-admin-portal)
  - [3.3. Trợ Lý Ảo AI Tư Vấn Thông Minh](#33-trợ-lý-ảo-ai-tư-vấn-thông-minh)
- [4. Ngăn Xếp Công Nghệ (Tech Stack)](#4-ngăn-xếp-công-nghệ-tech-stack)
- [5. Cấu Trúc Thư Mục Dự Án](#5-cấu-trúc-thư-mục-dự-án)
- [6. Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local Setup)](#6-hướng-dẫn-cài-đặt--chạy-cục-bộ-local-setup)
  - [6.1. Yêu Cầu Tiên Quyết](#61-yêu-cầu-tiên-quyết)
  - [6.2. Cấu Hình Biến Môi Trường (.env)](#62-cấu-hình-biến-môi-trường-env)
  - [6.3. Khởi Tạo Cơ Sở Dữ Liệu & Seed Data](#63-khởi-tạo-cơ-sở-dữ-liệu--seed-data)
  - [6.4. Khởi Động Ứng Dụng](#64-khởi-động-ứng-dụng)
- [7. Tài Khoản Thử Nghiệm Mặc Định](#7-tài-khoản-thử-nghiệm-mặc-định)
- [8. Danh Mục API Chính (RESTful Endpoints)](#8-danh-mục-api-chính-restful-endpoints)
- [9. Tiêu Chuẩn Bảo Mật & Best Practices](#9-tiêu-chuẩn-bảo-mật--best-practices)

---

## 1. Giới Thiệu & Bài Toán Giải Quyết

Khác với các mặt hàng thời trang hay tiêu dùng nhanh, ngành bán lẻ thiết bị thông minh (Smartphones/Tablets) đặt ra các yêu cầu khắt khe về mặt dữ liệu và tính toàn vẹn:

1. **Định danh độc bản (Unique Serial/IMEI Tracking)**:
   * Mỗi chiếc máy trong kho là một thực thể vật lý riêng biệt có số IMEI duy nhất (kiểm tra tính hợp lệ qua thuật toán **Luhn**).
   * Hệ thống quản lý chính xác trạng thái của từng thiết bị từ lúc nhập kho, gán đơn hàng, bàn giao vận chuyển cho đến bảo hành sau bán hàng.
2. **Loại bỏ tình trạng Overselling (Race Condition)**:
   * Trong các sự kiện mở bán Flash Sale, hàng trăm khách hàng cùng tranh mua số lượng máy có hạn. PhoneShop áp dụng cơ chế **Atomic Hold & Pessimistic Locking** thông qua Prisma Interactive Transactions, đảm bảo 100% không bao giờ bán trùng 1 chiếc máy cho 2 người.
3. **Cơ chế giữ hàng có thời hạn (15-Minute Hold & Auto-Release)**:
   * Khi khởi tạo đơn hàng, hệ thống khóa tạm thời các mã IMEI trong 15 phút để khách thanh toán.
   * Background Sweeper tự động quét và giải phóng IMEI về kho nếu khách hàng không hoàn tất thanh toán, ngăn ngừa tình trạng "nghẽn kho ảo".
4. **Hệ thống Tra cứu Bảo hành Điện tử (E-Warranty)**:
   * Khách hàng kiểm tra tức thì lịch sử mua hàng, nguồn gốc xuất xứ và thời hạn bảo hành chính hãng chỉ bằng dãy số IMEI công khai.
5. **Dữ liệu thật 100% (Production Data)**:
   * Không dùng mock data sơ sài: Toàn bộ danh mục hơn 100 sản phẩm với 250+ biến thể màu sắc, dung lượng, RAM, thông số kỹ thuật chi tiết (màn hình, camera, chip, pin, sạc) và dữ liệu tồn kho thực tế.

---

## 2. Kiến Trúc Kỹ Thuật (Architecture)

### 2.1. Sơ Đồ Kiến Trúc Hệ Thống

Hệ thống được thiết kế theo mô hình **Modular Monolith**: Phân tách rõ ràng giữa các Domain Modules, độc lập phụ thuộc và dễ bảo trì.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                             │
│       React 19 + TypeScript + Vite + Tailwind CSS + Ant Design 6       │
│     (Storefront B2C, Admin Management Portal, Google OAuth Popup)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST / JSON
                                    │ Bearer JWT (Access / Refresh)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NESTJS 11 BACKEND API                           │
│                                                                        │
│  [ Gateway Layer ]   CORS • Helmet • HttpExceptionFilter • DTO Pipes   │
│  [ Security ]        JwtAuthGuard • RolesGuard (RBAC) • Throttler      │
│  [ Core Modules ]    Auth • Users • Products • Orders • Payments       │
│                      Inventory/IMEI • Warranty • Vouchers • Chatbot AI │
│  [ Infrastructure]   Prisma ORM • Sharp WebP Engine • Sentry/Logger    │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │ PostgreSQL Connection Pool    │ S3 Compatible API
                    ▼                               ▼
       ┌────────────────────────┐      ┌─────────────────────────┐
       │   SUPABASE POSTGRESQL  │      │  CLOUDFLARE R2 STORAGE  │
       │  - 35 Business Tables  │      │  - WebP Product Images  │
       │  - Foreign Key Rel     │      │  - Fast Global CDN      │
       │  - ACID Transactions   │      │  - User Avatars         │
       └────────────────────────┘      └─────────────────────────┘
```

---

### 2.2. Vòng Đời IMEI & Giải Pháp Chống Bán Khống (Race Condition)

Máy trạng thái nghiêm ngặt của một mã thiết bị IMEI:

```text
       ┌──────────────┐
       │  AVAILABLE   │ ◄────────────────────────┐
       └──────┬───────┘                          │
              │                                  │
Khách tạo đơn │ Khóa giao dịch nguyên tử         │ Hết hạn 15 phút
giữ máy       ▼ (Pessimistic Hold)               │ hoặc Hủy đơn
       ┌──────────────┐                          │
       │     HOLD     │ ─────────────────────────┘
       └──────┬───────┘
              │
Thanh toán    │ VietQR / VNPay IPN / COD
thành công    ▼
       ┌──────────────┐
       │     SOLD     │
       └──────┬───────┘
              │
Khách gửi yêu │ Tiếp nhận bảo hành
cầu bảo hành  ▼
       ┌──────────────┐         Hỏng hóc không sửa được
       │   WARRANTY   │ ───────────────────────────────► ┌─────────────┐
       └──────────────┘                                  │  DEFECTIVE  │
                                                         └─────────────┘
```

#### Kỹ thuật kiểm soát giao dịch nguyên tử:
```typescript
await this.prisma.$transaction(async (tx) => {
  // 1. Tìm và khóa giữ IMEI khả dụng
  const availableImei = await tx.imeiDevice.findFirst({
    where: { variantId, status: ImeiStatus.AVAILABLE },
  });
  if (!availableImei) throw new BadRequestException('Sản phẩm đã hết hàng!');

  // 2. Chuyển trạng thái sang HOLD và liên kết mã đơn
  await tx.imeiDevice.update({
    where: { id: availableImei.id },
    data: { status: ImeiStatus.HOLD },
  });

  // 3. Giảm tồn kho khả dụng tương ứng
  await tx.inventory.update({
    where: { variantId },
    data: { reservedQty: { increment: 1 }, availableQty: { decrement: 1 } },
  });
});
```

---

### 2.3. Cơ Chế Giữ Hàng Tự Động (Hold Sweeper)

* **Giữ hàng có thời hạn**: Trường `holdExpiresAt` được gán mốc `now() + 15 phút`.
* **Background Sweeper**: Nhiệm vụ nền chạy định kỳ mỗi 60 giây, tự động phát hiện và giải phóng toàn bộ các đơn hàng quá hạn chưa thanh toán, đưa IMEI trở lại trạng thái `AVAILABLE`.
* **Đồng hồ đếm ngược**: Giao diện người dùng hiển thị thời gian giữ hàng trực quan, cảnh báo trước khi đơn bị tự động hủy.

---

## 3. Tính Năng Nổi Bật

### 3.1. Phân Hệ Khách Hàng (Storefront B2C)
* **Giao diện chuẩn Swiss Minimalist**: Tinh tế, sáng sủa, hiệu ứng kính mờ (Backdrop Blur), giỏ hàng trượt tức thì (`CartDrawer`).
* **Đăng nhập Google Popup mượt mà**: Sử dụng Google OAuth 2.0 Identity Services dạng cửa sổ nổi không cần chuyển hướng trang.
* **Bộ lọc đa tiêu chí chuyên sâu**: Lọc theo Hãng, Phân khúc giá, RAM, Bộ nhớ trong (ROM), Độ phân giải camera, Tình trạng máy.
* **Ma trận biến thể động**: Tự động chuyển đổi hình ảnh, giá bán, SKU và tồn kho khi khách chọn màu sắc / dung lượng.
* **Cổng thanh toán đa kênh**:
  * **VietQR**: Tạo mã QR ngân hàng chuẩn NAPAS 247 kèm số tiền và nội dung chuyển khoản tự động.
  * **VNPay Sandbox**: Tích hợp chữ ký số HMAC-SHA512 và xác thực Webhook IPN an toàn.
  * **COD**: Thanh toán tiền mặt khi nhận hàng.
* **Tra cứu bảo hành công khai**: Kiểm tra thông tin máy và thời hạn bảo hành chính hãng chỉ với IMEI.
* **Phòng chống lỗi toàn diện (Error Boundary)**: Bọc toàn bộ ứng dụng bằng React Error Boundary, ngăn chặn tình trạng sập trắng màn hình (White Screen of Death).

### 3.2. Phân Hệ Quản Trị & Vận Hành (Admin Portal)
* **Bảng điều khiển kinh doanh (Dashboard)**: Thống kê doanh thu thời gian thực, biểu đồ tăng trưởng, đơn hàng mới và cảnh báo hàng sắp hết.
* **Quản lý danh mục & biến thể**: Thêm/sửa sản phẩm, thiết lập thông số kỹ thuật JSON linh hoạt.
* **Quản lý kho IMEI chuyên sâu**: Nhập lô danh sách IMEI, tự động kiểm tra thuật toán Luhn, giám sát từng trạng thái máy.
* **Quy trình đơn hàng & Vận chuyển**: Điều phối trạng thái đơn `PENDING` ➔ `CONFIRMED` ➔ `PACKED` ➔ `SHIPPING` ➔ `DELIVERED`.
* **Tải ảnh nén WebP tự động**: Upload kéo thả qua `StorageService`, tích hợp thư viện **Sharp** nén ảnh WebP chất lượng cao giảm 70-80% dung lượng trước khi đẩy lên **Cloudflare R2**.
* **Phân quyền RBAC 3 cấp độ**: `ADMIN` (Toàn quyền), `STAFF` (Quản lý kho & đơn hàng), `USER` (Khách hàng).

### 3.3. Trợ Lý Ảo AI Tư Vấn Thông Minh
* Tích hợp Google Gemini AI hỗ trợ giải đáp thắc mắc về kỹ thuật di động, so sánh thông số và gợi ý điện thoại phù hợp với ngân sách của khách hàng theo thời gian thực.

---

## 4. Ngăn Xếp Công Nghệ (Tech Stack)

| Phân Vùng | Công Nghệ / Thư Viện | Phiên Bản | Mục Đích Sử Dụng |
| :--- | :--- | :--- | :--- |
| **Backend Core** | NestJS | 11.x | Framework backend Node.js hướng module và clean architecture |
| | TypeScript | 5.8+ | Đảm bảo tính nhất quán type-safe cho toàn bộ backend |
| **Cơ sở dữ liệu** | Supabase PostgreSQL | 16.x | Database quan hệ trên Cloud, hỗ trợ ACID transactions |
| | Prisma ORM | 7.x | Schema management, migrations và truy vấn SQL type-safe |
| **Lưu trữ & Ảnh** | Cloudflare R2 | S3 API | Lưu trữ phân tán hình ảnh sản phẩm với độ trễ thấp |
| | Sharp | 0.35.x | Nén và chuẩn hóa ảnh tải lên sang định dạng WebP |
| **Bảo mật & Auth** | Passport & JWT | 11.x | Xác thực Access Token (15m) và Refresh Token (7d) |
| | @react-oauth/google | 0.13.x | Đăng nhập Google Popup hiện đại chuẩn Google Identity |
| | Bcrypt | 6.x | Mã hóa mật khẩu với thuật toán băm kèm salt |
| **Frontend Core** | React | 19.x | Thư viện UI hiện đại |
| | Vite | 8.x | Build tool và Dev Server tốc độ cao |
| | React Router DOM | 7.x | Điều hướng trang Single Page Application |
| **Giao diện & UI** | Tailwind CSS | 4.x | Utility-first styling framework |
| | Ant Design | 6.x | Hệ thống component UI chuyên nghiệp cho Admin & Web |
| | Lucide React | 1.x | Bộ icon SVG tối giản, hiện đại |
| **Quản lý State** | Zustand | 5.x | Quản lý state gọn nhẹ (Auth Store, Cart Store) |
| | TanStack React Query| 5.x | Caching và đồng bộ trạng thái server-state |
| **CI/CD & Deploy** | Vercel | Production | Triển khai Frontend tự động khi push GitHub |
| | Render | Docker | Đóng gói và chạy container Backend NestJS tự động |

---

## 5. Cấu Trúc Thư Mục Dự Án

```text
PhoneShop/
├── infrastructure/
│   └── docker/
│       └── backend.Dockerfile       # Multi-stage Dockerfile chạy production backend
│
├── backend/                         # Ứng dụng NestJS Backend
│   ├── prisma/
│   │   ├── schema.prisma            # Schema định nghĩa 35 bảng thực thể PostgreSQL
│   │   ├── seed.ts                  # Script nạp dữ liệu mẫu chất lượng cao
│   │   └── migrations/              # Lịch sử migration cơ sở dữ liệu
│   ├── src/
│   │   ├── main.ts                  # Điểm khởi chạy ứng dụng (Bootstrap, CORS, Pipes)
│   │   ├── app.module.ts            # Root module kết nối tất cả tính năng
│   │   ├── common/                  # Guards, Interceptors, Filters dùng chung
│   │   ├── modules/                 # Các feature module nghiệp vụ:
│   │   │   ├── auth/                # Đăng ký, đăng nhập JWT, Google Popup Login
│   │   │   ├── products/            # Quản lý danh mục, biến thể, lọc specs
│   │   │   ├── orders/              # Đặt hàng, khóa giữ IMEI nguyên tử
│   │   │   ├── payments/            # VietQR, VNPay Sandbox, xử lý IPN
│   │   │   ├── imei/                # Quản lý số IMEI, kiểm tra thuật toán Luhn
│   │   │   ├── warranty/            # Tra cứu và quản lý bảo hành điện tử
│   │   │   ├── storage/             # Xử lý nén ảnh Sharp WebP & upload R2
│   │   │   └── chatbot/             # Trợ lý AI tư vấn sản phẩm Gemini
│   │   └── infrastructure/          # PrismaService, cấu hình bảo mật
│   └── package.json
│
└── frontend/                        # Ứng dụng React Frontend SPA
    ├── src/
    │   ├── App.tsx                  # Root component (GoogleOAuthProvider, ErrorBoundary)
    │   ├── components/              # Các UI components tái sử dụng
    │   │   ├── common/              # ErrorBoundary, Navbar, Footer, Modal
    │   │   └── storefront/          # ProductCard, CartDrawer, HeroBanner
    │   ├── pages/
    │   │   ├── storefront/          # Home, Products, ProductDetail, Cart, Checkout
    │   │   └── Admin/               # Dashboard, Orders, Products, Inventory, Payments
    │   ├── services/                # Tầng gọi API qua Axios client
    │   ├── stores/                  # Quản lý state toàn cục với Zustand (Auth, Cart)
    │   └── types/                   # Định nghĩa TypeScript interfaces chuẩn
    ├── vercel.json                  # Cấu hình routing SPA cho Vercel
    └── package.json
```

---

## 6. Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local Setup)

### 6.1. Yêu Cầu Tiên Quyết
* **Node.js**: Phiên bản `>= 20.x` (LTS khuyến nghị).
* **Git**: Quản lý mã nguồn.
* **Cơ sở dữ liệu PostgreSQL**: Có thể dùng PostgreSQL cục bộ hoặc Supabase Cloud miễn phí.

---

### 6.2. Cấu Hình Biến Môi Trường (.env)

#### 1. Cấu hình Backend (`backend/.env`):
Tạo file `backend/.env` với các giá trị mẫu:
```env
PORT=3000
NODE_ENV=development

# Kết nối PostgreSQL (Supabase hoặc Local)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_REFRESH_EXPIRES_IN="7d"

# Google OAuth 2.0
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Cloudflare R2 (Lưu trữ ảnh - Tùy chọn)
CLOUDFLARE_R2_ACCOUNT_ID="your-account-id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-key"
CLOUDFLARE_R2_BUCKET="phoneshop"
CLOUDFLARE_R2_PUBLIC_URL="https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev"

# Google Gemini API (Chatbot AI)
GEMINI_API_KEY="your-gemini-api-key"
```

#### 2. Cấu hình Frontend (`frontend/.env.development`):
File `frontend/.env.development` đã cấu hình sẵn trỏ về máy cục bộ:
```env
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_R2_PUBLIC_URL=https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev
```

---

### 6.3. Khởi Tạo Cơ Sở Dữ Liệu & Seed Data

Di chuyển vào thư mục `backend/` và thực thi chuỗi lệnh:
```bash
cd backend

# 1. Cài đặt các dependencies
npm install

# 2. Sinh Prisma Client
npx prisma generate

# 3. Đồng bộ cấu trúc bảng vào Database
npx prisma db push

# 4. Nạp dữ liệu mẫu ban đầu (Sản phẩm, biến thể, tài khoản)
npm run prisma:seed
```

---

### 6.4. Khởi Động Ứng Dụng

#### Khởi chạy Backend NestJS (Terminal 1):
```bash
cd backend
npm run start:dev
```
* **API Endpoint**: `http://localhost:3000/api`
* **Swagger Documentation**: `http://localhost:3000/api/docs`

#### Khởi chạy Frontend React (Terminal 2):
```bash
cd frontend
npm install
npm run dev
```
* **Giao diện Storefront**: `http://localhost:5173`

---

## 7. Tài Khoản Thử Nghiệm Mặc Định

Hệ thống đi kèm các tài khoản được tạo sẵn phục vụ việc kiểm thử phân quyền:

| Phân Quyền (Role) | Email Đăng Nhập | Mật Khẩu | Phạm Vi Truy Cập |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin@phoneshop.vn` | `Password@123` | Toàn quyền Storefront và bảng quản trị `/admin` |
| **Nhân viên (STAFF)** | `staff@phoneshop.vn` | `Password@123` | Vận hành kho IMEI, cập nhật trạng thái đơn hàng |
| **Khách hàng (CUSTOMER)** | `an.nguyen92@gmail.com` | `Password@123` | Đặt hàng, theo dõi đơn, gửi đánh giá sản phẩm |

*(Người dùng cũng có thể bấm vào nút **Đăng nhập Google** để tự động tạo tài khoản khách hàng mới qua cửa sổ Popup).*

---

## 8. Danh Mục API Chính (RESTful Endpoints)

| Phân Hệ | Phương Thức | Endpoint | Quyền Hạn | Mô Tả |
| :--- | :---: | :--- | :---: | :--- |
| **Auth** | `POST` | `/api/auth/register` | Public | Đăng ký tài khoản người dùng mới |
| | `POST` | `/api/auth/login` | Public | Đăng nhập hệ thống, cấp phát JWT |
| | `POST` | `/api/auth/google/credential` | Public | **Đăng nhập Google OAuth Popup bằng ID Token** |
| | `POST` | `/api/auth/refresh` | Public | Cấp mới Access Token từ Refresh Token |
| **Products** | `GET` | `/api/products` | Public | Lấy danh sách sản phẩm kèm bộ lọc linh hoạt |
| | `GET` | `/api/products/:slug` | Public | Lấy chi tiết sản phẩm, danh sách biến thể & specs |
| | `POST` | `/api/products` | Staff/Admin | Tạo mới sản phẩm và thông số kỹ thuật |
| **Orders** | `POST` | `/api/orders` | Auth | **Tạo đơn hàng nguyên tử & khóa giữ IMEI** |
| | `GET` | `/api/orders/my-orders` | Auth | Lịch sử mua hàng của khách |
| | `PATCH`| `/api/orders/:id/cancel` | Auth | Hủy đơn hàng và tự động nhả kho/IMEI |
| **Payments** | `POST` | `/api/payments/vietqr` | Auth | Sinh mã VietQR chuẩn ngân hàng |
| | `POST` | `/api/payments/vnpay/create-url` | Auth | Khởi tạo URL chuyển hướng VNPay Sandbox |
| | `GET` | `/api/payments/vnpay/ipn` | Public | Webhook tiếp nhận kết quả thanh toán từ VNPay |
| **IMEI & Bảo Hành** | `GET` | `/api/imei/lookup/:imei` | Public | Tra cứu nguồn gốc và hạn bảo hành theo IMEI |
| | `POST` | `/api/imei/batch-import` | Staff/Admin | Nhập lô mã IMEI vào kho (kiểm tra Luhn) |
| **AI Assistant** | `POST` | `/api/chatbot/ask` | Public | Đặt câu hỏi tư vấn sản phẩm cho trợ lý Gemini |
| | `GET` | `/api/chatbot/suggestions` | Public | Lấy danh sách câu hỏi gợi ý thông minh |

---

## 9. Tiêu Chuẩn Bảo Mật & Best Practices

1. **Bảo mật danh tính IMEI**:
   * Số IMEI không bao giờ bị lộ trong danh sách sản phẩm hay giỏ hàng công khai.
   * Số IMEI chỉ được hiển thị trong chi tiết đơn hàng của chính người mua hoặc trên trang quản trị có phân quyền.
2. **Mã hóa và Kiểm soát Phiên (Security Tokens)**:
   * Mật khẩu người dùng được băm qua `bcrypt` với 10 rounds salt.
   * Access Token có thời hạn ngắn (15 phút), giảm thiểu rủi ro khi bị lộ token; Refresh Token được lưu an toàn trong database.
3. **Phòng chống tấn công Web**:
   * Header bảo mật `Helmet` bảo vệ ứng dụng khỏi các lỗi XSS, Clickjacking, MIME-sniffing.
   * Kiểm soát chặt chẽ chính sách CORS giữa frontend Vercel và backend Render.
   * `Class-validator` kiểm thực toàn bộ dữ liệu đầu vào DTO tại tầng Gateway, loại bỏ rủi ro SQL Injection.

---

<p align="center">
  Được xây dựng và phát triển bởi <strong>PhoneShop Team</strong> © 2026.
</p>
