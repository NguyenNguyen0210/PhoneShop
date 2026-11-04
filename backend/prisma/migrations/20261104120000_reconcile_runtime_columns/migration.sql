-- Reconcile the legacy sync migration with the runtime Prisma model.
-- Rename rather than drop/recreate columns; keep obsolete data for review.
ALTER TYPE "ShippingStatus" ADD VALUE IF NOT EXISTS 'PICKED_UP';
ALTER TYPE "ShippingStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'IMPORT_MANUAL';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'EXPORT_MANUAL';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'INITIAL_SETUP';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUPPORT';
