require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const sampleImages = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02545?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80',
];

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const reviews = await prisma.review.findMany({
      where: {
        images: {
          isEmpty: true,
        },
      },
      take: 45,
    });

    console.log(`Found ${reviews.length} reviews to update with images...`);

    let count = 0;
    for (let i = 0; i < reviews.length; i++) {
      if (i % 2 === 0) {
        const img1 = sampleImages[i % sampleImages.length];
        const img2 = sampleImages[(i + 1) % sampleImages.length];
        const assignedImages = (i % 4 === 0) ? [img1, img2] : [img1];

        await prisma.review.update({
          where: { id: reviews[i].id },
          data: { images: assignedImages },
        });
        count++;
      }
    }

    console.log(`Successfully backfilled images for ${count} reviews!`);
  } catch (err) {
    console.error('Backfill error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
