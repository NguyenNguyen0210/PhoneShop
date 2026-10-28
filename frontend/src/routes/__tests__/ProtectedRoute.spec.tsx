// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuthStore } from '../../stores/useAuthStore';

const LocationTracker = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="current-pathname">{location.pathname}</div>
      <div data-testid="current-state">{JSON.stringify(location.state)}</div>
    </div>
  );
};

const renderProtected = (initialPath = '/checkout') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationTracker />
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<div data-testid="protected-content">Protected</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute (E10)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  it('redirects to /login when the user is missing even if a token exists', () => {
    useAuthStore.setState({ user: null, accessToken: 'tok' });
    renderProtected('/checkout');

    expect(screen.getByTestId('login-page')).toBeDefined();
    expect(screen.queryByTestId('protected-content')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/login');
  });

  it('redirects to /login when the access token is missing even if a user object exists', () => {
    useAuthStore.setState({ user: { id: 'u1', email: 'a@b.vn' } as any, accessToken: null });
    renderProtected('/checkout');

    expect(screen.getByTestId('login-page')).toBeDefined();
    expect(screen.queryByTestId('protected-content')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/login');
  });

  it('renders protected content when both user and access token exist', () => {
    useAuthStore.setState({ user: { id: 'u1', email: 'a@b.vn' } as any, accessToken: 'tok' });
    renderProtected('/checkout');

    expect(screen.getByTestId('protected-content')).toBeDefined();
    expect(screen.queryByTestId('login-page')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/checkout');
  });

  it('passes the attempted location in the redirect state', () => {
    useAuthStore.setState({ user: null, accessToken: null });
    renderProtected('/checkout');

    const state = JSON.parse(screen.getByTestId('current-state').textContent || '{}');
    expect(state?.from?.pathname).toBe('/checkout');
  });
});
