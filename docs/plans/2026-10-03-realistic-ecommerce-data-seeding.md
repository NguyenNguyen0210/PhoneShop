# Realistic E-Commerce Data Seeding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `backend/prisma/seed.ts` into a comprehensive, realistic production-grade e-commerce data seeder that populates 40 Vietnamese customers, 200 lifecycle orders across 6 months, electronic warranties, installment loans, shippings, and verified reviews with shop replies while preserving the existing product catalog.

**Architecture:** Monolithic script in `backend/prisma/seed.ts` invoked via standard `npx prisma db seed`. The seeder computes a single `Password@123` bcrypt hash for speed, runs a 25-table cascade-safe cleanup, preserves catalog data, dynamically provisions inventory and Luhn IMEIs to match historical order items plus warehouse stock, and builds complete interconnected relational chains.

**Tech Stack:** TypeScript, Node.js, Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-pg`), PostgreSQL, bcrypt.

---

## File Structure

- **Modify:** `backend/prisma/seed.ts` — The monolithic seeder containing data pools, cleanup logic, catalog upserts, customer creation, order lifecycles, payments, installments, warranties, reviews, and carts.
- **Create:** `backend/test/seed_verification.ts` — A verification script that runs after seeding to validate record counts, relation integrity, Luhn checksums, and credential validity.

---

## Tasks Outline

1. **Task 1: Establish Verification Script & Data Pools Skeleton**
   - Create `backend/test/seed_verification.ts` to assert target counts and relational constraints.
   - Setup realistic Vietnamese data pools (names, addresses, review texts, feedback).

2. **Task 2: Implement Safe Cascade Cleanup & Core Admin/Staff Setup**
   - Implement the safe deletion sequence for all 25 child-to-parent tables.
   - Precompute `Password@123` hash and upsert core Admin and Staff accounts.

---

### Task 1: Establish Verification Script & Data Pools Skeleton

**Files:**
- Create: `backend/test/seed_verification.ts`
- Modify: `backend/prisma/seed.ts:1-70`

- [ ] **Step 1: Create verification script**

Create `backend/test/seed_verification.ts` to check minimum counts, relations, and password hashing after seeding.

```typescript
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { validateImei } from '../src/common/utils/imei.util';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not set');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function verify() {
  console.log('🔍 Running Seed Data Integrity Checks...\n');

  const [
    userCount,
    addressCount,
    orderCount,
    orderItemCount,
    imeiCount,
    warrantyCount,
    reviewCount,
    reviewReplyCount,
    installmentCount,
    shippingCount,
    paymentCount,
    voucherCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.address.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.imeiDevice.count(),
    prisma.warranty.count(),
    prisma.review.count(),
    prisma.reviewReply.count(),
    prisma.installmentApplication.count(),
    prisma.shipping.count(),
    prisma.payment.count(),
    prisma.voucher.count(),
  ]);

  console.log(`📊 Statistics:
  - Users: ${userCount} (Target: >= 40)
  - Addresses: ${addressCount} (Target: >= 40)
  - Orders: ${orderCount} (Target: >= 180)
  - Order Items: ${orderItemCount} (Target: >= 200)
  - IMEIs: ${imeiCount} (Target: >= 300)
  - Warranties: ${warrantyCount} (Target: >= 100)
  - Reviews: ${reviewCount} (Target: >= 100)
  - Review Replies: ${reviewReplyCount} (Target: >= 40)
  - Installment Apps: ${installmentCount} (Target: >= 15)
  - Shippings: ${shippingCount} (Target: >= 150)
  - Payments: ${paymentCount} (Target: >= 180)
  - Vouchers: ${voucherCount} (Target: >= 5)
  `);

  if (userCount < 40) throw new Error(`User count too low: ${userCount}`);
  if (orderCount < 180) throw new Error(`Order count too low: ${orderCount}`);
  if (warrantyCount < 100) throw new Error(`Warranty count too low: ${warrantyCount}`);
  if (reviewCount < 100) throw new Error(`Review count too low: ${reviewCount}`);
  if (installmentCount < 15) throw new Error(`Installment count too low: ${installmentCount}`);

  // Test password verification for sample customer and admin
  const sampleUser = await prisma.user.findFirst({
    where: { email: { not: 'admin@mobilecommerce.vn' } },
  });
  if (!sampleUser) throw new Error('No customer user found');
  const validPass = await bcrypt.compare('Password@123', sampleUser.passwordHash);
  if (!validPass) throw new Error('Password@123 failed verification on seeded user');

  // Verify IMEIs are valid Luhn
  const sampleImeis = await prisma.imeiDevice.findMany({ take: 20 });
  for (const item of sampleImeis) {
    if (!validateImei(item.imei)) {
      throw new Error(`Invalid Luhn IMEI found in DB: ${item.imei}`);
    }
  }

  // Verify Warranty linkage
  const sampleWarranty = await prisma.warranty.findFirst({
    include: { user: true, productVariant: true, imeiDevice: true },
  });
  if (!sampleWarranty || !sampleWarranty.imeiDevice) {
    throw new Error('Warranty missing IMEI link');
  }

  console.log('✅ ALL SEED INTEGRITY CHECKS PASSED!');
  process.exit(0);
}

