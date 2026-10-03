# Shipping Management & Delivery Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete end-to-end shipping system enabling Staff to assign carriers, enter tracking numbers, and progress detailed shipping statuses in Admin Orders, while providing buyers with an interactive 2-layer delivery tracking timeline.

**Architecture:** Extend backend NestJS `ShippingService` and `ShippingController` with upsert assignment and auto-synchronization to `Order.status`. Create a typed frontend `shippingService`, an Ant Design `ShippingDispatchModal` on Admin Orders, and an enhanced 2-layer `OrderTrackingTimeline` on the Storefront order detail page with carrier lookup links.

**Tech Stack:** NestJS, Prisma ORM, TypeScript, React 19, Ant Design, Tailwind CSS, Lucide Icons, Jest, Vitest.

---

### File Structure Map

- **Backend:**
  - `backend/src/modules/shipping/dto/shipping.dto.ts` — DTOs for assigning shipping, updating shipping status, and updating shipping details.
  - `backend/src/modules/shipping/shipping.service.ts` — Business logic for carrier assignment upsert, status transitions, and automatic Order status synchronization.
  - `backend/src/modules/shipping/shipping.controller.ts` — Controller endpoints (`POST /shipping/assign`, `PATCH /shipping/:id/status`, `PATCH /shipping/:id`).
  - `backend/src/modules/shipping/shipping.module.ts` — Module configuration importing `OrdersModule`.
  - `backend/test/unit/shipping.spec.ts` — Unit tests for `ShippingService`.

- **Frontend:**
  - `frontend/src/types/index.ts` — TypeScript types updating `ShippingStatus` to include `READY_TO_SHIP`.
  - `frontend/src/services/shippingService.ts` — API client service wrapping all `/shipping` endpoints and carrier tracking link builder.
  - `frontend/src/services/__tests__/shippingService.spec.ts` — Unit tests for `shippingService`.
  - `frontend/src/pages/Admin/Orders/components/ShippingDispatchModal.tsx` — Modal for Staff to assign carrier, input tracking code, and click status transitions.
  - `frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx` — Integration of shipping button, tracking badges, and dispatch modal.
  - `frontend/src/pages/Admin/Orders/__tests__/ShippingDispatchModal.spec.tsx` — Unit tests for `ShippingDispatchModal`.
  - `frontend/src/pages/storefront/Orders/components/OrderTrackingTimeline.tsx` — 2-layer timeline with 5-step stepper, timestamped activity log, copy tracking code, and carrier links.
  - `frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx` — Unit tests for `OrderTrackingTimeline`.

---

### Task 1: Backend DTOs & Shipping Module Enhancement

**Files:**
- Modify: `backend/src/modules/shipping/dto/shipping.dto.ts`
- Modify: `backend/src/modules/shipping/shipping.module.ts`
- Modify: `backend/src/modules/shipping/shipping.service.ts`
- Modify: `backend/src/modules/shipping/shipping.controller.ts`
- Test: `backend/test/unit/shipping.spec.ts`

- [ ] **Step 1: Write the failing unit tests for `ShippingService`**

