# Brand Filter Logos & Count Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove product count numbers from brand filters and integrate high-contrast circular brand logos before brand names on the Storefront.

**Architecture:** Update frontend type definitions to support `logoUrl`, update `HomePage.tsx` to render mini-badge brand logos with fallback to brand initials, remove count badges, and verify type safety.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React (`LayoutGrid`).

---

### Task 1: Update Brand TypeScript Interface

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add `logoUrl?: string;` to `Brand` interface**

In `frontend/src/types/index.ts`, update `Brand` so it includes `logoUrl?: string;` alongside `logo?: string;`.

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

- [ ] **Step 2: Verify type check passes**

Run: `npm --prefix frontend run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(types): add logoUrl to Brand interface"
```

---

### Task 2: Implement Mini-Badge Brand Logos & Remove Counts on HomePage

**Files:**
- Modify: `frontend/src/pages/storefront/Home/HomePage.tsx`

- [ ] **Step 1: Import `LayoutGrid` from `lucide-react`**

Ensure `LayoutGrid` is imported from `lucide-react`.

- [ ] **Step 2: Update "Tất cả" button**

Change:
```tsx
<button
  type="button"
  onClick={() => setSelectedBrand('all')}
  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
    selectedBrand === 'all'
      ? 'bg-slate-900 text-white shadow-md'
      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
  }`}
>
  Tất cả ({products.length})
</button>
```
To:
```tsx
<button
  type="button"
  onClick={() => setSelectedBrand('all')}
  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
    selectedBrand === 'all'
      ? 'bg-slate-900 text-white shadow-md'
      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
  }`}
>
  <LayoutGrid className="w-3.5 h-3.5" />
  <span>Tất cả</span>
</button>
```

- [ ] **Step 3: Update Brand buttons with Mini-Badge logos & remove count**

In `brands.map((b) => ...)`:
- Remove `const count = products.filter(...).length;`.
- Remove the count pill element.
- Insert circular logo wrapper:
```tsx
{brands.map((b) => {
  const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();
  const logo = b.logoUrl || b.logo;

  return (
    <button
      key={b.id || b.slug}
      type="button"
      onClick={() => setSelectedBrand(b.name)}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
        isSelected
          ? 'bg-slate-900 text-white shadow-md'
          : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center p-0.5 shrink-0 transition-colors ${
          isSelected ? 'bg-white' : 'bg-slate-100'
        }`}
      >
        {logo ? (
          <img
            src={logo}
            alt={b.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="text-[10px] font-bold text-slate-600">{b.name.charAt(0)}</span>
        )}
      </span>
      <span>{b.name}</span>
    </button>
  );
})}
```

- [ ] **Step 4: Verify frontend build**

Run: `npm --prefix frontend run build`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/storefront/Home/HomePage.tsx
git commit -m "feat(storefront): add brand logos and remove product count from brand filter"
```

---

### Task 3: Enhance ProductListingPage Brand Filter with Logos

**Files:**
- Modify: `frontend/src/pages/storefront/Products/ProductListingPage.tsx`

- [ ] **Step 1: Add brand logo mini-badges in sidebar filter**

In `ProductListingPage.tsx`, inside the `Filter: Brands` section, update each label to render the brand logo thumbnail alongside the checkbox and brand name for consistent visual brand recognition.

- [ ] **Step 2: Verify build**

Run: `npm --prefix frontend run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/storefront/Products/ProductListingPage.tsx
git commit -m "feat(catalog): display brand logos in product listing sidebar filters"
```

---

### Task 4: End-to-End Build and Verification

- [ ] **Step 1: Run full frontend build**
- [ ] **Step 2: Run backend tests**
- [ ] **Step 3: Confirm no TypeScript or console regressions**
