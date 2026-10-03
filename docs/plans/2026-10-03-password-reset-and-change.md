# Password Reset & Change Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai hoàn chỉnh hai tính năng Quên mật khẩu (gửi email link reset token an toàn + trang đặt lại mật khẩu) và Đổi mật khẩu (form bảo mật trên Profile) với kiến trúc tách biệt cho phép các agent chạy song song.

**Architecture:** 
- Backend sử dụng bảng `PasswordResetToken` trong Prisma lưu SHA-256 hash của token đơn dụng 15 phút, gửi email qua `EmailService` (có mock fallback) và cung cấp các endpoint forgot/verify/reset với rate limit `@Throttle(CREDENTIAL_THROTTLE)`.
- Frontend phân chia thành 2 nhánh độc lập: (1) Nhánh Auth gồm Modal quên mật khẩu ở `LoginPage.tsx` và trang `ResetPasswordPage.tsx` mới; (2) Nhánh Profile gồm Thẻ "Bảo mật tài khoản" trên `ProfilePage.tsx` gọi endpoint sẵn có `POST /users/change-password`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Bcrypt, Crypto, Nodemailer, React 18, TypeScript, Tailwind CSS, Lucide Icons.

---

## Phân chia các Luồng Agent Song song (Parallel Streams)

```
                       [Bắt đầu]
                           |
        +------------------+------------------+
        |                                     |
    [STREAM A: Backend]             [STREAM B: Frontend Đổi mật khẩu]
    Tasks: 1, 2, 3                  Task: 4
    (Prisma, EmailService, Auth)    (ProfilePage Change Password Card)
        |                                     |
        |                           [STREAM C: Frontend Quên mật khẩu]
        |                           Tasks: 5, 6
        |                           (LoginPage Modal & ResetPasswordPage)
        |                                     |
        +------------------+------------------+
                           |
              [Giai đoạn Tổng hợp & E2E Test]
                           Task: 7
```

- **Stream A (Backend):** Hoàn toàn độc lập trên thư mục `backend/` (Database migration, EmailService, DTOs, AuthService, AuthController, Unit tests).
- **Stream B (Frontend - Đổi mật khẩu):** Hoàn toàn độc lập trên `ProfilePage.tsx` (kết nối endpoint backend `POST /users/change-password` vốn đã có sẵn).
- **Stream C (Frontend - Quên mật khẩu):** Thực hiện trên `LoginPage.tsx`, `ResetPasswordPage.tsx`, `AppRoutes.tsx` và `authService.ts`.
- **Stream D (Integration):** Kiểm thử tích hợp toàn diện luồng end-to-end cả 2 tính năng.

---

## Danh sách Files sẽ tạo hoặc chỉnh sửa

### Stream A: Backend
- Sửa: `backend/prisma/schema.prisma`
- Sửa: `backend/src/infrastructure/email/email.service.ts`
- Tạo: `backend/src/modules/auth/dto/forgot-password.dto.ts`
- Tạo: `backend/src/modules/auth/dto/reset-password.dto.ts`
- Sửa: `backend/src/modules/auth/auth.service.ts`
- Sửa: `backend/src/modules/auth/auth.controller.ts`
- Tạo: `backend/test/unit/auth-password-reset.spec.ts`

### Stream B: Frontend - Đổi mật khẩu
- Tạo: `frontend/src/services/userService.ts` (hoặc mở rộng `authService.ts`)
- Tạo: `frontend/src/pages/storefront/Profile/components/ChangePasswordCard.tsx`
- Sửa: `frontend/src/pages/storefront/Profile/ProfilePage.tsx`

### Stream C: Frontend - Quên mật khẩu
- Sửa: `frontend/src/services/authService.ts`
- Sửa: `frontend/src/pages/storefront/Auth/LoginPage.tsx`
- Tạo: `frontend/src/pages/storefront/Auth/ResetPasswordPage.tsx`
- Sửa: `frontend/src/routes/AppRoutes.tsx`

---

## STREAM A: Backend API Quên & Đặt lại mật khẩu

### Task 1: Prisma Schema & Email Service Template

**Files:**
- Sửa: `backend/prisma/schema.prisma`
- Sửa: `backend/src/infrastructure/email/email.service.ts`

