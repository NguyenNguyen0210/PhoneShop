# PhoneShop

<p align="center">
  <img src="frontend/public/logo-horizontal.png" alt="PhoneShop" width="320" />
</p>

<p align="center">
  Nền tảng thương mại điện tử điện thoại và phụ kiện, kết nối mua sắm trực tuyến với quản lý kho theo IMEI, thanh toán và chăm sóc sau bán hàng.
</p>

<p align="center">
  <a href="https://github.com/NguyenNguyen0210/PhoneShop/actions/workflows/backend-ci.yml"><img src="https://github.com/NguyenNguyen0210/PhoneShop/actions/workflows/backend-ci.yml/badge.svg" alt="Backend CI" /></a>
  <a href="https://github.com/NguyenNguyen0210/PhoneShop/actions/workflows/frontend-ci.yml"><img src="https://github.com/NguyenNguyen0210/PhoneShop/actions/workflows/frontend-ci.yml/badge.svg" alt="Frontend CI" /></a>
  <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" alt="NestJS 11" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 17 in CI" />
</p>

## Overview

Một cửa hàng điện thoại cần quản lý cả sản phẩm trên website lẫn từng thiết bị thực tế trong kho. Khi thông tin đơn hàng, thanh toán và IMEI không đồng bộ, cửa hàng có thể bán trùng thiết bị, xử lý sai tồn kho hoặc khó truy vết bảo hành.

PhoneShop cung cấp ba không gian làm việc trên cùng một hệ thống:

- **Khách hàng:** tìm sản phẩm, chọn cấu hình, mua hàng và theo dõi đơn hàng.
- **Nhân viên:** xử lý đơn, hỗ trợ khách hàng, quản lý kho và bảo hành theo quyền được cấp.
- **Quản trị:** quản lý danh mục, tài khoản, khuyến mãi, thanh toán và báo cáo.

Dự án sử dụng React cho giao diện, NestJS cho REST API và PostgreSQL cho dữ liệu nghiệp vụ. Các quyền được định nghĩa gồm `USER`, `STAFF`, `MANAGER` và `ADMIN`.

## Demo & Screenshots

