require('dotenv').config();
const { PrismaClient, ShippingMethod } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedShippingMethods() {
  console.log('📦 Updating and Seeding Realistic Shipping Methods for Orders...');

  const orders = await prisma.order.findMany({
    select: { id: true, subtotal: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${orders.length} total orders.`);

  let economyCount = 0;
  let standardCount = 0;
  let expressCount = 0;

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    let method;
    let fee = 0;
    const subtotal = Number(order.subtotal);

    if (i % 7 === 0) {
      method = ShippingMethod.ECONOMY;
      fee = subtotal > 500000 ? 0 : 15000;
      economyCount++;
    } else if (i % 4 === 0) {
      method = ShippingMethod.EXPRESS_2H;
      fee = subtotal > 500000 ? 30000 : 60000;
      expressCount++;
    } else {
      method = ShippingMethod.STANDARD;
      fee = subtotal > 500000 ? 0 : 30000;
      standardCount++;
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        shippingMethod: method,
        shippingFee: fee,
      },
    });
  }

  console.log(`✅ Updated ${orders.length} orders:`);
  console.log(`   - STANDARD: ${standardCount}`);
  console.log(`   - EXPRESS_2H: ${expressCount}`);
  console.log(`   - ECONOMY: ${economyCount}`);
}

seedShippingMethods()
  .catch((e) => {
    console.error('Failed to update shipping methods:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
