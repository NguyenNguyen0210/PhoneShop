# Design Specification: Order Items Grouping & IMEI Aggregation Display

**Date:** 2026-10-11  
**Status:** Approved  
**Author:** AI Agent & Engineering Team  

---

## 1. Problem Statement & Motivation

When a customer orders multiple units of the same product variant (for example, 6 units of *Redmi 14C - Black 64GB*), the backend checkout process assigns individual IMEI devices per physical phone and inserts separate records into `order_items` (`quantity = 1` per row, uniquely linked to `imeiDeviceId`).

Currently, the user interface across Admin, Storefront Order Detail, and Invoice Modal renders each raw `order_item` as an independent card/row without grouping. This leads to:
1. Redundant repetition of identical product titles, variants, and pricing (e.g., 6 separate cards showing `Số lượng: 1` and `3.290.000 đ`).
2. High cognitive load and excessive vertical scrolling for store managers and customers when inspecting bulk orders (e.g., 5-20 units).
3. Ambiguity regarding the total quantity and aggregated subtotal for each ordered variant.

---

## 2. Goals & Non-Goals

### Goals
- **Display Aggregation:** Dynamically group `order_items` by `variantId` (or product identity) on the client side into a single aggregated product card/table row.
- **Quantity & Price Aggregation:** Display the total combined quantity (`totalQuantity = sum(quantity)`), single unit price, and total item subtotal (`totalPrice = sum(totalPrice)`).
- **IMEI List Management:** Consolidate all assigned IMEI devices under the grouped item with a clean chip UI and an expandable toggle ("Xem thêm" / "Thu gọn") when there are 4 or more IMEIs.
- **Consistent Experience Across Surfaces:**
  1. Admin Order Details Modal (`AdminOrdersPage.tsx`).
  2. Customer Order Details Page (`OrderDetailPage.tsx`).
  3. Printable Order Invoice Modal (`OrderInvoiceModal.tsx`).
- **Parallel Task Execution:** Separate the shared helper module, Admin UI, Storefront UI, and Invoice UI into modular, independent parallel streams.

### Non-Goals
- Altering the database schema or checkout backend architecture: The 1-to-1 relationship between `OrderItem`, `ImeiDevice`, and `Warranty` remains unchanged to preserve hardware serialization, inventory reservation, and warranty tracking.

---

## 3. Architecture & Data Structures

### 3.1 Shared Helper: `groupOrderItems`

Location: `frontend/src/utils/orderGroupHelper.ts`

```typescript
export interface GroupedOrderItemImei {
  id: string;
  imeiNumber: string;
  status?: string;
  orderItemId: string;
}

export interface GroupedOrderItem {
  groupKey: string;
  variantId?: string;
  productName: string;
  sku?: string;
  variant?: {
    id?: string;
    name?: string;
    color?: string;
    storage?: string;
    ram?: string;
    imageUrl?: string;
    product?: {
      id?: string;
      name?: string;
      slug?: string;
      thumbnailUrl?: string;
    };
  };
  unitPrice: number;
  totalQuantity: number;
  totalPrice: number;
  imeis: GroupedOrderItemImei[];
  rawItemIds: string[];
}

export function groupOrderItems(items?: any[] | null): GroupedOrderItem[] {
  if (!items || !Array.isArray(items) || items.length === 0) return [];
  
  const groupMap = new Map<string, GroupedOrderItem>();

  for (const item of items) {
    const key = item.variantId || item.variant?.id || item.productName || item.id;
    const itemPrice = Number(item.unitPrice) || 0;
    const itemQty = Number(item.quantity) || 1;
    const itemTotal = Number(item.totalPrice) || (itemPrice * itemQty);

    const imeiNum = item.imeiDevice?.imeiNumber || item.imeiDevice?.imei;
    const imeiEntry: GroupedOrderItemImei | null = imeiNum ? {
      id: item.imeiDevice?.id || item.id,
      imeiNumber: imeiNum,
      status: item.imeiDevice?.status || 'ASSIGNED',
      orderItemId: item.id,
    } : null;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupKey: key,
        variantId: item.variantId || item.variant?.id,
        productName: item.productName || item.variant?.product?.name || item.variant?.name || 'Sản phẩm',
        sku: item.sku || item.variant?.sku,
        variant: item.variant,
        unitPrice: itemPrice,
        totalQuantity: itemQty,
        totalPrice: itemTotal,
        imeis: imeiEntry ? [imeiEntry] : [],
        rawItemIds: [item.id],
      });
    } else {
      const existing = groupMap.get(key)!;
      existing.totalQuantity += itemQty;
      existing.totalPrice += itemTotal;
      existing.rawItemIds.push(item.id);
      if (imeiEntry && !existing.imeis.some(im => im.imeiNumber === imeiEntry.imeiNumber)) {
        existing.imeis.push(imeiEntry);
      }
    }
  }

  return Array.from(groupMap.values());
}
```

