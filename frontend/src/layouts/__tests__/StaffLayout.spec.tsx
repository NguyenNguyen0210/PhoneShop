// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StaffLayout } from '../StaffLayout';

// Mock window.matchMedia for Ant Design components
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

// Mock ResizeObserver for Ant Design layout/components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('StaffLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLayout = (initialRoute = '/staff') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<StaffLayout />}>
            <Route path="staff" element={<div>Staff Dashboard Content</div>} />
            <Route path="staff/orders" element={<div>Orders Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders "STAFF WORKSPACE" branding and all operational menu items', () => {
    renderLayout();

    // STAFF WORKSPACE branding
    expect(screen.getByText('STAFF WORKSPACE')).toBeDefined();

    // Operational menu items
    const operationalMenuItems = [
      'Bàn làm việc (Dashboard)',
      'Đơn hàng & Giao vận',
      'Kho hàng & Quản lý IMEI',
      'Vé hỗ trợ CSKH',
      'Xử lý Đổi trả',
      'Thẩm định Trả góp',
      'Đánh giá & Phản hồi',
      'Tra cứu Khách hàng',
    ];

    operationalMenuItems.forEach((item) => {
      expect(screen.getByText(item)).toBeDefined();
    });
  });

  it('does NOT contain forbidden admin links', () => {
    renderLayout();

    const forbiddenLinks = [
      'Cấu hình Hệ thống',
      'Quản lý Người dùng',
      'Nhật ký Hoạt động (Audit Logs)',
      'Khuyến mãi & Flash Sale',
      'Nhà cung cấp',
      'Quản lý Danh mục',
      'Quản lý Thương hiệu',
    ];

    forbiddenLinks.forEach((link) => {
      expect(screen.queryByText(link)).toBeNull();
    });
  });

  it('renders global quick search input and handles onKeyDown Enter', () => {
    renderLayout();

    const searchInput = screen.getByPlaceholderText('Tìm nhanh Mã đơn, IMEI, SĐT khách...');
    expect(searchInput).toBeDefined();

    // Simulate typing order code and pressing Enter
    fireEvent.change(searchInput, { target: { value: 'ORD-12345' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/staff/orders?search=ORD-12345');
  });

  it('handles quick search with 15-digit IMEI and phone numbers', () => {
    renderLayout();

    const searchInput = screen.getByPlaceholderText('Tìm nhanh Mã đơn, IMEI, SĐT khách...');

    // 15-digit IMEI
    fireEvent.change(searchInput, { target: { value: '123456789012345' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/staff/inventory?search=123456789012345');

    // Phone number
    fireEvent.change(searchInput, { target: { value: '0901234567' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/staff/customers?search=0901234567');
  });

  it('renders header elements: collapse toggle, breadcrumb, online pill, storefront button, role tag', () => {
    renderLayout();

    // Breadcrumb starting with Staff
    expect(screen.getByText('Staff')).toBeDefined();

    // Role tag
    expect(screen.getByText('NHÂN VIÊN VẬN HÀNH')).toBeDefined();

    // Storefront button
    expect(screen.getByText('Storefront')).toBeDefined();

    // Online status pill
    expect(screen.getByText('Trực tuyến')).toBeDefined();
  });

  it('renders footer with green online indicator and status text', () => {
    renderLayout();

    expect(
      screen.getByText('Ca trực Vận hành - Đồng bộ đơn hàng: Thời gian thực')
    ).toBeDefined();
  });

  it('renders outlet content', () => {
    renderLayout('/staff');
    expect(screen.getByText('Staff Dashboard Content')).toBeDefined();
  });

  it('navigates when menu item is clicked', () => {
    renderLayout();

    const ordersMenuItem = screen.getByText('Đơn hàng & Giao vận');
    fireEvent.click(ordersMenuItem);

    expect(mockNavigate).toHaveBeenCalledWith('/staff/orders');
  });
});
