# Design Spec: Thông báo lỗi khi Email không tồn tại lúc Khôi phục mật khẩu

- **Date:** 2026-10-10
- **Author:** PhoneShop Engineering Team
- **Topic:** Check Email Existence and Show Error in Forgot Password Flow

---

## 1. Context & Objectives

### Bối cảnh
Trước đây, luồng "Quên mật khẩu" (`forgotPassword`) ở Backend được thiết kế theo khuyến nghị OWASP chống dò quét email (anti-enumeration). Khi người dùng nhập một email không có trong hệ thống, Backend vẫn trả về phản hồi thành công chung chung: `"Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn."`

**Hạn chế:**
Khi người dùng vô tình gõ sai chính tả hoặc nhập email chưa từng đăng ký, Frontend vẫn thông báo "Đã gửi email khôi phục", khiến khách hàng chờ đợi trong vô vọng và trải nghiệm bị ức chế.

### Mục tiêu
1. Khi gửi yêu cầu khôi phục mật khẩu, Backend phải kiểm tra xem email đã đăng ký chưa:
   - Nếu **không tồn tại**: Trả về `NotFoundException` (HTTP 404) với thông báo `"Địa chỉ email này chưa được đăng ký tài khoản trong hệ thống."`.
   - Nếu **tài khoản bị khóa / không kích hoạt**: Trả về `BadRequestException` (HTTP 400) với thông báo `"Tài khoản liên kết với email này đã bị khóa hoặc chưa được kích hoạt."`.
2. Frontend (`LoginPage.tsx`):
   - Bắt lỗi khi gọi API khôi phục mật khẩu.
   - Hiển thị thông báo lỗi rõ ràng (thông qua Toast thông báo và alert lỗi trực quan ngay trên modal khôi phục).
   - Cho phép người dùng chỉnh sửa lại email và gửi lại.
3. Cập nhật unit test ở cả Frontend và Backend để xác minh luồng thành công và luồng báo lỗi.

---

## 2. Chi tiết kỹ thuật (Technical Details)

### 2.1 Backend (`backend/src/modules/auth/auth.service.ts`)
- Thay thế việc trả về `genericResponse` khi `!user` hoặc `user.status !== 'ACTIVE'`.
- Ném lỗi tương ứng:
  ```typescript
  if (!user) {
    this.logger.warn(`Password reset requested for non-existent email: "${normalizedEmail}".`);
    throw new NotFoundException('Địa chỉ email này chưa được đăng ký tài khoản trong hệ thống.');
  }

  if (user.status !== 'ACTIVE') {
    this.logger.warn(`Password reset requested for inactive account: "${normalizedEmail}".`);
    throw new BadRequestException('Tài khoản liên kết với email này đã bị khóa hoặc chưa được kích hoạt.');
  }
  ```
- Import `NotFoundException` từ `@nestjs/common`.

### 2.2 Frontend (`frontend/src/pages/storefront/Auth/LoginPage.tsx`)
- Thêm state `forgotError: string | null` để lưu trữ lỗi trả về từ API.
- Trong `handleForgotPassword`:
  - Reset `setForgotError(null)` khi bắt đầu gửi.
  - Khi `catch (err)`: Lấy thông điệp lỗi qua `getErrorMessage(err)`. Lưu vào `setForgotError(errMsg)` và gọi `notifyError(errMsg)`.
  - Khi người dùng nhập thay đổi ô input `setForgotEmail`: Tự động xóa `forgotError` (`setForgotError(null)`).
- Hiển thị thông báo lỗi inline trực tiếp trong modal Khôi phục mật khẩu (bên dưới phần tiêu đề/mô tả hoặc phía trên nút submit) để người dùng thấy rõ ràng mà không cần phụ thuộc hoàn toàn vào toast.

### 2.3 Tests
1. **Backend Unit Tests (`backend/test/unit/auth-password-reset.spec.ts`)**:
   - Cập nhật case `nonexistent@example.com` mong đợi ném `NotFoundException`.
   - Thêm case cho tài khoản inactive mong đợi ném `BadRequestException`.
2. **Frontend Unit Tests (`frontend/src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx`)**:
   - Thêm test case khi `forgotPassword` reject với lỗi "Địa chỉ email này chưa được đăng ký", xác nhận thông báo lỗi được hiển thị và không chuyển sang trạng thái đã gửi thành công.