---

## 4. UI Specification & Surface Details

### Surface 1: Admin Order Detail Modal (`AdminOrdersPage.tsx`)
- Container: Replace direct `selectedOrder.items?.map` loop with `groupOrderItems(selectedOrder.items).map(...)`.
- Product Heading: Displays Product Name with `Tag` or Badge `x{totalQuantity} máy`.
- Subtitle: `Biến thể: {color} - {storage} • Đơn giá: {formatPrice(unitPrice)}`.
- Total Price: `{formatPrice(totalPrice)}` in bold red font.
- IMEI Section:
  - Header: `Danh sách {imeis.length} mã IMEI định danh đã khóa (Đã gán {imeis.length}/{totalQuantity} máy)`.
  - Grid: Shows chips for IMEIs (e.g., `IMEI: 3589... • Máy 1`).
  - Collapse / Expand: If `imeis.length > 3`, initially render first 3 IMEIs with button `Xem thêm ({imeis.length - 3} máy khác) ▾`. When expanded, show all with button `Thu gọn ▴`.

### Surface 2: Customer Order Detail Page (`OrderDetailPage.tsx`)
- Order Items Card List: Group items using `groupOrderItems(order.items)`.
- Product Link: Navigates to `/products/{productSlug || productId}`.
- Attributes: `{color} • {storage} • Số lượng: x{totalQuantity}`.
- Subtotal: Formatted `totalPrice` in bold blue font (`formatPrice(item.totalPrice)`).
- IMEI Badges: Render chips for each IMEI with quick copy button or tooltip. Supports expand/collapse when `> 3` IMEIs.

### Surface 3: Order Invoice Modal (`OrderInvoiceModal.tsx`)
- Table Structure:
  - Columns: `STT | Sản phẩm & Thông tin IMEI | SL | Đơn giá | Thành tiền`.
  - Row Aggregation: 1 row per variant.
  - Column `SL`: `{totalQuantity}`.
  - Column `Đơn giá`: `{formatPrice(unitPrice)}`.
  - Column `Thành tiền`: `{formatPrice(totalPrice)}`.
  - Column `Sản phẩm & Thông tin IMEI`: Product name, variant attributes, and list of IMEI badges (`IMEI: 3589...`) compactly listed.

---

## 5. Parallel Execution Strategy

The implementation decomposes into **3 Parallel Streams** once Stream 0 (Helper) is created:

```
[Stream 0: Core Helper & Unit Tests]
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
   [Stream 1] [Stream 2] [Stream 3]
    Admin UI  Storefront  Invoice UI
       │       │       │
       └───────┼───────┘
               ▼
     [Integrated E2E/Build]
```

1. **Stream 0 (Foundation):** `orderGroupHelper.ts` and comprehensive unit test suite in `orderGroupHelper.spec.ts`.
2. **Stream 1 (Admin Surface):** `AdminOrdersPage.tsx` item grouping + tests in `AdminOrdersPage.spec.tsx`.
3. **Stream 2 (Storefront Surface):** `OrderDetailPage.tsx` item grouping + tests in `OrderDetailPage.spec.tsx`.
4. **Stream 3 (Invoice Surface):** `OrderInvoiceModal.tsx` item grouping + tests in `OrderInvoiceModal.spec.tsx`.

---

## 6. Verification & Acceptance Criteria

1. Orders with `quantity = 1` continue to display normally with 1 product card and its single IMEI.
2. Orders with `quantity >= 2` (e.g. 6 units of Redmi 14C) collapse into 1 card showing `x6 máy`, correct unit price `3.290.000 đ`, and total `19.740.000 đ`.
3. Orders with multiple distinct variants (e.g. 2 Redmi 14C Black + 3 Redmi 14C Blue) group into exactly 2 distinct cards (1 for Black, 1 for Blue).
4. Expand/Collapse toggle functions smoothly when `imeis.length > 3`.
5. Full Vitest test suite runs with 100% pass rate.
6. Frontend production build (`npm run build`) finishes with 0 errors.
