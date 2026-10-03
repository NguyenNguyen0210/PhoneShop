# Design Specification: Brand Management (Quản lý Thương hiệu Smartphone)

**Date:** 2026-10-04  
**Status:** Approved  
**Author:** AI Agent & Development Team  
**Scope:** Smartphone E-Commerce Platform (MobileCommerce)

---

## 1. Overview & Business Objectives

Trong hệ thống MobileCommerce chuyên biệt về kinh doanh Điện thoại thông minh (Apple, Samsung, Xiaomi, OPPO, vivo, ASUS, ...), Thương hiệu (Brand) là một trong những thực thể danh mục cốt lõi nhất ảnh hưởng trực tiếp đến lọc sản phẩm, tìm kiếm, nhận diện thương hiệu và phân tích kinh doanh.

Hiện tại:
- **Backend**: Đã có `BrandsController` và `BrandsService` hỗ trợ các thao tác CRUD cơ bản (`POST /brands`, `GET /brands/admin/all`, `PATCH /brands/:id`, `DELETE /brands/:id`, `PUT /brands/:id/activate`, `PUT /brands/:id/deactivate`).
- **Frontend**: Chưa có giao diện trang Quản trị Thương hiệu `/admin/brands` riêng biệt, chưa có `brandService.ts` đồng bộ, và chưa có liên kết menu trên thanh Sidebar của Admin Portal.

### Core Goals:
1. **Quản trị toàn diện (CRUD Brand Management)**: Cung cấp giao diện trực quan cho Quản trị viên (ADMIN) và Quản lý (MANAGER) để quản lý danh sách thương hiệu, thêm mới, chỉnh sửa thông tin, tải lên logo chính hãng, cập nhật website chính thức, và bật/tắt kích hoạt.
2. **Toàn vẹn dữ liệu & Ràng buộc an toàn**: Đếm chính xác số lượng sản phẩm đang gắn với từng thương hiệu qua `_count.products`; chặn hành động xóa nếu thương hiệu đang có sản phẩm kinh doanh liên kết, tránh lỗi xung đột khóa ngoại cơ sở dữ liệu (`onDelete: Restrict`).
3. **Trải nghiệm nhất quán (Unified Admin UX)**: Tuân thủ 100% phong cách thiết kế Ant Design 5 Clean Light Mode của Admin Portal (`AdminCategoriesPage`, `AdminProductsPage`), đầy đủ thẻ thống kê chỉ số (KPIs), thanh tìm kiếm & lọc, xử lý đầy đủ các trạng thái Loading, Empty, Error.

---

## 2. Architecture & Data Flow

```
[ Frontend: React 19 + Vite + Ant Design 5 + Tailwind ]
        │
        ├── brandService.ts (Axios REST Client với apiClient)
        │       ├── getAllAdmin(search?: string)
        │       ├── create(dto: CreateBrandInput)
        │       ├── update(id: string, dto: UpdateBrandInput)
        │       ├── delete(id: string)
        │       ├── activate(id: string)
        │       └── deactivate(id: string)
        │
[ Backend: NestJS Brands Module ]
        │
        ├── BrandsController (Guards: JwtAuthGuard, RolesGuard; Roles: MANAGER, ADMIN)
        │       ├── GET    /brands/admin/all?search=
        │       ├── GET    /brands/:id
        │       ├── POST   /brands
        │       ├── PATCH  /brands/:id
        │       ├── PUT    /brands/:id/activate
        │       ├── PUT    /brands/:id/deactivate
        │       └── DELETE /brands/:id
        │
        ├── BrandsService (Prisma Client, Slug Conflict Checks, Product Association Checks)
        │
[ Cloudflare R2 Storage Service ]
        │
        └── POST /storage/upload/brands (ImageUploadDragger tải ảnh logo WebP)
        │
[ Database: PostgreSQL (Prisma ORM) ]
        │
        └── brands Table (id, name, slug, description, logoUrl, websiteUrl, isActive, createdAt, updatedAt)
```

---

## 3. Backend Enhancements (`backend/src/modules/brands/`)

### 3.1 Cải tiến `BrandsService.findAll`
* **File:** `backend/src/modules/brands/brands.service.ts`
* Bổ sung `include: { _count: { select: { products: true } } }` khi truy vấn danh sách để frontend nhận được số lượng sản phẩm liên kết mà không gây tốn tài nguyên.

```typescript
async findAll(search?: string, activeOnly: boolean = false) {
  const where: any = {};
  if (activeOnly) {
    where.isActive = true;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  return this.prisma.brand.findMany({
    where,
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}
```

