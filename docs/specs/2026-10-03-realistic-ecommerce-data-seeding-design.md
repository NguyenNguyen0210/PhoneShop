# Thiết Kế Kỹ Thuật: Seed Dữ Liệu Thương Mại Điện Tử Thực Tế Cho MobileCommerce

**Ngày lập:** 2026-10-03  
**Trạng thái:** Đã phê duyệt (Approved)  
**File thực thi mục tiêu:** `backend/prisma/seed.ts`  
**Lệnh kích hoạt:** `npx prisma db seed` hoặc `npm run prisma:seed`

---

## 1. Mục Tiêu & Phạm Vi (Goals & Scope)

### 1.1. Mục Tiêu
* Cung cấp một bộ dữ liệu demo toàn diện, sinh động và chân thực như một sàn/hệ thống bán lẻ điện thoại di động thực tế tại Việt Nam.
* Giúp giao diện cửa hàng (Storefront) và trang quản trị (Admin Dashboard) hiển thị biểu đồ doanh thu, danh sách đơn hàng, thống kê kho, phân phối vận chuyển và tương tác đánh giá sản phẩm một cách chuyên nghiệp và tự nhiên.
* Đảm bảo tính toàn vẹn 100% về mặt quan hệ dữ liệu (Foreign Keys, Quan hệ 1-1, 1-N, Enums) và quy chuẩn kỹ thuật (thuật toán Luhn cho IMEI, mã vận đơn thực tế, CCCD 12 số).

### 1.2. Phạm Vi Thực Hiện
* **Bảo tồn:** Toàn bộ danh mục sản phẩm (`Brand`, `Category`, `Product`, `ProductVariant`) hiện có trong hệ thống.
* **Làm sạch có chọn lọc (Clean & Fresh):** Xóa các bảng dữ liệu giao dịch cũ (Đơn hàng, Đánh giá, Trả góp, Bảo hành, Vận chuyển, v.v.) và các tài khoản khách hàng demo cũ; giữ lại 2 tài khoản quản trị cốt lõi: `admin@mobilecommerce.vn` và `staff@mobilecommerce.vn`.
* **Cơ chế mật khẩu:** Mật khẩu đồng bộ cho tất cả tài khoản là `Password@123` (tính toán `bcrypt.hash` 1 lần duy nhất trong bộ nhớ).
* **Kiến trúc file:** Tích hợp trực tiếp vào file nguyên khối `backend/prisma/seed.ts`.

---

## 2. Quy Trình Dọn Dẹp Dữ Liệu An Toàn (Cascade Cleanup Order)

Do các ràng buộc khóa ngoại (Foreign Key Constraints) nghiêm ngặt trong PostgreSQL, quy trình dọn dẹp sẽ thực hiện tuần tự theo chiều từ bảng con đến bảng cha:

1. `audit_logs`
2. `idempotency_records`
3. `notifications`
4. `warranties`
5. `refunds`
6. `return_items`
7. `returns`
8. `review_replies`
9. `reviews`
10. `voucher_usages`
11. `wishlist_items`
12. `wishlists`
13. `cart_items`
14. `carts`
15. `installment_applications`
16. `payment_transactions`
17. `payments`
18. `shippings`
19. `order_items`
20. `orders`
21. `imei_devices` (làm sạch toàn bộ để sinh mới lại theo trạng thái kho và đơn hàng)
22. `addresses`
23. `user_roles` (chỉ xóa role của các user khách hàng, giữ lại user admin & staff)
24. `refresh_tokens`
25. `users` (xóa toàn bộ tài khoản ngoại trừ `admin@mobilecommerce.vn` và `staff@mobilecommerce.vn`)

---

## 3. Chi Tiết Thực Thể Dữ Liệu Cần Seed

