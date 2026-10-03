# Order Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the 5 critical order lifecycle features for Happy Garden Mobile: Order Tracking Timeline, Customer Self-Cancellation, 1-Click Reorder, Return/Refund Request & Management, and Printable Retail Invoice with IMEI numbers.

**Architecture:** Frontend components decomposed under `frontend/src/pages/storefront/Orders/components/`, client service layer updated in `orderService.ts` and new `returnService.ts`, type contracts defined in `types/index.ts`, and backend Prisma query enhancement in `orders.service.ts` to include shipping relations.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, NestJS, Prisma ORM, Zustand, Vitest/Jest.

---

## File Structure & Responsibilities

| File Path | Action | Responsibility |
|---|---|---|
| `backend/src/modules/orders/orders.service.ts` | Modify | Include `shipping: true` in `findMyOrders`, `findMyOrder`, and `findOne` |
| `frontend/src/types/index.ts` | Modify | Define `Shipping`, `ShippingStatus`, `ReturnRequest`, `ReturnItem`, `ReturnStatus` types |
| `frontend/src/services/orderService.ts` | Modify | Add `cancelMyOrder(id, reason)` client API call |
| `frontend/src/services/returnService.ts` | Create | Client API calls for returns (`createReturn`, `getMyReturns`, `cancelReturn`) |
| `frontend/src/pages/storefront/Orders/components/OrderTrackingTimeline.tsx` | Create | 5-step visual delivery progress bar, carrier badge, tracking number with copy button, and cancelled/returned state banners |
| `frontend/src/pages/storefront/Orders/components/OrderCancelModal.tsx` | Create | Customer self-cancellation dialog with quick-select reasons and note input |
| `frontend/src/pages/storefront/Orders/components/OrderInvoiceModal.tsx` | Create | A4 print-ready electronic retail sales invoice and warranty certificate with per-device IMEI numbers and VAT breakdown |
| `frontend/src/pages/storefront/Orders/components/ReturnRequestModal.tsx` | Create | Itemized return submission modal with quantity selection, reason selection, and condition input |
| `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx` | Modify | Integrate Tracking, Cancel Modal, Reorder flow, Invoice Modal, and Return Request button |
| `frontend/src/pages/storefront/Profile/ProfilePage.tsx` | Modify | Add Returns Tab (`#returns`) for tracking customer return requests; add Cancel and Reorder buttons to order history cards |
| `frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx` | Create | Unit tests for tracking stepper states |
| `frontend/src/pages/storefront/Orders/__tests__/OrderInvoiceModal.spec.tsx` | Create | Unit tests for invoice rendering and IMEI listing |

---

## Task Decomposition Overview

- **Task 1:** Backend & Service Layer Enhancement (Prisma queries, TypeScript types, `orderService`, `returnService`)
- **Task 2:** Order Tracking Timeline Component (`OrderTrackingTimeline.tsx`)
- **Task 3:** Customer Self-Cancellation Feature (`OrderCancelModal.tsx` & wiring)
- **Task 4:** 1-Click Reorder Flow (Cart store integration & notification)
- **Task 5:** Printable Retail Invoice with IMEI (`OrderInvoiceModal.tsx`)
- **Task 6:** Return & Refund Request & Profile Management (`ReturnRequestModal.tsx` & `#returns` tab)
git commit -m "feat(returns): implement return request modal and profile returns tracking tab"
```

---

### Task 7: End-to-end Integration, Automated Tests & Verification

**Files:**
- Test: `frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx`
- Test: `frontend/src/pages/storefront/Orders/__tests__/OrderInvoiceModal.spec.tsx`
- Verification: Frontend and Backend build outputs

- [ ] **Step 1: Run all frontend unit tests**

```bash
cd frontend && npm test
```
Expected: All tests pass including `OrderTrackingTimeline.spec.tsx` and `OrderInvoiceModal.spec.tsx`.

- [ ] **Step 2: Run backend unit tests**

```bash
cd ../backend && npm test
```
Expected: All backend unit tests pass.

- [ ] **Step 3: Run production build checks**

```bash
cd ../backend && npm run build
cd ../frontend && npm run build
```
Expected: Both backend and frontend compile with 0 TypeScript and build errors.

- [ ] **Step 4: Commit and finalize**

```bash
git add -A
git commit -m "feat(orders): complete tracking, cancel, reorder, returns, and invoice features"
```


---

### Task 1: Backend & Service Layer Enhancement

**Files:**
- Modify: `backend/src/modules/orders/orders.service.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/orderService.ts`
- Create: `frontend/src/services/returnService.ts`
- Test: `backend/test/unit/orders-pagination.spec.ts`

- [ ] **Step 1: Update backend `orders.service.ts` to include `shipping: true`**

In `backend/src/modules/orders/orders.service.ts`:
1. In `findMyOrders(userId: string)`:
```ts
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payments: true, installmentApplication: true, shipping: true },
      orderBy: { createdAt: 'desc' },
    });
