# Design Specification: Homepage Advanced Filter & Sort Integration

**Date:** 2026-10-03  
**Status:** Approved  
**Topic:** Storefront Homepage Advanced Filter, Dual-Range Price Slider, ROM/RAM Chips, and Sorting

---

## 1. Context & Motivation
On the storefront, the catalog page (`/products`) already offers a sidebar search filter (Brand, Price, ROM, RAM) and a top toolbar for sorting and search keywords. However, the homepage (`/`) previously only had horizontal brand tabs and lacked granular filtering controls (Dual-range Price Slider, ROM chips, RAM chips, In-stock filter, On-sale filter, Rating filter) and sorting options (Price Low-to-High, Price High-to-Low, Highest Rated, Newest).

The user requested:
1. Retain the horizontal Brand filter tabs with high-contrast logos on the top row.
2. Remove the duplicate Brand list from the sidebar.
3. Integrate an advanced filter sidebar containing:
   - Dual-range price slider (both Min and Max price adjustable, 0đ - 50,000,000đ).
   - Storage (ROM) multi-select chips: 128GB, 256GB, 512GB, 1TB.
   - Memory (RAM) multi-select chips: 8GB, 12GB, 16GB.
   - Availability & Discounts checkboxes: "Đang có hàng sẵn", "Đang giảm giá".
   - Rating filter: "Từ 4 sao trở lên (★ 4.0+)".
   - "Đặt lại bộ lọc" (Reset all filters) button.
4. Top control bar above product cards:
   - Search keyword input ("Lọc theo tên điện thoại...").
   - Sort dropdown ("Mặc định", "Giá tăng dần", "Giá giảm dần", "Đánh giá cao nhất", "Mới nhất").
   - Product count indicator.
5. Responsive design: On mobile/tablet, support a toggleable filter drawer or collapsible panel so the interface remains clean on small screens.

---

## 2. Technical Architecture & Components Decomposition

### 2.1 Reusable Filter Component: `frontend/src/components/storefront/ProductFilterSidebar.tsx`
To prevent code duplication between `HomePage.tsx` and `ProductListingPage.tsx`, extract the sidebar filtering logic into a dedicated component:
- Props:
  - `priceRange: [number, number]`
  - `onPriceRangeChange: (val: [number, number]) => void`
  - `selectedStorages: string[]`
  - `onToggleStorage: (storage: string) => void`
  - `selectedRams: string[]`
  - `onToggleRam: (ram: string) => void`
  - `inStockOnly: boolean`
  - `onToggleInStock: (val: boolean) => void`
  - `onSaleOnly: boolean`
  - `onToggleOnSale: (val: boolean) => void`
  - `minRating: number | null`
  - `onSelectMinRating: (rating: number | null) => void`
  - `hasActiveFilters: boolean`
  - `onResetFilters: () => void`
  - `showBrands?: boolean` (defaults to false for HomePage since brand tabs are already top-level)
  - `brands?: Brand[]`
  - `selectedBrands?: string[]`
  - `onToggleBrand?: (name: string) => void`

### 2.2 Reusable Toolbar Component: `frontend/src/components/storefront/ProductSortToolbar.tsx`
- Props:
  - `searchKeyword: string`
  - `onSearchChange: (kw: string) => void`
  - `sortBy: 'default' | 'price-asc' | 'price-desc' | 'rating' | 'newest'`
  - `onSortChange: (sort: string) => void`
  - `totalCount: number`
  - `onToggleMobileFilter?: () => void`

### 2.3 `HomePage.tsx` Integration
- Maintain `selectedBrand` state synced with the top brand pills.
- Add state for `priceRange` `[0, 50000000]`, `selectedStorages`, `selectedRams`, `inStockOnly`, `onSaleOnly`, `minRating`, `searchKeyword`, and `sortBy`.
- Use a memoized filter & sort pipeline:
  ```ts
  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Brand filter
        if (selectedBrand !== 'all') {
          const matchBrand = p.brand?.name.toLowerCase() === selectedBrand.toLowerCase() ||
                             p.brandId?.toLowerCase() === selectedBrand.toLowerCase();
          if (!matchBrand) return false;
        }
        // Keyword
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          if (!p.name.toLowerCase().includes(kw) && !p.brand?.name.toLowerCase().includes(kw)) return false;
        }
        // Price dual-range
        const minVariantPrice = Math.min(...p.variants.map((v) => v.price));
        if (minVariantPrice < priceRange[0] || minVariantPrice > priceRange[1]) return false;
        // Storage
        if (selectedStorages.length > 0) {
          const match = p.variants.some((v) => selectedStorages.some((s) => v.storage.toLowerCase().includes(s.toLowerCase())));
          if (!match) return false;
        }
        // RAM
        if (selectedRams.length > 0) {
          const match = p.variants.some((v) => v.ram && selectedRams.some((r) => v.ram?.toLowerCase().includes(r.toLowerCase())));
          if (!match) return false;
        }
        // In stock
        if (inStockOnly) {
          const inStock = p.variants.some((v) => (v.inventoryQty ?? v.inventory?.availableQty ?? 0) > 0);
          if (!inStock) return false;
        }
        // On sale
        if (onSaleOnly) {
          const onSale = p.variants.some((v) => v.compareAtPrice && v.compareAtPrice > v.price);
          if (!onSale) return false;
        }
        // Rating
        if (minRating !== null && (p.rating ?? 0) < minRating) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return (a.variants[0]?.price || 0) - (b.variants[0]?.price || 0);
        if (sortBy === 'price-desc') return (b.variants[0]?.price || 0) - (a.variants[0]?.price || 0);
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        return 0;
      });
  }, [products, selectedBrand, searchKeyword, priceRange, selectedStorages, selectedRams, inStockOnly, onSaleOnly, minRating, sortBy]);
  ```

---

## 3. Verification & Acceptance Criteria
1. **Brand Pills Intact:** Top horizontal brand pills with logos continue to work and filter.
2. **Dual-range Price Slider:** Min thumb and Max thumb both draggable smoothly from 0đ to 50,000,000đ.
3. **Storage & RAM Chips:** Clicking chips toggles filtering in real time.
4. **Availability & Discounts:** Checkboxes correctly filter in-stock items and items with discounts.
5. **Sort Dropdown:** Sorter correctly reorders cards by price asc/desc, rating, and newest.
6. **Responsive Layout:** Works smoothly on desktop (sidebar + 3-col product grid) and mobile/tablet (drawer/collapsible).
7. **Zero Type Errors:** `npm --prefix frontend run build` passes with 0 errors.
