# Design Specification: Homepage Featured Brands Filter & Sidebar Brand Selection

- **Date:** 2026-10-10
- **Status:** Approved
- **Author:** AI Agent & System Team

## 1. Context & Motivation

On the Storefront Home page (`/`), brand discovery currently has two areas:
1. A quick horizontal brand bar above the product listing.
2. A left sidebar filter form (`ProductFilterSidebar`) used to filter products by specifications, price, etc.

Currently, the horizontal bar displays all active brands indiscriminately. In Admin Brand Management (`/admin/brands`), the "Trang chủ" column (`★ Nổi bật` / `☆ Thường`) was previously stored only in local storage without syncing to the backend or affecting the storefront.

Additionally, the sidebar filter form currently has `showBrands={false}` on the Home page, preventing users from seeing or selecting from the full list of available brands when searching.

## 2. Requirements

1. **Backend Featured Brands Persistence (`SystemSetting`):**
   - Use the existing `SystemSetting` table with key `FEATURED_BRANDS`.
   - Default value: `apple,samsung,xiaomi,oppo,vivo,realme,honor,oneplus`.
   - Expose `FEATURED_BRANDS` in public settings (`GET /settings/public`) and `GET /brands/featured`.
   - Add endpoint `PUT /brands/featured` or `PATCH /brands/featured` (Admin/Manager only) allowing Admin to update the list of featured brand slugs.
   - Preserves Supabase Prisma schema and foreign keys (zero schema migration required).

2. **Admin Brand Management Integration (`AdminBrandsPage.tsx`):**
   - Fetch the featured brand list from the backend upon loading.
   - Clicking `★ Nổi bật` / `☆ Thường` sends the updated list to `PUT /brands/featured`, updating the state globally in the database.
   - Shows feedback notifications on success/failure.

3. **Storefront Horizontal Brand Bar (`HomePage.tsx`):**
   - The horizontal quick bar filters `brands` so that only brands with `isActive: true` AND whose slug/name is included in `featuredBrands` are rendered.
   - Brands set to `☆ Thường` are excluded from this quick bar immediately.

4. **Storefront Filter Sidebar Brand Button Chips (`ProductFilterSidebar.tsx` & `HomePage.tsx`):**
   - Enable `showBrands={true}` on both Desktop sidebar and Mobile filter drawer in `HomePage.tsx`.
   - Render the Brand section in `ProductFilterSidebar` with styled interactive button chips (grid format with Brand Logo + Brand Name).
   - Support multi-select: clicking a brand button toggles its selection. Selected buttons feature an active border and background (`bg-blue-50 border-blue-600 text-blue-700 font-semibold`).
   - Syncs with `selectedBrands` filtering in `HomePage.tsx` so products of any chosen brands are included.

## 3. Architecture & Data Flow

```
Admin Brand Page                 Backend (PostgreSQL)               Storefront HomePage
       │                                  │                                  │
       ├─ Toggle '★ Nổi bật' ───────────► │                                  │
       │   PUT /brands/featured           ├─ Saves to SystemSetting          │
       │                                  │                                  │
       │                                  │ ◄── GET /settings/public ────────┤
       │                                  │     (or /brands/featured)        ├─ Filter horizontal bar
       │                                  │                                  │   (Only Featured Brands)
       │                                  │                                  │
       │                                  │ ◄── GET /brands ─────────────────┤
       │                                  │     (All Active Brands)          ├─ Sidebar Filter Form
       │                                  │                                  │   (Button chips for all brands)
```

## 4. Verification & Testing

1. **Backend Tests:**
   - Test `brands.service.spec.ts` or `brands.controller.spec.ts`: Test `getFeaturedBrands` and `updateFeaturedBrands`.
2. **Frontend Tests:**
   - `AdminBrandsPage.spec.tsx`: Test that clicking `toggleFeatured` calls the service API.
   - `HomePage.spec.tsx` or `ProductFilterSidebar.spec.tsx`: Test that only featured brands show in horizontal bar, and all brands are selectable in the sidebar with button chips.
3. **Regression Tests:**
   - `npm test` on frontend and backend (all test suites must pass).