```
2. In `findMyOrder(userId: string, id: string)`:
```ts
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
            imeiDevice: true,
          },
        },
        payments: true,
        address: true,
        installmentApplication: true,
        shipping: true,
      },
    });
```
3. In `findOne(id: string)`:
```ts
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        items: { include: { variant: { include: { product: true } }, imeiDevice: true } },
        payments: { include: { transactions: true } },
        address: true,
        installmentApplication: true,
        shipping: true,
      },
    });
```

- [ ] **Step 2: Add TypeScript types in `frontend/src/types/index.ts`**

Append to `frontend/src/types/index.ts`:
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
  shipping?: Shipping;
  returns?: ReturnRequest[];
  cancelledAt?: string;
  cancelledReason?: string;
```

- [ ] **Step 3: Add `cancelMyOrder` in `frontend/src/services/orderService.ts`**

Add method:
```ts
  async cancelMyOrder(id: string, reason: string): Promise<Order> {
    const response = await apiClient.put(`/orders/my/${id}/cancel`, { reason });
    return response.data?.data ?? response.data;
  },
```

- [ ] **Step 4: Create `frontend/src/services/returnService.ts`**

```ts
import { apiClient } from './apiClient';
import type { ReturnRequest } from '../types';

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
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getMyReturnById(id: string): Promise<ReturnRequest> {
    const response = await apiClient.get(`/returns/my/${id}`);
    return response.data?.data ?? response.data;
  },

  async cancelReturn(id: string): Promise<void> {
    await apiClient.delete(`/returns/my/${id}/cancel`);
  },
};
```

- [ ] **Step 5: Verify build & commit Task 1**

```bash
cd backend && npm run build
cd ../frontend && npm run build
git add backend/src/modules/orders/orders.service.ts frontend/src/types/index.ts frontend/src/services/orderService.ts frontend/src/services/returnService.ts
git commit -m "feat(orders): include shipping relation and add order cancel & return client services"
```

---

### Task 2: Order Tracking Timeline Component

**Files:**
- Create: `frontend/src/pages/storefront/Orders/components/OrderTrackingTimeline.tsx`
- Test: `frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx`

- [ ] **Step 1: Write unit test for `OrderTrackingTimeline`**

