-- Prevent two ReturnItem rows for the same order line within one return.
-- Backstop for the createReturn read-check race: concurrent duplicate
-- submissions fail loudly (P2002) instead of double-returning stock.
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_order_item_id_key" UNIQUE ("return_id", "order_item_id");
