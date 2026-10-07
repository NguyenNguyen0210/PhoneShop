// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../useAuthStore';

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
