# 📱 Phone Shop

> **Hệ thống Thương Mại Điện Tử Chuyên Biệt Thiết Bị Di Động & Phụ Kiện Cao Cấp**  
> Xây dựng theo kiến trúc **Modular Monolith & Clean Architecture**, tích hợp kiểm soát giao dịch nguyên tử, cơ chế chống Race Condition cho vòng đời IMEI, hàng đợi xử lý nền **Redis BullMQ**, lưu trữ đám mây **Supabase Cloud (PostgreSQL + S3 Storage)** và giao diện **Clean Light Mode (Apple Pavilion & Swiss Minimalist)**.

---

## 📑 Mục Lục
- [1. Giới Thiệu Tổng Quan](#1-giới-thiệu-tổng-quan)
- [2. Triết Lý Thiết Kế & Trải Nghiệm Người Dùng](#2-triết-lý-thiết-kế--trải-nghiệm-người-dùng)
- [3. Tính Năng Nổi Bật](#3-tính-năng-nổi-bật)
  - [3.1. Phân Hệ Khách Hàng (Storefront B2C)](#31-phân-hệ-khách-hàng-storefront-b2c)
  - [3.2. Phân Hệ Quản Trị & Vận Hành (Admin Portal)](#32-phân-hệ-quản-trị--vận-hành-admin-portal)
- [4. Kiến Trúc Kỹ Thuật & Giải Pháp Cốt Lõi](#4-kiến-trúc-kỹ-thuật--giải-pháp-cốt-lõi)
  - [4.1. Sơ Đồ Kiến Trúc Tổng Thể](#41-sơ-đồ-kiến-trúc-tổng-thể)
  - [4.2. Quản Lý Vòng Đời IMEI & Xử Lý Concurrency](#42-quản-lý-vòng-đời-imei--xử-lý-concurrency)
  - [4.3. Hàng Đợi Redis BullMQ & Tự Động Hủy Giữ Hàng 15 Phút](#43-hàng-đợi-redis-bullmq--tự-động-hủy-giữ-hàng-15-phút)
  - [4.4. Cơ Chế Idempotency Chống Trùng Lặp Giao Dịch](#44-cơ-chế-idempotency-chống-trùng-lặp-giao-dịch)
  - [4.5. Tối Ưu Hóa Hình Ảnh Với Sharp & Supabase Storage](#45-tối-ưu-hóa-hình-ảnh-với-sharp--supabase-storage)
- [5. Công Nghệ Sử Dụng (Tech Stack)](#5-công-nghệ-sử-dụng-tech-stack)
- [6. Cấu Trúc Thư Mục Dự Án](#6-cấu-trúc-thư-mục-dự-án)
- [7. Hướng Dẫn Cài Đặt & Chạy Local](#7-hướng-dẫn-cài-đặt--chạy-local)
  - [7.1. Yêu Cầu Môi Trường](#71-yêu-cầu-môi-trường)
  - [7.2. Chuẩn Bị Supabase Cloud (Database & Storage)](#72-chuẩn-bị-supabase-cloud-database--storage)
  - [7.3. Cấu Hình Biến Môi Trường (.env)](#73-cấu-hình-biến-môi-trường-env)
  - [7.4. Khởi Động Redis Container](#74-khởi-động-redis-container)
  - [7.5. Khởi Tạo Database & Nạp Dữ Liệu Mẫu (Seed)](#75-khởi-tạo-database--nạp-dữ-liệu-mẫu-seed)
  - [7.6. Khởi Động Ứng Dụng](#76-khởi-động-ứng-dụng)
  - [7.7. Tài Khoản Đăng Nhập Mặc Định](#77-tài-khoản-đăng-nhập-mặc-định)
- [8. Danh Sách API Chính (API Endpoints Reference)](#8-danh-sách-api-chính-api-endpoints-reference)
- [9. Kiểm Thử & Đảm Bảo Chất Lượng (Testing & QA)](#9-kiểm-thử--đảm-bảo-chất-lượng-testing--qa)
- [10. Tiêu Chuẩn Bảo Mật & Best Practices](#10-tiêu-chuẩn-bảo-mật--best-practices)

---

## 1. Giới Thiệu Tổng Quan

**Phone Shop** là giải pháp thương mại điện tử chuyên nghiệp cho ngành bán lẻ thiết bị di động thông minh. Dự án giải quyết các bài toán kỹ thuật đặc thù và phức tạp nhất của ngành bán lẻ điện thoại:
1. **Mỗi thiết bị là một thực thể duy nhất**: Điện thoại không thể quản lý chỉ bằng số lượng tồn kho thuần túy (`quantity`), mà được quản lý định danh qua mã **Serial/IMEI** theo chuẩn thuật toán Luhn.
2. **Hiện tượng Race Condition trong Flash Sale**: Ngăn chặn 2 khách hàng đồng thời thanh toán và sở hữu cùng một máy/IMEI khi mở bán sản phẩm hot.
3. **Giữ hàng nguyên tử (Atomic Hold) có thời hạn**: Giữ máy cho khách hàng trong 15 phút để hoàn tất thủ tục thanh toán trực tuyến; tự động giải phóng tồn kho ngay lập tức nếu khách hàng bỏ đơn mà không làm nghẽn kho.
4. **Hệ thống bảo hành điện tử (E-Warranty) minh bạch**: Khách hàng tra cứu lịch sử, xuất xứ và thời hạn bảo hành tức thì chỉ với dãy IMEI.
5. **Dữ liệu thật 100% (No Mock Data)**: Toàn bộ danh mục 60 smartphone (Apple iPhone 17 Pro Max/17/16, Samsung Galaxy S26 Ultra/Z Fold7/Z Flip7, Xiaomi 16 Pro/15 Ultra, OPPO Find X9 Pro/N5, vivo X300 Pro/iQOO 13, Pixel 10 Pro XL, OnePlus 13, realme GT 7 Pro, ROG Phone 9 Pro, Xperia 1 VII...) với ~127 biến thể màu sắc/dung lượng/RAM, giá VND thực tế, specs đầy đủ (màn/pin/chipset/OS/5G) phủ kín mọi filter, được lưu trữ và truy vấn trực tiếp từ PostgreSQL.

---

## 2. Triết Lý Thiết Kế & Trải Nghiệm Người Dùng

Giao diện Storefront và Admin Portal được định hình theo phong cách **Clean Light Mode (Apple Pavilion & Swiss Minimalist)**:
* **Bảng màu thuần khiết**: Sử dụng nền trắng ngà `#FAFAFA` và `#FFFFFF`, viền xám siêu mảnh `#E5E7EB`, điểm nhấn màu xanh sapphire `#2563EB` hoặc đen obsidian `#111827` cho CTA và các chi tiết tương tác quan trọng.
* **Typography sắc nét**: Phân cấp rõ ràng với font chữ sans-serif hiện đại, độ tương phản cao, tối ưu khả năng đọc lướt thông số kỹ thuật.
* **Thành phần tương tác cao cấp (Micro-Interactions)**:
  * Hiệu ứng kính mờ (Glassmorphism & Backdrop Blur) trên thanh điều hướng Sticky Navbar.
  * Giỏ hàng trượt (Slide-out CartDrawer) thao tác tức thì không cần tải lại trang.
  * Thư viện ảnh sản phẩm chân thực, phóng to chi tiết với tỷ lệ khung hình chuẩn bán lẻ.
  * Huy hiệu trạng thái kho (Live Stock Badge) và đồng hồ đếm ngược giữ hàng (15m Lock Countdown) hiển thị trực quan.
* **100% Responsive**: Tương thích hoàn hảo từ màn hình di động 360px đến màn hình 4K Ultra-wide.

---

## 3. Tính Năng Nổi Bật

### 3.1. Phân Hệ Khách Hàng (Storefront B2C)
* **Trang chủ Flagship Showcase**:
  * Hero Banner quảng bá flagship thế hệ mới nhất.
  * Danh mục thương hiệu đối tác chính hãng (Apple, Samsung, Xiaomi, Sony, OPPO, Vivo, ASUS, Google).
  * Bộ sưu tập sản phẩm mới ra mắt, bán chạy và chương trình ưu đãi đặc quyền.
* **Bộ lọc & Tìm kiếm sản phẩm thông minh**:
  * Tìm kiếm theo từ khóa tên máy, thương hiệu.
  * Bộ lọc đa tiêu chí: Hãng sản xuất, phân khúc giá, RAM, bộ nhớ trong (ROM), tình trạng máy (Mới nguyên seal, Like New).
  * Sắp xếp linh hoạt: Giá tăng/giảm, bán chạy nhất, mới nhất, đánh giá cao nhất.
* **Trang chi tiết sản phẩm (Product Detail Page - PDP)**:
  * Bộ chọn biến thể động: Chọn phiên bản màu sắc và dung lượng; giá bán và tồn kho tương ứng tự động cập nhật theo thời gian thực.
  * Ma trận thông số kỹ thuật (Hardware Specs Matrix): Màn hình, chip xử lý, camera, pin, công nghệ sạc, hệ điều hành.
  * Huy hiệu cam kết: Bảo hành chính hãng 12-24 tháng, 1 đổi 1 trong 30 ngày, miễn phí giao hàng toàn quốc.
* **Giỏ hàng & Đặt hàng nguyên tử (Cart & Atomic Checkout)**:
  * Giỏ hàng mini trượt (CartDrawer) lưu trữ đồng bộ với LocalStorage & State.
  * Áp dụng mã giảm giá (Vouchers/Coupons) với điều kiện đơn hàng tối thiểu và mức giảm tối đa.
  * Cơ chế giữ chỗ IMEI trong 15 phút ngay khi khởi tạo đơn hàng: Hiển thị đồng hồ đếm ngược thời gian giữ máy.
* **Cổng thanh toán đa dạng & Bảo mật**:
  * **VietQR**: Tự động sinh mã QR ngân hàng chuẩn NAPAS 247 kèm nội dung chuyển khoản và số tiền chính xác từng đồng.
  * **VNPay Sandbox**: Chuyển hướng thanh toán qua cổng VNPay với chữ ký số HMAC-SHA512; xử lý Webhook IPN bảo mật chống gian lận.
  * **COD (Cash on Delivery)**: Thanh toán tiền mặt khi nhận hàng kèm xác nhận đơn tự động.
* **Tra cứu bảo hành điện tử (E-Warranty Lookup)**:
  * Tra cứu công khai nhanh chóng chỉ cần nhập dãy số IMEI/Serial.
  * Hiển thị trạng thái bảo hành: Còn hạn / Hết hạn, ngày kích hoạt, ngày hết hạn, lịch sử sửa chữa.
* **Đánh giá & Phản hồi (Reviews & Admin Replies)**:
  * Khách hàng đã mua hàng được quyền đánh giá số sao (1-5 sao) và để lại nhận xét.
  * Quản trị viên/Nhân viên có thể phản hồi trực tiếp dưới bình luận của khách hàng.
* **Trung tâm tài khoản khách hàng (Customer Profile)**:
  * Cập nhật thông tin cá nhân và tải ảnh đại diện (Avatar) trực tiếp lên Supabase Storage.
  * Theo dõi chi tiết lịch sử đơn hàng qua các trạng thái: `PENDING` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED` -> `COMPLETED`.

### 3.2. Phân Hệ Quản Trị & Vận Hành (Admin Portal)
* **Bảng điều khiển kinh doanh (Admin Dashboard)**:
  * Thống kê KPI tổng doanh thu, số lượng đơn hàng, lượng khách hàng mới và tồn kho thực tế.
  * Biểu đồ doanh thu theo chu kỳ và danh sách đơn hàng mới cần xử lý gấp.
* **Quản lý danh mục & Sản phẩm**:
  * Thêm/Sửa/Xóa sản phẩm, thương hiệu, danh mục.
  * Cấu hình biến thể đa cấp (RAM, ROM, Màu sắc, SKU, Giá bán, Giá khuyến mãi).
  * Upload ảnh sản phẩm đơn và thư viện ảnh (Gallery) bằng kéo thả `ImageUploadDragger`: Tự động nén sang WebP qua Sharp trước khi lưu lên Supabase Storage bucket `phoneshop`.
* **Quản lý kho Serial/IMEI chuyên sâu**:
  * Nhập kho danh sách IMEI theo từng biến thể sản phẩm.
  * Tự động kiểm tra tính hợp lệ của IMEI theo thuật toán Luhn.
  * Theo dõi vòng đời chi tiết của từng máy: `AVAILABLE` (Sẵn sàng) -> `HOLD` (Đang giữ cho đơn) -> `SOLD` (Đã bán) -> `WARRANTY` (Đang bảo hành) -> `DEFECTIVE` (Lỗi kỹ thuật).
* **Quản lý đơn hàng & Vận chuyển**:
  * Xem danh sách đơn hàng, lọc theo trạng thái và ngày tạo.
  * Cập nhật trạng thái đơn hàng, gán mã vận đơn giao hàng, xử lý hủy đơn và hoàn trả IMEI về kho.
* **Quản lý bảo hành & Yêu cầu đổi trả**:
  * Tiếp nhận phiếu yêu cầu bảo hành từ khách hàng.
  * Phê duyệt, ghi nhận lỗi, tiến hành bảo hành hoặc đổi thiết bị mới.
* **Quản lý khuyến mãi & Vouchers**:
  * Tạo voucher giảm giá theo tỷ lệ phần trăm (%) hoặc số tiền cố định (VND).
  * Ràng buộc: Giá trị đơn hàng tối thiểu, mức giảm tối đa, giới hạn lượt dùng tổng thể và giới hạn theo từng user.
* **Phân quyền người dùng (RBAC)**:
  * Phân chia vai trò rõ ràng: `ADMIN` (Toàn quyền hệ thống), `STAFF` (Vận hành đơn hàng, kho, phản hồi), `USER` (Khách hàng mua sắm).

---

## 4. Kiến Trúc Kỹ Thuật & Giải Pháp Cốt Lõi

### 4.1. Sơ Đồ Kiến Trúc Tổng Thể

Hệ thống được thiết kế theo mô hình **Modular Monolith & Clean Architecture**:

```text
                        ┌─────────────────────────────────────────┐
                        │        CLIENTS / WEB BROWSERS           │
                        │    (React 19 + TypeScript + Vite)       │
                        └───────────────────┬─────────────────────┘
                                            │ HTTP / REST / JSON
                                            │ JWT Bearer Auth
                                            ▼
                        ┌─────────────────────────────────────────┐
                        │         NESTJS 11 BACKEND API           │
                        │                                         │
                        │  ├── Common: Guards, Interceptors, Pipes│
                        │  ├── Modules: Auth, Products, Orders,   │
                        │  │            Payments, IMEI, Warranty, │
                        │  │            Vouchers, Reviews, Storage│
                        │  └── Infrastructure: Prisma, BullMQ,    │
                        │                      Sharp, Storage     │
                        └─────────┬───────────────────┬───────────┘
                                  │                   │
                  Prisma ORM (SQL)│                   │ IORedis Client
                                  ▼                   ▼
     ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
     │      SUPABASE CLOUD POSTGRESQL    │    │      REDIS 7 CONTAINER (BullMQ)   │
     │  - Relational Schema & Constraints│    │  - Delayed Job: expire-order-hold │
     │  - Row-Level Security (RLS)       │    │  - Idempotency Cache Keys         │
     │  - ACID Transactions              │    │  - High-Speed Query Cache         │
     └─────────────────┬─────────────────┘    └───────────────────────────────────┘
                       │
                       ▼
     ┌───────────────────────────────────┐
     │      SUPABASE CLOUD STORAGE       │
     │  - Bucket: phoneshop        │
     │  - WebP Optimized Product Images  │
     │  - Avatars & Inspection Proofs    │
     └───────────────────────────────────┘
```

---

### 4.2. Quản Lý Vòng Đời IMEI & Xử Lý Concurrency

Vòng đời trạng thái của từng mã IMEI trong hệ thống tuân thủ máy trạng thái nghiêm ngặt:

```text
              ┌──────────────┐
              │  AVAILABLE   │ ◄─────────────────────────┐
              └──────┬───────┘                           │
                     │                                   │
      Khách tạo đơn  │ Đặt hàng (Pessimistic Lock)       │ Hết hạn 15m
      giữ máy        ▼                                   │ hoặc khách hủy
              ┌──────────────┐                           │
              │     HOLD     │ ──────────────────────────┘
              └──────┬───────┘
                     │
      Thanh toán     │ VNPay IPN / VietQR / COD thành công
      hoàn tất       ▼
              ┌──────────────┐
              │     SOLD     │
              └──────┬───────┘
                     │
      Sửa chữa       │ Khách gửi phiếu bảo hành
      bảo hành       ▼
              ┌──────────────┐          Thiết bị hỏng
              │   WARRANTY   │ ──────────────────────────► ┌─────────────┐
              └──────────────┘                             │  DEFECTIVE  │
                                                           └─────────────┘
```

#### Giải Pháp Chống Tranh Chấp Flash Sale (Pessimistic Locking):
Khi khách hàng tiến hành tạo đơn hàng, hệ thống thực thi một giao dịch nguyên tử (`prisma.$transaction`):
1. Khóa và lấy bản ghi IMEI thỏa mãn: `variantId = targetVariant` VÀ `status = AVAILABLE`.
2. Chuyển đổi trạng thái sang `HOLD` và liên kết với mã `orderId`.
3. Giảm số lượng tồn khả dụng của biến thể.
4. Nếu 2 request đồng thời yêu cầu chiếc máy cuối cùng, transaction thứ hai sẽ nhận ngoại lệ hết hàng ngay lập tức mà không xảy ra tình trạng bán khống (Overselling).

---

### 4.3. Hàng Đợi Redis BullMQ & Tự Động Hủy Giữ Hàng 15 Phút

Khi đơn hàng được tạo, IMEI được chuyển sang `HOLD`. Nếu khách hàng không thanh toán hoặc đóng trình duyệt, máy không thể bị giữ vĩnh viễn.

* **BullMQ Delayed Queue**:
  * Khi tạo đơn thành công, `OrdersService` đẩy một job vào queue `orders-queue`:
    ```typescript
    await this.ordersQueue.add(
      'expire-order-hold',
      { orderId: order.id },
      { delay: 15 * 60 * 1000 } // 15 phút (900.000 ms)
    );
    ```
* **OrdersProcessor (Worker)**:
  * Sau đúng 15 phút, worker kích hoạt xử lý job:
    1. Kiểm tra trạng thái hiện tại của đơn hàng.
    2. Nếu đơn hàng vẫn ở trạng thái `PENDING` (chưa thanh toán):
       * Cập nhật trạng thái đơn thành `CANCELLED`.
       * Chuyển toàn bộ IMEI thuộc đơn từ `HOLD` trở lại `AVAILABLE`.
       * Hoàn lại số lượng tồn kho khả dụng cho sản phẩm.
    3. Nếu đơn hàng đã được cập nhật (`PAID` hoặc `PROCESSING`), worker tự động bỏ qua.
* **In-memory Sweeper Fallback**:
  * Hệ thống tích hợp `hold-expiry.sweeper.ts` quét định kỳ phòng trường hợp Redis bảo trì hoặc biến môi trường `REDIS_ENABLED=false`.

---

### 4.4. Cơ Chế Idempotency Chống Trùng Lặp Giao Dịch

Các endpoint nhạy cảm (như `POST /api/orders`, `POST /api/payments/create-url`) được bảo vệ bởi **Idempotency Interceptor**:
* Khách hàng gửi kèm header `Idempotency-Key: <unique-uuid>`.
* Hệ thống lưu trữ trạng thái xử lý trong bộ nhớ / Redis.
* Nếu mạng chập chờn khiến người dùng nhấn nút "Đặt hàng" hoặc "Thanh toán" nhiều lần trong thời gian ngắn, các request trùng lặp sẽ nhận lại response trước đó mà không tạo ra đơn hàng thứ hai hay trừ tiền hai lần.

---

### 4.5. Tối Ưu Hóa Hình Ảnh Với Sharp & Supabase Storage

Khi Quản trị viên tải ảnh sản phẩm hoặc người dùng cập nhật ảnh đại diện:
1. `StorageController` tiếp nhận file qua Multer (kiểm tra định dạng hợp lệ: JPG, PNG, WebP, AVIF).
2. `StorageService` sử dụng thư viện **Sharp** để:
   * Giữ nguyên tỷ lệ hoặc crop thông minh.
   * Tự động nén và chuyển đổi (convert) toàn bộ sang chuẩn **WebP** với chất lượng tối ưu (`quality: 80-85%`).
   * Giảm đến 70-80% dung lượng file mà mắt thường không phân biệt được chất lượng suy giảm.
3. Upload buffer ảnh WebP lên **Supabase Storage** (Bucket `phoneshop`).
4. Lưu URL công khai (Public URL) vào cơ sở dữ liệu để phân phối nhanh qua CDN.

---

## 5. Công Nghệ Sử Dụng (Tech Stack)

| Lớp (Layer) | Công nghệ / Thư viện | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **Backend Core** | NestJS | 11.x | Framework kiến trúc Modular Monolith cho Node.js |
| | TypeScript | 6.x | Ngôn ngữ phát triển Type-safe cho toàn bộ backend |
| **Database & ORM** | Supabase PostgreSQL | 16.x | Cơ sở dữ liệu quan hệ trên điện toán đám mây |
| | Prisma ORM | 7.x | Quản lý schema, migrations và truy vấn SQL an toàn |
| **Background & Cache** | Redis | 7-alpine | Bộ nhớ cache hiệu năng cao chạy trên Docker |
| | BullMQ | 6.x | Quản lý hàng đợi nền, xử lý Delayed Job 15m hold |
| **Media Processing** | Sharp | 0.35.x | Xử lý, nén và chuyển đổi định dạng ảnh sang WebP |
| | Supabase Storage | 2.x | Lưu trữ đám mây tương thích S3 cho ảnh sản phẩm |
| **Security & Auth** | Passport & JWT | 11.x | Xác thực người dùng qua Access Token / Refresh Token |
| | Bcrypt | 6.x | Băm mật khẩu người dùng với muối (salt) bảo mật |
| | Class-Validator | 0.15.x | Kiểm tra dữ liệu đầu vào DTO tại tầng Gateway |
| **Frontend Core** | React | 19.x | Thư viện xây dựng giao diện người dùng |
| | Vite | 8.x | Trình đóng gói và dev-server tốc độ cao |
| | React Router DOM | 7.x | Quản lý định tuyến SPA (Single Page Application) |
| **UI & Styling** | Tailwind CSS | 4.x | Utility-first CSS framework cho bố cục tùy biến |
| | Ant Design | 6.x | Hệ thống component UI chuyên nghiệp cho Admin & Web |
| | Lucide React | 1.x | Bộ icon SVG hiện đại, tối giản và sắc nét |
| **State & API** | Zustand | 5.x | Quản lý state toàn cục nhẹ và hiệu quả (Auth, Cart) |
| | Axios | 1.x | HTTP Client với Interceptor tự động gắn Bearer Token |
| **DevOps & Testing**| Docker & Compose | 3.8+ | Đóng gói môi trường Redis và Backend nhất quán |
| | Jest & Ts-Jest | 30.x | Khung kiểm thử tự động Unit Tests cho nghiệp vụ cốt lõi |

---

## 6. Cấu Trúc Thư Mục Dự Án

```text
PhoneShop/
├── docker-compose.yml              # Dev: Redis 7 + backend container (nạp backend/.env.development)
├── docker-compose.prod.yml         # Prod VPS: Redis + backend (nạp backend/.env.production)
├── frontend/.env.development       # Giá trị VITE_* dev công khai (tracked)
├── .gitignore                      # Quy chuẩn loại trừ artifacts, secrets, docs, test scripts
│
├── backend/                        # Ứng dụng Backend NestJS
│   ├── package.json                # Dependencies & script quản lý backend
│   ├── tsconfig.json               # Cấu hình TypeScript
│   ├── prisma/                     # Quản lý cơ sở dữ liệu
│   │   ├── schema.prisma           # Định nghĩa toàn bộ thực thể database (ERD)
│   │   ├── seed.ts                 # Script nạp dữ liệu chuẩn (24 smartphone, tài khoản, voucher)
│   │   └── migrations/             # Lịch sử migration cơ sở dữ liệu
│   │
│   ├── src/
│   │   ├── main.ts                 # Điểm khởi chạy ứng dụng (Bootstrap & load-env theo NODE_ENV)
│   │   ├── load-env.ts             # Nạp backend/.env.development|production trước mọi import
│   │   ├── app.module.ts           # Root module kết nối toàn bộ hệ thống
│   │   │
│   │   ├── common/                 # Thành phần dùng chung toàn hệ thống
│   │   │   ├── constants.ts        # Các hằng số định danh hệ thống
│   │   │   ├── guards/             # JwtAuthGuard, RolesGuard, OptionalJwtGuard
│   │   │   ├── interceptors/       # Logging, Idempotency, Transform response
│   │   │   └── utils/              # Tiện ích Luhn IMEI, format tiền tệ
│   │   │
│   │   ├── modules/                # Các module nghiệp vụ (Feature Modules)
│   │   │   ├── auth/               # Đăng ký, đăng nhập, JWT refresh, Google OAuth
│   │   │   ├── users/              # Quản lý hồ sơ, địa chỉ, thông tin tài khoản
│   │   │   ├── products/           # Danh mục sản phẩm, biến thể, lọc đa tiêu chí
│   │   │   ├── cart/               # Giỏ hàng phía server
│   │   │   ├── orders/             # Đặt hàng, khóa giữ IMEI, OrdersProcessor BullMQ
│   │   │   ├── payments/           # Tích hợp VietQR, VNPay Sandbox, webhook IPN
│   │   │   ├── imei/               # Vòng đời Serial/IMEI, nhập kho, kiểm tra Luhn
│   │   │   ├── warranty/           # Kích hoạt & tra cứu bảo hành điện tử theo IMEI
│   │   │   ├── vouchers/           # Quản lý mã giảm giá, kiểm tra điều kiện áp dụng
│   │   │   ├── reviews/            # Đánh giá sản phẩm & phản hồi từ quản trị viên
│   │   │   ├── inventory/          # Báo cáo nhập xuất tồn, cảnh báo hết hàng
│   │   │   └── reports/            # Thống kê doanh thu, báo cáo hiệu quả bán hàng
│   │   │
│   │   └── infrastructure/         # Triển khai kỹ thuật hạ tầng
│   │       ├── database/           # PrismaService kết nối Supabase PostgreSQL
│   │       ├── storage/            # StorageService nén Sharp WebP & upload Supabase
│   │       ├── background-jobs/    # Cấu hình hàng đợi Redis BullMQ
│   │       └── idempotency/        # Bộ nhớ đệm kiểm soát idempotency key
│   │
│   └── test/                       # Kiểm thử tự động (Automated Tests)
│       └── unit/                   # Unit test suites (IMEI, Orders Concurrency, Storage, Payments)
│
└── frontend/                       # Ứng dụng Frontend React SPA
    ├── package.json                # Dependencies & script quản lý frontend
    ├── vite.config.ts              # Cấu hình Vite bundler & plugins
    ├── tailwind.config.js          # Cấu hình theme Tailwind CSS
    ├── public/                     # Tài nguyên tĩnh
    │   └── images/products/        # Ảnh chụp thực tế của 24 smartphone retail
    │
    └── src/
        ├── main.tsx                # Điểm khởi chạy React DOM
        ├── App.tsx                 # Root component với ConfigProvider Ant Design
        ├── index.css               # CSS toàn cục và định nghĩa utility classes
        │
        ├── components/             # Reusable UI Components
        │   ├── common/             # Navbar, Footer, LoadingSpinner, Breadcrumb
        │   └── storefront/         # ProductCard, CartDrawer, HeroBanner, VoucherCard
        │
        ├── layouts/                # Bố cục giao diện
        │   ├── MainLayout.tsx      # Khung giao diện bán hàng Storefront
        │   └── AdminLayout.tsx     # Khung thanh điều hướng Admin Portal
        │
        ├── pages/                  # Các trang màn hình
        │   ├── storefront/         # Home, ProductDetail, ProductListing, Cart,
        │   │                       # Checkout, OrderSuccess, WarrantyLookup, Profile, Auth
        │   └── Admin/              # Dashboard, Products, Orders, InventoryImei
        │
        ├── services/               # Tầng gọi API qua Axios
        │   ├── apiClient.ts        # Cấu hình Axios Base URL, Header, Token Interceptors
        │   ├── productService.ts   # API sản phẩm, danh mục, biến thể
        │   ├── orderService.ts     # API tạo đơn, giữ hàng, hủy đơn
        │   ├── paymentService.ts   # API sinh mã VietQR, URL thanh toán VNPay
        │   └── warrantyService.ts  # API tra cứu bảo hành theo IMEI
        │
        ├── stores/                 # Quản lý State toàn cục bằng Zustand
        │   ├── useAuthStore.ts     # State xác thực, user, token
        │   └── useCartStore.ts     # State giỏ hàng, tính tổng tiền, voucher
        │
        └── types/                  # Định nghĩa TypeScript interfaces & types
```

---

## 7. Hướng Dẫn Cài Đặt & Chạy Local

### 7.1. Yêu Cầu Môi Trường
Đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
* **Node.js**: Phiên bản `>= 18.x` (khuyến nghị Node 20 LTS).
* **Docker & Docker Compose**: Để chạy container Redis 7.
* **Tài khoản Supabase (Miễn phí)**: Truy cập [supabase.com](https://supabase.com) để tạo một project PostgreSQL & Storage.
* **Git**: Quản lý phiên bản mã nguồn.

---

### 7.2. Chuẩn Bị Supabase Cloud (Database & Storage)
1. **Tạo Database**:
   * Tạo một project mới trên [Supabase Dashboard](https://app.supabase.com).
   * Vào mục **Project Settings -> Database** để lấy chuỗi kết nối `DATABASE_URL` (dạng `postgresql://postgres.[ref]:[password]@...:5432/postgres?sslmode=require`).
2. **Tạo Storage Bucket**:
   * Vào mục **Storage** trên Dashboard Supabase -> Nhấn **New Bucket**.
   * Đặt tên Bucket: **`phoneshop`**.
   * Bật tùy chọn **Public Bucket** (để ảnh sản phẩm và avatar có thể truy cập công khai qua CDN).
   * Lấy `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` tại mục **Project Settings -> API**.

---

### 7.3. Cấu Hình Biến Môi Trường (.env)

Mỗi app giữ file env riêng — không còn file `.env` chung ở thư mục root:

#### 1. Cấu hình Backend (`backend/.env.development`):
Copy từ template rồi điền giá trị thật (file này đã git-ignored, không commit):
```bash
cp backend/.env.example backend/.env.development
```
Xem đầy đủ danh sách biến trong `backend/.env.example` (DATABASE_URL Supabase, JWT_SECRET, REDIS_HOST, SUPABASE_*, VNPay/VietQR Sandbox, GOOGLE_CLIENT_ID/SECRET, CLOUDFLARE_R2_*, GEMINI_API_KEY...).

Backend tự nạp đúng file theo `NODE_ENV` (nhờ `src/load-env.ts` chạy trước mọi import + `ConfigModule` trong `app.module.ts`):
* Dev/local (`NODE_ENV != production`) → `backend/.env.development`
* Prod (`NODE_ENV=production`) → `backend/.env.production`

**Production (VPS):** tạo file `backend/.env.production` thủ công trên server theo template (giá trị thật). Workflow deploy (`.github/workflows/deploy.yml`) sẽ dừng lại nếu thiếu file này.

#### 2. Cấu hình Frontend:
File `frontend/.env.development` đã commit sẵn giá trị dev công khai (`VITE_API_URL=http://localhost:3000/api`, ...) nên chạy local không cần tạo gì thêm. Nếu cần override cục bộ, đặt trong `frontend/.env.development.local` (untracked). Biến môi trường production cấu hình trong Vercel Dashboard (Environment Variables).

---

### 7.4. Khởi Động Redis Container

Hệ thống sử dụng Redis 7 cho hàng đợi xử lý nền **BullMQ**.
* Trong môi trường phát triển cục bộ (Local Development), mô hình chuẩn khuyến nghị là **chạy Redis qua Docker và chạy Node.js trên máy host** để tận dụng tối đa tốc độ biên dịch và Hot Reload:
```bash
# Đứng tại thư mục PhoneShop/
docker compose up -d redis
```
Kiểm tra trạng thái container Redis:
```bash
docker ps --filter "name=phoneshop_redis"
# Container hiển thị trạng thái "Up ... (healthy)" trên port 6379 là thành công
```
*(Lưu ý: File `docker-compose.yml` cũng cung cấp sẵn service `backend` đóng gói toàn diện bằng container nếu bạn muốn chạy trọn bộ bằng Docker trong môi trường staging/production).*

---

### 7.5. Khởi Tạo Database & Nạp Dữ Liệu Mẫu (Seed)

Di chuyển vào thư mục `backend/`, cài đặt dependencies, đồng bộ schema và nạp dữ liệu:
```bash
cd backend

# 1. Cài đặt các thư viện backend
npm install

# 2. Sinh Prisma Client từ schema
npx prisma generate

# 3. Đồng bộ schema sang Supabase PostgreSQL
npx prisma db push

# 4. Nạp dữ liệu mẫu (Roles, Admin/Staff/40 Customers, 12 Brands, 6 Categories, 60 Smartphones/~127 Variants phủ kín filter, 200 Orders đủ 9 status, IMEI kho, Vouchers Active/Expired/Upcoming, Flash Sale, Reviews 5★-1★)
npm run prisma:seed
```

> **Ghi chú về hình ảnh sản phẩm:**  
> Dữ liệu seed dùng URL R2 deterministic (`CLOUDFLARE_R2_PUBLIC_URL/products/<slug>.webp`, fallback về ảnh mặc định khi chưa upload). Nhờ vậy ngay sau khi seed xong toàn bộ 60 smartphone đều có thumbnail/variant image hợp lệ mà **không yêu cầu tải trước ảnh lên Supabase Storage**.  
> Supabase Storage được kích hoạt phục vụ cho các nghiệp vụ động trong quá trình vận hành: Quản trị viên thêm sản phẩm mới/upload thư viện ảnh (tự động nén WebP) và Khách hàng cập nhật ảnh đại diện (Avatar).
> **Filter coverage:** mỗi giá trị RAM (4/6/8/12/16GB), Storage (64/128/256/512GB/1TB), Màu (Đen/Trắng/Xanh/Titan/Vàng/Tím/Xanh lá), Giá (<5/5-10/10-20/>20tr), Màn (<6.1/6.1-6.7/>6.7"), Pin (<4000/4000-5000/>5000mAh), OS (iOS/Android), Chipset (Apple/Snapdragon/Dimensity/Exynos), 5G on/off, onSale/inStock on/off, rating 5/4/3 đều có ≥5 products/variants để test thấy rõ.

---

### 7.6. Khởi Động Ứng Dụng

#### Khởi động Backend API (Cửa sổ Terminal 1):
```bash
cd backend
npm run start:dev
```
Backend API sẽ hoạt động tại: **`http://localhost:3000/api`**  
*(Tài liệu Swagger API tại: `http://localhost:3000/api/docs`)*

#### Khởi động Frontend Storefront (Cửa sổ Terminal 2):
```bash
cd frontend
npm install
npm run dev
```
Giao diện Storefront sẽ mở tại: **`http://localhost:5173`**

---

### 7.7. Tài Khoản Đăng Nhập Mặc Định

Dữ liệu seed chính (`prisma/seed.ts`, password chung `Password@123`) cung cấp sẵn các tài khoản demo tương ứng với 3 cấp độ phân quyền (RBAC):

| Vai trò (Role) | Email đăng nhập | Mật khẩu mặc định | Quyền hạn truy cập |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin@phoneshop.vn` | `Password@123` | Toàn quyền truy cập Storefront và Admin Portal (`/admin/*`) |
| **Nhân viên (STAFF)** | `staff@phoneshop.vn` | `Password@123` | Quản lý kho IMEI, cập nhật đơn hàng, phản hồi đánh giá |
| **Khách hàng (CUSTOMER)** | `an.nguyen92@gmail.com` (và 39 customers khác trong `prisma/seed_modules/customers.ts`) | `Password@123` | Mua hàng, thanh toán, theo dõi đơn, gửi đánh giá, đổi avatar |

> Legacy `prisma/seed/seed.ts` (không dùng bởi `prisma db seed`) dùng accounts `*@phoneshop.local` / `Admin@123456|Staff@123456|User@123456` — chỉ để tham khảo.

---

## 8. Danh Sách API Chính (API Endpoints Reference)

Toàn bộ API tuân thủ chuẩn RESTful với tiền tố `/api`:

### 8.1. Xác thực & Người dùng (Authentication & Users)
| Phương thức | Đường dẫn API | Phân quyền | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản khách hàng mới |
| `POST` | `/api/auth/login` | Public | Đăng nhập hệ thống, nhận Access Token & Refresh Token |
| `POST` | `/api/auth/refresh` | Public | Cấp mới Access Token bằng Refresh Token |
| `GET` | `/api/users/profile` | Authenticated | Lấy thông tin cá nhân của người dùng hiện tại |
| `PUT` | `/api/users/profile` | Authenticated | Cập nhật thông tin cá nhân (Họ tên, SĐT, Địa chỉ) |

### 8.2. Danh Mục & Sản Phẩm (Catalog & Products)
| Phương thức | Đường dẫn API | Phân quyền | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public | Danh sách sản phẩm kèm bộ lọc (Hãng, Giá, RAM, ROM) |
| `GET` | `/api/products/:slug` | Public | Chi tiết sản phẩm, danh sách biến thể và thông số |
| `POST` | `/api/products` | Staff / Admin | Thêm sản phẩm mới kèm danh sách biến thể ban đầu |
| `PUT` | `/api/products/:id` | Staff / Admin | Cập nhật thông tin sản phẩm và trạng thái kinh doanh |
| `DELETE` | `/api/products/:id` | Admin | Xóa sản phẩm (Soft delete hoặc xóa khỏi catalog) |

### 8.3. Đơn Hàng & Khóa Giữ Hàng (Orders & Concurrency Hold)
| Phương thức | Đường dẫn API | Phân quyền | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Authenticated | Đặt hàng nguyên tử, khóa giữ IMEI 15 phút qua BullMQ |
| `GET` | `/api/orders/my-orders`| Authenticated | Danh sách lịch sử đơn hàng của khách hàng hiện tại |
| `GET` | `/api/orders/:id` | Authenticated | Xem chi tiết đơn hàng, mã vận đơn, danh sách IMEI giữ |
| `PATCH`| `/api/orders/:id/cancel`| Authenticated | Khách hàng chủ động hủy đơn, tự động nhả kho/IMEI |
| `PATCH`| `/api/orders/:id/status`| Staff / Admin | Cập nhật trạng thái đơn hàng (`PROCESSING`, `SHIPPED`,...) |

### 8.4. Thanh Toán (Payments)
| Phương thức | Đường dẫn API | Phân quyền | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/vietqr` | Authenticated | Sinh chuỗi và mã VietQR chuẩn thanh toán ngân hàng |
| `POST` | `/api/payments/vnpay/create-url` | Authenticated | Sinh URL thanh toán chuyển hướng sang cổng VNPay |
| `GET` | `/api/payments/vnpay/ipn` | Public | Webhook tiếp nhận kết quả thanh toán từ VNPay |

### 8.5. Kho Serial/IMEI & Bảo Hành (IMEI & Warranty)
| Phương thức | Đường dẫn API | Phân quyền | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/imei/lookup/:imei` | Public | Tra cứu công khai thông tin và hạn bảo hành theo IMEI |
| `POST` | `/api/imei/batch-import` | Staff / Admin | Nhập lô mã IMEI vào kho cho biến thể sản phẩm |
| `POST` | `/api/warranty/claims` | Authenticated | Gửi yêu cầu tiếp nhận bảo hành / sửa chữa thiết bị |
| `PATCH`| `/api/warranty/claims/:id` | Staff / Admin | Duyệt và cập nhật tiến độ xử lý phiếu bảo hành |

### 8.6. Media Storage (Supabase & Sharp)
| Phương thức | Đường dẫn API | Phân quyền | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/storage/upload` | Staff / Admin | Upload 1 ảnh sản phẩm, tự động nén sang WebP |
| `POST` | `/api/storage/gallery` | Staff / Admin | Upload nhiều ảnh thư viện sản phẩm dạng mảng WebP |
| `POST` | `/api/storage/avatar` | Authenticated | Upload và thay thế ảnh đại diện người dùng |

---

## 9. Kiểm Thử & Đảm Bảo Chất Lượng (Testing & QA)

Dự án áp dụng quy trình kiểm thử tự động nghiêm ngặt nhằm đảm bảo tính ổn định và tính toàn vẹn của dữ liệu trong các kịch bản cạnh tranh tài nguyên cao (High Concurrency):

### 9.1. Chạy Bộ Unit Test (Jest)
Bộ kiểm thử đơn vị bao gồm 4 test suites chuyên sâu:
* `imei.spec.ts`: Xác thực thuật toán Luhn, định dạng 15 chữ số và chuyển đổi trạng thái IMEI.
* `orders-concurrency.spec.ts`: Kiểm tra cơ chế Pessimistic Locking chống tranh chấp kho, kiểm tra thời hạn giữ hàng và Worker BullMQ tự động hủy đơn sau 15 phút.
* `storage.spec.ts`: Kiểm tra tính năng nén ảnh WebP bằng Sharp và cơ chế chặn các tệp tin nguy hại / không hợp lệ (như SVG chứa mã độc).
* `payments.spec.ts`: Kiểm tra tính toàn vẹn của checksum chữ ký HMAC-SHA512 VNPay và xử lý Webhook IPN an toàn.

Thực thi lệnh kiểm thử:
```bash
npm --prefix backend test
```
**Kết quả kiểm thử đạt chuẩn:**
```text
PASS test/unit/imei.spec.ts
PASS test/unit/orders-concurrency.spec.ts
PASS test/unit/storage.spec.ts
PASS test/unit/payments.spec.ts

Test Suites: 4 passed, 4 total
Tests:       38 passed, 38 total
Snapshots:   0 total
Time:        5.4 s
```

---

### 9.2. Kiểm Tra Bản Đóng Gói Production (Build Verification)
Kiểm tra tính tương thích và bảo đảm không có lỗi cú pháp hoặc Type mismatch trong TypeScript:
```bash
# Kiểm tra build Backend
npm --prefix backend run build

# Kiểm tra build Frontend
npm --prefix frontend run build
```
Cả hai ứng dụng đều biên dịch thành công 100% với mã thoát `exit 0`.

---

## 10. Tiêu Chuẩn Bảo Mật & Best Practices

1. **Bảo mật mã Serial/IMEI**:
   * Số IMEI không bao giờ được trả về trong các API công khai của danh sách sản phẩm hay giỏ hàng.
   * Số IMEI chỉ được tiết lộ trong chi tiết đơn hàng của chính người mua hoặc trong màn hình quản trị của nhân viên/admin có thẩm quyền.
   * Nghiêm cấm ghi log số IMEI thô vào console, hệ thống giám sát hoặc file log production.
2. **Bảo mật xác thực & Ủy quyền (Authentication & Authorization)**:
   * Toàn bộ mật khẩu được băm (hash) bằng thư viện `bcrypt` với 10 vòng muối (salt rounds).
   * Cơ chế xác thực kép: `Access Token` ngắn hạn (15 phút) và `Refresh Token` dài hạn (7 ngày).
   * Phân quyền Role-based Access Control (RBAC) được kiểm soát chặt chẽ ở cấp độ từng controller qua `RolesGuard`.
3. **Phòng chống tấn công & Tối ưu hóa**:
   * Header bảo mật `Helmet` được cấu hình để ngăn chặn XSS, Clickjacking và MIME-sniffing.
   * `Idempotency-Key` bảo vệ các giao dịch nhạy cảm khỏi nguy cơ double-spending do lỗi đường truyền mạng.
   * Kiểm soát chặt chẽ chính sách CORS (Cross-Origin Resource Sharing) giữa Frontend và Backend.
   * Dữ liệu nhạy cảm và thông tin kết nối (Database URL, Secret Keys) được quản lý tách biệt qua `.env` và được loại trừ hoàn toàn khỏi Git tracking.

---

<p align="center">
  Phát triển với sự tận tâm bởi <strong>PhoneShop Engineering Team</strong> © 2026.
</p>
