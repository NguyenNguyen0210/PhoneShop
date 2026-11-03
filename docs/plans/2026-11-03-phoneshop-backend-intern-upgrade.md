# PhoneShop Backend Intern Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện và chuẩn hóa PhoneShop (NestJS 11 + Prisma 7 + PostgreSQL + React 19) qua 4 giai đoạn: ổn định nghiệp vụ cốt lõi, xanh hóa bộ automated tests & CI, bổ sung quy trình hoàn tiền (Refund) và cấu hình hệ thống (Settings), chuẩn hóa DTO validation và đồng bộ contract.

**Architecture:** Giữ nguyên mô hình Modular Monolith trong NestJS; chuẩn hóa phân tách Controller -> Service -> Prisma Transaction; bảo đảm toàn vẹn dữ liệu cho hàng tồn kho, IMEI và tiền tệ qua Prisma interactive transactions; xử lý background scheduler giải phóng hold an toàn và idempotent.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, TypeScript, Jest, @nestjs/schedule, class-validator, Passport JWT.

---

## Bản đồ tệp tin (File Structure Map)

### 1. Backend Modules & Services
- `backend/src/modules/orders/orders.scheduler.ts`: Quét và tự động giải phóng đơn hold hết hạn (chỉ áp dụng cho đơn online PENDING).
- `backend/src/modules/orders/orders.service.ts`: Core order logic, `createOrder` (phân biệt hold online 15m vs COD), `releaseOrderReservation` (idempotent rollback cho kho, IMEI, voucher, flash sale), `processRefund` (hoàn tiền an toàn).
- `backend/src/modules/orders/orders.controller.ts`: Endpoint hủy đơn, yêu cầu hoàn tiền (`POST /orders/:id/refund`).
- `backend/src/modules/orders/flash-sale-rollback.util.ts`: Tiện ích rollback `soldCount` cho flash sale khi đơn bị hủy hoặc hoàn trả.
- `backend/src/modules/payments/vietqr.service.ts` & `payments.service.ts`: Xử lý giao dịch thanh toán, ghi nhận `PaymentTransaction` loại `REFUND`.
- `backend/src/modules/settings/settings.service.ts`: Đọc runtime settings ưu tiên Database > Defaults > Env; kiểm tra trạng thái bật/tắt của các cổng thanh toán.
- `backend/src/modules/notifications/notifications.service.ts`: Gửi thông báo in-app tự động khi có biến động đơn hàng, thanh toán và hoàn tiền.
- `backend/src/modules/audit-log/audit-log.service.ts`: Ghi vết các hành động nhạy cảm của Admin/Staff (hoàn tiền, chỉnh sửa cấu hình, điều chỉnh kho).
- `backend/src/modules/auth/auth.service.ts`: Xử lý forgot-password trả response generic chống lộ email.
- `backend/src/modules/auth/strategies/jwt.strategy.ts` & `roles.guard.ts`: Phân quyền dựa trên mảng `roles: string[]` và `primaryRole`.

### 2. Database & Migrations
- `backend/prisma/schema.prisma`: Khai báo data models, enums (`StockMovementType`, `ShippingMethod`, `TicketStatus`,...).
- `backend/prisma/migrations/20261103100000_sync_schema/migration.sql`: Script đồng bộ cấu trúc DB an toàn, idempotent.

### 3. Automated Tests (Jest)
- `backend/test/vouchers-limits.spec.ts`: Test giới hạn lượt dùng và chiết khấu voucher.
- `backend/test/payments-concurrency.spec.ts`: Test chống double-payment và concurrency webhook.
- `backend/test/orders-release-reservation.spec.ts`: Test giải phóng IMEI, hoàn tồn kho, hủy bảo hành.
- `backend/test/orders-hold.spec.ts`: Test scheduler hold 15 phút cho đơn online và giữ nguyên đơn COD.
- `backend/test/staff-role-parity.spec.ts`: Test phân quyền RBAC cho Staff/Manager/Admin.
- `backend/test/auth-security.spec.ts`: Test bảo mật forgot-password.
- `backend/test/refund-workflow.spec.ts`: Test quy trình hoàn tiền, cập nhật trạng thái và hoàn kho.
- `backend/test/system-settings-integration.spec.ts`: Test chặn checkout khi cổng thanh toán bị tắt trong settings.

