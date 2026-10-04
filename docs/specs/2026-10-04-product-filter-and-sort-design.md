# Tài liệu Đặc tả Thiết kế: Hệ thống Bộ lọc & Sắp xếp Sản phẩm Toàn diện

- **Ngày tạo:** 2026-10-04
- **Trạng thái:** Đã phê duyệt (Approved)
- **Tác giả:** Clever Panda Team

---

## 1. Mục tiêu & Phạm vi dự án

### 1.1 Mục tiêu
Xây dựng và hoàn thiện hệ thống **Bộ lọc (Filter)** và **Sắp xếp (Sort)** toàn diện cho trang danh mục sản phẩm (Storefront Product Listing Page) của sàn thương mại điện tử Clever Panda. Hệ thống cho phép khách hàng dễ dàng tìm kiếm và sàng lọc điện thoại theo đầy đủ các tiêu chí phần cứng, thương hiệu, khoảng giá, tình trạng và đánh giá, đồng thời hỗ trợ sắp xếp linh hoạt theo mức độ bán chạy, tỷ lệ giảm giá, giá cả và độ mới.

### 1.2 Phạm vi tính năng
1. **Bộ lọc (Filter):**
   - Khoảng giá (Price range slider & mốc chọn nhanh)
   - Thương hiệu (Brand selection)
   - Bộ nhớ trong (ROM) & Bộ nhớ RAM (Variant attributes)
   - Màu sắc (Color palette swatches)
   - Kích thước màn hình (Screen size ranges: <6.1", 6.1"-6.7", >6.7")
   - Độ phân giải (HD+, FHD+, 1.5K, 2K+)
   - Dòng Chipset / CPU (Apple A-series, Snapdragon, Dimensity, Exynos)
   - Camera (Độ phân giải camera chính)
   - Dung lượng Pin (Battery capacity ranges: <4000mAh, 4000-5000mAh, >5000mAh)
   - Hệ điều hành (iOS, Android)
   - Mạng 5G (Hỗ trợ 5G)
   - Đánh giá (Rating: 5 sao, 4 sao trở lên, 3 sao trở lên)
   - Tình trạng bổ sung (Đang có hàng sẵn, Đang giảm giá)

2. **Sắp xếp (Sort):**
   - Mặc định (Default)
   - Bán chạy nhất (`best-seller` - tính theo tổng số lượng bán từ `OrderItem`)
   - Khuyến mãi nhiều nhất (`top-discount` - tính theo % chiết khấu `compareAtPrice` so với `price`)
   - Giá thấp → cao (`price-asc`)
   - Giá cao → thấp (`price-desc`)
   - Mới nhất (`newest` - `createdAt desc`)
   - Đánh giá cao nhất (`rating` - điểm review trung bình giảm dần)

---

## 2. Kiến trúc & Cấu trúc Dữ liệu (Data Modeling)

### 2.1 Chuẩn hóa trường `specs` (JSON trong bảng `Product`)
Không cần migration cấu trúc bảng CSDL, tận dụng trường `specs Json?` sẵn có của model `Product` với TypeScript interface chuẩn hóa:

```typescript
export interface ProductHardwareSpecs {
  screenSize?: number;        // inch (ví dụ: 6.7)
  screenResolution?: string;  // chuỗi (ví dụ: '2796 x 1290 pixels', 'FHD+', '1.5K', '2K+')
  screenTechnology?: string;  // OLED, AMOLED, Super Retina XDR
  screenRefreshRate?: number; // Hz (ví dụ: 120)
  chipset?: string;           // ví dụ: 'Apple A18 Pro', 'Snapdragon 8 Gen 3'
  os?: 'iOS' | 'Android';     // Hệ điều hành chính
  osVersion?: string;         // ví dụ: 'iOS 18', 'Android 15'
  has5G?: boolean;            // true / false
  batteryCapacity?: number;   // mAh (ví dụ: 4685, 5000)
  chargingSpeed?: number;     // W (ví dụ: 33, 45)
  rearCamera?: string;        // Text mô tả chi tiết cụm camera
  frontCamera?: string;       // Text mô tả camera trước
  mainCameraMp?: number;      // MP (ví dụ: 48, 50, 200)
  [key: string]: any;         // Giữ tương thích ngược với dữ liệu text tiếng Việt cũ
}
```

