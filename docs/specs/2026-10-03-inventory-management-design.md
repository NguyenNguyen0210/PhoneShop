# Design Specification: Hoàn thiện Quản lý Kho & IMEI (Inventory & IMEI Management)

**Ngày lập:** 2026-10-03  
**Trạng thái:** Đã được phê duyệt sơ bộ (Pending Final Review)  
**Phạm vi:** Backend (NestJS + Prisma) & Frontend (React + TypeScript + Ant Design)

---

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

### 1.1. Hiện trạng
1. **Xem tồn kho (Inventory View):** Backend có API `GET /inventory` cho phép Staff xem danh sách tồn của các biến thể sản phẩm, nhưng Frontend chưa có trang Quản lý Kho.
2. **Kiểm tra tồn (Stock Check):** Backend có API `GET /inventory/:variantId/check` kiểm tra số lượng khả dụng (`availableQty`) và số lượng giữ (`reservedQty`), chưa có giao diện trực quan.
3. **Điều chỉnh kho (Stock Adjustment):** Backend có sẵn `PUT /inventory/:variantId/adjust` hỗ trợ cộng/trừ số lượng (`+/-`), nhưng Frontend chưa có modal/form thao tác.
4. **Cảnh báo hàng sắp hết (Low-Stock Alert):** Backend có sẵn `GET /inventory/low-stock` (hỗ trợ lọc theo `reorderLevel` hoặc tham số `threshold`), nhưng Frontend chưa có widget/thẻ cảnh báo và bộ lọc nhanh.
5. **Quản lý máy theo IMEI (`/admin/imei`):** API lấy danh sách máy `GET /imei` và nhập lô `POST /imei/import` đang gán cứng `@Roles(Role.MANAGER, Role.ADMIN)`. Tài khoản vai trò `STAFF` truy cập sẽ bị lỗi `403 Forbidden`.

### 1.2. Mục tiêu giải pháp
* Xây dựng giao diện Quản trị Kho & IMEI hợp nhất tại `/admin/inventory` gồm 2 Tab:
  * **Tab 1: Tồn kho biến thể (Stock Management):** Xem danh sách tồn, trạng thái còn/sắp hết/hết hàng, thực hiện điều chỉnh số lượng (+/-), cập nhật định mức cảnh báo (`reorderLevel`).
  * **Tab 2: Quản lý mã máy IMEI (IMEI Tracking):** Tra cứu, lọc theo biến thể/trạng thái và nhập lô mã máy.
* Hiển thị widget/thẻ thống kê đầu trang (Stat Cards) với chỉ số cảnh báo hàng sắp hết và hỗ trợ lọc nhanh bằng 1 click.
* Cập nhật phân quyền Backend cho `GET /imei` và `POST /imei/import` để nhân viên `STAFF` có thể xem danh sách và nhập lô máy IMEI đúng nghiệp vụ kho mà không gặp lỗi 403 Forbidden.

---

## 2. Kiến trúc & Phân quyền Backend (Backend RBAC & Endpoints)

### 2.1. Cập nhật IMEI Controller (`backend/src/modules/imei/imei.controller.ts`)
* Cập nhật phân quyền cho endpoint xem danh sách:
  * Tuyến: `GET /imei`
  * Thay đổi: Mở rộng `@Roles(Role.MANAGER, Role.ADMIN)` ➔ `@Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)`.
* Cập nhật phân quyền cho endpoint nhập lô IMEI:
  * Tuyến: `POST /imei/import`
  * Thay đổi: Mở rộng `@Roles(Role.MANAGER, Role.ADMIN)` ➔ `@Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)`.
* Bảo lưu phân quyền nghiêm ngặt cho các thao tác quản lý đặc thù:
  * `PUT /imei/:id/sell`: Giữ nguyên `@Roles(Role.MANAGER, Role.ADMIN)`.
  * `PUT /imei/:id/block`: Giữ nguyên `@Roles(Role.MANAGER, Role.ADMIN)`.

