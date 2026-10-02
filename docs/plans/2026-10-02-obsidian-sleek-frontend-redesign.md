# Obsidian Sleek Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the entire MobileCommerce frontend (Storefront and Admin Portal) to the "Obsidian Sleek" design system (100% dark immersion, Linear/Vercel modern aesthetic, Bento Grid layout, Hardware Matrix selectors, Cyber Diagnostic Terminal, and Ant Design dark theme overrides) while ensuring 100% backward compatibility and zero regressions across Playwright E2E tests.

**Architecture:** Tailwind CSS v4 design tokens and custom CSS utilities define the Obsidian aesthetic (`#07090e` void background, `#0e1526` surface, `#6366f1` indigo and `#38bdf8` sky accents). Ant Design in the Admin Portal is wrapped in `ConfigProvider` with `theme.darkAlgorithm` and tailored tokens. All storefront components are restructured with high-contrast geometric typography, subtle 1px borders, and micro-interactions.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Ant Design 5 (Dark Theme), Lucide React, Playwright (Python E2E testing).

---

## File Structure & Responsibility Map

| File Path | Responsibility |
| :--- | :--- |
| `frontend/src/index.css` | Core design tokens (`--color-obsidian-void`, etc.), dark scrollbars, glassmorphism utilities, glow effects. |
| `frontend/src/components/common/Navbar.tsx` | Floating glassmorphism navigation bar, glowing brand logo, search bar, cart badge, user avatar. |
| `frontend/src/components/common/Footer.tsx` | Obsidian dark footer with system architecture status indicators (Supabase CDN, BullMQ 15m Lock). |
| `frontend/src/pages/storefront/Home/HomePage.tsx` | Hero Bento Grid, metallic brand dock carousel, live IMEI inventory cards, and Obsidian product catalog. |
| `frontend/src/pages/storefront/Products/ProductDetailPage.tsx` | Hardware Matrix (semiconductor storage chips, titanium color swatches), real-time IMEI radar, floating purchase bar. |
| `frontend/src/pages/storefront/Cart/CartPage.tsx` | Dark cart table, 15-minute reservation timer preview, voucher input pills, order summary card. |
| `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx` | Atomic 15-min hold countdown banner, VietQR dynamic modal, VNPay redirect, COD option. |
| `frontend/src/pages/storefront/WarrantyLookup/WarrantyLookupPage.tsx` | Cyber Diagnostic Terminal, real-time client-side Luhn verification, hardware certificate display. |
| `frontend/src/pages/storefront/Profile/ProfilePage.tsx` | Obsidian developer-grade profile, Supabase WebP avatar uploader, order history tracking timeline. |
| `frontend/src/pages/storefront/Auth/LoginPage.tsx` | Obsidian centered card, glowing inputs, authentication form. |
| `frontend/src/pages/storefront/Auth/RegisterPage.tsx` | Obsidian centered card, registration validation with dark inputs. |
| `frontend/src/layouts/AdminLayout.tsx` | Global Ant Design `ConfigProvider` with `darkAlgorithm`, Obsidian sidebar (`#07090e`), top header bar. |
| `frontend/src/pages/Admin/Dashboard/AdminDashboardPage.tsx` | Dark KPI cards, gradient borders, revenue radar, 15m hold expiration monitoring. |
| `frontend/src/pages/Admin/Products/AdminProductsPage.tsx` | Dark Ant Design Table, variant management, `ImageUploadDragger` modal with Supabase Storage integration. |
| `frontend/src/pages/Admin/InventoryImei/AdminImeiPage.tsx` | Dark Ant Design Table, color-coded IMEI status tags, batch import modal with Luhn validation. |
| `test_frontend_playwright.py` | E2E Playwright test suite verifying 8 critical paths across Storefront and Admin Portal. |

---

## Tasks Decomposition

### Task 1: Design Tokens & Base Theme Setup

**Files:**
- Modify: `MobileCommerce/frontend/src/index.css`
- Modify: `MobileCommerce/frontend/src/App.tsx` (or root wrapper to enforce background `#07090e` and dark body)

- [ ] **Step 1: Inspect and enhance `src/index.css` with Obsidian Sleek tokens**

Update `MobileCommerce/frontend/src/index.css` to add custom root variables, custom scrollbars, subtle glow classes, and ensure `html, body` use `#07090e` background and `#f8fafc` text.

