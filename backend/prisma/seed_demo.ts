// =============================================================================
// DEMO COMMERCE SEED — full lifecycle data of a real phone store (idempotent)
// =============================================================================
// Run: npx tsx prisma/seed_demo.ts   (from MobileCommerce/backend)
//
// Stages coherent, cross-linked demo data tagged customerNote='[DEMO]':
// orders in (almost) every status, payments incl. FAILED, warranties incl.
// EXPIRED, returns/refunds across statuses, PENDING/REJECTED reviews,
// notifications, shippings, wishlist top-up, one BLOCKED IMEI, voucher usages.
//
// Re-running only tops up what is missing (sections guarded by markers).
// Live-tested follow-ups (P2/P3/H7/race) mutate staged rows through the real
// API — see test_demo_flows.mjs.
// =============================================================================
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO = '[DEMO]';
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

async function userIdByEmail(email: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!u) throw new Error(`User not found: ${email}`);
  return u.id;
}

async function takeAvailableImeis(variantId: string, n: number) {
  return prisma.imeiDevice.findMany({
    where: { variantId, status: 'AVAILABLE' },
    orderBy: { createdAt: 'asc' },
    take: n,
  });
}

async function adjustInventory(variantId: string, reservedDelta: number) {
  await prisma.inventory.update({
    where: { variantId },
    data: {
      reservedQty: { increment: reservedDelta },
      availableQty: { decrement: reservedDelta },
    },
  });
}

async function variantInfo(variantId: string) {
  const v = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { name: true } } },
  });
  if (!v) throw new Error(`Variant not found: ${variantId}`);
  return v;
}

