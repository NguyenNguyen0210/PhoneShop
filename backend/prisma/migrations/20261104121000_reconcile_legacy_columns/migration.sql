DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketCategory') THEN
    CREATE TYPE "TicketCategory" AS ENUM ('ORDER_INQUIRY', 'PRODUCT_INQUIRY', 'WARRANTY_SUPPORT', 'RETURN_REFUND', 'PAYMENT_INSTALLMENT', 'ACCOUNT_GENERAL');
  END IF;
END $$;

BEGIN;
DO $$
DECLARE mapping text[];
BEGIN
  FOREACH mapping SLICE 1 IN ARRAY ARRAY[
    ['flash_sale_campaigns','start_time','start_at'],
    ['flash_sale_campaigns','end_time','end_at'],
    ['flash_sale_items','quantity','stock_limit'],
    ['stock_movements','created_by','performed_by'],
    ['suppliers','tax_id','tax_code'],
    ['tickets','ticket_number','code'],
    ['tickets','subject','title'],
    ['tickets','assigned_to','assigned_to_id'],
    ['tickets','closed_at','resolved_at'],
    ['ticket_messages','is_internal','is_internal_note']
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = mapping[1] AND column_name = mapping[2])
      AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = mapping[1] AND column_name = mapping[3]) THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', mapping[1], mapping[2], mapping[3]);
    END IF;
  END LOOP;
END $$;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "specs" JSONB;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'flash_sale_campaigns' AND column_name = 'is_active') THEN
    ALTER TABLE "flash_sale_campaigns" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
    UPDATE "flash_sale_campaigns" c SET is_active = false WHERE to_jsonb(c)->>'status' IN ('CANCELLED', 'ENDED');
  END IF;
END $$;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "last_replied_at" TIMESTAMP(3);
-- Keep the old free-text category instead of discarding unknown labels.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'tickets' AND column_name = 'category' AND udt_name <> 'TicketCategory') THEN
    ALTER TABLE "tickets" RENAME COLUMN "category" TO "legacy_category";
    ALTER TABLE "tickets" ADD COLUMN "category" "TicketCategory" NOT NULL DEFAULT 'ACCOUNT_GENERAL';
    UPDATE "tickets" SET category = legacy_category::"TicketCategory"
      WHERE legacy_category IN ('ORDER_INQUIRY','PRODUCT_INQUIRY','WARRANTY_SUPPORT','RETURN_REFUND','PAYMENT_INSTALLMENT','ACCOUNT_GENERAL');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'tickets' AND column_name = 'description') THEN
    ALTER TABLE "tickets" ALTER COLUMN "description" SET DEFAULT '';
  END IF;
END $$;

UPDATE "stock_movements" SET unit_price = 0 WHERE unit_price IS NULL;
UPDATE "stock_movements" SET total_amount = 0 WHERE total_amount IS NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "unit_price" TYPE DECIMAL(15,2) USING unit_price::numeric,
  ALTER COLUMN "unit_price" SET DEFAULT 0, ALTER COLUMN "unit_price" SET NOT NULL,
  ALTER COLUMN "total_amount" TYPE DECIMAL(15,2) USING total_amount::numeric,
  ALTER COLUMN "total_amount" SET DEFAULT 0, ALTER COLUMN "total_amount" SET NOT NULL;
ALTER TABLE "flash_sale_items" ALTER COLUMN "flash_price" TYPE DECIMAL(15,2) USING flash_price::numeric;
ALTER TABLE "shippings" ALTER COLUMN "shipping_fee" TYPE DECIMAL(15,2) USING shipping_fee::numeric;

UPDATE "shippings" SET status = 'PICKED_UP' WHERE status::text = 'SHIPPED';
UPDATE "shippings" SET status = 'IN_TRANSIT' WHERE status::text = 'DELIVERING';
-- Old movement labels remain in the enum for historical compatibility.
UPDATE "stock_movements" SET type = 'IMPORT_MANUAL' WHERE type::text IN ('IMPORT','ADJUSTMENT');
UPDATE "stock_movements" SET type = 'EXPORT_MANUAL' WHERE type::text IN ('EXPORT_DAMAGE','EXPORT_WARRANTY');

CREATE INDEX IF NOT EXISTS "flash_sale_campaigns_start_at_end_at_idx" ON "flash_sale_campaigns" ("start_at","end_at");
CREATE INDEX IF NOT EXISTS "flash_sale_campaigns_is_active_idx" ON "flash_sale_campaigns" ("is_active");
CREATE INDEX IF NOT EXISTS "flash_sale_items_campaign_id_idx" ON "flash_sale_items" ("campaign_id");
CREATE INDEX IF NOT EXISTS "flash_sale_items_variant_id_idx" ON "flash_sale_items" ("variant_id");
CREATE INDEX IF NOT EXISTS "imei_devices_status_variant_id_idx" ON "imei_devices" ("status","variant_id");
CREATE INDEX IF NOT EXISTS "stock_movements_variant_id_created_at_idx" ON "stock_movements" ("variant_id","created_at");
CREATE INDEX IF NOT EXISTS "stock_movements_type_created_at_idx" ON "stock_movements" ("type","created_at");
CREATE INDEX IF NOT EXISTS "suppliers_is_active_idx" ON "suppliers" ("is_active");
CREATE INDEX IF NOT EXISTS "system_settings_group_idx" ON "system_settings" ("group");
CREATE INDEX IF NOT EXISTS "ticket_messages_ticket_id_idx" ON "ticket_messages" ("ticket_id");
CREATE INDEX IF NOT EXISTS "tickets_user_id_idx" ON "tickets" ("user_id");
CREATE INDEX IF NOT EXISTS "tickets_status_idx" ON "tickets" ("status");
CREATE INDEX IF NOT EXISTS "tickets_assigned_to_id_idx" ON "tickets" ("assigned_to_id");
CREATE INDEX IF NOT EXISTS "tickets_created_at_idx" ON "tickets" ("created_at");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "shippings_status_idx" ON "shippings" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "shippings_tracking_number_key" ON "shippings" ("tracking_number");
COMMIT;
