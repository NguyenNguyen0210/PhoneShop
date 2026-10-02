# Design Specification: Phase 3 - Real Image Uploads & Asset Management with Supabase Storage & Sharp

- **Date:** 2026-10-02
- **Author:** Antigravity AI
- **Status:** Draft / Ready for User Review
- **Target Stack:**
  - Storage Engine: Supabase Cloud Object Storage (Bucket: `mobile-commerce`)
  - Image Processing: Node.js `sharp` (WebP conversion, auto-resize, quality optimization)
  - Backend: NestJS 11 `StorageModule`, `StorageController` with Multer file interceptor, strict validation
  - Frontend Admin: Ant Design 6 `Upload.Dragger` / `Upload` with preview modal and progress indicator
  - Frontend Storefront: Tailwind CSS Avatar Uploader with live crop/preview in User Profile

---

## 1. Executive Summary & Goals

Trước đợt nâng cấp này, hệ thống đang dùng các đường dẫn ảnh tĩnh placeholder (Unsplash / Placehold.co). Phase 3 sẽ biến MobileCommerce thành một hệ thống thương mại điện tử thực thụ với khả năng quản lý media toàn diện:
1. **Tải lên ảnh thực tế chất lượng cao:** Cho phép Admin tải lên ảnh sản phẩm sắc nét, logo hãng và khách hàng đổi avatar.
2. **Tối ưu hóa dung lượng tự động (WebP Compression):** Sử dụng `sharp` để tự động chuyển đổi mọi định dạng ảnh tải lên (`.png`, `.jpg`, `.jpeg`, `.heic`) thành định dạng `.webp` hiện đại, giảm dung lượng tới 70-80% mà vẫn giữ nguyên độ nét chi tiết của thiết bị di động.
3. **Bảo mật & Toàn vẹn dữ liệu:** Kiểm tra chặt chẽ MIME type (chỉ nhận ảnh), giới hạn kích thước (tối đa 5MB), chống ghi đè bằng cách sinh UUID filename duy nhất theo từng folder (`products/`, `brands/`, `avatars/`, `categories/`).
4. **Trải nghiệm kéo thả trực quan (Drag & Drop):** Cung cấp component tải ảnh mượt mà trên Ant Design cho Admin và giao diện khách hàng.

---

## 2. Kiến trúc Xử lý & Luồng Dữ liệu (Architecture & Flow)

```text
CLIENT (Browser)
   │
   │ 1. Drag & Drop File (Max 5MB: PNG, JPG, WEBP)
   ▼
NESTJS CONTROLLER (/api/storage/upload/:folder)
   │
   │ 2. FileInterceptor (Multer memoryStorage) + ParseFilePipe
   ▼
STORAGE SERVICE
   │
   │ 3. Image Optimization Pipeline (via Sharp)
   │    ├── Resize if dimension > 1600px
   │    ├── Convert to WebP format
   │    └── Optimize quality = 80
   ▼
SUPABASE STORAGE CLIENT (@supabase/supabase-js)
   │
   │ 4. Upload buffer to Bucket: 'mobile-commerce'
   │    Path: {folder}/{timestamp}-{uuid}.webp
   ▼
PUBLIC CDN URL RETURN
   │
   │ 5. Return: { url: "https://...supabase.co/storage/v1/object/public/...", path: "..." }
   ▼
CLIENT PREVIEW & DATABASE UPDATE
```

---

## 3. Thiết kế Backend (`backend/src/infrastructure/storage/`)

### 3.1 Cài đặt & Cấu hình Thư viện
- Cài đặt: `sharp`, `@types/sharp`
- Thư mục tổ chức trên Bucket `mobile-commerce`:
  - `products/`: Ảnh đại diện và bộ sưu tập ảnh máy điện thoại (kích thước tối đa 1200x1200, WebP).
  - `brands/`: Logo các hãng sản xuất (kích thước chuẩn hóa 400x400 hoặc tỷ lệ vuông/chữ nhật, nền trong suốt).
  - `categories/`: Ảnh banner/icon danh mục.
  - `avatars/`: Ảnh đại diện người dùng (vuông 300x300, bo tròn).

### 3.2 Tối ưu hóa trong `StorageService`
```typescript
async optimizeImage(buffer: Buffer, maxWidth = 1200): Promise<{ buffer: Buffer; mimeType: string }> {
  const optimized = await sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return { buffer: optimized, mimeType: 'image/webp' };
}
```

### 3.3 Endpoints trong `StorageController` (`/api/storage`)
- `POST /api/storage/upload/product`: Nhận file đơn, lưu vào `products/`, yêu cầu quyền `ADMIN`/`STAFF`.
- `POST /api/storage/upload/product-gallery`: Nhận mảng file (tối đa 5 ảnh một lúc), lưu vào `products/gallery/`.
- `POST /api/storage/upload/brand`: Nhận file đơn, lưu vào `brands/`.
- `POST /api/storage/upload/avatar`: Nhận file đơn, lưu vào `avatars/`, áp dụng cho người dùng đã đăng nhập (`@CurrentUser()`).
- `DELETE /api/storage/delete`: Xóa file khỏi Supabase Storage dựa trên file path (bảo vệ tránh xóa nhầm).

---

## 4. Thiết kế Frontend

### 4.1 Component Tái sử dụng
1. **`ImageUploadDragger` (Admin - Ant Design):**
   - Vùng kéo thả file hỗ trợ xem trước (preview thumbnail), thanh tiến trình % upload, nút xóa ảnh.
   - Kiểm tra định dạng và dung lượng trực tiếp ở Client trước khi gửi request (Client-side validation).
2. **`AvatarUploader` (Storefront - Tailwind CSS):**
   - Nút bấm/vùng tròn đổi avatar trong trang Cá nhân (`/profile`), hỗ trợ xem trước ảnh ngay lập tức.

### 4.2 Tích hợp vào các Màn hình Hiện có
- **Admin Products (`AdminProductsPage`):**
  - Modal thêm/sửa sản phẩm: Thêm mục tải ảnh đại diện chính và thêm ảnh cho từng biến thể màu sắc (ví dụ: iPhone màu Titan Tự Nhiên tải ảnh máy màu Titan, màu Xanh tải ảnh máy màu Xanh).
- **Admin Brands & Categories:**
  - Form thêm thương hiệu có nút upload logo hãng lên Supabase.
- **Storefront Profile:**
  - Trang thông tin tài khoản cho phép khách hàng cập nhật avatar mới và lưu vào cơ sở dữ liệu.

---

## 5. Kế hoạch Kiểm thử & Đảm bảo Chất lượng
1. **Unit Tests cho `StorageService`:**
   - Kiểm tra hàm `optimizeImage` nén buffer thành công ra định dạng `image/webp`.
   - Kiểm tra xử lý lỗi khi file đầu vào không phải là định dạng ảnh hợp lệ.
2. **Kiểm tra Fallback Mode:**
   - Đảm bảo nếu chưa cấu hình `SUPABASE_SERVICE_ROLE_KEY` thật thì hệ thống tự động fallback về Mock URL mà không làm crash server backend.
3. **Build Verification:**
   - Cả Backend (`nest build`) và Frontend (`vite build`) đạt 0 lỗi biên dịch.
