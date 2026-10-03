# Đặc tả Thiết kế: Hoàn thiện Quản lý Sản phẩm, Biến thể & Thông số kỹ thuật (Specs)

- **Ngày tạo:** 2026-10-04
- **Trạng thái:** Đã phê duyệt (Approved)
- **Tác giả:** AI Assistant & Quản trị viên TechStore

---

## 1. Tổng quan & Mục tiêu

### 1.1 Bối cảnh
Hệ thống TechStore đã có các API backend cơ bản cho sản phẩm và biến thể, cũng như giao diện danh sách sản phẩm và modal "Thêm thiết bị mới" ban đầu. Tuy nhiên, vẫn còn 3 lỗ hổng chức năng lớn:
1. **Chỉnh sửa sản phẩm (Update Product):** Frontend đã có nút "Sửa" trên bảng nhưng chưa liên kết form chỉnh sửa chi tiết.
2. **Quản lý biến thể độc lập (Variants CRUD):** Frontend chỉ cho phép tạo 1 biến thể đầu tiên lúc thêm mới sản phẩm, chưa có giao diện xem, thêm, sửa, xóa các biến thể phụ (màu sắc, dung lượng, RAM, giá).
3. **Quản lý thông số kỹ thuật (Manage Specifications):** Backend model `Product` có trường `specs` dạng JSON (RAM, Pin, Màn hình, Chipset...) nhưng DTO chưa whitelist và Frontend chưa có form nhập động specs.

### 1.2 Mục tiêu (Goals)
- Cung cấp trải nghiệm quản trị toàn diện qua **Modal đa Tab** gắn liền với từng sản phẩm.
- Cho phép chỉnh sửa toàn bộ thông tin chung của sản phẩm (tên, slug, danh mục, thương hiệu, trạng thái, ảnh, mô tả, bảo hành).
- Cho phép xem danh sách biến thể, thêm biến thể mới, cập nhật giá/thuộc tính/ảnh và xóa biến thể (kèm cơ chế bảo vệ toàn vẹn dữ liệu).
- Cung cấp form nhập thông số kỹ thuật (Specs) thông minh gồm các trường phần cứng chuẩn (Hardware Presets) và bảng thêm động cặp Key-Value tùy ý.
- Đảm bảo tính nhất quán giữa Backend (NestJS + Prisma) và Frontend (React 19 + Ant Design 6 + Tailwind).

### 1.3 Giới hạn ngoài phạm vi (Non-goals)
- Không thay đổi cấu trúc bảng cơ sở dữ liệu Prisma (tận dụng nguyên vẹn trường `specs Json?` và model `ProductVariant`).
- Không can thiệp vào quy trình quản lý kho nâng cao (nhập kho IMEI, kiểm kê vật lý - các tính năng này thuộc về module `AdminInventory` và `AdminImei`).

---

## 2. Kiến trúc Kỹ thuật & Luồng dữ liệu

### 2.1 Backend Updates (`backend/src/modules/products`)
1. **`CreateProductDto` & `UpdateProductDto`:**
   - Bổ sung trường `@IsOptional() @IsObject() specs?: Record<string, any>;`.
   - Đảm bảo `specs` không bị `ValidationPipe(whitelist: true)` loại bỏ khi gửi lên từ client.
   - Thêm cơ chế tự động tạo `slug` hợp lệ từ `name` nếu client không gửi `slug` khi tạo mới.
2. **`ProductsService`:**
   - Đảm bảo hàm `update(id, dto)` ghi nhận và lưu `specs` dưới dạng JSON vào database.
   - Kiểm tra và hoàn thiện hàm `updateVariant(productId, variantId, dto)`: hỗ trợ đầy đủ các trường `sku`, `name`, `color`, `storage`, `ram`, `price`, `compareAtPrice`, `costPrice`, `imageUrl`, `isActive`.
   - Hàm `removeVariant(productId, variantId)`: kiểm tra ràng buộc trước khi xóa, nếu biến thể đã có trong `OrderItem` hoặc `ImeiDevice` thì thông báo lỗi rõ ràng tránh vi phạm Restrict constraint của Prisma.