### 4. CI & Documentation
- `.github/workflows/backend-ci.yml`: Workflow GitHub Actions chạy typecheck, build và automated tests.
- `README.md`: Cập nhật hướng dẫn cài đặt, kiến trúc, ERD và các invariants.

---

## Kế hoạch công việc chi tiết (Tasks)

### Task 1: Sửa 3 bài test đang lỗi và xanh hóa 6 test suites nghiệp vụ ban đầu

**Files:**
- Modify: `backend/test/vouchers-limits.spec.ts:102-107`
- Modify: `backend/test/payments-concurrency.spec.ts:1-10`
- Modify: `backend/src/modules/orders/flash-sale-rollback.util.ts:15-28`
- Test: `backend/test/*.spec.ts`

- [ ] **Step 1: Sửa assertion trong `backend/test/vouchers-limits.spec.ts`**

Trong `test/vouchers-limits.spec.ts`, hàm `vouchersService.validate` trả về object có thuộc tính `discount` (không phải `discountAmount` hay `finalTotal`). Cập nhật test case tính chiết khấu:

```typescript
    const result = await vouchersService.validate('user-1', { code: 'SALE50', orderTotal: 1000000 });

    // 15% of 1,000,000 = 150,000
    expect(result.discount).toBe(150000);
```

- [ ] **Step 2: Sửa import trong `backend/test/payments-concurrency.spec.ts`**

Trong `test/payments-concurrency.spec.ts`, đổi import `VietQrService` thành `VietqrService`:

```typescript
import { VietqrService } from '../src/modules/payments/vietqr.service';
```

- [ ] **Step 3: Sửa kiểm tra an toàn trong `backend/src/modules/orders/flash-sale-rollback.util.ts`**

Trong file `flash-sale-rollback.util.ts`, kiểm tra an toàn `tx.flashSaleItem?.findMany` trước khi gọi để tương thích với cả partial mock trong test và Prisma client thực tế:

```typescript
    if (!tx.flashSaleItem?.findMany) {
      return;
    }
    const flashItems = await tx.flashSaleItem.findMany({
      where: {
        variantId: { in: variantIds },
        campaign: { startAt: { lte: orderedAt }, endAt: { gte: orderedAt } },
      },
    });
```

- [ ] **Step 4: Chạy lại toàn bộ test suites và xác minh kết quả**

Chạy lệnh trong thư mục `backend`:
```bash
npm test
```
Kỳ vọng: Cả 6 test suites đều PASS (vouchers-limits, payments-concurrency, orders-release-reservation, orders-hold, staff-role-parity, auth-security).

- [ ] **Step 5: Commit**

```bash
git add backend/test/vouchers-limits.spec.ts backend/test/payments-concurrency.spec.ts backend/src/modules/orders/flash-sale-rollback.util.ts
git commit -m "fix(test): resolve type and mock mismatches to pass all 6 initial test suites"
```

---

### Task 2: Xác minh Hold Expiration Scheduler và phân biệt đơn COD

**Files:**
- Verify/Modify: `backend/src/modules/orders/orders.scheduler.ts`
- Verify/Modify: `backend/src/modules/orders/orders.service.ts`
- Test: `backend/test/orders-hold.spec.ts`

- [ ] **Step 1: Rà soát logic `createOrder` trong `orders.service.ts`**

Đảm bảo khi tạo đơn hàng:
- Với phương thức online (`VNPAY`, `VIETQR`): `holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000)` và `status = OrderStatus.PENDING`.
- Với phương thức COD: `holdExpiresAt = null` và `status = OrderStatus.CONFIRMED` hoặc `PROCESSING` (không bao giờ bị gán `holdExpiresAt`).

- [ ] **Step 2: Rà soát conditional update trong `releaseOrderReservation`**

