import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../useCartStore';

describe('useCartStore - Selection', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [
        {
          id: 'item-1',
          variantId: 'v-1',
          quantity: 2,
          unitPrice: 100000,
          price: 100000,
          unitPrice: 100000,
          product: { id: 'p-1', name: 'Product 1' } as any,
          variant: { id: 'v-1', price: 100000 } as any,
        },
        {
          id: 'item-2',
          variantId: 'v-2',
          quantity: 1,
          unitPrice: 300000,
          price: 300000,
          unitPrice: 300000,
          product: { id: 'p-2', name: 'Product 2' } as any,
          variant: { id: 'v-2', price: 300000 } as any,
        },
      ],
      selectedItemIds: [],
    });
  });

  it('should default to empty selection and compute 0 subtotal', () => {
    const state = useCartStore.getState();
    expect(state.selectedItemIds).toEqual([]);
    expect(state.selectedTotalCount()).toBe(0);
    expect(state.selectedSubtotal()).toBe(0);
    expect(state.isAllSelected()).toBe(false);
  });

  it('should toggle selection and compute correct subtotal', () => {
    useCartStore.getState().toggleSelectItem('item-1');
    expect(useCartStore.getState().selectedItemIds).toEqual(['item-1']);
    expect(useCartStore.getState().selectedTotalCount()).toBe(2);
    expect(useCartStore.getState().selectedSubtotal()).toBe(200000);

    useCartStore.getState().toggleSelectItem('item-1');
    expect(useCartStore.getState().selectedItemIds).toEqual([]);
  });

  it('should selectAll and deselectAll properly', () => {
    useCartStore.getState().selectAll();
    expect(useCartStore.getState().selectedItemIds).toEqual(['item-1', 'item-2']);
    expect(useCartStore.getState().isAllSelected()).toBe(true);
    expect(useCartStore.getState().selectedTotalCount()).toBe(3);
    expect(useCartStore.getState().selectedSubtotal()).toBe(500000);

    useCartStore.getState().deselectAll();
    expect(useCartStore.getState().selectedItemIds).toEqual([]);
    expect(useCartStore.getState().isAllSelected()).toBe(false);
  });

  it('should clean up selectedItemIds when removeItem is called', () => {
    useCartStore.getState().toggleSelectItem('item-1');
    useCartStore.getState().removeItem('item-1');
    expect(useCartStore.getState().selectedItemIds).toEqual([]);
  });

  it('should removeSelectedItems correctly', () => {
    useCartStore.getState().toggleSelectItem('item-1');
    useCartStore.getState().removeSelectedItems();
    expect(useCartStore.getState().selectedItemIds).toEqual([]);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].id).toBe('item-2');
  });

  it('should clean up selectedItemIds when clearCart is called', () => {
    useCartStore.getState().toggleSelectItem('item-1');
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().selectedItemIds).toEqual([]);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
