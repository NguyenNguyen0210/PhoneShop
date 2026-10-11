export interface GroupedOrderItemImei {
  id: string;
  imeiNumber: string;
  status?: string;
  orderItemId: string;
}

export interface GroupedOrderItem {
  groupKey: string;
  variantId?: string;
  productName: string;
  sku?: string;
  variant?: {
    id?: string;
    name?: string;
    color?: string;
    storage?: string;
    ram?: string;
    imageUrl?: string;
    product?: {
      id?: string;
      name?: string;
      slug?: string;
      thumbnailUrl?: string;
    };
  };
  unitPrice: number;
  totalQuantity: number;
  totalPrice: number;
  imeis: GroupedOrderItemImei[];
  rawItemIds: string[];
}

export function groupOrderItems(items?: any[] | null): GroupedOrderItem[] {
  if (!items || !Array.isArray(items) || items.length === 0) return [];

  const groupMap = new Map<string, GroupedOrderItem>();

  for (const item of items) {
    if (!item) continue;
    const key = item.variantId || item.variant?.id || item.productName || item.id;
    const itemPrice = Number(item.unitPrice) || 0;
    const itemQty = Number(item.quantity) || 1;
    const itemTotal = Number(item.totalPrice) || (itemPrice * itemQty);

    const imeiNum = item.imeiDevice?.imeiNumber || item.imeiDevice?.imei;
    const imeiEntry: GroupedOrderItemImei | null = imeiNum ? {
      id: item.imeiDevice?.id || item.id,
      imeiNumber: String(imeiNum),
      status: item.imeiDevice?.status || 'ASSIGNED',
      orderItemId: item.id,
    } : null;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupKey: key,
        variantId: item.variantId || item.variant?.id,
        productName: item.productName || item.variant?.product?.name || item.variant?.name || 'Sản phẩm',
        sku: item.sku || item.variant?.sku,
        variant: item.variant,
        unitPrice: itemPrice,
        totalQuantity: itemQty,
        totalPrice: itemTotal,
        imeis: imeiEntry ? [imeiEntry] : [],
        rawItemIds: item.id ? [item.id] : [],
      });
    } else {
      const existing = groupMap.get(key)!;
      existing.totalQuantity += itemQty;
      existing.totalPrice += itemTotal;
      if (item.id && !existing.rawItemIds.includes(item.id)) {
        existing.rawItemIds.push(item.id);
      }
      if (imeiEntry && !existing.imeis.some(im => im.imeiNumber === imeiEntry.imeiNumber)) {
        existing.imeis.push(imeiEntry);
      }
    }
  }

  return Array.from(groupMap.values());
}
