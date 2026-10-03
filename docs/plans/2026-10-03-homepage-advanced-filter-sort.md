# Implementation Plan: Homepage Advanced Filter & Sort Integration

**Date:** 2026-10-03  
**Spec Reference:** `docs/specs/2026-10-03-homepage-advanced-filter-sort-design.md`  
**Execution Strategy:** Parallel subagents (`subagent-driven-development`)

---

## 1. Objectives & Overview
Integrate advanced filtering (Dual-Range Price Slider from 0 to 50M VND, ROM chips, RAM chips, In-stock checkbox, On-sale checkbox, 4-star+ rating checkbox) and sorting (Default, Price Asc/Desc, Rating, Newest) on the Storefront Homepage (`HomePage.tsx`).
- Preserve the horizontal Brand tabs with logos at the top row.
- Omit brand filters from the sidebar to eliminate redundancy.
- Extract modular, reusable components so both `HomePage.tsx` and `ProductListingPage.tsx` remain clean and consistent.

---

## 2. File Decomposition

1. `frontend/src/components/storefront/ProductFilterSidebar.tsx` (New)
   - Dual-range price slider (0 - 50,000,000₫ using Ant Design Slider with custom blue theme).
   - Multi-select ROM buttons (`128GB`, `256GB`, `512GB`, `1TB`).
   - Multi-select RAM buttons (`8GB`, `12GB`, `16GB`).
   - Availability (`inStockOnly`) & Promotion (`onSaleOnly`) toggle checkboxes.
   - User Rating filter (`minRating: 4.0+`).
   - Reset All Filters button when any filter is active.
   - `showBrands?: boolean` (defaults to false).

2. `frontend/src/components/storefront/ProductSortToolbar.tsx` (New)
   - Real-time search keyword input.
   - Sort dropdown: Mặc định, Giá tăng dần, Giá giảm dần, Đánh giá cao nhất, Mới nhất.
   - Product count badge (`Tìm thấy X sản phẩm`).
   - Mobile filter drawer toggle button for small screens.

3. `frontend/src/pages/storefront/Home/HomePage.tsx` (Modified)
   - Keep top brand pills with logos unchanged.
   - Split main section into a responsive 2-column layout:
     - Left column: `ProductFilterSidebar` (sticky, desktop).
     - Right column: `ProductSortToolbar` + Product Grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6`).
   - Implement client-side filtering pipeline (Brand, Price min/max, ROM, RAM, In-stock, On-sale, Rating, Keyword) and sorting pipeline (Price, Rating, Newest).
   - Render informative Empty State with "Xóa bộ lọc" button when 0 items match.

4. `frontend/src/pages/storefront/Products/ProductListingPage.tsx` (Modified)
   - Upgrade price slider to dual-range slider and adopt shared filter controls for full storefront consistency.

---

## 3. Parallel Task Plan

### Task 1: Create `ProductFilterSidebar.tsx` & `ProductSortToolbar.tsx`
- **Assigned to:** Subagent 1 (Component Builder)
- **Files:**
  - `frontend/src/components/storefront/ProductFilterSidebar.tsx`
  - `frontend/src/components/storefront/ProductSortToolbar.tsx`
- **Responsibilities:**
  - Implement full dual-range slider, storage/RAM buttons, check boxes, ratings, and reset state.
  - Implement search bar, sort select, count badge, and mobile toggle drawer.
- **Verification:** Run `npm --prefix frontend run build` to verify clean compilation.

### Task 2: Integrate Filter & Sort Pipeline into `HomePage.tsx`
- **Assigned to:** Subagent 2 (Page Integrator)
- **Files:**
  - `frontend/src/pages/storefront/Home/HomePage.tsx`
- **Responsibilities:**
  - Wire state: `priceRange: [number, number]`, `selectedStorages`, `selectedRams`, `inStockOnly`, `onSaleOnly`, `minRating`, `searchKeyword`, `sortBy`.
  - Assemble layout: Top brand logo row intact -> 2-column container (Sidebar on left + Toolbar and Grid on right).
  - Add Empty State component with Reset button.
- **Verification:** Run `npm --prefix frontend run build` and test filtering against API products.

### Task 3: Upgrade `ProductListingPage.tsx` Dual-Range Price Slider
- **Assigned to:** Subagent 3 (Catalog Harmonizer)
- **Files:**
  - `frontend/src/pages/storefront/Products/ProductListingPage.tsx`
- **Responsibilities:**
  - Upgrade single-range slider to dual-range slider (`[min, max]`) so users can drag both bounds.
  - Add in-stock and on-sale filter options matching the homepage.
- **Verification:** Run `npm --prefix frontend run build`.

---

## 4. Final End-to-End Verification
- Build frontend (`npm --prefix frontend run build`).
- Verify backend tests (`npm --prefix backend test`).
- Verify live browser interaction on `http://localhost:5173`.
