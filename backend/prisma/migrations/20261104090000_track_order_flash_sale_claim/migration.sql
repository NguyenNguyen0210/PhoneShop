ALTER TABLE "order_items"
ADD COLUMN "flash_sale_item_id" UUID;

CREATE INDEX "order_items_flash_sale_item_id_idx"
ON "order_items"("flash_sale_item_id");

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_flash_sale_item_id_fkey"
FOREIGN KEY ("flash_sale_item_id") REFERENCES "flash_sale_items"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