```css
@import "tailwindcss";

@layer base {
  :root {
    --color-obsidian-void: #07090e;
    --color-surface-dark: #0e1526;
    --color-surface-subtle: #151d30;
    --color-border-subtle: rgba(255, 255, 255, 0.08);
    --color-border-focus: rgba(99, 102, 241, 0.4);
    --color-electric-indigo: #6366f1;
    --color-cyber-sky: #38bdf8;
    --color-emerald-radar: #10b981;
    --color-amber-hold: #f59e0b;
  }

  html, body {
    background-color: #07090e;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  /* Custom Obsidian Scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #07090e;
  }
  ::-webkit-scrollbar-thumb {
    background: #1e293b;
    border-radius: 9999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #334155;
  }
}

/* Glassmorphism & Glow Utilities */
.obsidian-glass {
  background: rgba(14, 21, 38, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.obsidian-card {
  background: #0e1526;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.obsidian-card:hover {
  border-color: rgba(99, 102, 241, 0.35);
  box-shadow: 0 0 25px rgba(99, 102, 241, 0.12);
}

.obsidian-glow-indigo {
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.25);
}

.obsidian-glow-sky {
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);
}

.obsidian-glow-emerald {
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);
}
```

- [ ] **Step 2: Verify CSS build passes**

Run: `cd MobileCommerce/frontend && npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit Task 1**

```bash
git add frontend/src/index.css
git commit -m "style(theme): add obsidian sleek design tokens and utilities"
```

---

### Task 2: Storefront Global Navigation & Footer Overhaul

**Files:**
- Modify: `MobileCommerce/frontend/src/components/common/Navbar.tsx`
- Modify: `MobileCommerce/frontend/src/components/common/Footer.tsx`
- Modify: `MobileCommerce/frontend/src/layouts/StorefrontLayout.tsx`

- [ ] **Step 1: Overhaul `Navbar.tsx` to Floating Obsidian Glass Header**

Transform the navbar into a floating glassmorphism pill with:
1. Glowing gradient logo mark.
2. Direct navigation links with active state indicators.
3. Search button styled as Command Bar trigger (`⌘K`).
4. Cart drawer trigger with cyan/indigo badge.
5. User avatar integration with Supabase WebP link or login button.

- [ ] **Step 2: Overhaul `Footer.tsx` to Obsidian Dark Minimalist**

Transform the footer with:
1. Deep dark background (`#05070a`) with 1px top border `rgba(255,255,255,0.06)`.
2. Architecture badges: "Supabase CDN • BullMQ 15m Lock Active • VietQR 2.0 • VNPay Official".
3. Clean navigation columns with muted slate links.

- [ ] **Step 3: Verify StorefrontLayout container background**

Ensure `StorefrontLayout.tsx` wraps pages in `<div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">`.

- [ ] **Step 4: Verify frontend build and layout rendering**

Run: `cd MobileCommerce/frontend && npm run build`
Expected: Build passes cleanly.

- [ ] **Step 5: Commit Task 2**

```bash
git add frontend/src/components/common/Navbar.tsx frontend/src/components/common/Footer.tsx frontend/src/layouts/StorefrontLayout.tsx
git commit -m "feat(storefront): redesign floating obsidian navbar and dark architecture footer"
```

---

### Task 3: Storefront Homepage (Hero Bento Grid & Product Catalog)

**Files:**
- Modify: `MobileCommerce/frontend/src/pages/storefront/Home/HomePage.tsx`

- [ ] **Step 1: Implement Hero Bento Grid section in `HomePage.tsx`**

1. **Card 1 (Main Flagship Spotlight - 2 cols):** Featured iPhone 16 Pro Max / S24 Ultra with titanium badge, Cyber Sky starting price (`#38bdf8`), and direct link to product.
2. **Card 2 (Live IMEI Radar):** Pulsing emerald beacon showing real-time warehouse count and origin guarantee.
3. **Card 3 (15-Minute Reservation Lock):** Dynamic demonstration of atomic inventory lock.
4. **Card 4 (Warranty Terminal Shortcut):** One-click button navigating to `/warranty-lookup`.

- [ ] **Step 2: Implement Metallic Brand Dock Carousel**

Create brand pills (Apple, Samsung, Xiaomi, OPPO, Sony) with metallic finish, count of available models, and instant filter click handler.

- [ ] **Step 3: Implement Obsidian Product Catalog Grid**

1. Each card uses `obsidian-card` with dark surface `#0e1526`.
2. High-resolution product image with subtle scale on hover.
3. Hardware spec badges (e.g. `A18 Pro`, `OLED 120Hz`, `Titanium`).
4. Price formatted with `tabular-nums text-sky-400 font-black`.
5. Quick "Thêm vào giỏ" button with instant feedback.

- [ ] **Step 4: Build and test Homepage**

