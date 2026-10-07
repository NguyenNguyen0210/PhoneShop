// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCartStore } from '../useCartStore';
import { cartService } from '../../services/cartService';

vi.mock('../../services/cartService', () => ({
  cartService: {
    getCart: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateCartItem: vi.fn(),
    clearCart: vi.fn(),
    removeBulk: vi.fn(),
  },
}));

const item = (variantId: string, quantity: number) => ({
  id: `local-${variantId}`,
  variantId,
  quantity,
  unitPrice: 100000,
  price: 100000,
  product: { id: 'p', name: 'P' } as any,
  variant: { id: variantId, price: 100000 } as any,
});

describe('useCartStore.syncWithBackend push-once', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('phoneshop_access_token', 'tok');
    useCartStore.setState({ items: [], selectedItemIds: [] });
  });

  it('should push pending local items exactly once across repeated syncs', async () => {
    useCartStore.setState({ items: [item('v1', 2)], selectedItemIds: [] });
    localStorage.setItem('phoneshop_cart_pending', JSON.stringify(['v1']));
    vi.mocked(cartService.getCart).mockResolvedValue({ items: [] } as any);

    await useCartStore.getState().syncWithBackend();
    await useCartStore.getState().syncWithBackend();
    await useCartStore.getState().syncWithBackend();

    expect(cartService.addToCart).toHaveBeenCalledTimes(1);
    expect(cartService.addToCart).toHaveBeenCalledWith('v1', 2);
  });

  it('should not push when nothing is pending', async () => {
    useCartStore.setState({ items: [item('v1', 2)], selectedItemIds: [] });
    vi.mocked(cartService.getCart).mockResolvedValue({ items: [] } as any);

    await useCartStore.getState().syncWithBackend();

    expect(cartService.addToCart).not.toHaveBeenCalled();
  });
});
