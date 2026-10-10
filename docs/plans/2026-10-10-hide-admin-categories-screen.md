# Hide Admin Categories Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ẩn màn hình Quản lý Danh mục khỏi Admin Portal bằng cách gỡ khỏi sidebar menu và chuyển hướng tự động (redirect) URL `/admin/categories` về `/admin/products`.

**Architecture:** Gỡ bỏ mục danh mục trong thanh điều hướng AdminLayout, thay thế route component trong AppRoutes bằng thẻ `<Navigate>`, đảm bảo zero downtime và không làm gián đoạn các luồng chọn danh mục ở sản phẩm / storefront.

**Tech Stack:** React, TypeScript, Ant Design, React Router DOM v7.

---

### Task 1: Gỡ bỏ Menu Danh mục khỏi AdminLayout (Parallel Worker 1)

**Files:**
- Modify: `frontend/src/layouts/AdminLayout.tsx`

- [ ] **Step 1: Gỡ bỏ item `/admin/categories` khỏi `adminMenuItems`**
Trong file `frontend/src/layouts/AdminLayout.tsx`, tìm mảng `adminMenuItems`, xóa đối tượng `{ key: '/admin/categories', icon: <FolderOpenOutlined />, label: 'Quản lý Danh mục' }` trong nhóm `'Kho vận & Sản phẩm'`.

- [ ] **Step 2: Dọn dẹp breadcrumb title & selected menu key**
Trong file `frontend/src/layouts/AdminLayout.tsx`:
- Xóa dòng: `if (location.pathname === '/admin/categories') return 'Quản lý Cây Danh Mục Sản Phẩm';`
- Xóa dòng: `if (path.startsWith('/admin/categories')) return '/admin/categories';`

- [ ] **Step 3: Kiểm tra cú pháp và commit**
```bash
git add frontend/src/layouts/AdminLayout.tsx
git commit -m "refactor(admin): remove categories menu item and breadcrumbs from AdminLayout"
```

---

### Task 2: Chuyển hướng route `/admin/categories` trong AppRoutes (Parallel Worker 2)

**Files:**
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Cập nhật route `/admin/categories` thành Navigate redirect**
Trong file `frontend/src/routes/AppRoutes.tsx`:
Thay thế route:
```tsx
<Route
  path="/admin/categories"
  element={
    <RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}>
      <AdminCategoriesPage />
    </RoleGuard>
  }
/>
```
Bằng:
```tsx
<Route path="/admin/categories" element={<Navigate to="/admin/products" replace />} />
```

- [ ] **Step 2: Dọn dẹp import không còn sử dụng**
Xóa dòng import:
```tsx
import { AdminCategoriesPage } from '../pages/Admin/Categories/AdminCategoriesPage';
```

- [ ] **Step 3: Kiểm tra cú pháp và commit**
```bash
git add frontend/src/routes/AppRoutes.tsx
git commit -m "feat(routes): redirect /admin/categories to /admin/products"
```

---

### Task 3: Tích hợp và Kiểm thử chất lượng (Verification & Typecheck)

**Files:**
- Verify: `frontend/src/layouts/AdminLayout.tsx`
- Verify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Kiểm tra linter / oxlint**
Chạy `npx oxlint src` trong thư mục `frontend` để đảm bảo không có cảnh báo syntax hay import thừa.

- [ ] **Step 2: Kiểm tra TypeScript build**
Chạy `npx tsc --noEmit` hoặc `npm run build` trong `frontend` để xác nhận toàn bộ project compile thành công.
