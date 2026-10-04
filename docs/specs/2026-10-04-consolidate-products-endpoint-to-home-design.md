# Đặc tả thiết kế: Hợp nhất Endpoint /products thành Trang chủ (Home)

**Ngày tạo:** 2026-10-04  
**Trạng thái:** Đã duyệt (Approved)  
**Mục tiêu:** Loại bỏ sự trùng lặp giữa 2 màn hình Trang chủ (`/`) và Danh sách sản phẩm (`/products`), hợp nhất danh mục và bộ lọc tìm kiếm về Trang chủ, chuyển hướng `/products` về `/` và giữ nguyên chi tiết sản phẩm (`/products/:id`).

---

## 1. Bối cảnh & Vấn đề
- Hệ thống hiện tại có 2 màn hình riêng biệt hiển thị danh mục sản phẩm tương tự nhau:
  - Trang chủ (`/` - `HomePage.tsx`): Có hero showcase, flash sale banner, logo thương hiệu, bộ lọc nâng cao (Sidebar & Toolbar) và danh sách sản phẩm.
  - Danh sách sản phẩm (`/products` - `ProductListingPage.tsx`): Có bộ lọc nâng cao và danh sách sản phẩm.
- Việc duy trì 2 trang này gây dư thừa mã nguồn, gây nhầm lẫn trong trải nghiệm người dùng (UX) và phân mảnh liên kết nội bộ.
- Navbar và các nút hành động điều hướng ("Tiếp tục mua sắm", "Xem sản phẩm") đang trỏ phân tán giữa `/` và `/products`.

---

## 2. Giải pháp Kiến trúc & Điều hướng

### 2.1. Cấu hình Router (`frontend/src/routes/AppRoutes.tsx`)
- **Route `/products`:** 
  - Thay thế `<Route path="/products" element={<ProductListingPage />} />` bằng redirect tự động:
    `<Route path="/products" element={<Navigate to="/" replace />} />`.
  - Hỗ trợ chuyển tiếp query parameters nếu có (ví dụ `/products?search=iphone` hoặc `/products?brand=Apple` sẽ chuyển hướng giữ nguyên query về `/?search=iphone` hoặc `/?brand=Apple`).
- **Route `/products/:id`:**
  - Giữ nguyên `<Route path="/products/:id" element={<ProductDetailPage />} />`.
- **Dọn dẹp code:**
  - Xóa component `frontend/src/pages/storefront/Products/ProductListingPage.tsx`.

### 2.2. Nâng cấp `HomePage.tsx`
- **Đồng bộ hóa URL Search Params:**
  - Đọc `searchParams` (`brand`, `search`, `page`).
  - Khi có `search` trong URL, tự động cập nhật `searchKeyword` và kích hoạt lọc theo từ khóa.
  - Khi có `brand` trong URL (không phân biệt hoa thường), tự động chọn thương hiệu tương ứng trong `selectedBrand`.
  - Khi người dùng tương tác với bộ lọc trên Home, cập nhật `searchParams` tương ứng trên URL để hỗ trợ chia sẻ liên kết / bookmark.
- **Trải nghiệm Tự động cuộn (Auto-scroll):**
  - Khi người dùng đến Home với query `search` hoặc `brand` (từ thanh tìm kiếm Navbar hoặc menu thương hiệu), `HomePage` tự động kích hoạt `productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- **Trạng thái giao diện:**
  - Đang tải: Hiển thị Skeleton Cards.
  - Có kết quả: Hiển thị lưới `ProductCard`, thanh công cụ sắp xếp và phân trang `StorefrontPagination`.
  - Không có kết quả: Hiển thị thông báo tìm kiếm trống thân thiện kèm nút "Xóa bộ lọc".

### 2.3. Cập nhật các Liên kết Nội bộ (Internal Links)
Cập nhật toàn bộ các link đang trỏ tới `/products` về `/`:
1. **`Navbar.tsx`:**
   - Form tìm kiếm: `navigate('/?search=' + encodeURIComponent(query))`
   - Menu thương hiệu di động: trỏ tới `/?brand=Apple`, `/?brand=Samsung`, `/?brand=Xiaomi`
   - Menu "Tất cả điện thoại": trỏ tới `/`
2. **`ProductDetailPage.tsx`:**
   - Breadcrumbs: "Trang chủ (`/`)" > Chi tiết sản phẩm
   - Nút "Quay lại danh sách": trỏ về `/`
3. **`CartPage.tsx` & `CartDrawer.tsx`:**
   - Nút "Tiếp tục mua sắm" hoặc "Mua sắm ngay" khi giỏ hàng trống: trỏ về `/`
4. **`WishlistPage.tsx`:**
   - Nút "Khám phá sản phẩm ngay" khi danh sách yêu thích trống: trỏ về `/`
5. **`NotificationPage.tsx`:**
   - Nút khám phá sản phẩm: trỏ về `/`
6. **`ProfilePage.tsx`:**
   - Nút mua sắm khi chưa có đơn hàng: trỏ về `/`
7. **`OrderSuccessPage.tsx`:**
   - Nút "Tiếp tục mua hàng": trỏ về `/`

---

## 3. Kế hoạch Kiểm thử & Xác minh
1. **Kiểm tra Chuyển hướng (Redirect Verification):**
   - Truy cập URL `/products` -> Trình duyệt chuyển hướng về `/`.
   - Truy cập `/products?search=pro` -> Chuyển hướng về `/?search=pro`.
2. **Kiểm tra Tìm kiếm & Bộ lọc (Search & Filter UX):**
   - Gõ từ khóa vào Navbar và Enter -> Chuyển về Home, cuộn xuống danh sách, kết quả hiển thị đúng sản phẩm phù hợp.
   - Nhấp vào logo thương hiệu hoặc menu thương hiệu -> Danh sách chỉ hiển thị các sản phẩm của thương hiệu đó.
3. **Kiểm tra Trang chi tiết sản phẩm:**
   - Truy cập `/products/:id` -> Vẫn hiển thị trang chi tiết bình thường.
   - Bấm vào breadcrumbs hoặc link quay lại -> Chuyển về `/`.
4. **Kiểm tra Hồi quy (Build & Tests):**
   - Chạy test frontend bằng `npm test` hoặc `vitest run`.
   - Chạy `npm run build` để xác nhận không còn lỗi TypeScript hoặc import gãy.
