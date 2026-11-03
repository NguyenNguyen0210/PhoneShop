# PhoneShop Core Fixes & System Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục triệt để các lỗi nghiệp vụ cốt lõi (Carrier Return đơn online, failPayment nhả kho, Return/Refund lifecycle), hoàn thiện Refund UI, kiểm soát nhập kho IMEI, mở quyền RBAC và tối ưu Jest teardown cùng Frontend bundle.

**Architecture:** Áp dụng mô hình Modular Monolith của NestJS 11 kết hợp Prisma interactive transactions để bảo toàn tính toàn vẹn dữ liệu (ACID). Tách biệt rành mạch giữa nghiệp vụ trả hàng vận chuyển (chưa qua kho) và nghiệp vụ hoàn tiền/đổi trả chính thức (sau khi đã giao). Tận dụng conditional updates để đảm bảo tính idempotent chống double-release và double-refund.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, React 19, TypeScript, Jest, Vite, Tailwind CSS, Ant Design.

---

## File Structure Map

### Backend Modifications & Tests:
- `backend/src/modules/orders/orders.service.ts`: Xử lý phân tách COD vs PAID trong nhánh `RETURNED` của `transitionStatus()`, chặn chuyển trực tiếp `DELIVERED -> RETURNED`.
- `backend/src/modules/payments/payments.service.ts`: Đồng bộ `failPayment()` hủy Order `PENDING` và nhả hàng giữ chỗ (`reservedQty`, IMEI `RESERVED`) trong interactive transaction.
- `backend/src/modules/cart/cart.controller.ts`: Bổ sung `Role.STAFF, Role.MANAGER` vào `@Roles()`.
- `backend/src/modules/wishlist/wishlist.controller.ts`: Bổ sung `Role.STAFF, Role.MANAGER` vào `@Roles()`.
- `backend/test/carrier-return.spec.ts`: Test suite kiểm chứng đơn VNPAY/VietQR đã `PAID` và đơn COD khi bưu tá báo `RETURNED`.
- `backend/test/fail-payment.spec.ts`: Test suite kiểm chứng `failPayment` hủy đơn, nhả kho và tính idempotent.
- `backend/test/return-refund-lifecycle.spec.ts`: Test suite kiểm chứng chặn `transitionStatus(DELIVERED -> RETURNED)`, `processRefund` và chống double-refund.
- `backend/test/rbac-cart-wishlist.spec.ts`: Test suite kiểm chứng quyền truy cập giỏ hàng của `STAFF` và `MANAGER`.
- `backend/test/orders-hold.spec.ts` & `backend/test/system-settings-integration.spec.ts`: Bổ sung hook `afterAll()` dọn dẹp app/prisma.

### Frontend Modifications:
- `frontend/src/services/orderService.ts`: Bổ sung phương thức `refundOrder()`.
- `frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx`: Bổ sung nút "Hoàn tiền / Đổi trả" và `OrderRefundModal`.
- `frontend/src/pages/Admin/Inventory/components/StockInboundModal.tsx`: Chặn nhập tay biến thể IMEI và hiển thị banner hướng dẫn.
- `frontend/vite.config.ts`: Cấu hình `manualChunks` tối ưu code-splitting.

---

## Task List Overview

