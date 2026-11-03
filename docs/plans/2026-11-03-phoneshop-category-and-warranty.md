# PhoneShop Category Management, Warranty Lifecycle & Cart Pre-validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hoàn chỉnh phân hệ Quản lý Danh mục Admin (Tree & CRUD), khép kín vòng đời Bảo hành từ Storefront Claim đến Admin Management kèm Ownership Gate, và bổ sung Tiền kiểm Giỏ hàng (Cart Pre-validation) trước khi đặt hàng.

**Architecture:** Sử dụng kiến trúc Master-Detail Split View cho quản trị danh mục đa cấp, kết hợp Ant Design Tree & Table. Quy trình bảo hành được kiểm soát bảo mật hai lớp (Ownership Check: chỉ chủ sở hữu thiết bị mới được kích hoạt claim bảo hành) từ Storefront đến Admin Operations Drawer. Giỏ hàng được tiền kiểm qua endpoint `GET /cart/validate` để cảnh báo biến động tồn kho và flash sale trước khi mở Checkout.

**Tech Stack:** React 19, TypeScript, Ant Design, Tailwind CSS, Vite, Axios, NestJS 11, Prisma 7.

---

## File Structure Map

### Category Management:
- Create: `frontend/src/services/categoryService.ts` — API client service cho danh mục (tree, crud, toggle active, reorder).
- Create: `frontend/src/pages/Admin/Categories/AdminCategoriesPage.tsx` — Master-detail split layout (Tree bên trái, Table bên phải).
- Create: `frontend/src/pages/Admin/Categories/components/CategoryFormModal.tsx` — Modal thêm/sửa danh mục kèm upload icon.
- Modify: `frontend/src/routes/AppRoutes.tsx` — Bỏ redirect `/admin/categories -> /admin/products`, gắn `AdminCategoriesPage`.

### Warranty Lifecycle:
- Modify: `frontend/src/services/warrantyService.ts` — Bổ sung API `claimWarranty`, `getAllWarrantiesAdmin`, `voidWarrantyAdmin`.
- Create: `frontend/src/components/storefront/warranty/ClaimWarrantyModal.tsx` — Modal gửi yêu cầu bảo hành cho khách hàng.
- Modify: `frontend/src/pages/storefront/Profile/components/WarrantiesTab.tsx` — Tích hợp nút và modal claim cho máy còn hạn.
- Modify: `frontend/src/pages/storefront/WarrantyLookup/WarrantyLookupPage.tsx` — Ownership Gate: kiểm tra `warranty.userId === currentUser.id` để hiển thị nút gửi claim hoặc hướng dẫn đăng nhập.
- Create: `frontend/src/pages/Admin/Warranties/AdminWarrantiesPage.tsx` — Giao diện quản lý bảo hành Admin/Staff (lọc trạng thái, xem claim, void).
- Modify: `frontend/src/layouts/AdminLayout.tsx` & `frontend/src/layouts/StaffLayout.tsx` — Thêm menu Bảo hành vào thanh điều hướng.
- Modify: `frontend/src/routes/AppRoutes.tsx` — Thêm route `/admin/warranties` và `/staff/warranties`.

### Cart Pre-validation:
- Modify: `frontend/src/services/cartService.ts` — Bổ sung hàm `validateCart()`.
- Modify: `frontend/src/pages/storefront/Cart/CartPage.tsx` — Gọi validate khi bấm "Tiến hành đặt hàng", cảnh báo nếu có biến động tồn kho/giá.
- Modify: `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx` — Chạy validate khi khởi tạo trang checkout.

---

## Task List Overview

- **Task 1: Tạo `categoryService.ts` & Cấu hình Routes Quản lý Danh mục**
- **Task 2: Xây dựng Giao diện Master-Detail `AdminCategoriesPage.tsx` & `CategoryFormModal.tsx`**
- **Task 3: Nâng cấp `warrantyService.ts` & Xây dựng `ClaimWarrantyModal.tsx` trên Storefront**
- **Task 4: Tích hợp Ownership Gate tại `WarrantyLookupPage.tsx` & `ProfilePage`**
- **Task 5: Xây dựng Trang Quản lý Bảo hành Quản trị `AdminWarrantiesPage.tsx` & Menu Navigation**
- **Task 6: Tích hợp Tiền kiểm Giỏ hàng (Cart Pre-validation) tại `CartPage.tsx` & `CheckoutPage.tsx`**
- **Task 7: Kiểm tra Build Toàn diện & Xác thực Trải nghiệm**

