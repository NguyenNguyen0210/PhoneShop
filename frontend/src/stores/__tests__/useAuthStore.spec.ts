// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../useAuthStore';
import { useCartStore } from '../useCartStore';
import { useWishlistStore } from '../useWishlistStore';
import { useNotificationStore } from '../useNotificationStore';

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    googleLogin: vi.fn(),
    getProfile: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

const userA = { id: 'a1', email: 'a@shop.vn', fullName: 'User A' };
const userB = { id: 'b2', email: 'b@shop.vn', fullName: 'User B' };

describe('useAuthStore.syncFromStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, error: null });
  });

  it('should adopt auth written by another tab', () => {
    useAuthStore.setState({ user: userA as any, accessToken: 'tok-a', refreshToken: 'ref-a' });
    localStorage.setItem('phoneshop_user', JSON.stringify(userB));
    localStorage.setItem('phoneshop_access_token', 'tok-b');
    localStorage.setItem('phoneshop_refresh_token', 'ref-b');

    useAuthStore.getState().syncFromStorage();

    const s = useAuthStore.getState();
    expect((s.user as any)?.email).toBe('b@shop.vn');
    expect(s.accessToken).toBe('tok-b');
  });

  it('should clear state when another tab logged out', () => {
    useAuthStore.setState({ user: userA as any, accessToken: 'tok-a', refreshToken: 'ref-a' });

    useAuthStore.getState().syncFromStorage();

    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.accessToken).toBeNull();
  });

  it('should keep state when storage already matches', () => {
    useAuthStore.setState({ user: userA as any, accessToken: 'tok-a', refreshToken: 'ref-a' });
    localStorage.setItem('phoneshop_user', JSON.stringify(userA));
    localStorage.setItem('phoneshop_access_token', 'tok-a');
    localStorage.setItem('phoneshop_refresh_token', 'ref-a');

    const before = useAuthStore.getState();
    useAuthStore.getState().syncFromStorage();

    expect(useAuthStore.getState()).toBe(before);
  });
});

describe('useAuthStore.logout — cross-user cleanup (E1)', () => {
  const cartItem = {
    id: 'local-v1',
    variantId: 'v1',
    quantity: 1,
    unitPrice: 100000,
    price: 100000,
    product: { id: 'p1', name: 'P' } as any,
    variant: { id: 'v1', price: 100000 } as any,
  };

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, error: null });
    useCartStore.setState({ items: [], selectedItemIds: [] });
    useWishlistStore.getState().clearState();
    useNotificationStore.getState().clearState();
  });

  it('resets cart store, pending queue, persisted cart, wishlist and notifications', async () => {
    useAuthStore.setState({ user: userA as any, accessToken: 'tok-a', refreshToken: 'ref-a' });
    useCartStore.setState({ items: [cartItem], selectedItemIds: ['local-v1'] });
    localStorage.setItem('phoneshop_cart_pending', JSON.stringify(['v1']));
    useWishlistStore.setState({
      items: [{ id: 'w1', productId: 'p1' } as any],
      itemIds: ['p1'],
    });
    useNotificationStore.setState({ unreadCount: 3, items: [{ id: 'n1' } as any] });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('phoneshop_access_token')).toBeNull();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().selectedItemIds).toEqual([]);
    expect(localStorage.getItem('phoneshop_cart_pending')).toBeNull();
    const persisted = localStorage.getItem('phoneshop_cart_storage');
    expect(
      persisted === null || (JSON.parse(persisted as string)?.state?.items ?? []).length === 0
    ).toBe(true);
    expect(useWishlistStore.getState().itemIds).toEqual([]);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
