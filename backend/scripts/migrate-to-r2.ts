/**
 * Bulk-upload script: converts local frontend images to WebP and uploads them
 * to the Cloudflare R2 `phoneshop` bucket.
 *
 * Usage (from backend/):
 *   npx tsx scripts/migrate-to-r2.ts [--dry-run]
 *
 * Naming (sibling tasks depend on these exact keys):
 *   frontend/public/images/products/<name>.<ext> -> products/<name>.webp
 *   frontend/public/<brand>.png                  -> branding/<brand>.webp
 *
 * Writes backend/scripts/r2-mapping.json (old public path -> new R2 URL).
 * --dry-run lists files + target keys only: no network, no mapping file.
 *
 * Required env (backend/.env, never hardcoded):
 *   CLOUDFLARE_R2_ACCOUNT_ID / BUCKET / ACCESS_KEY_ID / SECRET_ACCESS_KEY / PUBLIC_URL
 */
import 'dotenv/config';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const DRY_RUN = process.argv.includes('--dry-run');

const PRODUCT_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
// favicon.* files are intentionally excluded from this list.
const BRANDING_FILES = [
  'logo.png',
  'logo-text.png',
  'logo-icon.png',
  'logo-horizontal.png',
  'brand-logo.png',
];

interface UploadItem {
  sourcePath: string;
  key: string;
  oldPaths: string[];
}

// __dirname is available because this script runs as CJS (backend is type: commonjs).
const SCRIPT_DIR = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const MAPPING_PATH = join(SCRIPT_DIR, 'r2-mapping.json');

const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function resolvePublicDir(): string {
  const candidates = [
    resolve(SCRIPT_DIR, '..', '..', 'frontend', 'public'),
    resolve(process.cwd(), '..', 'frontend', 'public'),
    resolve(process.cwd(), 'frontend', 'public'),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'images', 'products'))) return dir;
  }
  console.error(`[ERROR] frontend/public directory not found. Tried: ${candidates.join(', ')}`);
  process.exit(1);
}

function collectItems(publicDir: string): { items: UploadItem[]; duplicates: number } {
  const productsDir = join(publicDir, 'images', 'products');
  const items: UploadItem[] = [];
  const seen = new Map<string, string>(); // basename -> winning source filename
  let duplicates = 0;

  const productFiles = readdirSync(productsDir)
    .filter((f) => PRODUCT_EXTS.has(extname(f).toLowerCase()))
    .sort();
  for (const file of productFiles) {
    const base = basename(file, extname(file));
    if (seen.has(base)) {
      duplicates += 1;
      console.warn(`[SKIP] duplicate basename "${base}": ${file} (keeping ${seen.get(base)})`);
      continue;
    }
    seen.set(base, file);
    items.push({
      sourcePath: join(productsDir, file),
      key: `products/${base}.webp`,
      // Second entry covers hardcoded `.png` fallbacks in the frontend.
      oldPaths: [`/images/products/${file}`, `/images/products/${base}.png`],
    });
  }

  for (const file of BRANDING_FILES) {
    const sourcePath = join(publicDir, file);
    if (!existsSync(sourcePath)) {
      console.warn(`[SKIP] branding file not found: ${file}`);
      continue;
    }
    const base = basename(file, extname(file));
    items.push({
      sourcePath,
      key: `branding/${base}.webp`,
      oldPaths: [`/${file}`, `/${base}.png`],
    });
  }
  return { items, duplicates };
}

async function main(): Promise<void> {
  const publicDir = resolvePublicDir();
  const { items, duplicates } = collectItems(publicDir);

  if (DRY_RUN) {
    for (const item of items) {
      console.log(`[DRY-RUN] ${relative(publicDir, item.sourcePath)} -> ${item.key}`);
    }
    const mappingCount = new Set(items.flatMap((i) => i.oldPaths)).size;
    console.log(
      `Dry run: ${items.length} file(s) would be uploaded ` +
        `(${duplicates} duplicate(s) skipped, ${mappingCount} mapping entries). ` +
        `No network calls made; mapping file not written.`,
    );
    return;
  }

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, '');
  const missing: string[] = [];
  if (!accountId) missing.push('CLOUDFLARE_R2_ACCOUNT_ID');
  if (!bucket) missing.push('CLOUDFLARE_R2_BUCKET');
  if (!accessKeyId) missing.push('CLOUDFLARE_R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  if (!publicUrl) missing.push('CLOUDFLARE_R2_PUBLIC_URL');
  if (missing.length > 0) {
    console.error(`[ERROR] Missing required env vars: ${missing.join(', ')}. Add them to backend/.env and retry. Nothing uploaded.`);
    process.exit(1);
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKeyId as string, secretAccessKey: secretAccessKey as string },
  });

  let ok = 0;
  let failures = 0;
  const mapping: Record<string, string> = {};
  for (const item of items) {
    let lastError: unknown = null;
    let done = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !done; attempt += 1) {
      try {
        const body = await sharp(item.sourcePath)
          .resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: 'inside' })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();
        await client.send(
          new PutObjectCommand({ Bucket: bucket, Key: item.key, Body: body, ContentType: 'image/webp' }),
        );
        done = true;
      } catch (err) {
        lastError = err;
        console.error(`[FAIL] ${item.key} (attempt ${attempt}/${MAX_ATTEMPTS}): ${(err as Error)?.message ?? err}`);
        if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
      }
    }
    if (done) {
      ok += 1;
      console.log(`[OK] ${item.key}`);
      const url = `${publicUrl}/${item.key}`;
      for (const oldPath of item.oldPaths) mapping[oldPath] = url;
    } else {
      failures += 1;
      console.error(`[FAIL] ${item.key} failed after ${MAX_ATTEMPTS} attempts: ${(lastError as Error)?.message ?? lastError}`);
    }
  }

  // Only successfully uploaded files are mapped — never map a failed upload.
  writeFileSync(MAPPING_PATH, `${JSON.stringify(mapping, null, 2)}\n`);
  console.log(`Mapping written: ${MAPPING_PATH} (${Object.keys(mapping).length} entries)`);
  console.log(`Uploaded ${ok}/${items.length}, failures ${failures}`);
  process.exitCode = failures > 0 ? 1 : 0;
}

void main().catch((err: unknown) => {
  console.error(`[ERROR] ${(err as Error)?.message ?? err}`);
  process.exit(1);
});
