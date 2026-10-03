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