verify().catch((e) => {
  console.error('❌ Verification failed:', e);
  process.exit(1);
});
```

- [ ] **Step 2: Run verification script before seeding to observe current baseline**

Run: `cd backend && npx tsx test/seed_verification.ts`
Expected: FAIL with "User count too low" or "Order count too low" (baseline failure).

- [ ] **Step 3: Commit verification test**

```bash
git add backend/test/seed_verification.ts
git commit -m "test: add seed data integrity verification script"
```

---

### Task 2: Implement Safe Cascade Cleanup & Core Admin/Staff Setup

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Define safe cascade cleanup and precalculated password hash in `backend/prisma/seed.ts`**

Write the cleanup function executing queries in reverse foreign key order:

```typescript
async function cleanTransactionsAndCustomers() {
  console.log('🧹 Cleaning previous transaction and demo customer data...');
  // 1. Audit logs
  await prisma.auditLog.deleteMany({});
  // 2. Idempotency records
  await prisma.idempotencyRecord.deleteMany({});
  // 3. Notifications
  await prisma.notification.deleteMany({});
  // 4. Warranties
  await prisma.warranty.deleteMany({});
  // 5. Refunds & Returns
  await prisma.refund.deleteMany({});
  await prisma.returnItem.deleteMany({});
  await prisma.return.deleteMany({});
  // 6. Reviews & Replies
  await prisma.reviewReply.deleteMany({});
  await prisma.review.deleteMany({});
  // 7. Voucher usages
  await prisma.voucherUsage.deleteMany({});
  // 8. Wishlist
  await prisma.wishlistItem.deleteMany({});
  await prisma.wishlist.deleteMany({});
  // 9. Carts
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  // 10. Installments
  await prisma.installmentApplication.deleteMany({});
  // 11. Payments & Transactions
  await prisma.paymentTransaction.deleteMany({});
  await prisma.payment.deleteMany({});
  // 12. Shippings
  await prisma.shipping.deleteMany({});
  // 13. Order items & Orders
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  // 14. IMEIs
  await prisma.imeiDevice.deleteMany({});
  // 15. Customer Addresses
  await prisma.address.deleteMany({});
  // 16. Refresh tokens
  await prisma.refreshToken.deleteMany({});
  // 17. User roles for non-core users
  const coreEmails = ['admin@mobilecommerce.vn', 'staff@mobilecommerce.vn'];
  const nonCoreUsers = await prisma.user.findMany({
    where: { email: { notIn: coreEmails } },
    select: { id: true },
  });
  const nonCoreUserIds = nonCoreUsers.map((u) => u.id);
  if (nonCoreUserIds.length > 0) {
    await prisma.userRole.deleteMany({
      where: { userId: { in: nonCoreUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: nonCoreUserIds } },
    });
  }
  console.log('✅ Cleanup completed cleanly without FK violations.');
}
```

- [ ] **Step 2: Setup Roles and Core Accounts with `Password@123`**

Precalculate `const COMMON_PASSWORD_HASH = await bcrypt.hash('Password@123', 10);` and upsert `admin@mobilecommerce.vn` and `staff@mobilecommerce.vn`.

- [ ] **Step 3: Run quick test on cleanup**

Run: `cd backend && npx tsx -e "import('./prisma/seed.ts')"`
Verify that console logs output the cleanup completion and core user upserts without SQL error.

- [ ] **Step 4: Commit Task 2 changes**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): add cascade safe cleanup and core account upserts"
```

3. **Task 3: Implement 40 Customer Accounts & Multi-Province Addresses**
   - Seed 40 unique customers with realistic Vietnamese names, emails, and phone numbers.
   - Seed primary `HOME` and secondary `WORK` addresses across HCM, Hanoi, Da Nang, Can Tho, Hai Phong, Binh Duong.

