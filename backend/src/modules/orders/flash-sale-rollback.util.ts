// Only release flash-sale quota claimed by checkout. Inferring from the campaign
// window can decrement quota for normal-price purchases when quota ran out.
export async function rollbackFlashSoldCount(
  tx: any,
  items: Array<{ flashSaleItemId?: string | null; quantity: number }>,
  _orderedAt?: Date,
): Promise<void> {
  if (!tx.flashSaleItem?.updateMany) return;
  const quantityBySaleItem = new Map<string, number>();
  for (const item of items) {
    if (!item.flashSaleItemId) continue;
    quantityBySaleItem.set(
      item.flashSaleItemId,
      (quantityBySaleItem.get(item.flashSaleItemId) ?? 0) + item.quantity,
    );
  }
  for (const [id, quantity] of quantityBySaleItem) {
    const released = await tx.flashSaleItem.updateMany({
      where: { id, soldCount: { gte: quantity } },
      data: { soldCount: { decrement: quantity } },
    });
    if (released.count !== 1) {
      throw new Error('Cannot restore flash-sale quota for order');
    }
  }
}
