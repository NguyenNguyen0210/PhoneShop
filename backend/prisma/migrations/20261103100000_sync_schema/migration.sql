-- Migration: 20261103100000_sync_schema
-- Purpose: Synchronize schema.prisma with Prisma migrations history safely and idempotently.
-- Compatible with both fresh database deployments and existing databases.

-- 1. Retire obsolete tables only if they contain NO user data.
-- Hold ACCESS EXCLUSIVE locks through the drops to prevent concurrent writes
-- between the data check and the DDL. Never CASCADE external dependencies.
-- If a table contains rows, STOP and archive/migrate those records explicitly.
BEGIN;
DO $$
DECLARE
    legacy_table text;
    contains_rows boolean;
BEGIN
    FOREACH legacy_table IN ARRAY ARRAY['refunds', 'return_items', 'returns', 'idempotency_records'] LOOP
        IF to_regclass(format('%I', legacy_table)) IS NOT NULL THEN
            EXECUTE format('LOCK TABLE %I IN ACCESS EXCLUSIVE MODE', legacy_table);
            EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I LIMIT 1)', legacy_table)
                INTO contains_rows;
            IF contains_rows THEN
                RAISE EXCEPTION 'Migration blocked: legacy table % contains data. Back up and migrate/archive it before continuing.', legacy_table;
            END IF;
        END IF;
    END LOOP;
END $$;
DROP TABLE IF EXISTS "refunds" RESTRICT;
DROP TABLE IF EXISTS "return_items" RESTRICT;
DROP TABLE IF EXISTS "returns" RESTRICT;
DROP TABLE IF EXISTS "idempotency_records" RESTRICT;
COMMIT;

-- 2. CREATE NEW ENUMS IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockMovementType') THEN
        CREATE TYPE "StockMovementType" AS ENUM ('IMPORT', 'EXPORT_ORDER', 'EXPORT_DAMAGE', 'EXPORT_WARRANTY', 'IMPORT_RETURN', 'ADJUSTMENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShippingStatus') THEN
        CREATE TYPE "ShippingStatus" AS ENUM ('PENDING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERING', 'DELIVERED', 'RETURNED', 'FAILED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShippingMethod') THEN
        CREATE TYPE "ShippingMethod" AS ENUM ('STANDARD', 'EXPRESS', 'EXPRESS_2H', 'ECONOMY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketStatus') THEN
        CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketPriority') THEN
        CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FlashSaleStatus') THEN
        CREATE TYPE "FlashSaleStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');
    END IF;
END $$;

-- Add new values to existing enums if not exists
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "InventoryStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "InventoryStatus" ADD VALUE IF NOT EXISTS 'WARRANTY';
ALTER TYPE "ImeiStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "ImeiStatus" ADD VALUE IF NOT EXISTS 'WARRANTY';
ALTER TYPE "ImeiStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- 3. ALTER EXISTING TABLES TO ADD MISSING COLUMNS
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "hold_expires_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_fee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_method" "ShippingMethod" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_note" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelled_reason" TEXT;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "warranty_months" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "featured_order" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "badge" TEXT;

ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;

-- 4. CREATE MISSING TABLES
CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION,
    "total_amount" DOUBLE PRECISION,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "flash_sale_campaigns" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "FlashSaleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sale_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "flash_sale_items" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "flash_price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "user_limit" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sale_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shippings" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider_name" TEXT NOT NULL,
    "tracking_number" TEXT,
    "shipping_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ShippingStatus" NOT NULL DEFAULT 'PENDING',
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "estimated_delivery_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shippings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tickets" (
    "id" UUID NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "user_id" UUID,
    "order_id" UUID,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "assigned_to" UUID,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ticket_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- 5. UNIQUE CONSTRAINTS & INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS "flash_sale_items_campaign_id_variant_id_key" ON "flash_sale_items"("campaign_id", "variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "shippings_order_id_key" ON "shippings"("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticket_number_key" ON "tickets"("ticket_number");
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");
CREATE INDEX IF NOT EXISTS "stock_movements_variant_id_idx" ON "stock_movements"("variant_id");
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx" ON "stock_movements"("created_at");

-- 6. FOREIGN KEYS (guarded with DO blocks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_variant_id_fkey') THEN
        ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flash_sale_items_campaign_id_fkey') THEN
        ALTER TABLE "flash_sale_items" ADD CONSTRAINT "flash_sale_items_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "flash_sale_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flash_sale_items_variant_id_fkey') THEN
        ALTER TABLE "flash_sale_items" ADD CONSTRAINT "flash_sale_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_user_id_fkey') THEN
        ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shippings_order_id_fkey') THEN
        ALTER TABLE "shippings" ADD CONSTRAINT "shippings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_user_id_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_order_id_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_messages_ticket_id_fkey') THEN
        ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_messages_sender_id_fkey') THEN
        ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
