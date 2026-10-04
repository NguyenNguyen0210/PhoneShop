# Kế hoạch Thực hiện: Hợp nhất Endpoint /products thành Trang chủ (Home)

> **For agentic workers:** REQUIRED SUB-SKILL: Use dispatching-parallel-agents or subagent-driven-development to implement tasks across parallel streams. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loại bỏ endpoint và màn hình trùng lặp `/products`, biến Trang chủ (`/`) thành nơi hiển thị và lọc danh mục chính, tự động redirect `/products` về `/`, cập nhật toàn bộ liên kết nội bộ và merge vào branch `Nguyen`.

**Architecture:** Sử dụng kiến trúc song song phân tách rõ rệt: Stream A phụ trách đồng bộ hóa URL params và auto-scroll trên `HomePage`; Stream B phụ trách Router Redirect trong `AppRoutes`, xóa `ProductListingPage` và cập nhật form tìm kiếm/menu trên `Navbar`; Stream C phụ trách rà soát và cập nhật toàn bộ các link `/products` trong các component storefront còn lại (Cart, PDP, Wishlist, Notifications, Profile, OrderSuccess). Sau khi cả 3 luồng hoàn thành độc lập, tiến hành kiểm thử hồi quy và merge vào branch `Nguyen`.

**Tech Stack:** React 19, TypeScript, React Router DOM v7, Tailwind CSS, Lucide React, Vitest, Git Worktree.

---

## Danh mục tệp tin thay đổi (File Structure Map)

### Stream A: HomePage Enhancements
- `frontend/src/pages/storefront/Home/HomePage.tsx`: Nhận và đồng bộ `search` và `brand` từ `useSearchParams`, tự động cuộn tới `productGridRef` khi có filter từ URL.
- `frontend/src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx`: Test unit kiểm tra `HomePage` đồng bộ query params và cuộn trang.

### Stream B: Routing & Navigation
- `frontend/src/routes/AppRoutes.tsx`: Chuyển hướng `/products` về `/` (giữ nguyên query params), bỏ import `ProductListingPage`.
- `frontend/src/routes/__tests__/AppRoutesRedirect.spec.tsx`: Test unit kiểm tra chuyển hướng từ `/products` về `/`.
- `frontend/src/pages/storefront/Products/ProductListingPage.tsx`: XÓA tệp tin này do không còn dùng.
- `frontend/src/components/common/Navbar.tsx`: Chuyển submit tìm kiếm và các menu thương hiệu từ `/products` sang `/`.
- `frontend/src/components/common/__tests__/NavbarSearch.spec.tsx`: Test unit kiểm tra Navbar điều hướng tìm kiếm về `/?search=...`.

### Stream C: Storefront Internal Links
- `frontend/src/components/storefront/CartDrawer.tsx`: Nút xem sản phẩm trỏ về `/`.
- `frontend/src/pages/storefront/Cart/CartPage.tsx`: Nút tiếp tục mua sắm trỏ về `/`.
- `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`: Breadcrumbs và nút quay lại trỏ về `/`.
- `frontend/src/pages/storefront/Wishlist/WishlistPage.tsx`: Nút mua sắm khi trống trỏ về `/`.
- `frontend/src/pages/storefront/Notifications/NotificationPage.tsx`: Nút xem sản phẩm trỏ về `/`.
- `frontend/src/pages/storefront/Profile/ProfilePage.tsx`: Nút mua hàng trỏ về `/`.
- `frontend/src/pages/storefront/OrderSuccess/OrderSuccessPage.tsx`: Nút tiếp tục mua sắm trỏ về `/`.

---

## Luồng 1: Stream A - HomePage URL Params & Auto-Scroll

### Task A1: Viết test cho HomePage URL Search & Brand Filter
**Files:**
- Create: `frontend/src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx`

- [ ] **Step 1: Viết test kiểm tra HomePage đồng bộ URL params**
Tạo file test kiểm tra khi truy cập `/?search=iphone` hoặc `/?brand=apple`, `HomePage` cập nhật bộ lọc và cuộn xuống danh sách.

- [ ] **Step 2: Chạy test để xác nhận FAIL (TDD)**
Run: `cd frontend; npx vitest run src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx`

- [ ] **Step 3: Cập nhật `HomePage.tsx`**
Cập nhật `HomePage.tsx`:
1. Đồng bộ `searchParams.get('search')` vào `searchKeyword`.
2. Đồng bộ `searchParams.get('brand')` vào `selectedBrand` (chuẩn hóa so khớp không phân biệt hoa thường với danh sách thương hiệu).
3. Thêm effect lắng nghe nếu có `search` hoặc `brand` param thì gọi `productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })`.

