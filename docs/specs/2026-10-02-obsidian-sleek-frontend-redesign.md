# MobileCommerce Frontend Redesign Specification
## Style: Obsidian Sleek (Linear / Vercel Modern 100% Dark Immersion)

- **Date:** 2026-10-02
- **Author:** Antigravity Engineering Team
- **Status:** Approved / In Progress
- **Target Platform:** Web (Desktop 1440px+, Tablet 768px-1024px, Mobile 390px-430px)

---

## 1. Executive Summary & Vision

MobileCommerce is a high-performance e-commerce platform for premium mobile devices, featuring unique business logic such as atomic 15-minute IMEI reservation locks (`FOR UPDATE SKIP LOCKED`), Luhn-validated warranty tracking, and dual payment gateways (VietQR & VNPay).

This design specification defines a complete, ground-up overhaul of the entire frontend architecture and visual interface. The platform transitions from a generic, light-themed e-commerce site to a state-of-the-art **Obsidian Sleek** aesthetic inspired by modern Silicon Valley engineering tools (Linear, Vercel, Raycast). The system features a 100% strict dark immersion experience with high-contrast typography, micro-interactions, Bento Grid layout, and hardware diagnostic interfaces.

---

## 2. Design System Tokens & Foundations

### 2.1 Color Palette (Design Tokens)

| Token Name | HEX / Value | Usage |
| :--- | :--- | :--- |
| `--color-obsidian-void` | `#07090e` | Main page background (deepest dark) |
| `--color-surface-dark` | `#0e1526` | Card background, Bento grids, modals, drawers |
| `--color-surface-subtle` | `#151d30` | Hover states, elevated card surfaces, input fields |
| `--color-border-subtle` | `rgba(255, 255, 255, 0.08)` | Standard 1px container and table borders |
| `--color-border-focus` | `rgba(99, 102, 241, 0.4)` | Interactive focus states & glowing borders |
| `--color-electric-indigo`| `#6366f1` | Primary CTA, action buttons, active tabs |
| `--color-cyber-sky` | `#38bdf8` | Prices, hardware specs, hyperlinks, status accents |
| `--color-emerald-radar` | `#10b981` | Real-time available IMEI in stock, valid warranty |
| `--color-amber-hold` | `#f59e0b` | 15-minute countdown reservation lock indicator |
| `--color-rose-alert` | `#f43f5e` | Out of stock, expired reservation, validation error |
| `--color-text-primary` | `#f8fafc` | Headings, titles, primary content |
| `--color-text-secondary` | `#94a3b8` | Subtitles, specifications, secondary descriptions |
| `--color-text-muted` | `#64748b` | Timestamps, micro-labels, breadcrumbs |