4. **Task 4: Implement Dynamic Inventory & Luhn IMEI Allocator**
   - Preserve existing Brands, Categories, Products, and Variants.
   - Dynamically calculate required variant inventory based on future order volumes + 20 available units per SKU.
   - Generate valid Luhn 15-digit IMEIs with sequential serial numbers.

---

### Task 3: Implement 40 Customer Accounts & Multi-Province Addresses

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Define Vietnamese Customer and Address Pools in `seed.ts`**

Define 40 realistic customers and diverse Vietnamese address records:

```typescript
const VIETNAMESE_CUSTOMERS = [
  { firstName: 'Văn An', lastName: 'Nguyễn', email: 'an.nguyen92@gmail.com', phone: '0901234501' },
  { firstName: 'Thị Mai', lastName: 'Trần', email: 'mai.tran88@gmail.com', phone: '0901234502' },
  { firstName: 'Quốc Bảo', lastName: 'Lê', email: 'bao.le95@gmail.com', phone: '0901234503' },
  { firstName: 'Thị Lan', lastName: 'Phạm', email: 'lan.pham90@gmail.com', phone: '0901234504' },
  { firstName: 'Minh Đức', lastName: 'Hoàng', email: 'duc.hoang94@gmail.com', phone: '0901234505' },
  { firstName: 'Ngọc Hân', lastName: 'Vũ', email: 'han.vu98@gmail.com', phone: '0901234506' },
  { firstName: 'Thành Long', lastName: 'Đặng', email: 'long.dang91@gmail.com', phone: '0901234507' },
  { firstName: 'Thu Trang', lastName: 'Bùi', email: 'trang.bui96@gmail.com', phone: '0901234508' },
  { firstName: 'Hữu Phước', lastName: 'Đỗ', email: 'phuoc.do93@gmail.com', phone: '0901234509' },
  { firstName: 'Khánh Linh', lastName: 'Hồ', email: 'linh.ho97@gmail.com', phone: '0901234510' },
  { firstName: 'Tuấn Kiệt', lastName: 'Ngô', email: 'kiet.ngo89@gmail.com', phone: '0901234511' },
  { firstName: 'Thanh Trúc', lastName: 'Dương', email: 'truc.duong99@gmail.com', phone: '0901234512' },
  { firstName: 'Minh Quân', lastName: 'Lý', email: 'quan.ly94@gmail.com', phone: '0901234513' },
  { firstName: 'Diễm My', lastName: 'Đinh', email: 'my.dinh95@gmail.com', phone: '0901234514' },
  { firstName: 'Gia Huy', lastName: 'Đoàn', email: 'huy.doan96@gmail.com', phone: '0901234515' },
  { firstName: 'Ánh Tuyết', lastName: 'Lâm', email: 'tuyet.lam91@gmail.com', phone: '0901234516' },
  { firstName: 'Đức Trọng', lastName: 'Trịnh', email: 'trong.trinh93@gmail.com', phone: '0901234517' },
  { firstName: 'Hương Giang', lastName: 'Mai', email: 'giang.mai97@gmail.com', phone: '0901234518' },
  { firstName: 'Trọng Hiếu', lastName: 'Phan', email: 'hieu.phan92@gmail.com', phone: '0901234519' },
  { firstName: 'Bảo Ngọc', lastName: 'Võ', email: 'ngoc.vo98@gmail.com', phone: '0901234520' },
  { firstName: 'Thế Vinh', lastName: 'Cao', email: 'vinh.cao90@gmail.com', phone: '0901234521' },
  { firstName: 'Phương Thảo', lastName: 'Lương', email: 'thao.luong94@gmail.com', phone: '0901234522' },
  { firstName: 'Việt Hoàng', lastName: 'Hà', email: 'hoang.ha93@gmail.com', phone: '0901234523' },
  { firstName: 'Tuyết Mai', lastName: 'Tạ', email: 'mai.ta95@gmail.com', phone: '0901234524' },
  { firstName: 'Đình Phong', lastName: 'Thái', email: 'phong.thai96@gmail.com', phone: '0901234525' },
  { firstName: 'Mỹ Duyên', lastName: 'Tô', email: 'duyen.to97@gmail.com', phone: '0901234526' },
  { firstName: 'Quang Khải', lastName: 'Kiều', email: 'khai.kieu91@gmail.com', phone: '0901234527' },
  { firstName: 'Ngọc Bích', lastName: 'Ân', email: 'bich.an94@gmail.com', phone: '0901234528' },
  { firstName: 'Duy Mạnh', lastName: 'Châu', email: 'manh.chau92@gmail.com', phone: '0901234529' },
  { firstName: 'Thảo Nhi', lastName: 'Hứa', email: 'nhi.hua98@gmail.com', phone: '0901234530' },
  { firstName: 'Văn Nam', lastName: 'Nguyễn', email: 'nam.nguyen93@gmail.com', phone: '0901234531' },
  { firstName: 'Kim Oanh', lastName: 'Lê', email: 'oanh.le90@gmail.com', phone: '0901234532' },
  { firstName: 'Hoàng Long', lastName: 'Trần', email: 'long.tran94@gmail.com', phone: '0901234533' },
  { firstName: 'Thu Cúc', lastName: 'Phạm', email: 'cuc.pham95@gmail.com', phone: '0901234534' },
  { firstName: 'Đăng Khoa', lastName: 'Huỳnh', email: 'khoa.huynh96@gmail.com', phone: '0901234535' },
  { firstName: 'Bích Trâm', lastName: 'Dương', email: 'tram.duong97@gmail.com', phone: '0901234536' },
  { firstName: 'Nhật Minh', lastName: 'Võ', email: 'minh.vo92@gmail.com', phone: '0901234537' },
  { firstName: 'Yến Nhi', lastName: 'Bùi', email: 'nhi.bui99@gmail.com', phone: '0901234538' },
  { firstName: 'Hải Đăng', lastName: 'Đỗ', email: 'dang.do91@gmail.com', phone: '0901234539' },
  { firstName: 'Khánh Vy', lastName: 'Nguyễn', email: 'vy.nguyen95@gmail.com', phone: '0901234540' },
];

const VIETNAM_LOCATIONS = [
  { city: 'TP. Hồ Chí Minh', district: 'Quận 1', ward: 'Phường Bến Nghé', street: '123 Lê Lợi' },
  { city: 'TP. Hồ Chí Minh', district: 'Quận 3', ward: 'Phường Võ Thị Sáu', street: '45 Võ Văn Tần' },
  { city: 'TP. Hồ Chí Minh', district: 'Quận Bình Thạnh', ward: 'Phường 25', street: '88 Điện Biên Phủ' },
  { city: 'Hà Nội', district: 'Quận Hoàn Kiếm', ward: 'Phường Tràng Tiền', street: '12 Tràng Tiền' },
  { city: 'Hà Nội', district: 'Quận Cầu Giấy', ward: 'Phường Dịch Vọng', street: '102 Cầu Giấy' },
  { city: 'Hà Nội', district: 'Quận Đống Đa', ward: 'Phường Láng Hạ', street: '56 Láng Hạ' },
  { city: 'Đà Nẵng', district: 'Quận Hải Châu', ward: 'Phường Thạch Thang', street: '24 Bạch Đằng' },
  { city: 'Cần Thơ', district: 'Quận Ninh Kiều', ward: 'Phường An Phú', street: '30 Đại lộ Hòa Bình' },
  { city: 'Hải Phòng', district: 'Quận Lê Chân', ward: 'Phường An Biên', street: '15 Mê Linh' },
  { city: 'Bình Dương', district: 'TP. Thủ Dầu Một', ward: 'Phường Phú Cường', street: '78 Yersin' },
];
```