Create `backend/test/unit/shipping.spec.ts`:
```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ShippingService } from '../../src/modules/shipping/shipping.service';
import { ShippingStatus } from '../../src/modules/shipping/dto/shipping.dto';
import { OrderStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ShippingService', () => {
  let service: ShippingService;
  let mockPrisma: any;
  let mockOrdersService: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
      },
      shipping: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    mockOrdersService = {
      transitionStatus: jest.fn(),
    };
    service = new ShippingService(mockPrisma, mockOrdersService as any);
  });

  describe('assign', () => {
    it('should update existing PENDING shipping record to READY_TO_SHIP with carrier and tracking info', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', shippingFee: 30000 });
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        status: ShippingStatus.PENDING,
      });
      mockPrisma.shipping.update.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        providerName: 'Giao Hàng Nhanh',
        trackingNumber: 'GHN123456',
        status: ShippingStatus.READY_TO_SHIP,
        shippingFee: 30000,
      });

      const result = await service.assign({
        orderId: 'order-1',
        providerName: 'Giao Hàng Nhanh',
        trackingNumber: 'GHN123456',
      });

      expect(mockPrisma.shipping.update).toHaveBeenCalledWith({
        where: { id: 'ship-1' },
        data: expect.objectContaining({
          providerName: 'Giao Hàng Nhanh',
          trackingNumber: 'GHN123456',
          status: ShippingStatus.READY_TO_SHIP,
        }),
      });
      expect(result.status).toBe(ShippingStatus.READY_TO_SHIP);
    });

    it('should create new shipping record with READY_TO_SHIP if not exists', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-2', shippingFee: 40000 });
      mockPrisma.shipping.findUnique.mockResolvedValue(null);
      mockPrisma.shipping.create.mockResolvedValue({
        id: 'ship-2',
        orderId: 'order-2',
        providerName: 'Viettel Post',
        trackingNumber: 'VT987654',
        status: ShippingStatus.READY_TO_SHIP,
        shippingFee: 40000,
      });

      const result = await service.assign({
        orderId: 'order-2',
        providerName: 'Viettel Post',
        trackingNumber: 'VT987654',
      });

      expect(mockPrisma.shipping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-2',
          providerName: 'Viettel Post',
          trackingNumber: 'VT987654',
          status: ShippingStatus.READY_TO_SHIP,
        }),
      });
      expect(result.status).toBe(ShippingStatus.READY_TO_SHIP);
    });
  });

  describe('updateStatus & auto-sync', () => {
    it('should reject invalid status transition', async () => {
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        status: ShippingStatus.PENDING,
      });

      await expect(
        service.updateStatus('ship-1', { status: ShippingStatus.DELIVERED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should sync order to SHIPPING when shipping transitions to PICKED_UP', async () => {
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        status: ShippingStatus.READY_TO_SHIP,
      });
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PROCESSING,
      });
      mockPrisma.shipping.update.mockResolvedValue({
        id: 'ship-1',
        status: ShippingStatus.PICKED_UP,
      });

      await service.updateStatus('ship-1', { status: ShippingStatus.PICKED_UP });

      expect(mockOrdersService.transitionStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.SHIPPING,
      );
    });

    it('should sync order to DELIVERED when shipping transitions to DELIVERED', async () => {
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        status: ShippingStatus.IN_TRANSIT,
      });
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.SHIPPING,
      });
      mockPrisma.shipping.update.mockResolvedValue({
        id: 'ship-1',
        status: ShippingStatus.DELIVERED,
      });

      await service.updateStatus('ship-1', { status: ShippingStatus.DELIVERED });

      expect(mockOrdersService.transitionStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.DELIVERED,
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/unit/shipping.spec.ts` (in `backend/` directory)
Expected: FAIL (missing methods or arguments).

- [ ] **Step 3: Update `backend/src/modules/shipping/dto/shipping.dto.ts`**

Add `AssignShippingDto`:
```typescript
export class AssignShippingDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'GHN' })
  @IsString()
  @Length(2, 100)
  providerName: string;

  @ApiPropertyOptional({ example: 'GHN123456789' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 30000 })
  @IsOptional()
  shippingFee?: number;

  @ApiPropertyOptional({ example: '2026-10-06T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
}
```

- [ ] **Step 4: Update `backend/src/modules/shipping/shipping.module.ts`**

Import `OrdersModule` with `forwardRef`:
```typescript
import { Module, forwardRef } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, forwardRef(() => OrdersModule)],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
```

- [ ] **Step 5: Implement `assign`, `update`, and auto-sync in `ShippingService`**

