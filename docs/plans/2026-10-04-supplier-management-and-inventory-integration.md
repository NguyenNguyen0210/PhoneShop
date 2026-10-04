# Kế hoạch Thực hiện: Quản lý Nhà cung cấp (Suppliers) & Tích hợp Luồng Nhập kho / IMEI

> **For agentic workers:** REQUIRED SUB-SKILL: Use dispatching-parallel-agents or subagent-driven-development to implement tasks across parallel streams. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng đầy đủ module Nhà cung cấp ở Frontend gồm `supplierService.ts`, trang quản lý `/admin/suppliers` (Sidebar, Router, KPI, Table, Form modal), và tích hợp dropdown chọn Nhà cung cấp vào luồng nhập mã IMEI và điều chỉnh tăng tồn kho.

**Architecture:** 
- Phía Service & Trang Quản trị (Luồng 1): Xây dựng types, `supplierService.ts`, trang `AdminSuppliersPage.tsx` và modal `SupplierFormModal.tsx`, cấu hình menu `/admin/suppliers` trong `AdminSidebar.tsx`, `AdminLayout.tsx` và route trong `AppRoutes.tsx`.
- Phía Tích hợp Kho (Luồng 2): Tích hợp dropdown chọn nhà cung cấp vào `AdminImeiPage.tsx` (Modal nhập IMEI) và `StockAdjustmentModal.tsx` (Modal điều chỉnh tồn kho khi `mode === 'ADD'`).
- Tách bạch file hoàn toàn giữa 2 luồng để chạy song song thông qua subagents.

**Tech Stack:** React 19, TypeScript, Ant Design, Lucide React / @ant-design/icons, Vitest, Tailwind CSS.

---

## Danh mục tệp tin thay đổi (File Structure Map)

### Luồng 1: Supplier Service & Admin Suppliers Management Page
- Create: `frontend/src/types/supplier.ts` (Interface `Supplier`, `CreateSupplierDto`, `UpdateSupplierDto`)
- Create: `frontend/src/services/supplierService.ts` (API client cho các endpoint `/suppliers`)
- Create: `frontend/src/services/__tests__/supplierService.spec.ts` (Unit test cho 5 methods của supplierService)
- Create: `frontend/src/pages/Admin/Suppliers/components/SupplierFormModal.tsx` (Modal thêm mới & chỉnh sửa nhà cung cấp)
- Create: `frontend/src/pages/Admin/Suppliers/AdminSuppliersPage.tsx` (Trang quản lý: KPI stats, search/filter toolbar, bảng danh sách, sửa, xóa)
- Create: `frontend/src/pages/Admin/Suppliers/__tests__/AdminSuppliersPage.spec.tsx` (Unit test cho trang AdminSuppliersPage)
- Modify: `frontend/src/routes/AppRoutes.tsx` (Bổ sung route `/admin/suppliers`)
- Modify: `frontend/src/components/admin/AdminSidebar.tsx` & `frontend/src/layouts/AdminLayout.tsx` (Thêm menu Nhà cung cấp)

### Luồng 2: Inventory & IMEI Supplier Integration
- Modify: `frontend/src/pages/Admin/InventoryImei/AdminImeiPage.tsx` (Thêm dropdown chọn nhà cung cấp trong modal nhập IMEI)
- Modify: `frontend/src/pages/Admin/Inventory/components/StockAdjustmentModal.tsx` (Thêm dropdown chọn nhà cung cấp khi `mode === 'ADD'`)
- Modify: `frontend/src/pages/Admin/Inventory/components/__tests__/StockAdjustmentModal.spec.tsx` (Thêm test case kiểm tra hiển thị dropdown và gửi thông tin nhà cung cấp)
- Create: `frontend/src/pages/Admin/InventoryImei/__tests__/AdminImeiSupplierImport.spec.tsx` (Test case kiểm tra dropdown NCC trong modal nhập IMEI)

---

## Luồng 1: Stream 1 - Supplier Service & Admin Suppliers Management

### Task 1.1: Tạo Types & SupplierService
**Files:**
- Create: `frontend/src/types/supplier.ts`
- Create: `frontend/src/services/supplierService.ts`
- Test: `frontend/src/services/__tests__/supplierService.spec.ts`

- [ ] **Step 1: Viết test cho `supplierService`**
Tạo test `frontend/src/services/__tests__/supplierService.spec.ts`:
1. `getSuppliers` gọi `GET /suppliers` với query `{ activeOnly: true }` khi truyền tham số.
2. `getSupplierById` gọi `GET /suppliers/:id`.
3. `createSupplier` gọi `POST /suppliers` với payload.
4. `updateSupplier` gọi `PATCH /suppliers/:id` với payload.
5. `deleteSupplier` gọi `DELETE /suppliers/:id`.

- [ ] **Step 2: Triển khai `types/supplier.ts` và `services/supplierService.ts`**
1. Định nghĩa `Supplier`, `CreateSupplierDto`, `UpdateSupplierDto`.
2. Triển khai `supplierService` với `apiClient`.

