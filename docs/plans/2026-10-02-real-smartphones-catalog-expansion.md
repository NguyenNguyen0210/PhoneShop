# 24 Real Smartphones Catalog Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand MobileCommerce's storefront catalog to 24 real, genuine smartphones (100% phone-only) with verified pricing, specifications, and variants scraped via Tavily from CellphoneS, Thế Giới Di Động, and Điện Máy Xanh, while preserving full E2E test compatibility.

**Architecture:** Update `frontend/src/data/mockProducts.ts` with 5 leading smartphone brands (Apple, Samsung, Xiaomi, Google, OPPO) and 4 smartphone categories (Flagship, Màn hình gập, Tầm trung, Phổ thông). Populate 24 phone models with real Vietnamese retail market pricing, specs, and variants. Ensure primary 8 flagship products retain original IDs and local transparent PNG assets to guarantee zero test regressions.

**Tech Stack:** TypeScript, React, Vite, Tailwind CSS, Playwright (Python).

---

### Task 1: Update Smartphone-Only Brands and Categories

**Files:**
- Modify: `MobileCommerce/frontend/src/data/mockProducts.ts:1-20`

- [ ] **Step 1: Define 5 Brands and 4 Phone-Only Categories**

Edit `MobileCommerce/frontend/src/data/mockProducts.ts` to update `mockBrands` (Apple, Samsung, Xiaomi, Google Pixel, OPPO) and `mockCategories` (`c-flagship`, `c-foldable`, `c-midrange`, `c-budget`). Remove tablet and accessory categories.

```typescript
export const mockBrands: Brand[] = [
  { id: 'b-apple', name: 'Apple', slug: 'apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
  { id: 'b-samsung', name: 'Samsung', slug: 'samsung', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
  { id: 'b-xiaomi', name: 'Xiaomi', slug: 'xiaomi', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg' },
  { id: 'b-google', name: 'Google Pixel', slug: 'google', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
  { id: 'b-oppo', name: 'OPPO', slug: 'oppo', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/OPPO_Logo.svg' },
];

export const mockCategories: Category[] = [
  { id: 'c-flagship', name: 'Điện thoại Flagship', slug: 'dien-thoai-flagship' },
  { id: 'c-foldable', name: 'Điện thoại Màn hình gập', slug: 'dien-thoai-man-hinh-gap' },
  { id: 'c-midrange', name: 'Điện thoại Tầm trung', slug: 'dien-thoai-tam-trung' },
  { id: 'c-budget', name: 'Điện thoại Phổ thông', slug: 'dien-thoai-pho-thong' },
];
```

- [ ] **Step 2: Commit Task 1**

```bash
git add frontend/src/data/mockProducts.ts
git commit -m "feat(catalog): configure 5 smartphone brands and 4 phone-only categories"
```

---

### Task 2: Populate 24 Real Smartphones Dataset in `mockProducts.ts`

**Files:**
- Modify: `MobileCommerce/frontend/src/data/mockProducts.ts`

- [ ] **Step 1: Format 24 Products with Real Pricing and Specs**

Write the complete 24 smartphone objects in `mockProducts`:
- Retain the exact IDs for the first 8 products:
  - `prod-iphone-16-pro-max`
  - `prod-iphone-16-plus`
  - `prod-iphone-15-pro-max`
  - `prod-samsung-s24-ultra`
  - `prod-samsung-z-fold6`
  - `prod-samsung-z-flip6`
  - `prod-xiaomi-14-ultra`
  - `prod-pixel-9-pro`
- Append the 16 newly scraped models:
  - Apple: `prod-iphone-16-pro`, `prod-iphone-16`, `prod-iphone-15`, `prod-iphone-13`
  - Samsung: `prod-samsung-s24-plus`, `prod-samsung-s24`, `prod-samsung-s24-fe`, `prod-samsung-a55`, `prod-samsung-a35`
  - Xiaomi: `prod-xiaomi-14t-pro`, `prod-xiaomi-14`, `prod-redmi-note-13-pro`, `prod-redmi-note-13`
  - Google: `prod-google-pixel-9`
  - OPPO: `prod-oppo-find-n3-flip`, `prod-oppo-reno12-pro`
- Ensure each product has realistic retail description, specifications (`specs`), and variants with valid `colorHex`, `price`, `compareAtPrice`, and `inventoryQty`.

- [ ] **Step 2: Verify TypeScript Compilation**

Run in `MobileCommerce/frontend`:
```bash
npm run build
```
Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Commit Task 2**

```bash
git add frontend/src/data/mockProducts.ts
git commit -m "feat(catalog): populate 24 real smartphones with live retail market pricing and specs"
```

---

### Task 3: Storefront & Admin Compatibility Verification

**Files:**
- Check: `MobileCommerce/frontend/src/pages/storefront/Home/HomePage.tsx`
- Check: `MobileCommerce/frontend/src/pages/Admin/Products/AdminProductsPage.tsx`
- Check: `MobileCommerce/frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx`
- Check: `MobileCommerce/frontend/src/pages/Admin/InventoryImei/AdminImeiPage.tsx`

- [ ] **Step 1: Check Brand Filter Dock**

Verify that `HomePage.tsx` renders all 5 brand filter pills dynamically with the updated counts.

- [ ] **Step 2: Check Admin and Cart pages**

Ensure mock product variant bindings in admin pages continue to resolve cleanly.

- [ ] **Step 3: Run TypeScript Type Check**

```bash
npx tsc --noEmit
```
Expected: Zero type errors across the entire codebase.

---

### Task 4: End-to-End Test Suite Execution

**Files:**
- Test: `MobileCommerce/test_frontend_playwright.py`

- [ ] **Step 1: Start Frontend Preview Server and Run Tests**

Run the complete Playwright E2E suite:
```bash
python test_frontend_playwright.py
```
Expected:
- [TEST 1] Storefront Homepage: PASS (renders 24 product items, PhoneShop branding, trust badges)
- [TEST 2] Product Detail & Variant Selector: PASS (fallback `prod-1` and details load cleanly)
- [TEST 3] Cart Interaction & Navigation: PASS
- [TEST 4] Warranty Lookup Page: PASS
- [TEST 5] Auth Pages & Protected Route Guard: PASS
- [TEST 6] Admin Portal Navigation: PASS
- [TEST 7] Responsive Mobile Viewport: PASS
- [TEST 8] Error State & Console Health Check: PASS

- [ ] **Step 2: Verify Captured Screenshots**

Inspect `e2e_screenshots/1_homepage.png` to confirm the 24 smartphone cards render in a balanced 4-column desktop grid.

- [ ] **Step 3: Commit Final Verification**

```bash
git add -u
git commit -m "test: verify 24 real smartphones catalog across 8 E2E test suites"
```