### 2.2 Mở rộng `FilterProductDto` (Backend API `GET /products`)
Cập nhật `backend/src/modules/products/dto/filter-product.dto.ts`:

- `search?: string`
- `brandId?: string`
- `categoryId?: string`
- `minPrice?: number`
- `maxPrice?: number`
- `ram?: string[]` (biến thể)
- `storage?: string[]` (biến thể)
- `color?: string[]` (biến thể)
- `inStock?: boolean`
- `onSale?: boolean`
- `has5G?: boolean`
- `os?: string[]`
- `chipset?: string[]`
- `minScreenSize?: number`
- `maxScreenSize?: number`
- `minBattery?: number`
- `maxBattery?: number`
- `minRating?: number`
- `page?: number`
- `limit?: number`
- `sortBy?: 'createdAt' | 'name' | 'price-asc' | 'price-desc' | 'rating' | 'best-seller' | 'top-discount'`
- `sortOrder?: 'asc' | 'desc'`

---

## 3. Thiết kế Backend (Backend Logic & Query)

### 3.1 Truy vấn Prisma Where Clause (`ProductsService.findAll`)
- **Variant Filtering:**
  - Lọc theo `ram`, `storage`, `color`, `price` (khoảng giá), `inStock` (`inventory.availableQty > 0`), `onSale` (`compareAtPrice > price`).
- **Hardware Specs Filtering:**
  - `has5G`: Query path JSON PostgreSQL `specs: { path: ['has5G'], equals: true }`.
  - `os`: Query path JSON PostgreSQL `specs: { path: ['os'], in: os }`.
  - `screenSize`: Query path JSON PostgreSQL `specs: { path: ['screenSize'], gte: minScreenSize, lte: maxScreenSize }`.
  - `batteryCapacity`: Query path JSON PostgreSQL `specs: { path: ['batteryCapacity'], gte: minBattery, lte: maxBattery }`.
  - `chipset`: Query path JSON `specs: { path: ['chipset'], string_contains: chip }`.
- **Review Rating Filtering:**
  - Lọc các sản phẩm có điểm rating trung bình (từ các review `status: APPROVED`) >= `minRating`.

### 3.2 Logic Sắp xếp Nâng cao (Sorting Engine)
- **`best-seller` (Bán chạy):**
  - Thực hiện subquery / aggregate trên bảng `OrderItem` group theo `variant.productId`, đếm tổng `quantity` bán thành công, sắp xếp thứ tự giảm dần.
- **`top-discount` (Khuyến mãi nhiều nhất):**
  - Tính tỷ lệ phần trăm chiết khấu `(compareAtPrice - price) / compareAtPrice` của biến thể có mức giảm cao nhất, sắp xếp giảm dần.
- **`price-asc` / `price-desc`:**
  - Sắp xếp theo giá bán thấp nhất của biến thể hoạt động (`variants: { price: 'asc' / 'desc' }`).
- **`rating`:**
  - Sắp xếp theo điểm số trung bình của các review đã được duyệt.
- **`createdAt`:**
  - Sắp xếp theo ngày tạo mới nhất (`createdAt: 'desc'`).

---

## 4. Thiết kế Frontend (Storefront UI/UX)

### 4.1 Định hướng thẩm mỹ (Aesthetic Direction)
- Thiết kế theo phong cách *Clean E-commerce Utility* đồng bộ với Ant Design và Tailwind CSS.
- Màu sắc: Nền thẻ trắng sáng `bg-white`, border mảnh `border-slate-200`, accent color xanh công nghệ `blue-600`, amber cho sao đánh giá `amber-400`, rose cho sale tag `rose-600`.
- Hiệu ứng chuyển động mượt mà (smooth transition), bo góc `rounded-2xl`, bóng đổ nhẹ `shadow-xs`.

### 4.2 Cấu trúc Accordion trên `ProductFilterSidebar`
Sidebar được cấu trúc thành các nhóm Collapsible Accordion:
1. **Khoảng giá (Price Slider):** Thanh trượt 2 đầu (0đ - 50tr) kèm 4 nút khoảng giá nhanh.
2. **Thương hiệu (Brand Selection):** Logo kèm tên hãng và số lượng đếm nếu có.
3. **Tính năng nổi bật:** Chip toggle `⚡ 5G`, `🔥 Đang giảm giá`, `📦 Còn hàng`.
4. **Bộ nhớ & RAM:** Nút chip bấm chọn nhiều RAM (`4GB`, `8GB`, `12GB`, `16GB`) và ROM (`128GB`, `256GB`, `512GB`, `1TB`).
5. **Màn hình & Pin:**
   - Kích thước màn hình: `< 6.1"`, `6.1" - 6.7"`, `> 6.7"`
   - Dung lượng Pin: `< 4000 mAh`, `4000 - 5000 mAh`, `> 5000 mAh`
