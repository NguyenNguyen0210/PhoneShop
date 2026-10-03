# Design Specification: Brand Filter Tabs with Logos and Count Removal

**Date:** 2026-10-03  
**Status:** Approved  
**Topic:** Storefront Home Brand Filter Enhancement (Logo Integration & Count Removal)

---

## 1. Problem Statement & Motivation
In the Storefront homepage (`HomePage.tsx`), the "Danh Mục Smartphone Chính Hãng" section currently displays a segmented filter bar for brands. Each brand button displays the brand name followed by the count of products matching that brand in parentheses (e.g. `Apple (12)`, `Samsung (15)`).

The user requested:
1. Remove product counts behind each brand and on the "Tất cả" tab.
2. Add the corresponding brand's logo directly in front of the brand name.
3. User selected **Style A (Mini Badge)** from the visual brainstorming exploration:
   - Each logo is enclosed in a crisp white/light circular badge (`w-5 h-5` / 20x20px) before the brand title.
   - When the button is selected (`bg-slate-900 text-white`), the badge retains its white background so both dark logos (Apple, Sony) and colored logos (Samsung, Xiaomi, OPPO, Google Pixel, etc.) remain high-contrast and legible.
   - "Tất cả" tab replaces product count with a clean `<LayoutGrid className="w-3.5 h-3.5" />` icon to align visually with the brand pills.

---

## 2. Technical Architecture & Data Flow

### 2.1 Backend / Database
- Database table `brands` already includes the field `logoUrl` (populated with SVG/PNG Wikimedia CDN assets across all 10 seeded brands: Apple, Samsung, Xiaomi, OPPO, Google Pixel, Vivo, Realme, ASUS, Sony, HONOR).
- The existing endpoint `GET /api/brands` queries `prisma.brand.findMany()` and already returns `{ id, name, slug, description, logoUrl, isActive, ... }`.

### 2.2 Frontend Types
- `frontend/src/types/index.ts`: The `Brand` interface currently has `logo?: string;`. We update it to:
  ```ts
  export interface Brand {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    logoUrl?: string;
    description?: string;
    isActive?: boolean;
  }
  ```

### 2.3 Storefront UI (`HomePage.tsx`)
- Import `LayoutGrid` from `lucide-react`.
- Update the "Tất cả" button:
  - Remove `({products.length})`.
  - Add `<LayoutGrid className="w-3.5 h-3.5" />` before the label.
- Update each Brand button:
  - Remove `<span className="text-[10px]...">{count}</span>` element and remove the unused `count` calculation.
  - Add a logo badge before `b.name`:
    ```tsx
    <span className={`w-5 h-5 rounded-full flex items-center justify-center p-0.5 shrink-0 transition-colors ${
      isSelected ? 'bg-white' : 'bg-slate-100'
    }`}>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={b.name}
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to text initial if image load fails
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span className="text-[10px] font-bold text-slate-600">{b.name.charAt(0)}</span>
      )}
    </span>
    ```
- Check any other places where brand count was displayed in category filters (e.g. `ProductListingPage.tsx` sidebar filter). Note: The user specifically screenshotted the home category tabs ("ở phần danh mục này"), but we verify if any shared components exist.

---

## 3. Verification & Acceptance Criteria
1. **Visual Accuracy:** Brand buttons on Storefront Home display circular logo badges preceding the brand names.
2. **Count Removal:** Neither "Tất cả" nor any brand button shows product counts.
3. **Contrast & Legibility:** When a brand tab is active (dark background), the logo remains clearly legible inside the white badge.
4. **Fallback:** If a brand has no `logoUrl` or the image fails to load, a fallback initial letter renders gracefully.
5. **No Regressions:** `npm --prefix frontend run build` passes with 0 type errors.
