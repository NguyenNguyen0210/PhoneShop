// =============================================================================
// DEPRECATED LEGACY SEED — DO NOT USE
// =============================================================================
// This script depended on the removed frontend mock catalog
// (frontend/src/data/mockProducts.ts), deleted during the no-mock-data cleanup.
//
// The canonical, self-contained seed is `prisma/seed.ts`.
// Run it with:
//
//   npx prisma db seed
//
// (package.json `prisma.seed` already points there).
// =============================================================================

export {};

async function main(): Promise<void> {
  throw new Error(
    'seed_catalog.ts is deprecated: its frontend mock data source was deleted. ' +
      'Use `npx prisma db seed` (prisma/seed.ts) instead.'
  );
}

main().catch((e) => {
  console.error('❌ Deprecated seed aborted:', (e as Error).message);
  process.exit(1);
});
