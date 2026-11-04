-- Additive migration: keep existing orders readable while freezing available addresses.
ALTER TABLE "orders" ADD COLUMN "shipping_address_snapshot" JSONB;
UPDATE "orders" o SET "shipping_address_snapshot" = jsonb_build_object(
  'recipientName', a.recipient_name, 'phone', a.phone,
  'addressLine1', a.address_line1, 'addressLine2', a.address_line2,
  'ward', a.ward, 'district', a.district, 'city', a.city,
  'province', a.province, 'postalCode', a.postal_code, 'country', a.country
) FROM "addresses" a WHERE o.address_id = a.id;
CREATE TYPE "WarrantyRepairStage" AS ENUM ('REQUESTED', 'RECEIVED', 'REPAIRED', 'RETURNED');
ALTER TABLE "warranties" ADD COLUMN "repair_stage" "WarrantyRepairStage",
  ADD COLUMN "claim_phone" VARCHAR(30), ADD COLUMN "claim_return_address" TEXT;
UPDATE "warranties" SET "repair_stage" = 'REQUESTED' WHERE status = 'CLAIMED';
-- Earlier payment settlement marked devices SOLD before physical delivery.
-- Their inventory is still held; normalize the device state without adding stock.
UPDATE "imei_devices" d SET status = 'RESERVED', sold_at = NULL
WHERE d.status = 'SOLD' AND EXISTS (
  SELECT 1 FROM "order_items" oi JOIN "orders" o ON o.id = oi.order_id
  WHERE oi.imei_device_id = d.id AND o.status IN ('PENDING','CONFIRMED','PROCESSING','PACKED','SHIPPING')
);
