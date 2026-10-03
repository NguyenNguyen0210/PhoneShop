# Design Document: Order Enhancements (Tracking, Cancel, Reorder, Return/Refund, Invoice)

## 1. Overview & Objectives
This document specifies the technical design and user experience architecture for completing 5 essential order lifecycle features on the Happy Garden Mobile Storefront:
1. **Order Tracking (Theo dõi đơn hàng)**: Interactive 5-step visual timeline with logistics provider metadata, tracking numbers, and delivery estimates.
2. **Cancel Order (Hủy đơn hàng)**: Customer self-service cancellation with reason selection, releasing reserved stock and IMEIs atomically via existing backend endpoints.
3. **Reorder (Mua lại đơn cũ)**: 1-click reorder flow adding valid order items back into the shopping cart and opening the Cart Drawer.
4. **Return & Refund (Đổi trả / Hoàn tiền)**: Self-service return requests for delivered orders within 7 days, item-level selection, and returns tracking tab in user profile.
5. **Retail Invoice & Warranty Receipt (Hóa đơn bán lẻ có IMEI)**: Print-ready electronic retail invoice and warranty certificate with device IMEI numbers, VAT breakdown, and A4/A5 PDF print preview.

---

## 2. Architecture & Data Flow

```
                      ┌───────────────────────────────────────────────┐
                      │              Customer Storefront              │
                      │                                               │
                      │  OrderDetailPage        ProfilePage (#returns)│
                      └───────┬───────────────────────────┬───────────┘
                              │                           │
            ┌─────────────────┴───────────────────────────┴─────────────────┐
            │                     Frontend Service Layer                    │
            │   orderService.ts            returnService.ts  useCartStore   │
            └───────┬─────────────────────────────┬───────────────┬─────────┘
                    │                             │               │
                    │ HTTP PUT /orders/my/:id/cancel              │
                    │ HTTP GET /orders/my/:id     │               │ (Add items
                    │                             │ HTTP POST /returns
                    │                             │ HTTP GET /returns/my
                    │                             │ HTTP DELETE /returns/my/:id/cancel
                    ▼                             ▼               │
            ┌─────────────────────────────────────────────┐       │
            │               NestJS Backend                │       │
            │   OrdersModule              ReturnsModule   │       │
            └───────┬─────────────────────────────┬───────┘       │
                    │                             │               │
                    ▼                             ▼               ▼
            ┌─────────────────────────────────────────────────────────────┐
            │                  PostgreSQL / Prisma ORM                    │
            │   orders, shippings, order_items, returns, return_items     │
            └─────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Enhancements

### 3.1 Shipping Relation Inclusion in `orders.service.ts`
* **File**: `backend/src/modules/orders/orders.service.ts`
* **Change**: Update Prisma queries in `findMyOrders`, `findMyOrder`, and `findOne` to include `shipping: true`.
  * `findMyOrder`:
    ```ts
    include: {
      items: { include: { variant: { include: { product: true } }, imeiDevice: true } },
      payments: true,
      address: true,
      installmentApplication: true,
      shipping: true,
    }
    ```
  * `findMyOrders`: Include `shipping: true` alongside items and payments.
  * `findOne`: Include `shipping: true`.

---

## 4. Frontend Data Types & Services

### 4.1 Type Definitions (`frontend/src/types/index.ts`)
```ts
export type ShippingStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';

