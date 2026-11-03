# PhoneShop Category Management, Warranty Lifecycle & Cart Pre-validation Design Specification

**Tài liệu:** Đặc tả thiết kế Quản lý Danh mục Admin, Khép kín Quy trình Bảo hành & Tiền kiểm Giỏ hàng  
**Hệ thống:** PhoneShop E-Commerce System (NestJS 11 + Prisma 7 + PostgreSQL + React 19)  
**Ngày lập:** 03/11/2026  
**Trạng thái:** Đã phê duyệt (Approved)  

---

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

Sau khi hoàn thành và nghiệm thu đợt sửa lỗi cốt lõi (Core Data Integrity: Carrier Return, failPayment, Return/Refund Lifecycle, RBAC), báo cáo kiểm toán API hai chiều cho thấy hệ thống đang có hiện tượng "Backend-heavy" ở hai phân hệ:
1. **Phân hệ Danh mục (Categories):** Backend đã có đầy đủ cây phân cấp, sắp xếp thứ tự và CRUD, nhưng Frontend đang redirect route `/admin/categories` sang `/admin/products`. Cần xây dựng trang quản trị danh mục hoàn chỉnh (`AdminCategoriesPage`).
2. **Phân hệ Bảo hành (Warranty):** Backend đã có API khách gửi yêu cầu bảo hành (`claim`) và các API quản trị bảo hành của Admin, nhưng Storefront chỉ mới có tra cứu thông tin tĩnh và Admin chưa có trang quản lý bảo hành. Cần khép kín vòng đời bảo hành hai chiều kèm kiểm soát quyền sở hữu thiết bị nghiêm ngặt.
3. **Tiền kiểm Giỏ hàng (Cart Pre-validation):** Tận dụng endpoint `GET /api/cart/validate` sẵn có để kiểm tra tính hợp lệ của giỏ hàng trước khi chuyển sang bước thanh toán, mang lại trải nghiệm minh bạch và tránh lỗi checkout giữa chừng.

---

## 2. Thiết kế Chi tiết Phân hệ Quản lý Danh mục (Admin Category Management)

### 2.1. Service Layer (`frontend/src/services/categoryService.ts`)
Tạo mới file service bọc trọn bộ các API từ `CategoriesController`:
- `getCategoryTree()`: Gọi `GET /categories/admin/tree` (hoặc `/categories/tree`) lấy cấu trúc cây lồng nhau (`id`, `name`, `slug`, `parentId`, `children`, `isActive`, `order`, `productCount`).
- `getCategories(params)`: Gọi `GET /categories/admin/all` lấy danh sách phẳng có phân trang và tìm kiếm.
- `createCategory(dto)`: Gọi `POST /categories` tạo mới danh mục (hỗ trợ `parentId`, `name`, `slug`, `icon`, `description`, `order`).
- `updateCategory(id, dto)`: Gọi `PATCH /categories/:id` cập nhật thông tin danh mục.
- `toggleCategoryStatus(id, activate)`: Gọi `PUT /categories/:id/activate` hoặc `/categories/:id/deactivate`.
- `deleteCategory(id)`: Gọi `DELETE /categories/:id` xóa danh mục (Backend đã có kiểm tra ràng buộc không cho xóa nếu danh mục đang chứa sản phẩm).
- `reorderCategories(orders)`: Gọi `PUT /categories/admin/reorder` cập nhật thứ tự hiển thị.

### 2.2. Giao diện `AdminCategoriesPage.tsx`
- **Bố cục Master-Detail (Split View):**
  - **Cột trái (35%):**
    - Hiển thị `Ant Design Tree` với icon thư mục, hiển thị số lượng sản phẩm liên kết của từng nhánh.
    - Thanh tìm kiếm nhanh node cây theo tên danh mục.
    - Khi click chọn một node, node đó trở thành ngữ cảnh hoạt động hiện tại (Active Category).
  - **Cột phải (65%):**
    - Thanh Breadcrumb thể hiện rõ cấp bậc cha-con của danh mục đang chọn.
    - Bảng danh sách danh mục con trực thuộc node đang chọn (hoặc danh mục gốc nếu chọn Root):
      - Cột: Tên danh mục, Slug, Trạng thái (Tag Xanh: Kích hoạt / Tag Xám: Đang ẩn), Thứ tự hiển thị (`order`), Số lượng sản phẩm.
      - Thao tác: Nút Chỉnh sửa (mở Modal), Nút Bật/Tắt nhanh trạng thái, Nút Xóa (kèm xác nhận an toàn `Popconfirm`).
    - Nút bấm chính: **"Thêm danh mục mới"** (cho phép tạo danh mục gốc hoặc danh mục con của node đang chọn).