---

### Task 1: Tạo `categoryService.ts` & Cấu hình Routes Quản lý Danh mục

**Files:**
- Create: `frontend/src/services/categoryService.ts`
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Viết `categoryService.ts`**
Tạo file `frontend/src/services/categoryService.ts` chứa đầy đủ các lời gọi API:
```typescript
import { apiClient } from './apiClient';
import type { Category } from '../types';

export interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[];
  productCount?: number;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  parentId?: string | null;
  icon?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {}

export const categoryService = {
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const res = await apiClient.get('/categories/admin/tree');
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  async getAllCategories(params?: { search?: string; isActive?: boolean }): Promise<Category[]> {
    const res = await apiClient.get('/categories/admin/all', { params });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    const res = await apiClient.post('/categories', payload);
    return res.data?.data ?? res.data;
  },

  async updateCategory(id: string, payload: UpdateCategoryPayload): Promise<Category> {
    const res = await apiClient.patch(`/categories/${id}`, payload);
    return res.data?.data ?? res.data;
  },

  async toggleCategoryStatus(id: string, activate: boolean): Promise<Category> {
    const endpoint = activate ? `/categories/${id}/activate` : `/categories/${id}/deactivate`;
    const res = await apiClient.put(endpoint);
    return res.data?.data ?? res.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },

  async reorderCategories(orders: Array<{ id: string; order: number }>): Promise<void> {
    await apiClient.put('/categories/admin/reorder', { orders });
  },
};
```

- [ ] **Step 2: Cập nhật `AppRoutes.tsx`**
Gỡ bỏ lệnh redirect `/admin/categories` sang `/admin/products`, gắn import và component `AdminCategoriesPage`.
- [ ] **Step 3: Chạy TypeScript check**
Command: `npx tsc -b` (tại `frontend/`)
- [ ] **Step 4: Commit Task 1**
```bash
git add frontend/src/services/categoryService.ts frontend/src/routes/AppRoutes.tsx
git commit -m "feat(category): add categoryService and route for admin category management"
```

---

### Task 2: Xây dựng Giao diện Master-Detail `AdminCategoriesPage.tsx` & `CategoryFormModal.tsx`

**Files:**
- Create: `frontend/src/pages/Admin/Categories/components/CategoryFormModal.tsx`
- Create: `frontend/src/pages/Admin/Categories/AdminCategoriesPage.tsx`

- [ ] **Step 1: Viết `CategoryFormModal.tsx`**
Hỗ trợ tạo mới danh mục hoặc cập nhật danh mục, chọn danh mục cha qua `TreeSelect`, upload icon/ảnh đại diện qua `storageService`.
- [ ] **Step 2: Viết `AdminCategoriesPage.tsx`**
Thiết kế Master-Detail Split View:
- Cột trái: Cây danh mục `Tree` kèm bộ lọc tìm kiếm nhanh.
- Cột phải: Bảng chi tiết danh mục con trực thuộc node đang chọn (Tên, Slug, Trạng thái Kích hoạt/Ẩn, Thứ tự hiển thị, Nút sửa, Nút toggle trạng thái, Nút xóa an toàn `Popconfirm`).
- [ ] **Step 3: Kiểm tra biên dịch TypeScript**
Command: `npx tsc -b` (tại `frontend/`)
- [ ] **Step 4: Commit Task 2**
```bash
git add frontend/src/pages/Admin/Categories/
git commit -m "feat(admin-categories): implement split-view category management page and form modal"
```

---

### Task 3: Nâng cấp `warrantyService.ts` & Xây dựng `ClaimWarrantyModal.tsx` trên Storefront

