import 'dotenv/config';
import { PrismaClient, OrderStatus, ImeiStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function verifyPagination() {
  console.log('🔍 Running Fullstack Server-Side Pagination Integration Tests...\n');

  // 1. ORDERS PAGINATION
  console.log('--- 1. Testing Orders Pagination (200 Orders Seeded) ---');
  const [totalOrders, page1Orders] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const page2Orders = await prisma.order.findMany({
    skip: 10,
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`  - Total Orders: ${totalOrders}`);
  console.log(`  - Page 1 Orders Count: ${page1Orders.length}`);
  console.log(`  - Page 2 Orders Count: ${page2Orders.length}`);

  if (totalOrders < 180) throw new Error(`Expected at least 180 orders, got: ${totalOrders}`);
  if (page1Orders.length !== 10) throw new Error(`Expected 10 orders on page 1, got: ${page1Orders.length}`);
  if (page2Orders.length !== 10) throw new Error(`Expected 10 orders on page 2, got: ${page2Orders.length}`);
  if (page1Orders[0].id === page2Orders[0].id) {
    throw new Error('Page 1 and Page 2 should have distinct items!');
  }
  console.log('  ✅ Orders pagination passed with distinct page slices.');

  // 2. IMEI DEVICES PAGINATION
  console.log('\n--- 2. Testing IMEI Devices Pagination (1,500+ IMEIs) ---');
  const [totalImeis, page1Imeis] = await Promise.all([
    prisma.imeiDevice.count(),
    prisma.imeiDevice.findMany({
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const page2Imeis = await prisma.imeiDevice.findMany({
    skip: 10,
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`  - Total IMEIs: ${totalImeis}`);
  console.log(`  - Page 1 IMEIs Count: ${page1Imeis.length}`);
  console.log(`  - Page 2 IMEIs Count: ${page2Imeis.length}`);

  if (totalImeis < 300) throw new Error(`Expected >= 300 IMEIs, got: ${totalImeis}`);
  if (page1Imeis.length !== 10) throw new Error(`Expected 10 IMEIs on page 1, got: ${page1Imeis.length}`);
  if (page2Imeis.length !== 10) throw new Error(`Expected 10 IMEIs on page 2, got: ${page2Imeis.length}`);
  if (page1Imeis[0].id === page2Imeis[0].id) {
    throw new Error('Page 1 and Page 2 should have distinct items!');
  }
  console.log('  ✅ IMEI devices pagination passed with distinct page slices.');

  // 3. PRODUCTS PAGINATION
  console.log('\n--- 3. Testing Products Pagination (54 Products Seeded) ---');
  const [totalProducts, page1Products] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      skip: 0,
      take: 12,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const page2Products = await prisma.product.findMany({
    skip: 12,
    take: 12,
    orderBy: { createdAt: 'desc' },
  });

  const totalPages = Math.ceil(totalProducts / 12);
  console.log(`  - Total Products: ${totalProducts}`);
  console.log(`  - Page 1 Products Count: ${page1Products.length}`);
  console.log(`  - Page 2 Products Count: ${page2Products.length}`);
  console.log(`  - Total Pages (12/page): ${totalPages}`);

  if (totalProducts < 40) throw new Error(`Expected >= 40 products, got: ${totalProducts}`);
  if (page1Products.length !== 12) throw new Error(`Expected 12 products on page 1, got: ${page1Products.length}`);
  if (page2Products.length !== 12) throw new Error(`Expected 12 products on page 2, got: ${page2Products.length}`);
  if (page1Products[0].id === page2Products[0].id) {
    throw new Error('Page 1 and Page 2 should have distinct items!');
  }
  console.log('  ✅ Products pagination passed with distinct page slices.');

  console.log('\n🎉 ALL FULLSTACK PAGINATION INTEGRATION CHECKS PASSED!');
}

verifyPagination()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