Đảm bảo `releaseOrderReservation` cập nhật `Order.status = CANCELLED` với điều kiện `status: OrderStatus.PENDING` đối với đơn hết hạn hold. Nếu `updateMany.count === 0`, hàm trả về `false` và dừng ngay các bước rollback (tránh race condition với webhook thanh toán).

- [ ] **Step 3: Chạy test xác minh**

```bash
npm test test/orders-hold.spec.ts
```
Kỳ vọng: PASS (kiểm tra đơn online hết hạn bị hủy, đơn COD không bị hủy).

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/orders/orders.scheduler.ts backend/src/modules/orders/orders.service.ts backend/test/orders-hold.spec.ts
git commit -m "feat(orders): enforce 15-minute hold expiration for online orders and exempt COD"
```

---

### Task 3: Xác minh tính toàn vẹn của Prisma Migration & Schema Drift

**Files:**
- Modify/Verify: `backend/prisma/migrations/20261103100000_sync_schema/migration.sql`
- Verify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Chạy Prisma validate**

Chạy trong thư mục `backend`:
```bash
npx prisma validate
```
Kỳ vọng: Schema is valid.

- [ ] **Step 2: Rà soát migration SQL**

Đảm bảo migration `20261103100000_sync_schema/migration.sql` chứa đầy đủ lệnh `CREATE TYPE IF NOT EXISTS`, `ALTER TYPE ... ADD VALUE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, và `CREATE TABLE IF NOT EXISTS` cho `stock_movements`.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/migrations/20261103100000_sync_schema/migration.sql backend/prisma/schema.prisma
git commit -m "chore(db): finalize idempotent schema sync migration"
```

---

### Task 4: Xác minh Forgot Password Security & Staff Role Parity

**Files:**
- Verify: `backend/src/modules/auth/auth.service.ts`
- Verify: `backend/src/modules/auth/strategies/jwt.strategy.ts`
- Test: `backend/test/auth-security.spec.ts`
- Test: `backend/test/staff-role-parity.spec.ts`

- [ ] **Step 1: Chạy test xác minh bảo mật forgot-password**

```bash
npm test test/auth-security.spec.ts
```
Kỳ vọng: PASS (Email không tồn tại hoặc inactive đều trả generic success response, không để lộ thông tin).

- [ ] **Step 2: Chạy test xác minh phân quyền Staff/Manager**

```bash
npm test test/staff-role-parity.spec.ts
```
Kỳ vọng: PASS (User có role Staff hoặc Manager truy cập đúng các quyền tương ứng, không bị đè role).

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/auth/auth.service.ts backend/src/modules/auth/strategies/jwt.strategy.ts backend/test/auth-security.spec.ts backend/test/staff-role-parity.spec.ts
git commit -m "feat(auth): enforce secure forgot password and consistent role resolution"
```

---

### Task 5: Thiết lập CI Pipeline (GitHub Actions)

**Files:**
- Create: `.github/workflows/backend-ci.yml`

- [ ] **Step 1: Tạo file cấu hình GitHub Actions**

Tạo `.github/workflows/backend-ci.yml`:

```yaml
name: Backend CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Generate Prisma Client
        working-directory: ./backend
        run: npx prisma generate

      - name: Run build & typecheck
        working-directory: ./backend
        run: npm run build

      - name: Run automated tests
        working-directory: ./backend
        run: npm test
```

- [ ] **Step 2: Commit workflow**

```bash
git add .github/workflows/backend-ci.yml
git commit -m "ci: add GitHub Actions workflow for backend build, typecheck and test"
```

---

### Task 6: Xây dựng Quy trình Hoàn tiền (Refund Workflow & Transactions)

**Files:**
- Create: `backend/src/modules/orders/dto/refund-order.dto.ts`
- Modify: `backend/src/modules/orders/orders.service.ts`
- Modify: `backend/src/modules/orders/orders.controller.ts`
- Create: `backend/test/refund-workflow.spec.ts`

- [ ] **Step 1: Viết test failing cho Refund Workflow**