In `backend/src/modules/shipping/shipping.service.ts`:
- Inject `@Inject(forwardRef(() => OrdersService)) private readonly ordersService: OrdersService`.
- Add `assign(dto: AssignShippingDto)` method:
```typescript
  async assign(dto: AssignShippingDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.shipping.findUnique({ where: { orderId: dto.orderId } });

    if (existing) {
      return this.prisma.shipping.update({
        where: { id: existing.id },
        data: {
          providerName: dto.providerName,
          trackingNumber: dto.trackingNumber ?? existing.trackingNumber,
          shippingFee: dto.shippingFee ?? existing.shippingFee,
          estimatedDeliveryDate: dto.estimatedDeliveryDate
            ? new Date(dto.estimatedDeliveryDate)
            : existing.estimatedDeliveryDate,
          status:
            existing.status === ShippingStatus.PENDING
              ? ShippingStatus.READY_TO_SHIP
              : existing.status,
        },
      });
    }

    return this.prisma.shipping.create({
      data: {
        orderId: dto.orderId,
        providerName: dto.providerName,
        trackingNumber: dto.trackingNumber,
        shippingFee: dto.shippingFee ?? Number(order.shippingFee) ?? this.estimateFee(),
        estimatedDeliveryDate: dto.estimatedDeliveryDate
          ? new Date(dto.estimatedDeliveryDate)
          : undefined,
        status: ShippingStatus.READY_TO_SHIP,
      },
    });
  }
```
- In `updateStatus(id, dto)`:
After updating shipping, perform auto-sync:
```typescript
    if (dto.status === ShippingStatus.PICKED_UP || dto.status === ShippingStatus.IN_TRANSIT) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: shipping.orderId } });
        if (order && (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PROCESSING)) {
          await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.SHIPPING);
        }
      } catch (err) {
        console.warn('Auto-sync order to SHIPPING deferred:', err);
      }
    } else if (dto.status === ShippingStatus.DELIVERED) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: shipping.orderId } });
        if (order && order.status === OrderStatus.SHIPPING) {
          await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.DELIVERED);
        }
      } catch (err) {
        console.warn('Auto-sync order to DELIVERED deferred:', err);
      }
    } else if (dto.status === ShippingStatus.RETURNED) {
      try {
        await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.RETURNED);
      } catch (err) {
        console.warn('Auto-sync order to RETURNED deferred:', err);
      }
    }
```
- Add `update(id, dto: UpdateShippingDto)`:
```typescript
  async update(id: string, dto: UpdateShippingDto) {
    await this.findOne(id);
    const data: any = {
      ...(dto.providerName && { providerName: dto.providerName }),
      ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
      ...(dto.shippingFee !== undefined && { shippingFee: dto.shippingFee }),
      ...(dto.estimatedDeliveryDate && { estimatedDeliveryDate: new Date(dto.estimatedDeliveryDate) }),
    };
    return this.prisma.shipping.update({ where: { id }, data });
  }
```

- [ ] **Step 6: Update `ShippingController`**

In `backend/src/modules/shipping/shipping.controller.ts`:
- Add `POST /shipping/assign`:
```typescript
  @Post('assign')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Assign carrier & tracking number to order (STAFF+)' })
  assign(@Body() dto: AssignShippingDto) {
    return this.shippingService.assign(dto);
  }
```
- Add `PATCH /shipping/:id`:
```typescript
  @Patch(':id')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Update shipping details (STAFF+)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShippingDto,
  ) {
    return this.shippingService.update(id, dto);
  }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- test/unit/shipping.spec.ts` (in `backend/` directory)
Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/shipping backend/test/unit/shipping.spec.ts
git commit -m "feat(backend): add shipping assign upsert, details update, and auto-sync order status"
```

---

### Task 2: Frontend Types & `shippingService.ts`

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/shippingService.ts`
- Test: `frontend/src/services/__tests__/shippingService.spec.ts`

- [ ] **Step 1: Write the failing test for `shippingService`**

Create `frontend/src/services/__tests__/shippingService.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shippingService } from '../shippingService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('shippingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assignShipping calls POST /shipping/assign with payload', async () => {
    const mockRes = { data: { id: 'ship-1', providerName: 'GHN' } };
    vi.mocked(apiClient.post).mockResolvedValue(mockRes as any);

    const payload = {
      orderId: 'order-1',
      providerName: 'GHN',
      trackingNumber: 'GHN999',
    };
    const res = await shippingService.assignShipping(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/shipping/assign', payload);
    expect(res).toEqual(mockRes.data);
  });

  it('updateShippingStatus calls PATCH /shipping/:id/status', async () => {
    const mockRes = { data: { id: 'ship-1', status: 'IN_TRANSIT' } };
    vi.mocked(apiClient.patch).mockResolvedValue(mockRes as any);

    const res = await shippingService.updateShippingStatus('ship-1', {
      status: 'IN_TRANSIT',
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/shipping/ship-1/status', {
      status: 'IN_TRANSIT',
    });
    expect(res).toEqual(mockRes.data);
  });

  it('getCarrierTrackingUrl returns valid URL for known carriers', () => {
    expect(shippingService.getCarrierTrackingUrl('GHN Express', 'GHN123')).toBe(
      'https://donhang.ghn.vn/?order_code=GHN123',
    );
    expect(shippingService.getCarrierTrackingUrl('Viettel Post', 'VT456')).toBe(
      'https://viettelpost.vn/tra-cuu-hanh-trinh-don?code=VT456',
    );
    expect(shippingService.getCarrierTrackingUrl('GHTK', 'GHTK789')).toBe(
      'https://i.ghtk.vn/GHTK789',
    );
    expect(shippingService.getCarrierTrackingUrl('Unknown', '123')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/__tests__/shippingService.spec.ts` (in `frontend/` directory)