- [ ] **Step 1: Cập nhật schema.prisma thêm model PasswordResetToken**

Thêm model `PasswordResetToken` vào cuối `backend/prisma/schema.prisma` và thêm quan hệ `passwordResetTokens PasswordResetToken[]` vào model `User`.

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

- [ ] **Step 2: Chạy Prisma Generate & Push / Migrate**

Run:
```bash
cd backend && npx prisma generate && npx prisma db push
```
Expected: Cập nhật Prisma Client thành công và tạo bảng `password_reset_tokens` trong database.

- [ ] **Step 3: Bổ sung phương thức sendPasswordResetEmail vào EmailService**

Mở `backend/src/infrastructure/email/email.service.ts` và thêm hàm:

```typescript
  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    recipientName?: string,
  ): Promise<void> {
    const greeting = recipientName ? `Xin chào <strong>${escapeHtml(recipientName)}</strong>,` : 'Xin chào bạn,';
    await this.send({
      to,
      subject: '[PhoneShop] Yêu cầu đặt lại mật khẩu',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;rounded:16px">
          <h2 style="color:#2563eb;margin-bottom:16px">🔐 Đặt lại mật khẩu tài khoản PhoneShop</h2>
          <p>${greeting}</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này.</p>
          <div style="margin:28px 0;text-align:center">
            <a href="${resetLink}" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;font-weight:bold;text-decoration:none;border-radius:10px;display:inline-block">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="font-size:13px;color:#64748b">Liên kết này có hiệu lực trong <strong>15 phút</strong> và chỉ sử dụng được 01 lần duy nhất.</p>
          <p style="font-size:12px;color:#94a3b8">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn vẫn an toàn tuyệt đối.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
          <small style="color:#94a3b8">PhoneShop — Hệ thống bán lẻ thiết bị di động chính hãng</small>
        </div>
      `,
    });
  }
```

- [ ] **Step 4: Commit Task 1**

```bash
git add backend/prisma/schema.prisma backend/src/infrastructure/email/email.service.ts
git commit -m "feat(backend): add PasswordResetToken schema and email service template"
```

---

### Task 2: DTOs & AuthService logic cho Forgot/Verify/Reset Password

**Files:**
- Tạo: `backend/src/modules/auth/dto/forgot-password.dto.ts`
- Tạo: `backend/src/modules/auth/dto/reset-password.dto.ts`
- Sửa: `backend/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Tạo forgot-password.dto.ts**

Tạo file `backend/src/modules/auth/dto/forgot-password.dto.ts`:
```typescript
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}
```

- [ ] **Step 2: Tạo reset-password.dto.ts**

Tạo file `backend/src/modules/auth/dto/reset-password.dto.ts`:
```typescript
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Raw token received via email' })
  @IsString()
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' })
  newPassword: string;
}
```

- [ ] **Step 3: Triển khai forgotPassword, verifyResetToken, resetPassword trong AuthService**