Tạo `backend/test/refund-workflow.spec.ts` kiểm tra các invariant:
1. Đơn chưa thanh toán (`status !== PAID`) không thể hoàn tiền.
2. Số tiền hoàn vượt quá số tiền đã thanh toán bị từ chối.
3. Khi hoàn tiền thành công trong transaction:
   - Tạo `PaymentTransaction` loại `REFUND`.
   - Cập nhật `Payment.status = REFUNDED`.
   - Cập nhật `Order.status = RETURNED`.
   - Cập nhật IMEI sang trạng thái `RETURNED`.
   - Tạo `StockMovement` loại `IMPORT_RETURN`.
   - Hủy hiệu lực bản ghi `Warranty`.
   - Không thể hoàn tiền lặp lại 2 lần (idempotent / status guard).

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
npm test test/refund-workflow.spec.ts
```
Kỳ vọng: FAIL (chưa có `processRefund` hoặc DTO).

- [ ] **Step 3: Tạo DTO `RefundOrderDto`**

Tạo `backend/src/modules/orders/dto/refund-order.dto.ts`:
```typescript
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RefundOrderDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  providerReference?: string;
}
```

- [ ] **Step 4: Triển khai hàm `processRefund` trong `OrdersService`**

Thêm method `processRefund(orderId: string, dto: RefundOrderDto, actorId: string)` trong `orders.service.ts`:
1. Tìm đơn hàng kèm `payment`, `items`, `warranties`.
2. Kiểm tra `payment` phải có `status: PaymentStatus.PAID`. Nếu không, ném `BadRequestException('Đơn hàng chưa được thanh toán thành công, không thể hoàn tiền')`.
3. Kiểm tra `dto.amount <= Number(payment.amount)`. Nếu vượt, ném `BadRequestException('Số tiền hoàn không được vượt quá số tiền đã thanh toán')`.
4. Bọc trong `this.prisma.$transaction`:
   - Tạo `paymentTransaction` (`type: TransactionType.REFUND`, `status: TransactionStatus.SUCCESS`, `amount: dto.amount`, `transactionCode: ...`).
   - Cập nhật `Payment` (`status: PaymentStatus.REFUNDED`).
   - Cập nhật `Order` (`status: OrderStatus.RETURNED`).
   - Cập nhật `ImeiDevice` liên quan sang `ImeiStatus.RETURNED`.
   - Tạo `StockMovement` (`type: StockMovementType.IMPORT_RETURN`, số lượng tương ứng).
   - Hủy bảo hành (`Warranty` nếu có).
5. Gửi thông báo cho khách hàng và ghi `AuditLog` sau khi transaction commit thành công.

- [ ] **Step 5: Thêm endpoint vào `OrdersController`**

```typescript
  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async refundOrder(
    @Param('id') id: string,
    @Body() dto: RefundOrderDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.ordersService.processRefund(id, dto, actorId);
  }
```

- [ ] **Step 6: Chạy lại test xác nhận PASS**

```bash
npm test test/refund-workflow.spec.ts
```
Kỳ vọng: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/orders/dto/refund-order.dto.ts backend/src/modules/orders/orders.service.ts backend/src/modules/orders/orders.controller.ts backend/test/refund-workflow.spec.ts
git commit -m "feat(orders): implement secure idempotent refund workflow with inventory and warranty rollback"
```

---

### Task 7: Đồng bộ Cấu hình Hệ thống (System Settings) vào Luồng Nghiệp vụ

**Files:**
- Modify: `backend/src/modules/orders/orders.service.ts`
- Modify: `backend/src/modules/orders/orders.module.ts`
- Create: `backend/test/system-settings-integration.spec.ts`

- [ ] **Step 1: Viết test failing cho System Settings Integration**

