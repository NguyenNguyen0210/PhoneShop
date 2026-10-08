// Shared flash-sale quota rollback. Checkout claims a flash-sale slot by
// incrementing FlashSaleItem.soldCount; every path that releases the order's
// stock (hold expiry, user cancel, staff cancel, completed return) must give
// the slot back, otherwise cancelled/expired orders permanently eat quota.
//
// Matching rule mirrors checkout: at most one campaign can cover a variant
// at any moment (creation rejects overlaps), so the item whose campaign
// window contains the order time is the one checkout claimed.
// updateMany cannot filter on relations, hence findMany first (same pattern
// as checkout) + a guarded decrement per row.
export async function rollbackFlashSoldCount(
  tx: any,
  items: Array<{ variantId: string; quantity: number }>,
  orderedAt: Date,
): Promise<void> {
  const variantIds = [...new Set(items.map((i) => i.variantId))];
  if (variantIds.length === 0) return;
  // (?. : partial mock tx objects in older specs carry no flashSaleItem —
  // same convention as checkout's tx.flashSaleItem?.findFirst.)
  const flashItems = (await tx.flashSaleItem?.findMany({
    where: {
      variantId: { in: variantIds },
      campaign: { startAt: { lte: orderedAt }, endAt: { gte: orderedAt } },
    },
    select: { id: true, variantId: true },
  })) ?? [];
  const byVariant = new Map<string, string>();
  for (const f of flashItems) {
    if (!byVariant.has(f.variantId)) byVariant.set(f.variantId, f.id);
  }
  const qtyByVariant = new Map<string, number>();
  for (const i of items) {
    qtyByVariant.set(i.variantId, (qtyByVariant.get(i.variantId) ?? 0) + i.quantity);
  }
  for (const [variantId, qty] of qtyByVariant) {
    const flashId = byVariant.get(variantId);
    if (!flashId || qty <= 0) continue;
    await tx.flashSaleItem.updateMany({
      where: { id: flashId, soldCount: { gte: qty } },
      data: { soldCount: { decrement: qty } },
    });
  }
}