### 2.2 Frontend API Service (`frontend/src/services/productService.ts`)
Bổ sung các phương thức:
- `updateVariant(productId: string, variantId: string, dto: UpdateVariantDto): Promise<ProductVariant>`
- `deleteVariant(productId: string, variantId: string): Promise<void>`
- `toggleVariantStatus(productId: string, variantId: string, isActive: boolean): Promise<ProductVariant>`

---

## 3. Thiết kế Giao diện Người dùng (UI/UX)

### 3.1 Cấu trúc Component
Các component được tổ chức dạng module hóa tại thư mục: `frontend/src/pages/Admin/Products/components/`

```
frontend/src/pages/Admin/Products/
├── AdminProductsPage.tsx            # Trang chính (Bảng sản phẩm, bộ lọc, metric cards)
└── components/
    ├── ProductEditModal.tsx         # Modal trung tâm đa tab (Width 880px)
    ├── ProductGeneralTab.tsx        # Tab 1: Form thông tin chung & ảnh đại diện
    ├── ProductVariantsTab.tsx       # Tab 2: Danh sách biến thể, bật/tắt active, xóa
    ├── VariantFormModal.tsx         # Modal con: Thêm mới hoặc chỉnh sửa 1 biến thể
    └── ProductSpecsTab.tsx          # Tab 3: Nhập thông số chuẩn & Key-Value tùy biến
```

### 3.2 Chi tiết từng Component

#### 1. `ProductEditModal.tsx`
- **Props:** `productId: string | null`, `open: boolean`, `onClose: () => void`, `onSuccess: () => void`.
- **State:** Tải thông tin chi tiết sản phẩm (`productService.getProductById`), quản lý tab đang kích hoạt (`general`, `variants`, `specs`).
- **Header:** Hiển thị Tên sản phẩm, Badge ID, Tag Trạng thái, nút Đóng.

#### 2. `ProductGeneralTab.tsx` (Tab 1: Thông tin cơ bản)
- **Form fields:**
  - Tên sản phẩm (Input, required).
  - Slug đường dẫn URL (Input, có nút tự động sinh từ Tên).
  - Thương hiệu (Select dropdown lấy từ `productService.getBrands`).
  - Danh mục (Select dropdown lấy từ `productService.getCategories`).
  - Tình trạng thiết bị: `NEW` (Mới 100%) / `LIKE_NEW` (Cũ 99%).
  - Trạng thái kinh doanh: `ACTIVE` (Đang bán) / `DRAFT` (Tạm ẩn).
  - Thời hạn bảo hành: Number (tháng, mặc định 12).
  - Mô tả tóm tắt (TextArea).
  - Ảnh đại diện chính: `ImageUploadDragger` (hỗ trợ upload ảnh WebP lên Cloudflare R2).
- **Thao tác:** Nút "Lưu thông tin chung" với trạng thái `loading`.

#### 3. `ProductVariantsTab.tsx` (Tab 2: Quản lý Biến thể)
- **Thanh tác vụ:** Tổng số biến thể, Nút `+ Thêm biến thể mới` (mở `VariantFormModal`).
- **Bảng biến thể (Ant Design Table):**
  - Cột Ảnh: Thumbnail ảnh biến thể theo màu.
  - Cột SKU: Tag chữ font monospace màu xanh xám.
  - Cột Phân loại: Màu sắc + Dung lượng (ROM) + RAM.
  - Cột Giá bán & Giá niêm yết: Định dạng tiền tệ VND (`28.990.000 ₫`).
  - Cột Kích hoạt: `Switch` bật/tắt `isActive` gọi API tức thì.
  - Cột Thao tác:
    - Nút "Sửa": Mở `VariantFormModal` với dữ liệu biến thể hiện tại.
    - Nút "Xóa": `Popconfirm` cảnh báo xác nhận xóa.
- **Empty State:** Hiển thị khi sản phẩm chưa có biến thể kèm nút tạo biến thể đầu tiên.

