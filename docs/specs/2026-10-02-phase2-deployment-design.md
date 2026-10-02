# Design Specification: Phase 2 - Cloudflare/Vercel Frontend & Streamlined Backend Docker Deployment

- **Date:** 2026-10-02
- **Author:** Antigravity AI
- **Status:** Draft / Approved by User
- **Target Architecture:** 
  - Frontend: React 19 + Vite deployed to **Vercel / Cloudflare Pages** (Serverless Edge CDN, zero server maintenance, automatic SSL, SPA routing).
  - Backend: NestJS 11 containerized with multi-stage Dockerfile running on Linux/VPS alongside Redis 7 Alpine.
  - Eliminated: Complex self-hosted Nginx reverse proxy containers and manual certbot SSL renewals.

---

## 1. Overview & Architectural Motivation

Người dùng đã quyết định **loại bỏ Nginx tự quản lý** trong project nhằm đơn giản hóa tối đa hạ tầng vận hành:
- **Frontend** được triển khai trực tiếp lên các nền tảng Edge CDN hàng đầu thế giới (**Vercel** hoặc **Cloudflare Pages**). Toàn bộ việc nén asset (Brotli/Gzip), cache toàn cầu, tự động cấp phát chứng chỉ SSL/TLS miễn phí và chống DDoS được xử lý tự động ở tầng rìa (Edge Network).
- **Backend & Caching** được đóng gói thành mô hình Docker tinh gọn 2 dịch vụ:
  1. `backend`: NestJS 11 multi-stage build (nhỏ gọn, bảo mật, không chứa devDependencies).
  2. `redis`: Redis 7 Alpine cho caching, BullMQ hold expiry worker và rate limiting.
- **Kết nối Backend - Frontend:** Kết nối qua REST API thông qua HTTPS công khai với cấu hình CORS bảo mật và Cookie/JWT headers được cho phép.

---

## 2. Thiết kế Chi tiết Từng Thành phần

### 2.1 Cấu hình Frontend cho Vercel / Cloudflare Pages
1. **SPA Rewrites Configuration:**
   - Tạo file `frontend/vercel.json`:
     ```json
     {
       "rewrites": [
         { "source": "/(.*)", "destination": "/index.html" }
       ]
     }
     ```
   - Tạo file `frontend/public/_redirects` (dành cho Cloudflare Pages / Netlify):
     ```text
     /*    /index.html   200
     ```
2. **Environment Variable Configuration:**
   - `VITE_API_URL`: URL Backend công khai (ví dụ: `https://api.mobilecommerce.vn`).
   - Cập nhật `src/services/apiClient.ts` để đọc linh hoạt: `import.meta.env.VITE_API_URL || '/api'`.

### 2.2 Tối ưu hóa Backend & Docker Compose (Loại bỏ Nginx)
1. **Dọn dẹp & Tinh gọn:**
   - Loại bỏ Nginx khỏi `docker-compose.yml` và `docker-compose.prod.yml`.
   - Cấu trúc chỉ còn 2 services: `redis` và `backend`.
   - Cổng backend mở trực tiếp cổng `3000` (hoặc cổng cấu hình qua biến `PORT`).
2. **Multi-Stage `backend.Dockerfile`:**
   - **Stage 1 (Builder):** `node:22-alpine` -> Cài đặt dependencies, sinh Prisma Client, chạy `npm run build`.
   - **Stage 2 (Runner):** `node:22-alpine` -> Chỉ copy `dist`, `prisma`, `package.json`, cài đặt `--omit=dev` để kích thước image siêu nhẹ (< 150MB), khởi chạy bằng non-root user `node`.
3. **CORS & Bảo mật trong NestJS (`main.ts`):**
   - Hỗ trợ danh sách trắng các origins (localhost, Vercel domain `*.vercel.app`, Cloudflare Pages `*.pages.dev`, và domain chính thức).
   - Cho phép credentials và các methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`.

### 2.3 Quản lý Biến Môi Trường & CI/CD
1. **Cấu hình `.env.example` và `.env.production` chuẩn hóa:**
   - Hướng dẫn chi tiết các biến: `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `VNPAY_*`, `SUPABASE_*`.
2. **GitHub Actions Workflows:**
   - `frontend-ci.yml`: Tự động kiểm tra lint và build React trên môi trường Node 22.
   - `backend-ci.yml`: Tự động kiểm tra Prisma schema, chạy Unit Tests và build NestJS.
   - `deploy.yml`: Kịch bản trigger deploy backend lên server VPS qua SSH / Docker Hub.

---

## 3. Lợi ích Đạt được
1. **Tiết kiệm 100% chi phí & công sức cấu hình Web Server Nginx:** Không còn lo lắng về cấu hình Nginx syntax, cấu hình Let's Encrypt hay lỗi port 80/443.
2. **Tốc độ tải trang tối đa:** Vercel và Cloudflare Pages phân phối Frontend tới hơn 300 điểm PoP trên toàn cầu.
3. **Dung lượng & RAM tối ưu:** Server backend chỉ tốn ~100MB RAM cho NestJS và ~20MB RAM cho Redis.
