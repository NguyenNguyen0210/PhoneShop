import 'dotenv/config';
import path from 'path';
import {
  PrismaClient,
  ProductStatus,
  ProductCondition,
  ImeiStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { generateLuhnImei, validateImei } from '../src/common/utils/imei.util';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Seeding 24 Real Smartphones into Supabase PostgreSQL Database...');

  // 1. Load mock data from frontend
  const mockPath = path.resolve(__dirname, '../../frontend/src/data/mockProducts.ts');
  const { mockProducts, mockBrands, mockCategories } = require(mockPath);

  console.log(`Loaded ${mockBrands.length} brands, ${mockCategories.length} categories, ${mockProducts.length} products.`);

  // 2. Upsert Brands
  console.log('\n--- 1. Seeding Brands ---');
  const brandMap: Record<string, string> = {};
  for (const b of mockBrands) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {
        name: b.name,
        logoUrl: b.logo,
        isActive: true,
      },
      create: {
        name: b.name,
        slug: b.slug,
        description: `${b.name} - Thương hiệu điện thoại thông minh chính hãng.`,
        logoUrl: b.logo,
        isActive: true,
      },
    });
    brandMap[b.name] = brand.id;
    brandMap[b.id] = brand.id;
    console.log(`  Brand: ${brand.name} (${brand.id})`);
  }

  // 3. Upsert Categories
  console.log('\n--- 2. Seeding Categories ---');
  const categoryMap: Record<string, string> = {};
  let sortOrder = 1;
  for (const c of mockCategories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        sortOrder: sortOrder++,
        isActive: true,
      },
      create: {
        name: c.name,
        slug: c.slug,
        description: `Danh mục ${c.name} chính hãng tại PhoneShop.`,
        sortOrder: sortOrder++,
        isActive: true,
      },
    });
    categoryMap[c.name] = cat.id;
    categoryMap[c.id] = cat.id;
    console.log(`  Category: ${cat.name} (${cat.id})`);
  }

  // 4. Upsert Products & Variants
  console.log('\n--- 3. Seeding 24 Smartphones & Variants ---');
  let variantCounter = 200;

  for (const p of mockProducts) {
    const brandId = brandMap[p.brand?.name] || brandMap[p.brandId] || Object.values(brandMap)[0];
    const categoryId = categoryMap[p.category?.name] || categoryMap[p.categoryId] || Object.values(categoryMap)[0];

    const shortDescription = p.specs
      ? Object.entries(p.specs)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' • ')
      : p.name;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        brandId,
        categoryId,
        description: p.description,
        shortDescription,
        condition: ProductCondition.NEW,
        status: ProductStatus.ACTIVE,
        thumbnailUrl: p.thumbnail,
        warrantyMonths: 12,
      },
      create: {
        name: p.name,
        slug: p.slug,
        brandId,
        categoryId,
        description: p.description,
        shortDescription,
        condition: ProductCondition.NEW,
        status: ProductStatus.ACTIVE,
        thumbnailUrl: p.thumbnail,
        warrantyMonths: 12,
      },
    });

    console.log(`  [${product.slug}] ${product.name}`);

    for (const v of p.variants) {
      variantCounter++;
      const costPrice = Math.round(v.price * 0.82);
      const comparePrice = v.compareAtPrice || Math.round(v.price * 1.15);

      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          productId: product.id,
          name: `${p.name} ${v.storage} - ${v.color}`,
          color: v.color,
          storage: v.storage,
          ram: v.ram || '8GB',
          price: v.price,
          compareAtPrice: comparePrice,
          costPrice,
          imageUrl: p.thumbnail,
          isActive: true,
        },
        create: {
          sku: v.sku,
          productId: product.id,
          name: `${p.name} ${v.storage} - ${v.color}`,
          color: v.color,
          storage: v.storage,
          ram: v.ram || '8GB',
          price: v.price,
          compareAtPrice: comparePrice,
          costPrice,
          imageUrl: p.thumbnail,
          isActive: true,
        },
      });

      // Inventory
      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: {
          quantity: v.inventoryQty || 15,
          availableQty: v.inventoryQty || 15,
          reservedQty: 0,
          reorderLevel: 3,
        },
        create: {
          variantId: variant.id,
          quantity: v.inventoryQty || 15,
          availableQty: v.inventoryQty || 15,
          reservedQty: 0,
          reorderLevel: 3,
        },
      });

      // Seed 5 Luhn IMEIs per variant for public warranty lookup & inventory
      for (let i = 1; i <= 5; i++) {
        const prefix14 = `35890${String(variantCounter % 1000).padStart(3, '0')}${String(i).padStart(6, '0')}`;
        const imeiNumber = generateLuhnImei(prefix14);
        const serialNumber = `SN-${v.sku}-${String(i).padStart(4, '0')}`;

        if (!validateImei(imeiNumber)) {
          throw new Error(`Generated invalid Luhn IMEI: ${imeiNumber}`);
        }

        await prisma.imeiDevice.upsert({
          where: { imei: imeiNumber },
          update: {
            variantId: variant.id,
            status: ImeiStatus.AVAILABLE,
            purchasePrice: costPrice,
            serialNumber,
          },
          create: {
            variantId: variant.id,
            imei: imeiNumber,
            serialNumber,
            status: ImeiStatus.AVAILABLE,
            purchasePrice: costPrice,
          },
        });
      }

      console.log(`    -> Variant: ${variant.name} (${variant.sku}) - ${v.price.toLocaleString('vi-VN')}₫ | 5 IMEIs`);
    }
  }

  console.log('\n✅ Successfully seeded all 24 Real Smartphones into Database!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
