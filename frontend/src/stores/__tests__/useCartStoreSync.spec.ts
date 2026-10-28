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

  it('should map flash sale properties from backend cart response during sync', async () => {
    vi.mocked(cartService.getCart).mockResolvedValue({
      items: [
        {
          id: 'ci-1',
          variantId: 'v1',
          quantity: 1,
          unitPrice: 15000000,
          originalPrice: 20000000,
          isFlashSale: true,
          flashQuotaLeft: 8,
          variant: { id: 'v1', price: 20000000 },
        },
      ],
    } as any);

    await useCartStore.getState().syncWithBackend();

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].unitPrice).toBe(15000000);
    expect(items[0].originalPrice).toBe(20000000);
    expect(items[0].isFlashSale).toBe(true);
    expect(items[0].flashQuotaLeft).toBe(8);
  });

  it('reconciles cart items with active flash sale campaign', () => {
    useCartStore.setState({
      items: [
        {
          id: 'local-v1',
          variantId: 'v1',
          quantity: 1,
          unitPrice: 20000000,
          price: 20000000,
          originalPrice: 20000000,
          variant: { id: 'v1', price: 20000000 } as any,
          product: { id: 'p1' } as any,
        },
      ],
      selectedItemIds: ['local-v1'],
    });

    const activeCampaign = {
      id: 'c1',
      isActive: true,
      items: [
        {
          variantId: 'v1',
          flashPrice: 15000000,
          stockLimit: 10,
          soldCount: 3,
        },
      ],
    } as any;

    useCartStore.getState().reconcileWithFlashSale(activeCampaign);

    const item = useCartStore.getState().items[0];
    expect(item.unitPrice).toBe(15000000);
    expect(item.isFlashSale).toBe(true);
    expect(item.flashQuotaLeft).toBe(7);
    expect(item.originalPrice).toBe(20000000);
    expect(useCartStore.getState().selectedSubtotal()).toBe(15000000);
  });
});
