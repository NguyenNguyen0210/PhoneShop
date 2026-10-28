# 📱 PhoneShop — Cửa Hàng Điện Thoại Trực Tuyến

<p align="center">
  <img src="https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev/products/iphone-16-pro-max.webp" alt="PhoneShop Banner" width="200" style="border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);" />
</p>

<p align="center">
  <strong>Website thương mại điện tử chuyên kinh doanh điện thoại thông minh và phụ kiện chính hãng</strong><br>
  Dự án được xây dựng với mục tiêu mang lại trải nghiệm mua sắm mượt mà cho khách hàng và công cụ quản lý bán hàng đơn giản, hiệu quả cho chủ cửa hàng.
</p>

<p align="center">
  <a href="https://phoneshop-blond.vercel.app" target="_blank"><img src="https://img.shields.io/badge/Trang_Web-Vercel-black?style=for-the-badge&logo=vercel" alt="Website" /></a>
  <a href="https://phoneshop-api.onrender.com/api/docs" target="_blank"><img src="https://img.shields.io/badge/Tài_liệu_API-Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger Docs" /></a>
  <img src="https://img.shields.io/badge/NestJS-11.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</p>

---

## 🌐 Đường Dẫn Trực Tiếp (Live Demo)

* **Trang web khách hàng & quản trị**: [https://phoneshop-blond.vercel.app](https://phoneshop-blond.vercel.app)
* **Máy chủ Backend API**: [https://phoneshop-api.onrender.com/api](https://phoneshop-api.onrender.com/api)
* **Trang xem tài liệu API (Swagger)**: [https://phoneshop-api.onrender.com/api/docs](https://phoneshop-api.onrender.com/api/docs)

---

## 📑 Mục Lục
- [1. Giới Thiệu Dự Án](#1-giới-thiệu-dự-án)
- [2. Các Tính Năng Chính](#2-các-tính-năng-chính)
  - [2.1. Dành Cho Khách Mua Hàng](#21-dành-cho-khách-mua-hàng)
  - [2.2. Dành Cho Quản Trị Viên & Nhân Viên](#22-dành-cho-quản-trị-viên--nhân-viên)
- [3. Cách Hệ Thống Quản Lý Đơn Hàng & Tồn Kho](#3-cách-hệ-thống-quản-lý-đơn-hàng--tồn-kho)
- [4. Công Nghệ Sử Dụng](#4-công-nghệ-sử-dụng)
- [5. Cấu Trúc Thư Mục](#5-cấu-trúc-thư-mục)
- [6. Hướng Dẫn Cài Đặt & Chạy Thử (Local)](#6-hướng-dẫn-cài-đặt--chạy-thử-local)
- [7. Tài Khoản Đăng Nhập Mẫu](#7-tài-khoản-đăng-nhập-mẫu)
- [8. Các Đường Dẫn API Chính](#8-các-đường-dẫn-api-chính)

---

## 1. Giới Thiệu Dự Án

**PhoneShop** là website bán hàng trực tuyến hướng đến ngành hàng thiết bị di động (Apple iPhone, Samsung Galaxy, Xiaomi, OPPO, v.v.). Dự án được thiết kế trực quan, dễ thao tác và đáp ứng đầy đủ các nghiệp vụ thực tế của một cửa hàng bán lẻ:

* **Quản lý thiết bị theo từng số IMEI**: Mỗi chiếc máy bán ra đều gắn liền với một mã IMEI riêng để theo dõi xuất kho và bảo hành chính hãng.
* **Giữ chỗ sản phẩm khi đặt hàng**: Khi khách chọn thanh toán, máy sẽ được tạm giữ trong 15 phút. Nếu khách không thanh toán hoặc hủy đơn, hệ thống tự động trả máy về kho để người khác mua.
* **Tra cứu bảo hành trực tuyến**: Khách hàng chỉ cần nhập số IMEI của máy là có thể biết ngay ngày mua, thời hạn và trạng thái bảo hành.
* **Dữ liệu sản phẩm phong phú**: Có sẵn hơn 100 sản phẩm, đầy đủ màu sắc, dung lượng (128GB, 256GB, 512GB...), giá cả và thông số kỹ thuật rõ ràng.

---

## 2. Các Tính Năng Chính

### 2.1. Dành Cho Khách Mua Hàng
* **Trang chủ trực quan**: Xem banner quảng cáo các dòng máy mới, danh sách điện thoại nổi bật, bán chạy và các chương trình giảm giá.
* **Tìm kiếm & Bộ lọc linh hoạt**:
  * Tìm nhanh theo tên máy hoặc hãng sản xuất (Apple, Samsung, Xiaomi, Sony...).
  * Lọc theo mức giá, dung lượng RAM, bộ nhớ trong (ROM), màu sắc.
  * Sắp xếp theo giá tăng/giảm, đánh giá cao hoặc mới nhất.
* **Xem chi tiết sản phẩm**:
  * Tùy chọn nhanh màu sắc, phiên bản bộ nhớ; giá bán và số lượng còn lại sẽ tự động thay đổi tương ứng.
  * Bảng thông số chi tiết (màn hình, camera, chip xử lý, dung lượng pin, sạc nhanh).
* **Đăng nhập & Đăng ký tài khoản tiện lợi**:
  * Hỗ trợ đăng nhập nhanh bằng tài khoản Google (dạng cửa sổ bật lên/popup, không cần rời trang).
  * Đăng ký/đăng nhập bằng tài khoản email thông thường.
* **Giỏ hàng & Thanh toán dễ dàng**:
  * Giỏ hàng dạng thanh trượt mở nhanh bên phải màn hình.
  * Áp dụng mã giảm giá (voucher) cho đơn hàng.
  * **Nhiều hình thức thanh toán**:
    * Quét mã **VietQR** tự động điền đúng số tiền và nội dung chuyển khoản.
    * Cổng thanh toán trực tuyến **VNPay**.
    * Thanh toán tiền mặt khi nhận hàng (**COD**).
* **Tra cứu bảo hành**: Khách hàng nhập mã IMEI bất kỳ để kiểm tra ngày mua và hạn bảo hành của máy.
* **Đánh giá & Bình luận**: Khách hàng đã mua có thể để lại số sao và nhận xét về sản phẩm.
* **Hỗ trợ khách hàng qua Chatbot AI**: Tích hợp trợ lý tư vấn tự động để giải đáp thắc mắc về cấu hình máy và gợi ý điện thoại theo nhu cầu.

---

### 2.2. Dành Cho Quản Trị Viên & Nhân Viên
* **Bảng điều khiển tổng quan**: Thống kê doanh thu, số lượng đơn hàng mới trong ngày và cảnh báo sản phẩm sắp hết hàng trong kho.
* **Quản lý sản phẩm**:
  * Thêm, sửa, ẩn/hiện sản phẩm và các phiên bản bộ nhớ/màu sắc.
  * Tải ảnh sản phẩm lên hệ thống lưu trữ đám mây.
* **Quản lý kho IMEI**:
  * Nhập danh sách mã IMEI mới theo từng dòng máy.
  * Tự động kiểm tra tính hợp lệ của dãy số IMEI trước khi lưu vào kho.
  * Theo dõi tình trạng từng chiếc máy (Còn trong kho, Đang giữ cho đơn hàng, Đã bán, Đang bảo hành).
* **Quản lý đơn hàng**:
  * Theo dõi các đơn hàng từ lúc đặt, chuẩn bị hàng, đang giao cho đến khi hoàn thành.
  * Cập nhật trạng thái đơn và hủy đơn khi cần thiết.
* **Quản lý mã giảm giá (Voucher)**:
  * Tạo voucher giảm giá theo phần trăm (%) hoặc số tiền cố định.
  * Giới hạn thời gian áp dụng, giá trị đơn tối thiểu và số lượt sử dụng.
* **Phân quyền tài khoản**:
  * **Quản trị viên (Admin)**: Toàn quyền quản trị hệ thống.
  * **Nhân viên (Staff)**: Quản lý kho, xử lý đơn hàng và trả lời đánh giá của khách.
  * **Khách hàng (User)**: Mua sắm và theo dõi đơn hàng của bản thân.

---

## 3. Cách Hệ Thống Quản Lý Đơn Hàng & Tồn Kho

Hệ thống quản lý quy trình bán hàng theo các bước rõ ràng:

1. **Khách đặt hàng**: Hệ thống tự động chọn một mã IMEI khả dụng trong kho và chuyển sang trạng thái **Tạm giữ (HOLD)** trong vòng 15 phút.
2. **Khách thanh toán thành công**: Máy chuyển sang trạng thái **Đã bán (SOLD)**, đơn hàng chuyển sang trạng thái chờ đóng gói và giao hàng.
3. **Khách không thanh toán hoặc bấm hủy**: Mã IMEI được tự động trả lại kho về trạng thái **Có sẵn (AVAILABLE)** để khách khác có thể đặt mua ngay lập tức, không làm thất thoát số lượng máy của cửa hàng.

---

## 4. Công Nghệ Sử Dụng

| Phần | Công nghệ | Mục đích |
| :--- | :--- | :--- |
| **Giao diện (Frontend)** | **React 19 & Vite** | Xây dựng giao diện web mượt mà, tốc độ tải trang nhanh |
| | **Tailwind CSS & Ant Design** | Thiết kế bố cục đẹp mắt, hiện đại và chuẩn chỉ trên cả điện thoại lẫn máy tính |
| | **Zustand** | Quản lý thông tin giỏ hàng và trạng thái đăng nhập của người dùng |
| **Máy chủ (Backend)** | **NestJS 11 & TypeScript** | Xây dựng hệ thống API xử lý nghiệp vụ bán hàng, tài khoản và đơn hàng |
| | **Prisma ORM** | Kết nối và thao tác với cơ sở dữ liệu an toàn, chính xác |
| **Cơ sở dữ liệu** | **Supabase (PostgreSQL)** | Lưu trữ dữ liệu sản phẩm, đơn hàng, người dùng trên nền tảng đám mây |
| **Lưu trữ hình ảnh** | **Cloudflare R2** | Lưu trữ và tải nhanh hình ảnh sản phẩm với dung lượng tối ưu |
| **Xác thực & Bảo mật** | **JWT & Google OAuth** | Bảo mật phiên đăng nhập và hỗ trợ đăng nhập nhanh bằng tài khoản Google |

---

## 5. Cấu Trúc Thư Mục

```text
PhoneShop/
├── backend/                  # Mã nguồn phía máy chủ (NestJS)
│   ├── prisma/
│   │   ├── schema.prisma     # Định nghĩa cấu trúc các bảng dữ liệu
│   │   └── seed.ts           # Dữ liệu mẫu (sản phẩm, tài khoản, đơn hàng)
│   ├── src/
│   │   ├── modules/          # Các chức năng: auth, products, orders, payments, imei...
│   │   └── main.ts           # Điểm khởi chạy của máy chủ
│   └── package.json
│
└── frontend/                 # Mã nguồn phía giao diện (React)
    ├── src/
    │   ├── components/       # Các khối giao diện dùng chung (thanh điều hướng, footer, thẻ sản phẩm)
    │   ├── pages/            # Các trang giao diện (Trang chủ, Chi tiết máy, Giỏ hàng, Quản trị)
    │   ├── stores/           # Lưu trữ trạng thái đăng nhập và giỏ hàng
    │   └── services/         # Nơi gọi API từ máy chủ backend
    ├── vercel.json           # Cấu hình triển khai trên Vercel
    └── package.json
```

---

## 6. Hướng Dẫn Cài Đặt & Chạy Thử (Local)

### 6.1. Yêu Cầu Cần Có
* Đã cài đặt **Node.js** (phiên bản 18 hoặc 20 trở lên).
* Đã cài đặt **Git**.

---

### 6.2. Các Bước Cài Đặt

#### Bước 1: Tải mã nguồn về máy
```bash
git clone https://github.com/NguyenNguyen0210/PhoneShop.git
cd PhoneShop
```

#### Bước 2: Cấu hình và chạy Backend
1. Chuyển vào thư mục backend và cài đặt thư viện:
   ```bash
   cd backend
   npm install
   ```
2. Tạo file cấu hình `backend/.env` (tham khảo file `backend/.env.example` để điền chuỗi kết nối Database và mã bí mật JWT).
3. Khởi tạo cơ sở dữ liệu và nạp dữ liệu mẫu:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run prisma:seed
   ```
4. Khởi chạy máy chủ backend:
   ```bash
   npm run start:dev
   ```
   * Backend sẽ chạy tại: **`http://localhost:3000/api`**
   * Xem tài liệu API tại: **`http://localhost:3000/api/docs`**

#### Bước 3: Khởi chạy Frontend
Mở một cửa sổ Terminal mới:
```bash
cd frontend
npm install
npm run dev
```
* Mở trình duyệt và truy cập trang web tại: **`http://localhost:5173`**

---

## 7. Tài Khoản Đăng Nhập Mẫu

Dữ liệu mẫu đi kèm sẵn 3 tài khoản tương ứng với các quyền hạn khác nhau để kiểm thử:

| Vai trò | Email đăng nhập | Mật khẩu mặc định | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@phoneshop.vn` | `Password@123` | Toàn quyền quản trị website và trang `/admin` |
| **Nhân viên (Staff)** | `staff@phoneshop.vn` | `Password@123` | Quản lý đơn hàng, nhập kho và trả lời đánh giá |
| **Khách hàng (User)** | `an.nguyen92@gmail.com` | `Password@123` | Mua hàng, xem lịch sử đơn và đánh giá máy |

*(Bạn cũng có thể bấm vào nút **Đăng nhập với Google** để đăng nhập ngay mà không cần tạo tài khoản thủ công).*

---

## 8. Các Đường Dẫn API Chính

| Nhóm chức năng | Phương thức | Đường dẫn API | Mô tả |
| :--- | :---: | :--- | :--- |
| **Tài khoản** | `POST` | `/api/auth/register` | Đăng ký tài khoản mới |
| | `POST` | `/api/auth/login` | Đăng nhập tài khoản |
| | `POST` | `/api/auth/google/credential` | Đăng nhập nhanh bằng tài khoản Google |
| **Sản phẩm** | `GET` | `/api/products` | Lấy danh sách điện thoại (kèm lọc hãng, giá, cấu hình) |
| | `GET` | `/api/products/:slug` | Lấy thông tin chi tiết của một dòng máy |
| **Đơn hàng** | `POST` | `/api/orders` | Đặt hàng và tạm giữ máy trong kho |
| | `GET` | `/api/orders/my-orders` | Xem danh sách các đơn hàng đã mua |
| | `PATCH`| `/api/orders/:id/cancel` | Khách chủ động hủy đơn và nhả máy về kho |
| **Thanh toán** | `POST` | `/api/payments/vietqr` | Tạo mã QR chuyển khoản ngân hàng |
| | `POST` | `/api/payments/vnpay/create-url` | Tạo đường dẫn thanh toán qua VNPay |
| **Bảo hành** | `GET` | `/api/imei/lookup/:imei` | Tra cứu hạn bảo hành theo số IMEI |
| **Trợ lý AI** | `POST` | `/api/chatbot/ask` | Gửi câu hỏi tư vấn điện thoại cho Chatbot |

---

<p align="center">
  Dự án được thực hiện phục vụ học tập và nghiên cứu bởi <strong>PhoneShop Team</strong>.
</p>