### 2.2. Danh mục API Inventory sử dụng trên Frontend
* `GET /inventory`: Lấy danh sách tồn kho toàn bộ biến thể sản phẩm (Kèm thông tin Variant và Product).
* `GET /inventory/low-stock?threshold=`: Lấy danh sách biến thể có `availableQty <= reorderLevel` (hoặc `availableQty <= threshold`).
* `GET /inventory/:variantId/check`: Kiểm tra tồn kho khả dụng và số lượng tạm giữ.
* `PUT /inventory/:variantId/adjust`: Điều chỉnh tăng/giảm tồn kho (`quantity: number`, `note?: string`).
* `PUT /inventory/:variantId/reorder-level`: Thiết lập ngưỡng tồn tối thiểu cảnh báo (`reorderLevel: number`). Dành riêng cho `Role.MANAGER, Role.ADMIN`.

---

## 3. Thiết kế Dữ liệu & Tầng Dịch vụ Frontend (Frontend Data Layer)

### 3.1. Kiểu dữ liệu (`frontend/src/types/index.ts`)
```typescript
export interface InventoryRecord {
  id: string;
  variantId: string;
  quantity: number;      // Tồn vật lý trong kho
  availableQty: number;  // Khả dụng để bán (quantity - reservedQty)
  reservedQty: number;   // Đang giữ cho đơn hàng chờ xử lý
  reorderLevel: number;  // Ngưỡng báo động cần nhập thêm
  updatedAt?: string;
  variant: {
    id: string;
    sku: string;
    color: string;
    storage: string;
    price: number;
    compareAtPrice?: number;
    product: {
      id: string;
      name: string;
      thumbnail?: string;
    };
  };
}

export interface AdjustStockPayload {
  quantity: number; // Dương (+) khi nhập thêm hàng, Âm (-) khi xuất/hủy
  note?: string;
}

export interface SetReorderLevelPayload {
  reorderLevel: number;
}
```

### 3.2. Dịch vụ kho (`frontend/src/services/inventoryService.ts`)
Tạo mới file `inventoryService.ts` bao bọc các phương thức gọi API thông qua `apiClient`:
* `getInventoryList(): Promise<InventoryRecord[]>`
* `getLowStockAlerts(threshold?: number): Promise<InventoryRecord[]>`
* `checkStock(variantId: string): Promise<{ variantId: string; availableQty: number; reservedQty: number; inStock: boolean }>`
* `adjustStock(variantId: string, payload: AdjustStockPayload): Promise<InventoryRecord>`
* `setReorderLevel(variantId: string, payload: SetReorderLevelPayload): Promise<InventoryRecord>`

---

## 4. Thiết kế Giao diện Người dùng (UI/UX Specification)

### 4.1. Phong cách Thiết kế (Aesthetic Direction)
* **Phong cách:** *Enterprise Operational / Precision B2B Dashboard*, sử dụng đồng bộ hệ thống Ant Design (v5).
* **Màu sắc ngữ nghĩa (Semantic Colors):**
  * Màu chủ đạo: `#1677ff` (Primary Blue)
  * Còn hàng an toàn: `#52c41a` (Success Green)
  * Sắp hết hàng: `#faad14` (Warning Orange / Gold)
  * Hết hàng: `#f5222d` (Error Red)
  * Số lượng tạm giữ: `#722ed1` (Purple Tag)

### 4.2. Điều hướng & Routing
* Định tuyến:
  * `/admin/inventory`: Trang chính `AdminInventoryPage`.
  * `/admin/imei`: Tự động chuyển hướng hoặc mở trực tiếp tab IMEI trên `AdminInventoryPage` qua query param `?tab=imei`.
* `AdminSidebar.tsx`:
  * Cập nhật mục "Quản lý Kho & IMEI" trỏ tới `/admin/inventory`.

### 4.3. Cấu trúc Trang `AdminInventoryPage`

