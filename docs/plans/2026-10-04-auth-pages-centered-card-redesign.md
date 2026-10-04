# Storefront Authentication Pages Centered-Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/register` and `/login` storefront authentication pages from a diluted 2-column split-screen into a high-converting, elegant Centered Card layout (Clean Consumer Tech aesthetic) with an integrated promo voucher ribbon and single-column stacked inputs.

**Architecture:** Encapsulate each auth screen inside an elevated centered card (`max-w-[450px]`, `rounded-3xl`, `shadow-xl`) over a calm `bg-slate-50` backdrop. Replace the verbose right column with a compact banner highlight for the `WELCOME50` (-50.000₫) new user voucher. Maintain all existing state, error alerts, Google OAuth CSRF tokens, and authentication store integrations.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Zustand (`useAuthStore`), React Router DOM v7, Vitest, React Testing Library.

---

## File Structure & Responsibilities

- `frontend/src/pages/storefront/Auth/RegisterPage.tsx`: Storefront user registration page. Refactored from 12-col split screen to centered elevated card with voucher ribbon banner, 1-click Google OAuth, single-column stacked inputs, and validation error states.
- `frontend/src/pages/storefront/Auth/LoginPage.tsx`: Storefront user login page. Refactored from 12-col split screen to matching centered elevated card, retaining remember-me, forgot-password modal, and role-based redirect.
- `frontend/src/pages/storefront/Auth/__tests__/RegisterPage.spec.tsx`: Vitest + Testing Library test suite validating centered card rendering, promo voucher ribbon, form validation, and registration submission.
- `frontend/src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx`: Vitest + Testing Library test suite validating centered card rendering, Google button, login submission, and forgot password modal.

---

### Task 1: Write Unit & Component Tests for Centered RegisterPage

**Files:**
- Create: `frontend/src/pages/storefront/Auth/__tests__/RegisterPage.spec.tsx`

- [ ] **Step 1: Write the failing test suite for RegisterPage**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockRegister = vi.fn();
vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    register: mockRegister,
  }),
}));

vi.mock('../../../services/authService', () => ({
  authService: {
    getGoogleAuthUrl: vi.fn().mockResolvedValue({ url: 'https://accounts.google.com', state: 'test_state' }),
  },
}));

