-- Prevent two completed external refunds from being recorded using the same
-- bank/provider reference, including when distinct payments are updated concurrently.
-- Pre-existing duplicate successful refund references must be reconciled before migrating.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "payment_transactions"
        WHERE "provider_reference" IS NOT NULL
          AND "status" = 'SUCCESS'
          AND "type" IN ('REFUND', 'PARTIAL_REFUND')
        GROUP BY "provider_reference" HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate successful refund provider references found. Reconcile duplicates before creating the unique index.';
    END IF;
END $$;
CREATE UNIQUE INDEX "payment_transactions_success_refund_reference_unique"
ON "payment_transactions" ("provider_reference")
WHERE "provider_reference" IS NOT NULL
  AND "status" = 'SUCCESS'
  AND "type" IN ('REFUND', 'PARTIAL_REFUND');
