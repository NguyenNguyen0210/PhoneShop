# Design Specification: Product Detail Page (PDP) Commercial E-Commerce Redesign

**Date:** 2026-10-03  
**Status:** Approved  
**Topic:** Storefront PDP (`ProductDetailPage.tsx`) Visual Hierarchy, Pricing, Promotions, Installment Modal, and 65:35 Content Layout

---

## 1. Context & Motivation
The current Product Detail Page (`ProductDetailPage.tsx`) provides functional completeness (image carousel, variant selector, technical tabs, sticky purchase bar), but presents aesthetic and commercial gaps:
1. **Title Clutter:** The h1 title appends `(Color - Storage)`, which clutters SEO and visual elegance.
2. **Pricing Contrast:** The price uses blue rather than commercial e-commerce red/rose (`#E11D48` / `text-rose-600`), missing high conversion impact.
3. **Missing Conversion Blocks:** No dedicated promotion/gift box (`🎁 Khuyến mại đặc quyền`), creating a flat impression.
4. **Weak Variant Selectors:** Single-line thin bordered buttons instead of structured 2-line cards with checkmarks.
5. **Call To Action (CTA):** Single basic button lacks dual-stream conversion ("MUA NGAY" + "TRẢ GÓP 0%" installment option).
6. **Bottom Layout:** Full-width accordion/tabs leave excessive whitespace and lack structured reading flow.
7. **Brand Consistency:** Old placeholder references to "MobileCommerce" rather than "PhoneShop".

---

## 2. Technical Architecture & Component Decomposition

### 2.1 Reusable Sub-components in `frontend/src/components/storefront/pdp/`
To maintain high code quality and clean separation of concerns, extract modular subcomponents:

1. `frontend/src/components/storefront/pdp/ProductPromotionBox.tsx`
   - Highlights 4 exclusive gifts/discounts at PhoneShop with gift icons.
   - Styled with soft rose border/background (`bg-rose-50/50 border-rose-200/80`).

2. `frontend/src/components/storefront/pdp/ProductInstallmentModal.tsx`
   - Interactive 0% installment calculator:
     - Down payment selection (0%, 20%, 30%, 50%).
     - Term selection (3, 6, 9, 12 months).
     - Live calculation of monthly payments.
     - Direct CTA: "Tiến hành đặt cọc / Giữ máy 15p" leading to `/checkout`.

3. `frontend/src/components/storefront/pdp/ProductSpecsModal.tsx`
   - Clean Ant Design / Tailwind modal rendering 100% of detailed OEM specifications.

4. `frontend/src/components/storefront/pdp/ProductSpecsSummaryCard.tsx`
   - 35% right-column summary card with zebra striping for key hardware specs (Màn hình, Chipset, RAM/ROM, Camera, Pin/Sạc).
   - "Xem cấu hình chi tiết ➔" button opening `ProductSpecsModal`.
   - PhoneShop 4-pillar trust commitments.

5. `frontend/src/components/storefront/pdp/ProductHighlightsSection.tsx`
   - 65% left-column section with product description and 4 auto-extracted hardware highlight cards (Màn hình, Hiệu năng, Camera, Pin).
   - Customer Reviews list with star ratings and verified buyer tags.

### 2.2 Integration in `ProductDetailPage.tsx`
- Simplified product title `Điện thoại {product.name}` in `<h1>`.
- Commercial price display (`#E11D48`, bold monospace font, strike-through original price, `-XX%` badge).
- 2-line variant selection cards with active checkmarks and dynamic price tags.
- Dual primary action buttons:
  - Red `MUA NGAY` (Subtext: *Giao tận nơi hoặc nhận tại cửa hàng*).
  - Blue `TRẢ GÓP 0%` (Subtext: *Duyệt nhanh qua CCCD/Thẻ tín dụng*).
  - Quick cart icon button.
- Bottom 2-column layout (65:35 desktop grid).
- Sticky bottom bar updated with commercial red pricing and synchronized CTA buttons.
- Harmonized brand naming to **PhoneShop**.

---

## 3. Visual & Aesthetic Standards
- **Page Canvas:** `bg-[#F8FAFC]` (`slate-50`).
- **Cards:** `bg-white border border-slate-200/80 rounded-2xl shadow-xs`.
- **Primary Brand Accent:** `#2563eb` (`blue-600`).
- **Commercial Red Accent:** `#E11D48` (`rose-600`) with `bg-rose-50/50`.
- **Rating Gold:** `#F59E0B` (`amber-500`).
- **Stock Green:** `text-emerald-700 bg-emerald-50 border-emerald-200`.

---

## 4. Verification & Testing
1. Compile check: `npm --prefix frontend run build` exits 0 with no TypeScript errors.
2. Lint check: `npx oxlint` passes without errors.
3. Visual verification: Playwright browser screenshot verifying hero section, promotion box, 2-line variant cards, installment modal, and 65:35 bottom layout.