### 3.2 Quy tắc an toàn khi Xóa Thương hiệu (`remove`)
* **File:** `backend/src/modules/brands/brands.service.ts`
* Kiểm tra số lượng sản phẩm trước khi xóa:
  ```typescript
  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    if (brand._count && brand._count.products > 0) {
      throw new BadRequestException(
        `Không thể xóa thương hiệu "${brand.name}" vì đang có ${brand._count.products} sản phẩm liên kết. Vui lòng chuyển hoặc xóa sản phẩm trước.`,
      );
    }
    return this.prisma.brand.delete({
      where: { id },
    });
  }
  ```

---

## 4. Frontend Specification (`frontend/src/`)

### 4.1 Kiểu dữ liệu (`frontend/src/types/index.ts`)
Cập nhật và mở rộng định nghĩa `Brand`:

```typescript
export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    products: number;
  };
}

export interface CreateBrandInput {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  isActive?: boolean;
}

export type UpdateBrandInput = Partial<CreateBrandInput>;
```

### 4.2 API Service (`frontend/src/services/brandService.ts`)
Xây dựng module service tương tác qua `apiClient`:
- `getAllAdmin(search?: string): Promise<Brand[]>`: Gọi `GET /brands/admin/all?search=...`
- `getById(id: string): Promise<Brand>`: Gọi `GET /brands/:id`
- `create(data: CreateBrandInput): Promise<Brand>`: Gọi `POST /brands`
- `update(id: string, data: UpdateBrandInput): Promise<Brand>`: Gọi `PATCH /brands/:id`
- `delete(id: string): Promise<void>`: Gọi `DELETE /brands/:id`
- `activate(id: string): Promise<Brand>`: Gọi `PUT /brands/:id/activate`
- `deactivate(id: string): Promise<Brand>`: Gọi `PUT /brands/:id/deactivate`

### 4.3 Cấu trúc Thư mục Giao diện
```
frontend/src/pages/Admin/Brands/
├── AdminBrandsPage.tsx               # Trang chính quản lý thương hiệu
├── components/
│   ├── BrandStatsCards.tsx           # 4 thẻ KPI thống kê tổng quan
│   └── BrandFormModal.tsx            # Modal tạo mới và chỉnh sửa thương hiệu
└── __tests__/
    └── AdminBrandsPage.spec.tsx      # Unit & Component testing
```

### 4.4 Chi tiết các Component

#### A. `BrandStatsCards.tsx`
Hiển thị 4 thẻ chỉ số KPI:
1. **Tổng số thương hiệu**: Tổng số bản ghi (Icon `TagsOutlined`, màu Blue `#2563eb`).
2. **Đang hoạt động**: Số thương hiệu có `isActive === true` (Icon `CheckCircleOutlined`, màu Emerald `#10b981`).
3. **Ngừng kinh doanh**: Số thương hiệu có `isActive === false` (Icon `StopOutlined`, màu Slate `#64748b` hoặc Amber `#f59e0b`).
4. **Tổng số sản phẩm**: Tổng số sản phẩm từ tất cả các thương hiệu `sum(_count.products)` (Icon `ShoppingOutlined`, màu Indigo `#6366f1`).

#### B. `BrandFormModal.tsx`
- Hỗ trợ cả 2 chế độ: Tạo mới (`editingBrand === null`) và Chỉnh sửa (`editingBrand !== null`).
- **Tự động tạo Slug**: Khi gõ Tên thương hiệu ở chế độ tạo mới, tự động sinh slug tiếng Việt không dấu chuẩn SEO qua hàm `slugify`.
- **Upload Logo**: Sử dụng `ImageUploadDragger` với cấu hình `folder="brands"`, xem trước ảnh trực tiếp và cho phép xóa logo.
- **Form validation**:
  - `name`: Bắt buộc, độ dài 2-100 ký tự.
  - `slug`: Bắt buộc, chỉ chứa chữ thường, số và dấu gạch nối.
  - `websiteUrl`: Tùy chọn, kiểm tra hợp lệ URL (`type: 'url'`).
  - `description`: Tùy chọn, TextArea giới hạn độ dài.
  - `isActive`: Switch Bật/Tắt (mặc định Bật khi tạo mới).

#### C. `AdminBrandsPage.tsx`
- **Bộ lọc & Tìm kiếm**:
  - Ô tìm kiếm từ khóa với Debounce (hỗ trợ tìm theo tên hoặc mô tả).
  - Bộ lọc trạng thái: `Tất cả` | `Đang hoạt động` | `Đã ẩn/Ngừng`.
  - Nút *"Làm mới"* (`ReloadOutlined`) tải lại dữ liệu.
  - Nút *"Thêm Thương hiệu"* (`PlusOutlined`, `type="primary"`).
