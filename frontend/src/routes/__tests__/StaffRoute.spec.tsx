// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { StaffRoute } from '../StaffRoute';
import { AdminRoute } from '../AdminRoute';
import { useAuthStore } from '../../stores/useAuthStore';
import type { User } from '../../types';

type MockUser = Partial<User> & { roles?: string[] };

const LocationTracker = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="current-pathname">{location.pathname}</div>
      <div data-testid="current-state">{JSON.stringify(location.state)}</div>
    </div>
  );
};

const renderWithStaffRoute = (initialPath = '/staff') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationTracker />
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
        <Route element={<StaffRoute />}>
          <Route path="/staff" element={<div data-testid="staff-content">Staff Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

const renderWithAdminRoute = (initialPath = '/admin') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationTracker />
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
        <Route path="/staff" element={<div data-testid="staff-page">Staff Page</div>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div data-testid="admin-content">Admin Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('StaffRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    });
  });

  it('redirects unauthenticated to /login with state', () => {
    renderWithStaffRoute('/staff');

    expect(screen.getByTestId('login-page')).toBeDefined();
    expect(screen.queryByTestId('staff-content')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/login');

    const state = JSON.parse(screen.getByTestId('current-state').textContent || '{}');
    expect(state?.from?.pathname).toBe('/staff');
  });

  it('allows STAFF into /staff', () => {
    const staffUser: MockUser = {
      id: 'staff-1',
      email: 'staff@example.com',
      role: 'STAFF',
      roles: ['STAFF'],
      fullName: 'Staff User',
    };

    useAuthStore.setState({
      user: staffUser as User,
      accessToken: 'staff-token',
    });

    renderWithStaffRoute('/staff');

    expect(screen.getByTestId('staff-content')).toBeDefined();
    expect(screen.queryByTestId('login-page')).toBeNull();
    expect(screen.queryByTestId('home-page')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/staff');
  });

  it('redirects regular USER to /', () => {
    const regularUser: MockUser = {
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
      roles: ['USER'],
      fullName: 'Regular User',
    };

    useAuthStore.setState({
      user: regularUser as User,
      accessToken: 'user-token',
    });

    renderWithStaffRoute('/staff');

    expect(screen.getByTestId('home-page')).toBeDefined();
    expect(screen.queryByTestId('staff-content')).toBeNull();
    expect(screen.queryByTestId('login-page')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/');
  });
});

describe('AdminRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    });
  });

  it('redirects unauthenticated to /login', () => {
    renderWithAdminRoute('/admin');

    expect(screen.getByTestId('login-page')).toBeDefined();
    expect(screen.queryByTestId('admin-content')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/login');
  });

  it('redirects STAFF to /staff', () => {
    const staffUser: MockUser = {
      id: 'staff-1',
      email: 'staff@example.com',
      role: 'STAFF',
      roles: ['STAFF'],
      fullName: 'Staff User',
    };

    useAuthStore.setState({
      user: staffUser as User,
      accessToken: 'staff-token',
    });

    renderWithAdminRoute('/admin');

    expect(screen.getByTestId('staff-page')).toBeDefined();
    expect(screen.queryByTestId('admin-content')).toBeNull();
    expect(screen.queryByTestId('home-page')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/staff');
  });

  it('allows ADMIN into /admin', () => {
    const adminUser: MockUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      roles: ['ADMIN'],
      fullName: 'Admin User',
    };

    useAuthStore.setState({
      user: adminUser as User,
      accessToken: 'admin-token',
    });

    renderWithAdminRoute('/admin');

    expect(screen.getByTestId('admin-content')).toBeDefined();
    expect(screen.queryByTestId('staff-page')).toBeNull();
    expect(screen.queryByTestId('login-page')).toBeNull();
    expect(screen.queryByTestId('home-page')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/admin');
  });

  it('allows MANAGER into /admin', () => {
    const managerUser: MockUser = {
      id: 'manager-1',
      email: 'manager@example.com',
      role: 'MANAGER',
      roles: ['MANAGER'],
      fullName: 'Manager User',
    };

    useAuthStore.setState({
      user: managerUser as User,
      accessToken: 'manager-token',
    });

    renderWithAdminRoute('/admin');

    expect(screen.getByTestId('admin-content')).toBeDefined();
    expect(screen.queryByTestId('staff-page')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/admin');
  });

  it('redirects regular USER to /', () => {
    const regularUser: MockUser = {
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
      roles: ['USER'],
      fullName: 'Regular User',
    };

    useAuthStore.setState({
      user: regularUser as User,
      accessToken: 'user-token',
    });

    renderWithAdminRoute('/admin');

    expect(screen.getByTestId('home-page')).toBeDefined();
    expect(screen.queryByTestId('admin-content')).toBeNull();
    expect(screen.getByTestId('current-pathname').textContent).toBe('/');
  });
});