- [ ] **Step 2: Seed customers and link User role and addresses**

Loop through `VIETNAMESE_CUSTOMERS`, upsert each customer with `COMMON_PASSWORD_HASH`, map user to `USER` role, and insert 1-2 addresses (default `HOME` and optional `WORK`).

- [ ] **Step 3: Commit Task 3 changes**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): add 40 vietnamese customers and multi-city addresses"
```

---

### Task 4: Implement Dynamic Inventory & Luhn IMEI Allocator

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Ensure Product and Variant catalog upserts are executed**

Verify that all 10 Brands, 5 Categories, and Products (Apple, Samsung, Xiaomi, Vivo, Oppo, Realme, Asus, etc.) with their variants are preserved and fetched.

- [ ] **Step 2: Implement dynamic IMEI generation and inventory tracking**

For each variant in the database:
1. Generate an initial batch of 35-50 devices per variant to cover ~200 orders plus >= 20 units ready in stock (`AVAILABLE`).
2. Use `generateLuhnImei(prefix14)` to guarantee valid 15-digit Luhn codes.
3. Compute `Inventory` record: `quantity = total`, `availableQty = total`, `reservedQty = 0`, `reorderLevel = 5`.

```typescript
let imeiSeq = 100000;
// Helper function to create an IMEI device for a variant
async function createImeiForVariant(variantId: string, sku: string, costPrice: any, status: ImeiStatus) {
  imeiSeq++;
  const prefix14 = `35890${String(imeiSeq).padStart(9, '0')}`;
  const imei = generateLuhnImei(prefix14);
  const serialNumber = `SN-${sku}-${String(imeiSeq).slice(-5)}`;
  return prisma.imeiDevice.create({
    data: {
      variantId,
      imei,
      serialNumber,
      status,
      purchasePrice: costPrice,
    },
  });
}
```

- [ ] **Step 3: Commit Task 4 changes**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): add dynamic inventory and luhn imei allocator"
```