### 3.1. Vai Trò (Roles) & Tài Khoản Cốt Lõi (Core Users)
* **Roles:** `ADMIN`, `STAFF`, `USER`.
* **Tài khoản cốt lõi:**
  * Admin: `admin@mobilecommerce.vn` (Mật khẩu: `Password@123`, Họ tên: Hệ Thống Admin, SĐT: `0901000001`).
  * Staff: `staff@mobilecommerce.vn` (Mật khẩu: `Password@123`, Họ tên: Hỗ Trợ Kỹ Thuật, SĐT: `0901000002`).

### 3.2. Khách Hàng (Customers) & Sổ Địa Chỉ (Addresses)
* **Số lượng:** 40 khách hàng thực tế với họ và tên tiếng Việt đa dạng (Nguyễn, Trần, Lê, Phạm, Hoàng, Vũ, Đặng, Bùi, Đỗ, Hồ...).
* **Email & SĐT:** Định dạng chuẩn (`hoang.nam.92@gmail.com`, `thu.trang.mobile@gmail.com`...), SĐT 10 số đầu 090, 091, 098, 097...
* **Địa chỉ:** Mỗi khách hàng có từ 1 đến 2 địa chỉ:
  * Loại: `HOME` hoặc `WORK`.
  * Địa chỉ dòng 1: Tên đường, số nhà hoặc tòa nhà văn phòng cụ thể.
  * Phường/Xã, Quận/Huyện, Tỉnh/Thành phố: Phủ rộng khắp TP. Hồ Chí Minh, Hà Nội, Đà Nẵng, Cần Thơ, Hải Phòng, Bình Dương, Đồng Nai.
  * Quốc gia: `Vietnam`.
  * Có cờ `isDefault` cho địa chỉ chính.

### 3.3. Kho Hàng (Inventory) & Thiết Bị IMEI (ImeiDevice)
* **Duyệt qua toàn bộ `ProductVariant` trong DB:**
  * Tính toán tổng số lượng máy cần thiết: máy bán ra cho các đơn hàng (`SOLD`) + tồn kho khả dụng (`AVAILABLE` từ 15 đến 30 máy mỗi biến thể).
  * Cập nhật bản ghi `Inventory`:
    * `quantity = totalCreated`
    * `availableQty = totalAvailable`
    * `reservedQty = 0`
    * `reorderLevel = 5`
  * Sinh mã IMEI đạt chuẩn **Luhn Algorithm** (15 chữ số) qua hàm `generateLuhnImei`.
  * Mã Serial định dạng: `SN-[SKU]-[INDEX]`.
  * Giá vốn nhập hàng: `purchasePrice = variant.costPrice`.

### 3.4. Bộ Mã Giảm Giá (Vouchers) & Lịch Sử Sử Dụng (VoucherUsage)
* Tạo 6 voucher kích cầu hấp dẫn:
  1. `WELCOME50`: Giảm 50.000đ cho đơn từ 500.000đ.
  2. `FREESHIP`: Miễn phí vận chuyển tối đa 35.000đ cho đơn từ 200.000đ.
  3. `TECHVIP10`: Giảm 10% tối đa 1.000.000đ cho thành viên VIP.
  4. `FLAGSHIP500`: Giảm trực tiếp 500.000đ cho đơn từ 15.000.000đ.
  5. `SALEMIDMONTH`: Giảm 200.000đ dịp giữa tháng cho đơn từ 5.000.000đ.
  6. `APPFIRST`: Giảm 100.000đ cho đơn đầu tiên.
* Phân bổ sử dụng voucher vào ~30% số đơn hàng sinh ra, tạo bản ghi `VoucherUsage` tương ứng.