6. **Hệ điều hành & Chip:**
   - Hệ điều hành: `iOS`, `Android`
   - Chipset: `Apple A-series`, `Snapdragon`, `Dimensity`, `Exynos`
7. **Bảng màu sắc (Color Swatches):**
   - Palette màu sắc trực quan (Đen, Trắng, Xanh, Titan, Vàng, Xám, Tím, v.v.) kèm tooltip tên màu.
8. **Đánh giá (Rating):**
   - Lựa chọn `★ 5.0`, `★ Từ 4.0 trở lên`, `★ Từ 3.0 trở lên`.

### 4.3 Nâng cấp `ProductSortToolbar`
Bổ sung đầy đủ 7 tùy chọn sắp xếp:
- `Mặc định`
- `🔥 Bán chạy nhất` (`best-seller`)
- `💥 Khuyến mãi nhiều nhất` (`top-discount`)
- `Giá: Thấp đến Cao` (`price-asc`)
- `Giá: Cao đến Thấp` (`price-desc`)
- `Sản phẩm mới nhất` (`newest`)
- `Đánh giá cao nhất` (`rating`)

### 4.4 Độ phủ trạng thái UX (State Coverage)
- **Loading State:** Shimmering Skeleton cards mô phỏng hình ảnh và nội dung sản phẩm khi đang tải dữ liệu từ backend.
- **Empty State:** Khi không có sản phẩm nào khớp bộ lọc, hiển thị icon tìm kiếm rỗng, thông điệp hướng dẫn rõ ràng kèm nút CTA **[Xóa toàn bộ bộ lọc]** (Reset filters).
- **Error State:** Hiển thị thông báo khi mất kết nối backend và nút **[Thử lại]**.
- **URL Synchronization:** Toàn bộ tham số lọc/sắp xếp/phân trang được đồng bộ 2 chiều với query string URL của trình duyệt (`useSearchParams`), hỗ trợ reload trang, bookmark, và nút quay lại (Back/Forward).
- **Mobile Responsive Drawer:** Tự động thu gọn vào nút **[Bộ lọc]** trên mobile/tablet (`lg:hidden`), kích hoạt Drawer trượt với trải nghiệm cảm ứng mượt mà.

---

## 5. Dữ liệu mẫu & Seed Data (Data Backfill)
Cập nhật dữ liệu mẫu trong `backend/prisma/seed/seed.ts` và `backend/prisma/seed_demo.ts` để các sản phẩm mẫu có đầy đủ thông số `specs` chuẩn hóa (`has5G: true/false`, `screenSize: 6.1/6.7`, `batteryCapacity: 4500/5000`, `chipset: 'Apple A17 Pro' / 'Snapdragon 8 Gen 3'`, `os: 'iOS' / 'Android'`), đảm bảo kiểm thử trực quan thấy ngay kết quả lọc.

---

## 6. Kế hoạch Kiểm thử & Tiêu chí Nghiệm thu (Testing & Acceptance Criteria)
1. **Kiểm thử Đơn vị & Tích hợp (Unit & Integration Tests):**
   - Test DTO validation cho `FilterProductDto`.
   - Test `ProductsService.findAll` với các kịch bản lọc: kết hợp hãng + khoảng giá + 5G + pin + sort bán chạy.
   - Test Component rendering của `ProductFilterSidebar` và `ProductSortToolbar`.
2. **Kiểm thử E2E / UI flow:**
   - Chọn thương hiệu Samsung + Giá 10m-20m + RAM 8GB + ROM 256GB + 5G: Hiển thị đúng sản phẩm Galaxy tương ứng.
   - Sắp xếp Bán chạy: Sản phẩm có nhiều lượt mua trong `order_items` hiển thị trước.
   - Sắp xếp Khuyến mãi nhiều nhất: Sản phẩm có % giảm giá cao nhất hiển thị trước.
   - Bấm nút Xóa bộ lọc: Reset toàn bộ filter về trạng thái ban đầu và load lại danh sách đầy đủ.
