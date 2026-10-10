# Design Spec: Hoàn thiện Xử lý Ngoại lệ và Bản địa hóa Thông báo Lỗi (UX & Localization)

- **Date:** 2026-10-10
- **Author:** PhoneShop Engineering Team
- **Topic:** Comprehensive Error Handling, Auth Edge-cases, and Toast Localization

---

## 1. Context & Objectives

### Bối cảnh
Sau khi kiểm tra toàn bộ luồng nghiệp vụ trên hệ thống PhoneShop, phát hiện một số trường hợp xử lý lỗi thiếu chính xác hoặc chưa thân thiện:
1. **Trùng lặp khi Đăng ký (`AuthService.register`)**: Gộp chung `email` và `phone` vào lỗi `'Email or phone already exists'`, khiến người dùng trùng SĐT bị hiểu nhầm là trùng email.
2. **Đăng nhập tài khoản bị khóa (`AuthService.login`)**: Báo `"Invalid credentials"` (sai email/mật khẩu) khi tài khoản có trạng thái `LOCKED`, khiến người dùng không biết tài khoản mình đã bị khóa.
3. **Lọt thông báo lỗi tiếng Anh thô (`notify.ts`)**: Nhiều ngoại lệ backend (`Warranty not found`, `Insufficient stock`, `You have already reviewed this product`, `Order cannot be cancelled in its current status`) chưa có trong từ điển tiếng Việt `VI_ERROR_MAP` nên hiện nguyên văn tiếng Anh cho khách hàng.
4. **Xử lý âm thầm voucher (`CartPage.tsx`)**: Khi `validateVoucher` trả về `{ valid: false }`, giao diện không hiện thông báo phản hồi cho người dùng.

### Mục tiêu
1. Tách biệt rõ ràng thông báo lỗi khi đăng ký (trùng Email vs trùng SĐT) và đăng nhập (sai mật khẩu vs tài khoản bị khóa).
2. Mở rộng từ điển `VI_ERROR_MAP` trong `notify.ts` để tự động dịch 100% các lỗi tiếng Anh phổ biến từ backend sang tiếng Việt thân thiện.
3. Đảm bảo form áp dụng voucher ở giỏ hàng luôn hiển thị thông báo phản hồi (thành công hoặc lý do không hợp lệ).
4. Viết và cập nhật unit tests để kiểm thử tự động toàn bộ các kịch bản trên.

---

## 2. Chi tiết thiết kế (Technical Details)

### 2.1 Backend: Auth Edge-cases (`backend/src/modules/auth/auth.service.ts`)
- **Trong `register(dto: RegisterDto)`**:
  - Tách truy vấn kiểm tra email và số điện thoại:
    - Nếu trùng `email`: Ném `ConflictException('Địa chỉ email này đã được đăng ký tài khoản.')`.
    - Nếu trùng `phone`: Ném `ConflictException('Số điện thoại này đã được sử dụng cho một tài khoản khác.')`.
- **Trong `login(dto: LoginDto)`**:
  - Nếu `user` tồn tại: Kiểm tra mật khẩu trước.
  - Nếu mật khẩu không khớp: Ném `UnauthorizedException('Email hoặc mật khẩu không chính xác.')`.
  - Nếu mật khẩu đúng nhưng `user.status !== 'ACTIVE'`:
    - Nếu `user.status === 'LOCKED'`: Ném `UnauthorizedException('Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ bộ phận hỗ trợ.')`.
    - Nếu khác: Ném `UnauthorizedException('Tài khoản chưa được kích hoạt hoặc đang tạm ngưng.')`.

### 2.2 Frontend: Bản địa hóa toàn diện trong `notify.ts` (`frontend/src/utils/notify.ts`)
Bổ sung các mẫu regex và thông điệp tiếng Việt trong `VI_ERROR_MAP`:
- `warranty.*not\s*found`: `'Không tìm thấy thông tin bảo hành cho mã/IMEI này.'`
- `already.*reviewed`: `'Bạn đã gửi đánh giá cho sản phẩm này rồi.'`
- `insufficient\s*stock`: `'Số lượng sản phẩm trong kho không đủ đáp ứng.'`
- `out\s*of\s*stock`: `'Phiên bản sản phẩm này hiện đã hết hàng.'`
- `variant.*not\s*found|inactive`: `'Phiên bản sản phẩm không tồn tại hoặc đã ngừng kinh doanh.'`
- `already.*wishlist`: `'Sản phẩm này đã có trong danh sách yêu thích của bạn.'`
- `not.*in\s*wishlist`: `'Sản phẩm không có trong danh sách yêu thích.'`
- `order.*cannot.*cancel|cannot.*cancelled`: `'Đơn hàng không thể hủy ở trạng thái hiện tại.'`
- `already.*paid.*cannot.*cancel`: `'Đơn hàng đã thanh toán không thể tự hủy. Vui lòng liên hệ CSKH để được hỗ trợ.'`
- `order.*not\s*found`: `'Không tìm thấy thông tin đơn hàng.'`
- `address.*not\s*found`: `'Không tìm thấy địa chỉ giao hàng.'`

### 2.3 Frontend: Báo lỗi Voucher ở Giỏ hàng (`frontend/src/pages/storefront/Cart/CartPage.tsx`)
- Trong `handleApplyVoucher`:
  - Khi `res.valid === true`: Áp dụng voucher và gọi `notifySuccess('Áp dụng mã giảm giá thành công!');`.
  - Khi `res.valid === false`: Gọi `notifyError(res.message || 'Mã giảm giá không đủ điều kiện áp dụng cho các sản phẩm đã chọn.');`.

---

## 3. Kế hoạch kiểm thử (Verification Plan)
1. **Backend Tests:**
   - Cập nhật unit test trong `backend/test/unit/auth-password-reset.spec.ts` hoặc `backend/src/modules/auth/__tests__` cho các case: trùng email, trùng SĐT, đăng nhập tài khoản bị khóa, đăng nhập sai pass.
2. **Frontend Tests:**
   - Unit test cho `notify.ts` kiểm tra dịch chính xác các câu lỗi tiếng Anh mới.
   - Unit test cho `CartPage.tsx` kiểm tra case voucher không hợp lệ (`valid: false`).
3. **Full Build & Typecheck:**
   - `npm run build` ở `frontend` và `backend`.
