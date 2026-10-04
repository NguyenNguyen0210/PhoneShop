# Technical Specification: Authentication Pages Centered-Card Redesign

- **Feature Name**: Storefront Authentication Pages Redesign (`RegisterPage` & `LoginPage`)
- **Status**: Approved
- **Author**: Assistant & Nguyen
- **Date**: 2026-10-04
- **Target Branch**: `Nguyen`

---

## 1. Overview & Problem Statement

### 1.1 Current Architecture & Pain Points
The current registration (`/register`) and login (`/login`) screens use a split-screen 12-column layout (7 columns form, 5 columns right side). 
While intended to display brand value and promotions, the right column presents severe visual drawbacks:
1. **Lack of Visual Anchor & Contrast**: Both sides use very light white/slate-50 backgrounds, leaving the floating voucher card and icons hovering without a solid visual baseline.
2. **Diluted Conversion Focus**: The primary goal of an authentication screen is to get the user through the form as quickly and frictionlessly as possible. The verbose bullet points and small text on the right column distract users without providing high-converting visual assets (such as 3D flagship phone renders).
3. **Discrepancy Between Mobile & Desktop**: On mobile screens (< 1024px), the right column is hidden entirely (`hidden lg:flex`), leading to an inconsistent mental model.

### 1.2 Proposed Solution: Centered Card Architecture (Hướng 1)
Replace the split-screen layout with an industry-standard **Centered Card** pattern (standardized by Apple ID, Google Accounts, Stripe, Telegram, and Tiki):
- Full viewport canvas with a calm, neutral light slate background (`bg-slate-50` / `#F8FAFC`).
- Form elements encapsulated within a single elevated card (`max-w-[450px]`, `rounded-3xl`, `shadow-xl shadow-slate-200/70`, `border border-slate-100/90`).
- Integrated mini promo banner for the **50.000₫ voucher (`WELCOME50`)** placed directly under the card header, keeping promotional incentives without requiring a secondary column.
- Single-column stacked input fields (ergonomic top-to-bottom reading rhythm).
- Full symmetry and unified UX applied to both `/register` and `/login`.

---

## 2. Aesthetic Direction & Design System Tokens

### 2.1 Aesthetic Profile: Clean Consumer Tech
- **Reference Inspiration**: Apple ID / Stripe Auth / Linear.
- **Palette**:
  - Page Background: `bg-slate-50` (`#F8FAFC`) with subtle ambient radial glow (`bg-blue-500/5` centered blur).
  - Card Surface: `bg-white` (`#FFFFFF`).
  - Borders: `border-slate-200/80` (inputs, dividers) and `border-slate-100` (card container).
  - Typography:
    - Primary Text: `text-slate-900` (`#0F172A`), `font-['Plus_Jakarta_Sans',sans-serif]`.
    - Secondary Text: `text-slate-500` (`#64748B`), `text-slate-400` (`#94A3B8`).
  - Primary Brand Accent: `bg-blue-600 hover:bg-blue-700` (`#2563EB` / `#1D4ED8`), focus rings `ring-blue-600`.
  - Promo & Incentive Accent: Warm Amber (`bg-amber-50`, `border-amber-200/80`, `text-amber-900`, `text-amber-700`).
  - Elevation & Shadows: `shadow-xl shadow-slate-200/70` for main card; `shadow-2xs` for buttons and badges.
  - Border Radii: `rounded-3xl` (24px) for main card, `rounded-2xl` (16px) for promo banner, `rounded-xl` (12px) for inputs and CTA buttons.

---

## 3. Screen Specifications

### 3.1 Register Screen (`RegisterPage.tsx`)
Container: `min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative overflow-x-hidden`.

Card Structure (`max-w-[450px] w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-5`):
1. **Brand Header**:
   - PhoneShop Logo (`/logo-horizontal.png`, h-9 to h-10).
   - Heading H1: `Tạo tài khoản PhoneShop` (`text-2xl font-black text-slate-900 tracking-tight`).
   - Subtitle: `Khám phá smartphone chính hãng & nhận ngay đặc quyền VIP.` (`text-xs text-slate-500`).
2. **Voucher Ribbon Highlight**:
   - Compact banner container (`bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between`).
   - Left: Gift emoji/icon (`🎁`) + Text: *"Quà tặng bạn mới — Giảm ngay 50.000₫ cho đơn đầu tiên"*.
   - Right: Voucher code tag (`WELCOME50`, font-mono bold, `bg-white border border-amber-300 text-amber-800 px-2.5 py-1 rounded-lg`).
3. **1-Click Google Sign Up**:
   - Full-width button with official multicolor 4-color Google G logo SVG.
   - States: Idle (`Đăng ký nhanh với Google`), Loading (`Đang kết nối Google...` with spinner), Disabled.
4. **Divider**:
   - Hairline `border-t border-slate-200` with centered text badge: `hoặc điền thông tin`.
5. **Form Fields (Single Column Stacked)**:
   - `fullName`: Text input, icon `User`, required, placeholder `Nguyễn Văn A`.
   - `email`: Email input, icon `Mail`, required, placeholder `name@example.com`.
   - `phone`: Tel input, icon `Phone`, optional, subtitle helper: *"Để nhận thông báo đơn hàng & tích điểm"*.
   - `password`: Password input, icon `Lock`, toggle eye `Eye`/`EyeOff`, min 6 chars, placeholder `Tối thiểu 6 ký tự`.
   - `confirmPassword`: Password input, icon `Lock`, toggle eye `Eye`/`EyeOff`, required, placeholder `Nhập lại mật khẩu`.