Run: `cd MobileCommerce/frontend && npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 5: Commit Task 3**

```bash
git add frontend/src/pages/storefront/Home/HomePage.tsx
git commit -m "feat(storefront): overhaul homepage with obsidian bento grid and dark catalog"
```
### Task 4: Storefront Product Detail Page (Hardware Matrix & Sticky Bar)

**Files:**
- Modify: `MobileCommerce/frontend/src/pages/storefront/Products/ProductDetailPage.tsx`

- [ ] **Step 1: Overhaul Product Detail layout with Obsidian aesthetic**

1. Gallery section on left with dark elevated viewport, zoom thumbnail selector, and genuine authenticity seal.
2. Hardware details on right with geometric typography, brand badge, and live rating stars.

- [ ] **Step 2: Implement Hardware Matrix Variant Selector**

1. **Storage Matrix:** Semiconductor chip style buttons (128GB, 256GB, 512GB, 1TB) with price diff badge.
2. **Titanium Color Swatches:** Metallic circle swatches with glowing selection rings and selected color name display.
3. **Live Inventory Radar:** Direct readout of available IMEI count for the specific selected variant (`#10b981`).

- [ ] **Step 3: Implement Floating Sticky Purchase Bar**

Floating glass bar appearing at the bottom of the viewport on mobile & desktop when scrolling past the main CTA, providing instant "Thêm vào giỏ" and "Mua ngay" buttons.

- [ ] **Step 4: Build and test ProductDetailPage**

Run: `cd MobileCommerce/frontend && npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 5: Commit Task 4**

```bash
git add frontend/src/pages/storefront/Products/ProductDetailPage.tsx
git commit -m "feat(storefront): redesign product detail with hardware matrix and sticky purchase bar"
```

---

### Task 5: Storefront Cart & Checkout (15m Lock & Dark Payment)

**Files:**
- Modify: `MobileCommerce/frontend/src/pages/storefront/Cart/CartPage.tsx`
- Modify: `MobileCommerce/frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`

- [ ] **Step 1: Overhaul `CartPage.tsx` with Obsidian styling**

1. Dark cart item cards with thumbnail, variant badge, quantity adjusters, and delete button.
2. Alert pill: "Hệ thống sẽ tự động kích hoạt khóa giữ máy 15 phút khi tiến hành thanh toán".
3. Order summary card with subtotal, voucher discount input, and direct checkout button.

- [ ] **Step 2: Overhaul `CheckoutPage.tsx` with Atomic 15m Lock banner and Dark Gateways**

1. Glowing 15-minute countdown reservation timer banner on top.
2. Delivery address selection with dark input styling (`bg-slate-900 border-white/10 text-white`).
3. Payment method selector:
   - **VietQR:** Obsidian dynamic QR modal with transaction code, bank logos, and polling indicator.
   - **VNPay:** Dark gateway card with checksum validation badge.
   - **COD:** Cash on delivery option.
4. Error banner preserving exact backend error messages without mock fallbacks.

- [ ] **Step 3: Build and test Cart & Checkout pages**

Run: `cd MobileCommerce/frontend && npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit Task 5**

```bash
git add frontend/src/pages/storefront/Cart/CartPage.tsx frontend/src/pages/storefront/Checkout/CheckoutPage.tsx
git commit -m "feat(storefront): redesign cart and checkout with 15m atomic lock and dark payment gateways"
```

---

### Task 6: Storefront Warranty Lookup (Cyber Diagnostic Terminal)

**Files:**
- Modify: `MobileCommerce/frontend/src/pages/storefront/WarrantyLookup/WarrantyLookupPage.tsx`

- [ ] **Step 1: Transform WarrantyLookup into Cyber Diagnostic Terminal**

1. Heading with "Tra cứu Thời hạn Bảo hành Thiết bị" preserving exact selector text for Playwright compatibility.
2. Terminal search input: Monospace font, glowing search icon, Luhn checksum validation indicator.
3. Quick sample IMEI chips with dark pill styling.

- [ ] **Step 2: Implement Hardware Activation Certificate card**

When IMEI/WRT code is found:
1. Device name, official IMEI number, activation date, and expiration date.
2. Animated progress bar for remaining days.
3. Genuine manufacturer warranty shield tag (`#10b981`).

- [ ] **Step 3: Build and test WarrantyLookupPage**

