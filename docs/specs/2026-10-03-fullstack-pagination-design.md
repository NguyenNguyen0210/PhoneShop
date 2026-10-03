# Fullstack Server-Side Pagination Design Specification

- **Date:** 2026-10-03
- **Branch:** `Nguyen`
- **Scope:** Fullstack (Backend RESTful APIs, Storefront Customer UX, Admin Management Portal)

---

## 1. Executive Summary
Following the realistic seeding of high-volume data (54 products, 129 variants, 200 orders, 1,515 IMEI devices), loading unpaginated lists creates performance bottlenecks and degradation in user experience.
This specification defines the architecture, contracts, UI/UX behavior, and parallel execution strategy for fullstack server-side pagination across the platform.

---

## 2. Backend Design & API Contracts

### 2.1 Shared Pagination DTO & Interfaces
Create `backend/src/common/dto/pagination.dto.ts`:
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

### 2.2 Endpoints Refactoring

#### A. Products (`GET /api/v1/products`)
- **Query Params:** `categoryId`, `brandId`, `status`, `condition`, `search`, `minPrice`, `maxPrice`, `page` (default 1), `limit` (default 12 for storefront, configurable up to 100).
- **Service Query:**
  ```typescript
  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    this.prisma.product.count({ where }),
    this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: { brand: true, category: true, variants: true, reviews: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  ```

#### B. Orders (`GET /api/v1/orders`)
- **Query Params:** `page` (default 1), `limit` (default 10), `status` (OrderStatus enum), `search` (orderNumber, recipientName, phone).
- **Service Query:**
  ```typescript
  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    this.prisma.order.count({ where }),
    this.prisma.order.findMany({
      where,
      skip,
      take: limit,
      include: { user: true, address: true, items: { include: { variant: { include: { product: true } }, imeiDevice: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  ```

#### C. IMEI Devices (`GET /api/v1/imei`)
- **Query Params:** `page` (default 1), `limit` (default 10), `status` (ImeiStatus enum), `variantId` (UUID), `search` (imei, serialNumber).
- **Service Query:**
  ```typescript
  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    this.prisma.imeiDevice.count({ where }),
    this.prisma.imeiDevice.findMany({
      where,
      skip,
      take: limit,
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  ```

---

## 3. Storefront UI/UX Design (`HomePage`, `ProductListingPage`)

### 3.1 Layout & Component Architecture
- **Component:** `frontend/src/components/storefront/StorefrontPagination.tsx`
  - Props: `currentPage`, `totalPages`, `totalCount`, `pageSize`, `onPageChange`.
  - Design: Matches Obsidian Slate aesthetic with soft borders, active blue buttons (`bg-blue-600 text-white font-bold`), clean hover transitions, previous/next chevron buttons, and responsive item counts summary ("Hiển thị 1 - 12 trên 54 sản phẩm").
- **Page Size:** 12 items/page (fits 3-column desktop and 2-column mobile layouts without awkward empty slots).
- **URL Synchronization:** Uses React Router `useSearchParams` (`?page=2`).
- **Reset Logic:** Automatically resets to `page=1` when any filter (Brand, Price, RAM, Storage, Sort, Search) is changed.
- **Scroll Behavior:** Smoothly scrolls back to the top of the product catalog container when page changes.

---

## 4. Admin Portal UI/UX Design (`AdminOrdersPage`, `AdminImeiPage`, `AdminProductsPage`)

### 4.1 Server-Side Ant Design Table Integration
- Replaces client-side array slice with server-side pagination props on `<Table />`:
  ```tsx
  <Table
    loading={loading}
    dataSource={data}
    rowKey="id"
    pagination={{
      current: page,
      pageSize: limit,
      total: total,
      showSizeChanger: true,
      pageSizeOptions: ['10', '20', '50'],
      showTotal: (total, range) => `${range[0]}-${range[1]} trên ${total} mục`,
      onChange: (newPage, newPageSize) => {
        setPage(newPage);
        setLimit(newPageSize);
      },
    }}
  />
  ```
- Instant search and status tab filtering triggers immediate page-1 reload with new parameters.

---

## 5. Parallel Execution Strategy (Subagents)

1. **Luồng 1 (Backend APIs & DTOs):**
   - Create shared pagination DTO in backend.
   - Refactor `OrdersService`, `OrdersController`, `ImeiService`, `ImeiController`, and update `ProductsService`.
   - Update backend unit tests.
2. **Luồng 2 (Storefront UI & URL Sync):**
   - Build `StorefrontPagination` component.
   - Integrate server-side pagination with URL query params in `HomePage.tsx` and `ProductListingPage.tsx`.
   - Update `productService.ts`.
3. **Luồng 3 (Admin Portal Server-Side Tables):**
   - Update `orderService.ts` and `imeiService.ts` to pass pagination params.
   - Convert `AdminOrdersPage.tsx` and `AdminImeiPage.tsx` to server-side paginated tables.
   - Verify Admin Products table server-side integration.