5. **Task 5: Implement 200 Lifecycle Orders, Shippings, Payments & Transactions**
   - Distribute 200 orders across a 180-day timeline.
   - Associate order items with real `SOLD` IMEIs for delivered orders.
   - Create realistic `Shipping` (GHN, Viettel Post, GHTK) and `Payment` (COD, VNPAY, MOMO, INSTALLMENT) records.

6. **Task 6: Implement Installment Applications**
   - Generate ~20 installment applications for installment orders with Home Credit and FE Credit.
   - Attach realistic 12-digit citizen IDs, financial terms, and approval statuses.

---

### Task 5: Implement 200 Lifecycle Orders, Shippings, Payments & Transactions

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Define Order timeline distribution and status weights**

Spread 200 orders over 180 days:
- 130 `COMPLETED` orders (older than 7 days, fully delivered, paid, with IMEI attached)
- 20 `DELIVERED` orders (delivered within 1-6 days ago, awaiting final completion or customer review)
- 20 `SHIPPING` orders (in-transit with carrier tracking number)
- 10 `PROCESSING` orders (confirmed, preparing at warehouse)
- 10 `PENDING` orders (just placed in the last 24h)
- 10 `CANCELLED` orders (with realistic reasons like `Khách đổi ý muốn lấy màu khác`, `Đặt nhầm phiên bản dung lượng`)

- [ ] **Step 2: Implement order creation with items, payments, and shippings**

