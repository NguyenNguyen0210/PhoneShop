// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { ScrollToTop } from '../ScrollToTop';

describe('ScrollToTop component', () => {
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    window.scrollTo = vi.fn();
    document.documentElement.scrollTop = 500;
    document.body.scrollTop = 500;
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
    vi.restoreAllMocks();
  });

  it('scrolls to top when pathname changes', async () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h1>Home Page</h1>
                <Link to="/products/1">View Product</Link>
              </div>
            }
          />
          <Route
            path="/products/:id"
            element={
              <div>
                <h1>Product Detail Page</h1>
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Initial mount on '/'
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);

    // Simulate navigation by clicking link
    document.documentElement.scrollTop = 800;
    document.body.scrollTop = 800;

    await act(async () => {
      getByText('View Product').click();
    });

    // Should scroll to top for the new route
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });

  it('scrolls to element when hash is present', async () => {
    const mockScrollIntoView = vi.fn();
    const targetElement = document.createElement('div');
    targetElement.id = 'reviews-section';
    targetElement.scrollIntoView = mockScrollIntoView;
    document.body.appendChild(targetElement);

    render(
      <MemoryRouter initialEntries={['/products/1#reviews-section']}>
        <ScrollToTop />
        <div>Product Page</div>
      </MemoryRouter>
    );

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    document.body.removeChild(targetElement);
  });

  it('configures history.scrollRestoration to manual', () => {
    const historyObj = { scrollRestoration: 'auto' };
    Object.defineProperty(window, 'history', {
      value: historyObj,
      writable: true,
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
        <div>Content</div>
      </MemoryRouter>
    );

    expect(window.history.scrollRestoration).toBe('manual');
  });
});
