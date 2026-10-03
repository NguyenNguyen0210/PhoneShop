import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function verifyWishlist() {
  console.log('🔍 Running Wishlist Feature Integration Verification...\n');

  // 1. Find a sample user and product
  const testUser = await prisma.user.findFirst({
    where: { email: { contains: '@' } },
  });
  if (!testUser) {
    throw new Error('No user found in database to run wishlist verification');
  }

  const testProduct = (await prisma.product.findFirst({
    where: { status: 'ACTIVE', variants: { some: { isActive: true } } },
    include: { brand: true, category: true, variants: { where: { isActive: true } } },
  })) as any;
  if (!testProduct) {
    throw new Error('No published product with active variants found');
  }

  console.log(`- Test User: ${testUser.email} (${testUser.id})`);
  console.log(`- Test Product: ${testProduct.name} (${testProduct.id})`);
  console.log(`  Brand: ${testProduct.brand?.name}`);
  console.log(`  Active Variants: ${testProduct.variants.length}`);

  // 2. Get or create wishlist
  let wishlist = await prisma.wishlist.findUnique({
    where: { userId: testUser.id },
  });
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId: testUser.id },
    });
    console.log(`- Created new wishlist for test user: ${wishlist.id}`);
  } else {
    console.log(`- Found existing wishlist for test user: ${wishlist.id}`);
  }

  // 3. Clear any existing item for this test product
  await prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id, productId: testProduct.id },
  });

  // 4. Add product to wishlist
  const addedItem = await prisma.wishlistItem.create({
    data: {
      wishlistId: wishlist.id,
      productId: testProduct.id,
    },
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          variants: {
            where: { isActive: true },
            include: { inventory: true },
            orderBy: { price: 'asc' },
          },
        },
      },
    },
  });

  console.log(`- Added product to wishlist item: ${addedItem.id}`);
  if (!addedItem.product.brand?.name) {
    throw new Error('Brand was not enriched on wishlist item product!');
  }
  if (!addedItem.product.variants || addedItem.product.variants.length === 0) {
    throw new Error('Variants were not enriched on wishlist item product!');
  }
  console.log(`  ✅ Eager loaded brand: ${addedItem.product.brand.name}`);
  console.log(`  ✅ Eager loaded starting price: ${addedItem.product.variants[0].price} VND`);

  // 5. Query wishlist with full enrichment (matching WishlistService)
  const fullWishlist = await prisma.wishlist.findUnique({
    where: { userId: testUser.id },
    include: {
      items: {
        include: {
          product: {
            include: {
              brand: true,
              category: true,
              variants: {
                where: { isActive: true },
                include: { inventory: true },
                orderBy: { price: 'asc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const matchingItem = fullWishlist?.items.find((i) => i.productId === testProduct.id);
  if (!matchingItem) {
    throw new Error('Could not find newly added item in enriched wishlist query!');
  }
  console.log(`  ✅ Full wishlist query returned ${fullWishlist?.items.length} items`);

  // 6. Test move to cart logic: create or find cart, add item, remove from wishlist
  const primaryVariant = testProduct.variants[0];
  const cart = await prisma.cart.upsert({
    where: { userId: testUser.id },
    create: { userId: testUser.id },
    update: {},
  });

  const existingCartItem = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: primaryVariant.id } },
  });

  if (existingCartItem) {
    await prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: { quantity: { increment: 1 } },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: primaryVariant.id,
        quantity: 1,
        unitPrice: primaryVariant.price,
      },
    });
  }

  // Remove from wishlist
  await prisma.wishlistItem.delete({
    where: { id: matchingItem.id },
  });

  const checkWishlistItemAfterMove = await prisma.wishlistItem.findUnique({
    where: { id: matchingItem.id },
  });
  if (checkWishlistItemAfterMove !== null) {
    throw new Error('Wishlist item was not removed after move-to-cart!');
  }
  console.log('  ✅ Product moved to cart and removed from wishlist successfully.');

  console.log('\n🎉 ALL WISHLIST INTEGRATION VERIFICATION CHECKS PASSED!');
}

verifyWishlist()
  .catch((e) => {
    console.error('❌ Wishlist verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