6. **Submit CTA Button**:
   - `w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/25 active:scale-[0.99] transition`.
   - Loading: `Loader2` spinner with text: `Đang đăng ký tài khoản...`.
7. **Footer Navigation & Trust**:
   - Link: *"Đã có tài khoản? Đăng nhập ngay"* pointing to `/login`.
   - Security Reassurance badge with `ShieldCheck` icon: *"Thông tin được bảo mật chuẩn mã hóa dữ liệu SSL."*.

---

### 3.2 Login Screen (`LoginPage.tsx`)
Container: `min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative overflow-x-hidden`.

Card Structure (`max-w-[440px] w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-5`):
1. **Brand Header**:
   - PhoneShop Logo (`/logo-horizontal.png`).
   - Heading H1: `Chào mừng bạn trở lại` (`text-2xl font-black text-slate-900 tracking-tight`).
   - Subtitle: `Đăng nhập để theo dõi đơn hàng, voucher và ưu đãi thành viên VIP.` (`text-xs text-slate-500`).
2. **1-Click Google Sign In**:
   - Full-width button matching official Google specs.
   - States: Idle (`Đăng nhập nhanh với Google`), Loading (`Đang kết nối Google...`), Disabled.
3. **Divider**:
   - `hoặc tiếp tục với email`.
4. **Form Fields**:
   - `email`: Email input, icon `Mail`, required.
   - `password`: Password input, icon `Lock`, toggle eye, required.
   - **Options Row**:
     - Checkbox: `Ghi nhớ đăng nhập` (`rememberMe`).
     - Action link: `Quên mật khẩu?` (Triggers `showForgotModal`).
5. **Submit CTA Button**:
   - Text: `Đăng nhập`.
   - Loading state: `Đang đăng nhập...` with spinner.
6. **Forgot Password Modal**:
   - Clean popover dialog centered over viewport when active (`showForgotModal`).
   - Email input + submit button + success check state when email recovery link is sent.
7. **Footer Navigation & Trust**:
   - Link: *"Chưa có tài khoản? Đăng ký ngay"* pointing to `/register`.
   - Security reassurance with `ShieldCheck` icon.

---

## 4. State Coverage & UX Interaction Matrix

| State | Trigger / Condition | Visual Representation |
|---|---|---|
| **Default / Idle** | Page loads fresh | Clean card, inputs filled with subtle placeholder text, neutral borders. |
| **Input Focus** | User clicks or tabs into input | Background switches from `bg-slate-50` to `bg-white`, border turns `border-blue-600`, subtle outer halo `ring-1 ring-blue-600`. |
| **Password Toggle** | User clicks Eye icon | Toggles input type between `text` and `password`, updates icon to `EyeOff` or `Eye`. Independent state per password field. |
| **Client Validation Failure** | Missing required fields / password < 6 chars / mismatch | Displays rose alert banner at top of form (`bg-rose-50 border-rose-200 text-rose-800 rounded-xl`) with `AlertCircle` icon. Focus remains on form. |
| **Form Submitting** | User submits valid form | CTA button disabled, opacity lowered, spinner `Loader2` animates, button text updates to progress message. |
| **Google OAuth Initiating** | User clicks Google button | Google button disabled, spinner displays, redirects to server-generated OAuth URL or client fallback. |
| **Server Error** | Backend returns 400/401/409 (e.g. Email already registered) | Alert banner displays exact error message returned from backend API (`err.message`). Loading state resets. |
| **Success Redirect** | Auth succeeds | Token stored in auth store/cookies. Register redirects to `/`. Login redirects to target return URL or `/admin` if role is `ADMIN`/`STAFF`/`MANAGER`. |

---

## 5. Responsive Behavior

- **Mobile Viewports (< 640px)**:
  - Container padding adjusts to `px-4 py-8`.
  - Card width becomes `w-full` with inner padding `p-5 sm:p-6`.
  - Promo banner stacks gracefully without clipping promo code tag.
  - Zero horizontal overflow.
- **Desktop & High-DPI Screens (>= 640px)**:
  - Card strictly constrained to `max-w-[450px]` (Register) and `max-w-[440px]` (Login).
  - Perfect vertical centering on full viewports (`min-h-screen`).

---

## 6. Testing & Verification Plan

1. **Visual & Layout Inspection**:
   - Verify `/register` renders a single centered card without right column.
   - Verify `/login` renders a matching single centered card without right column.
   - Verify voucher banner displays `WELCOME50` code and discount label.
2. **Registration Flow Test**:
   - Register new user with valid fields (`fullName`, `email`, `phone`, `password`, `confirmPassword`).
   - Verify password mismatch validation triggers correctly.
   - Verify short password (< 6 chars) error triggers correctly.
   - Verify successful registration navigates to home (`/`).
3. **Login Flow Test**:
   - Login with registered user credentials.
   - Verify invalid credentials displays error alert.
   - Verify Forgot Password modal opens, accepts email, and handles submit state.
4. **Responsive Check**:
   - Verify mobile breakpoint (< 640px) renders without layout shifts or horizontal scrolls.