Sửa `backend/src/modules/auth/auth.service.ts`:
1. Import `* as crypto from 'crypto';` và `import * as bcrypt from 'bcrypt';`
2. Inject `EmailService` vào constructor nếu chưa có: `private readonly emailService: EmailService,`
3. Thêm các hàm nghiệp vụ:
   - `forgotPassword(dto: ForgotPasswordDto)`:
     - Chuẩn hóa email `dto.email.toLowerCase().trim()`.
     - Tìm user. Nếu không tìm thấy, trả về `{ success: true, message: '...' }` (chống dò email).
     - Nếu tìm thấy: vô hiệu hóa các token cũ chưa dùng của user (`updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } })`).
     - Sinh `rawToken = crypto.randomBytes(32).toString('hex')`.
     - Tính `tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')`.
     - Lưu vào `this.prisma.passwordResetToken.create(...)` với `expiresAt = new Date(Date.now() + 15 * 60 * 1000)`.
     - Lấy `frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173')`.
     - Tạo `resetLink = ${frontendUrl}/reset-password?token=${rawToken}`.
     - Gọi `this.emailService.sendPasswordResetEmail(user.email, resetLink, user.firstName || user.email)`.
     - Trả về `{ success: true, message: '...' }`.
   - `verifyResetToken(token: string)`:
     - Nếu không có token, throw `BadRequestException('Token không hợp lệ')`.
     - Tính `tokenHash = crypto.createHash('sha256').update(token).digest('hex')`.
     - Tìm token khớp `tokenHash`, `usedAt: null`, `expiresAt: { gt: new Date() }`, include `user: true`.
     - Nếu không thấy, throw `BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn')`.
     - Mask email của user (ví dụ `ng***@gmail.com`) và trả về `{ valid: true, email: maskedEmail }`.
   - `resetPassword(dto: ResetPasswordDto)`:
     - Tính `tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex')`.
     - Tìm token còn hiệu lực (`usedAt: null`, `expiresAt > now()`).
     - Nếu không thấy, throw `BadRequestException('Liên kết đã hết hạn hoặc không hợp lệ')`.
     - Băm mật khẩu mới: `passwordHash = await bcrypt.hash(dto.newPassword, 10)`.
     - Update user: `this.prisma.user.update({ where: { id: tokenRecord.userId }, data: { passwordHash } })`.
     - Đánh dấu token đã dùng: `this.prisma.passwordResetToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } })`.
     - Thu hồi toàn bộ phiên đăng nhập: `this.prisma.refreshToken.updateMany({ where: { userId: tokenRecord.userId, revokedAt: null }, data: { revokedAt: new Date() } })`.
     - Trả về `{ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' }`.

- [ ] **Step 4: Commit Task 2**

```bash
git add backend/src/modules/auth/dto/ backend/src/modules/auth/auth.service.ts
git commit -m "feat(backend): implement forgot, verify, and reset password service methods"
```

---

### Task 3: AuthController Endpoints & Unit Tests

**Files:**
- Sửa: `backend/src/modules/auth/auth.controller.ts`
- Tạo: `backend/test/unit/auth-password-reset.spec.ts`

- [ ] **Step 1: Khai báo 3 endpoint mới trong AuthController**

Sửa `backend/src/modules/auth/auth.controller.ts`:
- Import `ForgotPasswordDto`, `ResetPasswordDto` và `@Query`
- Thêm:
```typescript
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Get('verify-reset-token')
  @ApiOperation({ summary: 'Verify password reset token validity' })
  async verifyResetToken(@Query('token') token: string) {
    return this.authService.verifyResetToken(token);
  }

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
```

- [ ] **Step 2: Viết Unit Test cho Auth Password Reset**

Tạo `backend/test/unit/auth-password-reset.spec.ts` kiểm tra:
1. `forgotPassword`: tạo token trong DB và gửi email khi email tồn tại.
2. `forgotPassword`: trả về success mà không throw khi email không tồn tại.
3. `verifyResetToken`: trả về valid khi token đúng hạn, throw BadRequest khi token sai hoặc hết hạn.
4. `resetPassword`: băm mật khẩu, cập nhật User, gán usedAt cho token và revoke refresh tokens.

- [ ] **Step 3: Chạy Unit Test kiểm tra Pass**

Run:
```bash
cd backend && npm test -- test/unit/auth-password-reset.spec.ts
```
Expected: Tất cả các bài test trong `auth-password-reset.spec.ts` đều PASS.

- [ ] **Step 4: Commit Task 3**

```bash
git add backend/src/modules/auth/auth.controller.ts backend/test/unit/auth-password-reset.spec.ts
git commit -m "feat(backend): add forgot and reset password endpoints with unit tests"
```

---

## STREAM B: Frontend Đổi Mật Khẩu (ProfilePage)

### Task 4: Component Thẻ "Bảo Mật Tài Khoản" trên ProfilePage

**Files:**
- Tạo: `frontend/src/services/userService.ts` (hoặc mở rộng `authService.ts`)
- Tạo: `frontend/src/pages/storefront/Profile/components/ChangePasswordCard.tsx`
- Sửa: `frontend/src/pages/storefront/Profile/ProfilePage.tsx`

- [ ] **Step 1: Khai báo hàm changePassword trong service**

