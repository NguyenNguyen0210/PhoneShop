# Check Email Existence in Forgot Password Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kiểm tra địa chỉ email khi yêu cầu khôi phục mật khẩu; nếu email không tồn tại hoặc tài khoản không hoạt động, ném lỗi rõ ràng từ Backend và hiển thị thông báo lỗi trên giao diện Frontend. Sau đó merge vào branch `main`.

**Architecture:** Cập nhật `auth.service.ts` ném `NotFoundException` (404) khi email không tồn tại và `BadRequestException` (400) khi tài khoản chưa kích hoạt. Cập nhật `LoginPage.tsx` bắt lỗi, cập nhật state `forgotError` và render thông báo trực quan trên modal. Cập nhật unit tests cho cả Backend và Frontend.

**Tech Stack:** NestJS, TypeScript, React, Tailwind CSS, Ant Design (message), Vitest, Jest.

---

### Task 1: Backend - Ném lỗi khi email không tồn tại hoặc inactive (TDD)

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts:410-435`
- Test: `backend/test/unit/auth-password-reset.spec.ts:100-110`

- [ ] **Step 1: Cập nhật unit test trong `auth-password-reset.spec.ts`**
Trong `backend/test/unit/auth-password-reset.spec.ts`:
Cập nhật test case:
```typescript
    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.forgotPassword({ email: 'nonexistent@example.com' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user account is not ACTIVE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-inactive',
        email: 'inactive@example.com',
        status: 'LOCKED',
      });

      await expect(
        authService.forgotPassword({ email: 'inactive@example.com' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
```

- [ ] **Step 2: Cập nhật `auth.service.ts`**
Trong `backend/src/modules/auth/auth.service.ts`:
Đảm bảo `NotFoundException` được import từ `@nestjs/common`.
Thay đổi trong method `forgotPassword`:
```typescript
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: "${normalizedEmail}".`,
      );
      throw new NotFoundException(
        'Địa chỉ email này chưa được đăng ký tài khoản trong hệ thống.',
      );
    }

    if (user.status !== 'ACTIVE') {
      this.logger.warn(
        `Password reset requested for inactive account: "${normalizedEmail}".`,
      );
      throw new BadRequestException(
        'Tài khoản liên kết với email này đã bị khóa hoặc chưa được kích hoạt.',
      );
    }
```

- [ ] **Step 3: Commit backend changes**
```bash
git add backend/src/modules/auth/auth.service.ts backend/test/unit/auth-password-reset.spec.ts
git commit -m "feat(auth): throw NotFoundException if email does not exist in forgotPassword"
```

---

### Task 2: Frontend - Bắt lỗi và hiển thị thông báo lỗi trên Modal Quên mật khẩu

**Files:**
- Modify: `frontend/src/pages/storefront/Auth/LoginPage.tsx`
- Test: `frontend/src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx`

- [ ] **Step 1: Viết test cho trường hợp email không tồn tại trong `LoginPage.spec.tsx`**
Trong `frontend/src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx`:
Thêm test case:
```typescript
  it('displays error message when forgot password email does not exist', async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValueOnce(
      new Error('Địa chỉ email này chưa được đăng ký tài khoản trong hệ thống.')
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Quên mật khẩu\?/i));

    const forgotInput = screen.getByPlaceholderText(/Địa chỉ email đã đăng ký/i);
    fireEvent.change(forgotInput, { target: { value: 'notfound@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Gửi link đặt lại mật khẩu/i }));

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Địa chỉ email này chưa được đăng ký tài khoản trong hệ thống.');
    });
    // Modal remains open with error feedback, does not show success message
    expect(screen.queryByText(/Đã gửi email khôi phục!/i)).toBeNull();
  });
```

- [ ] **Step 2: Cập nhật `LoginPage.tsx`**
Trong `frontend/src/pages/storefront/Auth/LoginPage.tsx`:
1. Thêm state:
   ```typescript
   const [forgotError, setForgotError] = useState<string | null>(null);
   ```
2. Trong `handleForgotPassword`:
   ```typescript
   setForgotError(null);
   // trong catch block:
   const msg = getErrorMessage(err) || 'Không thể gửi email khôi phục. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau.';
   setForgotError(msg);
   notifyError(msg);
   ```
3. Trong `onChange` của ô input `forgotEmail`:
   ```typescript
   onChange={(e) => {
     setForgotEmail(e.target.value);
     if (forgotError) setForgotError(null);
   }}
   ```
4. Reset `forgotError` khi đóng modal.
5. Render banner lỗi trực quan ngay trên modal:
   ```tsx
   {forgotError && (
     <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
       <span>{forgotError}</span>
     </div>
   )}
   ```

- [ ] **Step 3: Chạy test và typecheck**
Run: `npx vitest run src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx`
Run: `npx tsc --noEmit`
Run: `npm run build`

- [ ] **Step 4: Commit frontend changes**
```bash
git add frontend/src/pages/storefront/Auth/LoginPage.tsx frontend/src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx
git commit -m "feat(storefront): display clear error message when forgot password email does not exist"
```

---

### Task 3: Merge vào branch `main` và kiểm tra xác minh toàn diện

**Files:**
- Merge branch `feature/forgot-password-email-check` vào `main`

- [ ] **Step 1: Chuyển sang main và merge**
```bash
git checkout main
git merge feature/forgot-password-email-check
```

- [ ] **Step 2: Chạy verification trên main**
Run: `npm run build` trong `frontend`
Run: `npx vitest run src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx`

- [ ] **Step 3: Dọn dẹp branch feature**
```bash
git branch -d feature/forgot-password-email-check
```