Create `frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline';
import type { Order } from '../../../../types';

describe('OrderTrackingTimeline', () => {
  const baseOrder: Order = {
    id: 'test-order-1',
    orderNumber: 'ORD-12345',
    customerName: 'Nguyen Van A',
    shippingPhone: '0901234567',
    shippingAddress: '123 Le Loi, Q1, HCMC',
    status: 'SHIPPED',
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    subtotal: 20000000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 20000000,
    items: [],
    createdAt: '2026-10-01T10:00:00Z',
    shipping: {
      id: 'ship-1',
      orderId: 'test-order-1',
      providerName: 'Giao Hàng Nhanh (GHN)',
      trackingNumber: 'GHN123456VN',
      status: 'IN_TRANSIT',
      shippingFee: 0,
      estimatedDeliveryDate: '2026-10-05T00:00:00Z',
      createdAt: '2026-10-01T10:00:00Z',
    },
  };

  it('renders shipping carrier and tracking number when present', () => {
    render(<OrderTrackingTimeline order={baseOrder} />);
    expect(screen.getByText(/Giao Hàng Nhanh/i)).toBeInTheDocument();
    expect(screen.getByText('GHN123456VN')).toBeInTheDocument();
  });

  it('renders cancelled alert banner when order is cancelled', () => {
    const cancelledOrder: Order = {
      ...baseOrder,
      status: 'CANCELLED',
      cancelledReason: 'Khách hàng đổi ý',
    };
    render(<OrderTrackingTimeline order={cancelledOrder} />);
    expect(screen.getByText(/Đơn hàng đã bị hủy/i)).toBeInTheDocument();
    expect(screen.getByText(/Khách hàng đổi ý/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx`
Expected: FAIL (Cannot find module '../components/OrderTrackingTimeline')

- [ ] **Step 3: Implement `OrderTrackingTimeline.tsx`**