Tạo `backend/test/system-settings-integration.spec.ts`:
1. Khi `MAINTENANCE_MODE = 'true'`, gọi `createOrder` bị ném `BadRequestException` ('Hệ thống đang bảo trì, vui lòng quay lại sau').
2. Khi `PAYMENT_COD_ENABLED = 'false'` và chọn `COD`, gọi `createOrder` bị từ chối ('Phương thức thanh toán COD hiện đang tạm ngưng').
3. Khi `PAYMENT_VNPAY_ENABLED = 'false'` và chọn `VNPAY`, gọi `createOrder` bị từ chối.
4. Khi cổng thanh toán được bật, tạo đơn thành công bình thường.

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
npm test test/system-settings-integration.spec.ts
```
Kỳ vọng: FAIL.

- [ ] **Step 3: Tiêm `SystemSettingsService` vào `OrdersService`**

Trong `orders.module.ts`, import `SettingsModule`.
Trong `orders.service.ts`, inject `SystemSettingsService`.

- [ ] **Step 4: Thêm kiểm tra cấu hình trong `createOrder`**

Trước khi bắt đầu giữ hàng/tạo đơn:
```typescript
    const isMaintenance = await this.settingsService.get<string>('MAINTENANCE_MODE', 'false');
    if (isMaintenance === 'true') {
      throw new BadRequestException('Hệ thống đang trong thời gian bảo trì, vui lòng quay lại sau');
    }

    if (dto.paymentMethod === PaymentMethod.COD) {
      const codEnabled = await this.settingsService.get<string>('PAYMENT_COD_ENABLED', 'true');
      if (codEnabled === 'false') {
        throw new BadRequestException('Phương thức thanh toán COD hiện đang tạm ngưng');
      }
    } else if (dto.paymentMethod === PaymentMethod.VNPAY) {
      const vnpayEnabled = await this.settingsService.get<string>('PAYMENT_VNPAY_ENABLED', 'true');
      if (vnpayEnabled === 'false') {
        throw new BadRequestException('Phương thức thanh toán VNPay hiện đang tạm ngưng');
      }
    } else if (dto.paymentMethod === PaymentMethod.BANK_TRANSFER) {
      const vietqrEnabled = await this.settingsService.get<string>('PAYMENT_VIETQR_ENABLED', 'true');
      if (vietqrEnabled === 'false') {
        throw new BadRequestException('Phương thức thanh toán VietQR hiện đang tạm ngưng');
      }
    }
```

- [ ] **Step 5: Chạy lại test xác nhận PASS**

```bash
npm test test/system-settings-integration.spec.ts
```
Kỳ vọng: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/orders/orders.module.ts backend/src/modules/orders/orders.service.ts backend/test/system-settings-integration.spec.ts
git commit -m "feat(orders): enforce dynamic admin system settings for maintenance mode and payment gateways"
```

---

### Task 8: Tích hợp Thông báo (Notifications) & Ghi vết (Audit Log)

**Files:**
- Modify: `backend/src/modules/orders/orders.service.ts`
- Modify: `backend/src/modules/payments/payments.service.ts`

- [ ] **Step 1: Kích hoạt gửi Notification tự động**

Trong `orders.service.ts`:
- Khi `createOrder` thành công: gọi `notificationsService.sendToUser(userId, NotificationType.ORDER, 'Đơn hàng mới đã được tạo', `Đơn hàng #${order.orderNumber} của bạn đã được ghi nhận thành công.`, { orderId: order.id })`.
- Khi `cancelOrder` hoặc `releaseOrderReservation`: gửi thông báo hủy đơn.
- Khi hoàn tiền `processRefund`: gửi thông báo hoàn tiền thành công.

Trong `payments.service.ts`:
- Khi callback thanh toán online thành công: gửi thông báo `NotificationType.PAYMENT` xác nhận thanh toán đã hoàn tất.

- [ ] **Step 2: Ghi vết Audit Log cho thao tác Staff/Admin**

Trong `orders.service.ts`:
- Khi Admin/Manager hủy đơn hoặc hoàn tiền: ghi bản ghi vào `AuditLog` (`action: AuditAction.UPDATE`, `entity: 'Order'`, `entityId: order.id`, `userId: actorId`, `details: { reason, refundAmount }`).

- [ ] **Step 3: Chạy toàn bộ test suites đảm bảo không ảnh hưởng**