```typescript
// Sample order generator logic inside seed.ts
const nowTime = Date.now();
for (let i = 1; i <= 200; i++) {
  // Determine age in days (0 to 180 days ago)
  const ageDays = Math.floor(Math.random() * 180);
  const createdAt = new Date(nowTime - ageDays * 86400000);
  const orderNumber = `MC-${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i).padStart(4, '0')}`;
  
  // Pick a random customer and their address
  const customer = customers[i % customers.length];
  const address = customerAddresses[customer.id] || defaultAddress;

  // Determine status
  let status: OrderStatus = OrderStatus.COMPLETED;
  if (ageDays <= 2) {
    status = i % 2 === 0 ? OrderStatus.PENDING : OrderStatus.PROCESSING;
  } else if (ageDays <= 6) {
    status = OrderStatus.SHIPPING;
  } else if (ageDays <= 14 && i % 4 === 0) {
    status = OrderStatus.DELIVERED;
  } else if (i % 20 === 0) {
    status = OrderStatus.CANCELLED;
  }

  // 1-2 random items
  const itemVariant = variants[i % variants.length];
  const unitPrice = itemVariant.price;
  const subtotal = unitPrice;
  const shippingFee = 30000;
  const totalAmount = Number(subtotal) + shippingFee;

  // Create order
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: customer.id,
      addressId: address.id,
      status,
      subtotal,
      discountAmount: 0,
      shippingFee,
      taxAmount: 0,
      totalAmount,
      createdAt,
      updatedAt: createdAt,
      confirmedAt: status !== OrderStatus.PENDING && status !== OrderStatus.CANCELLED ? new Date(createdAt.getTime() + 1800000) : null,
      shippedAt: ['SHIPPING', 'DELIVERED', 'COMPLETED'].includes(status) ? new Date(createdAt.getTime() + 86400000) : null,
      deliveredAt: ['DELIVERED', 'COMPLETED'].includes(status) ? new Date(createdAt.getTime() + 172800000) : null,
      completedAt: status === OrderStatus.COMPLETED ? new Date(createdAt.getTime() + 259200000) : null,
      cancelledAt: status === OrderStatus.CANCELLED ? new Date(createdAt.getTime() + 3600000) : null,
      cancelledReason: status === OrderStatus.CANCELLED ? 'Khách đổi ý muốn chọn màu sắc khác' : null,
    },
  });

  // Attach sold IMEI for delivered/completed orders
  let assignedImeiId: string | null = null;
  if (['DELIVERED', 'COMPLETED'].includes(status)) {
    const imei = await createImeiForVariant(itemVariant.id, itemVariant.sku, itemVariant.costPrice, ImeiStatus.SOLD);
    assignedImeiId = imei.id;
  }

  const orderItem = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      variantId: itemVariant.id,
      imeiDeviceId: assignedImeiId,
      productName: itemVariant.name,
      sku: itemVariant.sku,
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
      createdAt,
    },
  });

  // Create Shipping record
  if (status !== OrderStatus.CANCELLED) {
    const carrier = i % 3 === 0 ? 'Giao Hàng Nhanh' : i % 3 === 1 ? 'Viettel Post' : 'Giao Hàng Tiết Kiệm';
    const carrierPrefix = i % 3 === 0 ? 'GHN' : i % 3 === 1 ? 'VTP' : 'GHTK';
    const trackingNumber = `${carrierPrefix}${Math.floor(10000000 + Math.random() * 90000000)}`;
    const shippingStatus = status === OrderStatus.COMPLETED || status === OrderStatus.DELIVERED ? ShippingStatus.DELIVERED : status === OrderStatus.SHIPPING ? ShippingStatus.IN_TRANSIT : ShippingStatus.PENDING;

    await prisma.shipping.create({
      data: {
        orderId: order.id,
        providerName: carrier,
        trackingNumber,
        status: shippingStatus,
        shippingFee,
        createdAt,
      },
    });
  }

  // Create Payment record
  const paymentMethod = (i % 10 === 0) ? PaymentMethod.INSTALLMENT : (i % 4 === 0) ? PaymentMethod.VNPAY : (i % 4 === 1) ? PaymentMethod.MOMO : PaymentMethod.COD;
  const paymentStatus = ['COMPLETED', 'DELIVERED', 'SHIPPING'].includes(status) && paymentMethod !== PaymentMethod.COD ? PaymentStatus.PAID : status === OrderStatus.COMPLETED && paymentMethod === PaymentMethod.COD ? PaymentStatus.PAID : PaymentStatus.PENDING;

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method: paymentMethod,
      status: paymentStatus,
      amount: totalAmount,
      provider: paymentMethod.toString(),
      paidAt: paymentStatus === PaymentStatus.PAID ? createdAt : null,
      createdAt,
    },
  });

  if (paymentStatus === PaymentStatus.PAID) {
    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        transactionCode: `TRANS-${Date.now()}-${i}`,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.SUCCESS,
        amount: totalAmount,
        providerReference: `REF-${Math.floor(100000000 + Math.random() * 900000000)}`,
        createdAt,
      },
    });
  }
}
```

- [ ] **Step 3: Update inventory subtraction for all SOLD IMEIs**

For each variant, adjust `Inventory`:
- `quantity = soldCount + availableCount`
- `availableQty = availableCount`
- `reservedQty = 0`

- [ ] **Step 4: Commit Task 5 changes**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): add 200 orders, shippings, payments and transactions"
```

---

### Task 6: Implement Installment Applications

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Link installment applications to installment orders**

Query the seeded orders with `payment.method === INSTALLMENT` (~20 orders) and generate realistic `InstallmentApplication` records:
- Provider: alternating `HOME_CREDIT` and `FE_CREDIT`.
- Terms: 6, 9, or 12 months. Prepay percent: 20%, 30%, or 50%.
- Citizen ID: 12 digits (e.g. `07920100${String(i).padStart(4, '0')}`).
- Birth date: 20-40 years ago.
- R2 placeholder URLs for CCCD front & back.
- Review status: 80% `APPROVED` (reviewed by staff user), 10% `PENDING`, 10% `REJECTED` (with reason 'Điểm tín dụng CIC không đạt yêu cầu').

```typescript
// Seed installment application logic
const installmentOrders = await prisma.order.findMany({
  where: { payments: { some: { method: PaymentMethod.INSTALLMENT } } },
  include: { user: true },
});

