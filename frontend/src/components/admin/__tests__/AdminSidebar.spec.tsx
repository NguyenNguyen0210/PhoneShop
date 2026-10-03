// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminSidebar } from '../AdminSidebar';
import { describe, it, expect, vi } from 'vitest';

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

describe('AdminSidebar', () => {
  it('should render Quản lý Người dùng menu item', () => {
    render(
      <BrowserRouter>
        <AdminSidebar />
      </BrowserRouter>,
    );
    expect(screen.getByText('Quản lý Người dùng')).toBeDefined();
  });

  it('should render Nhật ký kiểm toán menu item', () => {
    render(
      <BrowserRouter>
        <AdminSidebar />
      </BrowserRouter>,
    );
    expect(screen.getByText('Nhật ký kiểm toán')).toBeDefined();
  });
});
