// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  getFlashQuotaLeft,
  getInventoryAvailable,
  getEffectiveFlashQuota,
  isFlashSaleActiveForVariant,
} from '../flashSaleAvailability';

describe('flashSaleAvailability — hết hàng thì không còn flash sale', () => {
  it('quota thô = stockLimit - soldCount, kẹp >= 0', () => {
    expect(getFlashQuotaLeft({ stockLimit: 20, soldCount: 14 } as any)).toBe(6);
    expect(getFlashQuotaLeft({ stockLimit: 5, soldCount: 8 } as any)).toBe(0);
  });

  it('BUG repro: inventory=0 + quota còn 6 -> flash KHÔNG active', () => {
    const active = isFlashSaleActiveForVariant({
      campaignOngoing: true,
      hasMatchingItem: true,
      flashQuotaLeft: 6,
      inventoryAvailable: 0,
    });
    expect(active).toBe(false);
  });

  it('inventory>0 + quota>0 + campaign ongoing -> active', () => {
    expect(
      isFlashSaleActiveForVariant({
        campaignOngoing: true,
        hasMatchingItem: true,
        flashQuotaLeft: 6,
        inventoryAvailable: 3,
      })
    ).toBe(true);
  });

  it('effective quota = min(quota, tồn kho)', () => {
    expect(getEffectiveFlashQuota(6, 0)).toBe(0);
    expect(getEffectiveFlashQuota(6, 3)).toBe(3);
    expect(getEffectiveFlashQuota(6, 10)).toBe(6);
  });

  it('ưu tiên availableQty hơn quantity khi đọc tồn kho variant', () => {
    expect(
      getInventoryAvailable({ inventory: { quantity: 20, availableQty: 0 } } as any)
    ).toBe(0);
    expect(
      getInventoryAvailable({ inventory: { quantity: 20, availableQty: 5 } } as any)
    ).toBe(5);
  });
});