### 3.5. Đơn Hàng (Orders) & Quy Trình Vòng Đời Bán Hàng
* **Quy mô:** 200 đơn hàng.
* **Thời gian (Timeline Distribution):** Trải đều trong 180 ngày qua (từ 6 tháng trước tới nay) để tạo biểu đồ doanh thu liên tục, tăng trưởng ổn định.
* **Mã đơn hàng:** `MC-YYYYMMDD-XXXX` (VD: `MC-20260715-0102`).
* **Phân phối trạng thái đơn hàng:**
  * `COMPLETED` (~65%): Đơn hoàn tất thành công, có ngày giao, thanh toán `PAID`, gán mã IMEI máy `SOLD`, sinh gói bảo hành điện tử.
  * `DELIVERED` (~10%): Đã giao hàng thành công vài ngày trước, chờ người dùng đánh giá.
  * `SHIPPING` (~10%): Đang trên đường giao, liên kết bản ghi vận chuyển `IN_TRANSIT`.
  * `PROCESSING` (~5%): Đang đóng gói xuất kho.
  * `PENDING` (~5%): Đơn hàng mới đặt chờ xác nhận.
  * `CANCELLED` (~5%): Khách hàng hủy đơn, có lý do thực tế (`Khách muốn đổi sang bản dung lượng cao hơn`, `Đặt nhầm màu sắc`...).
* **Chi tiết đơn hàng (`OrderItem`):**
  * Mỗi đơn gồm từ 1 đến 3 sản phẩm ngẫu nhiên.
  * Giá đơn vị lấy theo `variant.price`, tính tổng `subtotal`, `discountAmount`, `shippingFee`, `totalAmount`.
  * Đối với các đơn đã giao (`DELIVERED`, `COMPLETED`), gán chính xác `imeiDeviceId` của thiết bị có trạng thái `SOLD`.
* **Vận chuyển (`Shipping`):**
  * Đơn vị: *Giao Hàng Nhanh (GHN)*, *Viettel Post (VTP)*, *Giao Hàng Tiết Kiệm (GHTK)*.
  * Mã vận đơn ngẫu nhiên theo chuẩn nhà xe (VD: `GHN74829103`, `VTP83920194`).
  * Trạng thái đồng bộ với đơn hàng (`DELIVERED`, `IN_TRANSIT`, `PICKED_UP`, `PENDING`).
* **Thanh toán (`Payment` & `PaymentTransaction`):**
  * Phương thức: `COD` (35%), `VNPAY` (30%), `MOMO` (15%), `BANK_TRANSFER` (10%), `INSTALLMENT` (10%).
  * Trạng thái: `PAID` (đối với các đơn thành công/đang giao đã trả trước) hoặc `PENDING` (với đơn COD chờ nhận hàng).
  * Bản ghi giao dịch ngân hàng có mã `transCode` và `providerReference` thực tế.

### 3.6. Hồ Sơ Mua Trả Góp (Installment Applications)
* Sinh ~20 hồ sơ gắn liền với các đơn hàng có phương thức thanh toán `INSTALLMENT`.
* Nhà tài chính: `HOME_CREDIT` hoặc `FE_CREDIT`.
* Kỳ hạn: 6, 9, hoặc 12 tháng.
* Tỷ lệ trả trước: 20%, 30%, hoặc 50%.
* Thông tin định danh:
  * Họ tên khớp với khách hàng đặt đơn.
  * Số CCCD: 12 chữ số hợp lệ (VD: `079201004821`).
  * Mức thu nhập: `10 - 15 triệu`, `15 - 25 triệu`, `Trên 25 triệu`.
  * Ảnh CCCD: URL ảnh mẫu Cloudflare R2 đã cấu hình.
* Trạng thái hồ sơ:
  * 80% `APPROVED`: Đã được duyệt bởi `staff@mobilecommerce.vn`, đơn hàng chuyển sang `COMPLETED` / `SHIPPING`.
  * 10% `PENDING`: Hồ sơ mới gửi chờ thẩm định.
  * 10% `REJECTED`: Bị từ chối với lý do "Điểm tín dụng CIC không đạt chuẩn".

