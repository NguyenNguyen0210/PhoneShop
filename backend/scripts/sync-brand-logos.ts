import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Downloads official brand SVGs, saves locally to frontend/public/brands/,
// uploads to Cloudflare R2 bucket `brands/<slug>.svg`, and updates PostgreSQL database.

const BRAND_SVGS: Record<string, string> = {
  apple: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/apple.svg',
  samsung: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Samsung_Electronics_logo_%28english%29.svg',
  xiaomi: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg',
  oppo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/oppo.svg',
  google: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/google.svg',
  vivo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/vivo.svg',
  realme: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Realme_logo_SVG.svg',
  asus: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/asus.svg',
  sony: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/sony.svg',
  honor: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/honor.svg',
};

async function main() {
  const publicBrandsDir = path.resolve(__dirname, '../../frontend/public/brands');
  if (!fs.existsSync(publicBrandsDir)) {
    fs.mkdirSync(publicBrandsDir, { recursive: true });
  }

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || 'phoneshop';
  const publicBaseUrl = (
    process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev'
  ).replace(/\/$/, '');

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId || '',
      secretAccessKey: secretAccessKey || '',
    },
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  console.log('--- Fetching & Syncing 10 Brand SVGs ---');

  for (const [slug, url] of Object.entries(BRAND_SVGS)) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'MobileCommerce/1.0' } });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const svgContent = await res.text();
      const localFilePath = path.join(publicBrandsDir, `${slug}.svg`);
      fs.writeFileSync(localFilePath, svgContent, 'utf8');
      console.log(`[LOCAL SAVED] ${slug}.svg (${svgContent.length} bytes)`);

      // Upload to R2
      const r2Key = `brands/${slug}.svg`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: r2Key,
          Body: Buffer.from(svgContent, 'utf8'),
          ContentType: 'image/svg+xml',
        }),
      );
      const r2Url = `${publicBaseUrl}/${r2Key}`;
      console.log(`[R2 UPLOADED] ${r2Key} -> ${r2Url}`);

      // Update in PostgreSQL
      await prisma.brand.updateMany({
        where: { slug },
        data: { logoUrl: r2Url },
      });
      console.log(`[DB UPDATED] Brand slug=${slug} -> ${r2Url}`);
    } catch (err) {
      console.error(`[ERROR] Failed to sync ${slug}:`, (err as Error).message);
    }
  }

  await prisma.$disconnect();
  console.log('--- Done syncing brand logos! ---');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
