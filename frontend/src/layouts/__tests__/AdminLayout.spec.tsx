// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminLayout } from '../AdminLayout';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLayout = (initialRoute = '/admin') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>Admin Dashboard</div>} />
            <Route path="products" element={<div>Products Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it('does NOT render "Quản lý Danh mục" in sidebar menu', () => {
    renderLayout();

    expect(screen.queryByText('Quản lý Danh mục')).toBeNull();
  });

  it('renders other inventory & products menu items', () => {
    renderLayout();

    expect(screen.getByText('Quản lý Sản phẩm')).toBeDefined();
    expect(screen.getByText('Quản lý Thương hiệu')).toBeDefined();
    expect(screen.getByText('Quản lý Kho & IMEI')).toBeDefined();
    expect(screen.getByText('Nhà cung cấp')).toBeDefined();
  });
});