Mở `frontend/src/services/authService.ts` (hoặc tạo `userService.ts`):
```typescript
  async changePassword(data: { oldPassword: string; newPassword: string }): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post('/users/change-password', data);
    return response.data?.data ?? response.data;
  },
```

- [ ] **Step 2: Tạo component ChangePasswordCard.tsx**

Tạo `frontend/src/pages/storefront/Profile/components/ChangePasswordCard.tsx`:
- Thiết kế: Thẻ `bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5`.
- Header: Icon `ShieldCheck` màu xanh, tiêu đề "Bảo mật tài khoản", phụ đề "Đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn".
- Form nhập:
  - Mật khẩu hiện tại (input type="password" / "text" với nút bấm Toggle `Eye` / `EyeOff`).
  - Mật khẩu mới (input toggle `Eye`/`EyeOff`, hint tối thiểu 6 ký tự).
  - Xác nhận mật khẩu mới.
- Xử lý tương tác:
  - Client validation: Báo lỗi nếu mật khẩu mới < 6 ký tự hoặc không khớp xác nhận.
  - Gọi API `authService.changePassword({ oldPassword, newPassword })`.
  - Hiển thị Alert xanh khi thành công ("Đổi mật khẩu thành công!"), tự động reset form.
  - Hiển thị Alert đỏ khi thất bại ("Mật khẩu hiện tại không chính xác" hoặc lỗi server).
  - Nút bấm có hiệu ứng loading spinner khi đang submit.

- [ ] **Step 3: Nhúng ChangePasswordCard vào ProfilePage.tsx**

Mở `frontend/src/pages/storefront/Profile/ProfilePage.tsx`:
- Import `ChangePasswordCard` từ `./components/ChangePasswordCard`.
- Đặt thẻ `<ChangePasswordCard />` ngay bên dưới Profile Card (thông tin cá nhân) và phía trên Order History Card (`#orders-section`).

- [ ] **Step 4: Kiểm tra build TypeScript Frontend**

Run:
```bash
cd frontend && npm run build
```
Expected: Build thành công không có lỗi TypeScript hay cú pháp JSX.

- [ ] **Step 5: Commit Task 4**

```bash
git add frontend/src/services/authService.ts frontend/src/pages/storefront/Profile/
git commit -m "feat(storefront): add change password card to customer profile"
```

---

## STREAM C: Frontend Quên & Đặt Lại Mật Khẩu

### Task 5: Tích hợp API cho Modal Quên mật khẩu tại LoginPage.tsx

**Files:**
- Sửa: `frontend/src/services/authService.ts`
- Sửa: `frontend/src/pages/storefront/Auth/LoginPage.tsx`

- [ ] **Step 1: Bổ sung các hàm forgotPassword và resetPassword vào authService.ts**

Mở `frontend/src/services/authService.ts` thêm:
```typescript
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data?.data ?? response.data;
  },

  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const response = await apiClient.get('/auth/verify-reset-token', { params: { token } });
    return response.data?.data ?? response.data;
  },

  async resetPassword(data: { token: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data?.data ?? response.data;
  },
```

- [ ] **Step 2: Cập nhật LoginPage.tsx kết nối API thật**

Mở `frontend/src/pages/storefront/Auth/LoginPage.tsx`:
- Thêm state `forgotLoading`, `forgotError`.
- Sửa `handleForgotPassword`:
  - Validate email không rỗng.
  - Set `forgotLoading(true)` và xóa `forgotError`.
  - Gọi `await authService.forgotPassword(forgotEmail)`.
  - Thành công: `setForgotSubmitted(true)`.
  - Thất bại: hiển thị `forgotError`.
- Cập nhật giao diện modal:
  - Disable input và nút bấm khi `forgotLoading === true`.
  - Nút bấm hiển thị spinner loading khi đang gửi.
  - Hiển thị Alert đỏ nếu `forgotError` có giá trị.

- [ ] **Step 3: Commit Task 5**

```bash
git add frontend/src/services/authService.ts frontend/src/pages/storefront/Auth/LoginPage.tsx
git commit -m "feat(storefront): connect forgot password modal to backend API"
```

---

### Task 6: Xây dựng Trang Đặt Lại Mật Khẩu (ResetPasswordPage.tsx)