export interface Shipping {
  id: string;
  orderId: string;
  providerName: string;
  trackingNumber?: string;
  status: ShippingStatus;
  shippingFee: number;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SHIPPING'
  | 'RECEIVED'
  | 'INSPECTING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ReturnItem {
  id: string;
  returnId: string;
  orderItemId: string;
  quantity: number;
  reason?: string;
  condition?: string;
  orderItem?: OrderItem;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  returnNumber: string;
  status: ReturnStatus;
  reason: string;
  customerNote?: string;
  adminNote?: string;
  requestedAt: string;
  approvedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  items: ReturnItem[];
  order?: Order;
}
```

Update `Order` interface in `frontend/src/types/index.ts`:
```ts
export interface Order {
  // Existing fields...
  shipping?: Shipping;
  returns?: ReturnRequest[];
  cancelledAt?: string;
  cancelledReason?: string;
}
```

### 4.2 API Services

#### `frontend/src/services/orderService.ts`
* Add method:
  ```ts
  async cancelMyOrder(id: string, reason: string): Promise<Order> {
    const response = await apiClient.put(`/orders/my/${id}/cancel`, { reason });
    return response.data?.data ?? response.data;
  }
  ```

#### `frontend/src/services/returnService.ts` (New File)
* Implement:
  ```ts
  export interface CreateReturnPayload {
    orderId: string;
    reason: string;
    customerNote?: string;
    items: {
      orderItemId: string;
      quantity: number;
      reason?: string;
      condition?: string;
    }[];
  }

  export const returnService = {
    async createReturn(payload: CreateReturnPayload): Promise<ReturnRequest> {
      const response = await apiClient.post('/returns', payload);
      return response.data?.data ?? response.data;
    },
    async getMyReturns(): Promise<ReturnRequest[]> {
      const response = await apiClient.get('/returns/my');
      return response.data?.data ?? response.data ?? [];
    },
    async getMyReturnById(id: string): Promise<ReturnRequest> {
      const response = await apiClient.get(`/returns/my/${id}`);
      return response.data?.data ?? response.data;
    },
    async cancelReturn(id: string): Promise<void> {
      await apiClient.delete(`/returns/my/${id}/cancel`);
    }
  };
  ```

---

## 5. UI Component Architecture

New components reside in `frontend/src/pages/storefront/Orders/components/`:

### 5.1 `OrderTrackingTimeline.tsx`
* **Purpose**: Renders the 5-step visual delivery progress.
* **Steps**:
  1. `Đã đặt hàng` (PENDING)
  2. `Đã xác nhận & Đóng gói` (CONFIRMED / PROCESSING)
  3. `Đang giao hàng` (SHIPPED / Shipping status IN_TRANSIT)
  4. `Đã giao hàng` (DELIVERED)
  5. `Hoàn tất & Bảo hành` (COMPLETED)
* **Metadata display**: Carrier name (`shipping.providerName` or standard partner), tracking number with copy button, estimated delivery date, actual dispatched / delivered timestamps.
* **Special status states**:
  * If `order.status === 'CANCELLED'`: Renders a high-visibility crimson status banner displaying cancellation reason and timestamp.
  * If order has active return requests: Renders a warning banner indicating active return status with navigation to returns.

### 5.2 `OrderCancelModal.tsx`
* **Purpose**: Confirmation and reason selection modal for order cancellation.
* **Props**: `order: Order; isOpen: boolean; onClose: () => void; onCancelled: (updatedOrder: Order) => void`.
* **Form fields**:
  * Quick reason options (Radio / Select):
    * "Đổi ý muốn mua sản phẩm khác"
    * "Thay đổi thông tin nhận hàng"
    * "Thời gian giao hàng dự kiến quá lâu"
    * "Tìm thấy giá tốt hơn ở nơi khác"
    * "Lý do khác (vui lòng ghi rõ)"
  * Additional text notes textarea.
* **UX details**: Loading spinner during API call, disables backdrop clicks while submitting, triggers error toast if rejected by server.

### 5.3 `Reorder Flow`
* **Implementation**: Inside `OrderDetailPage.tsx` and `ProfilePage.tsx` via `useCartStore`:
  * Extracts product and variant from each `OrderItem`.
  * Calls `cartStore.addItem(item.variant.product, item.variant, item.quantity)`.
  * Catches out-of-stock or missing variant scenarios gracefully with notifications.
  * Triggers `cartStore.setDrawerOpen(true)` and displays toast confirmation.

### 5.4 `ReturnRequestModal.tsx`
* **Purpose**: Itemized return request form for delivered orders.
* **Trigger condition**: Order status is `DELIVERED` or `COMPLETED` and delivery occurred within 7 days.
* **Fields**:
  * Multi-item selection checklist: Each line item includes thumbnail, name, IMEI number, unit price, quantity stepper (bounded by purchased quantity).
  * Main return reason select:
    * "Lỗi kỹ thuật phần cứng (Lỗi do nhà sản xuất)"
    * "Giao sai màu sắc / phiên bản dung lượng"
    * "Thiết bị hoặc hộp bị cấn móp, hư hại do vận chuyển"
    * "Thiếu phụ kiện theo máy"
    * "Khác"
  * Condition of product & accessories (Mới nguyên hộp, Đã khui hộp còn nguyên tem, Trầy xước...).
  * Detailed customer notes.
* **Submission**: Calls `returnService.createReturn()`, closes modal, shows success alert, and navigates/scrolls to Profile returns tab.

### 5.5 `ProfilePage.tsx` Returns Tab (`#returns`)
* **New Section/Tab**: "Đổi trả / Hoàn tiền" alongside Profile & Order History.
* **List Display**:
  * Return number (`RTN-...`), linked order number, creation date.
  * Status badges: `REQUESTED` (Chờ duyệt), `APPROVED` (Đã duyệt gửi hàng), `SHIPPING` (Đang gửi về shop), `RECEIVED` (Đã nhận hàng hoàn), `INSPECTING` (Đang kiểm định), `COMPLETED` (Đã hoàn tiền / đổi mới), `REJECTED` (Từ chối).
  * Returned items listing with IMEI numbers.
  * "Hủy yêu cầu" button active only for `REQUESTED` status.

