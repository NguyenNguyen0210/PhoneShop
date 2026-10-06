-- Add installment monthly repayment schedule (installment_payment_terms)
-- NOTE: baseline migration history in the database was created outside of
-- `prisma migrate` (migrate status shows old migrations as not yet applied),
-- so DO NOT run `prisma migrate deploy` for this file — it would try to
-- re-apply old migrations on top of existing tables. Apply this file either
-- via `npx tsx prisma/ensure_installment_terms.ts` (idempotent) or by running
-- it once in the Supabase SQL editor.

-- CreateEnum (guarded so re-runs are safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InstallmentTermStatus') THEN
        CREATE TYPE "InstallmentTermStatus" AS ENUM ('PENDING', 'PAID');
    END IF;
END
$$;

-- CreateTable
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

-- Unique + indexes (guarded so re-runs are safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'installment_payment_terms_application_id_term_no_key'
    ) THEN
        ALTER TABLE "installment_payment_terms"
            ADD CONSTRAINT "installment_payment_terms_application_id_term_no_key"
            UNIQUE ("application_id", "term_no");
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "installment_payment_terms_application_id_idx"
    ON "installment_payment_terms"("application_id");
CREATE INDEX IF NOT EXISTS "installment_payment_terms_status_idx"
    ON "installment_payment_terms"("status");

-- AddForeignKeys (guarded so re-runs are safe)
DO $$
BEGIN
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