### 3.7. Bảo Hành Điện Tử (Warranties) & Đổi Trả (Returns & Refunds)
* **Bảo hành điện tử (`Warranty`):**
  * Tạo cho 100% các thiết bị IMEI trong các đơn hàng `DELIVERED` hoặc `COMPLETED`.
  * Mã bảo hành: `WAR-2026-XXXXXX`.
  * Trạng thái: Đa số `ACTIVE` (thời hạn 12 tháng tính từ ngày giao hàng), một số đơn cũ hơn từ đợt chạy test trước có thể có trạng thái `EXPIRED`.
* **Đổi trả hàng (`Return` & `Refund`):**
  * Sinh 4-6 đơn đổi trả từ các khách hàng đã nhận máy.
  * Lý do: `Màn hình có 1 điểm chết pixel`, `Khay SIM bị lỏng`, `Đổi ý muốn lên đời Pro Max`.
  * Trạng thái: `COMPLETED` (đã hoàn tiền qua ngân hàng kèm mã `Refund`), `INSPECTING` (đang thẩm định tại trung tâm bảo hành), và `REJECTED` (máy bị cấn móp do người dùng).

### 3.8. Đánh Giá Sản Phẩm (Reviews) & Phản Hồi Từ Shop (ReviewReplies)
* **Số lượng:** ~120 đánh giá phong phú gắn vào các sản phẩm trong danh mục.
* **Tác giả:** Là các khách hàng trong danh sách 40 user đã mua sản phẩm đó (`isVerified = true`).
* **Trạng thái:** 95% `APPROVED` (hiển thị trực tiếp lên Storefront), 5% `PENDING`.
* **Tỷ lệ rating:** 5 sao (70%), 4 sao (20%), 3 sao (10%).
* **Nội dung:** Viết chi tiết bằng tiếng Việt tự nhiên về: thời lượng pin, độ mượt của màn hình 120Hz, camera chụp đêm/chân dung, trải nghiệm cầm nắm viền titan, tốc độ giao hàng, thái độ phục vụ.
* **Phản hồi từ shop (`ReviewReply`):** ~60 đánh giá được nhân viên chăm sóc khách hàng (`staff@mobilecommerce.vn`) phản hồi cảm ơn hoặc hỗ trợ kỹ thuật nhiệt tình, tạo cảm giác một cửa hàng đang vận hành sống động.

### 3.9. Giỏ Hàng Dang Dở (Active Carts) & Danh Sách Yêu Thích (Wishlists)
* Sinh giỏ hàng (`Cart` + 1-3 `CartItem`) cho ~15 khách hàng để khi đăng nhập vào xem giỏ hàng sẽ thấy ngay sản phẩm đang chọn dở.
* Sinh danh sách sản phẩm yêu thích (`Wishlist` + `WishlistItem`) cho ~20 khách hàng.

---

## 4. Kiểm Thử & Tiêu Chí Thành Công (Verification & Success Criteria)
1. **Lệnh chạy:** Thực thi thành công `npx prisma db seed` mà không gặp bất kỳ lỗi xung đột khóa ngoại hay vi phạm ràng buộc Unique.
2. **Độ đầy đủ của dữ liệu:**
   * >= 40 Users & Addresses.
   * >= 200 Orders phân bổ đều đặn trong 6 tháng.
   * >= 15 Hồ sơ Trả góp.
   * >= 100 Warranties gắn với mã IMEI chuẩn Luhn.
   * >= 100 Reviews hiển thị kèm replies của Shop.
3. **Đăng nhập mượt mà:** Bất kỳ user nào (admin, staff, customer) đều đăng nhập thành công với mật khẩu `Password@123`.
4. **Giao diện Storefront & Admin Dashboard:**
   * Trang chủ & Chi tiết sản phẩm hiển thị điểm đánh giá sao, số lượng review chân thực.
   * Admin Dashboard hiển thị biểu đồ doanh thu theo tháng trơn tru và dữ liệu thống kê đơn hàng sinh động.
