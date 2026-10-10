# Design Specification: Brand Deactivation Product Visibility

- **Date:** 2026-10-10
- **Status:** Approved
- **Author:** AI Agent & System Team

## 1. Context & Motivation

In the PhoneShop e-commerce system, administrators can toggle the active status of brands (`Brand.isActive`) in the Admin Brand Management screen.

When a brand is disabled (`isActive: false`), all products associated with this brand should no longer be visible or purchasable across the customer-facing storefront (Home page, product catalog, search results, brand filters, PDP, cart, and checkout). However, the products must remain intact in the database and visible in the Admin Product Management interface so administrators can review, modify, or reassign them. When the brand is reactivated, products that are in `ACTIVE` status must immediately reappear on the storefront without any data loss or manual status reconciliation.

## 2. Requirements

1. **Storefront Catalog & Search Query Filtering:**
   - In `backend/src/modules/products/products.service.ts`:
     When querying products for the public storefront (`publicOnly: true`), the query must filter by `brand: { isActive: true }`.
   - Storefront pagination counts (`total`, `totalPages`) must accurately reflect only active products of active brands.
2. **Admin Product Management Parity:**
   - When querying products for admin (`publicOnly: false`), products belonging to inactive brands must remain visible in `findAllAdmin`.
   - Admin UI displays a clear indicator/tag if a product's brand is currently disabled.
3. **Storefront Product Detail Page (PDP):**
   - If a customer accesses a direct link or slug of a product whose brand has `isActive === false`, the PDP must render an informative empty state (*"Sản phẩm tạm ngừng kinh doanh: Thương hiệu này hiện đang tạm ẩn hoặc ngừng kinh doanh trên hệ thống"*), disabling purchasing and cart additions.
4. **Cart & Checkout Validation:**
   - In `backend/src/modules/cart/cart.service.ts`:
     Attempting to add a variant whose product belongs to an inactive brand must throw a `BadRequestException` (*"Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động"*).
   - In `backend/src/modules/orders/orders.service.ts`:
     Checkout must validate that all order items belong to active brands. If an item's brand is inactive, checkout must reject with `BadRequestException`.
5. **Reactivation Behavior:**
   - When a brand is switched back to `isActive: true`, its active products (`status: ACTIVE`) automatically become visible and purchasable again with zero data migrations or side-effects.
   - Products originally marked `DRAFT` or `INACTIVE` remain in their respective statuses.

## 3. Architecture & Implementation Details

### 3.1 Backend Changes

- **`backend/src/modules/products/products.service.ts`:**
  - Update `findAll`:
    ```ts
    if (publicOnly) {
      where.status = ProductStatus.ACTIVE;
      where.brand = { isActive: true };
    }
    ```
    Ensure that when `filter.brandId` is provided alongside `publicOnly`, the constraint `brand: { isActive: true }` is preserved so inactive brands query returns an empty list.

- **`backend/src/modules/cart/cart.service.ts`:**
  - When fetching product variant for `addToCart` and `updateQuantity`:
    Include `product: { include: { brand: true } }` if not already present.
    Reject if `variant.product.brand && !variant.product.brand.isActive`.

- **`backend/src/modules/orders/orders.service.ts`:**
  - In checkout variant pre-validation, ensure `item.variant.product.brand?.isActive !== false`.

### 3.2 Frontend Changes

- **`frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`:**
  - Check `if (product && product.brand && product.brand.isActive === false)`:
    Render the friendly deactivated state with a redirect button back to `/products`.

- **`frontend/src/pages/Admin/Products/AdminProductsPage.tsx`:**
  - In the Brand column of the product table:
    If `record.brand && record.brand.isActive === false`, show a muted tag (e.g., `(Đã ẩn)` or red tag) indicating the parent brand is inactive.

## 4. Testing & Verification

1. **Backend Unit Tests:**
   - `backend/src/modules/products/__tests__/products-filter-sort.service.spec.ts`:
     Verify that `publicOnly = true` filters out products with `brand.isActive === false`.
     Verify that `publicOnly = false` retains products with `brand.isActive === false`.
   - `backend/src/modules/cart/cart.service.spec.ts`:
     Verify that adding a product whose brand is inactive throws `BadRequestException`.
   - `backend/src/modules/orders/orders.service.spec.ts`:
     Verify checkout rejects items from inactive brands.
2. **Frontend Unit Tests:**
   - `frontend/src/pages/storefront/ProductDetail/__tests__/ProductDetailPage.spec.tsx`:
     Verify empty state rendering when `product.brand.isActive === false`.
3. **Full Regression Suite:**
   - Run `npm test` in `backend/` and `frontend/` to confirm 100% test pass rate.
   - Verify TypeScript compilation on both repositories (`npx tsc --noEmit` and `npm run build`).