**Files:**
- Tạo: `frontend/src/pages/storefront/Auth/ResetPasswordPage.tsx`
- Sửa: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Tạo ResetPasswordPage.tsx với đầy đủ ma trận trạng thái**

Tạo `frontend/src/pages/storefront/Auth/ResetPasswordPage.tsx`:
- Lấy `token` từ URL query: `const [searchParams] = useSearchParams(); const token = searchParams.get('token');`
- States:
  - `status`: `'VERIFYING' | 'INVALID' | 'FORM' | 'SUCCESS'`
  - `maskedEmail`: string
  - `password`, `confirmPassword`: string
  - `showPassword`, `showConfirm`: boolean
  - `submitting`: boolean
  - `errorMsg`: string
  - `countdown`: number (3 giây)
- Trạng thái 1: `VERIFYING`
  - Gọi `authService.verifyResetToken(token)` trong `useEffect`.
  - Hiển thị spinner "Đang xác thực liên kết...".
  - Nếu token hợp lệ: chuyển sang `status = 'FORM'` và lưu `maskedEmail`.
  - Nếu lỗi: chuyển sang `status = 'INVALID'`.
- Trạng thái 2: `INVALID`
  - Icon `AlertCircle` màu đỏ.
  - Thông báo "Liên kết không hợp lệ hoặc đã hết hạn".
  - Nút "Yêu cầu gửi lại link mới" dẫn về `/login`.
- Trạng thái 3: `FORM`
  - Input mật khẩu mới + Xác nhận mật khẩu mới (Toggle xem/ẩn).
  - Validation: khớp nhau, tối thiểu 6 ký tự.
  - Bấm submit gọi `authService.resetPassword({ token, newPassword: password })`.
  - Thành công: chuyển sang `status = 'SUCCESS'`.
- Trạng thái 4: `SUCCESS`
  - Icon `CheckCircle2` màu xanh lá.
  - Tiêu đề "Đặt lại mật khẩu thành công!".
  - Đếm ngược 3 giây tự động `navigate('/login')`, hoặc nút "Đăng nhập ngay".

- [ ] **Step 2: Đăng ký Route /reset-password trong AppRoutes.tsx**

Mở `frontend/src/routes/AppRoutes.tsx`:
- Import `ResetPasswordPage` từ `../pages/storefront/Auth/ResetPasswordPage`.
- Thêm Route trong nhóm Auth Routes:
```tsx
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

- [ ] **Step 3: Kiểm tra build Frontend**

Run:
```bash
cd frontend && npm run build
```
Expected: Build thành công không có lỗi type hoặc module missing.

- [ ] **Step 4: Commit Task 6**

```bash
git add frontend/src/pages/storefront/Auth/ResetPasswordPage.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(storefront): implement ResetPasswordPage with full state coverage"
```

---

## GIAI ĐOẠN TỔNG HỢP & VERIFICATION

### Task 7: Kiểm thử Tích hợp & Kiểm tra Tổng thể (End-to-End)

**Files:**
- Tạo: `backend/test/integration/password-flow.verification.ts`

- [ ] **Step 1: Viết script verification tích hợp Backend**

Tạo script kiểm tra toàn trình:
1. Đăng ký/đăng nhập test user.
2. Gọi `POST /auth/forgot-password` -> kiểm tra bản ghi `PasswordResetToken` sinh ra trong DB.
3. Lấy `rawToken`, gọi `GET /auth/verify-reset-token` -> kiểm tra `valid: true`.
4. Gọi `POST /auth/reset-password` -> kiểm tra đổi mật khẩu thành công.
5. Thử login bằng mật khẩu mới -> thành công. Thử login bằng mật khẩu cũ -> thất bại.
6. Thử đổi mật khẩu qua `POST /users/change-password` -> thành công.

- [ ] **Step 2: Chạy kiểm thử toàn bộ test suite**

Run:
```bash
cd backend && npm test
```
Expected: Tất cả unit tests đều PASS.

Run:
```bash
cd frontend && npm run build
```
Expected: Frontend build thành công.

- [ ] **Step 3: Commit hoàn thành Task 7**

```bash
git add backend/test/
git commit -m "test: add full integration verification for password reset and change flows"
```