### 5.6 `OrderInvoiceModal.tsx`
* **Purpose**: Electronic retail sales invoice and IMEI warranty certificate.
* **Content Structure**:
  * **Header**: Company branding ("HAPPY GARDEN MOBILE"), Hotline (1900 6868), store address, customer service email.
  * **Document Title**: "HÓA ĐƠN BÁN LẺ ĐIỆN TỬ KIÊM PHIẾU XUẤT KHO & BẢO HÀNH".
  * **Order Metadata**: Order number, order date & time, payment method & payment status.
  * **Customer Info**: Name, phone number, shipping address.
  * **Itemized Table**: Index, Product name & specs, IMEI / Serial Number badge, Quantity, Unit price, Total.
  * **Financial Breakdown**: Subtotal, Voucher discount, Shipping fee, Included 10% VAT amount, Grand total.
  * **Warranty Policy & Signatures**: Official 30-day 1-to-1 exchange policy, 12-month IMEI warranty, electronic signature stamps.
* **Print Optimization (`@media print`)**:
  * Standard A4 portrait margin and layout.
  * Hides navigation, action buttons, backdrop overlays, and non-printable elements.
  * High-contrast monochrome and clean grayscale typography for laser printing and PDF saving.

---

## 6. Error Handling & Edge Cases

| Scenario | Handled By | Behavior |
|----------|------------|----------|
| Order already confirmed/shipped when user tries to cancel | Backend guard & Frontend modal | Server returns 400; frontend displays clear error alert and refreshes order data |
| Order was paid online | Backend guard | Customer cannot cancel directly; guided to return flow after delivery |
| Reorder has discontinued or out-of-stock item | Frontend Reorder handler | Valid items added; warning toast lists unavailable items |
| Return window > 7 days expired | Backend guard & Frontend condition | "Yêu cầu đổi trả" button hidden; direct API call fails with 400 window expired |
| Concurrent cancellation / hold sweeper | Backend transaction | Handled idempotently; returns appropriate message |

---

## 7. Verification & Testing Plan
* **Unit/Integration verification**:
  * Verify `findMyOrder` includes `shipping` relation.
  * Verify `cancelMyOrder` releases IMEIs and updates order status.
  * Verify `returnService` methods submit payload successfully.
* **Browser visual & functional verification**:
  * Verify `OrderTrackingTimeline` renders accurately for PENDING, SHIPPED, DELIVERED, and CANCELLED states.
  * Verify `OrderCancelModal` opens, validates reasons, and cancels order.
  * Verify `Reorder` adds items into cart and opens cart drawer.
  * Verify `ReturnRequestModal` submits return request and appears in Profile `#returns`.
  * Verify `OrderInvoiceModal` renders IMEI numbers and triggers `window.print()` cleanly.
