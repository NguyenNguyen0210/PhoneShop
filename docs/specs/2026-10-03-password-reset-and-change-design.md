# Tài liệu Thiết kế Kỹ thuật: Tính năng Quên mật khẩu & Đổi mật khẩu

- **Ngày tạo:** 2026-10-03
- **Trạng thái:** Đã duyệt thiết kế (Design Approved)
- **Phạm vi:** Backend (NestJS + Prisma + Nodemailer), Frontend (React + Vite + Tailwind CSS + Lucide Icons)

---

## 1. Tổng quan & Mục tiêu

Hệ thống thương mại điện tử PhoneShop cần hoàn thiện hai luồng chức năng quan trọng về xác thực và bảo mật tài khoản:
1. **Quên mật khẩu (Forgot & Reset Password):**
   - Thay thế mock UI trên `LoginPage.tsx` bằng API thực tế gửi email chứa token khôi phục mật khẩu.
   - Thêm trang đặt lại mật khẩu mới `/reset-password` để xác thực token và cập nhật mật khẩu mới an toàn.
2. **Đổi mật khẩu (Change Password):**
   - Kết nối với API backend đã có `POST /users/change-password`.
   - Bổ sung giao diện thẻ "Bảo mật tài khoản" trên `ProfilePage.tsx` cho phép người dùng đổi mật khẩu với đầy đủ validation và phản hồi trực quan.

---

## 2. Kiến trúc & Thiết kế Cơ sở Dữ liệu

### 2.1. Model Prisma: `PasswordResetToken`

Thêm model mới vào `backend/prisma/schema.prisma`:

```prisma
model PasswordResetToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @map("token_hash") @db.VarChar(255)
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}
```

Và cập nhật model `User`:
```prisma
passwordResetTokens PasswordResetToken[]
```

### 2.2. Cơ chế Sinh & Băm Token Bảo mật (OWASP Compliance)
- **Token gửi qua email (Raw Token):** Sinh chuỗi ngẫu nhiên 32 bytes hex bằng `crypto.randomBytes(32).toString('hex')` (64 ký tự).
- **Lưu trong Database (Token Hash):** Mã hóa SHA-256 (`crypto.createHash('sha256').update(rawToken).digest('hex')`) trước khi lưu trường `token_hash`. Không bao giờ lưu token thô trong database.
- **Thời hạn sử dụng:** 15 phút kể từ thời điểm tạo (`expiresAt = Date.now() + 15 * 60 * 1000`).
- **Đơn dụng (Single-use):** Khi mật khẩu được đặt lại thành công, token được gán `usedAt = new Date()`. Bất kỳ yêu cầu tái sử dụng nào cũng sẽ bị từ chối.
- **Thu hồi token cũ:** Khi phát hành token mới cho người dùng, hủy bỏ hoặc vô hiệu hóa các token chưa sử dụng trước đó của họ.

---

## 3. Thiết kế Backend API

### 3.1. `POST /auth/forgot-password`
- **Mô tả:** Tiếp nhận email từ khách hàng và gửi liên kết đặt lại mật khẩu.
- **Bảo vệ:** Rate Limiting 10 requests / phút / IP (`@Throttle(CREDENTIAL_THROTTLE)`).
- **Request Body:**
  ```json
  {
    "email": "customer@example.com"
  }
  ```
- **Chống lộ thông tin (User Enumeration Defense):** Dù email có tồn tại hay không, server luôn phản hồi HTTP 200 thành công với thông báo chung.
- **Gửi Email:**
  - Nếu email tồn tại, sinh raw token, lưu hash vào DB và gọi `emailService.sendPasswordResetEmail(email, resetLink, recipientName)`.
  - Định dạng link: `${FRONTEND_URL}/reset-password?token=${rawToken}`.
- **Response:**
  ```json
  {
    "success": true,
    "message": "Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi tới hộp thư của bạn."
  }
  ```

### 3.2. `GET /auth/verify-reset-token`
- **Mô tả:** Kiểm tra tính hợp lệ và thời hạn của token khi người dùng truy cập trang `/reset-password`.
- **Query Params:** `?token=<rawToken>`
- **Logic:**
  - Băm SHA-256 `rawToken`.
  - Tìm bản ghi khớp `tokenHash`, `usedAt: null`, `expiresAt > new Date()`.
- **Phản hồi khi hợp lệ (HTTP 200):**
  ```json
  {
    "valid": true,
    "email": "cu*****@example.com"
  }
  ```
- **Phản hồi khi không hợp lệ / hết hạn (HTTP 400):**
  ```json
  {
    "statusCode": 400,
    "message": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."
  }
  ```

### 3.3. `POST /auth/reset-password`
- **Mô tả:** Đặt mật khẩu mới bằng token.
- **Bảo vệ:** Rate Limiting `@Throttle(CREDENTIAL_THROTTLE)`.
- **Request Body:**
  ```json
  {
    "token": "raw_token_string",
    "newPassword": "myNewStrongPassword123"
  }
  ```
