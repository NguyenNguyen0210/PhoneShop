# Đặc tả thiết kế: Tái cấu trúc Hero Banner Trang chủ (Ambient Glow & Service Bar)

**Ngày tạo:** 2026-10-04  
**Trạng thái:** Đã duyệt (Approved)  
**Mục tiêu:** Nâng cấp Hero Banner trang chủ từ dạng banner thẻ thông thường sang phong cách Flagship Showcase 3D với hiệu ứng quầng sáng tỏa (Ambient Glow) theo màu sắc của máy, floating badges nổi bật, điều hướng slider tự động và tách độc lập thanh 4 cam kết dịch vụ ra bên dưới banner.

---

## 1. Bối cảnh & Vấn đề hiện tại
- **Banner bị "đóng hộp" và quá tải thông tin:** Khối Hero hiện tại nhồi nhét cả 4 cam kết bán hàng (Giao hàng, Bảo hành, Đổi trả, Thu cũ) cùng các dòng text thông số bên trong cột trái của thẻ banner, khiến trải nghiệm bị nặng nề như một "trang chi tiết sản phẩm thu nhỏ" thay vì một Hero banner khơi gợi cảm hứng.
- **Thiếu chiều sâu thị giác (Visual Depth):** Thiết bị hiển thị phẳng, chưa có hiệu ứng ánh sáng môi trường đặc trưng của các sản phẩm công nghệ cao cấp (như Apple, Samsung, Spotify).
- **Mã nguồn cồng kềnh trong `HomePage.tsx`:** Toàn bộ logic hiển thị hero, mảng sao chép marketing, danh sách cam kết dịch vụ đang được đặt monolithic trực tiếp trong `HomePage.tsx` (file hiện hơn 800 dòng), làm giảm tính tái sử dụng và khó viết unit test.

---

## 2. Giải pháp Kiến trúc & Trực quan (Architecture & Design)

### 2.1. Phong cách Thẩm mỹ (Aesthetic Direction)
- **Định hướng:** **Dynamic Tech Flagship** (lấy cảm hứng từ trang giới thiệu sản phẩm của Apple và Samsung).
- **Hiệu ứng Quầng sáng Tỏa (Ambient Glow / Radial Backdrop):**
  - Đặt một quầng sáng đa tầng (`w-72 h-72 md:w-96 md:h-96 rounded-full blur-3xl pointer-events-none`) phát ra từ ngay sau lưng chiếc điện thoại.
  - Quầng sáng và nền banner (`bg-gradient-to-br`) tự động chuyển đổi sắc thái mượt mà theo thương hiệu hoặc màu sắc chủ đạo của thiết bị.
- **Bố cục Phá khung & Floating Badges:**
  - Ảnh thiết bị hiển thị to bản, áp dụng đổ bóng chân thực (`filter drop-shadow-2xl`) kèm hiệu ứng hover scale nhẹ.
  - Gắn 2 huy hiệu trôi nổi (Floating Badges) kính mờ (`bg-white/90 backdrop-blur-md border border-slate-100/80 shadow-xl rounded-2xl px-3.5 py-2`) ở hai góc chéo (góc trên và góc dưới) hiển thị thông số ấn tượng nhất (ví dụ: Pin trâu 5.800 mAh, Màn hình chống rơi vỡ Ultra-Bounce, Chip Snapdragon / Apple A-series).

### 2.2. Bảng ánh xạ Theme Động (Dynamic Brand Theme Engine)
Hệ thống tự động phát hiện thương hiệu hoặc tên sản phẩm để áp dụng palette màu tương ứng:
1. **Honor / Xiaomi:**
   - Background Gradient: `from-orange-50/80 via-amber-50/20 to-white`
   - Ambient Glow: `bg-orange-500/35`
   - Accent Text / Badge: `text-orange-600`, `bg-orange-100 text-orange-700`
   - Nút Mua ngay: `bg-orange-600 hover:bg-orange-700 shadow-orange-500/25`
2. **Apple (iPhone Series):**
   - Background Gradient: `from-amber-100/50 via-stone-50/30 to-white`
   - Ambient Glow: `bg-amber-600/25`
   - Accent Text / Badge: `text-amber-700`, `bg-amber-100 text-amber-800`
   - Nút Mua ngay: `bg-stone-900 hover:bg-black shadow-stone-900/25`
3. **Samsung (Galaxy Series):**
   - Background Gradient: `from-blue-50/80 via-sky-50/20 to-white`
   - Ambient Glow: `bg-blue-500/30`
   - Accent Text / Badge: `text-blue-600`, `bg-blue-100 text-blue-700`
   - Nút Mua ngay: `bg-blue-600 hover:bg-blue-700 shadow-blue-500/25`
