# Đặc tả Thiết kế: Tính năng Sản phẩm Yêu thích (Wishlist Feature)

- **Ngày tạo**: 03/10/2026
- **Trạng thái**: Đã phê duyệt (Approved)
- **Tài liệu liên quan**: `backend/src/modules/wishlist`, `frontend/src/pages/storefront/Wishlist`

---

## 1. Mục tiêu & Bối cảnh

### 1.1. Hiện trạng
- **Backend**: Đã có module `WishlistModule` với các endpoint REST API:
  - `GET /wishlist`: Lấy danh sách wishlist của người dùng hiện tại (kèm items và product cơ bản).
  - `POST /wishlist/items`: Thêm sản phẩm vào wishlist (`productId`).
  - `DELETE /wishlist/items/:productId`: Xóa 1 sản phẩm khỏi wishlist.
  - `DELETE /wishlist/clear`: Xóa toàn bộ sản phẩm khỏi wishlist.
  - `GET /wishlist/check/:productId`: Kiểm tra sản phẩm có trong wishlist không.
  - `POST /wishlist/items/:productId/move-to-cart`: Chuyển sản phẩm từ wishlist vào giỏ hàng với biến thể mặc định active.
- **Frontend**:
  - Chưa có trang `/wishlist` riêng biệt.
  - Link "Sản phẩm yêu thích" trên menu Navbar đang trỏ tạm về `/products`.
  - Thẻ sản phẩm `ProductCard` và trang chi tiết sản phẩm `ProductDetailPage` chưa có icon/nút Trái tim để thêm vào danh sách yêu thích.
  - Chưa có service và state store để quản lý danh sách yêu thích ở phía Client.

### 1.2. Mục tiêu
- Hoàn thiện luồng người dùng (User Flow) khép kín cho tính năng Wishlist từ việc khám phá sản phẩm (Homepage, Catalog, PDP), lưu yêu thích, xem danh sách tại trang `/wishlist`, và chuyển sản phẩm vào giỏ hàng mua sắm.
- Đồng bộ dữ liệu chi tiết sản phẩm (biến thể, giá, thương hiệu, tồn kho) từ Backend giúp Frontend hiển thị đồng nhất.

---

## 2. Kiến trúc & Thiết kế Chi tiết

### 2.1. Backend Enrichment (`backend/src/modules/wishlist/wishlist.service.ts`)
Khi lấy wishlist (`getWishlist`), backend cần làm giàu dữ liệu (enrichment) để trả về đầy đủ các trường mà UI Frontend yêu cầu:
- `product`:
  - `brand`: Thông tin thương hiệu sản phẩm (logo, tên hãng).
  - `category`: Thông tin danh mục.
  - `variants`: Danh sách biến thể `isActive: true`, kèm thông tin tồn kho `inventory: true`, sắp xếp theo giá tăng dần (`orderBy: { price: 'asc' }`).
- Sắp xếp các mục yêu thích theo thời gian mới nhất lên đầu (`orderBy: { createdAt: 'desc' }`).

### 2.2. Frontend Service & State Management
- **`frontend/src/services/wishlistService.ts`**:
  - `getWishlist()`: Gọi `GET /wishlist`.
  - `addToWishlist(productId: string)`: Gọi `POST /wishlist/items`.
  - `removeFromWishlist(productId: string)`: Gọi `DELETE /wishlist/items/:productId`.
  - `clearWishlist()`: Gọi `DELETE /wishlist/clear`.
  - `checkProduct(productId: string)`: Gọi `GET /wishlist/check/:productId`.
  - `moveToCart(productId: string)`: Gọi `POST /wishlist/items/:productId/move-to-cart`.

- **`frontend/src/stores/useWishlistStore.ts` (Zustand)**:
  - **State**:
    - `items`: Mảng `WishlistItem[]` chứa thông tin chi tiết item và product.
    - `itemIds`: `Set<string>` hoặc danh sách `string[]` chứa các `productId` để tra cứu $O(1)$.
    - `isLoading`: `boolean`.
  - **Actions**:
    - `fetchWishlist()`: Gọi service tải dữ liệu và cập nhật `items` + `itemIds`.
    - `toggleWishlist(product: Product)`: Thêm hoặc xóa sản phẩm. Áp dụng Optimistic UI update để phản hồi click ngay lập tức.
    - `removeItem(productId: string)`: Xóa 1 sản phẩm khỏi store và backend.
    - `clearAll()`: Xóa sạch danh sách sau khi người dùng xác nhận.
    - `moveToCart(productId: string)`: Chuyển sản phẩm sang giỏ hàng, đồng bộ `useCartStore` và mở `CartDrawer`.
    - `isInWishlist(productId: string)`: Helper function kiểm tra nhanh.

### 2.3. Trải nghiệm Người dùng (UX & Authentication Flow)
- **Quy tắc Người dùng chưa đăng nhập (Guest Users)**:
  - Yêu cầu đăng nhập (`Require Login Only`).
  - Khi khách bấm vào icon Trái tim trên `ProductCard` hoặc `ProductDetailPage`: Hiển thị thông báo nhẹ (Toast/Message): *"Vui lòng đăng nhập để lưu sản phẩm yêu thích"* và điều hướng chuyển trang sang `/login?redirect=...`.
  - Trang `/wishlist` được bảo vệ bằng `ProtectedRoute`. Nếu chưa đăng nhập, người dùng truy cập trực tiếp URL `/wishlist` sẽ được chuyển hướng sang `/login`.

