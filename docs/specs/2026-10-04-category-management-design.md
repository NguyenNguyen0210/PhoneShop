# Design Specification: Category Management (Quản lý Danh mục Smartphone)

**Date:** 2026-10-04  
**Status:** Approved  
**Author:** AI Agent & Development Team  
**Scope:** Smartphone E-Commerce Platform (MobileCommerce)

---

## 1. Overview & Business Objectives

Hệ thống MobileCommerce chuyên biệt về kinh doanh Smartphone (Điện thoại thông minh). Tính năng **Quản lý Danh mục (Category Management)** cung cấp một bảng điều khiển hoàn chỉnh cho Quản trị viên (ADMIN) và Quản lý (MANAGER) để quản lý cây phân cấp danh mục smartphone (cha - con), hỗ trợ phân loại sản phẩm theo dòng máy, hệ điều hành hoặc phân khúc giá.

### Core Goals:
1. **Quản trị toàn diện (CRUD Hierarchy)**: Cho phép tạo, sửa, xóa, bật/tắt kích hoạt các danh mục theo cấu trúc cây đa tầng (Tree Structure).
2. **Toàn vẹn dữ liệu (Data Integrity)**: Ngăn chặn xóa các danh mục đang có sản phẩm liên kết hoặc danh mục con; ngăn chặn vòng lặp cha-con trong cây danh mục.
3. **Trải nghiệm trực quan (Intuitive UI/UX)**: Hiển thị bảng phân cấp Ant Design Tree Table với khả năng mở rộng/thu gọn, tìm kiếm, lọc trạng thái, cập nhật trạng thái nhanh và modal biểu mẫu chuẩn SEO.

---

## 2. Architecture & Data Flow

```
[ Frontend: React 19 + Ant Design ]
        │
        ├── categoryService.ts (Axios REST Client)
        │
[ Backend: NestJS Categories Module ]
        │
        ├── CategoriesController (Guards: JwtAuthGuard, RolesGuard)
        │       ├── GET    /categories/admin/tree
        │       ├── GET    /categories/admin/all
        │       ├── POST   /categories
        │       ├── PATCH  /categories/:id
        │       ├── PUT    /categories/:id/activate
        │       ├── PUT    /categories/:id/deactivate
        │       └── DELETE /categories/:id
        │
        ├── CategoriesService (Business Logic, Validation, Relation Checks)
        │
[ Database: PostgreSQL (Prisma ORM) ]
        │
        └── categories Table (self-referencing parentId -> id)
```

---

## 3. Backend Specification

### 3.1 Controller Endpoints (`backend/src/modules/categories/categories.controller.ts`)

| HTTP Method | Path | Roles | Description |
|---|---|---|---|
| `GET` | `/categories` | Public | Lấy danh sách danh mục đang kích hoạt |
| `GET` | `/categories/tree` | Public | Lấy cây danh mục đang kích hoạt |
| `GET` | `/categories/admin/all` | MANAGER, ADMIN | Lấy tất cả danh mục (phẳng) gồm cả ẩn |
| `GET` | `/categories/admin/tree` | MANAGER, ADMIN | Lấy toàn bộ cây danh mục kèm số lượng sản phẩm |
| `GET` | `/categories/:id` | Public | Chi tiết 1 danh mục kèm sản phẩm/con |
| `POST` | `/categories` | MANAGER, ADMIN | Tạo danh mục mới |
| `PATCH` | `/categories/:id` | MANAGER, ADMIN | Cập nhật thông tin danh mục |
| `PUT` | `/categories/:id/activate` | MANAGER, ADMIN | Kích hoạt danh mục (`isActive = true`) |
| `PUT` | `/categories/:id/deactivate` | MANAGER, ADMIN | Tạm ẩn danh mục (`isActive = false`) |
| `DELETE` | `/categories/:id` | MANAGER, ADMIN | Xóa danh mục (có kiểm tra ràng buộc) |

### 3.2 Service Business Rules (`backend/src/modules/categories/categories.service.ts`)

1. **Đếm liên kết (`_count`)**:
   * Khi trả về danh sách/cây danh mục trong admin (`getTree`, `findAll`), bổ sung `_count: { select: { products: true, children: true } }`.
2. **Quy tắc an toàn khi Xóa (`remove`)**:
   * Kiểm tra số lượng `products` liên kết: Nếu `products.length > 0`, ném `BadRequestException('Danh mục đang chứa sản phẩm liên kết. Không thể xóa.')`.
   * Kiểm tra số lượng `children`: Nếu `children.length > 0`, ném `BadRequestException('Danh mục đang chứa danh mục con. Vui lòng xử lý danh mục con trước.')`.
   * Nếu không có liên kết nào, thực hiện `prisma.category.delete`.
3. **Phòng chống vòng lặp phân cấp (`Cyclic Hierarchy Prevention`)**:
   * Khi cập nhật `parentId`:
     * Không cho phép `parentId === id`.
     * Kiểm tra đệ quy đảm bảo `parentId` không phải là con/cháu của `id`.