Create `frontend/src/pages/storefront/Orders/components/OrderTrackingTimeline.tsx`:
```tsx
import React, { useState } from 'react';
import {
  Check,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Copy,
  CheckCheck,
  Calendar,
} from 'lucide-react';
import type { Order, OrderStatus } from '../../../../types';

interface OrderTrackingTimelineProps {
  order: Order;
}

interface StepItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
}

const STEPS: StepItem[] = [
  { id: 'PENDING', label: 'Đã đặt hàng', icon: Clock },
  { id: 'CONFIRMED', label: 'Đã xác nhận', icon: Package },
  { id: 'SHIPPED', label: 'Đang vận chuyển', icon: Truck },
  { id: 'DELIVERED', label: 'Đã giao hàng', icon: CheckCircle2 },
  { id: 'COMPLETED', label: 'Hoàn tất & Bảo hành', icon: Check },
];

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ order }) => {
  const [copied, setCopied] = useState(false);

  const getActiveStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
      case 'PROCESSING':
        return 1;
      case 'SHIPPED':
        return 2;
      case 'DELIVERED':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  if (order.status === 'CANCELLED') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-900">Đơn hàng đã bị hủy</h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Thời gian hủy: {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('vi-VN') : 'Đã hủy'}
            </p>
          </div>
        </div>
        {order.cancelledReason && (
          <div className="bg-white/80 rounded-xl p-3 border border-rose-200 text-xs text-rose-800">
            <span className="font-semibold">Lý do hủy: </span>
            <span>{order.cancelledReason}</span>
          </div>
        )}
      </div>
    );
  }

  const activeIndex = getActiveStepIndex(order.status);
  const shipping = order.shipping;

  const handleCopyTrackingNumber = () => {
    if (!shipping?.trackingNumber) return;
    navigator.clipboard.writeText(shipping.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <span>Hành trình đơn hàng</span>
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span>Đơn vị vận chuyển:</span>
            <span className="font-semibold text-slate-800">
              {shipping?.providerName || 'Giao Hàng Tiêu Chuẩn (Happy Express)'}
            </span>
          </div>
        </div>

        {shipping?.trackingNumber && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 font-medium">Mã vận đơn:</span>
            <span className="font-mono font-bold text-blue-600">{shipping.trackingNumber}</span>
            <button
              onClick={handleCopyTrackingNumber}
              className="p-1 text-slate-400 hover:text-blue-600 transition"
              title="Sao chép mã vận đơn"
              type="button"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Estimated Delivery Date Notice if available */}
      {shipping?.estimatedDeliveryDate && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Dự kiến nhận hàng:{' '}
            <strong>{new Date(shipping.estimatedDeliveryDate).toLocaleDateString('vi-VN')}</strong>
          </span>
        </div>
      )}

      {/* Stepper Bar */}
      <div className="relative pt-2 pb-2">
        {/* Progress Background Line */}
        <div className="hidden sm:block absolute top-6 left-8 right-8 h-1 bg-slate-100 -translate-y-1/2 z-0" />
        <div
          className="hidden sm:block absolute top-6 left-8 h-1 bg-blue-600 -translate-y-1/2 transition-all duration-500 z-0"
          style={{ width: `${(activeIndex / (STEPS.length - 1)) * 90}%` }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2 relative z-10">
          {STEPS.map((step, idx) => {
            const isCompleted = idx <= activeIndex;
            const isCurrent = idx === activeIndex;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex sm:flex-col items-center gap-3 sm:gap-2 text-center sm:text-center">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/20'
                      : isCompleted
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-left sm:text-center">
                  <div
                    className={`text-xs font-bold leading-tight ${
                      isCurrent ? 'text-blue-600 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </div>
                  {isCurrent && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-md border border-blue-200">
                      Hiện tại
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add frontend/src/pages/storefront/Orders/components/OrderTrackingTimeline.tsx frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx
git commit -m "feat(orders): implement OrderTrackingTimeline stepper component with tests"
```

---

### Task 3: Customer Self-Cancellation Feature

**Files:**
- Create: `frontend/src/pages/storefront/Orders/components/OrderCancelModal.tsx`
- Modify: `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx`
- Modify: `frontend/src/pages/storefront/Profile/ProfilePage.tsx`

- [ ] **Step 1: Implement `OrderCancelModal.tsx`**

Create `frontend/src/pages/storefront/Orders/components/OrderCancelModal.tsx`:
```tsx
import React, { useState } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import { orderService } from '../../../../services/orderService';
import type { Order } from '../../../../types';

interface OrderCancelModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: (updatedOrder: Order) => void;
}

const PRESET_REASONS = [
  'Đổi ý không muốn mua nữa',
  'Muốn thay đổi sản phẩm hoặc địa chỉ nhận hàng',
  'Thời gian giao hàng dự kiến quá lâu',
  'Tìm thấy giá tốt hơn ở cửa hàng khác',
  'Lý do khác',
];

export const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  order,
  isOpen,
  onClose,
  onCancelled,
}) => {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Lý do khác' ? otherReason.trim() : selectedReason;
    if (selectedReason === 'Lý do khác' && !finalReason) {
      setError('Vui lòng nhập lý do hủy đơn hàng.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await orderService.cancelMyOrder(order.id, finalReason);
      onCancelled(updated);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Không thể hủy đơn hàng vào lúc này. Vui lòng kiểm tra lại trạng thái đơn hàng.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Xác nhận hủy đơn hàng</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Lưu ý trước khi hủy đơn:</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700">
            <li>Thiết bị giữ kho và số IMEI sẽ được tự động giải phóng lại kho hàng.</li>
            <li>Các mã giảm giá / Voucher đã áp dụng sẽ được hoàn trả lượt sử dụng.</li>
          </ul>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Vui lòng chọn lý do hủy:
            </label>
            <div className="space-y-2">
              {PRESET_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                    selectedReason === r
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-blue-600"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason === 'Lý do khác' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="text-xs font-semibold text-slate-600">Ghi rõ lý do của bạn:</label>
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận hủy</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Wire Cancel button & modal into `OrderDetailPage.tsx`**

1. Import `OrderCancelModal`.
2. Add state `isCancelOpen, setIsCancelOpen`.
3. Render "Hủy đơn hàng" button in the action header when `['PENDING', 'CONFIRMED'].includes(order.status) && order.paymentStatus !== 'PAID'`.
4. When `onCancelled` callback fires, update local `order` state to the returned cancelled order.

- [ ] **Step 3: Wire Cancel button into `ProfilePage.tsx` orders list**

In `ProfilePage.tsx`:
Allow user to cancel a pending order directly from their order list card, triggering the same `OrderCancelModal`.

- [ ] **Step 4: Commit Task 3**

```bash
git add frontend/src/pages/storefront/Orders/components/OrderCancelModal.tsx frontend/src/pages/storefront/Orders/OrderDetailPage.tsx frontend/src/pages/storefront/Profile/ProfilePage.tsx
git commit -m "feat(orders): implement customer order cancellation modal and integrate with order detail and profile"
```

---

### Task 4: 1-Click Reorder Flow

**Files:**
- Modify: `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx`
- Modify: `frontend/src/pages/storefront/Profile/ProfilePage.tsx`

- [ ] **Step 1: Implement Reorder Handler Utility Function**

In `OrderDetailPage.tsx` and `ProfilePage.tsx`:
Create reorder handler that adds items to `useCartStore`:
```tsx
const handleReorder = (order: Order) => {
  if (!order.items || order.items.length === 0) return;

  const cart = useCartStore.getState();
  let addedCount = 0;

  for (const item of order.items) {
    if (item.variant) {
      const product = item.variant.product || {
        id: item.variant.productId,
        name: item.productName || 'Điện thoại',
        slug: '',
        thumbnail: item.variant.images?.[0] || '',
        price: item.unitPrice,
        originalPrice: item.unitPrice,
        rating: 5,
        reviewCount: 0,
        tags: [],
        highlights: [],
        features: [],
      };

      cart.addItem(product as any, item.variant, item.quantity);
      addedCount++;
    }
  }

  cart.setDrawerOpen(true);
};
```

- [ ] **Step 2: Add Reorder Button to `OrderDetailPage.tsx`**

Add action button in `OrderDetailPage.tsx`:
```tsx
<button
  type="button"
  onClick={() => handleReorder(order)}
  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition"
>
  <RotateCcw className="w-3.5 h-3.5" />
  <span>Mua lại đơn này</span>
</button>
```

- [ ] **Step 3: Add Reorder Button to `ProfilePage.tsx` order cards**

Add "Mua lại" button to each card in `orders-section` of `ProfilePage.tsx` alongside "Xem chi tiết".

- [ ] **Step 4: Commit Task 4**

```bash
git add frontend/src/pages/storefront/Orders/OrderDetailPage.tsx frontend/src/pages/storefront/Profile/ProfilePage.tsx
git commit -m "feat(orders): implement 1-click reorder flow in order detail and profile page"
```

---

### Task 5: Printable Retail Invoice with IMEI

**Files:**
- Create: `frontend/src/pages/storefront/Orders/components/OrderInvoiceModal.tsx`
- Test: `frontend/src/pages/storefront/Orders/__tests__/OrderInvoiceModal.spec.tsx`
- Modify: `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx`

- [ ] **Step 1: Write unit test for `OrderInvoiceModal`**

Create `frontend/src/pages/storefront/Orders/__tests__/OrderInvoiceModal.spec.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OrderInvoiceModal } from '../components/OrderInvoiceModal';
import type { Order } from '../../../../types';

describe('OrderInvoiceModal', () => {
  const baseOrder: Order = {
    id: 'ord-invoice-test',
    orderNumber: 'ORD-8899',
    customerName: 'Le Thi B',
    shippingPhone: '0912345678',
    shippingAddress: '456 Nguyen Trai, Q5, HCMC',
    status: 'DELIVERED',
    paymentMethod: 'VIETQR',
    paymentStatus: 'PAID',
    subtotal: 30000000,
    shippingFee: 0,
    discount: 500000,
    totalAmount: 29500000,
    createdAt: '2026-10-02T12:00:00Z',
    items: [
      {
        id: 'item-1',
        orderId: 'ord-invoice-test',
        variantId: 'var-1',
        productName: 'iPhone 15 Pro Max 256GB',
        quantity: 1,
        unitPrice: 30000000,
        totalPrice: 30000000,
        imeiDevice: {
          id: 'imei-1',
          imeiNumber: '356789012345678',
        },
      },
    ],
  };

  it('renders invoice header, order details, and IMEI number correctly', () => {
    render(<OrderInvoiceModal order={baseOrder} isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/HAPPY GARDEN MOBILE/i)).toBeInTheDocument();
    expect(screen.getByText(/ORD-8899/i)).toBeInTheDocument();
    expect(screen.getByText(/Le Thi B/i)).toBeInTheDocument();
    expect(screen.getByText(/356789012345678/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test frontend/src/pages/storefront/Orders/__tests__/OrderInvoiceModal.spec.tsx`
Expected: FAIL (Cannot find module '../components/OrderInvoiceModal')

- [ ] **Step 3: Implement `OrderInvoiceModal.tsx`**

Create `frontend/src/pages/storefront/Orders/components/OrderInvoiceModal.tsx`:
```tsx
import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';
import type { Order } from '../../../../types';

interface OrderInvoiceModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen) return null;

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  // 10% VAT calculation (VAT included)
  const vatAmount = Math.round((order.totalAmount / 1.1) * 0.1);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Container */}
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl border border-slate-200 space-y-6 print:shadow-none print:border-none print:p-4 print:max-w-none print:rounded-none">
        {/* Action Header - Hidden during print */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
              Hóa đơn điện tử & Phiếu bảo hành
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In hóa đơn / Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE INVOICE BODY */}
        <div className="space-y-6 text-slate-800">
          {/* Company Branding & Invoice Metadata */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-black text-blue-600 tracking-tight">HAPPY GARDEN MOBILE</h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hệ thống bán lẻ Smartphone & Thiết bị công nghệ chính hãng
                <br />
                Địa chỉ: 123 Đường 3/2, Phường 11, Quận 10, TP. Hồ Chí Minh
                <br />
                Hotline: 1900 6868 • Email: support@happygarden.vn
              </p>
            </div>
            <div className="sm:text-right text-xs space-y-1">
              <div className="font-mono font-bold text-sm text-slate-900">
                MÃ ĐƠN: #{order.orderNumber || order.id.slice(0, 8)}
              </div>
              <div className="text-slate-500">
                Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}
              </div>
              <div className="font-semibold text-emerald-700">
                Trạng thái: {order.paymentStatus === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHỜ THANH TOÁN (COD)'}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-2">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
              HÓA ĐƠN BÁN LẺ KIÊM PHIẾU BẢO HÀNH THEO IMEI
            </h2>
            <p className="text-[11px] text-slate-500 italic mt-0.5">
              (Hóa đơn điện tử có giá trị làm căn cứ đối soát bảo hành chính hãng)
            </p>
          </div>

          {/* Customer Information */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Khách hàng:</span>{' '}
              <strong className="text-slate-900">{order.customerName}</strong>
            </div>
            <div>
              <span className="text-slate-500">Số điện thoại:</span>{' '}
              <strong className="text-slate-900">{order.shippingPhone}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Địa chỉ giao hàng:</span>{' '}
              <span className="text-slate-900">{order.shippingAddress}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Sản phẩm & Thông tin IMEI</th>
                  <th className="py-2.5 px-3 w-16 text-center">SL</th>
                  <th className="py-2.5 px-3 w-28 text-right">Đơn giá</th>
                  <th className="py-2.5 px-3 w-28 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items?.map((item, index) => (
                  <tr key={item.id} className="align-top">
                    <td className="py-3 px-3 text-center text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-3 px-3 space-y-1">
                      <div className="font-bold text-slate-900">
                        {item.productName || item.variant?.product?.name || 'Điện thoại'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.variant?.color} • {item.variant?.storage}
                      </div>
                      {(item.imeiDevice?.imeiNumber || item.imeiDevice?.imei) && (
                        <div className="inline-flex items-center gap-1 font-mono text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold">
                          <ShieldCheck className="w-3 h-3 text-blue-600" />
                          <span>IMEI: {item.imeiDevice?.imeiNumber || item.imeiDevice?.imei}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">{formatPrice(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatPrice(item.totalPrice || item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span className="font-mono text-slate-900 font-semibold">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Chiết khấu Voucher:</span>
                  <span className="font-mono">-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <span>{order.shippingFee === 0 ? 'Miễn phí' : formatPrice(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Đã gồm thuế GTGT (VAT 10%):</span>
                <span className="font-mono">{formatPrice(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                <span>TỔNG THANH TOÁN:</span>
                <span className="font-mono text-blue-600 text-base">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Warranty & Signature Footer */}
          <div className="pt-4 border-t border-slate-200 space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Quy định bảo hành:</strong> Máy được bảo hành 12 tháng theo số IMEI ghi trên hóa đơn. Bao test 1 đổi 1 trong 30 ngày đầu tiên đối với lỗi phần cứng từ nhà sản xuất. Không áp dụng bảo hành đối với các trường hợp rơi vỡ, vào nước hoặc can thiệp phần mềm trái phép.
            </div>

            <div className="grid grid-cols-3 gap-4 text-center pt-2">
              <div>
                <p className="font-bold text-slate-800">Người mua hàng</p>
                <p className="text-[10px] text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Nhân viên giao nhận</p>
                <p className="text-[10px] text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Đại diện cửa hàng</p>
                <p className="text-[10px] text-slate-400 mt-0.5">(Ký số & Đóng dấu)</p>
                <div className="mt-3 font-mono font-bold text-xs text-blue-600 border border-blue-200 bg-blue-50 py-1 px-2 rounded inline-block">
                  HAPPY GARDEN VERIFIED
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test frontend/src/pages/storefront/Orders/__tests__/OrderInvoiceModal.spec.tsx`
Expected: PASS

- [ ] **Step 5: Wire "Xem hóa đơn" button in `OrderDetailPage.tsx`**

Import and render `OrderInvoiceModal` in `OrderDetailPage.tsx`, opened via "Xem hóa đơn" button in header action bar.

- [ ] **Step 6: Commit Task 5**

```bash
git add frontend/src/pages/storefront/Orders/components/OrderInvoiceModal.tsx frontend/src/pages/storefront/Orders/__tests__/OrderInvoiceModal.spec.tsx frontend/src/pages/storefront/Orders/OrderDetailPage.tsx
git commit -m "feat(orders): implement printable retail invoice modal with IMEI breakdown"
```

---

### Task 6: Return & Refund Request & Profile Management

**Files:**
- Create: `frontend/src/pages/storefront/Orders/components/ReturnRequestModal.tsx`
- Modify: `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx`
- Modify: `frontend/src/pages/storefront/Profile/ProfilePage.tsx`

- [ ] **Step 1: Implement `ReturnRequestModal.tsx`**

Create `frontend/src/pages/storefront/Orders/components/ReturnRequestModal.tsx`:
```tsx
import React, { useState } from 'react';
import { RotateCcw, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { returnService } from '../../../../services/returnService';
import type { Order } from '../../../../types';

interface ReturnRequestModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const RETURN_REASONS = [
  'Lỗi kỹ thuật phần cứng (Lỗi do nhà sản xuất)',
  'Giao sai màu sắc / phiên bản dung lượng',
  'Thiết bị hoặc hộp bị trầy xước, cấn móp khi nhận',
  'Thiếu phụ kiện hoặc quà tặng theo máy',
  'Lý do khác',
];

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  order,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [selectedItems, setSelectedItems] = useState<{ [orderItemId: string]: number }>({});
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [customerNote, setCustomerNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleItem = (orderItemId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[orderItemId]) {
        delete next[orderItemId];
      } else {
        next[orderItemId] = 1;
      }
      return next;
    });
  };

  const handleQuantityChange = (orderItemId: string, qty: number, maxQty: number) => {
    const clamped = Math.max(1, Math.min(maxQty, qty));
    setSelectedItems((prev) => ({
      ...prev,
      [orderItemId]: clamped,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemEntries = Object.entries(selectedItems);
    if (itemEntries.length === 0) {
      setError('Vui lòng chọn ít nhất 1 sản phẩm bạn muốn đổi trả.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await returnService.createReturn({
        orderId: order.id,
        reason,
        customerNote: customerNote.trim() || undefined,
        items: itemEntries.map(([orderItemId, quantity]) => ({
          orderItemId,
          quantity,
          reason,
        })),
      });

      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Không thể tạo yêu cầu đổi trả vào lúc này. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-blue-600">
            <RotateCcw className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Yêu cầu Đổi trả / Hoàn tiền</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-800 space-y-1">
          <p className="font-semibold">Chính sách đổi trả trong vòng 7 ngày:</p>
          <p className="text-blue-700 leading-relaxed">
            Áp dụng đối với sản phẩm còn đầy đủ hộp, phụ kiện và lỗi được xác định từ nhà sản xuất hoặc sai sót khi giao hàng.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Items */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Chọn sản phẩm cần đổi trả:
            </label>
            <div className="space-y-2">
              {order.items?.map((item) => {
                const isSelected = Boolean(selectedItems[item.id]);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.id, item.quantity)}
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <div className="truncate">
                        <div className="font-bold text-slate-900 truncate">
                          {item.productName || item.variant?.product?.name || 'Sản phẩm'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.variant?.color} • {item.variant?.storage}
                          {item.imeiDevice && ` • IMEI: ${item.imeiDevice.imeiNumber || item.imeiDevice.imei}`}
                        </div>
                      </div>
                    </label>

                    {isSelected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-500">SL:</span>
                        <input
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={selectedItems[item.id] || 1}
                          onChange={(e) =>
                            handleQuantityChange(item.id, parseInt(e.target.value) || 1, item.quantity)
                          }
                          className="w-14 px-2 py-1 border border-slate-300 rounded-lg text-xs text-center font-bold"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Select Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              2. Lý do đổi trả chính:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            >
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              3. Mô tả chi tiết & tình trạng máy:
            </label>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Vui lòng mô tả hiện tượng lỗi của máy, phụ kiện đi kèm..."
              rows={3}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gửi yêu cầu đổi trả</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add "Yêu cầu đổi trả" button in `OrderDetailPage.tsx`**

1. Calculate if eligible for return:
```tsx
const isReturnEligible =
  ['DELIVERED', 'COMPLETED'].includes(order.status) &&
  Date.now() - new Date(order.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
```
2. Render button in action bar:
```tsx
{isReturnEligible && (
  <button
    type="button"
    onClick={() => setIsReturnOpen(true)}
    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
  >
    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
    <span>Yêu cầu đổi trả</span>
  </button>
)}
```
3. Wire `ReturnRequestModal` into `OrderDetailPage.tsx`.

- [ ] **Step 3: Add Returns Section to `ProfilePage.tsx`**

1. In `ProfilePage.tsx`, fetch `returnService.getMyReturns()` on mount.
2. Add a navigation tab or section `#returns` ("Đổi trả & Hoàn tiền").
3. Display list of return requests with:
   - Return number
   - Associated order ID
   - Return status badge
   - Returned products & IMEI
   - "Hủy yêu cầu" button when status is `REQUESTED` via `returnService.cancelReturn(ret.id)`.

- [ ] **Step 4: Commit Task 6**

```bash
git add frontend/src/pages/storefront/Orders/components/ReturnRequestModal.tsx frontend/src/pages/storefront/Orders/OrderDetailPage.tsx frontend/src/pages/storefront/Profile/ProfilePage.tsx
git commit -m "feat(returns): implement return request modal and profile returns tracking tab"
```






