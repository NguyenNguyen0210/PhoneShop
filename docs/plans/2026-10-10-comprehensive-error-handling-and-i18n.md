# Comprehensive Error Handling and Toast Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện xử lý lỗi và bản địa hóa thông báo cho 3 nhóm: Phân tách lỗi trùng Email/SĐT & báo khóa tài khoản (Backend Auth), mở rộng từ điển dịch lỗi tiếng Việt `notify.ts` (Frontend), và hiển thị phản hồi khi áp dụng voucher không hợp lệ (Frontend Cart).

**Architecture:** Cập nhật `auth.service.ts` tách biệt kiểm tra tính duy nhất của email và phone, đồng thời phân biệt mật khẩu sai với tài khoản bị khóa (`LOCKED`). Bổ sung mapping trong `notify.ts` cho các lỗi phổ biến từ backend. Cập nhật `CartPage.tsx` kiểm tra `res.valid === false` và thông báo lỗi. Cập nhật và bổ sung unit tests.

**Tech Stack:** NestJS, TypeScript, React, Ant Design (message), Vitest, Jest.

---

### Task 1: Backend - Tách lỗi Đăng ký & Báo lỗi tài khoản bị khóa khi Đăng nhập (Parallel Worker 1)

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts:38-120`
- Test: `backend/test/unit/auth-register-login.spec.ts`

- [x] **Step 1: Tạo unit test cho các case đăng ký và đăng nhập mới**
Tạo file test `backend/test/unit/auth-register-login.spec.ts`:
- Test 1: Đăng ký với email đã tồn tại -> ném `ConflictException` chứa `"email này đã được đăng ký"`.
- Test 2: Đăng ký với SĐT đã tồn tại -> ném `ConflictException` chứa `"số điện thoại này đã được sử dụng"`.
- Test 3: Đăng nhập với tài khoản bị `LOCKED` và mật khẩu đúng -> ném `UnauthorizedException` chứa `"tài khoản của bạn đã bị tạm khóa"`.
- Test 4: Đăng nhập với mật khẩu sai -> ném `UnauthorizedException` chứa `"không chính xác"`.

- [x] **Step 2: Cập nhật `auth.service.ts`**
Trong `backend/src/modules/auth/auth.service.ts`:
1. Trong `register(dto: RegisterDto)`:
   ```typescript
   const normalizedEmail = dto.email.toLowerCase().trim();
   const existingEmail = await this.prisma.user.findUnique({
     where: { email: normalizedEmail },
   });
   if (existingEmail) {
     throw new ConflictException('Địa chỉ email này đã được đăng ký tài khoản.');
   }

   if (dto.phone) {
     const existingPhone = await this.prisma.user.findFirst({
       where: { phone: dto.phone },
     });
     if (existingPhone) {
       throw new ConflictException('Số điện thoại này đã được sử dụng cho một tài khoản khác.');
     }
   }
   ```
2. Trong `login(dto: LoginDto)`:
   ```typescript
   if (!user) {
     await bcrypt.compare(dto.password, DUMMY_BCRYPT_HASH);
     throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
   }

   const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
   if (!isPasswordValid) {
     throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
   }

   if (user.status !== 'ACTIVE') {
     if (user.status === 'LOCKED') {
       throw new UnauthorizedException('Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ bộ phận hỗ trợ.');
     }
     throw new UnauthorizedException('Tài khoản chưa được kích hoạt hoặc đang tạm ngưng.');
   }
   ```

- [x] **Step 3: Chạy test backend và commit**
Run: `npm test test/unit/auth-register-login.spec.ts`
Run: `npm run build`
```bash
git add backend/src/modules/auth/auth.service.ts backend/test/unit/auth-register-login.spec.ts
git commit -m "feat(auth): separate duplicate email/phone errors and handle locked accounts"
```

---

### Task 2: Frontend - Mở rộng từ điển dịch lỗi tiếng Việt `notify.ts` (Parallel Worker 2)

**Files:**
- Modify: `frontend/src/utils/notify.ts`
- Test: `frontend/src/utils/__tests__/notify.spec.ts`

- [x] **Step 1: Viết test cho từ điển `notify.spec.ts`**
Tạo file `frontend/src/utils/__tests__/notify.spec.ts`:
- Kiểm tra các chuỗi lỗi tiếng Anh được dịch sang tiếng Việt:
  - `"Warranty not found"` -> `"Không tìm thấy thông tin bảo hành cho mã/IMEI này."`
  - `"You have already reviewed this product"` -> `"Bạn đã gửi đánh giá cho sản phẩm này rồi."`
  - `"Insufficient stock"` -> `"Số lượng sản phẩm trong kho không đủ đáp ứng."`
  - `"Product already in wishlist"` -> `"Sản phẩm này đã có trong danh sách yêu thích của bạn."`
  - `"Order cannot be cancelled in its current status"` -> `"Đơn hàng không thể hủy ở trạng thái hiện tại."`
  - `"Order is already paid and cannot be cancelled directly. Please contact support."` -> `"Đơn hàng đã thanh toán không thể tự hủy. Vui lòng liên hệ CSKH để được hỗ trợ."`

- [x] **Step 2: Cập nhật `notify.ts`**
Thêm các pattern mới vào `VI_ERROR_MAP`:
```typescript
  { match: /warranty.*not\s*found/i, text: 'Không tìm thấy thông tin bảo hành cho mã/IMEI này.' },
  { match: /already.*reviewed/i, text: 'Bạn đã gửi đánh giá cho sản phẩm này rồi.' },
  { match: /insufficient\s*stock/i, text: 'Số lượng sản phẩm trong kho không đủ đáp ứng.' },
  { match: /out\s*of\s*stock/i, text: 'Phiên bản sản phẩm này hiện đã hết hàng.' },
  { match: /variant.*not\s*found|variant.*inactive/i, text: 'Phiên bản sản phẩm không tồn tại hoặc đã ngừng kinh doanh.' },
  { match: /already.*wishlist/i, text: 'Sản phẩm này đã có trong danh sách yêu thích của bạn.' },
  { match: /not.*in\s*wishlist/i, text: 'Sản phẩm không có trong danh sách yêu thích.' },
  { match: /order.*cannot.*cancel|cannot.*cancelled/i, text: 'Đơn hàng không thể hủy ở trạng thái hiện tại.' },
  { match: /already.*paid.*cannot.*cancel/i, text: 'Đơn hàng đã thanh toán không thể tự hủy. Vui lòng liên hệ CSKH để được hỗ trợ.' },
  { match: /order.*not\s*found/i, text: 'Không tìm thấy thông tin đơn hàng.' },
  { match: /address.*not\s*found/i, text: 'Không tìm thấy địa chỉ giao hàng.' },