Expected: FAIL (module not found).

- [ ] **Step 3: Update `frontend/src/types/index.ts`**

Update `ShippingStatus` in `frontend/src/types/index.ts` (around line 258):
```typescript
export type ShippingStatus =
  | 'PENDING'
  | 'READY_TO_SHIP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED';
```

- [ ] **Step 4: Create `frontend/src/services/shippingService.ts`**

```typescript
import { apiClient } from './apiClient';
import type { Shipping, ShippingStatus } from '../types';

export interface AssignShippingPayload {
  orderId: string;
  providerName: string;
  trackingNumber?: string;
  shippingFee?: number;
  estimatedDeliveryDate?: string;
}

export interface UpdateShippingStatusPayload {
  status: ShippingStatus;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
}

export interface UpdateShippingPayload {
  providerName?: string;
  trackingNumber?: string;
  shippingFee?: number;
  estimatedDeliveryDate?: string;
}

export const CARRIER_PRESETS = [
  { key: 'GHN', name: 'Giao Hàng Nhanh (GHN)' },
  { key: 'VIETTEL_POST', name: 'Viettel Post' },
  { key: 'GHTK', name: 'Giao Hàng Tiết Kiệm (GHTK)' },
  { key: 'JT_EXPRESS', name: 'J&T Express' },
  { key: 'VNPOST', name: 'Bưu Điện Việt Nam (VNPost)' },
  { key: 'HAPPY_EXPRESS', name: 'Hỏa Tốc Happy Express' },
];

export const shippingService = {
  async assignShipping(payload: AssignShippingPayload): Promise<Shipping> {
    const res = await apiClient.post('/shipping/assign', payload);
    return res.data?.data ?? res.data;
  },

  async updateShippingStatus(
    id: string,
    payload: UpdateShippingStatusPayload,
  ): Promise<Shipping> {
    const res = await apiClient.patch(`/shipping/${id}/status`, payload);
    return res.data?.data ?? res.data;
  },

  async updateShipping(
    id: string,
    payload: UpdateShippingPayload,
  ): Promise<Shipping> {
    const res = await apiClient.patch(`/shipping/${id}`, payload);
    return res.data?.data ?? res.data;
  },

  async getShippingByOrderId(orderId: string): Promise<Shipping | null> {
    try {
      const res = await apiClient.get(`/shipping/order/${orderId}`);
      return res.data?.data ?? res.data;
    } catch {
      return null;
    }
  },

  getCarrierTrackingUrl(providerName?: string, trackingNumber?: string): string | null {
    if (!trackingNumber) return null;
    const name = (providerName || '').toLowerCase();
    if (name.includes('ghn') || name.includes('giao hàng nhanh')) {
      return `https://donhang.ghn.vn/?order_code=${encodeURIComponent(trackingNumber)}`;
    }
    if (name.includes('viettel')) {
      return `https://viettelpost.vn/tra-cuu-hanh-trinh-don?code=${encodeURIComponent(trackingNumber)}`;
    }
    if (name.includes('ghtk') || name.includes('tiết kiệm')) {
      return `https://i.ghtk.vn/${encodeURIComponent(trackingNumber)}`;
    }
    if (name.includes('j&t') || name.includes('jt')) {
      return `https://jtexpress.vn/vi/tracking?billcode=${encodeURIComponent(trackingNumber)}`;
    }
    if (name.includes('vnpost') || name.includes('bưu điện')) {
      return `https://www.vnpost.vn/vi-vn/dinh-vi/buu-pham?key=${encodeURIComponent(trackingNumber)}`;
    }
    return null;
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/services/__tests__/shippingService.spec.ts` (in `frontend/` directory)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/shippingService.ts frontend/src/services/__tests__/shippingService.spec.ts
git commit -m "feat(frontend): create shippingService and update ShippingStatus types"
```

---