- **Task 1 (PR #1): Sửa Carrier Return cho Đơn hàng Trả trước (VNPAY / VietQR)**
- **Task 2 (PR #2): Đồng bộ `failPayment` & Giải phóng Hàng giữ chỗ (VietQR)**
- **Task 3 (PR #3): Chuẩn hóa Vòng đời Đổi trả sau Giao hàng (DELIVERED -> RETURNED)**
- **Task 4 (PR #4.1): Bổ sung RBAC Giỏ hàng & Danh sách yêu thích cho STAFF / MANAGER**
- **Task 5 (PR #4.2): Tích hợp Refund Modal trên Admin Orders Portal**
- **Task 6 (PR #4.3): Khóa Nhập tay Biến thể IMEI tại StockInboundModal**
- **Task 7 (PR #5.1): Dọn dẹp Teardown Jest Suite (Loại bỏ Worker Leaks)**
- **Task 8 (PR #5.2): Tối ưu Code-splitting & Bundle Size trên Frontend**
- **Task 9: Chạy toàn diện 8 Regression Tests & Build Verification**

---

### Task 1 (PR #1): Sửa Carrier Return cho Đơn hàng Trả trước (VNPAY / VietQR)

**Files:**
- Modify: `backend/src/modules/orders/orders.service.ts`
- Test: `backend/test/carrier-return.spec.ts`

- [ ] **Step 1: Viết test hồi quy cho Carrier Return (Failing Test)**
Tạo file `backend/test/carrier-return.spec.ts` kiểm thử 2 kịch bản:
1. Đơn VNPAY đã `PAID` đang `SHIPPING` bị bưu tá chuyển sang `RETURNED` -> Không ném exception, IMEI chuyển sang `RETURNED`, hủy bảo hành thành công.
2. Đơn COD chưa thanh toán đang `SHIPPING` bị chuyển sang `RETURNED` -> IMEI về `AVAILABLE`, `reservedQty` giảm, thanh toán `PENDING` bị hủy.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { WarrantyService } from '../src/modules/warranty/warranty.service';
import { OrderStatus, PaymentStatus, ImeiStatus, PaymentMethod } from '@prisma/client';

describe('OrdersService - Carrier Return (PR #1)', () => {
  let ordersService: OrdersService;
  let prisma: any;
  let warrantyService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      imeiDevice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      voucher: {
        update: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    warrantyService = {
      voidWarrantiesForOrder: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: WarrantyService, useValue: warrantyService },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('nên cho phép bưu tá trả hàng đơn VNPAY đã PAID mà không ném BadRequestException', async () => {
    const mockOrder = {
      id: 'order-vnpay-1',
      status: OrderStatus.SHIPPING,
      paymentMethod: PaymentMethod.VNPAY,
      items: [{ variantId: 'v1', quantity: 1, imeiDeviceId: 'imei-1' }],
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    // Giả lập đơn có thanh toán PAID
    prisma.payment.findFirst.mockResolvedValue({ id: 'p1', status: PaymentStatus.PAID });

    await expect(
      ordersService.transitionStatus('order-vnpay-1', OrderStatus.RETURNED),
    ).resolves.toBeDefined();

    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-1' },
      data: { status: ImeiStatus.RETURNED },
    });
    expect(warrantyService.voidWarrantiesForOrder).toHaveBeenCalled();
  });

  it('nên trả IMEI về AVAILABLE đối với đơn COD chưa thanh toán', async () => {
    const mockOrder = {
      id: 'order-cod-1',
      status: OrderStatus.SHIPPING,
      paymentMethod: PaymentMethod.COD,
      items: [{ variantId: 'v1', quantity: 1, imeiDeviceId: 'imei-cod-1' }],
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    prisma.payment.findFirst.mockResolvedValue(null);

    await ordersService.transitionStatus('order-cod-1', OrderStatus.RETURNED);

    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-cod-1', status: ImeiStatus.RESERVED },
      data: { status: ImeiStatus.AVAILABLE },
    });
  });
});
```

- [ ] **Step 2: Chạy test để kiểm chứng lỗi hiện tại**
Command: `npm test -- carrier-return.spec.ts`
Expected: FAIL với `BadRequestException: Order is already paid and cannot be cancelled. Please contact support.`

- [ ] **Step 3: Cập nhật `orders.service.ts` tách 2 trường hợp COD vs PAID**
Tại `backend/src/modules/orders/orders.service.ts`, thay thế khối `if (newStatus === OrderStatus.RETURNED && order.status === OrderStatus.SHIPPING)` để phân nhánh:
```typescript
      if (newStatus === OrderStatus.RETURNED && order.status === OrderStatus.SHIPPING) {
        const hasPaidPayment = await tx.payment?.findFirst?.({
          where: {
            orderId: id,
            status: { in: [PaymentStatus.PAID, PaymentStatus.PROCESSING] },
          },
          select: { id: true },
        });

        if (!hasPaidPayment) {
          // COD / Chưa thanh toán: Hoàn trả IMEI về AVAILABLE, trừ reservedQty
          await this.rollbackVoucherUsage(tx, order);
          if (tx.payment?.updateMany) {
            await tx.payment.updateMany({
              where: { orderId: id, status: PaymentStatus.PENDING },
              data: { status: PaymentStatus.CANCELLED },
            });
          }
          for (const item of order.items) {
            if (item.imeiDeviceId) {
              await tx.imeiDevice.updateMany({
                where: { id: item.imeiDeviceId, status: ImeiStatus.RESERVED },
                data: { status: ImeiStatus.AVAILABLE },
              });
            }
            if (tx.inventory?.updateMany) {
              await tx.inventory.updateMany({
                where: { variantId: item.variantId, reservedQty: { gte: item.quantity } },
                data: { reservedQty: { decrement: item.quantity } },
              });
            }
          }
          await rollbackFlashSoldCount(tx, order.items, order.createdAt);
        } else {
          // Đã thanh toán (VNPAY/VietQR): Bỏ qua assertNoCapturedPayment
          // Chuyển IMEI sang RETURNED (chờ kiểm tra), hủy bảo hành
          for (const item of order.items) {
            if (item.imeiDeviceId) {
              await tx.imeiDevice.updateMany({
                where: { id: item.imeiDeviceId },
                data: { status: ImeiStatus.RETURNED },
              });
            }
          }
          await this.rollbackVoucherUsage(tx, order);
          await rollbackFlashSoldCount(tx, order.items, order.createdAt);
        }
        await this.warrantyService?.voidWarrantiesForOrder(tx, id);
      }
```

- [ ] **Step 4: Chạy lại test để xác nhận PASS**
Command: `npm test -- carrier-return.spec.ts`
Expected: PASS cả 2 tests.

- [ ] **Step 5: Commit PR #1**
```bash
git add backend/src/modules/orders/orders.service.ts backend/test/carrier-return.spec.ts
git commit -m "fix(orders): handle carrier return for paid orders without blocking exception"
```

---

### Task 2 (PR #2): Đồng bộ `failPayment` & Giải phóng Hàng giữ chỗ (VietQR)

**Files:**
- Modify: `backend/src/modules/payments/payments.service.ts`
- Test: `backend/test/fail-payment.spec.ts`

- [ ] **Step 1: Viết test hồi quy cho `failPayment` (Failing Test)**
Tạo file `backend/test/fail-payment.spec.ts` kiểm thử:
1. Gọi `failPayment` cho payment PENDING của đơn VietQR PENDING -> Payment chuyển FAILED, Order chuyển CANCELLED, reservedQty được trừ, IMEI chuyển về AVAILABLE.
2. Gọi `failPayment` lần hai -> Ném `BadRequestException` (Idempotent, không giải phóng tồn kho lần 2).

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, ImeiStatus, TransactionStatus } from '@prisma/client';

describe('PaymentsService - failPayment (PR #2)', () => {
  let paymentsService: PaymentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      imeiDevice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  it('nên hủy Order PENDING và giải phóng IMEI/reservedQty khi payment bị đánh dấu FAILED', async () => {
    const mockPayment = { id: 'pay-1', status: PaymentStatus.PENDING, amount: 20000000, orderId: 'ord-1' };
    const mockOrder = {
      id: 'ord-1',
      status: OrderStatus.PENDING,
      payments: [mockPayment],
      items: [{ variantId: 'v1', quantity: 1, imeiDeviceId: 'imei-1' }],
    };

    prisma.payment.findUnique.mockResolvedValue(mockPayment);
    prisma.order.findUnique.mockResolvedValue(mockOrder);

    await paymentsService.failPayment('pay-1');

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pay-1' }, data: { status: PaymentStatus.FAILED } })
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ord-1' }, data: expect.objectContaining({ status: OrderStatus.CANCELLED }) })
    );
    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-1', status: ImeiStatus.RESERVED },
      data: { status: ImeiStatus.AVAILABLE },
    });
  });

  it('nên từ chối khi payment không ở trạng thái PENDING (chống double-release)', async () => {
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay-failed', status: PaymentStatus.FAILED });

    await expect(paymentsService.failPayment('pay-failed')).rejects.toThrow(BadRequestException);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**
Command: `npm test -- fail-payment.spec.ts`
Expected: FAIL với việc `order.update` không được gọi.

- [ ] **Step 3: Cập nhật hàm `failPayment` trong `payments.service.ts`**
Thực hiện hủy đơn và giải phóng tồn kho trong transaction như đã thiết kế.

- [ ] **Step 4: Chạy lại test để xác nhận PASS**
Command: `npm test -- fail-payment.spec.ts`
Expected: PASS 2/2 tests.

- [ ] **Step 5: Commit PR #2**
```bash
git add backend/src/modules/payments/payments.service.ts backend/test/fail-payment.spec.ts
git commit -m "fix(payments): cancel pending order and release reserved stock on failPayment"
```

---

### Task 3 (PR #3): Chuẩn hóa Vòng đời Đổi trả sau Giao hàng (DELIVERED -> RETURNED)

**Files:**
- Modify: `backend/src/modules/orders/orders.service.ts`
- Test: `backend/test/return-refund-lifecycle.spec.ts`

- [ ] **Step 1: Viết test hồi quy cho Vòng đời Đổi trả (Failing Test)**
Tạo file `backend/test/return-refund-lifecycle.spec.ts`:
1. Gọi `transitionStatus(DELIVERED -> RETURNED)` -> Bị ném lỗi `BadRequestException`, yêu cầu dùng `processRefund`.
2. Gọi `processRefund` cho đơn `DELIVERED` -> Đơn chuyển sang `RETURNED`, Payment chuyển `REFUNDED`, kho vật lý được cộng lại (`quantity`), IMEI chuyển `RETURNED`, bảo hành chuyển `VOIDED`.
3. Gọi `processRefund` lần 2 cho cùng đơn -> Ném `BadRequestException` (Chống double-refund / double-restock).

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { WarrantyService } from '../src/modules/warranty/warranty.service';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, ImeiStatus, StockMovementType } from '@prisma/client';

describe('OrdersService - Return & Refund Lifecycle (PR #3)', () => {
  let ordersService: OrdersService;
  let prisma: any;
  let warrantyService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ quantity: 10 }),
      },
      stockMovement: {
        create: jest.fn(),
      },
      imeiDevice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    warrantyService = {
      voidWarrantiesForOrder: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: WarrantyService, useValue: warrantyService },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('nên chặn transitionStatus trực tiếp từ DELIVERED sang RETURNED', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'del-1',
      status: OrderStatus.DELIVERED,
      items: [],
    });

    await expect(
      ordersService.transitionStatus('del-1', OrderStatus.RETURNED),
    ).rejects.toThrow(BadRequestException);
  });

  it('nên cho phép processRefund đổi trả đơn DELIVERED an toàn và nhập lại kho', async () => {
    const mockOrder = {
      id: 'del-2',
      orderNumber: 'ORD-DEL-2',
      status: OrderStatus.DELIVERED,
      totalAmount: 15000000,
      payments: [{ id: 'p2', status: PaymentStatus.PAID, amount: 15000000 }],
      items: [{ variantId: 'v2', quantity: 1, imeiDeviceId: 'imei-2' }],
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });

    const result = await ordersService.processRefund('del-2', {
      reason: 'Hàng lỗi màn hình',
      restockItems: true,
    }, 'admin-1');

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-2', status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] } },
        data: { status: OrderStatus.RETURNED },
      })
    );
    expect(prisma.inventory.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { variantId: 'v2' },
        data: { quantity: { increment: 1 } },
      })
    );
    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-2' },
      data: { status: ImeiStatus.RETURNED },
    });
    expect(warrantyService.voidWarrantiesForOrder).toHaveBeenCalled();
  });

  it('nên từ chối processRefund lần hai khi đơn đã RETURNED (chống double-restock)', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'del-3',
      status: OrderStatus.RETURNED,
      payments: [{ status: PaymentStatus.REFUNDED }],
    });

    await expect(
      ordersService.processRefund('del-3', { reason: 'Hoàn lại' }),
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Chạy test để kiểm chứng lỗi hiện tại**
Command: `npm test -- return-refund-lifecycle.spec.ts`
Expected: FAIL ở test chặn `transitionStatus(DELIVERED -> RETURNED)`.

- [ ] **Step 3: Cập nhật `orders.service.ts` chặn chuyển suông từ DELIVERED sang RETURNED**
Trong `orders.service.ts`:
1. Sửa `allowedTransitions`:
```typescript
[OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
```
2. Thêm kiểm tra rõ ràng trong `transitionStatus()`:
```typescript
if (newStatus === OrderStatus.RETURNED && (oldStatus === OrderStatus.DELIVERED || oldStatus === OrderStatus.COMPLETED)) {
  throw new BadRequestException('Đơn hàng đã giao thành công chỉ có thể đổi trả thông qua quy trình Hoàn tiền / Đổi trả chính thức (processRefund).');
}
```

- [ ] **Step 4: Chạy lại test để xác nhận PASS**
Command: `npm test -- return-refund-lifecycle.spec.ts`
Expected: PASS 3/3 tests.

- [ ] **Step 5: Commit PR #3**
```bash
git add backend/src/modules/orders/orders.service.ts backend/test/return-refund-lifecycle.spec.ts
git commit -m "fix(orders): enforce official refund workflow for delivered orders and prevent duplicate restock"
```

---

### Task 4 (PR #4.1): Bổ sung RBAC Giỏ hàng & Danh sách yêu thích cho STAFF / MANAGER

**Files:**
- Modify: `backend/src/modules/cart/cart.controller.ts`
- Modify: `backend/src/modules/wishlist/wishlist.controller.ts`
- Test: `backend/test/rbac-cart-wishlist.spec.ts`

- [ ] **Step 1: Viết test kiểm tra RBAC metadata (Failing Test)**
Tạo file `backend/test/rbac-cart-wishlist.spec.ts` kiểm tra metadata `@Roles` của `CartController` và `WishlistController` có chứa `Role.STAFF` và `Role.MANAGER`.

```typescript
import { Reflector } from '@nestjs/core';
import { CartController } from '../src/modules/cart/cart.controller';
import { WishlistController } from '../src/modules/wishlist/wishlist.controller';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { Role } from '../src/common/enums/role.enum';

describe('RBAC - Cart & Wishlist for Staff/Manager (PR #4.1)', () => {
  const reflector = new Reflector();

  it('CartController các endpoint phải cho phép Role.STAFF và Role.MANAGER', () => {
    const methods = ['getCart', 'addItem', 'updateItem', 'removeItem', 'clearCart'];
    methods.forEach((methodName) => {
      const roles = reflector.get<string[]>(ROLES_KEY, (CartController.prototype as any)[methodName]);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.STAFF);
      expect(roles).toContain(Role.MANAGER);
      expect(roles).toContain(Role.USER);
    });
  });

  it('WishlistController class/method phải cho phép Role.STAFF và Role.MANAGER', () => {
    const roles = reflector.get<string[]>(ROLES_KEY, WishlistController);
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.USER);
  });
});
```

- [ ] **Step 2: Chạy test để kiểm chứng lỗi thiếu role**
Command: `npm test -- rbac-cart-wishlist.spec.ts`
Expected: FAIL vì thiếu `Role.STAFF` và `Role.MANAGER`.

- [ ] **Step 3: Cập nhật `@Roles` trong `cart.controller.ts` và `wishlist.controller.ts`**
Cập nhật các decorator thành `@Roles(Role.USER, Role.STAFF, Role.MANAGER, Role.ADMIN)`.

- [ ] **Step 4: Chạy lại test để xác nhận PASS**
Command: `npm test -- rbac-cart-wishlist.spec.ts`
Expected: PASS 2/2 tests.

- [ ] **Step 5: Commit PR #4.1**
```bash
git add backend/src/modules/cart/cart.controller.ts backend/src/modules/wishlist/wishlist.controller.ts backend/test/rbac-cart-wishlist.spec.ts
git commit -m "fix(rbac): grant staff and manager access to cart and wishlist"
```

---

### Task 5 (PR #4.2): Tích hợp Refund Modal trên Admin Orders Portal

**Files:**
- Modify: `frontend/src/services/orderService.ts`
- Modify: `frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx`

- [ ] **Step 1: Bổ sung API `refundOrder` trong `orderService.ts`**
```typescript
  async refundOrder(
    id: string,
    payload: { reason: string; restockItems?: boolean; note?: string }
  ): Promise<Order> {
    const response = await apiClient.post(`/orders/${id}/refund`, payload);
    return normalizeOrder(response.data?.data ?? response.data);
  },
```

- [ ] **Step 2: Tạo `OrderRefundModal` và Action Button trong `AdminOrdersPage.tsx`**
- Thêm action button "Hoàn tiền / Đổi trả" với icon rollback khi `record.status === 'DELIVERED' || record.status === 'COMPLETED'`.
- Khi nhấn, mở Modal Ant Design chứa:
  - Input nhập lý do hoàn tiền (bắt buộc).
  - Switch/Checkbox `restockItems`: "Nhập lại kho & đánh dấu IMEI là RETURNED" (mặc định: `true`).
  - Input `note`: Ghi chú tài khoản ngân hàng hoặc phương thức hoàn trả.
- Xử lý submit gọi `orderService.refundOrder(selectedOrder.id, values)`.
- Hiển thị thông báo thành công `message.success('Đã xử lý hoàn tiền đơn hàng')` và reload bảng.

- [ ] **Step 3: Kiểm tra build TypeScript Frontend**
Command: `npm run build` (tại `frontend/`)
Expected: Build thành công không có lỗi type.

- [ ] **Step 4: Commit PR #4.2**
```bash
git add frontend/src/services/orderService.ts frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx
git commit -m "feat(admin): add order refund modal and connect refund api"
```

---

### Task 6 (PR #4.3): Khóa Nhập tay Biến thể IMEI tại StockInboundModal

**Files:**
- Modify: `frontend/src/pages/Admin/Inventory/components/StockInboundModal.tsx`

- [ ] **Step 1: Bổ sung kiểm tra biến thể có quản lý theo IMEI**
Trong `StockInboundModal.tsx`:
- Sử dụng `imeiService.getImeis({ variantId: selectedVariantId, limit: 1 })` khi người dùng chọn biến thể hoặc kiểm tra thông tin danh mục điện thoại.
- Nếu biến thể có IMEI:
  - Đặt cờ `isImeiManaged = true`.
  - Hiển thị `Alert` cảnh báo màu vàng:
    `"Biến thể này được quản lý theo từng số IMEI riêng biệt. Vui lòng sử dụng tính năng Import IMEI để nhập kho chính xác."`
  - Khóa ô `InputNumber` nhập số lượng và vô hiệu hóa nút submit (`disabled={isImeiManaged}`).
  - Thêm nút "Chuyển sang Quản lý IMEI" dẫn tới tab IMEI.

- [ ] **Step 2: Kiểm tra build TypeScript Frontend**
Command: `npm run build` (tại `frontend/`)
Expected: Build thành công không có lỗi type.

- [ ] **Step 3: Commit PR #4.3**
```bash
git add frontend/src/pages/Admin/Inventory/components/StockInboundModal.tsx
git commit -m "fix(inventory-ui): prevent manual stock adjustment for imei-tracked variants"
```

---

### Task 7 (PR #5.1): Dọn dẹp Teardown Jest Suite (Loại bỏ Worker Leaks)

**Files:**
- Modify: `backend/test/orders-hold.spec.ts`
- Modify: `backend/test/system-settings-integration.spec.ts`
- Modify: `backend/test/refund-workflow.spec.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Bổ sung `afterAll()` dọn dẹp TestingModule trong các file test**
Thêm `afterAll(async () => { await module.close(); });` và `jest.clearAllTimers();` vào các file test suites e2e/integration.
Cập nhật script `"test": "jest --detectOpenHandles --forceExit"` trong `backend/package.json`.

- [ ] **Step 2: Chạy kiểm tra Jest**
Command: `npm test` (tại `backend/`)
Expected: Toàn bộ test suites pass sạch sẽ, không còn cảnh báo unhandled worker process leak.

- [ ] **Step 3: Commit PR #5.1**
```bash
git add backend/test/ backend/package.json
git commit -m "test(cleanup): ensure proper teardown in jest suites to eliminate worker leaks"
```

---

### Task 8 (PR #5.2): Tối ưu Code-splitting & Bundle Size trên Frontend

**Files:**
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Cấu hình `manualChunks` trong `vite.config.ts`**
Thêm cấu hình `build.rollupOptions.output.manualChunks`:
```typescript
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-utils': ['axios', 'dayjs', 'lucide-react'],
        },
      },
    },
  },
```

- [ ] **Step 2: Chạy build để kiểm tra kích thước bundle**
Command: `npm run build` (tại `frontend/`)
Expected: File `index.js` chính giảm từ ~2.9MB xuống < 600kB, phân tách thành các chunks vendor sạch sẽ.

- [ ] **Step 3: Commit PR #5.2**
```bash
git add frontend/vite.config.ts
git commit -m "perf(frontend): configure manualChunks for code-splitting and reduce bundle size"
```

---

### Task 9: Chạy toàn diện 8 Regression Tests & Build Verification

**Files:**
- Test all: `backend/test/*.spec.ts`
- Build all: `backend`, `frontend`

- [ ] **Step 1: Chạy kiểm thử toàn diện backend**
Command: `npm test` (tại `backend/`)
Expected: Ít nhất 13 test suites (hơn 40 tests) PASS 100%.

- [ ] **Step 2: Chạy build backend**
Command: `npm run build` (tại `backend/`)
Expected: Build thành công (Zero errors).

- [ ] **Step 3: Chạy build frontend**
Command: `npm run build` (tại `frontend/`)
Expected: Build thành công (Zero errors).

- [ ] **Step 4: Kiểm tra trạng thái Git & Commit tổng hợp (nếu có)**
Command: `git status`
Expected: Working tree clean.