### 2.4. Giao diện Người dùng (UI Components)

#### A. Nút Trái tim trên `ProductCard` (`frontend/src/components/storefront/ProductCard.tsx`)
- Đặt ở góc trên bên phải của phần ảnh sản phẩm: `absolute top-3 right-3 z-10`.
- Thiết kế hình tròn $34 \times 34\text{px}$, nền trắng trong suốt (`bg-white/90 backdrop-blur-xs ring-1 ring-slate-200/80 shadow-xs hover:bg-white`).
- Icon Trái tim (`Heart` từ `lucide-react`):
  - Khi chưa yêu thích: `text-slate-400 hover:text-rose-500 hover:scale-110`.
  - Khi đã yêu thích: `fill-rose-500 text-rose-500`.
- Chặn nổi bọt sự kiện (`e.preventDefault()`, `e.stopPropagation()`) để không kích hoạt điều hướng thẻ `<Link>`.

#### B. Nút Trái tim trên `ProductDetailPage` (`frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`)
- Bố trí tại 2 vị trí quan trọng:
  1. Cạnh tiêu đề sản phẩm và đánh giá sao: Icon tim tinh tế với số lượt yêu thích hoặc trạng thái.
  2. Cụm thanh thao tác mua hàng (Action CTA bar): Một nút hành động chữ nhật bo góc (`border-2 rounded-2xl flex items-center justify-center gap-2 font-bold transition`) với icon Trái tim và nhãn *"Yêu thích"* / *"Đã lưu"*.

#### C. Thanh điều hướng Navbar (`frontend/src/components/common/Navbar.tsx`)
- **Header Actions**: Thêm nút icon Trái tim cạnh icon Giỏ hàng.
  - Hiển thị badge số lượng sản phẩm yêu thích màu đỏ/hồng khi `wishlistCount > 0`.
  - Click dẫn tới `/wishlist`.
- **User Dropdown**: Cập nhật mục "Sản phẩm yêu thích" dẫn đúng route `/wishlist`, hiển thị số lượng sản phẩm.
- **Mobile Menu**: Thêm mục "❤️ Sản phẩm yêu thích" dẫn tới `/wishlist`.

#### D. Trang Danh sách Yêu thích (`frontend/src/pages/storefront/Wishlist/WishlistPage.tsx`)
- Route: `/wishlist`, sử dụng `StorefrontLayout` và bọc trong `ProtectedRoute`.
- **Header Section**:
  - Breadcrumb: `Trang chủ > Sản phẩm yêu thích`.
  - Tiêu đề nổi bật: "Sản phẩm yêu thích của bạn" kèm huy hiệu tổng số lượng.
  - Nút "Xóa tất cả" với hộp thoại xác nhận (Confirm modal).
- **Product Grid**:
  - Lưới hiển thị 4 cột (Desktop) và 2 cột (Mobile).
  - Thẻ sản phẩm hiển thị đầy đủ: Ảnh, thương hiệu, tên máy, bộ nhớ, giá bán, giá gạch so sánh, % giảm giá, tình trạng hàng.
  - 2 nút hành động chính cho mỗi sản phẩm:
    - **"Chuyển vào giỏ"**: Nút nổi bật gọi `moveToCart`, tự động thêm vào giỏ và mở `CartDrawer`.
    - **"Bỏ thích"**: Icon thùng rác hoặc tim gạch chéo để xóa khỏi danh sách.
- **Empty State**:
  - Hiển thị khi danh sách rỗng: Biểu tượng Trái tim mềm mại, thông điệp "Danh sách yêu thích của bạn đang trống" và nút CTA "Khám phá sản phẩm ngay" trỏ về `/products`.
- **Loading State**: Skeleton loading đồng bộ bố cục.

---

## 3. Kế hoạch Kiểm thử & Xác minh (Verification)
1. **Kiểm thử API Backend**:
   - Xác minh `GET /wishlist` trả về đầy đủ `product.brand` và `product.variants`.
   - Xác minh `POST /wishlist/items`, `DELETE /wishlist/items/:productId`, `DELETE /wishlist/clear`, và `POST /wishlist/items/:productId/move-to-cart`.
2. **Kiểm thử Frontend State & Optimistic UI**:
   - Bấm tim trên `ProductCard` thay đổi màu sắc ngay lập tức.
   - Thử nghiệm trên cả Homepage và Product Listing Page.
   - Thử nghiệm trên Product Detail Page.
3. **Kiểm thử Luồng Khách chưa đăng nhập**:
   - Bấm tim khi chưa đăng nhập hiển thị thông báo và điều hướng tới `/login`.
4. **Kiểm thử Trang Wishlist**:
   - Hiển thị danh sách chính xác.
   - Xóa từng mục và xóa tất cả.
   - Chuyển sản phẩm vào giỏ hàng thành công, hiển thị CartDrawer.
   - Kiểm tra giao diện Empty State.
5. **Kiểm thử Build**: Chạy `npm run build` ở cả backend và frontend để đảm bảo không có lỗi TypeScript hay cú pháp.