```

- [x] **Step 3: Chạy test và commit**
Run: `npx vitest run src/utils/__tests__/notify.spec.ts`
```bash
git add frontend/src/utils/notify.ts frontend/src/utils/__tests__/notify.spec.ts
git commit -m "feat(i18n): expand VI_ERROR_MAP with comprehensive business error translations"
```

---

### Task 3: Frontend - Hiển thị phản hồi khi áp dụng Voucher không hợp lệ ở Giỏ hàng (Parallel Worker 3)

**Files:**
- Modify: `frontend/src/pages/storefront/Cart/CartPage.tsx:148-165`
- Test: `frontend/src/pages/storefront/Cart/__tests__/CartPageVoucher.spec.tsx`

- [x] **Step 1: Viết test cho trường hợp voucher `valid: false` trong CartPage**
Tạo file test `frontend/src/pages/storefront/Cart/__tests__/CartPageVoucher.spec.tsx`:
- Render CartPage với sản phẩm được chọn.
- Mock `voucherService.validateVoucher` trả về `{ valid: false, message: 'Đơn hàng tối thiểu 5.000.000đ để áp dụng mã' }`.
- Nhập mã voucher và bấm Áp dụng.
- Kỳ vọng `notifyError` được gọi với thông điệp lỗi rõ ràng.

- [x] **Step 2: Cập nhật `CartPage.tsx`**
Trong `frontend/src/pages/storefront/Cart/CartPage.tsx`:
Cập nhật `handleApplyVoucher`:
```typescript
    try {
      const res = await voucherService.validateVoucher(code, subtotal, selectedItemIds);
      if (res && res.valid && res.voucher) {
        const voucherData = {
          code: res.voucher.code,
          discount: res.discount,
          description: res.voucher.name || res.voucher.description || 'Áp dụng mã giảm giá thành công',
        };
        setAppliedVoucher(voucherData);
        setVoucherCode(res.voucher.code);
        sessionStorage.setItem('phoneshop_voucher', JSON.stringify(voucherData));
        notifySuccess('Áp dụng mã giảm giá thành công!');
      } else {
        const fallbackMsg = (res as any)?.message || 'Mã giảm giá không đủ điều kiện áp dụng cho các sản phẩm đã chọn.';
        notifyError(fallbackMsg);
      }
    } catch (err: any) {
      notifyError(err, 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện đơn hàng tối thiểu.');
    } finally {
      setVoucherLoading(false);
    }
```

- [x] **Step 3: Chạy test và commit**
Run: `npx vitest run src/pages/storefront/Cart/__tests__/CartPageVoucher.spec.tsx`
Run: `npm run build`
```bash
git add frontend/src/pages/storefront/Cart/CartPage.tsx frontend/src/pages/storefront/Cart/__tests__/CartPageVoucher.spec.tsx
git commit -m "feat(cart): notify error when voucher validation returns invalid"
```

---

### Task 4: Merge vào branch `main` và kiểm tra xác minh toàn diện (Integrator)

**Files:**
- Merge branch `feature/comprehensive-error-handling-and-i18n` vào `main`

- [x] **Step 1: Merge vào `main`**
- [x] **Step 2: Chạy full verification trên `main`**
- [x] **Step 3: Dọn dẹp branch feature**
