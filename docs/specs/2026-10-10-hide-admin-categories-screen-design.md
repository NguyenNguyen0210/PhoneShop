# Design Spec: Ẩn màn hình Quản lý Danh mục khỏi Admin Portal

- **Date:** 2026-10-10
- **Author:** PhoneShop Engineering Team
- **Topic:** Hide Admin Categories Screen & Redirect to Products Management

---

## 1. Context & Objectives

### Bối cảnh
Người dùng nhận thấy màn hình **Quản lý Cây Danh Mục Sản Phẩm** (`/admin/categories`) không cần thiết trong luồng công việc quản trị hiện tại và mong muốn gỡ bỏ chức năng này khỏi giao diện Admin.

Tuy nhiên, trong hệ thống cơ sở dữ liệu và mã nguồn:
- Sản phẩm (`Product`) vẫn có liên kết với `categoryId`.
- Giao diện Storefront có các bộ lọc và hiển thị theo danh mục.
- Form thêm/sửa sản phẩm vẫn cần đọc danh sách danh mục để gán giá trị hợp lệ.

Do đó, giải pháp tối ưu và an toàn nhất là **ẩn/gỡ màn hình này khỏi Admin Portal** và **chuyển hướng tự động (redirect)** về trang Quản lý Sản phẩm, đồng thời giữ nguyên backend API và service để không làm gãy các chức năng liên quan.

### Mục tiêu
1. **Gỡ bỏ menu Admin:** Loại bỏ mục **Quản lý Danh mục** khỏi thanh điều hướng Sidebar (`AdminLayout.tsx`).
2. **Chuyển hướng tự động (Redirect):** Chuyển hướng người dùng từ `/admin/categories` sang `/admin/products` một cách tự động và mượt mà trong `AppRoutes.tsx`.
3. **Bảo toàn dữ liệu & tính ổn định:** Không làm ảnh hưởng đến `categoryService`, form tạo/sửa sản phẩm và bộ lọc Storefront.

---

## 2. Giải pháp kỹ thuật chi tiết

### 2.1 Cập nhật `AdminLayout.tsx`
- Trong danh sách `adminMenuItems` tại nhóm `'Kho vận & Sản phẩm'`:
  - Loại bỏ phần tử:
    ```tsx
    {
      key: '/admin/categories',
      icon: <FolderOpenOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Danh mục',
    }
    ```
- Dọn dẹp logic xác định breadcrumb và active menu key:
  - Xóa dòng kiểm tra `if (location.pathname === '/admin/categories')`.
  - Xóa dòng kiểm tra `if (path.startsWith('/admin/categories'))`.

### 2.2 Cập nhật `AppRoutes.tsx`
- Cập nhật route `/admin/categories`:
  - Thay thế phần render `AdminCategoriesPage` bằng:
    ```tsx
    <Route path="/admin/categories" element={<Navigate to="/admin/products" replace />} />
    ```
  - Bỏ import không còn sử dụng của `AdminCategoriesPage` trong `AppRoutes.tsx`.

### 2.3 Phạm vi không thay đổi (Non-Goals / Out of Scope)
- Giữ nguyên thư mục `frontend/src/pages/Admin/Categories/` (hoặc giữ lại code cho các bài test và phục vụ khi cần tái sử dụng trong tương lai).
- Giữ nguyên `categoryService.ts` và backend Category APIs.
- Giữ nguyên `categoryId` trong `ProductGeneralTab.tsx` và storefront.

---

## 3. Kế hoạch kiểm thử & Đánh giá (Verification)
1. **Kiểm tra Sidebar:** Mở Admin Portal, thanh sidebar mục *Kho vận & Sản phẩm* chỉ còn: *Quản lý Sản phẩm*, *Quản lý Thương hiệu*, *Quản lý Kho & IMEI*, *Nhà cung cấp*.
2. **Kiểm tra Route Redirect:** Truy cập trực tiếp đường dẫn `http://localhost:5173/admin/categories`, kiểm tra trình duyệt chuyển hướng ngay lập tức về `/admin/products`.
3. **Kiểm tra Typecheck:** Chạy build frontend (`npm run build` hoặc `tsc -b`) để đảm bảo không có lỗi TypeScript hay gãy component.