### Task 3: Staff Admin `ShippingDispatchModal.tsx` & Integration in `AdminOrdersPage.tsx`

**Files:**
- Create: `frontend/src/pages/Admin/Orders/components/ShippingDispatchModal.tsx`
- Modify: `frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx`
- Test: `frontend/src/pages/Admin/Orders/__tests__/ShippingDispatchModal.spec.tsx`

- [ ] **Step 1: Write the failing test for `ShippingDispatchModal`**

Create `frontend/src/pages/Admin/Orders/__tests__/ShippingDispatchModal.spec.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShippingDispatchModal } from '../components/ShippingDispatchModal';
import type { Order } from '../../../../types';

describe('ShippingDispatchModal', () => {
  const mockOrder: Order = {
    id: 'ord-123',
    orderNumber: 'ORD-9021',
    customerName: 'Nguyễn Văn A',
    shippingPhone: '0912345678',
    shippingAddress: '123 Lê Lợi, Q.1, HCM',
    status: 'CONFIRMED',
    totalAmount: 15000000,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    items: [],
    createdAt: '2026-10-03T10:00:00Z',
    shipping: {
      id: 'ship-123',
      orderId: 'ord-123',
      providerName: 'Giao Hàng Nhanh (GHN)',
      trackingNumber: 'GHN88291039VN',
      status: 'READY_TO_SHIP',
      shippingFee: 30000,
      createdAt: '2026-10-03T10:00:00Z',
    },
  };

  it('renders order number, customer info, and carrier selection', () => {
    render(
      <ShippingDispatchModal
        open={true}
        order={mockOrder}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText(/ORD-9021/)).toBeDefined();
    expect(screen.getByText(/Nguyễn Văn A/)).toBeDefined();
    expect(screen.getByDisplayValue('GHN88291039VN')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/Admin/Orders/__tests__/ShippingDispatchModal.spec.tsx` (in `frontend/` directory)
Expected: FAIL (component not found).

- [ ] **Step 3: Create `ShippingDispatchModal.tsx`**

