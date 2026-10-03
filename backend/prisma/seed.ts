import 'dotenv/config';
import path from 'path';
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

// R2 public base URL for seeded product/variant images.
// Deterministic key convention: products/<source-basename-without-ext>.webp
const R2 =
  process.env.CLOUDFLARE_R2_PUBLIC_URL ??
  'https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev';

// ============================================================
// MAIN SEED SCRIPT
// ============================================================
async function main() {
  console.log('🚀 Starting MobileCommerce Big Refactor seed...');

  // 1. ROLES
  console.log('--- 1. Seeding Roles ---');
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
    console.log(`  Role: ${role.name} (${role.id})`);
  }

  // 2. USERS
  console.log('\n--- 2. Seeding Users ---');
  const usersToSeed = [
    {
      email: 'admin@mobilecommerce.vn',
      plainPass: 'Admin@123456',
      firstName: 'Admin',
      lastName: 'System',
      phone: '0901000001',
      role: 'ADMIN',
    },
    {
      email: 'staff@mobilecommerce.vn',
      plainPass: 'Staff@123456',
      firstName: 'Staff',
      lastName: 'Support',
      phone: '0901000002',
      role: 'STAFF',
    },
    {
      email: 'customer@gmail.com',
      plainPass: 'Customer@123456',
      firstName: 'Nguyen',
      lastName: 'Customer',
      phone: '0901000003',
      role: 'USER',
    },
  ];

  for (const u of usersToSeed) {
    const passwordHash = await bcrypt.hash(u.plainPass, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });

    const roleId = roleMap[u.role];
    if (roleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId,
        },
      });
    }
    console.log(`  User: ${user.email} -> Role ${u.role}`);
  }

  // 3. BRANDS
  console.log('\n--- 3. Seeding Brands ---');
  const brandsData = [
    {
      name: 'Apple',
      slug: 'apple',
      description: 'Apple Inc. - Designed in California, renowned for iPhones, iPads, and MacBooks.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    },
    {
      name: 'Samsung',
      slug: 'samsung',
      description: 'Samsung Electronics - Global leader in smartphones, Galaxy S, and Z Fold series.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',
    },
    {
      name: 'Xiaomi',
      slug: 'xiaomi',
      description: 'Xiaomi - Cutting-edge flagship photography with Leica optics and competitive pricing.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg',
    },
    {
      name: 'Sony',
      slug: 'sony',
      description: 'Sony Xperia - Professional mobile cinematography with Alpha camera integration.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg',
    },
    {
      name: 'OPPO',
      slug: 'oppo',
      description: 'OPPO - Pioneers in portrait photography and ultra-fast SuperVOOC charging.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/OPPO_Logo.svg',
    },
  ];

  const brandMap: Record<string, string> = {};
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {
        name: b.name,
        description: b.description,
        logoUrl: b.logoUrl,
        isActive: true,
      },
      create: {
        name: b.name,
        slug: b.slug,
        description: b.description,
        logoUrl: b.logoUrl,
        isActive: true,
      },
    });
    brandMap[b.name] = brand.id;
    console.log(`  Brand: ${brand.name}`);
  }

  // 4. CATEGORIES
  console.log('\n--- 4. Seeding Categories ---');
  const categoriesData = [
    {
      name: 'Flagship',
      slug: 'flagship',
      description: 'Dòng điện thoại cao cấp nhất từ các thương hiệu hàng đầu',
      sortOrder: 1,
    },
    {
      name: 'Tầm trung',
      slug: 'tam-trung',
      description: 'Điện thoại phân khúc tầm trung với hiệu năng vượt trội trong tầm giá',
      sortOrder: 2,
    },
    {
      name: 'Gaming Phone',
      slug: 'gaming-phone',
      description: 'Thiết bị chuyên biệt cho game thủ với tản nhiệt và tần số quét cao',
      sortOrder: 3,
    },
    {
      name: 'Máy tính bảng',
      slug: 'may-tinh-bang',
      description: 'Máy tính bảng phục vụ công việc, học tập và giải trí đỉnh cao',
      sortOrder: 4,
    },
    {
      name: 'Phụ kiện',
      slug: 'phu-kien',
      description: 'Phụ kiện chính hãng: bao da, ốp lưng, củ sạc nhanh, tai nghe',
      sortOrder: 5,
    },
  ];

  const categoryMap: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
        isActive: true,
      },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        sortOrder: c.sortOrder,
        isActive: true,
      },
    });
    categoryMap[c.name] = cat.id;
    console.log(`  Category: ${cat.name}`);
  }

  // 5. PRODUCTS & VARIANTS
  console.log('\n--- 5. Seeding Products & Variants ---');
  const productsToSeed = [
    {
      name: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      brand: 'Apple',
      category: 'Flagship',
      description: 'iPhone 15 Pro Max sở hữu khung viền Titan chuẩn hàng không vũ trụ, chip A17 Pro đem lại hiệu năng đồ họa thế hệ mới, nút Tác Vụ đa năng và camera zoom quang học 5x sắc nét.',
      shortDescription: 'Flagship đỉnh cao khung viền Titan từ Apple',
      thumbnailUrl: `${R2}/products/iphone-15-pro-max.webp`,
      variants: [
        {
          sku: 'IPHONE15PM-256-NAT',
          name: 'iPhone 15 Pro Max 256GB - Titan Tự Nhiên',
          color: 'Titan Tự Nhiên',
          storage: '256GB',
          ram: '8GB',
          price: 29990000,
          compareAtPrice: 34990000,
          costPrice: 26000000,
          imageUrl: `${R2}/products/iphone-15-pro-max.webp`,
        },
        {
          sku: 'IPHONE15PM-512-NAT',
          name: 'iPhone 15 Pro Max 512GB - Titan Tự Nhiên',
          color: 'Titan Tự Nhiên',
          storage: '512GB',
          ram: '8GB',
          price: 35990000,
          compareAtPrice: 40990000,
          costPrice: 31000000,
          imageUrl: `${R2}/products/iphone-15-pro-max.webp`,
        },
        {
          sku: 'IPHONE15PM-1TB-NAT',
          name: 'iPhone 15 Pro Max 1TB - Titan Tự Nhiên',
          color: 'Titan Tự Nhiên',
          storage: '1TB',
          ram: '8GB',
          price: 41990000,
          compareAtPrice: 46990000,
          costPrice: 36000000,
          imageUrl: `${R2}/products/iphone-15-pro-max.webp`,
        },
        {
          sku: 'IPHONE15PM-256-BLU',
          name: 'iPhone 15 Pro Max 256GB - Titan Xanh',
          color: 'Titan Xanh',
          storage: '256GB',
          ram: '8GB',
          price: 29990000,
          compareAtPrice: 34990000,
          costPrice: 26000000,
          imageUrl: `${R2}/products/iphone-15-pro-max.webp`,
        },
        {
          sku: 'IPHONE15PM-512-BLU',
          name: 'iPhone 15 Pro Max 512GB - Titan Xanh',
          color: 'Titan Xanh',
          storage: '512GB',
          ram: '8GB',
          price: 35990000,
          compareAtPrice: 40990000,
          costPrice: 31000000,
          imageUrl: `${R2}/products/iphone-15-pro-max.webp`,
        },
        {
          sku: 'IPHONE15PM-1TB-BLU',
          name: 'iPhone 15 Pro Max 1TB - Titan Xanh',
          color: 'Titan Xanh',
          storage: '1TB',
          ram: '8GB',
          price: 41990000,
          compareAtPrice: 46990000,
          costPrice: 36000000,
          imageUrl: `${R2}/products/iphone-15-pro-max.webp`,
        },
      ],
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      brand: 'Samsung',
      category: 'Flagship',
      description: 'Galaxy S24 Ultra khởi nguyên quyền năng Galaxy AI mới, trang bị chip Snapdragon 8 Gen 3 for Galaxy, khung viền Titan và bút S Pen thần thánh.',
      shortDescription: 'Quyền năng Galaxy AI, thiết kế Titan đột phá',
      thumbnailUrl: `${R2}/products/samsung-galaxy-s24-ultra.webp`,
      variants: [
        {
          sku: 'S24U-12-256-GRY',
          name: 'Galaxy S24 Ultra 12GB-256GB - Xám Titan',
          color: 'Xám Titan',
          storage: '256GB',
          ram: '12GB',
          price: 27990000,
          compareAtPrice: 31990000,
          costPrice: 24000000,
          imageUrl: `${R2}/products/samsung-galaxy-s24-ultra.webp`,
        },
        {
          sku: 'S24U-12-512-GRY',
          name: 'Galaxy S24 Ultra 12GB-512GB - Xám Titan',
          color: 'Xám Titan',
          storage: '512GB',
          ram: '12GB',
          price: 31990000,
          compareAtPrice: 36990000,
          costPrice: 27500000,
          imageUrl: `${R2}/products/samsung-galaxy-s24-ultra.webp`,
        },
        {
          sku: 'S24U-12-256-BLK',
          name: 'Galaxy S24 Ultra 12GB-256GB - Đen Titan',
          color: 'Đen Titan',
          storage: '256GB',
          ram: '12GB',
          price: 27990000,
          compareAtPrice: 31990000,
          costPrice: 24000000,
          imageUrl: `${R2}/products/samsung-galaxy-s24-ultra.webp`,
        },
        {
          sku: 'S24U-12-512-BLK',
          name: 'Galaxy S24 Ultra 12GB-512GB - Đen Titan',
          color: 'Đen Titan',
          storage: '512GB',
          ram: '12GB',
          price: 31990000,
          compareAtPrice: 36990000,
          costPrice: 27500000,
          imageUrl: `${R2}/products/samsung-galaxy-s24-ultra.webp`,
        },
      ],
    },
    {
      name: 'Xiaomi 14 Ultra',
      slug: 'xiaomi-14-ultra',
      brand: 'Xiaomi',
      category: 'Flagship',
      description: 'Xiaomi 14 Ultra đồng chế tác Leica với 4 camera 50MP, cảm biến chính 1 inch LYT-900 khẩu độ vô cấp f/1.63-f/4.0, chip Snapdragon 8 Gen 3 cực đỉnh.',
      shortDescription: 'Đỉnh cao nhiếp ảnh di động đồng chế tác cùng Leica',
      thumbnailUrl: `${R2}/products/xiaomi-14-ultra.webp`,
      variants: [
        {
          sku: 'MI14U-16-512-BLK',
          name: 'Xiaomi 14 Ultra 16GB-512GB - Đen',
          color: 'Đen',
          storage: '512GB',
          ram: '16GB',
          price: 26990000,
          compareAtPrice: 29990000,
          costPrice: 23000000,
          imageUrl: `${R2}/products/xiaomi-14-ultra.webp`,
        },
        {
          sku: 'MI14U-16-512-WHT',
          name: 'Xiaomi 14 Ultra 16GB-512GB - Trắng',
          color: 'Trắng',
          storage: '512GB',
          ram: '16GB',
          price: 26990000,
          compareAtPrice: 29990000,
          costPrice: 23000000,
          imageUrl: `${R2}/products/xiaomi-14-ultra.webp`,
        },
      ],
    },
  ];

  let variantCounter = 100;

  for (const p of productsToSeed) {
    const brandId = brandMap[p.brand];
    const categoryId = categoryMap[p.category];

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        brandId,
        categoryId,
        description: p.description,
        shortDescription: p.shortDescription,
        condition: ProductCondition.NEW,
        status: ProductStatus.ACTIVE,
        thumbnailUrl: p.thumbnailUrl,
        warrantyMonths: 12,
      },
      create: {
        name: p.name,
        slug: p.slug,
        brandId,
        categoryId,
        description: p.description,
        shortDescription: p.shortDescription,
        condition: ProductCondition.NEW,
        status: ProductStatus.ACTIVE,
        thumbnailUrl: p.thumbnailUrl,
        warrantyMonths: 12,
      },
    });

    console.log(`  Product: ${product.name}`);

    for (const v of p.variants) {
      variantCounter++;
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          name: v.name,
          productId: product.id,
          color: v.color,
          storage: v.storage,
          ram: v.ram,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          costPrice: v.costPrice,
          imageUrl: v.imageUrl,
          isActive: true,
        },
        create: {
          sku: v.sku,
          name: v.name,
          productId: product.id,
          color: v.color,
          storage: v.storage,
          ram: v.ram,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          costPrice: v.costPrice,
          imageUrl: v.imageUrl,
          isActive: true,
        },
      });

      // 6. INVENTORY
      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: {
          quantity: 10,
          availableQty: 10,
          reservedQty: 0,
          reorderLevel: 2,
        },
        create: {
          variantId: variant.id,
          quantity: 10,
          availableQty: 10,
          reservedQty: 0,
          reorderLevel: 2,
        },
      });

      // 7. IMEIs (At least 5 valid Luhn IMEIs per variant)
      for (let i = 1; i <= 5; i++) {
        // TAC (8 digits) + Fac/Serial (6 digits) = 14 digits prefix
        // e.g. 35890 + variantCounter (3 digits) + seq (6 digits)
        const prefix14 = `35890${String(variantCounter).padStart(3, '0')}${String(i).padStart(6, '0')}`;
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
            purchasePrice: v.costPrice,
            serialNumber,
          },
          create: {
            variantId: variant.id,
            imei: imeiNumber,
            serialNumber,
            status: ImeiStatus.AVAILABLE,
            purchasePrice: v.costPrice,
          },
        });
      }

      console.log(`    Variant: ${variant.name} (SKU: ${variant.sku}) -> 5 IMEIs & Stock: 10`);
    }
  }

  // 8. VOUCHERS
  console.log('\n--- 6. Seeding Vouchers ---');
  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const vouchersData = [
    {
      code: 'WELCOME50',
      name: 'Chào mừng thành viên mới 50K',
      description: 'Giảm ngay 50.000đ cho đơn hàng đầu tiên từ 200.000đ',
      type: VoucherType.FIXED_AMOUNT,
      value: 50000,
      minOrderValue: 200000,
      maxDiscountAmount: 50000,
      usageLimit: 1000,
      startAt: new Date(now.getTime() - 86400000),
      endAt: nextYear,
      isActive: true,
    },
    {
      code: 'FREESHIP',
      name: 'Miễn phí vận chuyển toàn quốc',
      description: 'Miễn phí vận chuyển 30.000đ cho đơn hàng từ 100.000đ',
      type: VoucherType.FREE_SHIPPING,
      value: 30000,
      minOrderValue: 100000,
      maxDiscountAmount: 30000,
      usageLimit: 5000,
      startAt: new Date(now.getTime() - 86400000),
      endAt: nextYear,
      isActive: true,
    },
    {
      code: 'VIP10',
      name: 'Khách hàng thân thiết VIP giảm 10%',
      description: 'Giảm 10% tối đa 1.000.000đ cho đơn hàng từ 500.000đ',
      type: VoucherType.PERCENTAGE,
      value: 10,
      minOrderValue: 500000,
      maxDiscountAmount: 1000000,
      usageLimit: 500,
      startAt: new Date(now.getTime() - 86400000),
      endAt: nextYear,
      isActive: true,
    },
  ];

  for (const vo of vouchersData) {
    const voucher = await prisma.voucher.upsert({
      where: { code: vo.code },
      update: vo,
      create: vo,
    });
    console.log(`  Voucher: ${voucher.code} - ${voucher.name}`);
  }

  console.log('\n✅ MobileCommerce seed finished successfully!');
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
