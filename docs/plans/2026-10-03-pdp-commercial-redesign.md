# PDP Commercial E-Commerce Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development and dispatching-parallel-agents to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Product Detail Page (`ProductDetailPage.tsx`) into a high-converting, professional commercial e-commerce experience (like CellphoneS/TGDĐ) with commercial red pricing, 2-line variant selection cards, promotion gift box, 0% installment calculator modal, and a balanced 65:35 content layout.

**Architecture:** Decompose PDP into modular subcomponents in `frontend/src/components/storefront/pdp/`, then integrate into `ProductDetailPage.tsx` while ensuring 100% color harmony with the PhoneShop design system (`#F8FAFC` background, `#2563eb` primary blue, `#E11D48` commercial rose red).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Ant Design (Modal/Drawer).

---

## File Decomposition Map

1. `frontend/src/components/storefront/pdp/ProductPromotionBox.tsx` (New)
   - Renders the "🎁 KHUYẾN MẠI ĐẶC QUYỀN TẠI PHONESHOP" block.
   - Soft red/rose container with bullet list of 4 high-value purchase perks.

2. `frontend/src/components/storefront/pdp/ProductInstallmentModal.tsx` (New)
   - Interactive 0% installment calculator modal.
   - Prepayment options: 0%, 20%, 30%, 50%.
   - Term options: 3, 6, 9, 12 months.
   - Live monthly fee calculation and direct checkout CTA.

3. `frontend/src/components/storefront/pdp/ProductSpecsModal.tsx` (New)
   - Modal showing complete full-detail technical hardware specifications from `product.specs`.

4. `frontend/src/components/storefront/pdp/ProductSpecsSummaryCard.tsx` (New)
   - 35% right-column summary card with zebra-striping list of key hardware specs (Màn hình, Chipset, RAM/ROM, Camera, Pin/Sạc).
   - "Xem cấu hình chi tiết ➔" button opening `ProductSpecsModal`.
   - 4 PhoneShop trust guarantees.

5. `frontend/src/components/storefront/pdp/ProductHighlightsSection.tsx` (New)
   - 65% left-column section with product description, 4 technology highlight cards (Màn hình, Hiệu năng, Camera, Pin & Sạc), and customer reviews.

6. `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx` (Modified)
   - Simplified title: `Điện thoại {product.name}`.
   - Commercial red price `#E11D48` (`text-rose-600`) with badge `-XX%`.
   - 2-line variant selection cards with active checkmarks.
   - Integration of `ProductPromotionBox`, `ProductInstallmentModal`, `ProductHighlightsSection`, and `ProductSpecsSummaryCard`.
   - Dual-action buttons: "MUA NGAY" + "TRẢ GÓP 0%".
   - Sticky bottom bar harmonized with red pricing and matching CTA buttons.

---

## Tasks Breakdown

### Task 1: Create PDP Subcomponents in `frontend/src/components/storefront/pdp/`
- Files to create:
  - `frontend/src/components/storefront/pdp/ProductPromotionBox.tsx`
  - `frontend/src/components/storefront/pdp/ProductInstallmentModal.tsx`
  - `frontend/src/components/storefront/pdp/ProductSpecsModal.tsx`
  - `frontend/src/components/storefront/pdp/ProductSpecsSummaryCard.tsx`
  - `frontend/src/components/storefront/pdp/ProductHighlightsSection.tsx`
- Verification: `npm --prefix frontend run build`

### Task 2: Integrate Hero Section & 65:35 Bottom Layout in `ProductDetailPage.tsx`
- File to modify: `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`
- Verification: `npm --prefix frontend run build` and visual Playwright screenshot on `http://localhost:5173/products/:id`.
