import 'dotenv/config';
import { PrismaClient, PaymentMethod } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { validateImei } from '../src/common/utils/imei.util';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined in environment variables');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function verifySeed() {
  console.log('🔍 Running Seed Data Integrity Checks...\n');

  // Count queries
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

  // Formatted summary of statistics
  console.log(`📊 Statistics Summary:
  - Users: ${userCount} (Target: >= 40)
  - Addresses: ${addressCount} (Target: >= 40)
  - Orders: ${orderCount} (Target: >= 180)
  - Order Items: ${orderItemCount} (Target: >= 200)
  - IMEIs: ${imeiCount} (Target: >= 300)
  - Warranties: ${warrantyCount} (Target: >= 100)
  - Reviews: ${reviewCount} (Target: >= 100)
  - Review Replies: ${reviewReplyCount} (Target: >= 40)
  - Installment Applications: ${installmentCount} (Target: >= 15)
  - Shippings: ${shippingCount} (Target: >= 150)
  - Payments: ${paymentCount} (Target: >= 180)
  - Vouchers: ${voucherCount} (Target: >= 5)
`);

  // Assertion checks for minimum record counts
  if (userCount < 40) throw new Error(`User count too low: ${userCount} < 40`);
  if (addressCount < 40) throw new Error(`Address count too low: ${addressCount} < 40`);
  if (orderCount < 180) throw new Error(`Order count too low: ${orderCount} < 180`);
  if (orderItemCount < 200) throw new Error(`OrderItem count too low: ${orderItemCount} < 200`);
  if (imeiCount < 300) throw new Error(`IMEI count too low: ${imeiCount} < 300`);
  if (warrantyCount < 100) throw new Error(`Warranty count too low: ${warrantyCount} < 100`);
  if (reviewCount < 100) throw new Error(`Review count too low: ${reviewCount} < 100`);
  if (reviewReplyCount < 40) throw new Error(`ReviewReply count too low: ${reviewReplyCount} < 40`);
  if (installmentCount < 15) throw new Error(`InstallmentApplication count too low: ${installmentCount} < 15`);
  if (shippingCount < 150) throw new Error(`Shipping count too low: ${shippingCount} < 150`);
  if (paymentCount < 180) throw new Error(`Payment count too low: ${paymentCount} < 180`);
  if (voucherCount < 5) throw new Error(`Voucher count too low: ${voucherCount} < 5`);

  // Password verification: Find a customer user (email != 'admin@mobilecommerce.vn') and test bcrypt.compare
  const customerUser = await prisma.user.findFirst({
    where: { email: { not: 'admin@mobilecommerce.vn' } },
  });
  if (!customerUser) {
    throw new Error('No customer user found (email != admin@mobilecommerce.vn)');
  }
  const isPasswordValid = await bcrypt.compare('Password@123', customerUser.passwordHash);
  if (!isPasswordValid) {
    throw new Error(`Password verification failed for customer user: ${customerUser.email}`);
  }
  console.log(`✅ Customer password verified successfully for: ${customerUser.email}`);

  // Luhn IMEI verification: Fetch 30 sample IMEI devices and verify validateImei
  const sampleImeis = await prisma.imeiDevice.findMany({ take: 30 });
  if (sampleImeis.length < 30) {
    throw new Error(`Expected at least 30 IMEI devices to sample, but found: ${sampleImeis.length}`);
  }
  for (const item of sampleImeis) {
    if (!validateImei(item.imei)) {
      throw new Error(`Invalid Luhn IMEI found in database: ${item.imei} (Device ID: ${item.id})`);
    }
  }
  console.log(`✅ 30 sample IMEIs verified using Luhn algorithm.`);

  // Warranty integrity: Find at least one warranty and verify valid imeiDeviceId, userId, productVariantId, and orderItemId
  const sampleWarranty = await prisma.warranty.findFirst({
    where: {
      imeiDeviceId: { not: null },
    },
    include: {
      user: true,
      productVariant: true,
      orderItem: true,
      imeiDevice: true,
    },
  });
  if (!sampleWarranty) {
    throw new Error('No warranty found with imeiDeviceId');
  }
  if (!sampleWarranty.imeiDeviceId) {
    throw new Error(`Warranty ${sampleWarranty.id} is missing imeiDeviceId`);
  }
  if (!sampleWarranty.userId) {
    throw new Error(`Warranty ${sampleWarranty.id} is missing userId`);
  }
  if (!sampleWarranty.productVariantId) {
    throw new Error(`Warranty ${sampleWarranty.id} is missing productVariantId`);
  }
  if (!sampleWarranty.orderItemId) {
    throw new Error(`Warranty ${sampleWarranty.id} is missing orderItemId`);
  }
  if (!sampleWarranty.user || !sampleWarranty.productVariant || !sampleWarranty.orderItem || !sampleWarranty.imeiDevice) {
    throw new Error(`Warranty ${sampleWarranty.id} relations could not be loaded or are invalid`);
  }
  console.log(`✅ Warranty integrity verified for warranty ID: ${sampleWarranty.id}`);

  // Installment integrity: Find at least one InstallmentApplication and verify it links to an order with PaymentMethod.INSTALLMENT
  const sampleInstallment = await prisma.installmentApplication.findFirst({
    include: {
      order: {
        include: {
          payments: true,
        },
      },
    },
  });
  if (!sampleInstallment) {
    throw new Error('No InstallmentApplication record found');
  }
  if (!sampleInstallment.order) {
    throw new Error(`InstallmentApplication ${sampleInstallment.id} is not linked to any order`);
  }
  const hasInstallmentPayment = sampleInstallment.order.payments.some(
    (payment) => payment.method === PaymentMethod.INSTALLMENT,
  );
  if (!hasInstallmentPayment) {
    throw new Error(
      `InstallmentApplication ${sampleInstallment.id} links to order ${sampleInstallment.order.orderNumber} but payment method is not INSTALLMENT`,
    );
  }
  console.log(`✅ Installment integrity verified for application ID: ${sampleInstallment.id} (Order: ${sampleInstallment.order.orderNumber})`);

  console.log('\n✅ ALL SEED INTEGRITY CHECKS PASSED!');
}

async function run() {
  try {
    await verifySeed();
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Verification failed:', err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

run();