describe('RegisterPage (Centered Card Layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders centered card with brand header, title, and voucher ribbon', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Tạo tài khoản PhoneShop/i })).toBeDefined();
    expect(screen.getByText(/WELCOME50/i)).toBeDefined();
    expect(screen.getByText(/50\.000/i)).toBeDefined();
    expect(screen.getByText(/Đăng ký nhanh với Google/i)).toBeDefined();
    expect(screen.getByText(/Đăng nhập ngay/i)).toBeDefined();
  });

  it('renders 5 stacked input fields and submit button', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/Nguyễn Văn A/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/name@example.com/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/0912 345 678/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Tối thiểu 6 ký tự/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Nhập lại mật khẩu/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Đăng ký tài khoản/i })).toBeDefined();
  });

  it('displays client error if required fields are empty', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /Đăng ký tài khoản/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Vui lòng điền đầy đủ các thông tin bắt buộc/i)).toBeDefined();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('displays error if password is less than 6 characters', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), { target: { value: 'Nguyễn Văn Test' } });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Tối thiểu 6 ký tự/i), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập lại mật khẩu/i), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu phải có ít nhất 6 ký tự/i)).toBeDefined();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('displays error if passwords do not match', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), { target: { value: 'Nguyễn Văn Test' } });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Tối thiểu 6 ký tự/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập lại mật khẩu/i), { target: { value: '654321' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu xác nhận không khớp/i)).toBeDefined();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls register and redirects to / on successful registration', async () => {
    mockRegister.mockResolvedValueOnce({ id: 1, email: 'test@example.com' });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), { target: { value: 'Nguyễn Văn Test' } });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/0912 345 678/i), { target: { value: '0988776655' } });
    fireEvent.change(screen.getByPlaceholderText(/Tối thiểu 6 ký tự/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập lại mật khẩu/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn Test',
        email: 'test@example.com',
        phone: '0988776655',
        password: 'password123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it executes (some assertions might fail on existing DOM)**

Run: `npx vitest run src/pages/storefront/Auth/__tests__/RegisterPage.spec.tsx` in `frontend` directory.

- [ ] **Step 3: Commit test file**

```bash
git add frontend/src/pages/storefront/Auth/__tests__/RegisterPage.spec.tsx
git commit -m "test(auth): add component test suite for centered RegisterPage"
```

---

### Task 2: Implement Centered Card Redesign on RegisterPage

**Files:**
- Modify: `frontend/src/pages/storefront/Auth/RegisterPage.tsx`

- [ ] **Step 1: Refactor `RegisterPage.tsx` layout and markup**

Replace the 12-column grid and right sidebar with:
- Full page background container: `min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative overflow-x-hidden selection:bg-blue-600 selection:text-white`.
- Subtle radial ambient background glow.
- Centered card: `w-full max-w-[450px] bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100/90 p-6 sm:p-8 space-y-5 relative z-10`.
- Integrated promo voucher ribbon banner:
  ```tsx
  <div className="bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-300/60 flex items-center justify-center text-base shrink-0">
        🎁
      </div>
      <div className="text-xs text-amber-900 leading-snug">
        <span className="font-bold block">Quà tặng bạn mới</span>
        <span className="text-[11px] text-amber-700/90">Giảm ngay <b>50.000₫</b> cho đơn đầu tiên</span>
      </div>
    </div>
    <div className="shrink-0 bg-white border border-amber-300 font-mono font-bold text-xs text-amber-800 px-2.5 py-1 rounded-lg shadow-2xs">
      WELCOME50
    </div>
  </div>
  ```
- 1-Click Google OAuth button with official 4-color SVG logo.
- Divider: `hoặc điền thông tin`.
- 5 single-column stacked input fields:
  - Họ và tên * (icon `User`)
  - Địa chỉ Email * (icon `Mail`)
  - Số điện thoại (icon `Phone`, helper text: "Để nhận thông báo đơn hàng & tích điểm")
  - Mật khẩu * (icon `Lock`, eye toggle)
  - Xác nhận mật khẩu * (icon `Lock`, eye toggle)
- Submit button with spinner loading state.
- Footer: Link to `/login` and security trust badge.

- [ ] **Step 2: Run test suite to verify all RegisterPage tests pass**

Run: `npx vitest run src/pages/storefront/Auth/__tests__/RegisterPage.spec.tsx` in `frontend` directory.
Expected: PASS (all 6 tests pass).

- [ ] **Step 3: Commit RegisterPage redesign**

```bash
git add frontend/src/pages/storefront/Auth/RegisterPage.tsx
git commit -m "feat(auth): redesign RegisterPage to elegant centered card layout with promo voucher ribbon"
```

---

### Task 3: Write Unit & Component Tests for Centered LoginPage

**Files:**
- Create: `frontend/src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx`

- [ ] **Step 1: Write test suite for LoginPage**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

const mockLogin = vi.fn();
vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    login: mockLogin,
  }),
}));

vi.mock('../../../services/authService', () => ({
  authService: {
    getGoogleAuthUrl: vi.fn().mockResolvedValue({ url: 'https://accounts.google.com', state: 'oauth_login' }),
    forgotPassword: vi.fn().mockResolvedValue({ message: 'Success' }),
  },
}));