**Files:**
- Modify: `frontend/src/services/warrantyService.ts`
- Create: `frontend/src/components/storefront/warranty/ClaimWarrantyModal.tsx`

- [ ] **Step 1: Bổ sung các phương thức vào `warrantyService.ts`**
```typescript
  async claimWarranty(
    id: string,
    payload: { reason: string; customerPhone?: string; returnAddress?: string }
  ): Promise<Warranty> {
    const res = await apiClient.post(`/warranty/${id}/claim`, payload);
    return res.data?.data ?? res.data;
  },

  async getAllWarrantiesAdmin(): Promise<Warranty[]> {
    const res = await apiClient.get('/warranty');
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async voidWarrantyAdmin(id: string): Promise<Warranty> {
    const res = await apiClient.put(`/warranty/${id}/void`);
    return res.data?.data ?? res.data;
  },
```

- [ ] **Step 2: Tạo `ClaimWarrantyModal.tsx`**
Hiển thị thông tin máy đang gửi yêu cầu bảo hành, ô nhập chi tiết sự cố / lỗi máy, ô số điện thoại liên hệ và địa chỉ gửi/nhận máy. Xử lý submit gọi `warrantyService.claimWarranty(warranty.id, values)`.
- [ ] **Step 3: Kiểm tra biên dịch TypeScript**
Command: `npx tsc -b` (tại `frontend/`)
- [ ] **Step 4: Commit Task 3**
```bash
git add frontend/src/services/warrantyService.ts frontend/src/components/storefront/warranty/ClaimWarrantyModal.tsx
git commit -m "feat(warranty): add claimWarranty api and storefront claim warranty modal"
```

---

### Task 4: Tích hợp Ownership Gate tại `WarrantyLookupPage.tsx` & `ProfilePage`

**Files:**
- Modify: `frontend/src/pages/storefront/Profile/components/WarrantiesTab.tsx`
- Modify: `frontend/src/pages/storefront/WarrantyLookup/WarrantyLookupPage.tsx`

- [ ] **Step 1: Cập nhật Tab Bảo hành trong Profile (`WarrantiesTab.tsx`)**
Thêm nút "Yêu cầu bảo hành" cho các phiếu có trạng thái `ACTIVE` và chưa hết hạn, mở `ClaimWarrantyModal` khi người dùng bấm vào.
- [ ] **Step 2: Tích hợp Ownership Gate tại `WarrantyLookupPage.tsx`**
- Đọc thông tin user hiện tại qua `useAuthStore`.
- Nếu chưa đăng nhập: Hiển thị nút "Đăng nhập để gửi yêu cầu bảo hành".
- Nếu đã đăng nhập:
  - Nếu `w.userId === user.id`: Hiển thị nút "Gửi yêu cầu bảo hành cho máy này" mở `ClaimWarrantyModal`.
  - Nếu không trùng `userId`: Chỉ hiển thị thông tin tra cứu công khai, ẩn nút yêu cầu để tránh người lạ spam bằng IMEI.
- [ ] **Step 3: Kiểm tra biên dịch TypeScript**
Command: `npx tsc -b` (tại `frontend/`)
- [ ] **Step 4: Commit Task 4**
```bash
git add frontend/src/pages/storefront/Profile/components/WarrantiesTab.tsx frontend/src/pages/storefront/WarrantyLookup/WarrantyLookupPage.tsx
git commit -m "feat(storefront): integrate warranty claim with ownership check in profile and lookup page"
```

---

### Task 5: Xây dựng Trang Quản lý Bảo hành Quản trị `AdminWarrantiesPage.tsx` & Menu Navigation

