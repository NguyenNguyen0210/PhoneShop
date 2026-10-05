// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link, useNavigate, useSearchParams } from 'react-router-dom';
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

  it('restores saved scroll position when navigating back (POP)', async () => {
    sessionStorage.setItem('scroll_/', '1450');

    const BackButton = () => {
      const navigate = useNavigate();
      return <button onClick={() => navigate(-1)}>Back</button>;
    };

    const { getByText } = render(
      <MemoryRouter initialEntries={['/', '/products/1']} initialIndex={1}>
        <ScrollToTop />
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h1>Home Page</h1>
              </div>
            }
          />
          <Route
            path="/products/:id"
            element={
              <div>
                <h1>Product Page</h1>
                <BackButton />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    window.scrollTo = vi.fn();

    // Trigger back
    await act(async () => {
      getByText('Back').click();
    });

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 1450, left: 0, behavior: 'instant' });

    // Clean up
    sessionStorage.removeItem('scroll_/');
  });

  it('preserves scroll when only search params change (in-page filter, e.g. ?page=1 -> ?page=2)', async () => {
    const FilterButton = () => {
      const [, setSearchParams] = useSearchParams();
      return (
        <button
          onClick={() =>
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('page', '2');
              return next;
            })
          }
        >
          Apply filter
        </button>
      );
    };

    const { getByText } = render(
      <MemoryRouter initialEntries={['/?page=1']}>
        <ScrollToTop />
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h1>Home Page</h1>
                <FilterButton />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    (window.scrollTo as any).mockClear();
    document.documentElement.scrollTop = 800;
    document.body.scrollTop = 800;

    await act(async () => {
      getByText('Apply filter').click();
    });

    // Same page, only query changed -> must NOT jump to top
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(document.documentElement.scrollTop).toBe(800);
    expect(document.body.scrollTop).toBe(800);
  });

  it('does not scroll to top when setSearchParams keeps the identical query (filter toggle no-op)', async () => {
    const FilterButton = () => {
      const [, setSearchParams] = useSearchParams();
      return <button onClick={() => setSearchParams((prev) => prev)}>Toggle filter</button>;
    };

    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h1>Home Page</h1>
                <FilterButton />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    (window.scrollTo as any).mockClear();
    document.documentElement.scrollTop = 800;
    document.body.scrollTop = 800;

    await act(async () => {
      getByText('Toggle filter').click();
    });

    expect(window.scrollTo).not.toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(document.documentElement.scrollTop).toBe(800);
    expect(document.body.scrollTop).toBe(800);
  });
});
