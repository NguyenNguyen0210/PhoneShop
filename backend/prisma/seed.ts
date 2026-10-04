import 'dotenv/config';
import {
  PrismaClient,
  UserStatus,
  ProductStatus,
  ProductCondition,
  ImeiStatus,
  VoucherType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

import { generateLuhnImei, validateImei } from '../src/common/utils/imei.util';
export { generateLuhnImei, validateImei };

import { seedCustomersAndAddresses } from './seed_modules/customers';
import { seedCatalog } from './seed_modules/catalog';
import { seedOrdersAndInstallments } from './seed_modules/orders_and_installments';
import { seedFeedbackAndAftersales } from './seed_modules/feedback_and_warranties';

// R2 public base URL for seeded product/variant images.
const R2 =
  process.env.CLOUDFLARE_R2_PUBLIC_URL ??
  'https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev';

// ============================================================
// CASCADE SAFE CLEANUP
// ============================================================
async function cleanTransactionsAndCustomers() {
  console.log('🧹 [1/7] Cleaning previous transaction and demo customer data...');

  // Reverse foreign-key dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.idempotencyRecord.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.warranty.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.returnItem.deleteMany({});
  await prisma.return.deleteMany({});
  await prisma.reviewReply.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.voucherUsage.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.installmentApplication.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.shipping.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.imeiDevice.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.refreshToken.deleteMany({});

  // Retain core system accounts (admin & staff)
  const coreEmails = ['admin@phoneshop.vn', 'staff@phoneshop.vn'];
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

  console.log('  ✔ Transactional tables and previous demo customers cleared.');
}

// ============================================================
// MAIN SEED SCRIPT
// ============================================================
async function main() {
  console.log('🚀 Starting Realistic Phone Shop E-Commerce Seed Pipeline...\n');

  // Pre-calculate common password hash for high speed
  const COMMON_PASSWORD_HASH = await bcrypt.hash('Password@123', 10);

  // 1. SAFE CASCADE CLEANUP
  await cleanTransactionsAndCustomers();

  // 2. ROLES
  console.log('\n🔐 [2/7] Seeding Roles & Core Staff Accounts...');
  const roles = [
    { name: 'ADMIN', description: 'System Administrator' },
    { name: 'STAFF', description: 'Store Operations Staff' },
    { name: 'USER', description: 'Standard Customer' },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    roleMap[r.name] = role.id;
  }

  // Core admin & staff accounts
  const coreAccountsToSeed = [
    { email: 'admin@phoneshop.vn', role: 'ADMIN', firstName: 'Admin', lastName: 'System', phone: '0901000001' },
    { email: 'staff@phoneshop.vn', role: 'STAFF', firstName: 'Staff', lastName: 'Support', phone: '0901000002' },
  ];

  let primaryStaffId = '';
  for (const acc of coreAccountsToSeed) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        passwordHash: COMMON_PASSWORD_HASH,
        firstName: acc.firstName,
        lastName: acc.lastName,
        phone: acc.phone,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
      create: {
        email: acc.email,
        passwordHash: COMMON_PASSWORD_HASH,
        firstName: acc.firstName,
        lastName: acc.lastName,
        phone: acc.phone,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleMap[acc.role] } },
      update: {},
      create: { userId: user.id, roleId: roleMap[acc.role] },
    });

    if (acc.email === 'staff@phoneshop.vn') {
      primaryStaffId = user.id;
    }
  }

  console.log('  ✔ Admin (admin@phoneshop.vn) & Staff (staff@phoneshop.vn) ready.');

  // 3. SEED 40 VIETNAMESE CUSTOMERS & MULTI-PROVINCE ADDRESSES
  console.log('\n👥 [3/7] Seeding 40 Vietnamese Customers & Addresses...');
  const customers = await seedCustomersAndAddresses(
    prisma,
    roleMap['USER'],
    COMMON_PASSWORD_HASH
  );
  console.log(`  ✔ Seeded ${customers.length} verified customers with full addresses.`);

  // 4. SEED CATALOG (brands, categories, 60 products, ~180 variants)
  console.log('\n📱 [4/7] Seeding Product Catalog (filter-complete)...');
  await seedCatalog(prisma);
  const totalProducts = await prisma.product.count();
  const totalVariants = await prisma.productVariant.count({ where: { isActive: true } });
  console.log(`  ✔ Catalog verified: ${totalProducts} products and ${totalVariants} active variants.`);

  if (totalVariants === 0) {
    throw new Error('No active product variants found in database to seed orders.');
  }

  // 5. SEED ORDERS, SHIPPINGS, PAYMENTS & INSTALLMENTS
  console.log('\n📦 [5/7] Seeding 200 Lifecycle Orders, Shippings, Payments & Installments...');
  let imeiSeq = 100000;
  async function createImeiForVariant(
    variantId: string,
    sku: string,
    costPrice: any,
    status: ImeiStatus
  ) {
    imeiSeq++;
    const prefix14 = `35890${String(imeiSeq).padStart(9, '0')}`;
    const imeiNumber = generateLuhnImei(prefix14);
    const cleanSku = sku.replace(/[^A-Za-z0-9]/g, '');
    const serialNumber = `SN-${cleanSku}-${String(imeiSeq).slice(-5)}`;

    return prisma.imeiDevice.create({
      data: {
        variantId,
        imei: imeiNumber,
        serialNumber,
        status,
        purchasePrice: costPrice,
      },
    });
  }

  const orderResult = await seedOrdersAndInstallments(
    prisma,
    customers,
    primaryStaffId,
    createImeiForVariant
  );
  console.log(`  ✔ Seeded 200 orders (${orderResult.deliveredItems.length} delivered items with real IMEIs).`);

  // 6. SEED FEEDBACK, WARRANTIES, RETURNS, VOUCHERS, CARTS & WISHLISTS
  console.log('\n⭐ [6/7] Seeding Reviews, Staff Replies, Warranties, Returns, Carts & Wishlists...');
  await seedFeedbackAndAftersales(prisma, customers, orderResult, primaryStaffId);
  console.log('  ✔ Seeded warranties, reviews, staff replies, vouchers, returns, carts and wishlists.');

  // 7. WAREHOUSE STOCK & AVAILABLE IMEIS
  console.log('\n🏭 [7/7] Generating Ready Warehouse Stock (AVAILABLE IMEIs & Inventory)...');
  const activeVariants = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: { id: true, sku: true, costPrice: true },
  });

  // Count existing sold IMEIs grouped by variant in a single query
  const soldCounts = await prisma.imeiDevice.groupBy({
    by: ['variantId'],
    where: { status: ImeiStatus.SOLD },
    _count: { id: true },
  });
  const soldCountMap = new Map<string, number>();
  for (const sc of soldCounts) {
    soldCountMap.set(sc.variantId, sc._count.id);
  }

  const allAvailableImeis: any[] = [];
  const inventoryPayloads: any[] = [];
  // Varied stock for inStock filter coverage: out (0) / low (2-5) / medium (10-15) / high (25-40).
  // Deterministic by variant index so re-runs are stable.
  const stockForIndex = (idx: number): number => {
    const m = idx % 10;
    if (m === 0) return 0; // ~10% out of stock → test "Hết hàng" + inStock=false
    if (m === 1) return 2; // low stock
    if (m === 2) return 5; // low stock
    if (m === 3 || m === 4) return 10; // medium
    if (m === 5 || m === 6) return 15; // medium
    if (m === 7) return 25; // high
    if (m === 8) return 40; // high
    return 12; // medium
  };

  for (let vi = 0; vi < activeVariants.length; vi++) {
    const v = activeVariants[vi];
    const soldCount = soldCountMap.get(v.id) ?? 0;
    const availableToAdd = stockForIndex(vi);
    const totalStock = soldCount + availableToAdd;

    for (let i = 0; i < availableToAdd; i++) {
      imeiSeq++;
      const prefix14 = `35890${String(imeiSeq).padStart(9, '0')}`;
      const imeiNumber = generateLuhnImei(prefix14);
      const cleanSku = v.sku.replace(/[^A-Za-z0-9]/g, '');
      const serialNumber = `SN-${cleanSku}-${String(imeiSeq).slice(-5)}`;

      allAvailableImeis.push({
        variantId: v.id,
        imei: imeiNumber,
        serialNumber,
        status: ImeiStatus.AVAILABLE,
        purchasePrice: v.costPrice,
      });
    }

    inventoryPayloads.push({
      variantId: v.id,
      quantity: totalStock,
      availableQty: availableToAdd,
      reservedQty: 0,
      reorderLevel: 5,
    });
  }

  // Fast bulk insert IMEIs in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < allAvailableImeis.length; i += CHUNK_SIZE) {
    const chunk = allAvailableImeis.slice(i, i + CHUNK_SIZE);
    await prisma.imeiDevice.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  // Upsert inventories
  for (const inv of inventoryPayloads) {
    await prisma.inventory.upsert({
      where: { variantId: inv.variantId },
      update: {
        quantity: inv.quantity,
        availableQty: inv.availableQty,
        reservedQty: inv.reservedQty,
        reorderLevel: inv.reorderLevel,
      },
      create: inv,
    });
  }

  console.log(`  ✔ Stock and available IMEIs provisioned across ${activeVariants.length} variants.`);

  console.log('\n🎉 ALL REALISTIC E-COMMERCE DATA SEEDED SUCCESSFULLY!');
}

if (require.main === module || !process.env.JEST_WORKER_ID) {
  main()
    .catch((e) => {
      console.error('❌ Seeding failed with error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
