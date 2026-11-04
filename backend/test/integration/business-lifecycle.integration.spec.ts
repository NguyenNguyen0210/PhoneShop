import { ConfigService } from '@nestjs/config';
import { randomUUID, createHmac } from 'crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { PaymentsService, buildVnpaySignData } from '../../src/modules/payments/payments.service';
import { WarrantyService } from '../../src/modules/warranty/warranty.service';
import { ImeiService } from '../../src/modules/imei/imei.service';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { PaymentMethod, OrderStatus, ShippingMethod } from '@prisma/client';

// Never use the developer/production DATABASE_URL implicitly. This suite writes
// fixtures only to an explicitly named local disposable test database.
const url = process.env.TEST_DATABASE_URL;
const integration = url ? describe : describe.skip;

integration('Business lifecycle against real PostgreSQL', () => {
  let db: PrismaService;
  let orders: OrdersService;
  let payments: PaymentsService;
  let warranty: WarrantyService;
  let imei: ImeiService;
  let reports: ReportsService;
  let fixture: any;

  beforeAll(async () => {
    const target = new URL(url!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) ||
      !/_(test|ci|audit)$/.test(target.pathname)) {
      throw new Error('Integration tests require a local disposable database ending _test, _ci or _audit');
    }
    const config = new ConfigService({ DATABASE_URL: url, VNPAY_HASH_SECRET: 'integration-only-signature-key' });
    db = new PrismaService(config);
    await db.$connect();
    warranty = new WarrantyService(db);
    orders = new OrdersService(db, undefined, warranty);
    payments = new PaymentsService(db, {} as any, { sendOrderConfirmation: async () => {} } as any, config);
    imei = new ImeiService(db);
    reports = new ReportsService(db);
  });

  afterAll(async () => { await db?.$disconnect(); });

  beforeEach(async () => {
    const key = randomUUID();
    const user = await db.user.create({ data: { email: `${key}@test.invalid`, passwordHash: 'test-only' } });
    const brand = await db.brand.create({ data: { name: key, slug: key } });
    const category = await db.category.create({ data: { name: key, slug: key } });
    const product = await db.product.create({ data: {
      name: 'Test phone', slug: key, brandId: brand.id, categoryId: category.id,
      status: 'ACTIVE', warrantyMonths: 12,
    } });
    const variant = await db.productVariant.create({ data: {
      productId: product.id, name: 'Test variant', sku: key, price: 10000000,
      inventory: { create: { quantity: 1, availableQty: 1, reservedQty: 0 } },
    } });
    const device = await db.imeiDevice.create({ data: {
      variantId: variant.id, imei: `T${key.replace(/-/g, '').slice(0, 14)}`,
    } });
    const address = await db.address.create({ data: {
      userId: user.id, recipientName: 'Original buyer', phone: '0901234567',
      addressLine1: 'Original street', city: 'Ho Chi Minh',
    } });
    await db.cart.create({ data: { userId: user.id, items: { create: {
      variantId: variant.id, quantity: 1, unitPrice: 10000000,
    } } } });
    fixture = { user, variant, device, address };
  });

  const checkout = (method: PaymentMethod = PaymentMethod.BANK_TRANSFER) => orders.checkout(fixture.user.id, {
    addressId: fixture.address.id, paymentMethod: method, shippingMethod: ShippingMethod.STANDARD,
  });
  const capture = async (order: any) => {
    const payment = await db.payment.findFirstOrThrow({ where: { orderId: order.id } });
    await payments.confirmPayment(payment.id, { providerRef: `BANK-${randomUUID()}` }, fixture.user.id);
    return payment;
  };
  const deliver = async (order: any) => {
    for (const state of [OrderStatus.PACKED, OrderStatus.DELIVERED]) await orders.transitionStatus(order.id, state);
  };

  it('rejects unpaid online fulfillment without changing order or reservation', async () => {
    const order = await checkout();
    await expect(orders.transitionStatus(order.id, OrderStatus.CONFIRMED)).rejects.toThrow('must be paid');
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING');
    expect((await db.imeiDevice.findUniqueOrThrow({ where: { id: fixture.device.id } })).status).toBe('RESERVED');
  });

  it('captures payment without selling physical stock or starting warranty', async () => {
    const order = await checkout();
    await capture(order);
    expect((await db.imeiDevice.findUniqueOrThrow({ where: { id: fixture.device.id } })).status).toBe('RESERVED');
    expect(await db.warranty.count({ where: { orderItem: { orderId: order.id } } })).toBe(0);
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 1, availableQty: 0, reservedQty: 1 });
    await imei.syncInventoryFromImei(fixture.variant.id);
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 1, availableQty: 0, reservedQty: 1 });
    await deliver(order);
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 0, availableQty: 0, reservedQty: 0 });
    expect(await db.warranty.count({ where: { orderItem: { orderId: order.id } } })).toBe(1);
  });

  it('refunds before dispatch and releases the original hold exactly once', async () => {
    const order = await checkout();
    await capture(order);
    const dto = { amount: Number(order.totalAmount), reason: 'Cancel before dispatch', providerReference: randomUUID() };
    await orders.processRefund(order.id, dto, fixture.user.id);
    await expect(orders.processRefund(order.id, dto, fixture.user.id)).rejects.toThrow();
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CANCELLED');
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 1, availableQty: 1, reservedQty: 0 });
    expect((await db.imeiDevice.findUniqueOrThrow({ where: { id: fixture.device.id } })).status).toBe('AVAILABLE');
  });

  it.each([PaymentMethod.COD, PaymentMethod.BANK_TRANSFER])('quarantines carrier returns for %s, then QC restocks once', async (method) => {
    const order = await checkout(method);
    if (method !== PaymentMethod.COD) await capture(order);
    else await orders.transitionStatus(order.id, OrderStatus.CONFIRMED);
    await orders.transitionStatus(order.id, OrderStatus.PACKED);
    await orders.transitionStatus(order.id, OrderStatus.SHIPPING);
    await orders.transitionStatus(order.id, OrderStatus.RETURNED);
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 0, availableQty: 0, reservedQty: 0 });
    await imei.release(fixture.device.id);
    await expect(imei.release(fixture.device.id)).rejects.toThrow();
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 1, availableQty: 1, reservedQty: 0 });
    if (method !== PaymentMethod.COD) {
      await orders.processRefund(order.id, { amount: Number(order.totalAmount), reason: 'Carrier return', providerReference: randomUUID() }, fixture.user.id);
      expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 1, availableQty: 1, reservedQty: 0 });
    }
  });

  it('keeps the shipping snapshot after editing and deleting the saved address', async () => {
    const order = await checkout(PaymentMethod.COD);
    await db.address.update({ where: { id: fixture.address.id }, data: { recipientName: 'Changed', addressLine1: 'Changed street' } });
    expect(await orders.findMyOrder(fixture.user.id, order.id)).toMatchObject({ customerName: 'Original buyer', shippingAddress: expect.stringContaining('Original street') });
    await db.address.delete({ where: { id: fixture.address.id } });
    expect(await orders.findOne(order.id)).toMatchObject({ customerName: 'Original buyer', shippingPhone: '0901234567', address: { addressLine1: 'Original street' } });
    expect((await orders.findAll({} as any)).data.find((row: any) => row.id === order.id)?.customerName).toBe('Original buyer');
    expect((await orders.findAll({ search: 'original buyer', limit: 1000 } as any)).data.some((row: any) => row.id === order.id)).toBe(true);
  });

  it('allows only one of two simultaneous buyers to reserve the last device', async () => {
    const key = randomUUID();
    const buyer = await db.user.create({ data: { email: `${key}@test.invalid`, passwordHash: 'test' } });
    const address = await db.address.create({ data: { userId: buyer.id, recipientName: 'Second', phone: '0901234568', addressLine1: 'Second street', city: 'HCM' } });
    await db.cart.create({ data: { userId: buyer.id, items: { create: { variantId: fixture.variant.id, quantity: 1, unitPrice: 10000000 } } } });
    const results = await Promise.allSettled([checkout(), orders.checkout(buyer.id, { addressId: address.id, paymentMethod: PaymentMethod.BANK_TRANSFER })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.orderItem.count({ where: { imeiDeviceId: fixture.device.id } })).toBe(1);
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 1, availableQty: 0, reservedQty: 1 });
  });

  it('serializes competing partial refunds and rolls the excess request back', async () => {
    const order = await checkout(); await capture(order); await deliver(order);
    await orders.processRefund(order.id, { amount: 1000000, reason: 'First', providerReference: randomUUID() }, fixture.user.id);
    const results = await Promise.allSettled([6000000, 6000000].map((amount) => orders.processRefund(order.id, { amount, reason: 'Concurrent', providerReference: randomUUID() }, fixture.user.id)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refunds = await db.paymentTransaction.aggregate({ where: { payment: { orderId: order.id }, type: { in: ['REFUND', 'PARTIAL_REFUND'] }, status: 'SUCCESS' }, _sum: { amount: true } });
    expect(Number(refunds._sum.amount)).toBe(7000000);
  });

  it('rolls back the entire carrier return when its inventory reservation is missing', async () => {
    const order = await checkout(); await capture(order);
    await orders.transitionStatus(order.id, OrderStatus.PACKED);
    await orders.transitionStatus(order.id, OrderStatus.SHIPPING);
    await db.inventory.update({ where: { variantId: fixture.variant.id }, data: { reservedQty: 0 } });
    await expect(orders.transitionStatus(order.id, OrderStatus.RETURNED)).rejects.toThrow('reservation is missing');
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('SHIPPING');
    expect((await db.imeiDevice.findUniqueOrThrow({ where: { id: fixture.device.id } })).status).toBe('RESERVED');
  });

  it('syncs blocked inventory without breaking subsequent unblock', async () => {
    await imei.block(fixture.device.id);
    await imei.syncInventoryFromImei(fixture.variant.id);
    await imei.release(fixture.device.id);
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 1, availableQty: 1, reservedQty: 0 });
  });

  it('finishes repair by returning the customer device, without adding sellable stock', async () => {
    const order = await checkout(); await capture(order); await deliver(order);
    const record = await db.warranty.findFirstOrThrow({ where: { orderItem: { orderId: order.id } } });
    await warranty.claimWarranty(fixture.user.id, record.id, { reason: 'Broken screen', customerPhone: '0901234567', returnAddress: 'Customer street' });
    await expect(warranty.advanceRepair(record.id, 'return', { notes: 'Too early' }, fixture.user.id)).rejects.toThrow();
    for (const stage of ['receive', 'repair', 'return'] as const) await warranty.advanceRepair(record.id, stage, { notes: `Evidence ${stage}` }, fixture.user.id);
    expect(await db.warranty.findUnique({ where: { id: record.id } })).toMatchObject({ status: 'ACTIVE', repairStage: 'RETURNED', claimPhone: '0901234567' });
    expect((await db.imeiDevice.findUniqueOrThrow({ where: { id: fixture.device.id } })).status).toBe('SOLD');
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 0, availableQty: 0, reservedQty: 0 });
    expect(await db.auditLog.count({ where: { entity: 'Warranty', entityId: record.id } })).toBe(4);
    await expect(imei.release(fixture.device.id)).rejects.toThrow();
    expect(await warranty.lookupMyPhone(fixture.user.id, '+84901234567')).toMatchObject({ id: record.id });
    await expect(warranty.lookupMyPhone(randomUUID(), '0901234567')).rejects.toThrow();
  });

  it('reports gross, refunds and net on the actual cashflow date in Vietnam', async () => {
    const baseline = await reports.getRevenueReport('2040-01-02', '2040-01-03');
    const order = await checkout(); const payment = await capture(order);
    await db.paymentTransaction.updateMany({ where: { paymentId: payment.id }, data: { createdAt: new Date('2040-01-02T16:30:00Z') } });
    await orders.processRefund(order.id, { amount: 2000000, reason: 'Compensation', providerReference: randomUUID() }, fixture.user.id);
    await db.paymentTransaction.updateMany({ where: { paymentId: payment.id, type: 'PARTIAL_REFUND' }, data: { createdAt: new Date('2040-01-02T18:00:00Z') } });
    const report = await reports.getRevenueReport('2040-01-02', '2040-01-03');
    expect(report).toMatchObject({ totalRevenue: baseline.totalRevenue + Number(order.totalAmount), refundedTotal: baseline.refundedTotal + 2000000, netRevenue: baseline.netRevenue + Number(order.totalAmount) - 2000000 });
    expect(report.dailyBreakdown).toEqual([
      expect.objectContaining({ date: '2040-01-02', revenue: (baseline.dailyBreakdown.find((d) => d.date === '2040-01-02')?.revenue ?? 0) + Number(order.totalAmount) }),
      expect.objectContaining({ date: '2040-01-03', revenue: (baseline.dailyBreakdown.find((d) => d.date === '2040-01-03')?.revenue ?? 0) - 2000000 }),
    ]);
  });

  it('rolls back a refund when releasing its device loses a race', async () => {
    const order = await checkout(); await capture(order);
    await db.imeiDevice.update({ where: { id: fixture.device.id }, data: { status: 'BLOCKED' } });
    await expect(orders.processRefund(order.id, { amount: Number(order.totalAmount), reason: 'Conflict', providerReference: randomUUID() }, fixture.user.id)).rejects.toThrow('device state changed');
    expect((await db.payment.findFirstOrThrow({ where: { orderId: order.id } })).status).toBe('PAID');
    expect(await db.paymentTransaction.count({ where: { payment: { orderId: order.id }, type: 'REFUND' } })).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CONFIRMED');
  });

  it('records COD revenue only once when delivery is retried', async () => {
    const order = await checkout(PaymentMethod.COD);
    await orders.transitionStatus(order.id, OrderStatus.CONFIRMED);
    await deliver(order);
    await orders.transitionStatus(order.id, OrderStatus.DELIVERED);
    await orders.transitionStatus(order.id, OrderStatus.COMPLETED);
    expect(await db.paymentTransaction.count({ where: { payment: { orderId: order.id }, type: 'PAYMENT', status: 'SUCCESS' } })).toBe(1);
    expect(await db.stockMovement.count({ where: { variantId: fixture.variant.id, type: 'EXPORT_ORDER' } })).toBe(1);
  });

  it('does not cancel a partially refunded order while money remains captured', async () => {
    const order = await checkout(); await capture(order);
    await orders.processRefund(order.id, { amount: 2000000, reason: 'Partial compensation', providerReference: randomUUID() }, fixture.user.id);
    await expect(orders.transitionStatus(order.id, OrderStatus.CANCELLED)).rejects.toThrow('already paid');
    await expect(orders.cancelMyOrder(fixture.user.id, order.id, { reason: 'Cancel without remaining refund' })).rejects.toThrow('already paid');
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CONFIRMED');
    expect(await db.inventory.findUnique({ where: { variantId: fixture.variant.id } })).toMatchObject({ quantity: 1, availableQty: 0, reservedQty: 1 });
  });

  it('settles a signed VNPay callback once while retaining the physical reservation', async () => {
    const order = await checkout(PaymentMethod.VNPAY);
    const query: Record<string, string> = {
      vnp_TxnRef: order.orderNumber, vnp_Amount: String(Number(order.totalAmount) * 100),
      vnp_ResponseCode: '00', vnp_TransactionStatus: '00',
      vnp_TransactionNo: randomUUID(), vnp_BankTranNo: randomUUID(),
    };
    query.vnp_SecureHash = createHmac('sha512', 'integration-only-signature-key')
      .update(buildVnpaySignData(query)).digest('hex');
    expect(await payments.handleVnpayIpn(query)).toMatchObject({ RspCode: '00' });
    await payments.handleVnpayIpn(query);
    expect(await db.paymentTransaction.count({ where: { payment: { orderId: order.id }, status: 'SUCCESS' } })).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CONFIRMED');
    expect((await db.imeiDevice.findUniqueOrThrow({ where: { id: fixture.device.id } })).status).toBe('RESERVED');
    expect(await db.warranty.count({ where: { orderItem: { orderId: order.id } } })).toBe(0);
  });
});
