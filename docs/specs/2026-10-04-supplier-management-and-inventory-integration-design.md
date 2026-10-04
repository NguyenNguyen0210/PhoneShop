# Đặc tả Thiết kế: Quản lý Nhà cung cấp (Suppliers) & Tích hợp Luồng Nhập kho / IMEI

**Ngày tạo:** 2026-10-04  
**Trạng thái:** Đã duyệt (Approved)  
**Mục tiêu:** Xây dựng đầy đủ tầng Frontend cho module Nhà cung cấp gồm `supplierService.ts`, trang quản trị `/admin/suppliers` (danh sách, thống kê KPI, thêm/sửa/xóa NCC, tích hợp vào Sidebar & Router), đồng thời tích hợp Dropdown chọn Nhà cung cấp vào luồng nhập mã IMEI và điều chỉnh tồn kho.

---

## 1. Bối cảnh & Hiện trạng
- **Backend:** Đã có sẵn bảng `Supplier` trong database PostgreSQL (Prisma) và module `SuppliersModule` (`backend/src/modules/suppliers`) hỗ trợ đầy đủ các REST API:
  - `GET /suppliers?activeOnly=true`
  - `GET /suppliers/:id`
  - `POST /suppliers`
  - `PATCH /suppliers/:id`
  - `DELETE /suppliers/:id`
- **Frontend:**
  - Hoàn toàn chưa có `supplierService.ts`.
  - Chưa có trang `/admin/suppliers` hay mục menu trên `AdminSidebar.tsx` / `AdminLayout.tsx`.
  - Các modal nhập hàng (`AdminImeiPage.tsx` - Nhập mã IMEI và `StockAdjustmentModal.tsx` - Nhập thêm tồn kho) chưa có trường chọn Nhà cung cấp để lưu vết nguồn gốc thiết bị.

---

## 2. Kiến trúc & Thiết kế Chi tiết

### 2.1. Kiểu dữ liệu & API Service (`types/supplier.ts` & `services/supplierService.ts`)
- **`types/supplier.ts`:**
  - `Supplier`: `id`, `name`, `contactName`, `email`, `phone`, `address`, `taxCode`, `isActive`, `createdAt`, `updatedAt`.
  - `CreateSupplierDto`: `name`, `contactName`, `email`, `phone`, `address`, `taxCode`.
  - `UpdateSupplierDto`: Các trường tùy chọn + `isActive`.
- **`services/supplierService.ts`:**
  - `getSuppliers(activeOnly?: boolean): Promise<Supplier[]>` -> `GET /suppliers`
  - `getSupplierById(id: string): Promise<Supplier>` -> `GET /suppliers/:id`
  - `createSupplier(dto: CreateSupplierDto): Promise<Supplier>` -> `POST /suppliers`
  - `updateSupplier(id: string, dto: UpdateSupplierDto): Promise<Supplier>` -> `PATCH /suppliers/:id`
  - `deleteSupplier(id: string): Promise<void>` -> `DELETE /suppliers/:id`

### 2.2. Trang Quản lý Nhà cung cấp (`pages/Admin/Suppliers/AdminSuppliersPage.tsx`)
- **Route:** `/admin/suppliers`, có bảo vệ bởi `AdminRoute`.
- **Thanh Menu:** Bổ sung mục *"Nhà cung cấp"* (`TruckOutlined` / `ShopOutlined`) vào `AdminSidebar.tsx` và `AdminLayout.tsx`.
- **Giao diện:**
  - **KPI Cards:** 3 thẻ chỉ số: Tổng số đối tác, Đang hợp tác (`isActive: true`), Tạm dừng (`isActive: false`).
  - **Thanh công cụ:** Ô tìm kiếm (theo tên công ty, người liên hệ, SĐT, email, MST), bộ lọc trạng thái, nút `+ Thêm nhà cung cấp mới`.
  - **Bảng dữ liệu (Table):** Hiển thị đầy đủ thông tin Tên NCC (kèm tag MST), Người liên hệ, SĐT/Email, Địa chỉ, Trạng thái (Tag xanh/xám), Cột thao tác (Sửa, Xóa có Popconfirm).
  - **Modal Thêm / Sửa (`SupplierFormModal.tsx`):** Form Ant Design với đầy đủ validate: Tên (bắt buộc), Email, SĐT, MST, Địa chỉ, Switch trạng thái hoạt động.

### 2.3. Tích hợp Dropdown vào Luồng Nhập kho
1. **Modal Nhập mã IMEI (`AdminImeiPage.tsx`):**
   - Thêm trường `Form.Item name="supplierId"` với nhãn *"Nhà cung cấp"*.
   - Dropdown lấy danh sách NCC đang hoạt động (`supplierService.getSuppliers(true)`).
   - Cho phép tìm kiếm nhanh tên NCC, hỗ trợ chọn NCC hoặc để trống.
2. **Modal Điều chỉnh Tồn kho (`StockAdjustmentModal.tsx`):**
   - Khi chọn chế độ nhập hàng (`mode === 'ADD'`), hiển thị thêm dropdown chọn *"Nhà cung cấp"*.
   - Khi submit: Gắn thông tin NCC vào `note: "[NCC: ${supplierName}] " + note` và `referenceType: 'SUPPLIER'`, `referenceId: supplierId`.

---

## 3. Quản lý Trạng thái & Xử lý Ngoại lệ
- **Loading:** Hiển thị Skeleton hoặc Spinner khi đang tải dữ liệu.
- **Empty:** Khi chưa có NCC nào, hiển thị minh họa trống kèm nút *"Thêm nhà cung cấp đầu tiên"*.
- **Error:** Bắt lỗi từ backend (như MST trùng lặp, lỗi kết nối) và thông báo qua `message.error`.

---

## 4. Kế hoạch Kiểm thử (Verification Plan)
1. Unit test `supplierService.spec.ts` kiểm tra 5 method API.
2. Unit test `AdminSuppliersPage.spec.tsx` kiểm tra render KPI, render table, mở modal tạo mới, submit sửa, xóa NCC.
3. Unit test `StockAdjustmentModal.spec.tsx` kiểm tra dropdown NCC xuất hiện khi `mode === 'ADD'` và gửi đúng thông tin khi submit.
4. Type check `npx tsc -b` và `npm run build` thành công.