Create `frontend/src/pages/Admin/Orders/components/ShippingDispatchModal.tsx`:
Include:
- Order summary banner (orderNumber, customerName, phone, address).
- Carrier quick-select chips (`CARRIER_PRESETS`) and custom carrier input.
- Monospace Tracking Number input with trim.
- Estimated delivery date picker (`DatePicker`).
- Status transition buttons (`READY_TO_SHIP`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`, `RETURNED`) based on valid transitions.
- Save button calling `shippingService.assignShipping` or `shippingService.updateShipping`.
- Status button calling `shippingService.updateShippingStatus`.
- Message feedback on error and success, loading state on submit.

- [ ] **Step 4: Integrate `ShippingDispatchModal` into `AdminOrdersPage.tsx`**

In `frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx`:
- Add state: `[shippingModalOrder, setShippingModalOrder] = useState<Order | null>(null)` and `[isShippingModalOpen, setIsShippingModalOpen] = useState(false)`.
- In `columns`: Add `CarOutlined` button labeled "Vận chuyển" or tag showing `record.shipping?.trackingNumber`.
- Inside `Modal` detail: Add a section showing `Đơn vị vận chuyển`, `Mã vận đơn`, `Trạng thái giao nhận`, and a button "Cập nhật vận chuyển" that opens `ShippingDispatchModal`.
- On modal success: call `loadOrders()` to refresh data.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/pages/Admin/Orders/__tests__/ShippingDispatchModal.spec.tsx` (in `frontend/` directory)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Admin/Orders/components/ShippingDispatchModal.tsx frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx frontend/src/pages/Admin/Orders/__tests__/ShippingDispatchModal.spec.tsx
git commit -m "feat(admin): add ShippingDispatchModal and integrate shipping management in AdminOrdersPage"
```

---

### Task 4: Storefront `OrderTrackingTimeline.tsx` 2-Layer Upgrade

**Files:**
- Modify: `frontend/src/pages/storefront/Orders/components/OrderTrackingTimeline.tsx`
- Modify: `frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx`

- [ ] **Step 1: Write/Update the failing test for `OrderTrackingTimeline`**

Update `frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline';
import type { Order } from '../../../../types';

describe('OrderTrackingTimeline 2-Layer', () => {
  const baseOrder: Order = {
    id: 'ord-1',
    orderNumber: 'ORD-1001',
    customerName: 'Trần Thị B',
    shippingPhone: '0988776655',
    shippingAddress: '456 Hai Bà Trưng, Q.3, HCM',
    status: 'SHIPPING',
    totalAmount: 25000000,
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    items: [],
    createdAt: '2026-10-03T08:00:00Z',
    shipping: {
      id: 'ship-1',
      orderId: 'ord-1',
      providerName: 'Giao Hàng Nhanh (GHN)',
      trackingNumber: 'GHN88291039VN',
      status: 'IN_TRANSIT',
      shippingFee: 30000,
      estimatedDeliveryDate: '2026-10-06T00:00:00Z',
      shippedAt: '2026-10-03T14:00:00Z',
      createdAt: '2026-10-03T09:00:00Z',
    },
  };

  it('renders carrier name, tracking number and carrier lookup link', () => {
    render(<OrderTrackingTimeline order={baseOrder} />);

    expect(screen.getByText(/Giao Hàng Nhanh/i)).toBeDefined();
    expect(screen.getByText('GHN88291039VN')).toBeDefined();
    const link = screen.getByRole('link', { name: /tra cứu/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toContain('donhang.ghn.vn');
  });

  it('renders 5-step stepper and activity log entries', () => {
    render(<OrderTrackingTimeline order={baseOrder} />);

    expect(screen.getByText('Đã đặt hàng')).toBeDefined();
    expect(screen.getByText('Đã đóng gói')).toBeDefined();
    expect(screen.getByText('Bưu tá đã lấy')).toBeDefined();
    expect(screen.getByText('Đang giao hàng')).toBeDefined();
    expect(screen.getByText('Đã nhận hàng')).toBeDefined();
    expect(screen.getByText(/Lịch sử hành trình bưu kiện/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx` (in `frontend/` directory)
Expected: FAIL (missing 5 steps, lookup link, or activity log).

- [ ] **Step 3: Implement 2-layer `OrderTrackingTimeline.tsx`**

In `frontend/src/pages/storefront/Orders/components/OrderTrackingTimeline.tsx`:
- Header section:
  - Provider name with status badge.
  - Tracking number with Copy button.
  - Carrier direct tracking link (`shippingService.getCarrierTrackingUrl(shipping.providerName, shipping.trackingNumber)`) with `ExternalLink` icon.
  - Estimated delivery date with `Calendar` icon.
- Layer 1: Stepper 5 steps:
  1. `PENDING`: "Đã đặt hàng"
  2. `READY_TO_SHIP`: "Đã đóng gói"
  3. `PICKED_UP`: "Bưu tá đã lấy"
  4. `IN_TRANSIT`: "Đang giao hàng"
  5. `DELIVERED`: "Đã nhận hàng"
  Compute active index based on `shipping?.status` (or fallback to `order.status`).
- Layer 2: Activity Log Timeline:
  - List entries in reverse chronological order based on timestamps:
    - Delivered: `shipping.deliveredAt`
    - In transit: `shipping.updatedAt`
    - Picked up: `shipping.shippedAt`
    - Packed & Tracking assigned: `shipping.createdAt`
    - Order placed: `order.createdAt`
- Alerts for `CANCELLED`, `FAILED`, and `RETURNED`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx` (in `frontend/` directory)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/storefront/Orders/components/OrderTrackingTimeline.tsx frontend/src/pages/storefront/Orders/__tests__/OrderTrackingTimeline.spec.tsx
git commit -m "feat(storefront): upgrade OrderTrackingTimeline to 2-layer view with carrier tracker link"
```

---

### Task 5: End-to-End Test & Build Verification

**Files:**
- Test backend: `backend/`
- Test frontend: `frontend/`

- [ ] **Step 1: Run all backend tests**

Run: `npm test` (in `backend/` directory)
Expected: All test suites PASS without regressions.

- [ ] **Step 2: Run all frontend tests**

Run: `npm test` (in `frontend/` directory)
Expected: All test suites PASS without regressions.

- [ ] **Step 3: Run frontend build check**

Run: `npm run build` (in `frontend/` directory)
Expected: Build succeeds with 0 TypeScript/Vite errors.

- [ ] **Step 4: Commit and finalize**

```bash
git add .
git commit -m "chore: verify tests and build for full shipping feature suite"
```