```
+----------------------------------------------------------------------------------------------------+
|  QUẢN LÝ KHO & IMEI                                                                                |
|  Theo dõi tồn kho biến thể, cảnh báo ngưỡng an toàn và quản lý mã máy IMEI                         |
+----------------------------------------------------------------------------------------------------+
|  [ Thẻ 1: Tổng SKU ]          |  [ Thẻ 2: Tồn khả dụng ]     |  [ Thẻ 3: Cảnh báo sắp hết (!) ]    |
|  24 biến thể                  |  156 thiết bị                |  3 biến thể dưới định mức           |
+----------------------------------------------------------------------------------------------------+
|  [ Tab 1: Tồn kho biến thể (Stock) ]              [ Tab 2: Quản lý thiết bị IMEI ]                 |
+----------------------------------------------------------------------------------------------------+
|  Tìm kiếm: [ Tên máy / SKU... ]   [x] Chỉ xem hàng sắp hết      [ Làm mới ]                         |
|----------------------------------------------------------------------------------------------------|
| Ảnh | Tên sản phẩm / SKU | Màu & Bộ nhớ | Tồn kho | Tạm giữ | Khả dụng | Định mức | Trạng thái | Thao tác |
|-----+--------------------+--------------+---------+---------+----------+----------+------------+----------|
| [img] iPhone 15 Pro Max  | Titan Tự nhiên|   12    |    2    |    10    |    5     | [Còn hàng] | [Điều chỉnh]
|     | SKU: IP15PM-256-NAT| 256GB        |         |         |          |          |            | [Sửa mức] |
|-----+--------------------+--------------+---------+---------+----------+----------+------------+----------|
| [img] Samsung S24 Ultra  | Titan Đen    |    3    |    1    |    2     |    5     | [Sắp hết]  | [Điều chỉnh]
|     | SKU: S24U-512-BLK  | 512GB        |         |         |          |          | (Alert!)   | [Sửa mức] |
+----------------------------------------------------------------------------------------------------+
```

#### Chi tiết Tab 1: Tồn kho biến thể (Stock Management)
* **Thống kê đầu trang:**
  * Bấm vào thẻ "Cảnh báo sắp hết" sẽ toggle bật/tắt bộ lọc `availableQty <= reorderLevel`.
* **Cột dữ liệu bảng tồn kho:**
  1. *Hình ảnh & Sản phẩm:* Thumbnail sản phẩm, Tên thương mại, SKU.
  2. *Phân loại:* Màu sắc (kèm chấm màu color badge), Dung lượng lưu trữ.
  3. *Tồn thực tế (`quantity`):* Số lượng vật lý trong kho.
  4. *Tạm giữ (`reservedQty`):* Số lượng đang giữ cho các đơn hàng chưa hoàn tất.
  5. *Khả dụng (`availableQty`):* Số lượng thực tế có thể bán (`quantity - reservedQty`).
  6. *Định mức an toàn (`reorderLevel`):* Ngưỡng báo động cần nhập thêm.
  7. *Trạng thái:*
     * `Còn hàng` (Xanh lá): `availableQty > reorderLevel`.
     * `Sắp hết hàng` (Cam): `0 < availableQty <= reorderLevel`.
     * `Hết hàng` (Đỏ): `availableQty === 0`.
  8. *Thao tác (Action Buttons):*
     * Nút **"Điều chỉnh tồn"**: Mở `StockAdjustmentModal`.
     * Nút **"Sửa định mức"**: Mở modal/popover sửa `reorderLevel` (Chỉ hiện cho MANAGER/ADMIN, kiểm tra qua `useAuthStore`).

#### Chi tiết Tab 2: Quản lý thiết bị IMEI (IMEI Tracking)
* Tích hợp toàn diện màn hình quản lý IMEI hiện có.
* Hỗ trợ tìm kiếm theo IMEI, lọc trạng thái (`IN_STOCK`, `RESERVED`, `SOLD`, `RETURNED`, `WARRANTY`, `BLOCKED`), lọc theo biến thể.
* Nút **"Nhập lô IMEI" (Import Modal)** hoạt động trơn tru cho tài khoản STAFF mà không bị chặn quyền 403.

### 4.4. Modal Điều chỉnh Kho (`StockAdjustmentModal`)
* **Thông tin biến thể hiển thị:**
  * Tên sản phẩm, màu sắc, cấu hình, SKU.
  * Tồn kho hiện tại: Vật lý = X, Tạm giữ = Y, Khả dụng = Z.
