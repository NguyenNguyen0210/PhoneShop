import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function check() {
  const brands = await prisma.brand.findMany();
  console.log('Brands in DB:', brands.length);
  brands.forEach(b => console.log('  Brand:', b.name, b.slug));

  const categories = await prisma.category.findMany();
  console.log('Categories in DB:', categories.length);
  categories.forEach(c => console.log('  Category:', c.name, c.slug));

  const products = await prisma.product.findMany({ include: { variants: true } });
  console.log('Products in DB:', products.length);
  products.forEach(p => console.log('  Product:', p.name, '| Slug:', p.slug, '| Variants:', p.variants.length));

  await prisma.$disconnect();
}
check().catch(console.error);