### 2.2 Typography & Numbers
- **Font Family:** Geometric Sans (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`).
- **Code & Numbers:** `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `monospace` with `font-variant-numeric: tabular-nums` for prices, IMEI codes, and countdown clocks.
- **Hierarchy:**
  - Display Title: `font-black text-3xl sm:text-4xl tracking-tight text-white`
  - Section Title: `font-bold text-xl sm:text-2xl text-slate-100`
  - Card Title: `font-bold text-base sm:text-lg text-slate-100`
  - Body Text: `text-xs sm:text-sm text-slate-300 leading-relaxed`
  - Micro Tag: `text-[10px] font-bold uppercase tracking-wider`

---

## 3. Storefront Architecture & Pages

### 3.1 Global Navigation (Floating Obsidian Header)
- **Visuals:** Floating pill/bar with `bg-slate-950/80 backdrop-blur-md border border-white/10 shadow-2xl`.
- **Branding:** Glowing gradient badge with subtle indigo glow and text "MobileCommerce".
- **Navigation Links:** Quick filters for Flagships, Brands, and Warranty Hub with interactive hover glow.
- **Search Command:** Command-bar trigger (`⌘K` / `Ctrl+K`) with smooth search modal.
- **Actions:**
  - Cart trigger with glowing item count badge.
  - User avatar with Supabase CDN integration and quick dropdown.

### 3.2 Homepage (`/`)
1. **Hero Bento Grid:**
   - **Flagship Showcase Card (Large 2-column):** High-resolution smartphone render (iPhone 16 Pro Max / S24 Ultra), titanium color badge, dynamic starting price, and instant reservation trigger.
   - **Live IMEI Radar Card:** Animated pulsing green beacon indicating live warehouse inventory count and origin transparency.
   - **15-Min Reservation Guarantee Card:** Explanation of atomic locking with timer simulation.
   - **Electronic Warranty Card:** Quick entry for IMEI warranty validation.
2. **Brand Dock Carousel:**
   - Dark metallic pills for Apple, Samsung, Xiaomi, Sony, Google Pixel with instant active filtering.
3. **Product Catalog Grid:**
   - Cards styled with Obsidian Surface (`#0e1526`), 1px border with hover glow (`hover:border-indigo-500/50`).
   - Image aspect ratio optimized with clean background cutout.
   - Live variant chips (Storage & Colors) and Cyber Sky pricing (`#38bdf8`).
   - Direct "Thêm vào giỏ" button with micro-loading feedback.

### 3.3 Product Detail Page (`/products/:id`)
1. **Gallery View:** High-definition main showcase with smooth thumbnail carousel, zoom preview, and genuine certification badge.
2. **Hardware Matrix Selector:**
   - Storage selector styled as semiconductor chips (128GB, 256GB, 512GB, 1TB) displaying differential pricing.
   - Color selection swatches with metallic titanium rings and selected states.
3. **Live Inventory Radar:** Direct indicator of real IMEI count available for the chosen variant.
4. **Sticky Purchase Bar:** Bottom floating glass bar for instant "Khóa máy 15 phút" and "Thêm vào giỏ" on both desktop and mobile viewports.
5. **Technical Specifications Table:** Obsidian dark accordion comparing chipset, screen, camera, and battery parameters.

### 3.4 Cart & Checkout Workflow (`/cart` & `/checkout`)
1. **Cart Page (`/cart`):**
   - Clean dark list items with thumbnail, variant badge, quantity adjusters, and remove button.
   - Notice banner reminding user about the 15-minute lock activation during checkout.
   - Order summary card with voucher code input and subtotal calculation.
2. **Checkout Page (`/checkout`):**
   - Protected route requiring authentication.
   - Delivery address selection with dark form inputs.
   - **Atomic 15-Min Hold Indicator:** Visual countdown timer active upon checkout initialization.
   - Payment Methods Selector:
     - **VietQR:** Dynamic QR code generation with bank account details, reference memo, and transaction polling indicator.
     - **VNPay:** Secure redirection with official VNPay logo badge and checksum validation notice.
     - **COD:** Cash on delivery option.

### 3.5 Warranty Lookup Page (`/warranty-lookup`)
- Styled as a **Cyber Diagnostic Terminal**.
- Search bar supporting 15-digit IMEI or warranty code (`WRT-...`) with client-side Luhn verification.
- Result card featuring:
  - Device verification certificate.
  - Activation date, expiration date, and remaining warranty days progress bar.
  - Official manufacturer warranty status tag (`#10b981`).

### 3.6 Customer Profile Page (`/profile`)
- Obsidian developer-grade settings card.
- User profile info (Name, Email, Role badge).
- **Avatar Uploader:** WebP compressed upload directly interacting with Supabase Storage `/storage/avatar`.
- Order history timeline with tracking status.

### 3.7 Authentication Pages (`/login`, `/register`)
- Centered Obsidian card with ambient indigo background glow.
- Sleek dark input fields (`bg-slate-900 border-white/10 text-white placeholder-slate-500`).
- Error notices styled with rose accent.

---

## 4. Admin Command Center Architecture (`/admin/*`)

### 4.1 Global Ant Design Dark Theme Override
- Integration of Ant Design's `theme.darkAlgorithm`.
- Custom token overrides:
  - `colorBgContainer`: `#0e1526`
  - `colorBgElevated`: `#151d30`
  - `colorBgLayout`: `#07090e`
  - `colorPrimary`: `#6366f1`
  - `colorBorder`: `rgba(255, 255, 255, 0.08)`
  - `colorText`: `#f8fafc`
  - `colorTextSecondary`: `#94a3b8`

### 4.2 Admin Sidebar & Layout (`/admin`)
- Slim, elegant dark navigation bar with glowing active icons.
- Breadcrumb header with live server status and admin user profile.

### 4.3 Admin Dashboard (`/admin`)
- Dark metric cards with gradient borders: Total Revenue, Total Orders, Active Inventory, Reserved IMEIs.
- Revenue trends chart and recent order activity feed.

### 4.4 Admin Products Management (`/admin/products`)
- Obsidian Dark Ant Design Table with thumbnail preview, brand pills, variant counts, and active status switches.
- **Add/Edit Product Modal:** Obsidian styled modal integrating the `ImageUploadDragger` component with Supabase Storage.

### 4.5 Admin Inventory & IMEI Management (`/admin/imei`)
- Inventory breakdown per product variant.
- Individual IMEI registry with color-coded status badges:
  - `AVAILABLE`: Emerald Green
  - `RESERVED`: Amber (with active 15m timer)
  - `SOLD`: Slate Gray
- **Batch Import Modal:** Textarea with client-side Luhn validation preview before bulk API submission.

---

## 5. Non-Functional & Quality Assurance Standards

1. **Accessibility (WCAG AA):**
   - High contrast ratios (minimum 4.5:1 for body text, 7:1 for headings on dark backgrounds).
   - Clear focus visible states on all interactive controls (`focus:ring-2 focus:ring-indigo-500`).
2. **Mobile Responsiveness (390px - 430px):**
   - Strictly 0 horizontal scroll overflow (`overflow-x: hidden`).
   - Touch-friendly tap targets (minimum 44x44px).
3. **Zero Regression Guarantee:**
   - All 8 Playwright E2E test suites must pass 100% on the newly redesigned interface.
   - All backend APIs, concurrency locks, and payment redirects must function seamlessly.

---

## 6. Execution Plan & Component Roadmap

1. **Phase 1: Design Tokens & Base Styling Setup**
   - Update Tailwind configuration and global CSS (`index.css`) with Obsidian Sleek tokens, gradients, and custom scrollbars.
   - Configure Ant Design dark theme tokens for Admin Portal.
2. **Phase 2: Storefront Shared Components & Layout**
   - Rebuild Navbar (Floating Glass Header), Footer, and Global Command Palette.
3. **Phase 3: Storefront Core Pages Redesign**
   - Rebuild `HomePage` with Hero Bento Grid, Brand Dock, and Obsidian Product Grid.
   - Rebuild `ProductDetailPage` with Hardware Matrix and Sticky Purchase Bar.
   - Rebuild `CartPage` and `CheckoutPage` with 15-minute lock indicator and dark payment gateways.
   - Rebuild `WarrantyLookupPage` into Cyber Diagnostic Terminal.
   - Rebuild `ProfilePage` and Auth pages.
4. **Phase 4: Admin Command Center Redesign**
   - Overhaul Admin Layout, Dashboard, Products, and IMEI pages to Obsidian Dark.
5. **Phase 5: Playwright E2E Verification & Audit**
   - Execute Playwright test suite, capture screenshots, and verify 0 visual or functional regressions.