for (let j = 0; j < installmentOrders.length; j++) {
  const o = installmentOrders[j];
  const prepayPercent = j % 3 === 0 ? 20 : j % 3 === 1 ? 30 : 50;
  const total = Number(o.totalAmount);
  const prepayAmount = (total * prepayPercent) / 100;
  const loanAmount = total - prepayAmount;
  const termMonths = j % 2 === 0 ? 6 : 12;
  const monthlyAmount = Math.round(loanAmount / termMonths + loanAmount * 0.015);
  const appStatus = j % 10 === 0 ? InstallmentStatus.REJECTED : j % 5 === 0 ? InstallmentStatus.PENDING : InstallmentStatus.APPROVED;

  await prisma.installmentApplication.create({
    data: {
      orderId: o.id,
      userId: o.userId,
      provider: j % 2 === 0 ? InstallmentProvider.HOME_CREDIT : InstallmentProvider.FE_CREDIT,
      status: appStatus,
      termMonths,
      prepayPercent,
      prepayAmount,
      loanAmount,
      monthlyAmount,
      fullName: `${o.user.lastName} ${o.user.firstName}`,
      citizenId: `07920100${String(j + 1000).slice(-4)}82`,
      birthDate: new Date(1995, j % 12, (j % 28) + 1),
      phoneNumber: o.user.phone ?? '0901234567',
      currentAddress: 'TP. Hồ Chí Minh, Việt Nam',
      incomeRange: '15 - 25 triệu',
      cccdFrontUrl: 'https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev/demo/cccd_front.webp',
      cccdBackUrl: 'https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev/demo/cccd_back.webp',
      reviewedBy: appStatus !== InstallmentStatus.PENDING ? staffUser.id : null,
      reviewedAt: appStatus !== InstallmentStatus.PENDING ? o.createdAt : null,
      staffNotes: appStatus === InstallmentStatus.APPROVED ? 'Hồ sơ tín dụng tốt, duyệt giải ngân.' : appStatus === InstallmentStatus.REJECTED ? 'Điểm tín dụng CIC không đạt tiêu chuẩn.' : null,
      rejectionReason: appStatus === InstallmentStatus.REJECTED ? 'Điểm tín dụng CIC không đạt yêu cầu xét duyệt' : null,
    },
  });
}
```

- [ ] **Step 2: Commit Task 6 changes**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): add installment applications with home credit and fe credit"
```

7. **Task 7: Implement Electronic Warranties, Returns & Refunds**
   - Provision 12-month electronic warranties for all delivered order items linked to sold IMEIs.
   - Generate 5 return requests with inspection notes and processed refunds.

8. **Task 8: Implement Verified Reviews, Shop Staff Replies, Carts & Wishlists**
   - Seed 120 verified customer reviews matching purchased products.
   - Seed ~60 shop staff replies from `staff@mobilecommerce.vn`.
   - Seed active carts and wishlists for lingering customer accounts.

9. **Task 9: Run Full Seeder & Execute Automated Verification**
   - Run `npx prisma db seed`.
   - Run `npx tsx test/seed_verification.ts` to confirm 100% integrity and zero foreign key violations.

---

### Task 7: Implement Electronic Warranties, Returns & Refunds

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Provision Electronic Warranties for Delivered Items**

Find all `OrderItem` records where `order.status` is `DELIVERED` or `COMPLETED` and `imeiDeviceId` is present:
- Create `Warranty`:
  - `warrantyCode`: `WAR-2026-${String(index).padStart(6, '0')}`
  - `startDate`: `order.deliveredAt` ?? `order.createdAt`
  - `endDate`: 12 months after `startDate`
  - `status`: `WarrantyStatus.ACTIVE`

```typescript
const deliveredItems = await prisma.orderItem.findMany({
  where: {
    imeiDeviceId: { not: null },
    order: { status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] } },
  },
  include: { order: true },
});

for (let w = 0; w < deliveredItems.length; w++) {
  const item = deliveredItems[w];
  const startDate = item.order.deliveredAt ?? item.createdAt;
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  await prisma.warranty.create({
    data: {
      userId: item.order.userId,
      productVariantId: item.variantId,
      orderItemId: item.id,
      imeiDeviceId: item.imeiDeviceId,
      warrantyCode: `WAR-2026-${String(w + 1000).padStart(6, '0')}`,
      startDate,
      endDate,
      status: WarrantyStatus.ACTIVE,
      notes: 'Bảo hành chính hãng 12 tháng - 1 đổi 1 trong 30 ngày nếu có lỗi NSX.',
    },
  });
}
```

- [ ] **Step 2: Generate realistic Return and Refund records**

Take 5 completed orders and create:
- `Return`: reason "Màn hình có 1 điểm pixel bị mờ", status `COMPLETED`, `INSPECTING`, or `REJECTED`.
- `ReturnItem`: attached to `OrderItem`.
- `Refund`: refundNumber `REF-2026-000X`, status `COMPLETED`.