Run: `cd MobileCommerce/frontend && npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit Task 6**

```bash
git add frontend/src/pages/storefront/WarrantyLookup/WarrantyLookupPage.tsx
git commit -m "feat(storefront): redesign warranty lookup into cyber diagnostic terminal"
```

---

### Task 7: Storefront Profile & Auth Pages (Obsidian Developer Style)

**Files:**
- Modify: `MobileCommerce/frontend/src/pages/storefront/Profile/ProfilePage.tsx`
- Modify: `MobileCommerce/frontend/src/pages/storefront/Auth/LoginPage.tsx`
- Modify: `MobileCommerce/frontend/src/pages/storefront/Auth/RegisterPage.tsx`

- [ ] **Step 1: Overhaul `ProfilePage.tsx`**

1. Obsidian developer-grade profile card.
2. Avatar section with Supabase WebP upload camera button.
3. User info grid (Full name, Email, Role badge, Created at).
4. Order history list with dark status tags.

- [ ] **Step 2: Overhaul `LoginPage.tsx` and `RegisterPage.tsx`**

1. Centered Obsidian card with ambient background glow.
2. Dark input fields with glowing indigo focus border.
3. Submit button with loading spinner.

- [ ] **Step 3: Build and test Profile & Auth pages**

Run: `cd MobileCommerce/frontend && npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit Task 7**

```bash
git add frontend/src/pages/storefront/Profile/ProfilePage.tsx frontend/src/pages/storefront/Auth/LoginPage.tsx frontend/src/pages/storefront/Auth/RegisterPage.tsx
git commit -m "feat(storefront): redesign profile and auth pages to obsidian developer style"
```

---

### Task 8: Admin Command Center (Dark Algorithm, Dashboard, Products & IMEI)

**Files:**
- Modify: `MobileCommerce/frontend/src/layouts/AdminLayout.tsx`
- Modify: `MobileCommerce/frontend/src/pages/Admin/Dashboard/AdminDashboardPage.tsx`
- Modify: `MobileCommerce/frontend/src/pages/Admin/Products/AdminProductsPage.tsx`
- Modify: `MobileCommerce/frontend/src/pages/Admin/InventoryImei/AdminImeiPage.tsx`

- [ ] **Step 1: Configure Ant Design Dark Theme in `AdminLayout.tsx`**

1. Wrap entire Admin layout in `<ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorBgContainer: '#0e1526', colorBgLayout: '#07090e', colorPrimary: '#6366f1', colorBorder: 'rgba(255,255,255,0.08)' } }}>`.
2. Style Admin Sidebar with deep dark background (`#07090e`) and glowing active indicators.
3. Top header with live system stats and admin avatar.

- [ ] **Step 2: Overhaul `AdminDashboardPage.tsx` with Dark KPI Cards**

1. Total revenue, total orders, available IMEIs, and active 15m locks.
2. Dark chart visualizer and recent activities list.

- [ ] **Step 3: Overhaul `AdminProductsPage.tsx` with Obsidian Table**

1. Dark Ant Design Table displaying product images, brand tags, price ranges, and toggle switches.
2. "Thêm sản phẩm mới" button opening dark modal with `ImageUploadDragger` for Supabase Storage uploads.
3. Preserve key headings: "Quản lý Sản phẩm & Biến thể".

- [ ] **Step 4: Overhaul `AdminImeiPage.tsx` with Dark IMEI Table & Batch Modal**

1. Dark table showing individual IMEIs with status pills (`AVAILABLE` in green, `RESERVED` in amber, `SOLD` in slate).
2. "Nhập lô IMEI" button opening dark batch modal with Luhn validation.
3. Preserve key headings: "Quản trị Kho Thiết bị & Quản lý IMEI".

- [ ] **Step 5: Build and test Admin Command Center**

Run: `cd MobileCommerce/frontend && npm run build`
Expected: 0 errors.

- [ ] **Step 6: Commit Task 8**

```bash
git add frontend/src/layouts/AdminLayout.tsx frontend/src/pages/Admin/Dashboard/AdminDashboardPage.tsx frontend/src/pages/Admin/Products/AdminProductsPage.tsx frontend/src/pages/Admin/InventoryImei/AdminImeiPage.tsx
git commit -m "feat(admin): overhaul admin command center with ant design dark theme and obsidian cards"
```

---

### Task 9: Full Playwright E2E Verification & Visual Inspection

**Files:**
- Verify: `MobileCommerce/test_frontend_playwright.py`

- [ ] **Step 1: Run complete Playwright E2E test suite**

Run: `python test_frontend_playwright.py`
Expected: All 8 test suites PASS (Homepage, Product Detail, Cart, Warranty Lookup, Auth & Protected Routes, Profile, Admin Dashboard & Products & IMEI, Mobile Viewport 390x844 with 0 overflow).

- [ ] **Step 2: Inspect screenshots generated in `e2e_screenshots/`**

Verify high aesthetic quality, clean typography, dark contrast, and zero visual glitches.

- [ ] **Step 3: Final Commit and Documentation update**

```bash
git add docs/plans/2026-10-02-obsidian-sleek-frontend-redesign.md
git commit -m "chore(docs): complete obsidian sleek implementation plan"
```
