# Product Detail Page (PDP) Commercial E-Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Product Detail Page (`ProductDetailPage.tsx`) into a high-conversion, professional commercial e-commerce experience (inspired by CellphoneS / Thế Giới Di Động), featuring clean product titles, commercial red pricing (`#E11D48`), 2-line variant cards with active checkmarks, special promotion gift box, dual-action CTAs (MUA NGAY + TRẢ GÓP 0% with Installment Modal), a 65:35 bottom technical layout with zebra-striped specs, and unified "PhoneShop" branding.

**Architecture:** Decompose into modular storefront components:
- `InstallmentModal.tsx`: 0% interest monthly installment calculator modal.
- `ProductSpecsModal.tsx`: Full hardware specifications modal for deep technical viewing.
- `ProductDetailPage.tsx`: Main page assembling the hero purchase section, promotion box, 65:35 bottom layout, and floating purchase bar.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Ant Design (Modal, Slider), Lucide React.

---

## File Structure Map
- Create: `frontend/src/components/storefront/InstallmentModal.tsx`
  - Zero-percent interest calculation, down payment tabs, term selector, and checkout redirection.
- Create: `frontend/src/components/storefront/ProductSpecsModal.tsx`
  - Full OEM specification matrix modal with clean key-value grid.
- Modify: `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`
  - Redesign hero section with clean `<h1>` title, commercial red price `#E11D48`, 2-line variant cards with checkmarks, gift promotion box, dual CTAs, 65:35 bottom layout, and PhoneShop branding.

---

## Task Decomposition

### Task 1: Create `InstallmentModal.tsx` & `ProductSpecsModal.tsx`
**Files:**
- Create: `frontend/src/components/storefront/InstallmentModal.tsx`
- Create: `frontend/src/components/storefront/ProductSpecsModal.tsx`

- [ ] **Step 1: Implement `InstallmentModal.tsx`**
  - Modal with product header (name, variant, price).
  - Down payment options: 0%, 20%, 30%, 50%.
  - Tenure term options: 3 months, 6 months, 9 months, 12 months.
  - Calculated monthly payment: `Math.round((totalPrice - downPaymentAmount) / term)`.
  - Application notes: CCCD gắn chip / Thẻ tín dụng, duyệt nhanh trong 5 phút.
  - Action button: "Tiến hành đăng ký & Giữ máy 15p" invoking `onProceed`.

- [ ] **Step 2: Implement `ProductSpecsModal.tsx`**
  - Ant Design Modal containing full specifications table from `product.specs`.
  - Grouped into organized rows with search/filter or clean alternating colors.

- [ ] **Step 3: Verification & Build**
  - Run `npm --prefix frontend run build` to verify clean compilation.

---

### Task 2: Redesign Hero Section & Pricing & CTAs in `ProductDetailPage.tsx`
**Files:**
- Modify: `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`

- [ ] **Step 1: Title & Stock Hierarchy**
  - Clean title: `<h1>Điện thoại {product.name}</h1>`.
  - Sub-bar: Star rating `★ {rating}` (smooth scroll to reviews on click), `({reviewCount} đánh giá)`, and compact badge `🟢 Sẵn hàng tại kho`.

- [ ] **Step 2: Commercial Pricing & Promotion Box**
  - Large price in `#E11D48` (`text-rose-600`), strike-through original price, `-11%` badge.
  - Gift Box (Khuyến mại đặc quyền 🎁) with 4 high-value bullet points.

- [ ] **Step 3: 2-Line Variant Selection Cards**
  - Color cards: Color swatch circle + color name + active checkmark.
  - Storage cards: 2-line card (Top: `{storage} • {ram} RAM`, Bottom: `{price}₫`) with corner checkmark in active state.

- [ ] **Step 4: Dual CTAs (MUA NGAY + TRẢ GÓP 0%)**
  - `MUA NGAY` button in `bg-rose-600 hover:bg-rose-700` with 2 text lines.
  - `TRẢ GÓP 0%` button in `bg-blue-600 hover:bg-blue-700` with 2 text lines opening `InstallmentModal`.
  - Add to cart button with cart icon.

---

### Task 3: Restructure Bottom Section into 65:35 Layout & Polishing
**Files:**
- Modify: `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`

- [ ] **Step 1: 65:35 Grid Layout**
  - Left column (65-70%):
    - Detailed `product.description`.
    - 4 Visual hardware highlights: Màn hình, Hiệu năng Chipset, Camera, Pin & Sạc.
    - Customer reviews section with star breakdown and official PhoneShop replies.
  - Right column (30-35%):
    - Compact specs table with zebra striping.
    - Button "Xem cấu hình chi tiết ➔" opening `ProductSpecsModal`.
    - PhoneShop Commitment Box: replacing any legacy "MobileCommerce" text with "PhoneShop".

- [ ] **Step 2: Floating Sticky Purchase Bar & Global Consistency**
  - Sticky purchase bar styled in commercial rose color `#E11D48`.
  - Unified PhoneShop brand strings.

- [ ] **Step 3: Verification & Tests**
  - Run `npm --prefix frontend run build`.
  - Run backend unit tests `npm --prefix backend test`.
  - Capture interactive screenshot on `http://localhost:5173/products/:id` using Playwright.