* **Hình thức điều chỉnh (Segmented / Radio Group):**
  * `[+] Nhập hàng vào kho` (Cộng số lượng).
  * `[-] Xuất kho / Giảm tồn` (Trừ số lượng do lỗi, hao hụt, chuyển kho).
* **Số lượng điều chỉnh (`InputNumber`):**
  * Tối thiểu: 1.
* **Dự báo tồn trực tiếp (Dynamic Live Preview):**
  * Khi nhập số lượng, modal hiển thị tính toán ngay lập tức:
    * `Tồn vật lý mới: 12 -> 17 (+5)`
    * `Khả dụng mới: 10 -> 15 (+5)`
  * Nếu chọn Giảm kho và số lượng giảm vượt quá tồn vật lý (`quantity - delta < 0`), form hiển thị cảnh báo đỏ và vô hiệu hóa nút "Xác nhận".
* **Ghi chú / Lý do điều chỉnh (`TextArea`):** Nhập lý do (ví dụ: "Nhập thêm đợt 2", "Kiểm kê định kỳ", "Hàng hoàn lỗi").

### 4.5. Modal Cài đặt Ngưỡng Báo động (`ReorderLevelModal`)
* Cho phép MANAGER/ADMIN nhập mức tồn an toàn tối thiểu mong muốn (`reorderLevel >= 0`).
* Lưu thông qua API `PUT /inventory/:variantId/reorder-level`.

---

## 5. Độ bao phủ Trạng thái (State Coverage Matrix)

| Trạng thái | Giao diện hiển thị | Hành vi tương tác |
|---|---|---|
| **Loading** | Ant Design `Spin` / Skeleton trên Stat Cards & Table | Vô hiệu hóa các nút thao tác đến khi nạp xong dữ liệu |
| **Empty (Không có dữ liệu)** | Ant Design `Empty` với thông báo "Chưa có dữ liệu tồn kho" | Cung cấp nút "Làm mới dữ liệu" |
| **Empty (Bộ lọc không khớp)** | Thông báo "Không tìm thấy biến thể hoặc sản phẩm sắp hết hàng nào" | Cung cấp nút "Xóa bộ lọc" |
| **Error (Lỗi kết nối / 403 / 500)** | Banner `Alert type="error"` đầu trang với thông báo lỗi chi tiết | Nút "Thử lại" tải lại API |
| **Success Feedback** | `message.success("Điều chỉnh tồn kho thành công")` | Đóng modal và tự động fetch lại danh sách tồn kho |

---

## 6. Kế hoạch Kiểm thử & Xác thực (Verification Plan)

### 6.1. Backend Unit Tests
* Bổ sung / cập nhật test trong `backend/test/unit/imei.spec.ts`:
  * Xác nhận nhân viên vai trò `STAFF` gọi `findAll` và `import` thành công mà không bị `ForbiddenException`.
  * Xác nhận vai trò `STAFF` gọi `sell` và `block` vẫn bị chặn `ForbiddenException` đúng quy định bảo mật.

### 6.2. Frontend Integration & Manual Tests
* Đăng nhập với tài khoản `STAFF`:
  * Truy cập `/admin/inventory` hiển thị đầy đủ thẻ Stat Cards và danh sách tồn.
  * Thử nghiệm lọc sản phẩm "Sắp hết hàng" thông qua thẻ Stat Card.
  * Mở `StockAdjustmentModal`, nhập +10 ➔ kiểm tra số lượng tồn trên bảng tăng đúng 10.
  * Thử giảm tồn kho vượt quá số lượng ➔ kiểm tra validation chặn xác nhận.
  * Chuyển sang Tab IMEI: Bảng IMEI tải dữ liệu bình thường (không lỗi 403). Mở modal nhập lô IMEI và bấm xác nhận ➔ API import thành công.
* Đăng nhập với tài khoản `MANAGER` hoặc `ADMIN`:
  * Thấy xuất hiện thêm nút "Sửa định mức" (`reorderLevel`) và lưu thành công.
