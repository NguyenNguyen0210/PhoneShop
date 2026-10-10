# Homepage Featured Brands Filter & Sidebar Brand Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or dispatching-parallel-agents to implement this plan concurrently across 3 independent threads. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist featured brands globally in the system setting so toggling "Trang chủ" in Admin Brand Management immediately syncs to the customer Storefront, filtering the top horizontal bar to featured brands only, while providing full multi-select brand button chips in the left sidebar filter.

**Architecture:**
- Backend: Add `FEATURED_BRANDS` to `DEFAULT_DEFINITIONS` in `SystemSettingsService`. Add endpoints in `BrandsController`: `GET /brands/featured` (public) and `PUT /brands/featured` (Admin/Manager).
- Frontend Admin: In `AdminBrandsPage.tsx`, load featured brands from API, and sync updates via `brandService.updateFeatured(slugs)` when clicking `★ Nổi bật` / `☆ Thường`.
- Frontend Storefront: In `HomePage.tsx`, horizontal brand bar displays only `featured` brands. In `ProductFilterSidebar.tsx`, show brands with interactive button chips (grid format, multi-select).

**Tech Stack:** NestJS, Prisma ORM, React 19, Vite, Ant Design 6, Vitest, Jest.

---

### Thread 1: Backend Featured Brands API (Independent)

**Files:**
- Modify: `backend/src/modules/settings/settings.service.ts`
- Modify: `backend/src/modules/brands/brands.controller.ts`
- Modify: `backend/src/modules/brands/brands.service.ts`
- Modify: `backend/src/modules/brands/dto/update-featured-brands.dto.ts` (or inline dto)
- Test: `backend/src/modules/brands/__tests__/brands.featured.spec.ts`

- [ ] **Step 1.1: Add `FEATURED_BRANDS` to `DEFAULT_DEFINITIONS` and `getPublicSettings()` in `settings.service.ts`**
  ```ts
  FEATURED_BRANDS: {
    group: 'general',
    isSecret: false,
    defaultVal: 'apple,samsung,xiaomi,oppo,vivo,realme,honor,oneplus',
  },
  ```

- [ ] **Step 1.2: Add `getFeatured()` and `updateFeatured()` in `brands.service.ts`**
  Inject `SystemSettingsService` (or access via `prisma.systemSetting`).
  `getFeatured()`: returns array of string slugs `['apple', 'samsung', ...]`.
  `updateFeatured(slugs: string[])`: saves comma-separated string to `FEATURED_BRANDS`.

- [ ] **Step 1.3: Expose endpoints in `brands.controller.ts`**
  `GET /brands/featured` (public): returns featured brand slugs.
  `PUT /brands/featured` (UseGuards, Roles: MANAGER, ADMIN): accepts `{ slugs: string[] }` and saves.

- [ ] **Step 1.4: Write unit tests and verify**
  Test `GET /brands/featured` and `PUT /brands/featured`.
  Run: `npm test` in `backend/`

- [ ] **Step 1.5: Commit backend changes**
  Commit: `feat(backend): add featured brands setting and api endpoints`

---

### Thread 2: Frontend Admin Brand Management Sync (Independent)

**Files:**
- Modify: `frontend/src/services/brandService.ts`
- Modify: `frontend/src/pages/Admin/Brands/AdminBrandsPage.tsx`
- Test: `frontend/src/pages/Admin/Brands/__tests__/AdminBrandsPage.spec.tsx`

- [ ] **Step 2.1: Add API calls in `brandService.ts`**
  `getFeatured(): Promise<string[]>`
  `updateFeatured(slugs: string[]): Promise<string[]>`

- [ ] **Step 2.2: Connect `featuredMap` in `AdminBrandsPage.tsx` to API**
  On page load, fetch `getFeatured()`.
  When toggling `toggleFeatured(brand)`: compute next featured slugs, call `brandService.updateFeatured(slugs)` with loading feedback, update state.

- [ ] **Step 2.3: Run Admin Brands tests and commit**
  Run: `npx vitest run src/pages/Admin/Brands/__tests__/AdminBrandsPage.spec.tsx`
  Commit: `feat(admin): sync featured brands toggle with backend api`

---

### Thread 3: Frontend Storefront Homepage & Sidebar Filter (Independent)

**Files:**
- Modify: `frontend/src/components/storefront/ProductFilterSidebar.tsx`
- Modify: `frontend/src/pages/storefront/Home/HomePage.tsx`
- Test: `frontend/src/components/storefront/__tests__/ProductFilterSidebar.spec.tsx`
- Test: `frontend/src/pages/storefront/Home/__tests__/HomePageUrlFilter.spec.tsx`

- [ ] **Step 3.1: Update `HomePage.tsx` horizontal bar**
  Fetch `brandService.getFeatured()` or load from `productService.getBrands()` / `settingsService`.
  Filter the top horizontal brand bar to only include brands where `isFeatured` is true.

- [ ] **Step 3.2: Enable Brand Buttons in `ProductFilterSidebar.tsx`**
  In `HomePage.tsx`: Pass `showBrands={true}` to both desktop `ProductFilterSidebar` and mobile drawer.
  In `ProductFilterSidebar.tsx`: Style brand options as interactive button chips (grid 2-cols with logo + name, active state `border-blue-600 bg-blue-50 text-blue-700`).

- [ ] **Step 3.3: Run Storefront tests and commit**
  Run: `npx vitest run src/components/storefront/__tests__/ProductFilterSidebar.spec.tsx`
  Commit: `feat(storefront): filter top bar by featured brands and add full brand button chips to filter sidebar`

---

### Integration & Verification

- [ ] **Step 4.1: Run full test suites in backend and frontend**
- [ ] **Step 4.2: Verify builds and types**