async function main() {
  console.log('🚀 Seeding demo commerce data...');

  const CUST = await userIdByEmail('customer@gmail.com');
  const STAFF = await userIdByEmail('staff@mobilecommerce.vn');

  // ---- 0. Addresses for customer (home + office) ----
  const custAddrs = await prisma.address.findMany({ where: { userId: CUST } });
  let homeAddr = custAddrs.find((a) => a.isDefault) || custAddrs[0];
  if (!homeAddr) {
    homeAddr = await prisma.address.create({
      data: {
        userId: CUST, type: 'HOME', recipientName: 'Nguyễn Văn Khách',
        phone: '0901000003', addressLine1: '123 Nguyễn Huệ, P. Bến Nghé',
        ward: 'Bến Nghé', district: 'Quận 1', city: 'TP. Hồ Chí Minh',
        country: 'Vietnam', isDefault: true,
      },
    });
    console.log('  + home address for customer');
  }
  if (!custAddrs.some((a) => !a.isDefault)) {
    await prisma.address.create({
      data: {
        userId: CUST, type: 'WORK', recipientName: 'Nguyễn Văn Khách (VP)',
        phone: '0901000003', addressLine1: 'Tòa nhà Bitexco, 2 Hải Triều',
        ward: 'Bến Nghé', district: 'Quận 1', city: 'TP. Hồ Chí Minh',
        country: 'Vietnam', isDefault: false,
      },
    });
    console.log('  + office address for customer');
  }

  // ---- Variants to stage with (all have stock) ----
  const V = {
    vivoY100: 'ab283c0c-31f4-494f-aa17-1d1e1867f06b', // 7.290.000
    realmeGT6: 'da9ba1f9-0fc6-4e8b-b331-511c0f685bdf', // 14.990.000
    oppoReno12P: 'f060832d-24ca-4d3e-9430-2928bfbd71d9', // 15.490.000
    iphone16Plus: 'f0575677-b22b-442c-826c-ccb43ea91e1b', // 27.490.000
    pixel9ProXL: 'f2438053-c36a-4f28-af49-81c3c0dbe79f', // 29.990.000
    zenfone11: 'e35769f0-bec0-4846-aa1e-0bf206ab83b0', // 22.490.000
    zflip6: '94124a0d-062f-4961-b28e-f64b72633b4d', // 24.490.000
  };

  const existingDemo = await prisma.order.findMany({
    where: { orderNumber: { startsWith: 'ORD-DEMO-' } },
    select: { orderNumber: true },
  });
  const has = (n: string) => existingDemo.some((o) => o.orderNumber === n);

  // ================= O1: CONFIRMED + PAID (VNPAY) — P2 test target =========
  if (!has('ORD-DEMO-101')) {
    const v = await variantInfo(V.vivoY100);
    const price = Number(v.price);
    const discount = 50000; // WELCOME50
    const total = price - discount + 30000;
    const [imei] = await takeAvailableImeis(V.vivoY100, 1);
    const created = daysAgo(2);
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-DEMO-101', userId: CUST, addressId: homeAddr.id,
        status: 'CONFIRMED', subtotal: price, discountAmount: discount,
        shippingFee: 30000, taxAmount: 0, totalAmount: total,
        voucherCode: 'WELCOME50', customerNote: `${DEMO} paid VNPAY order for cancel/refund flow tests`,
        holdExpiresAt: new Date(created.getTime() + 15 * 60000),
        confirmedAt: new Date(created.getTime() + 3600000),
        createdAt: created,
        items: {
          create: [{
            variantId: V.vivoY100, productName: (v as any).product.name, sku: v.sku,
            quantity: 1, unitPrice: price, discountAmount: 0, totalPrice: price,
            imeiDeviceId: imei.id,
          }],
        },
      },
      include: { items: true },
    });
    await prisma.imeiDevice.update({ where: { id: imei.id }, data: { status: 'RESERVED' } });
    await adjustInventory(V.vivoY100, 1);
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id, method: 'VNPAY', status: 'PAID', amount: total,
        provider: 'VNPAY', providerOrderId: 'VNP20261001001', paidAt: new Date(created.getTime() + 3600000),
      },
    });
    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id, transactionCode: 'VNP20261001001', type: 'PAYMENT',
        status: 'SUCCESS', amount: total, providerReference: 'BANKDEMO001',
        responseData: { RspCode: '00', seeded: true },
      },
    });
    await prisma.voucher.update({ where: { code: 'WELCOME50' }, data: { usageCount: { increment: 1 } } });
    const w50 = await prisma.voucher.findUnique({ where: { code: 'WELCOME50' } });
    await prisma.voucherUsage.create({
      data: { voucherId: w50!.id, userId: CUST, orderId: order.id, discountAmount: discount },
    });
    console.log('  + ORD-DEMO-101 CONFIRMED+PAID (WELCOME50)');
  }

  // ================= O2: CONFIRMED COD (unpaid) — P3 test target ============
  if (!has('ORD-DEMO-102')) {
    const v = await variantInfo(V.realmeGT6);
    const price = Number(v.price);
    const [imei] = await takeAvailableImeis(V.realmeGT6, 1);
    const created = daysAgo(3);
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-DEMO-102', userId: CUST, addressId: homeAddr.id,
        status: 'CONFIRMED', subtotal: price, discountAmount: 0,
        shippingFee: 30000, taxAmount: 0, totalAmount: price + 30000,
        customerNote: `${DEMO} COD order for deliver->auto-PAID test`,
        holdExpiresAt: new Date(created.getTime() + 15 * 60000),
        confirmedAt: new Date(created.getTime() + 7200000),
        createdAt: created,
        items: {
          create: [{
            variantId: V.realmeGT6, productName: (v as any).product.name, sku: v.sku,
            quantity: 1, unitPrice: price, discountAmount: 0, totalPrice: price,
            imeiDeviceId: imei.id,
          }],
        },
      },
    });
    await prisma.imeiDevice.update({ where: { id: imei.id }, data: { status: 'RESERVED' } });
    await adjustInventory(V.realmeGT6, 1);
    await prisma.payment.create({
      data: { orderId: order.id, method: 'COD', status: 'PENDING', amount: price + 30000 },
    });
    console.log('  + ORD-DEMO-102 CONFIRMED COD unpaid');
  }

  // ================= O3: SHIPPING + tracking ================================
  if (!has('ORD-DEMO-103')) {
    const v = await variantInfo(V.oppoReno12P);
    const price = Number(v.price);
    const [imei] = await takeAvailableImeis(V.oppoReno12P, 1);
    const created = daysAgo(5);
    const shipped = daysAgo(3);
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-DEMO-103', userId: CUST, addressId: homeAddr.id,
        status: 'SHIPPING', subtotal: price, discountAmount: 0,
        shippingFee: 30000, taxAmount: 0, totalAmount: price + 30000,
        customerNote: `${DEMO} shipping showcase order`,
        holdExpiresAt: new Date(created.getTime() + 15 * 60000),
        confirmedAt: new Date(created.getTime() + 3600000),
        shippedAt: shipped, createdAt: created,
        items: {
          create: [{
            variantId: V.oppoReno12P, productName: (v as any).product.name, sku: v.sku,
            quantity: 1, unitPrice: price, discountAmount: 0, totalPrice: price,
            imeiDeviceId: imei.id,
          }],
        },
      },
    });
    await prisma.imeiDevice.update({ where: { id: imei.id }, data: { status: 'SOLD', soldAt: shipped } });
    await adjustInventory(V.oppoReno12P, 1);
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id, method: 'VNPAY', status: 'PAID', amount: price + 30000,
        provider: 'VNPAY', providerOrderId: 'VNP20261001003', paidAt: new Date(created.getTime() + 3600000),
      },
    });
    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id, transactionCode: 'VNP20261001003', type: 'PAYMENT',
        status: 'SUCCESS', amount: price + 30000, providerReference: 'BANKDEMO003',
        responseData: { RspCode: '00', seeded: true },
      },
    });
    await prisma.shipping.create({
      data: {
        orderId: order.id, providerName: 'GHN', trackingNumber: 'GHN-DEMO-88213456',
        status: 'IN_TRANSIT', shippingFee: 30000,
        estimatedDeliveryDate: new Date(Date.now() + 2 * 86400000),
        shippedAt: shipped, createdAt: shipped,
      },
    });
    console.log('  + ORD-DEMO-103 SHIPPING + GHN tracking');
  }

  // ================= O4: DELIVERED 3 items (warranty matrix) =================
  if (!has('ORD-DEMO-104')) {
    const v = await variantInfo(V.iphone16Plus);
    const price = Number(v.price);
    const imeis = await takeAvailableImeis(V.iphone16Plus, 3);
    const created = daysAgo(22);
    const delivered = daysAgo(20);
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-DEMO-104', userId: CUST, addressId: homeAddr.id,
        status: 'DELIVERED', subtotal: price * 3, discountAmount: 0,
        shippingFee: 30000, taxAmount: 0, totalAmount: price * 3 + 30000,
        customerNote: `${DEMO} delivered flagship bundle for warranty/return flows`,
        holdExpiresAt: new Date(created.getTime() + 15 * 60000),
        confirmedAt: new Date(created.getTime() + 3600000),
        shippedAt: daysAgo(21), deliveredAt: delivered, createdAt: created,
        items: {
          create: imeis.map((im) => ({
            variantId: V.iphone16Plus, productName: (v as any).product.name, sku: v.sku,
            quantity: 1, unitPrice: price, discountAmount: 0, totalPrice: price,
            imeiDeviceId: im.id,
          })),
        },
      },
      include: { items: true },
    });
    for (const im of imeis) {
      await prisma.imeiDevice.update({ where: { id: im.id }, data: { status: 'SOLD', soldAt: delivered } });
    }
    await adjustInventory(V.iphone16Plus, 3);
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id, method: 'VNPAY', status: 'PAID', amount: price * 3 + 30000,
        provider: 'VNPAY', providerOrderId: 'VNP20261001004', paidAt: new Date(created.getTime() + 3600000),
      },
    });
    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id, transactionCode: 'VNP20261001004', type: 'PAYMENT',
        status: 'SUCCESS', amount: price * 3 + 30000, providerReference: 'BANKDEMO004',
        responseData: { RspCode: '00', seeded: true },
      },
    });
    // item[0] ACTIVE warranty, item[1] stays warranty-free for later flows
    await prisma.warranty.create({
      data: {
        userId: CUST, productVariantId: V.iphone16Plus, orderItemId: order.items[0].id,
        imeiDeviceId: imeis[0].id, warrantyCode: 'WRT-DEMO-104A',
        startDate: delivered, endDate: new Date(delivered.getTime() + 365 * 86400000),
        status: 'ACTIVE', notes: `${DEMO} flagship warranty`, createdAt: delivered,
      },
    });
    await prisma.shipping.create({
      data: {
        orderId: order.id, providerName: 'GHTK', trackingNumber: 'GHTK-DEMO-77120045',
        status: 'DELIVERED', shippingFee: 30000,
        shippedAt: daysAgo(21), deliveredAt: delivered, createdAt: daysAgo(21),
      },
    });
    console.log('  + ORD-DEMO-104 DELIVERED x3 + ACTIVE warranty + GHTK record');
  }

  // ================= O5: DELIVERED + VIP10 (return R1 target) ================
  if (!has('ORD-DEMO-105')) {
    const v = await variantInfo(V.pixel9ProXL);
    const price = Number(v.price);
    const discount = Math.min(Math.round(price * 0.1), 1000000);
    const [imei] = await takeAvailableImeis(V.pixel9ProXL, 1);
    const created = daysAgo(35);
    const delivered = daysAgo(32);
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-DEMO-105', userId: CUST, addressId: homeAddr.id,
        status: 'DELIVERED', subtotal: price, discountAmount: discount,
        shippingFee: 30000, taxAmount: 0, totalAmount: price - discount + 30000,
        voucherCode: 'VIP10', customerNote: `${DEMO} VIP10 order for live return flow`,
        holdExpiresAt: new Date(created.getTime() + 15 * 60000),
        confirmedAt: new Date(created.getTime() + 3600000),
        shippedAt: daysAgo(33), deliveredAt: delivered, createdAt: created,
        items: {
          create: [{
            variantId: V.pixel9ProXL, productName: (v as any).product.name, sku: v.sku,
            quantity: 1, unitPrice: price, discountAmount: 0, totalPrice: price,
            imeiDeviceId: imei.id,
          }],
        },
      },
      include: { items: true },
    });
    await prisma.imeiDevice.update({ where: { id: imei.id }, data: { status: 'SOLD', soldAt: delivered } });
    await adjustInventory(V.pixel9ProXL, 1);
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id, method: 'VNPAY', status: 'PAID', amount: price - discount + 30000,
        provider: 'VNPAY', providerOrderId: 'VNP20261001005', paidAt: new Date(created.getTime() + 3600000),
      },
    });
    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id, transactionCode: 'VNP20261001005', type: 'PAYMENT',
        status: 'SUCCESS', amount: price - discount + 30000, providerReference: 'BANKDEMO005',
        responseData: { RspCode: '00', seeded: true },
      },
    });
    await prisma.voucher.update({ where: { code: 'VIP10' }, data: { usageCount: { increment: 1 } } });
    const vip = await prisma.voucher.findUnique({ where: { code: 'VIP10' } });
    await prisma.voucherUsage.create({
      data: { voucherId: vip!.id, userId: CUST, orderId: order.id, discountAmount: discount },
    });
    await prisma.warranty.create({
      data: {
        userId: CUST, productVariantId: V.pixel9ProXL, orderItemId: order.items[0].id,
        imeiDeviceId: imei.id, warrantyCode: 'WRT-DEMO-105A',
        startDate: delivered, endDate: new Date(delivered.getTime() + 365 * 86400000),
        status: 'ACTIVE', notes: `${DEMO} pixel warranty`, createdAt: delivered,
      },
    });
    console.log('  + ORD-DEMO-105 DELIVERED + VIP10 + ACTIVE warranty');
  }

  // ================= O6: CANCELLED after FAILED VNPAY =========================
  if (!has('ORD-DEMO-106')) {
    const v = await variantInfo(V.zenfone11);
    const price = Number(v.price);
    const [imei] = await takeAvailableImeis(V.zenfone11, 1);
    const created = daysAgo(10);
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-DEMO-106', userId: CUST, addressId: homeAddr.id,
        status: 'CANCELLED', subtotal: price, discountAmount: 0,
        shippingFee: 30000, taxAmount: 0, totalAmount: price + 30000,
        customerNote: `${DEMO} failed payment then cancelled`,
        holdExpiresAt: new Date(created.getTime() + 15 * 60000),
        cancelledAt: new Date(created.getTime() + 7200000),
        cancelledReason: 'Thanh toán VNPay thất bại, khách hủy đơn',
        createdAt: created,
        items: {
          create: [{
            variantId: V.zenfone11, productName: (v as any).product.name, sku: v.sku,
            quantity: 1, unitPrice: price, discountAmount: 0, totalPrice: price,
            imeiDeviceId: imei.id,
          }],
        },
      },
    });
    // stock was released on cancel -> IMEI back AVAILABLE (counters untouched)
    await prisma.payment.create({
      data: {
        orderId: order.id, method: 'VNPAY', status: 'FAILED', amount: price + 30000,
        provider: 'VNPAY', providerOrderId: 'VNP20261001006',
      },
    });
    const fp = await prisma.payment.findFirst({
      where: { orderId: order.id, status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
    });
    await prisma.paymentTransaction.create({
      data: {
        paymentId: fp!.id, transactionCode: 'VNP20261001006', type: 'PAYMENT',
        status: 'FAILED', amount: price + 30000, providerReference: null,
        responseData: { RspCode: '24', seeded: true },
      },
    });
    console.log('  + ORD-DEMO-106 CANCELLED + FAILED VNPAY');
  }

  // ================= O7: EXPIRED PENDING (H7 live target) =====================
  if (!has('ORD-DEMO-107')) {
    const v = await variantInfo(V.zflip6);
    const price = Number(v.price);
    const [imei] = await takeAvailableImeis(V.zflip6, 1);
    const created = new Date(Date.now() - 2 * 3600000);
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-DEMO-107', userId: CUST, addressId: homeAddr.id,
        status: 'PENDING', subtotal: price, discountAmount: 0,
        shippingFee: 30000, taxAmount: 0, totalAmount: price + 30000,
        customerNote: `${DEMO} expired hold for sweeper/H7 test`,
        holdExpiresAt: new Date(Date.now() - 105 * 60000),
        createdAt: created,
        items: {
          create: [{
            variantId: V.zflip6, productName: (v as any).product.name, sku: v.sku,
            quantity: 1, unitPrice: price, discountAmount: 0, totalPrice: price,
            imeiDeviceId: imei.id,
          }],
        },
      },
    });
    await prisma.imeiDevice.update({ where: { id: imei.id }, data: { status: 'RESERVED' } });
    await adjustInventory(V.zflip6, 1);
    console.log('  + ORD-DEMO-107 expired PENDING hold (sweeper will release)');
  }

  // ================= O8: COMPLETED old order + EXPIRED warranty ==============
  if (!has('ORD-DEMO-108')) {
    const v = await variantInfo(V.vivoY100);
    const price = Number(v.price);
    const [imei] = await takeAvailableImeis(V.vivoY100, 1);
    const created = daysAgo(400);
    const delivered = daysAgo(390);
    const start = daysAgo(390);
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-DEMO-108', userId: CUST, addressId: homeAddr.id,
        status: 'COMPLETED', subtotal: price, discountAmount: 0,
        shippingFee: 30000, taxAmount: 0, totalAmount: price + 30000,
        customerNote: `${DEMO} old completed order with expired warranty`,
        holdExpiresAt: new Date(created.getTime() + 15 * 60000),
        confirmedAt: new Date(created.getTime() + 3600000),
        shippedAt: daysAgo(392), deliveredAt: delivered,
        completedAt: daysAgo(360), createdAt: created,
        items: {
          create: [{
            variantId: V.vivoY100, productName: (v as any).product.name, sku: v.sku,
            quantity: 1, unitPrice: price, discountAmount: 0, totalPrice: price,
            imeiDeviceId: imei.id,
          }],
        },
      },
      include: { items: true },
    });
    await prisma.imeiDevice.update({ where: { id: imei.id }, data: { status: 'SOLD', soldAt: delivered } });
    await adjustInventory(V.vivoY100, 1);
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id, method: 'VNPAY', status: 'PAID', amount: price + 30000,
        provider: 'VNPAY', providerOrderId: 'VNP20251001008',
        paidAt: new Date(created.getTime() + 3600000),
      },
    });
    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id, transactionCode: 'VNP20251001008', type: 'PAYMENT',
        status: 'SUCCESS', amount: price + 30000, providerReference: 'BANKDEMO008',
        responseData: { RspCode: '00', seeded: true },
      },
    });
    await prisma.warranty.create({
      data: {
        userId: CUST, productVariantId: V.vivoY100, orderItemId: order.items[0].id,
        imeiDeviceId: imei.id, warrantyCode: 'WRT-DEMO-108X',
        startDate: start, endDate: new Date(start.getTime() + 365 * 86400000),
        status: 'ACTIVE', notes: `${DEMO} naturally expired coverage`, createdAt: start,
      },
    });
    console.log('  + ORD-DEMO-108 COMPLETED + naturally EXPIRED warranty');
  }

  // ================= Returns across statuses =================================
  const ret = async (num: string, orderNumber: string, itemIdx: number, status: string,
    reason: string, extra: any = {}) => {
    const exists = await prisma.return.findUnique({ where: { returnNumber: num } });
    if (exists) return exists;
    const o = await prisma.order.findUnique({
      where: { orderNumber }, include: { items: true },
    });
    const item = o!.items[itemIdx];
    return prisma.return.create({
      data: {
        orderId: o!.id, userId: o!.userId, returnNumber: num, status: status as any,
        reason, requestedAt: daysAgo(extra.daysAgo ?? 6),
        approvedAt: extra.approved ? daysAgo(extra.daysAgo - 1) : undefined,
        receivedAt: extra.received ? daysAgo(extra.daysAgo - 2) : undefined,
        completedAt: extra.completed ? daysAgo(extra.daysAgo - 3) : undefined,
        createdAt: daysAgo(extra.daysAgo ?? 6),
        items: { create: [{ orderItemId: item.id, quantity: 1, reason, condition: 'Like new, full box' }] },
      },
    });
  };

  // R1 REQUESTED on O5 item -> live approve/receive/complete flow
  const o105 = await prisma.order.findUnique({
    where: { orderNumber: 'ORD-DEMO-105' }, include: { items: true },
  });
  await ret('RET-DEMO-201', 'ORD-DEMO-105', 0, 'REQUESTED',
    'Máy nóng bất thường khi sạc, muốn đổi máy khác', { daysAgo: 2 });
  console.log('  + RET-DEMO-201 REQUESTED (live flow target)');

  // R2 APPROVED on existing delivered item (owner tran.thi.b)
  const oA02 = await prisma.order.findUnique({
    where: { orderNumber: 'ORD-202610-A02' }, include: { items: true },
  });
  if (oA02) {
    await ret('RET-DEMO-202', 'ORD-202610-A02', 0, 'APPROVED',
      'Màn hình có 1 điểm chết nhỏ, yêu cầu đổi mới', { daysAgo: 8, approved: true });
    console.log('  + RET-DEMO-202 APPROVED');
  }

  // R3 RECEIVED on existing delivered item (owner tran.thi.b)
  const oA07 = await prisma.order.findUnique({
    where: { orderNumber: 'ORD-202610-A07' }, include: { items: true },
  });
  if (oA07) {
    await ret('RET-DEMO-203', 'ORD-202610-A07', 0, 'RECEIVED',
      'Loa rè khi mở max volume', { daysAgo: 9, approved: true, received: true });
    console.log('  + RET-DEMO-203 RECEIVED');
  }

  // R4 REJECTED on existing delivered item (owner le.hoang.c)
  const oA08 = await prisma.order.findUnique({
    where: { orderNumber: 'ORD-202610-A08' }, include: { items: true },
  });
  if (oA08) {
    const r4 = await ret('RET-DEMO-204', 'ORD-202610-A08', 0, 'REJECTED',
      'Máy rơi vỡ do người dùng, đòi bảo hành', { daysAgo: 4 });
    await prisma.return.update({
      where: { id: (r4 as any).id },
      data: { adminNote: 'Từ chối: hư hỏng vật lý do rơi vỡ, không thuộc phạm vi bảo hành' },
    });
    console.log('  + RET-DEMO-204 REJECTED');
  }

  // R5 CANCELLED on O4 item0 (customer changed mind)
  await ret('RET-DEMO-205', 'ORD-DEMO-104', 0, 'CANCELLED',
    'Đặt nhầm màu, đã hủy yêu cầu', { daysAgo: 5 });
  console.log('  + RET-DEMO-205 CANCELLED');

  // ================= Refunds across statuses =================================
  const mkRefund = async (num: string, returnNumber: string, amount: number,
    status: string, extra: any = {}) => {
    const exists = await prisma.refund.findUnique({ where: { refundNumber: num } });
    if (exists) return exists;
    const r = await prisma.return.findUnique({
      where: { returnNumber }, include: { order: true },
    });
    return prisma.refund.create({
      data: {
        returnId: r!.id, refundNumber: num, amount, status: status as any,
        reason: extra.reason || 'Hoàn tiền theo yêu cầu trả hàng',
        providerRef: extra.providerRef,
        processedAt: extra.processed ? new Date() : undefined,
        createdAt: daysAgo(extra.daysAgo ?? 3),
      },
    });
  };
  const o203 = await prisma.return.findUnique({
    where: { returnNumber: 'RET-DEMO-203' }, include: { order: true },
  });
  const r203Total = Number((o203 as any).order.totalAmount);
  await mkRefund('REF-DEMO-301', 'RET-DEMO-203', 500000, 'PENDING', { reason: 'Hoàn một phần phí sửa loa', daysAgo: 2 });
  await mkRefund('REF-DEMO-302', 'RET-DEMO-203', 200000, 'FAILED', { reason: 'Bank từ chối giao dịch hoàn', daysAgo: 4 });
  await mkRefund('REF-DEMO-303', 'RET-DEMO-203', Math.min(300000, Math.max(0, r203Total - 700000)), 'CANCELLED', { reason: 'Khách đổi ý, nhận máy lại', daysAgo: 5 });
  console.log(`  + refunds PENDING/FAILED/CANCELLED on RET-DEMO-203 (total ${r203Total})`);

  // ================= Reviews: PENDING + REJECTED ==============================
  const usedPairs = new Set(
    (await prisma.review.findMany({ select: { userId: true, productId: true } }))
      .map((x) => `${x.userId}|${x.productId}`),
  );
  const customers = await prisma.user.findMany({
    where: { roles: { some: { role: { name: 'USER' } } } },
    select: { id: true },
  });
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' }, select: { id: true }, take: 20,
  });
  const freePairs: Array<{ u: string; p: string }> = [];
  outer: for (const c of customers) {
    for (const p of products) {
      if (!usedPairs.has(`${c.id}|${p.id}`)) {
        freePairs.push({ u: c.id, p: p.id });
        if (freePairs.length >= 4) break outer;
      }
    }
  }
  const modReviews = [
    { rating: 5, title: 'Vừa nhận máy hôm qua, rất ưng', content: 'Máy mới nguyên seal, shop giao nhanh. Để dùng thêm 1 tuần rồi đánh giá chi tiết.', status: 'PENDING' },
    { rating: 4, title: 'Ổn áp, pin chờ tốt', content: 'Để qua đêm tụt 3% pin, màn đẹp. Mỗi tội sạc theo máy hơi chậm.', status: 'PENDING' },
    { rating: 2, title: 'Máy lag sau 3 ngày???', content: 'Mới mua mà thấy giật lag, không biết do máy hay do mình cài nhiều app. Shop kiểm tra giúp.', status: 'PENDING' },
    { rating: 1, title: 'HÀNG DỰNG LỪA ĐẢO', content: 'Shop bán hàng fake giá trên trời, mọi người đừng mua!!! Liên hệ: 09xx-xxx-xxx', status: 'REJECTED' },
  ];
  for (let i = 0; i < Math.min(4, freePairs.length); i++) {
    const fp = freePairs[i];
    const mr = modReviews[i];
    const exists = await prisma.review.findUnique({
      where: { userId_productId: { userId: fp.u, productId: fp.p } },
    });
    if (!exists) {
      await prisma.review.create({
        data: {
          userId: fp.u, productId: fp.p, rating: mr.rating,
          title: mr.title, content: mr.content,
          status: mr.status as any, isVerified: false, createdAt: daysAgo(1),
        },
      });
    }
  }
  console.log('  + 3 PENDING + 1 REJECTED reviews (moderation queue)');

  // ================= Notifications ============================================
  const notifCount = await prisma.notification.count({ where: { userId: CUST } });
  if (notifCount < 5) {
    const N = (type: string, title: string, message: string, days: number, read: boolean) =>
      prisma.notification.create({
        data: {
          userId: CUST, type: type as any, channel: 'IN_APP', title, message,
          isRead: read, readAt: read ? daysAgo(days) : undefined, createdAt: daysAgo(days),
        },
      });
    await N('ORDER', 'Đơn hàng ORD-DEMO-103 đang giao', 'Kiện hàng của bạn đang trên đường giao bởi GHN. Mã vận đơn GHN-DEMO-88213456.', 3, false);
    await N('PAYMENT', 'Thanh toán thành công 7.270.000₫', 'PhoneShop đã nhận thanh toán VNPay cho đơn ORD-DEMO-101.', 2, false);
    await N('PROMOTION', 'Tết 2026: giảm tới 500K', 'Mã TET2026 giảm ngay 500.000₫ cho flagship. Số lượng có hạn!', 1, false);
    await N('WARRANTY', 'Bảo hành sắp hết hạn', 'Thiết bị của đơn ORD-DEMO-108 đã hết hạn bảo hành 12 tháng. Gia hạn để được ưu đãi sửa chữa.', 0, false);
    await N('SYSTEM', 'Chào mừng đến PhoneShop', 'Tài khoản của bạn đã sẵn sàng. Hoàn tất hồ sơ để nhận ưu đãi thành viên mới.', 30, true);
    console.log('  + 5 notifications for customer');
  }

  // ================= Wishlist top-up (customer -> 3 items) =====================
  const wl = await prisma.wishlist.findUnique({ where: { userId: CUST } });
  const wlId = wl
    ? wl.id
    : (await prisma.wishlist.create({ data: { userId: CUST } })).id;
  const existingWl = await prisma.wishlistItem.findMany({ where: { wishlistId: wlId }, select: { productId: true } });
  const have = new Set(existingWl.map((x) => x.productId));
  const want = products.slice(0, 5).map((p) => p.id).filter((id) => !have.has(id)).slice(0, Math.max(0, 3 - have.size));
  for (const pid of want) {
    await prisma.wishlistItem.create({ data: { wishlistId: wlId, productId: pid } });
  }
  console.log(`  + wishlist topped up (+${want.length})`);

  // ================= 1 BLOCKED IMEI showcase ==================================
  const blockedCount = await prisma.imeiDevice.count({ where: { status: 'BLOCKED' } });
  if (blockedCount === 0) {
    const victim = await prisma.imeiDevice.findFirst({
      where: { status: 'AVAILABLE' }, orderBy: { createdAt: 'desc' },
    });
    if (victim) {
      await prisma.imeiDevice.update({ where: { id: victim.id }, data: { status: 'BLOCKED' } });
      console.log('  + 1 BLOCKED IMEI showcase (reported lost unit)');
    }
  }

  // ================= Single-use voucher for race test ==========================
  await prisma.voucher.upsert({
    where: { code: 'RACE1' },
    update: { usageCount: 0, isActive: true },
    create: {
      code: 'RACE1', name: 'Voucher test đua đơn (1 lượt)',
      description: 'Single-use voucher for concurrency race test',
      type: 'FIXED_AMOUNT', value: 20000, minOrderValue: 0,
      usageLimit: 1, usageCount: 0, perUserLimit: 1,
      startAt: daysAgo(1), endAt: new Date(Date.now() + 30 * 86400000), isActive: true,
    },
  });
  await prisma.voucherUsage.deleteMany({ where: { voucher: { code: 'RACE1' } } });
  console.log('  + RACE1 single-use voucher (reset)');

  console.log('\n✅ Demo seed finished');
}

main()
  .catch((e) => {
    console.error('❌ Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
