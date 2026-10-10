# Design Spec: Dọn dẹp Code chết và Scripts cũ trong PhoneShop

- **Date:** 2026-10-10
- **Author:** PhoneShop Engineering Team
- **Topic:** Cleanup Dead Code, Obsolete Shims, and Backend Verification Scripts

---

## 1. Context & Objectives

### Bối cảnh
Trong quá trình phát triển dự án PhoneShop, một số component cũ và file shim trung gian bị bỏ quên sau khi cấu trúc thư mục được tái cấu trúc:
1. `AdminSidebar.tsx` và test đi kèm: Component sidebar này không còn được sử dụng ở bất kỳ đâu do toàn bộ navigation của Admin portal đã được gom vào `AdminLayout.tsx`.
2. `AdminDashboard.tsx`: File shim chỉ re-export `AdminDashboardPage.tsx`. Có thể trỏ import trực tiếp từ `AppRoutes.tsx` sang `AdminDashboardPage.tsx` và xóa file shim.
3. `ProductDetailPage.tsx` trong `frontend/src/pages/storefront/Products/`: File shim chỉ re-export `ProductDetail/ProductDetailPage.tsx`, không có component hay route nào import tới thư mục này.
4. Các script kiểm tra thủ công trong `backend/test/`: `seed_verification.ts`, `pagination_verification.ts`, `wishlist_verification.ts` là các file tạm từ lúc thiết lập database ban đầu, không nằm trong bộ test runner chính thức của Jest (`jest.config.js`).

### Mục tiêu
1. Loại bỏ các file dead code và shim thừa ở Frontend mà không làm ảnh hưởng đến bất kỳ trang hay component nào đang hoạt động.
2. Dọn dẹp các script kiểm thử thủ công không sử dụng ở Backend.
3. Đảm bảo toàn bộ hệ thống (linter, TypeScript compiler, production build) chạy mượt mà không lỗi.

---

## 2. Chi tiết các thay đổi

### 2.1 Frontend - Dọn dẹp Code chết & Shims
1. **Cập nhật import trong `frontend/src/routes/AppRoutes.tsx`:**
   - Đổi dòng:
     ```tsx
     import { AdminDashboard } from '../pages/Admin/Dashboard/AdminDashboard';
     ```
     Thành:
     ```tsx
     import { AdminDashboard } from '../pages/Admin/Dashboard/AdminDashboardPage';
     ```
2. **Xóa các file Frontend thừa:**
   - `frontend/src/components/admin/AdminSidebar.tsx`
   - `frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx`
   - `frontend/src/pages/Admin/Dashboard/AdminDashboard.tsx`
   - `frontend/src/pages/storefront/Products/ProductDetailPage.tsx` (và thư mục rỗng `frontend/src/pages/storefront/Products/`)

### 2.2 Backend - Dọn dẹp Scripts thủ công cũ
- **Xóa các file kiểm thử thủ công trong `backend/test/`:**
  - `backend/test/seed_verification.ts`
  - `backend/test/pagination_verification.ts`
  - `backend/test/wishlist_verification.ts`

---

## 3. Kế hoạch kiểm thử & Đánh giá (Verification)
1. **Frontend Lint & Typecheck:**
   - Chạy `npx oxlint src` trong thư mục `frontend` không còn lỗi hay cảnh báo.
   - Chạy `npx tsc --noEmit` hoặc `npm run build` thành công 100%.
2. **Frontend Unit Tests:**
   - Chạy `npx vitest run` đảm bảo không bị thiếu dependency hoặc gãy test do file bị xóa.