describe('LoginPage (Centered Card Layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders centered card with brand header, title, and google button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Chào mừng bạn trở lại/i })).toBeDefined();
    expect(screen.getByText(/Đăng nhập nhanh với Google/i)).toBeDefined();
    expect(screen.getByText(/Ghi nhớ đăng nhập/i)).toBeDefined();
    expect(screen.getByText(/Quên mật khẩu\?/i)).toBeDefined();
    expect(screen.getByText(/Đăng ký ngay/i)).toBeDefined();
  });

  it('validates empty inputs on submit', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));

    await waitFor(() => {
      expect(screen.getByText(/Vui lòng nhập đầy đủ email và mật khẩu/i)).toBeDefined();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('logs in user and redirects to home for regular customer', async () => {
    mockLogin.mockResolvedValueOnce({ id: 1, role: 'CUSTOMER', email: 'user@example.com' });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập mật khẩu/i), { target: { value: 'pass123' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'pass123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to /admin when user role is ADMIN', async () => {
    mockLogin.mockResolvedValueOnce({ id: 2, role: 'ADMIN', email: 'admin@phoneshop.vn' });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'admin@phoneshop.vn' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập mật khẩu/i), { target: { value: 'adminpass' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('opens forgot password modal and submits email', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Quên mật khẩu\?/i));

    expect(screen.getByText(/Khôi phục mật khẩu/i)).toBeDefined();

    const forgotInput = screen.getByPlaceholderText(/Địa chỉ email đã đăng ký/i);
    fireEvent.change(forgotInput, { target: { value: 'forgot@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Gửi link đặt lại mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByText(/Đã gửi email khôi phục/i)).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it executes**

Run: `npx vitest run src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx` in `frontend` directory.

- [ ] **Step 3: Commit test file**

```bash
git add frontend/src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx
git commit -m "test(auth): add component test suite for centered LoginPage"
```

---

### Task 4: Implement Centered Card Redesign on LoginPage

**Files:**
- Modify: `frontend/src/pages/storefront/Auth/LoginPage.tsx`

- [ ] **Step 1: Refactor `LoginPage.tsx` to matching centered card layout**

Replace the 12-column grid and right sidebar with:
- Full page background container: `min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative overflow-x-hidden selection:bg-blue-600 selection:text-white`.
- Centered card: `w-full max-w-[440px] bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100/90 p-6 sm:p-8 space-y-5 relative z-10`.
- Brand Header: PhoneShop logo, Heading: `Chào mừng bạn trở lại`, Subtitle: `Đăng nhập để theo dõi đơn hàng, voucher và ưu đãi thành viên VIP.`.
- 1-Click Google OAuth button with official 4-color SVG logo.
- Divider: `hoặc tiếp tục với email`.
- Stacked input fields:
  - Địa chỉ Email * (icon `Mail`)
  - Mật khẩu * (icon `Lock`, eye toggle)
- Options row:
  - `rememberMe` checkbox
  - `Quên mật khẩu?` button triggering modal
- CTA Submit button: `Đăng nhập` (with spinner state).
- Modal `Forgot Password`: Clean, centered modal with email recovery submit state.
- Footer: Link to `/register` and security reassurance badge.

- [ ] **Step 2: Run test suite to verify all LoginPage tests pass**

Run: `npx vitest run src/pages/storefront/Auth/__tests__/LoginPage.spec.tsx` in `frontend` directory.
Expected: PASS (all 5 tests pass).

- [ ] **Step 3: Commit LoginPage redesign**

```bash
git add frontend/src/pages/storefront/Auth/LoginPage.tsx
git commit -m "feat(auth): redesign LoginPage to unified centered card layout"
```

---

### Task 5: End-to-End Build & Visual Verification

**Files:**
- Verify: `frontend/src/pages/storefront/Auth/RegisterPage.tsx`
- Verify: `frontend/src/pages/storefront/Auth/LoginPage.tsx`

- [ ] **Step 1: Run all auth tests in Vitest**

Run: `npx vitest run src/pages/storefront/Auth/` in `frontend` directory.
Expected: All test suites PASS.

- [ ] **Step 2: Run TypeScript and production build**

Run: `npm run build` in `frontend` directory.
Expected: Build succeeds with 0 TypeScript errors.

- [ ] **Step 3: Update Visual Companion screen with final live implementation check**

Write confirmation screen to `.opencode/brainstorm/session-1/content/final-completed.html`.

- [ ] **Step 4: Final commit and summary**

```bash
git status
git commit -m "chore(auth): complete authentication pages centered card redesign"
```