- **Cấu hình Bảng Ant Design (`ColumnsType<Brand>`)**:
  1. **Logo**: `Avatar` vuông kích thước 44x44, hiển thị ảnh từ `logoUrl`, nếu chưa có hiển thị icon fallback với 2 chữ cái đầu của tên thương hiệu.
  2. **Tên thương hiệu**: Tên in đậm nổi bật (`font-semibold text-slate-800`), bên dưới là mã slug màu ghi mờ (`text-xs text-slate-400 font-mono`).
  3. **Website**: Link ngoài với `Typography.Link` mở tab mới kèm icon `ExportOutlined`, hoặc hiển thị `—` nếu chưa có.
  4. **Số lượng SP**: Badge / Tag màu xanh `blue` hiển thị `_count?.products ?? 0` sản phẩm.
  5. **Trạng thái**: Component `Switch` kích hoạt nhanh (`checked={record.isActive}`). Khi người dùng gạt switch, gọi trực tiếp API `activate`/`deactivate` với loading spinner tại dòng đó.
  6. **Thao tác**:
     - Nút Sửa (`EditOutlined`): Mở `BrandFormModal` nạp dữ liệu bản ghi.
     - Nút Xóa (`DeleteOutlined`, danger): Bọc trong `Popconfirm`. Nếu thương hiệu có `_count.products > 0`, nút Xóa sẽ ở trạng thái `disabled` kèm `Tooltip` thông báo: *"Không thể xóa thương hiệu đang có sản phẩm liên kết"*.

### 4.5 Điều hướng & Phân quyền

#### A. Cập nhật `AdminLayout.tsx`
1. Bổ sung mục menu trong `menuItems`:
   ```typescript
   {
     key: '/admin/brands',
     icon: <TagsOutlined style={{ fontSize: 16 }} />,
     label: 'Quản lý Thương hiệu',
   },
   ```
   (Đặt ngay sau `/admin/categories`).
2. Bổ sung nhãn Breadcrumb:
   ```typescript
   if (location.pathname === '/admin/brands') return 'Quản lý Thương hiệu Smartphone';
   ```

#### B. Cập nhật `AppRoutes.tsx`
Thêm Route bảo vệ bằng `RoleGuard`:
```typescript
<Route
  path="/admin/brands"
  element={
    <RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}>
      <AdminBrandsPage />
    </RoleGuard>
  }
/>
```

---

## 5. UI/UX & State Coverage Matrix

| Trạng thái màn hình | Hành vi giao diện |
|---|---|
| **Loading (Lần đầu)** | Thẻ KPI hiển thị Skeleton loader; Bảng Ant Design hiển thị biểu tượng loading với độ mờ mượt mà. |
| **Empty Data (Chưa có dữ liệu)** | Hiển thị Ant Design `Empty` với mô tả *"Chưa có thương hiệu nào trong hệ thống"*, kèm nút kích hoạt mở Modal Thêm mới. |
| **Search Not Found (Không tìm thấy)** | Hiển thị bảng trống kèm thông báo *"Không tìm thấy thương hiệu phù hợp với từ khóa"*, kèm nút *"Xóa bộ lọc"*. |
| **Slow Network (Mạng chậm)** | Vô hiệu hóa nút Submit trong Modal, hiển thị trạng thái `loading` trên button lưu để tránh gửi trùng lặp yêu cầu; Switch trạng thái hiển thị loading spinner. |
| **Error Handling (Gặp lỗi mạng/API)** | Bắt lỗi từ response và hiển thị `message.error(err.response?.data?.message || 'Có lỗi xảy ra')`; dữ liệu cũ trên bảng vẫn được giữ nguyên. |

---

## 6. Testing Strategy

1. **Service Tests (`frontend/src/services/__tests__/brandService.spec.ts`)**:
   - Kiểm tra các hàm `getAllAdmin`, `create`, `update`, `delete`, `activate`, `deactivate` gọi đúng URL endpoint và đúng phương thức HTTP (GET, POST, PATCH, DELETE, PUT).
2. **Page & Component Tests (`frontend/src/pages/Admin/Brands/__tests__/AdminBrandsPage.spec.tsx`)**:
   - Kiểm tra render danh sách thương hiệu đầy đủ các cột Logo, Tên, Slug, Website, Số SP, Trạng thái.
   - Kiểm tra bộ lọc tìm kiếm theo tên và lọc theo trạng thái hoạt động.
   - Kiểm tra mở modal Tạo mới, điền form, tự động sinh slug và submit thành công.
   - Kiểm tra gạt switch đổi trạng thái trực tiếp.
   - Kiểm tra vô hiệu hóa nút xóa khi thương hiệu có `_count.products > 0`.
3. **Backend Tests / Validation**:
   - Kiểm tra service backend `findAll` trả về đúng trường `_count.products`.
   - Kiểm tra `remove` ném `BadRequestException` khi thương hiệu còn sản phẩm.
