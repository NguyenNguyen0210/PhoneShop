# Brand Deactivation Product Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or dispatching-parallel-agents to implement this plan concurrently across 3 independent threads. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide products belonging to inactive brands from the customer storefront (catalog, search, PDP, cart, checkout) while keeping them fully accessible in Admin Product Management, and restoring them automatically upon brand reactivation.

**Architecture:**
- Backend: Enforce `where.brand = { isActive: true }` in `products.service.ts` for public queries, reject inactive brands in `cart.service.ts` and `orders.service.ts`.
- Frontend Storefront: In `ProductDetailPage.tsx`, render a friendly deactivated empty state if `product.brand.isActive === false`.
- Frontend Admin: In `AdminProductsPage.tsx`, display an inactive brand indicator badge next to the brand name so admins clearly see which products are hidden from the store.

**Tech Stack:** NestJS, Prisma ORM, React 19, Vite, Ant Design 6, Vitest, Jest.

---

### Thread 1: Backend Catalog, Cart & Checkout Filtering (Independent)

**Files:**
- Modify: `backend/src/modules/products/products.service.ts`
- Modify: `backend/src/modules/cart/cart.service.ts`
- Modify: `backend/src/modules/orders/orders.service.ts`
- Test: `backend/src/modules/products/__tests__/products-filter-sort.service.spec.ts`
- Test: `backend/src/modules/cart/__tests__/cart.service.spec.ts` (or create unit test)
- Test: `backend/src/modules/orders/orders.service.spec.ts`

- [ ] **Step 1.1: Write failing unit test in `products-filter-sort.service.spec.ts`**
  Add tests asserting that `findAll(filter, true)` excludes products whose brand has `isActive === false`, while `findAll(filter, false)` includes them.

- [ ] **Step 1.2: Implement `where.brand = { isActive: true }` in `products.service.ts`**
  In `findAll`:
  ```ts
  if (publicOnly) {
    where.status = ProductStatus.ACTIVE;
    where.brand = { isActive: true };
  }
  ```
  Ensure it works when `filter.brandId` is also supplied.

- [ ] **Step 1.3: Update `cart.service.ts` validation**
  When validating variant for `addToCart` and `updateQuantity`, verify `variant.product.brand?.isActive !== false`. Throw `BadRequestException('Thương hiệu của sản phẩm này hiện đã tạm ngừng hoạt động')` if inactive.

- [ ] **Step 1.4: Update `orders.service.ts` checkout validation**
  During checkout item validation, verify `item.variant.product.brand?.isActive !== false`. Throw `BadRequestException` if inactive.

- [ ] **Step 1.5: Run backend tests and commit**
  Run: `npm test` in `backend/`
  Commit: `feat(backend): filter products of inactive brands from storefront, cart, and checkout`

---

### Thread 2: Frontend Storefront Product Detail Page (Independent)

**Files:**
- Modify: `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`
- Test: `frontend/src/pages/storefront/ProductDetail/__tests__/ProductDetailPage.spec.tsx`

- [ ] **Step 2.1: Write failing test in `ProductDetailPage.spec.tsx`**
  Add a test where `mockProduct` has `brand: { id: 'b-1', name: 'Brand Off', isActive: false }`. Verify it renders the empty state title *"Sản phẩm tạm ngừng kinh doanh"* and action button *"Khám phá sản phẩm khác"*.

- [ ] **Step 2.2: Implement inactive brand empty state in `ProductDetailPage.tsx`**
  Check `if (product && product.brand && product.brand.isActive === false)`:
  Render:
  ```tsx
  <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
    <Empty
      description={
        <div className="space-y-2 mt-4">
          <h2 className="text-xl font-bold text-slate-900">Sản phẩm tạm ngừng kinh doanh</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Thương hiệu này hiện đang tạm ẩn hoặc ngừng kinh doanh trên hệ thống. Vui lòng quay lại danh mục để chọn sản phẩm khác.
          </p>
        </div>
      }
    />
    <Link to="/products" className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-xs transition-colors">
      Khám phá sản phẩm khác
    </Link>
  </div>
  ```

- [ ] **Step 2.3: Run PDP tests and commit**
  Run: `npx vitest run src/pages/storefront/ProductDetail/__tests__/ProductDetailPage.spec.tsx`
  Commit: `feat(storefront): display deactivated empty state on PDP when product brand is inactive`

---

### Thread 3: Frontend Admin Products Indicator (Independent)

**Files:**
- Modify: `frontend/src/pages/Admin/Products/AdminProductsPage.tsx`
- Test: `frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx`

- [ ] **Step 3.1: Write failing test in `AdminProductsPage.spec.tsx`**
  Verify that when a product's brand is inactive (`brand: { name: 'Sony', isActive: false }`), the table displays an indicator tag such as `(Thương hiệu đã ẩn)` or `Đã ẩn`.

- [ ] **Step 3.2: Update Brand column rendering in `AdminProductsPage.tsx`**
  In the Brand column:
  ```tsx
  render: (_, record) => (
    <Space direction="vertical" orientation="vertical" size={2}>
      <Text strong>{record.brand?.name || 'N/A'}</Text>
      {record.brand && record.brand.isActive === false && (
        <Tag color="default" style={{ fontSize: 11, padding: '0 4px', lineHeight: '18px' }}>
          Thương hiệu đã ẩn
        </Tag>
      )}
    </Space>
  )
  ```

- [ ] **Step 3.3: Run Admin Products tests and commit**
  Run: `npx vitest run src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx`
  Commit: `feat(admin): show inactive brand indicator tag in admin products table`

---

### Integration & Final Verification

- [ ] **Step 4.1: Run full test suites**
  Backend: `npm test`
  Frontend: `npm test`
- [ ] **Step 4.2: Run TypeScript checks & build**
  Backend: `npx tsc --noEmit`
  Frontend: `npm run build`