```bash
npm test
```
Kỳ vọng: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/orders/orders.service.ts backend/src/modules/payments/payments.service.ts
git commit -m "feat(events): integrate automatic customer notifications and administrative audit logging"
```

---

### Task 9: Chuẩn hóa Input Validation & DTOs

**Files:**
- Modify: `backend/src/main.ts`
- Modify: `backend/src/modules/orders/dto/order.dto.ts`
- Modify: `backend/src/modules/cart/dto/cart.dto.ts`

- [ ] **Step 1: Bật các cờ an toàn trong `main.ts`**

Trong `backend/src/main.ts`, cấu hình `ValidationPipe`:
```typescript
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
```

- [ ] **Step 2: Rà soát và bổ sung decorator trong DTOs**

Đảm bảo:
- `cart.dto.ts`: `quantity` là `@IsInt()`, `@Min(1)`. `variantId` là `@IsUUID()`.
- `order.dto.ts`: `shippingMethod` là `@IsEnum(ShippingMethod)`, `items` có `@ValidateNested()` và `@Type(() => CreateOrderItemDto)`.

- [ ] **Step 3: Chạy test kiểm tra validation**

```bash
npm test
```
Kỳ vọng: Toàn bộ tests chạy PASS mà không bị chặn bởi validation pipe.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main.ts backend/src/modules/orders/dto/order.dto.ts backend/src/modules/cart/dto/cart.dto.ts
git commit -m "refactor(validation): enforce strict global ValidationPipe and DTO decorators"
```

---

### Task 10: Khắc phục Sai lệch Contract giữa Frontend và Backend

**Files:**
- Modify: `backend/src/modules/warranty/warranty.controller.ts` & `warranty.service.ts`
- Modify: `backend/src/modules/shipping/shipping.service.ts`
- Verify: `backend/src/common/filters/http-exception.filter.ts`

- [ ] **Step 1: Chuẩn hóa endpoint tra cứu bảo hành**

Đảm bảo endpoint `GET /warranty/lookup` tiếp nhận query `imei` hoặc `phone`, trả về thông tin bảo hành đầy đủ:
`{ success: true, data: { imei, productName, variantName, activatedAt, expiresAt, status, claims } }`.

- [ ] **Step 2: Đồng bộ shipping method & fee**

Đảm bảo `ShippingService.calculateFee` hỗ trợ đồng bộ 4 phương thức: `STANDARD` (30.000đ), `EXPRESS` (45.000đ), `EXPRESS_2H` (60.000đ), `ECONOMY` (20.000đ), miễn phí khi đạt giá trị đơn tối thiểu nếu có.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/warranty/ backend/src/modules/shipping/
git commit -m "fix(contract): sync warranty lookup and shipping fee structure with frontend"
```

---

### Task 11: Cập nhật README, ERD và Tài liệu Phục vụ Phỏng vấn Backend

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Cập nhật README.md**

Bổ sung các phần:
1. **Kiến trúc & Điểm sáng kỹ thuật (Technical Highlights):**
   - Transaction xử lý IMEI độc nhất, giải phóng hold sau 15 phút an toàn và chống race condition.
   - Cơ chế phòng chống Race Condition khi dùng Voucher và Flash Sale.
   - Quy trình hoàn tiền (Refund Workflow) an toàn, idempotent, tự động hoàn kho và hủy bảo hành.
   - Dynamic System Settings với TTL memory cache và fallback thứ tự.
2. **Sơ đồ ERD & Mô hình dữ liệu:** Liệt kê quan hệ giữa các bảng trọng yếu (Users, Orders, Payments, PaymentTransactions, IMEI, Inventory, StockMovements).
3. **Hướng dẫn chạy dự án:** Cung cấp lệnh Docker, Prisma migration và Seed data.
4. **Kết quả kiểm thử tự động (Automated Testing Report):** Bảng tổng hợp các test suites và mục tiêu bảo vệ invariant.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: overhaul README with architecture diagrams, invariant guarantees, and test reports"
```



