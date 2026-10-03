# Fullstack Server-Side Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement server-side pagination across Backend APIs, Storefront product listings, and Admin data tables to provide high performance and scalable browsing.

**Architecture:**
- Backend provides standardized `PaginationQueryDto` and `PaginatedResponse<T>` metadata across Products, Orders, and IMEI devices.
- Storefront features a reusable `StorefrontPagination` component with URL query state synchronization (`?page=X`) and auto-scroll to catalog top.
- Admin Portal connects Ant Design `<Table />` directly to backend `page` and `limit` for Orders and IMEI devices.

**Tech Stack:** NestJS, Prisma 7, PostgreSQL, React 19, TypeScript, Ant Design, Tailwind CSS.

---

## File Structure Map
- **Backend:**
  - `backend/src/common/dto/pagination.dto.ts` (shared pagination DTO & response contract)
  - `backend/src/modules/orders/orders.controller.ts` & `backend/src/modules/orders/orders.service.ts` (add `page`, `limit`, `status`, `search` support)
  - `backend/src/modules/imei/imei.controller.ts` & `backend/src/modules/imei/imei.service.ts` (add `page`, `limit`, `status`, `search`, `variantId` support)
  - `backend/test/unit/orders-pagination.spec.ts` (unit test suite for orders pagination)
  - `backend/test/unit/imei-pagination.spec.ts` (unit test suite for IMEI pagination)
- **Storefront:**
  - `frontend/src/components/storefront/StorefrontPagination.tsx` (responsive pagination control)
  - `frontend/src/services/productService.ts` (ensure `limit` & `page` contract)
  - `frontend/src/pages/storefront/Home/HomePage.tsx` (integrate pagination & URL param sync)
  - `frontend/src/pages/storefront/Products/ProductListingPage.tsx` (integrate pagination & URL param sync)
- **Admin Portal:**
  - `frontend/src/services/orderService.ts` (support pagination query)
  - `frontend/src/services/imeiService.ts` (support pagination query)
  - `frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx` (server-side table pagination)
  - `frontend/src/pages/Admin/InventoryImei/AdminImeiPage.tsx` (server-side table pagination)

---

### Task 1: Backend Shared Pagination DTO & Orders/IMEI Pagination (Thread 1)

**Files:**
- Create: `backend/src/common/dto/pagination.dto.ts`
- Modify: `backend/src/modules/orders/orders.controller.ts`
- Modify: `backend/src/modules/orders/orders.service.ts`
- Modify: `backend/src/modules/imei/imei.controller.ts`
- Modify: `backend/src/modules/imei/imei.service.ts`
- Test: `backend/test/unit/orders-pagination.spec.ts`
- Test: `backend/test/unit/imei-pagination.spec.ts`

- [ ] **Step 1: Create `backend/src/common/dto/pagination.dto.ts`**
```typescript
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

- [ ] **Step 2: Update `OrdersService` & `OrdersController`**
Add pagination, status filter, and keyword search (`orderNumber`, recipientName, phone) to `findAll(query)`.
Return `{ data, total, page, limit, totalPages }`.

- [ ] **Step 3: Update `ImeiService` & `ImeiController`**
Add pagination, status, variantId, and keyword search (`imei`, `serialNumber`) to `findAll(query)`.
Return `{ data, total, page, limit, totalPages }`.

- [ ] **Step 4: Write and run unit tests for Orders and IMEI pagination**
Run `npm test -- test/unit/orders-pagination.spec.ts` and `npm test -- test/unit/imei-pagination.spec.ts`.

- [ ] **Step 5: Commit changes**
`git commit -m "feat(backend): implement server-side pagination for orders and imei"`

---

### Task 2: Storefront Pagination Component & Listing Pages (Thread 2)

**Files:**
- Create: `frontend/src/components/storefront/StorefrontPagination.tsx`
- Modify: `frontend/src/services/productService.ts`
- Modify: `frontend/src/pages/storefront/Home/HomePage.tsx`
- Modify: `frontend/src/pages/storefront/Products/ProductListingPage.tsx`

- [ ] **Step 1: Create `StorefrontPagination.tsx`**
Build a responsive pagination bar displaying item range (`Hiển thị X - Y trên tổng Z sản phẩm`), numbered buttons, Previous/Next arrows with smooth transition matching Obsidian Slate theme.

- [ ] **Step 2: Update `productService.ts`**
Ensure `getProducts` correctly parses and sends `page` and `limit: 12`.

- [ ] **Step 3: Integrate into `HomePage.tsx`**
Sync `page` with `useSearchParams`. Display 12 products per page. Reset to page 1 on filter changes. Scroll up smoothly on page change.

- [ ] **Step 4: Integrate into `ProductListingPage.tsx`**
Sync `page` with `useSearchParams`. Display 12 products per page. Reset to page 1 on filter changes. Scroll up smoothly on page change.

- [ ] **Step 5: Verify build & commit**
Run `npm run build` in `frontend` and commit:
`git commit -m "feat(storefront): integrate numbered pagination and url state sync"`

---

### Task 3: Admin Portal Server-Side Tables (Thread 3)

**Files:**
- Modify: `frontend/src/services/orderService.ts`
- Modify: `frontend/src/services/imeiService.ts`
- Modify: `frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx`
- Modify: `frontend/src/pages/Admin/InventoryImei/AdminImeiPage.tsx`

- [ ] **Step 1: Update `orderService.ts` & `imeiService.ts`**
Support `page`, `limit`, `status`, and `search` query parameters.

- [ ] **Step 2: Update `AdminOrdersPage.tsx`**
Connect Ant Design `<Table />` pagination to server query:
- `current: page`
- `pageSize: limit`
- `total: totalOrders`
- `showSizeChanger: true` with options `[10, 20, 50]`
- Refresh on page / pageSize change.

- [ ] **Step 3: Update `AdminImeiPage.tsx`**
Connect Ant Design `<Table />` pagination to server query:
- Server-side filtering by status, search, and variant.
- `total: totalImeis`
- `showSizeChanger: true` with options `[10, 20, 50]`.

- [ ] **Step 4: Verify build & commit**
Run `npm run build` in `frontend` and commit:
`git commit -m "feat(admin): enable server-side pagination for orders and imei tables"`

---

### Task 4: End-to-End Verification & Health Check (Thread 4 / Coordinator)

**Files:**
- Test: `backend/test/pagination_verification.ts`

- [ ] **Step 1: Run comprehensive verification script**
Assert:
- `GET /api/v1/orders?page=1&limit=10` returns exactly 10 orders, total = 200, totalPages = 20.
- `GET /api/v1/imei?page=1&limit=10` returns exactly 10 IMEIs, total >= 1500, totalPages >= 150.
- `GET /api/v1/products?page=1&limit=12` returns exactly 12 products, total = 54, totalPages = 5.
- Both `backend` and `frontend` pass build tests (`npm run build`).

- [ ] **Step 2: Commit and finalize**
`git commit -m "test(pagination): verify fullstack server-side pagination integrity"`