**Files:**
- Create: `frontend/src/pages/Admin/Warranties/AdminWarrantiesPage.tsx`
- Modify: `frontend/src/layouts/AdminLayout.tsx`
- Modify: `frontend/src/layouts/StaffLayout.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Viết `AdminWarrantiesPage.tsx`**
Bảng danh sách toàn bộ phiếu bảo hành:
- Bộ lọc trạng thái: `ALL`, `ACTIVE`, `CLAIMED`, `EXPIRED`, `VOIDED`.
- Tìm kiếm theo Mã bảo hành, IMEI hoặc Thông tin khách hàng.
- Xem chi tiết lỗi khi có yêu cầu `CLAIMED` do khách gửi lên.
- Nút "Hủy bảo hành (Void)" cho phép nhân viên/admin từ chối các máy vi phạm điều kiện bảo hành (`voidWarrantyAdmin`).
- [ ] **Step 2: Bổ sung Menu Navigation trong `AdminLayout.tsx` và `StaffLayout.tsx`**
Thêm menu item *"Quản lý Bảo hành"* với icon `SafetyCertificateOutlined` dẫn tới `/admin/warranties` (hoặc `/staff/warranties`).
- [ ] **Step 3: Thêm Route vào `AppRoutes.tsx`**
Khai báo `<Route path="/admin/warranties" element={<AdminWarrantiesPage />} />` và `<Route path="/staff/warranties" element={<AdminWarrantiesPage />} />`.
- [ ] **Step 4: Kiểm tra biên dịch TypeScript**
Command: `npx tsc -b` (tại `frontend/`)
- [ ] **Step 5: Commit Task 5**
```bash
git add frontend/src/pages/Admin/Warranties/ frontend/src/layouts/AdminLayout.tsx frontend/src/layouts/StaffLayout.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(admin-warranties): add admin warranty management page and sidebar navigation"
```

---

### Task 6: Tích hợp Tiền kiểm Giỏ hàng (Cart Pre-validation) tại `CartPage.tsx` & `CheckoutPage.tsx`

**Files:**
- Modify: `frontend/src/services/cartService.ts`
- Modify: `frontend/src/pages/storefront/Cart/CartPage.tsx`
- Modify: `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`

- [ ] **Step 1: Thêm `validateCart()` trong `cartService.ts`**
```typescript
  async validateCart(): Promise<{ valid: boolean; issues?: string[]; cart?: any }> {
    const response = await apiClient.get('/cart/validate');
    return response.data?.data ?? response.data;
  },
```

- [ ] **Step 2: Cập nhật `CartPage.tsx` khi bấm "Tiến hành đặt hàng"**
Khi khách nhấn "Tiến hành đặt hàng":
- Bật trạng thái loading.
- Gọi `cartService.validateCart()`.
- Nếu có cảnh báo (hết hàng, flash sale hết quota, giá thay đổi):
  - Hiển thị thông báo `Modal.warning` giải thích rõ lý do.
  - Tự động gọi `loadCart()` để cập nhật lại giỏ hàng theo giá và số lượng mới nhất.
- Nếu giỏ hàng hợp lệ: Chuyển hướng sang `/checkout`.
- [ ] **Step 3: Cập nhật `CheckoutPage.tsx`**
Khi mount trang Checkout: Kiểm tra nhanh giỏ hàng. Nếu giỏ rỗng, tự động thông báo và điều hướng về `/cart`.
- [ ] **Step 4: Kiểm tra biên dịch TypeScript**
Command: `npx tsc -b` (tại `frontend/`)
- [ ] **Step 5: Commit Task 6**
```bash
git add frontend/src/services/cartService.ts frontend/src/pages/storefront/Cart/CartPage.tsx frontend/src/pages/storefront/Checkout/CheckoutPage.tsx
git commit -m "feat(cart): add cart pre-validation before checkout to prevent stale data"
```

---

### Task 7: Kiểm tra Build Toàn diện & Xác thực Trải nghiệm

**Files:**
- Toàn bộ source code Frontend & Backend

- [ ] **Step 1: Chạy toàn bộ Backend test suites**
Command: `npm test` (tại `backend/`)
Expected: 13/13 test suites PASS (42/42 tests PASS).

- [ ] **Step 2: Chạy build Backend**
Command: `npm run build` (tại `backend/`)
Expected: Build thành công (Zero errors).

- [ ] **Step 3: Chạy build Frontend**
Command: `npm run build` (tại `frontend/`)
Expected: Build thành công (Zero errors), các vendor chunks được tạo ra chuẩn xác.

- [ ] **Step 4: Kiểm tra Git status**
Command: `git status`
Expected: Working tree clean.