- [ ] **Step 3: Chạy test xác nhận PASS**
Run: `cd frontend; npx vitest run src/services/__tests__/supplierService.spec.ts`

### Task 1.2: Tạo Giao diện `AdminSuppliersPage` và Cấu hình Navigation
**Files:**
- Create: `frontend/src/pages/Admin/Suppliers/components/SupplierFormModal.tsx`
- Create: `frontend/src/pages/Admin/Suppliers/AdminSuppliersPage.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`
- Modify: `frontend/src/layouts/AdminLayout.tsx`
- Test: `frontend/src/pages/Admin/Suppliers/__tests__/AdminSuppliersPage.spec.tsx`

- [ ] **Step 1: Tạo `SupplierFormModal.tsx`**
Modal Ant Design hỗ trợ tạo mới và chỉnh sửa nhà cung cấp: Tên, Người liên hệ, SĐT, Email, MST, Địa chỉ, Switch trạng thái hoạt động.

- [ ] **Step 2: Tạo `AdminSuppliersPage.tsx`**
1. KPI Cards: Tổng số NCC, Đang hoạt động, Ngừng hoạt động.
2. Toolbar: Search keyword (tìm theo tên, người liên hệ, email, SĐT, MST), filter trạng thái, nút `+ Thêm nhà cung cấp mới`.
3. Table: Cột tên NCC (kèm tag MST), người liên hệ, SĐT/email, địa chỉ, trạng thái (tag xanh/xám), actions (Sửa, Xóa kèm Popconfirm).

- [ ] **Step 3: Thêm Route & Menu Item**
1. Trong `AdminSidebar.tsx`: Thêm menu key `/admin/suppliers`, label `"Nhà cung cấp"`, icon `<ShopOutlined />`.
2. Trong `AdminLayout.tsx`: Thêm menu key `/admin/suppliers` và cập nhật tiêu đề breadcrumb header.
3. Trong `AppRoutes.tsx`: Thêm `<Route path="/admin/suppliers" element={<AdminSuppliersPage />} />`.

- [ ] **Step 4: Viết và chạy test cho `AdminSuppliersPage`**
Run: `cd frontend; npx vitest run src/pages/Admin/Suppliers/__tests__/AdminSuppliersPage.spec.tsx`

---

## Luồng 2: Stream 2 - Tích hợp Dropdown Nhà cung cấp vào Kho & IMEI

### Task 2.1: Tích hợp vào Luồng Nhập kho & IMEI
**Files:**
- Modify: `frontend/src/pages/Admin/Inventory/components/StockAdjustmentModal.tsx`
- Modify: `frontend/src/pages/Admin/InventoryImei/AdminImeiPage.tsx`
- Test: `frontend/src/pages/Admin/Inventory/components/__tests__/StockAdjustmentModal.spec.tsx`
- Test: `frontend/src/pages/Admin/InventoryImei/__tests__/AdminImeiSupplierImport.spec.tsx`

- [ ] **Step 1: Cập nhật `StockAdjustmentModal.tsx`**
1. Load danh sách nhà cung cấp (`supplierService.getSuppliers(true)`).
2. Khi `mode === 'ADD'`, hiển thị thêm trường `Select` chọn Nhà cung cấp.
3. Khi submit, bổ sung `referenceType: 'SUPPLIER'`, `referenceId: supplierId` và gắn tiền tố `[NCC: Tên NCC]` vào `note`.

- [ ] **Step 2: Cập nhật `AdminImeiPage.tsx`**
1. Load danh sách nhà cung cấp trong `AdminImeiPage`.
2. Trong Modal Nhập danh sách IMEI (`isImportModalOpen`), bổ sung trường `Select` chọn Nhà cung cấp.
3. Hỗ trợ tìm kiếm nhanh (`showSearch`, `optionFilterProp="label"`).

- [ ] **Step 3: Viết và chạy test xác nhận**
Run: `cd frontend; npx vitest run src/pages/Admin/Inventory/components/__tests__/StockAdjustmentModal.spec.tsx src/pages/Admin/InventoryImei/__tests__/AdminImeiSupplierImport.spec.tsx`

---

## Giai đoạn Hoàn tất & Merge: Kiểm tra tích hợp và Merge vào `Nguyen`

### Task 3.1: Kiểm tra toàn diện & Merge
- [ ] **Step 1: Chạy kiểm tra TypeScript `tsc -b`**
Run: `cd frontend; npx tsc -b`

- [ ] **Step 2: Chạy kiểm tra toàn bộ test suites mới**
Run: `cd frontend; npx vitest run src/services/__tests__/supplierService.spec.ts src/pages/Admin/Suppliers/__tests__/AdminSuppliersPage.spec.tsx src/pages/Admin/Inventory/components/__tests__/StockAdjustmentModal.spec.tsx src/pages/Admin/InventoryImei/__tests__/AdminImeiSupplierImport.spec.tsx`

- [ ] **Step 3: Build frontend production**
Run: `cd frontend; npm run build`

- [ ] **Step 4: Commit và Merge vào branch `Nguyen`**
Commit các thay đổi và merge an toàn vào branch `Nguyen`.
