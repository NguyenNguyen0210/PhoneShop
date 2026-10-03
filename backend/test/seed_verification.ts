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

  const userCount = await prisma.user.count();
  const addressCount = await prisma.address.count();
  const orderCount = await prisma.order.count();
  const orderItemCount = await prisma.orderItem.count();
  const imeiCount = await prisma.imeiDevice.count();
  const warrantyCount = await prisma.warranty.count();
  const reviewCount = await prisma.review.count();
  const reviewReplyCount = await prisma.reviewReply.count();
  const installmentCount = await prisma.installmentApplication.count();
  const shippingCount = await prisma.shipping.count();
  const paymentCount = await prisma.payment.count();
  const voucherCount = await prisma.voucher.count();

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
  if (addressCount < 40) throw new Error(`Address count too low: ${addressCount}`);
  if (orderCount < 180) throw new Error(`Order count too low: ${orderCount}`);
  if (orderItemCount < 200) throw new Error(`OrderItem count too low: ${orderItemCount}`);
  if (imeiCount < 300) throw new Error(`IMEI count too low: ${imeiCount}`);
  if (warrantyCount < 100) throw new Error(`Warranty count too low: ${warrantyCount}`);
  if (reviewCount < 100) throw new Error(`Review count too low: ${reviewCount}`);
  if (reviewReplyCount < 40) throw new Error(`ReviewReply count too low: ${reviewReplyCount}`);
  if (installmentCount < 15) throw new Error(`Installment count too low: ${installmentCount}`);
  if (shippingCount < 150) throw new Error(`Shipping count too low: ${shippingCount}`);
  if (paymentCount < 180) throw new Error(`Payment count too low: ${paymentCount}`);
  if (voucherCount < 5) throw new Error(`Voucher count too low: ${voucherCount}`);

  // Test password verification for sample customer and admin
  const sampleCustomer = await prisma.user.findFirst({
    where: { email: { not: 'admin@mobilecommerce.vn' } },
  });
  if (!sampleCustomer) throw new Error('No customer user found');
  const validCustomerPass = await bcrypt.compare('Password@123', sampleCustomer.passwordHash);
  if (!validCustomerPass) throw new Error('Password@123 failed verification on customer user');

  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@mobilecommerce.vn' },
  });
  if (!adminUser) throw new Error('No admin user found');
  const validAdminPass = await bcrypt.compare('Password@123', adminUser.passwordHash);
  if (!validAdminPass) throw new Error('Password@123 failed verification on admin user');

  // Verify IMEIs are valid Luhn
  const sampleImeis = await prisma.imeiDevice.findMany({ take: 20 });
  if (sampleImeis.length === 0) throw new Error('No IMEI devices found to validate');
  for (const item of sampleImeis) {
    if (!validateImei(item.imei)) {
      throw new Error(`Invalid Luhn IMEI found in DB: ${item.imei}`);
    }
  }

  // Verify Warranty linkage
  const sampleWarranty = await prisma.warranty.findFirst({
    include: { user: true, productVariant: true, imeiDevice: true },
  });
  if (!sampleWarranty) {
    throw new Error('No warranty record found to validate');
  }
  if (!sampleWarranty.imeiDevice) {
    throw new Error('Warranty missing IMEI link');
  }
  if (!sampleWarranty.user) {
    throw new Error('Warranty missing user link');
  }
  if (!sampleWarranty.productVariant) {
    throw new Error('Warranty missing product variant link');
  }

  console.log('✅ ALL SEED INTEGRITY CHECKS PASSED!');
}

verify()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