- **Modal Tạo / Sửa danh mục (`CategoryFormModal.tsx`):**
  - Các trường: Tên danh mục (bắt buộc, tự động sinh slug tiếng Việt), Danh mục cha (`TreeSelect` trực quan), Hình đại diện/Icon (upload qua `storageService`), Thứ tự hiển thị (`InputNumber`), Mô tả.

### 2.3. Cập nhật Tuyến đường & Menu
- Cập nhật `frontend/src/routes/AppRoutes.tsx`: Gỡ bỏ lệnh redirect, gắn `AdminCategoriesPage` vào `/admin/categories` bọc trong `RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}`.

---

## 3. Thiết kế Chi tiết Phân hệ Bảo hành Khép kín (Warranty Lifecycle)

### 3.1. Luồng Gửi yêu cầu Bảo hành Khách hàng (Customer Warranty Claim)
- **Tạo Modal `ClaimWarrantyModal.tsx`:**
  - Hiển thị thông tin máy đang yêu cầu bảo hành: Tên sản phẩm, Biến thể, Số IMEI, Thời hạn bảo hành còn lại.
  - Form thu thập:
    - *Mô tả lỗi / Lý do bảo hành (Bắt buộc):* Khách nhập chi tiết sự cố gặp phải (ví dụ: máy không lên nguồn, sọc màn hình, lỗi camera, v.v.).
    - *Số điện thoại liên hệ:* Mặc định lấy từ thông tin profile của khách.
    - *Địa chỉ nhận máy:* Khách chọn hoặc nhập địa chỉ để cửa hàng tiếp nhận.
  - Khi submit: Gửi dữ liệu tới `POST /api/warranty/:id/claim`.
  - Thành công: Hiển thị thông báo gửi yêu cầu thành công, cập nhật trạng thái phiếu sang `CLAIMED`.
- **Kiểm soát Quyền sở hữu (Ownership Gate):**
  - **Tại Profile (`frontend/src/pages/storefront/Profile/components/WarrantiesTab.tsx`):**
    - Hiển thị nút "Gửi yêu cầu bảo hành" cho các máy có `status === 'ACTIVE'` và chưa hết hạn.
  - **Tại Trang Tra cứu Bảo hành (`frontend/src/pages/storefront/WarrantyLookup/WarrantyLookupPage.tsx`):**
    - Nếu khách tra cứu máy khi chưa đăng nhập: Hiển thị thông tin máy kèm nút "Đăng nhập để gửi yêu cầu bảo hành".
    - Nếu khách đã đăng nhập: Đối chiếu `warranty.userId` với `currentUser.id`.
      - **Đúng chủ sở hữu:** Hiển thị nút bấm "Gửi yêu cầu bảo hành cho máy này" mở `ClaimWarrantyModal`.
      - **Không phải chủ sở hữu (tra cứu hộ):** Ẩn nút yêu cầu bảo hành, chỉ hiển thị thông tin tra cứu tĩnh (ngăn chặn spam hoặc can thiệp trái phép bằng số IMEI nhặt được).

### 3.2. Trang Quản lý Bảo hành Quản trị (`AdminWarrantiesPage.tsx`)
- **Tuyến đường & Phân quyền:**
  - Route: `/admin/warranties` (cho Admin/Manager) và `/staff/warranties` (cho Staff vận hành).
  - Thêm mục "Quản lý Bảo hành" trên Sidebar của `AdminLayout.tsx` và `StaffLayout.tsx`.