- [ ] **Step 3: Commit Task 7 changes**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): add electronic warranties, return requests and refunds"
```

---

### Task 8: Implement Verified Reviews, Shop Staff Replies, Carts & Wishlists

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Seed 120 Verified Reviews and Shop Replies**

Create realistic Vietnamese review content pool (5-star, 4-star, 3-star).
Link reviews to products that users actually bought in their orders:
- Respect `@@unique([userId, productId])`.
- Set `isVerified: true`, `status: ReviewStatus.APPROVED`.
- Add `ReviewReply` from `staffUser.id` for 50% of the reviews (e.g., "Dạ MobileCommerce cảm ơn quý khách đã tin dùng sản phẩm...").

```typescript
const REVIEWS_5_STAR = [
  { title: 'Máy nguyên seal, bảo hành điện tử chuẩn', content: 'Giao hàng cực nhanh, máy đập hộp nguyên seal zin 100%. Check IMEI trên web ra ngay bảo hành 12 tháng. Rất an tâm!' },
  { title: 'Pin trâu dùng 2 ngày, màn hình siêu mượt', content: 'Trải nghiệm lướt 120Hz quá mượt mà. Dùng 4G cả ngày xem video, lướt web tối về vẫn còn 35% pin.' },
  { title: 'Camera chụp đêm sắc nét đỉnh cao', content: 'Chụp ảnh thiếu sáng không hề bị nhiễu hạt, màu sắc chân thực. Rất xứng đáng từng đồng.' },
  { title: 'Nhân viên tư vấn nhiệt tình, ship nhanh 2h', content: 'Nhân viên hỗ trợ tư vấn chọn màu nhiệt tình, giao hoả tốc đóng gói 3 lớp xốp chống sốc rất cẩn thận.' },
];

const REVIEWS_4_STAR = [
  { title: 'Máy dùng tốt trong tầm giá, loa hơi nhỏ xíu', content: 'Tổng thể mọi thứ đều rất hài lòng. Chỉ có loa ngoài mở max volume hơi rè nhẹ một chút trong phòng kín.' },
  { title: 'Thiết kế đẹp, sạc hơi ấm máy', content: 'Cầm nắm rất sang trọng và đầm tay. Khi sạc nhanh 67W máy có hơi ấm nhẹ nhưng sau đó hạ nhiệt nhanh.' },
];

const REVIEWS_3_STAR = [
  { title: 'Giao trễ 1 ngày so với hẹn', content: 'Máy dùng tốt không có gì để chê, nhưng shipper giao trễ mất 1 ngày làm mình phải đổi lịch nhận hàng.' },
];

const STAFF_REPLY_TEMPLATES = [
  'Dạ MobileCommerce chân thành cảm ơn quý khách đã tin tưởng và ủng hộ cửa hàng. Chúc quý khách có trải nghiệm tuyệt vời với thiết bị mới!',
  'Dạ cảm ơn đánh giá của quý khách! Nếu cần hỗ trợ thêm về kỹ thuật hoặc cài đặt máy, quý khách đừng ngần ngại liên hệ hotline 1800 6868 nhé.',
  'Dạ MobileCommerce ghi nhận góp ý của quý khách về thời gian giao hàng và sẽ phối hợp cùng đơn vị vận chuyển cải thiện nhanh chóng ạ. Cảm ơn quý khách!',
];
```

- [ ] **Step 2: Seed active Cart and Wishlist items**

For 15 users, populate `Cart` and `CartItem` with 1-2 variants.
For 20 users, populate `Wishlist` and `WishlistItem`.

- [ ] **Step 3: Commit Task 8 changes**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): add 120 verified reviews with shop replies, carts and wishlists"
```

---

### Task 9: Run Full Seeder & Execute Automated Verification

**Files:**
- Test: `backend/test/seed_verification.ts`

- [ ] **Step 1: Execute full seed script**

Run: `cd backend && npx prisma db seed`
Expected: Outputs summary showing cleanup success, 40 customers created, 200 orders created, warranties, reviews, and installments populated without errors.

- [ ] **Step 2: Run verification script**

Run: `cd backend && npx tsx test/seed_verification.ts`
Expected: Output showing all counts >= target requirements and prints `✅ ALL SEED INTEGRITY CHECKS PASSED!`.

- [ ] **Step 3: Commit final seeding status and update README if applicable**

```bash
git add backend/prisma/seed.ts backend/test/seed_verification.ts
git commit -m "chore: complete realistic ecommerce database seeding and verification"
```