4. **Mặc định / Các thương hiệu khác:**
   - Background Gradient: `from-indigo-50/70 via-slate-50/30 to-white`
   - Ambient Glow: `bg-indigo-500/25`
   - Accent Text / Badge: `text-indigo-600`, `bg-indigo-100 text-indigo-700`
   - Nút Mua ngay: `bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25`

### 2.3. Cấu trúc Component Mới

#### 1. `frontend/src/components/storefront/HeroBannerShowcase.tsx`
- **Trách nhiệm:** Hiển thị slider các sản phẩm flagship từ catalog với hiệu ứng Ambient Glow, Floating Badges, giá ưu đãi, trả góp và nút điều hướng.
- **Props:**
  - `products: Product[]`: Danh sách sản phẩm từ database (lấy 3–5 sản phẩm đầu tiên).
  - `loading?: boolean`: Trạng thái tải dữ liệu từ API.
- **Điều hướng & Tương tác:**
  - Auto-play 5 giây: Tự động chuyển sang sản phẩm kế tiếp.
  - Tạm dừng auto-play khi rê chuột vào banner (`onMouseEnter` / `onMouseLeave`) để người dùng dễ đọc thông số và bấm mua.
  - Nút chuyển slide: Dots chỉ số ở chân banner và 2 nút mũi tên Next / Previous tinh tế hiển thị khi hover.
  - Trích xuất thông số cho Floating Badges: Tự động lấy từ `specs` của sản phẩm (ví dụ: `specs.batteryCapacity`, `specs.chipset`, `specs.screenSize`, `specs.camera`) hoặc fallback thông minh sang cam kết bảo hành / chính hãng.

#### 2. `frontend/src/components/storefront/StorefrontServiceBar.tsx`
- **Trách nhiệm:** Hiển thị độc lập thanh 4 cam kết thương mại ngay bên dưới Hero Banner:
  1. 🚚 **Giao hỏa tốc 2h** (Miễn phí nội thành)
  2. 🛡️ **Bảo hành 12 tháng** (Chính hãng toàn quốc)
  3. 🔄 **1 đổi 1 trong 30 ngày** (Nếu lỗi do NSX)
  4. 💵 **Thu cũ đổi mới** (Trợ giá đến 2.000.000₫)
- **Responsive Layout:**
  - Desktop (≥ 1024px): 4 cột ngang thẳng hàng.
  - Tablet / Mobile (< 1024px): Lưới 2x2 gọn gàng, bo góc mềm mại, icon nổi bật.

#### 3. Cập nhật `frontend/src/pages/storefront/Home/HomePage.tsx`
- Thay thế toàn bộ khối code hero banner cũ và cụm 4 cam kết bằng `<HeroBannerShowcase products={products} loading={loading} />` và `<StorefrontServiceBar />`.
- Giúp mã nguồn `HomePage.tsx` giảm hơn 150 dòng dư thừa, sạch sẽ và dễ bảo trì.

---

## 3. Xử lý Trạng thái & Ngoại lệ (State Matrix)
1. **Loading State:** Khi `loading === true` hoặc chưa nạp xong danh mục từ API, hiển thị Skeleton Banner có hiệu ứng `animate-pulse` với kích thước tương ứng.
2. **Empty State:** Nếu `products` rỗng (do lỗi mạng hoặc DB trống), hiển thị Fallback Banner chào mừng với hình ảnh công nghệ chung và nút kêu gọi khám phá, không gây crash ứng dụng.
3. **No Specs State:** Nếu sản phẩm chưa có đầy đủ trường `specs`, hệ thống tự động fallback 2 Floating Badges về các điểm bán hàng tiêu chuẩn: "🛡️ 100% Nguyên Seal" và "⭐ Bảo hành chính hãng 12T".

---

## 4. Kế hoạch Kiểm thử & Xác minh (Verification Plan)
1. **Unit Test:**
   - Viết test suite `HeroBannerShowcase.spec.tsx` kiểm tra:
     - Render đúng thông tin sản phẩm, giá, tên máy và badge.
     - Ánh xạ đúng màu sắc theo thương hiệu (Honor/Apple/Samsung).
     - Auto-play hoạt động và tạm dừng khi hover.
     - Click chuyển slide qua dots và nút điều hướng hoạt động chính xác.
     - Hiển thị skeleton khi `loading=true` và fallback an toàn khi `products=[]`.
   - Viết test suite `StorefrontServiceBar.spec.tsx` kiểm tra hiển thị đủ 4 cam kết dịch vụ.
2. **Regression Test:**
   - Chạy toàn bộ test suites hiện có của frontend (`npm test` hoặc `vitest run`) đảm bảo các trang khác và `HomePage` không bị ảnh hưởng.