- **Logic:**
  1. Băm SHA-256 `token`, xác thực token còn hạn và chưa dùng.
  2. Mã hóa `newPassword` bằng `bcrypt.hash(newPassword, 10)`.
  3. Cập nhật `User.passwordHash`.
  4. Đánh dấu `PasswordResetToken.usedAt = new Date()`.
  5. **Bảo mật phiên đăng nhập:** Đánh dấu `revokedAt = new Date()` cho tất cả `RefreshToken` hiện hành của người dùng.
- **Response:**
  ```json
  {
    "success": true,
    "message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."
  }
  ```

### 3.4. `POST /users/change-password` (API sẵn có)
- **Bảo vệ:** `JwtAuthGuard`, `RolesGuard`.
- **Request Body:**
  ```json
  {
    "oldPassword": "currentPassword123",
    "newPassword": "newSecretPassword456"
  }
  ```
- **Logic:** Kiểm tra `oldPassword`, băm và cập nhật `newPassword`, thu hồi tất cả refresh token.

### 3.5. Cập nhật `EmailService`
- Thêm template email HTML chuẩn thương hiệu PhoneShop với nút bấm CTA đặt lại mật khẩu và cảnh báo bảo mật thời hạn 15 phút.
- Hỗ trợ Mock fallback ghi log ra console khi chưa thiết lập SMTP host/credentials.

---

## 4. Thiết kế Frontend & Giao diện (UI/UX)

### 4.1. Định hướng Thẩm mỹ (Aesthetic Direction)
- Phong cách: **Modern Consumer Tech Retail** (thống nhất với Storefront PhoneShop).
- Palette màu: Nền `#f8fafc`, card `white`, bo góc `rounded-2xl` / `rounded-3xl`, viền `slate-200`, accent `blue-600` (hover `blue-700`), text `slate-900` / `slate-500`.

### 4.2. Modal Quên Mật Khẩu trên `LoginPage.tsx`
- Tích hợp `authService.forgotPassword(email)`.
- Trạng thái loading: Disable nút, hiển thị spinner.
- Trạng thái lỗi: Banner cảnh báo màu đỏ tinh tế.
- Trạng thái hoàn tất: Màn hình xác nhận thành công với icon `CheckCircle2` màu xanh và hướng dẫn kiểm tra email/hộp thư spam.

### 4.3. Trang Đặt Lại Mật Khẩu (`ResetPasswordPage.tsx` - Route: `/reset-password`)
- Bố cục: Centered Card sang trọng trên nền `#f8fafc`.
- Độ phủ trạng thái:
  1. **Đang kiểm tra (Verifying):** Skeleton/spinner tải ban đầu.
  2. **Link không hợp lệ / Hết hạn (Invalid/Expired):** Card cảnh báo lỗi với icon `AlertCircle`, thông điệp rõ ràng và nút *"Yêu cầu gửi lại link mới"* dẫn về `/login`.
  3. **Nhập mật khẩu mới (Ready):** Ô mật khẩu mới và xác nhận mật khẩu, nút toggle xem/ẩn mật khẩu, hint độ dài tối thiểu 6 ký tự.
  4. **Đang gửi (Submitting):** Disable form và hiển thị spinner.
  5. **Thành công (Success):** Thông báo chúc mừng xanh lá, tự động đếm ngược chuyển về `/login` sau 3 giây hoặc nút bấm *"Đăng nhập ngay"*.

### 4.4. Thẻ "Bảo Mật Tài Khoản" trên `ProfilePage.tsx`
- Bố trí: Thẻ Card riêng biệt ngay dưới thông tin cá nhân và phía trên Lịch sử đặt hàng.
- Thành phần:
  - Header: Icon `ShieldCheck`, tiêu đề *"Bảo mật tài khoản"*, chú thích *"Đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn"*.
  - Form:
    - Mật khẩu hiện tại (toggle xem/ẩn).
    - Mật khẩu mới (tối thiểu 6 ký tự, toggle xem/ẩn).
    - Xác nhận mật khẩu mới (validation so khớp trực tiếp).
    - Nút bấm *"Cập nhật mật khẩu"* với icon `KeyRound`.
  - Alert thông báo phản hồi (Thành công / Sai mật khẩu cũ / Lỗi kết nối).
  - Tự động reset input sau khi đổi thành công.

---

## 5. Kế hoạch Kiểm thử & Xác thực (Verification)

1. **Unit & Integration Tests Backend:**
   - Test `forgotPassword`: Kiểm tra sinh token hash, tạo bản ghi trong DB, gọi `EmailService`.
   - Test `verifyResetToken`: Token hợp lệ trả về `valid: true`, token hết hạn/đã dùng trả về lỗi 400.
   - Test `resetPassword`: Cập nhật mật khẩu mới, đánh dấu `usedAt`, thu hồi `refreshTokens`.
   - Test `changePassword`: Đổi mật khẩu đúng, báo lỗi khi nhập sai mật khẩu cũ.
2. **Frontend End-to-End / Component Verification:**
   - Kiểm tra gửi email quên mật khẩu từ modal Login.
   - Kiểm tra mở link `/reset-password?token=...` với token hợp lệ và token giả/hết hạn.
   - Kiểm tra đổi mật khẩu thành công và đăng nhập lại bằng mật khẩu mới.
   - Kiểm tra form đổi mật khẩu trên trang Profile của người dùng đã đăng nhập.