- [ ] **Step 4: Chạy test để xác nhận PASS**
Run: `cd frontend; npx vitest run src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx`

---

## Luồng 2: Stream B - AppRoutes Redirect, Xóa ProductListingPage & Navbar Update

### Task B1: Chuyển hướng `/products` và cập nhật Navbar
**Files:**
- Create: `frontend/src/routes/__tests__/AppRoutesRedirect.spec.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`
- Delete: `frontend/src/pages/storefront/Products/ProductListingPage.tsx`
- Modify: `frontend/src/components/common/Navbar.tsx`

- [ ] **Step 1: Viết test kiểm tra redirect từ `/products` về `/`**
Tạo file test xác nhận `<AppRoutes />` điều hướng từ `/products` sang `/`.

- [ ] **Step 2: Cập nhật `AppRoutes.tsx` & xóa `ProductListingPage.tsx`**
1. Đổi `<Route path="/products" element={<ProductListingPage />} />` thành chuyển hướng về `/`.
2. Xóa import `ProductListingPage`.
3. Xóa file `frontend/src/pages/storefront/Products/ProductListingPage.tsx`.

- [ ] **Step 3: Cập nhật `Navbar.tsx`**
1. Trong hàm `handleSearch`: sửa `navigate('/products?search=...')` thành `navigate('/?search=...')`.
2. Trong menu di động (Mobile Dropdown): sửa các link `/products` thành `/`, `/products?brand=Apple` thành `/?brand=Apple`, v.v.

- [ ] **Step 4: Chạy test Stream B để xác nhận PASS**
Run: `cd frontend; npx vitest run src/routes/__tests__/AppRoutesRedirect.spec.tsx`

---

## Luồng 3: Stream C - Cập nhật tất cả liên kết nội bộ trong Storefront

### Task C1: Rà soát & thay đổi các liên kết `/products` thành `/`
**Files:**
- Modify: `frontend/src/components/storefront/CartDrawer.tsx`
- Modify: `frontend/src/pages/storefront/Cart/CartPage.tsx`
- Modify: `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`
- Modify: `frontend/src/pages/storefront/Wishlist/WishlistPage.tsx`
- Modify: `frontend/src/pages/storefront/Notifications/NotificationPage.tsx`
- Modify: `frontend/src/pages/storefront/Profile/ProfilePage.tsx`
- Modify: `frontend/src/pages/storefront/OrderSuccess/OrderSuccessPage.tsx`

- [ ] **Step 1: Cập nhật `CartDrawer.tsx` và `CartPage.tsx`**
Đổi các `to="/products"` và `navigate('/products')` khi giỏ hàng trống hoặc tiếp tục mua sắm thành `/`. Giữ nguyên các link trỏ tới sản phẩm cụ thể `/products/${id}`.

- [ ] **Step 2: Cập nhật `ProductDetailPage.tsx`**
Đổi Breadcrumb "Sản phẩm" từ `to="/products"` thành `to="/"`. Đổi nút quay lại danh sách thành `to="/"`.

- [ ] **Step 3: Cập nhật `WishlistPage.tsx`, `NotificationPage.tsx`, `ProfilePage.tsx`, `OrderSuccessPage.tsx`**
Đổi nút "Khám phá sản phẩm ngay" / "Tiếp tục mua sắm" từ `to="/products"` thành `to="/"`.

- [ ] **Step 4: Kiểm tra không còn tệp nào sót link `to="/products"` hoặc `navigate('/products')`**
Run: `rg "['\"]/products['\"]"` trên `frontend/src` để xác nhận sạch 100%.

---

## Giai đoạn Hoàn tất & Tích hợp: Merge vào branch `Nguyen`

### Task D1: Kiểm tra toàn diện & Merge
- [ ] **Step 1: Chạy kiểm tra TypeScript `tsc --noEmit`**
Run: `cd frontend; npx tsc --noEmit`

- [ ] **Step 2: Chạy các bộ test mới được thêm**
Run: `cd frontend; npx vitest run src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx src/routes/__tests__/AppRoutesRedirect.spec.tsx`

- [ ] **Step 3: Commit các thay đổi vào branch hiện tại**
`git add -A; git commit -m "feat(storefront): consolidate /products route into home page"`

- [ ] **Step 4: Merge vào branch `Nguyen`**
Thực hiện merge an toàn nhánh tính năng vào branch `Nguyen`.