4. **Bật/Tắt trạng thái (`changeStatus`)**:
   * Cập nhật `isActive: boolean` cho danh mục được chỉ định.

---

## 4. Frontend Specification

### 4.1 Type Definitions (`frontend/src/types/index.ts`)

```typescript
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId?: string | null;
  parent?: Category | null;
  children?: Category[];
  _count?: {
    products: number;
    children: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}
```

### 4.2 API Service (`frontend/src/services/categoryService.ts`)

Cung cấp các hàm API chuyên trách:
- `getAdminCategoryTree(): Promise<Category[]>`
- `getAdminCategoriesAll(): Promise<Category[]>`
- `createCategory(dto: CreateCategoryInput): Promise<Category>`
- `updateCategory(id: string, dto: UpdateCategoryInput): Promise<Category>`
- `activateCategory(id: string): Promise<Category>`
- `deactivateCategory(id: string): Promise<Category>`
- `deleteCategory(id: string): Promise<void>`

### 4.3 Navigation & Routing
- Thêm menu item vào `AdminLayout.tsx`:
  - Path: `/admin/categories`
  - Icon: `<FolderOpenOutlined />`
  - Label: `"Quản lý Danh mục"`
- Cấu hình route trong `AppRoutes.tsx`:
  - Route `/admin/categories` bọc trong `<RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}>`.

### 4.4 UI Components (`frontend/src/pages/Admin/Categories/`)

1. **`AdminCategoriesPage.tsx`**:
   - **Header & Metric Cards**: Thống kê Tổng số danh mục, Đang bật, Tạm ẩn, Tổng số Smartphone thuộc danh mục.
   - **Toolbar**: Ô tìm kiếm theo tên/slug, Select lọc trạng thái (Tất cả, Đang bật, Tạm ẩn), Nút Mở rộng/Thu gọn toàn bộ cây.
   - **Ant Design Tree Table**:
     - Cột Cây phân cấp: Tên danh mục (thụt lề tự động, ảnh thumbnail/icon tròn).
     - Cột Slug: Định dạng mã code / xám nhạt.
     - Cột Số lượng sản phẩm: Tag badge số lượng máy liên kết.
     - Cột Thứ tự (`sortOrder`).
     - Cột Trạng thái: Switch chuyển đổi Active/Inactive trực tiếp với Optimistic Update.
     - Cột Hành động: Nút "+ Con" (tạo nhanh con), "Sửa" (mở modal cập nhật), "Xóa" (xác nhận trước khi xóa, hiển thị lỗi nếu bị chặn).
2. **`CategoryFormModal.tsx`**:
   - Modal Form tạo mới và chỉnh sửa.
   - Trường Tên: Tự động tạo slug chuẩn SEO (slugify tiếng Việt).
   - Trường Danh mục cha: Antd `TreeSelect`, hiển thị toàn bộ cây danh mục, hỗ trợ chọn "Danh mục gốc (Không có cha)", tự động vô hiệu hóa node hiện tại và con cháu của nó khi đang ở chế độ chỉnh sửa.
   - Trường Ảnh đại diện: Tích hợp `ImageUploadDragger` thư mục `categories`.
   - Trường Mô tả & Thứ tự hiển thị.

### 4.5 State Coverage & Edge Cases

| Trạng thái | Hành vi hiển thị / Xử lý |
|---|---|
| **Loading** | Hiển thị Skeleton / Table spin loading trong khi tải dữ liệu cây. |
| **Empty** | Hiển thị component `Empty` với thông điệp: "Chưa có danh mục nào. Hãy tạo danh mục smartphone đầu tiên!" kèm nút CTA. |
| **Error** | Bắt lỗi từ API và hiển thị thông báo lỗi chi tiết qua Antd `message.error`. |
| **Xóa danh mục có sản phẩm** | Modal xác nhận -> Backend từ chối -> Frontend hiển thị lỗi thông báo người dùng cần di chuyển sản phẩm trước. |
| **Vòng lặp cha con** | Client TreeSelect disable các node không hợp lệ; Backend validate chặn đệ quy. |

---

## 5. Testing & Verification

1. **Backend Tests (`backend/src/modules/categories/categories.service.spec.ts`)**:
   - Unit test kiểm tra đếm sản phẩm `_count`.
   - Unit test kiểm tra logic chặn xóa khi còn sản phẩm hoặc con.
   - Unit test kiểm tra activate / deactivate.
   - Unit test kiểm tra ngăn chặn vòng lặp cha-con.
2. **Frontend Tests (`frontend/src/pages/Admin/Categories/__tests__/AdminCategoriesPage.spec.tsx`)**:
   - Test render bảng cây danh mục và các thẻ thống kê.
   - Test mở modal thêm danh mục và gọi service.
   - Test toggle chuyển đổi trạng thái Switch.
   - Test xử lý xóa danh mục thành công và khi gặp lỗi ràng buộc.
