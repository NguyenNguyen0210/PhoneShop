# Implementation Plan: Order Items Grouping & IMEI Aggregation

**Goal:** Group multiple order items of identical variants into a unified product row with total quantity, aggregated price, and collapsible IMEI chip list across Admin, Storefront, and Invoice views.

**Parallel Strategy:**
- **Phase 0 (Core Foundation):** Implement helper `orderGroupHelper.ts` with tests.
- **Phase 1 (3 Parallel Streams via subagents):**
  - **Stream 1:** Admin Orders UI (`AdminOrdersPage.tsx`)
  - **Stream 2:** Storefront Order Details UI (`OrderDetailPage.tsx`)
  - **Stream 3:** Storefront Invoice UI (`OrderInvoiceModal.tsx`)
- **Phase 2 (Consolidation):** Full regression test suite + build verification.

---

## File Structure

- **New:** `frontend/src/utils/orderGroupHelper.ts` — Pure helper function grouping raw order items.
- **New:** `frontend/src/utils/__tests__/orderGroupHelper.spec.ts` — Comprehensive unit tests for grouping logic.
- **Modify:** `frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx` — Integrate grouped items & collapsible IMEI list.
- **Modify:** `frontend/src/pages/Admin/Orders/__tests__/AdminOrdersPage.spec.tsx` — Update/add test for grouped items.
- **Modify:** `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx` — Integrate grouped items & collapsible IMEI list.
- **Modify:** `frontend/src/pages/storefront/Orders/components/OrderInvoiceModal.tsx` — Display aggregated rows in printed invoice.
- **New/Modify:** `frontend/src/pages/storefront/Orders/components/__tests__/OrderInvoiceModal.spec.tsx` — Invoice grouping test.

---

## Tasks

### Phase 0: Core Grouping Helper & Unit Tests
- [x] Implement `frontend/src/utils/orderGroupHelper.ts`
- [x] Implement `frontend/src/utils/__tests__/orderGroupHelper.spec.ts`
- [x] Run vitest tests and verify 100% pass rate.

### Phase 1: Parallel Streams (3 Independent Agents)
- [x] **Stream 1 (Admin Agent):**
  - Update `AdminOrdersPage.tsx` to group order items using `groupOrderItems`.
  - Add collapsible IMEI chips when count > 3.
  - Update `AdminOrdersPage.spec.tsx` and run tests.
- [x] **Stream 2 (Storefront Agent):**
  - Update `OrderDetailPage.tsx` to group order items using `groupOrderItems`.
  - Add collapsible IMEI badges when count > 3.
  - Update `OrderDetailPage.spec.tsx` and run tests.
- [x] **Stream 3 (Invoice Agent):**
  - Update `OrderInvoiceModal.tsx` to group order items using `groupOrderItems`.
  - Display aggregate quantity, unit price, total price, and all assigned IMEIs.
  - Verify and run tests.

### Phase 2: Consolidation & Verification
- [x] Run complete frontend test suite (`npm test`).
- [x] Run production build (`npm run build`).
- [x] Review code quality and merge to main branch.
