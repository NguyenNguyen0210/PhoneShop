// =============================================================================
// ENSURE INSTALLMENT PAYMENT TERMS TABLE + BACKFILL (idempotent — safe to re-run)
// =============================================================================
// The baseline migration history was created outside `prisma migrate`, so new
// tables are applied idempotently by script instead of `migrate deploy`
// (same convention as seed_reviews.ts for review_replies).
//
// Run:  npx tsx prisma/ensure_installment_terms.ts   (from PhoneShop/backend)
//
// Does two things:
//   1. Ensures the InstallmentTermStatus enum + installment_payment_terms
//      table/indexes/FKs exist (mirrors
//      prisma/migrations/20261006_add_installment_payment_terms/migration.sql).
//   2. Backfills monthly schedules for APPROVED applications that have none
//      (approved before this feature shipped). Due dates anchor on reviewedAt
//      (fallback: createdAt), one calendar month apart; the last term absorbs
//      rounding so terms always sum to exactly loanAmount.
// =============================================================================
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

async function ensureSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InstallmentTermStatus') THEN
            CREATE TYPE "InstallmentTermStatus" AS ENUM ('PENDING', 'PAID');
        END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "installment_payment_terms" (
        "id" UUID NOT NULL,
        "application_id" UUID NOT NULL,
        "term_no" INTEGER NOT NULL,
        "due_date" DATE NOT NULL,
        "amount" DECIMAL(15,2) NOT NULL,
        "status" "InstallmentTermStatus" NOT NULL DEFAULT 'PENDING',
        "paid_at" TIMESTAMP(3),
        "paid_note" VARCHAR(255),
        "marked_by" UUID,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "installment_payment_terms_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'installment_payment_terms_application_id_term_no_key'
        ) THEN
            ALTER TABLE "installment_payment_terms"
                ADD CONSTRAINT "installment_payment_terms_application_id_term_no_key"
                UNIQUE ("application_id", "term_no");
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'installment_payment_terms_application_id_fkey'
        ) THEN
            ALTER TABLE "installment_payment_terms" ADD CONSTRAINT "installment_payment_terms_application_id_fkey"
                FOREIGN KEY ("application_id") REFERENCES "installment_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'installment_payment_terms_marked_by_fkey'
        ) THEN
            ALTER TABLE "installment_payment_terms" ADD CONSTRAINT "installment_payment_terms_marked_by_fkey"
                FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "installment_payment_terms_application_id_idx"
        ON "installment_payment_terms"("application_id");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "installment_payment_terms_status_idx"
        ON "installment_payment_terms"("status");
  `);
}

async function backfillMissing(): Promise<number> {
  const apps = (await prisma.$queryRawUnsafe(
    `SELECT a."id", a."loan_amount", a."term_months", a."reviewed_at", a."created_at"
     FROM "installment_applications" a
     WHERE a."status" = 'APPROVED'
       AND NOT EXISTS (
         SELECT 1 FROM "installment_payment_terms" t WHERE t."application_id" = a."id"
       )`,
  )) as Array<{
    id: string;
    loan_amount: unknown;
    term_months: number;
    reviewed_at: Date | null;
    created_at: Date;
  }>;

  let created = 0;
  for (const app of apps) {
    const loan = Math.round(Number(app.loan_amount));
    const terms = Number(app.term_months);
    if (!Number.isFinite(loan) || loan <= 0 || !Number.isInteger(terms) || terms <= 0) continue;
    const anchor = app.reviewed_at ? new Date(app.reviewed_at) : new Date(app.created_at);
    const monthly = Math.round(loan / terms);
    const now = new Date();
    for (let n = 1; n <= terms; n++) {
      const amount = n < terms ? monthly : loan - monthly * (terms - 1);
      const due = addMonthsClamped(anchor, n);
      const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "installment_payment_terms"
           ("id", "application_id", "term_no", "due_date", "amount", "status", "created_at", "updated_at")
         VALUES ($1, $2, $3, $4::date, $5, 'PENDING', $6, $6)
         ON CONFLICT ("application_id", "term_no") DO NOTHING`,
        randomUUID(),
        app.id,
        n,
        dueStr,
        amount,
        now,
      );
      created++;
    }
    console.log(`Backfilled ${terms} terms for application ${app.id}`);
  }
  return created;
}

async function main(): Promise<void> {
  await ensureSchema();
  console.log('installment_payment_terms schema ensured');
  const created = await backfillMissing();
  console.log(`Backfill done: ${created} term rows created`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
