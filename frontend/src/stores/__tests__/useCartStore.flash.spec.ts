// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../useCartStore';

// Merging into the cart must respect the live flash-sale quota: when the
// merged quantity exceeds the remaining quota, only the quota fits at the
// flash price — otherwise checkout rejects the WHOLE order.
describe('useCartStore flash quota cap', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], selectedItemIds: [] });
  });

  it('caps flash-priced qty at quota and warns', () => {
    const { addItem } = useCartStore.getState();
    const product = { id: 'p1' } as any;
    const variant = { id: 'v1', price: 20000000 } as any;
    addItem(product, variant, 2, 15000000, true, 1);
    const item = useCartStore.getState().items.find((i) => i.variantId === 'v1');
    expect(item?.quantity).toBe(1);
    expect(Number(item?.unitPrice)).toBe(15000000);
  });
});
