import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Rewrites Product.thumbnailUrl / ProductVariant.imageUrl from legacy
// external CDN URLs to Cloudflare R2 URLs, using backend/scripts/r2-mapping.json
// ({ oldPath: newUrl }) produced by the R2 upload script.
// Run: npx tsx scripts/backfill-db-r2.ts   (from backend/)

const MAPPING_PATH = path.join(__dirname, 'r2-mapping.json');

type Mapping = Record<string, string>;

/** `products/iphone-15-pro-max.jpg` or full URL (query stripped) -> `iphone-15-pro-max` */
function stemOf(raw: string): string {
  const noQuery = raw.split(/[?#]/)[0];
  const base = noQuery.slice(noQuery.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return decodeURIComponent(dot > 0 ? base.slice(0, dot) : base);
}

function hostOf(raw: string): string | null {
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

function loadMapping(): Mapping {
  if (!fs.existsSync(MAPPING_PATH)) {
    throw new Error(
      `Mapping file not found: ${MAPPING_PATH}\n   Run the R2 upload script first so backend/scripts/r2-mapping.json exists.`,
    );
  }
  let mapping: Mapping;
  try {
    const raw = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('expected a JSON object { oldPath: newUrl }');
    }
    mapping = raw as Mapping;
  } catch (err) {
    throw new Error(`Mapping file is not valid JSON: ${MAPPING_PATH}: ${(err as Error).message}`);
  }
  if (Object.keys(mapping).length === 0) {
    throw new Error(`Mapping file is empty: ${MAPPING_PATH}`);
  }
  return mapping;
}

async function main() {
  // Same adapter pattern as prisma/seed.ts (created lazily so that
  // importing this module for a typecheck has no side effects).
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const mapping = loadMapping();
    const entries = Object.entries(mapping);

    const exact = new Map(entries);
    const byOldStem = new Map<string, string>();
    const byNewStem = new Map<string, string>();
    const newUrlsByHost = new Map<string, Set<string>>();
    for (const [oldPath, newUrl] of entries) {
      if (!byOldStem.has(stemOf(oldPath))) byOldStem.set(stemOf(oldPath), newUrl);
      const newStem = stemOf(newUrl);
      if (!byNewStem.has(newStem)) byNewStem.set(newStem, newUrl);
      const host = hostOf(oldPath);
      if (host) {
        if (!newUrlsByHost.has(host)) newUrlsByHost.set(host, new Set());
        newUrlsByHost.get(host)!.add(newUrl);
      }
    }

    // Resolve a legacy URL to its R2 replacement. Handles mapping keys that
    // are either local source paths (products/x.jpg) or legacy CDN URLs.
    const resolveUrl = (current: string, slug?: string): string | null => {
      if (exact.has(current)) return exact.get(current)!;
      const stem = stemOf(current);
      if (byOldStem.has(stem)) return byOldStem.get(stem)!;
      for (const [oldPath, newUrl] of entries) {
        if (current.includes(oldPath) || current.includes(stemOf(oldPath))) return newUrl;
      }
      const host = hostOf(current);
      if (host && newUrlsByHost.has(host)) {
        const candidates = [...newUrlsByHost.get(host)!];
        if (candidates.length === 1) return candidates[0];
      }
      // Fallback: legacy external CDN URL -> match product slug to R2 key stem
      // (deterministic convention: products/<basename>.webp).
      if (slug) {
        if (byNewStem.has(slug)) return byNewStem.get(slug)!;
        for (const [newStem, newUrl] of byNewStem) {
          if (slug.includes(newStem) || newStem.includes(slug)) return newUrl;
        }
      }
      return null;
    };

    let updatedProducts = 0;
    let unresolvedProducts = 0;
    const products = await prisma.product.findMany({
      select: { id: true, slug: true, thumbnailUrl: true },
    });
    for (const p of products) {
      if (!p.thumbnailUrl) continue;
      const next = resolveUrl(p.thumbnailUrl, p.slug);
      if (next && next !== p.thumbnailUrl) {
        await prisma.product.update({ where: { id: p.id }, data: { thumbnailUrl: next } });
        updatedProducts++;
      } else if (!next) {
        unresolvedProducts++;
        console.warn(`[WARN] unresolved product slug=${p.slug} url=${p.thumbnailUrl}`);
      }
    }

    let updatedVariants = 0;
    let unresolvedVariants = 0;
    const variants = await prisma.productVariant.findMany({
      select: { id: true, imageUrl: true, product: { select: { slug: true } } },
    });
    for (const v of variants) {
      if (!v.imageUrl) continue;
      const next = resolveUrl(v.imageUrl, v.product.slug);
      if (next && next !== v.imageUrl) {
        await prisma.productVariant.update({ where: { id: v.id }, data: { imageUrl: next } });
        updatedVariants++;
      } else if (!next) {
        unresolvedVariants++;
        console.warn(`[WARN] unresolved variant id=${v.id} url=${v.imageUrl}`);
      }
    }

    console.log(`updated products=${updatedProducts} variants=${updatedVariants}`);
    if (unresolvedProducts > 0 || unresolvedVariants > 0) {
      console.warn(`[WARN] unresolved: products=${unresolvedProducts} variants=${unresolvedVariants}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  });
}
