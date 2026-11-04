/* eslint-disable no-console */
// Read-only preflight. Do not replace a tested database backup with this check.
const { Client } = require('pg');
const { createHash } = require('node:crypto');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.PRODUCTION_BACKUP_REFERENCE?.trim()) {
    throw new Error('Set PRODUCTION_BACKUP_REFERENCE to the ID/path of a VERIFIED, restorable database backup before migrating production.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const applied = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = current_schema() AND tablename = '_prisma_migrations'
      ) AS exists
    `);
    let completed = new Set();
    if (applied.rows[0].exists) {
      const migrations = await client.query(`
        SELECT migration_name, checksum FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `);
      completed = new Set(migrations.rows.map(({ migration_name }) => migration_name));

      // Prisma does not block `migrate deploy` when an already-applied SQL
      // migration has been edited. Detect history drift before deployment.
      for (const { migration_name: name, checksum } of migrations.rows) {
        const migrationFile = join(__dirname, '..', 'prisma', 'migrations', name, 'migration.sql');
        if (!existsSync(migrationFile)) {
          throw new Error(`Previously applied migration ${name} is missing from this release.`);
        }
        const actual = createHash('sha256').update(readFileSync(migrationFile)).digest('hex');
        if (actual !== checksum) {
          throw new Error(`Previously applied migration ${name} has changed since it was applied. Review Prisma migration history before deployment.`);
        }
      }
    }

    if (!completed.has('20261103100000_sync_schema')) {
      for (const table of ['refunds', 'return_items', 'returns', 'idempotency_records']) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = current_schema() AND tablename = $1
          ) AS exists
        `, [table]);
        if (!result.rows[0].exists) continue;
        // Names below come from a fixed code-owned list, never from user input.
        const rows = await client.query(`SELECT EXISTS (SELECT 1 FROM "${table}" LIMIT 1) AS has_rows`);
        if (rows.rows[0].has_rows) {
          throw new Error(`Legacy table ${table} is populated. Archive/migrate it and verify records before attempting the sync migration.`);
        }
      }
    }

    if (!completed.has('20261104100000_unique_refund_provider_reference')) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_tables
          WHERE schemaname = current_schema() AND tablename = 'payment_transactions'
        ) AS exists
      `);
      if (result.rows[0].exists) {
        const duplicates = await client.query(`
          SELECT COUNT(*)::integer AS count FROM (
            SELECT "provider_reference" FROM "payment_transactions"
            WHERE "provider_reference" IS NOT NULL AND "status" = 'SUCCESS'
              AND "type" IN ('REFUND', 'PARTIAL_REFUND')
            GROUP BY "provider_reference" HAVING COUNT(*) > 1
          ) duplicate_references
        `);
        if (duplicates.rows[0].count > 0) {
          throw new Error(`${duplicates.rows[0].count} duplicate successful refund reference(s) found. Reconcile these records before migrating.`);
        }
      }
    }

    console.log('Migration preflight passed: no known destructive legacy data or refund reference conflicts.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Migration preflight failed: ${error.message}`);
  process.exitCode = 1;
});