#### 4. `VariantFormModal.tsx` (Modal Thêm/Sửa biến thể)
- **Props:** `open: boolean`, `productId: string`, `variant: ProductVariant | null`, `onClose: () => void`, `onSuccess: () => void`.
- **Form fields:**
  - SKU (Mã phân loại, có nút "Gợi ý mã SKU").
  - Tên hiển thị biến thể (VD: "iPhone 16 Pro Max 256GB Titan Tự Nhiên").
  - Màu sắc (VD: Titan Sa Mạc, Đen Titan, Xanh Titan).
  - Dung lượng bộ nhớ ROM (Select/Input: 128GB, 256GB, 512GB, 1TB).
  - Bộ nhớ RAM (Select/Input: 8GB, 12GB, 16GB).
  - Giá bán (InputNumber, format tiền tệ, required).
  - Giá gốc so sánh (InputNumber, format tiền tệ).
  - Ảnh biến thể riêng biệt: `ImageUploadDragger`.

#### 5. `ProductSpecsTab.tsx` (Tab 3: Thông số kỹ thuật)
- **Phần 1 - Thông số chuẩn di động (Presets):**
  - Màn hình (VD: `6.9 inch, Super Retina XDR OLED, 120Hz`)
  - Chipset / CPU (VD: `Apple A18 Pro 6 nhân`)
  - Camera sau (VD: `Chính 48 MP & Phụ 48 MP, 12 MP`)
  - Camera trước (VD: `12 MP, ƒ/1.9`)
  - Pin & Công nghệ sạc (VD: `Li-Ion, Sạc nhanh 33W, MagSafe 25W`)
  - Hệ điều hành (VD: `iOS 18`)
  - Cổng kết nối (VD: `USB Type-C (USB 3.0)`)
- **Phần 2 - Thông số mở rộng tùy chỉnh (Custom Key-Value):**
  - Danh sách động các hàng gồm `[Tên thông số]` - `[Giá trị chi tiết]` - `[Nút xóa dòng]`.
  - Nút `+ Thêm thông số khác`.
- **Thao tác:** Nút "Lưu thông số kỹ thuật" gom toàn bộ preset và custom thành JSON map `Record<string, string>` và gọi `updateProduct(id, { specs })`.

---

## 4. Xử lý Trạng thái & Ngoại lệ (UX States & Error Handling)

| Trạng thái | Hành vi giao diện |
|------------|-------------------|
| **Đang tải (Loading)** | Hiển thị `Spin` hoặc skeleton khi tải chi tiết sản phẩm / danh sách biến thể; nút submit hiển thị spinner tránh gửi lặp. |
| **Không có dữ liệu (Empty)** | Bảng biến thể hiển thị icon giỏ hàng trống cùng gợi ý "Thêm biến thể đầu tiên"; Specs hiển thị ô nhập kèm placeholder minh họa. |
| **Lỗi validate form** | Ant Design form hiển thị cảnh báo đỏ ngay dưới trường nhập (bắt buộc tên, giá > 0, SKU hợp lệ). |
| **Lỗi nghiệp vụ Backend** | Hiển thị `message.error` chi tiết khi SKU trùng lặp hoặc khi xóa biến thể đã phát sinh đơn hàng. |
| **Thao tác thành công** | Hiển thị `message.success`, tự động đóng modal con, cập nhật trực tiếp dữ liệu trên bảng mà không cần tải lại toàn bộ trang. |

---

## 5. Chiến lược Kiểm thử (Testing Strategy)

1. **Backend Integration / Unit Test:**
   - Kiểm tra `CreateProductDto` & `UpdateProductDto` cho phép truyền trường `specs`.
   - Kiểm tra `updateVariant` và `removeVariant` trong `ProductsService`.
2. **Frontend Component Unit Test (Vitest + Testing Library):**
   - Viết test cho `ProductEditModal.spec.tsx`: Kiểm tra mở đúng tab, render các thông tin sản phẩm, gọi API submit đúng payload.
   - Viết test cho `ProductSpecsTab.spec.tsx`: Kiểm tra hiển thị preset, thêm/xóa dòng custom spec, map dữ liệu đúng JSON format.
   - Viết test cho `VariantFormModal.spec.tsx`: Kiểm tra validation giá tiền, SKU, và trigger callback thành công.
3. **End-to-End Verification:**
   - Kiểm tra luồng: Tạo sản phẩm mới -> Mở modal sửa -> Thêm biến thể mới -> Nhập specs -> Kiểm tra trang chi tiết sản phẩm (PDP) hiển thị chuẩn specs vừa lưu.
