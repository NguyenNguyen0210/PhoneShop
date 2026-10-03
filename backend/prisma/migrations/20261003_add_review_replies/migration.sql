-- Add review_replies table (shop / customer replies under a product review)
-- NOTE: baseline migration history in the database was created outside of
-- `prisma migrate` (migrate status shows the two previous migrations as not
-- yet applied), so DO NOT run `prisma migrate deploy` for this file — it would
-- try to re-apply the old migrations on top of existing tables. The table is
-- created idempotently by prisma/seed_reviews.ts via CREATE TABLE IF NOT EXISTS.

-- CreateTable
CREATE TABLE IF NOT EXISTS "review_replies" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "review_replies_review_id_idx" ON "review_replies"("review_id");

-- AddForeignKey (guarded so re-runs are safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'review_replies_review_id_fkey'
    ) THEN
        ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'review_replies_user_id_fkey'
    ) THEN
        ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
