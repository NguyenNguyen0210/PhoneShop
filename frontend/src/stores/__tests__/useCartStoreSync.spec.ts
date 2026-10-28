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

describe('useCartStore — pending cleanup on successful push (E3a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('phoneshop_access_token', 'tok');
    useCartStore.setState({ items: [], selectedItemIds: [] });
  });

  it('removes the variant from the pending queue when addToCart succeeds', async () => {
    localStorage.setItem('phoneshop_cart_pending', JSON.stringify(['v1']));
    useCartStore.setState({ items: [item('v1', 2)], selectedItemIds: [] });
    vi.mocked(cartService.addToCart).mockResolvedValue({ items: [] } as any);

    useCartStore.getState().addItem(
      { id: 'p1', name: 'P' } as any,
      { id: 'v1', price: 100000 } as any,
      1
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cartService.addToCart).toHaveBeenCalledWith('v1', 1);
    expect(JSON.parse(localStorage.getItem('phoneshop_cart_pending') || '[]')).toEqual([]);
  });
});

describe('useCartStore — syncWithBackend in-flight guard (E4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('phoneshop_access_token', 'tok');
    useCartStore.setState({ items: [], selectedItemIds: [] });
  });

  it('shares one in-flight sync so concurrent callers do not duplicate work', async () => {
    useCartStore.setState({ items: [item('v1', 2)], selectedItemIds: [] });
    vi.mocked(cartService.getCart).mockResolvedValue({ items: [] } as any);

    const p1 = useCartStore.getState().syncWithBackend();
    const p2 = useCartStore.getState().syncWithBackend();
    await Promise.all([p1, p2]);

    expect(cartService.getCart).toHaveBeenCalledTimes(1);
  });

  it('runs a fresh sync after the previous one settles', async () => {
    vi.mocked(cartService.getCart).mockResolvedValue({ items: [] } as any);

    await useCartStore.getState().syncWithBackend();
    await useCartStore.getState().syncWithBackend();

    expect(cartService.getCart).toHaveBeenCalledTimes(2);
  });
});

describe('useCartStore — removeSelectedItems sends variantIds (E7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('phoneshop_access_token', 'tok');
    useCartStore.setState({ items: [], selectedItemIds: [] });
  });

  it('maps selected item ids to variantIds before calling removeBulk', () => {
    vi.mocked(cartService.removeBulk).mockResolvedValue(undefined as unknown as void);
    useCartStore.setState({
      items: [item('v1', 1), item('v2', 1)],
      selectedItemIds: ['local-v1'],
    });

    useCartStore.getState().removeSelectedItems();

    expect(cartService.removeBulk).toHaveBeenCalledWith(['v1']);
  });
});

describe('useCartStore — selection fallback after sync (E14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('phoneshop_access_token', 'tok');
    useCartStore.setState({ items: [], selectedItemIds: [] });
  });

  it('clears stale selection when no selected variant survives the sync', async () => {
    useCartStore.setState({
      items: [item('v-gone', 1)],
      selectedItemIds: ['local-v-gone'],
    });
    vi.mocked(cartService.getCart).mockResolvedValue({
      items: [
        {
          id: 'ci-9',
          variantId: 'v-fresh',
          quantity: 1,
          unitPrice: 100000,
          variant: { id: 'v-fresh', price: 100000 },
        },
      ],
    } as any);

    await useCartStore.getState().syncWithBackend();

    expect(useCartStore.getState().selectedItemIds).toEqual([]);
  });

  it('keeps the selection mapped through variantIds when backend cart matches', async () => {
    useCartStore.setState({
      items: [item('v1', 1)],
      selectedItemIds: ['local-v1'],
    });
    vi.mocked(cartService.getCart).mockResolvedValue({
      items: [
        {
          id: 'ci-1',
          variantId: 'v1',
          quantity: 1,
          unitPrice: 100000,
          variant: { id: 'v1', price: 100000 },
        },
      ],
    } as any);

    await useCartStore.getState().syncWithBackend();

    expect(useCartStore.getState().selectedItemIds).toEqual(['ci-1']);
  });
});
