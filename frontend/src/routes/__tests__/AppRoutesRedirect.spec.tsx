// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, Outlet } from 'react-router-dom';
import { AppRoutes, ProductsRedirect } from '../AppRoutes';

vi.mock('../../layouts/StorefrontLayout', () => ({
  StorefrontLayout: () => {
    const location = useLocation();
    return (
      <div>
        <div data-testid="current-path">{location.pathname}</div>
        <div data-testid="current-search">{location.search}</div>
        <div data-testid="current-hash">{location.hash}</div>
        <Outlet />
      </div>
    );
  },
}));

vi.mock('../../layouts/AdminLayout', () => ({
  AdminLayout: () => <div>Admin Layout</div>,
}));

vi.mock('../../pages/storefront/Home/HomePage', () => ({
  HomePage: () => <div data-testid="home-page">Home Page Content</div>,
}));

vi.mock('../../pages/storefront/ProductDetail/ProductDetailPage', () => ({
  ProductDetailPage: () => <div data-testid="pdp-page">Product Detail Page</div>,
}));

describe('AppRoutes /products redirect', () => {
  it('redirects /products to / and displays HomePage', () => {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByTestId('home-page')).toBeDefined();
    expect(screen.getByTestId('current-path').textContent).toBe('/');
    expect(screen.getByTestId('current-search').textContent).toBe('');
  });

  it('redirects /products?search=iphone to /?search=iphone preserving query parameters', () => {
    render(
      <MemoryRouter initialEntries={['/products?search=iphone']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByTestId('home-page')).toBeDefined();
    expect(screen.getByTestId('current-path').textContent).toBe('/');
    expect(screen.getByTestId('current-search').textContent).toBe('?search=iphone');
  });

  it('redirects /products?brand=Apple&page=2 preserving multiple query parameters', () => {
    render(
      <MemoryRouter initialEntries={['/products?brand=Apple&page=2']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByTestId('home-page')).toBeDefined();
    expect(screen.getByTestId('current-path').textContent).toBe('/');
    expect(screen.getByTestId('current-search').textContent).toBe('?brand=Apple&page=2');
  });

  it('keeps /products/:id route intact and renders ProductDetailPage without redirecting', () => {
    render(
      <MemoryRouter initialEntries={['/products/iphone-16-pro']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByTestId('pdp-page')).toBeDefined();
    expect(screen.queryByTestId('home-page')).toBeNull();
    expect(screen.getByTestId('current-path').textContent).toBe('/products/iphone-16-pro');
  });
});

describe('ProductsRedirect component', () => {
  it('preserves search and hash when redirecting', () => {
    let capturedLocation: any;
    const LocationWatcher = () => {
      capturedLocation = useLocation();
      return null;
    };

    render(
      <MemoryRouter initialEntries={['/products?brand=Samsung#features']}>
        <ProductsRedirect />
        <LocationWatcher />
      </MemoryRouter>
    );

    expect(capturedLocation.pathname).toBe('/');
    expect(capturedLocation.search).toBe('?brand=Samsung');
    expect(capturedLocation.hash).toBe('#features');
  });
});
