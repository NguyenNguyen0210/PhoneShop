// Disposable local database only. Build the backend before running this script.
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { OrdersService } = require('../dist/src/modules/orders/orders.service');
const { PaymentsService } = require('../dist/src/modules/payments/payments.service');
const { WarrantyService } = require('../dist/src/modules/warranty/warranty.service');
const { randomUUID, randomInt } = require('node:crypto');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const bcrypt = require('bcrypt');

async function main() {
  const connection = process.env.TEST_DATABASE_URL;
  const target = new URL(connection);
  if (!['localhost', '127.0.0.1'].includes(target.hostname) || !/_(test|ci|audit)$/.test(target.pathname)) {
    throw new Error('Set TEST_DATABASE_URL to an explicitly named disposable local database');
  }
  const db = new PrismaService(new ConfigService({ DATABASE_URL: connection }));
  try {
    const key = randomUUID();
    const password = `Local-test-${key}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const adminRole = await db.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } });
    const userRole = await db.role.upsert({ where: { name: 'USER' }, update: {}, create: { name: 'USER' } });
    const admin = await db.user.create({ data: { email: `admin-${key}@test.invalid`, passwordHash,
      firstName: 'Smoke', lastName: 'Admin', roles: { create: { roleId: adminRole.id } } } });
    const buyer = await db.user.create({ data: { email: `buyer-${key}@test.invalid`, passwordHash,
      firstName: 'Smoke', lastName: 'Buyer', phone: `09${randomInt(10000000, 99999999)}`, roles: { create: { roleId: userRole.id } } } });
    const brand = await db.brand.create({ data: { name: `Smoke ${key}`, slug: key } });
    const category = await db.category.create({ data: { name: `Smoke ${key}`, slug: key } });
    const product = await db.product.create({ data: { name: 'Business smoke phone', slug: key,
      brandId: brand.id, categoryId: category.id, status: 'ACTIVE' } });
    const variant = await db.productVariant.create({ data: { productId: product.id, name: 'Smoke variant', sku: key,
      price: 10000000, inventory: { create: { quantity: 3, availableQty: 3, reservedQty: 0 } } } });
    for (let i = 0; i < 3; i++) await db.imeiDevice.create({ data: { variantId: variant.id, imei: `S${key.replace(/-/g, '').slice(0, 13)}${i}` } });
    const address = await db.address.create({ data: { userId: buyer.id, recipientName: 'Smoke Buyer', phone: buyer.phone,
      addressLine1: 'Smoke original street', city: 'Ho Chi Minh' } });
    const cart = await db.cart.create({ data: { userId: buyer.id } });
    const warranty = new WarrantyService(db);
    const orders = new OrdersService(db, undefined, warranty);
    const payments = new PaymentsService(db, {}, {}, new ConfigService());
    async function checkout(paid) {
      await db.cartItem.create({ data: { cartId: cart.id, variantId: variant.id, quantity: 1, unitPrice: 10000000 } });
      const order = await orders.checkout(buyer.id, { addressId: address.id, paymentMethod: 'BANK_TRANSFER' });
      if (paid) {
        const payment = await db.payment.findFirstOrThrow({ where: { orderId: order.id } });
        await payments.confirmPayment(payment.id, { providerRef: randomUUID() }, admin.id);
      }
      return order;
    }
    const unpaid = await checkout(false);
    const refundable = await checkout(true);
    const delivered = await checkout(true);
    await orders.transitionStatus(delivered.id, 'PACKED');
    await orders.transitionStatus(delivered.id, 'DELIVERED');
    const record = await db.warranty.findFirstOrThrow({ where: { orderItem: { orderId: delivered.id } } });
    await warranty.claimWarranty(buyer.id, record.id, { reason: 'Smoke repair', customerPhone: buyer.phone, returnAddress: 'Customer street' });
    const directory = resolve(__dirname, '../../test_artifacts');
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, 'business-smoke-fixture.json'), JSON.stringify({
      adminEmail: admin.email, buyerEmail: buyer.email, password, unpaid, refundable,
      warranty: { id: record.id, code: record.warrantyCode },
    }, null, 2));
    console.log('Created local-only browser fixtures in test_artifacts/business-smoke-fixture.json');
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
