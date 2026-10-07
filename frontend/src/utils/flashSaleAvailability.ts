export function getFlashQuotaLeft(item: { stockLimit: number | string; soldCount: number | string }): number {
  return Math.max(0, Number(item.stockLimit) - Number(item.soldCount));
}

export function getInventoryAvailable(
  variant: { inventory?: { availableQty?: number | string | null; quantity?: number | string | null } | null } | null | undefined
): number {
  const inv = variant?.inventory;
  if (inv?.availableQty !== undefined && inv?.availableQty !== null) {
    return Number(inv.availableQty) || 0;
  }
  if (inv?.quantity !== undefined && inv?.quantity !== null) {
    return Number(inv.quantity) || 0;
  }
  return 0;
}

export function getEffectiveFlashQuota(flashQuotaLeft: number, inventoryAvailable: number): number {
  return Math.max(0, Math.min(Number(flashQuotaLeft) || 0, Number(inventoryAvailable) || 0));
}

export function isFlashSaleActiveForVariant(args: {
  campaignOngoing: boolean;
  hasMatchingItem: boolean;
  flashQuotaLeft: number;
  inventoryAvailable: number;
}): boolean {
  return (
    !!args.campaignOngoing &&
    !!args.hasMatchingItem &&
    Number(args.flashQuotaLeft) > 0 &&
    Number(args.inventoryAvailable) > 0
  );
}