| Tài nguyên | Địa chỉ |
| --- | --- |
| Website demo | [phoneshop-blond.vercel.app](https://phoneshop-blond.vercel.app) |
| Backend health | [phoneshop-api.onrender.com/api/health](https://phoneshop-api.onrender.com/api/health) |
| Source code | [NguyenNguyen0210/PhoneShop](https://github.com/NguyenNguyen0210/PhoneShop) |

Các địa chỉ trên là môi trường demo được cấu hình cho dự án; phiên bản đang chạy có thể khác checkout hiện tại.

**Screenshots:** repository hiện chưa có bộ ảnh chụp giao diện được lưu để trình bày tại đây. Có thể trải nghiệm trang chủ, chi tiết sản phẩm, giỏ hàng và đăng nhập qua website demo. Giao diện nhân viên và quản trị yêu cầu tài khoản phù hợp.

## Key Features

| Nhóm chức năng | Nội dung |
| --- | --- |
| Mua sắm | Tìm kiếm, lọc và sắp xếp sản phẩm; chọn biến thể màu sắc, dung lượng; giỏ hàng và danh sách yêu thích |
| Tài khoản | Đăng ký, đăng nhập, Google sign-in, refresh token, quên mật khẩu và quản lý địa chỉ |
| Đơn hàng | Checkout, giữ thiết bị theo IMEI, theo dõi trạng thái, hủy đơn và xử lý giao hàng |
| Thanh toán | COD, VNPay, chuyển khoản VietQR, xác nhận thanh toán và ghi nhận hoàn tiền |
| Kho hàng | Quản lý IMEI, nhập kho, điều chỉnh tồn, lịch sử biến động và cảnh báo tồn thấp |
| Danh mục | Quản lý sản phẩm, biến thể, thông số kỹ thuật, thương hiệu, danh mục và nhà cung cấp |
| Khuyến mãi | Voucher với giới hạn sử dụng; Flash Sale với thời gian và hạn mức theo biến thể |
| Sau bán hàng | Tra cứu bảo hành, tiếp nhận sửa chữa, bàn giao thiết bị, đánh giá và phản hồi |
| Hỗ trợ | Ticket, giao diện hỗ trợ trực tiếp, chatbot và thông báo |
| Quản trị | Dashboard, báo cáo doanh thu và dòng tiền, đối soát thanh toán, phân quyền và nhật ký thao tác |

Các quy tắc nghiệp vụ đáng chú ý:

- Checkout phân bổ IMEI trong transaction để xử lý các yêu cầu mua đồng thời.
- Đơn thanh toán trực tuyến chưa trả tiền được giữ hàng trong 15 phút; tác vụ định kỳ giải phóng đặt giữ hết hạn. COD không áp dụng thời hạn này.
- Đơn hàng lưu bản chụp địa chỉ giao nhận; thay đổi địa chỉ tài khoản không sửa lịch sử đơn.
- Bảo hành bắt đầu khi giao hàng thành công.
- Chức năng hoàn tiền ghi nhận khoản tiền đã được hoàn bên ngoài hệ thống, không tự chuyển tiền qua ngân hàng hoặc cổng thanh toán.

## Tech Stack

| Layer | Công nghệ |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| UI | Tailwind CSS, Ant Design, Lucide, Ant Design Icons |
| State & HTTP | Zustand, TanStack Query, Axios |
| Biểu đồ | Recharts |
| Backend | NestJS 11, TypeScript, REST API, Swagger, scheduled jobs |
| Database | PostgreSQL, Prisma ORM 7, PostgreSQL driver adapter |
| Authentication | Passport, JWT access/refresh token, bcrypt, Google OAuth |
| Validation & HTTP security | class-validator, class-transformer, Helmet, throttling, CORS |
| File & email | Cloudflare R2, AWS S3 SDK, Sharp, Resend SMTP, Nodemailer |
| Testing | Jest, NestJS Testing, Python Playwright, Oxlint |
| Hosting & CI | Render, Vercel, GitHub Actions; Docker cho môi trường phát triển |

## Architecture

Backend được tổ chức theo **modular monolith**: các module nghiệp vụ dùng chung database và chạy trong một ứng dụng NestJS. Frontend gọi API qua Axios; route guard điều chỉnh giao diện theo vai trò, còn backend kiểm tra quyền truy cập và quyền sở hữu dữ liệu.

```mermaid
flowchart LR
    User[Khách hàng / Nhân viên / Quản trị] --> Web[React - Vercel]
    Web -->|REST API / JWT| API[NestJS - Render]
    API --> Domain[Module nghiệp vụ]
    Jobs[Tác vụ định kỳ] --> Domain
    Domain --> Prisma[Prisma ORM]
    Prisma --> DB[(PostgreSQL)]
    Domain --> Payment[VNPay / VietQR]
    Domain --> Storage[Cloudflare R2]
    Domain --> Email[Resend SMTP]
```

Trong mỗi module, **controller** tiếp nhận request, **DTO** mô tả và kiểm tra đầu vào, **service** xử lý nghiệp vụ, **PrismaService** truy cập dữ liệu. Các tác vụ liên quan tới đơn hàng, tồn kho và thanh toán sử dụng transaction khi cần đảm bảo tính nhất quán.

## Project Structure

```text
PhoneShop/
├── .github/workflows/       # CI frontend/backend
├── backend/
│   ├── Dockerfile          # Build NestJS/Prisma và tạo image production
│   ├── .dockerignore       # Loại trừ secrets, dependencies và build local
│   ├── prisma/
│   │   ├── migrations/     # Lịch sử thay đổi schema
│   │   ├── seed_modules/   # Các nhóm dữ liệu mẫu
│   │   ├── scripts/        # Công cụ bảo trì dữ liệu
│   │   ├── schema.prisma   # Mô hình dữ liệu
│   │   └── seed.ts
│   ├── scripts/            # Preflight migration, công cụ media, fixture smoke test
│   ├── src/
│   │   ├── common/         # Guard, decorator, filter, interceptor, utility
│   │   ├── config/         # Cấu hình môi trường
│   │   ├── health/         # Health endpoint
│   │   ├── infrastructure/ # Email, storage, rate limiting trong ứng dụng
│   │   ├── modules/        # Các module nghiệp vụ
│   │   ├── prisma/         # Database module và service
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── test/
│       └── integration/    # Kiểm thử với PostgreSQL thật
├── frontend/
│   ├── e2e/                # Browser smoke test
│   ├── public/             # Logo, favicon, ảnh và biểu tượng thương hiệu
│   └── src/
│       ├── components/     # Component dùng chung và theo nghiệp vụ
│       ├── layouts/        # Storefront, Staff, Admin
│       ├── pages/          # Các trang giao diện
│       ├── routes/         # Router và route guard
│       ├── services/       # API client và service
│       ├── stores/         # Zustand stores
│       ├── types/          # Kiểu dữ liệu TypeScript
│       └── utils/          # Hàm hỗ trợ
├── docker-compose.yml      # Backend development
├── docker-compose.prod.yml # Backend production và service migration riêng
└── README.md
```

## Getting Started

### Yêu cầu

- Node.js 22.12+ trên nhánh 22 hoặc phiên bản tương thích với dependencies. CI hiện dùng Node 22; checkout đã được kiểm tra bằng Node 24.14.1.
- npm 11 cho backend, tương ứng cấu hình CI.
- PostgreSQL; CI và ví dụ bên dưới sử dụng PostgreSQL 17.
- Docker nếu muốn chạy database bằng container.

Các lệnh bên dưới dùng **PowerShell**, bắt đầu từ thư mục gốc repository.

### 1. Clone repository

```powershell
git clone https://github.com/NguyenNguyen0210/PhoneShop.git
cd PhoneShop
```

### 2. Chuẩn bị database phát triển

Có thể dùng database development sẵn có hoặc tạo container riêng:

```powershell
docker run --detach --name phoneshop-postgres -e POSTGRES_USER=phoneshop -e POSTGRES_PASSWORD=local_dev_only -e POSTGRES_DB=phoneshop_dev -p 127.0.0.1:55432:5432 postgres:17
```

Connection string cho container trên:

```dotenv
DATABASE_URL=postgresql://phoneshop:local_dev_only@127.0.0.1:55432/phoneshop_dev
```

### 3. Cài đặt backend

```powershell
cd backend
npm install -g npm@11
npm ci
Copy-Item .env.example .env.development
```

Chỉnh `.env.development`: đặt `DATABASE_URL`, tạo hai secret JWT riêng và giữ `FRONTEND_URL=http://localhost:5173`. Xóa hoặc để trống các credential mẫu của tích hợp chưa sử dụng.

Tạo từng secret bằng lệnh sau, chạy hai lần:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Khởi tạo schema trên database phát triển và chạy API:

```powershell
$env:DOTENV_CONFIG_PATH = '.env.development'
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Ứng dụng tự đọc `.env.development`; `DOTENV_CONFIG_PATH` giúp Prisma CLI đọc cùng file. Chỉ dùng database phát triển cho quy trình cài đặt này.

### 4. Cài đặt frontend

Mở terminal thứ hai từ gốc repository:

```powershell
cd frontend
npm ci
```

Kiểm tra file `.env.development` hiện có. Nếu chưa có file, tạo từ mẫu:

```powershell
Copy-Item .env.example .env.development
```

Đặt `VITE_API_URL=http://localhost:3000/api`, sau đó chạy:

```powershell
npm run dev
```

| Dịch vụ | Địa chỉ local |
| --- | --- |
| Frontend | http://localhost:5173 |
| REST API | http://localhost:3000/api |
| Health | http://localhost:3000/api/health |
| Swagger | http://localhost:3000/api/docs |

### 5. Dữ liệu mẫu — tùy chọn

Từ `backend/`, với `DOTENV_CONFIG_PATH` đã đặt:

```powershell
npm run prisma:seed
```

**Seed xóa dữ liệu giao dịch, khách hàng mẫu cũ và đặt lại tài khoản được seed. Chỉ chạy trên database phát triển có thể bỏ đi.** Tài khoản và dữ liệu mẫu được định nghĩa trong [seed.ts](backend/prisma/seed.ts).

## Configuration

Tham khảo [backend/.env.example](backend/.env.example) và [frontend/.env.example](frontend/.env.example) để xem tên biến và định dạng.

| Phạm vi | Biến | Mục đích |
| --- | --- | --- |
| Backend | `NODE_ENV`, `PORT` | Chế độ chạy và cổng API |
| Database | `DATABASE_URL` | Kết nối PostgreSQL |
| JWT | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Ký token và thời hạn phiên |
| CORS | `FRONTEND_URL` | Origin frontend được backend chấp nhận |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Đăng nhập Google |
| VNPay | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL` | Thanh toán và URL trả về |
| VietQR | `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` | Thông tin tài khoản nhận tiền |
| Storage | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_PUBLIC_URL` | Lưu trữ và truy cập media |
| Email | `EMAIL_FROM`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS` | Gửi email qua Resend SMTP |
| Chatbot | `CHATBOT_ENABLED`, `CHATBOT_PROVIDER` và credential của provider trong file mẫu | Bật và cấu hình chatbot |
| Frontend | `VITE_API_URL` | API base URL, bao gồm `/api` |
| Frontend | `VITE_GOOGLE_CLIENT_ID` | Cùng client ID với backend |
| Frontend | `VITE_R2_PUBLIC_URL` | URL public dùng cho ảnh fallback |

Backend đọc `.env.production` khi `NODE_ENV=production`, nếu không sẽ đọc `.env.development`; có thể ghi đè đường dẫn bằng `DOTENV_FILE`. Prisma CLI dùng `DOTENV_CONFIG_PATH` khi cần chọn file khác `.env`.

Trong production, `FRONTEND_URL` phải là một HTTPS origin duy nhất. Backend yêu cầu credential VNPay và từ chối các giá trị mặc định sandbox được hard-code. Đăng ký đúng origin và redirect URI trên Google Cloud nếu bật Google sign-in.

Biến `VITE_*` được đưa vào frontend bundle và có thể được người dùng đọc. Chỉ đặt cấu hình công khai tại đây; lưu database URL, JWT secret và credential tích hợp ở backend. Không commit file môi trường chứa secret.

### Resend SMTP

Xác minh domain `tutorhub.id.vn` trong [Resend Domains](https://resend.com/domains), thêm các DNS record mà Resend cung cấp và chờ trạng thái verified. Tạo API key có quyền gửi cho domain này tại [Resend API Keys](https://resend.com/api-keys), rồi cấu hình trên backend/Render:

```dotenv
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=2465
EMAIL_SECURE=true
EMAIL_USER=resend
EMAIL_PASS=<Resend API key bắt đầu bằng re_>
EMAIL_FROM="PhoneShop <no-reply@tutorhub.id.vn>"
```

Theo [tài liệu Resend SMTP](https://resend.com/docs/send-with-smtp), password SMTP là API key; cổng `2465` dùng TLS ngay khi kết nối. [Render Free](https://render.com/docs/free) chặn các cổng `25`, `465`, `587`; cấu hình trên dùng cổng SMTP thay thế do Resend hỗ trợ. Cần kiểm tra kết nối thực tế trên service sau khi deploy.

Email nghiệp vụ và chức năng gửi email kiểm tra của admin dùng chung cấu hình SMTP. Không cần Resend SDK, `RESEND_API_KEY`, `EMAIL_PROVIDER` hoặc `BREVO_API_KEY`; đặt API key vào `EMAIL_PASS`. Khi thiếu password, development chỉ ghi log mock; production báo lỗi gửi thay vì giả lập thành công. Email chào mừng khi đăng ký vẫn đang tắt trong code; migration này giữ nguyên hành vi đó.

## API Documentation

Swagger được bật khi backend **không chạy production**, tại [localhost:3000/api/docs](http://localhost:3000/api/docs). API sử dụng prefix `/api`.

Một số endpoint tiêu biểu:

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/api/health` | Kiểm tra dịch vụ và kết nối database |
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/refresh-token` | Làm mới token |
| POST | `/api/auth/logout` | Đăng xuất và thu hồi refresh token |
| GET | `/api/products` | Danh sách sản phẩm |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| GET | `/api/cart` | Giỏ hàng của tài khoản |
| POST | `/api/orders/checkout` | Tạo đơn hàng |
| GET | `/api/orders/my` | Đơn hàng của tài khoản |
| GET | `/api/warranty/lookup` | Tra cứu bảo hành theo đầu vào được hỗ trợ |

Các endpoint được bảo vệ yêu cầu header:

```http
Authorization: Bearer <access_token>
```

Đăng nhập để lấy access token và refresh token. Khi gọi `/api/auth/refresh-token`, gửi refresh token qua Bearer header và trường `refreshToken` trong JSON body. Trong Swagger, chọn **Authorize** với scheme `access-token` cho endpoint sử dụng access token. Các thao tác nhân viên và quản trị còn được kiểm tra vai trò; xem DTO và controller để biết request schema cụ thể.

## Testing

### Backend: service tests và build

Từ `backend/`, sau khi cài dependencies và generate Prisma Client:

```powershell
npm test -- --runInBand
npm run build
```

Các service tests sử dụng dependency doubles. Integration suite được bỏ qua nếu chưa đặt `TEST_DATABASE_URL`.

### Integration tests với PostgreSQL

Tạo database kiểm thử riêng:

```powershell
docker run --detach --rm --name phoneshop-tests -e POSTGRES_USER=tester -e POSTGRES_PASSWORD=local_test_only -e POSTGRES_DB=phoneshop_test -p 127.0.0.1:55439:5432 postgres:17
```

Trong một terminal riêng, từ `backend/`, sau khi database sẵn sàng:

```powershell
$env:DATABASE_URL = 'postgresql://tester:local_test_only@127.0.0.1:55439/phoneshop_test'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npx prisma migrate deploy
npm run test:integration
```

Suite chỉ chấp nhận database ở `localhost` hoặc `127.0.0.1`, với tên kết thúc bằng `_test`, `_ci` hoặc `_audit`. Kiểm thử tạo fixture trong database đó, bao gồm checkout đồng thời, thanh toán, hoàn tiền, tồn kho, bảo hành và báo cáo.

Sau khi chạy, dừng container và đóng terminal kiểm thử để không giữ các biến môi trường trên:

```powershell
docker stop phoneshop-tests
```

### Frontend

Từ `frontend/`:

```powershell
npm run lint
npm run build
```

Browser smoke test nằm tại [frontend/e2e/business-smoke.py](frontend/e2e/business-smoke.py), sử dụng Python Playwright, fixture từ [seed-business-smoke.cjs](backend/scripts/seed-business-smoke.cjs), backend ở cổng `3101` và frontend ở cổng `5175`. Cần chuẩn bị database và fixture local riêng trước khi chạy.

Kết quả kiểm tra sau đợt dọn file ngày **05/11/2026**: frontend/backend build thành công; **75 test đạt, 16 integration test được bỏ qua** vì chưa cấu hình database kiểm thử. Frontend lint không có lỗi nhưng còn cảnh báo. Đây là kết quả của lần kiểm tra đó, không phải cam kết về trạng thái mọi commit hoặc môi trường demo.

## Deployment

### Backend trên Render

Dùng Web Service kết nối repository và cấu hình:

| Thiết lập | Giá trị |
| --- | --- |
| Runtime | Node |
| Branch | `main` |
| Root Directory | `backend` |
| Build Command | `npm install -g npm@11 && npm ci --include=dev && npx prisma generate && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/api/health` |

Đặt biến môi trường trên Render, bao gồm `NODE_ENV=production`, database URL, JWT secrets và cấu hình tích hợp cần dùng. Ví dụ origin frontend: `FRONTEND_URL=https://phoneshop-blond.vercel.app`. Backend sử dụng biến `PORT` do nền tảng cung cấp.

Build chỉ generate Prisma Client và biên dịch ứng dụng; **không tự áp dụng migration**. Với database đang có dữ liệu, xác minh backup có thể khôi phục, thử migration trên staging và chạy công cụ [preflight-production-migrations.cjs](backend/scripts/preflight-production-migrations.cjs) trước khi áp dụng migration. Preflight production yêu cầu `PRODUCTION_BACKUP_REFERENCE`; script này không thay thế backup. Không chạy seed hoặc reset trên database production.

### Frontend trên Vercel

| Thiết lập | Giá trị |
| --- | --- |
| Framework | Vite |
| Production Branch | `main` |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Đặt `VITE_API_URL=https://phoneshop-api.onrender.com/api`, `VITE_GOOGLE_CLIENT_ID` và `VITE_R2_PUBLIC_URL` theo môi trường thực tế. Sau khi đổi biến môi trường, tạo deployment mới. [frontend/vercel.json](frontend/vercel.json) đã cấu hình rewrite về `index.html` cho SPA routing.

### Docker backend

Từ thư mục gốc repository:

```powershell
docker build -t phoneshop-backend:local ./backend
docker run --rm --init --env-file backend/.env.production -p 3000:3000 phoneshop-backend:local
```

Image dùng Node 22, chỉ cài dependencies production trong runtime và chạy bằng user `node`. File môi trường được truyền lúc chạy, không được đưa vào image. Cần cấu hình database mà container truy cập được cùng các biến production trong phần Configuration. Image có Prisma CLI và migrations để chạy migration riêng; không tự migrate hoặc seed khi khởi động.

### CI/CD và Docker

- [Backend CI](.github/workflows/backend-ci.yml): audit dependencies, generate Prisma Client, build, thử migration và chạy kiểm thử với PostgreSQL riêng.
- [Frontend CI](.github/workflows/frontend-ci.yml): cài dependencies, lint và build.
- Hai CI workflow chạy khi push hoặc mở pull request tới `main` và `develop`.
- CD do Render/Vercel đảm nhiệm khi đã kết nối Git và bật tự động triển khai. Trên Render có thể chọn **After CI Checks Pass** để chờ CI đạt.
- [docker-compose.yml](docker-compose.yml) chạy backend development; không tạo frontend hoặc PostgreSQL. Cần database mà container truy cập được; `127.0.0.1` bên trong container là chính container đó.
- [docker-compose.prod.yml](docker-compose.prod.yml) dùng `backend/Dockerfile`, với service migration riêng. Cần chuẩn bị `backend/.env.production` trước khi dùng; chạy migration sau khi hoàn thành các bước kiểm tra database ở trên.

Tài liệu nền tảng: [Render deploys](https://render.com/docs/deploys), [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel environment variables](https://vercel.com/docs/environment-variables).

## Roadmap

Các hạng mục **đề xuất cho giai đoạn tiếp theo**, chưa thể hiện cam kết tiến độ:

- [ ] Bổ sung screenshots cho storefront, trang chi tiết sản phẩm và dashboard.
- [ ] Thống nhất cách đặt tên thư mục frontend và tách types theo nghiệp vụ.
- [ ] Mở rộng browser tests cho luồng mua hàng và phân quyền.
- [ ] Xử lý các lint warnings còn lại.
- [ ] Chuẩn hóa quy trình staging, migration và giám sát sau deploy.
- [ ] Bổ sung LICENSE áp dụng cho toàn repository.

## License & Author

**Tác giả:** [NguyenNguyen0210](https://github.com/NguyenNguyen0210)

**Repository:** [PhoneShop](https://github.com/NguyenNguyen0210/PhoneShop)

Repository hiện chưa có file `LICENSE` ở cấp dự án. `backend/package.json` khai báo `ISC`, nhưng cần bổ sung văn bản giấy phép và xác định phạm vi áp dụng trước khi công bố giấy phép chung cho toàn bộ source code.