- **Giao diện & Tính năng:**
  - Bộ lọc trạng thái: Tất cả (`ALL`), Đang hiệu lực (`ACTIVE`), Đang yêu cầu xử lý (`CLAIMED`), Đã hết hạn (`EXPIRED`), Đã hủy/vô hiệu (`VOIDED`).
  - Ô tìm kiếm nhanh: Theo Mã bảo hành, Số IMEI hoặc Tên/SĐT khách hàng.
  - Bảng dữ liệu bảo hành:
    - Mã bảo hành, Thông tin thiết bị & IMEI, Chủ sở hữu, Ngày bắt đầu - Ngày kết thúc, Trạng thái (Tag màu).
  - Drawer Chi tiết & Xử lý:
    - Xem lịch sử ghi chú, mô tả lỗi khách gửi lên.
    - Nút hành động:
      - *"Tiếp nhận bảo hành"*: Chuyển đổi trạng thái xử lý nội bộ.
      - *"Hủy bảo hành (Void)"*: Gọi `PUT /api/warranty/:id/void` (trường hợp máy vi phạm chính sách bảo hành: rơi vỡ, vào nước, tự ý tháo mở).

---

## 4. Thiết kế Tiền kiểm Giỏ hàng (Cart Pre-validation)

### 4.1. Tích hợp Service
- Bổ sung `validateCart()` trong `frontend/src/services/cartService.ts` gọi `GET /api/cart/validate`.

### 4.2. Kịch bản Xử lý trên Giao diện
1. **Tại `CartPage.tsx` khi bấm "Tiến hành đặt hàng" (Go to Checkout):**
   - Kích hoạt gọi `cartService.validateCart()`.
   - **Trường hợp Giỏ hàng hợp lệ:** Điều hướng người dùng sang `/checkout`.
   - **Trường hợp Giỏ hàng có biến động (hết hàng, giảm tồn kho, đổi giá flash sale):**
     - Hiển thị thông báo `Modal.warning`:
       > *"Một số sản phẩm trong giỏ hàng đã thay đổi về số lượng tồn kho hoặc giá bán. Giỏ hàng của bạn đã được cập nhật lại theo dữ liệu mới nhất."*
     - Tự động tải lại danh sách giỏ hàng mới và giữ khách ở lại trang `/cart` để rà soát lại trước khi tiếp tục.
2. **Tại `CheckoutPage.tsx` khi mount trang:**
   - Chạy kiểm tra nhanh giỏ hàng. Nếu giỏ hàng trống hoặc có sản phẩm không còn đủ điều kiện, tự động thông báo và chuyển hướng an toàn về `/cart`.

---

## 5. Kế hoạch Kiểm chứng & Acceptance Criteria

1. **Category Management:**
   - Truy cập `/admin/categories` hiển thị cây phân cấp và bảng chi tiết danh mục.
   - Thêm danh mục mới (gốc hoặc con) thành công và xuất hiện ngay trên cây.
   - Chỉnh sửa và đổi trạng thái (Kích hoạt / Ẩn) hoạt động tức thì.
   - Xóa danh mục không có sản phẩm thành công; xóa danh mục có sản phẩm hiển thị thông báo lỗi từ Backend.
2. **Warranty Lifecycle:**
   - Khách hàng là chủ sở hữu gửi yêu cầu bảo hành thành công từ Profile hoặc WarrantyLookup.
   - Người ngoài tra cứu IMEI không phải của mình không thấy nút gửi bảo hành.
   - Admin/Staff truy cập `/admin/warranties` nhìn thấy danh sách bảo hành và các yêu cầu `CLAIMED` do khách gửi.
   - Admin có thể thực hiện thao tác Void bảo hành vi phạm.
3. **Cart Pre-validation:**
   - Giỏ hàng hợp lệ chuyển sang Checkout bình thường.
   - Giỏ hàng có biến động tồn kho/giá hiển thị cảnh báo và cập nhật lại giỏ hàng trước khi cho phép đặt hàng.
4. **Build & Type Safety:**
   - Toàn bộ source code Frontend (`npx tsc -b && npx vite build`) và Backend (`nest build`) thành công 100% không có lỗi.
