// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StaffCustomersPage } from '../StaffCustomersPage';
import { userService } from '../../../../services/userService';

// Mock matchMedia and ResizeObserver for Ant Design components in JSDOM
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

vi.mock('../../../../services/userService', () => ({
  userService: {
    getAllUsers: vi.fn(),
  },
}));

const mockUsers = [
  {
    id: 'user-c1',
    fullName: 'Nguyễn Văn An',
    email: 'an.nguyen@example.com',
    phone: '0901234567',
    role: 'USER',
    avatar: 'https://example.com/avatar1.jpg',
  },
  {
    id: 'user-c2',
    firstName: 'Bình',
    lastName: 'Trần Thị',
    email: 'binh.tran@example.com',
    phone: '0912345678',
    role: 'USER',
  },
  {
    id: 'user-c3',
    fullName: 'Lê Hoàng Long',
    email: 'long.le@example.com',
    phone: '',
    role: 'USER',
  },
];

describe('StaffCustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches userService.getAllUsers({ role: "USER" }) and renders customer directory table', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValueOnce({
      data: mockUsers,
      total: 3,
    } as any);

    render(
      <MemoryRouter>
        <StaffCustomersPage />
      </MemoryRouter>
    );

    expect(userService.getAllUsers).toHaveBeenCalledWith({ role: 'USER' });

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
      expect(screen.getByText('an.nguyen@example.com')).toBeDefined();
      expect(screen.getByText('0901234567')).toBeDefined();
      expect(screen.getByText('Trần Thị Bình')).toBeDefined();
      expect(screen.getByText('Lê Hoàng Long')).toBeDefined();
    });

    // Check Role Tags
    const tags = screen.getAllByText('KHÁCH HÀNG');
    expect(tags.length).toBeGreaterThanOrEqual(3);

    // Check Action button "Hồ sơ 360°"
    const profileButtons = screen.getAllByRole('button', { name: /Hồ sơ 360°/i });
    expect(profileButtons.length).toBe(3);
  });

  it('navigates to /staff/customers/:id when clicking "Hồ sơ 360°"', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValueOnce(mockUsers as any);

    const Tracker = () => {
      return <div data-testid="detail-page">Customer 360 Detail Page</div>;
    };

    render(
      <MemoryRouter initialEntries={['/staff/customers']}>
        <Routes>
          <Route path="/staff/customers" element={<StaffCustomersPage />} />
          <Route path="/staff/customers/:id" element={<Tracker />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    });

    const buttons = screen.getAllByRole('button', { name: /Hồ sơ 360°/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('detail-page')).toBeDefined();
    });
  });

  it('filters customers by search query (name, email, phone)', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValueOnce({
      items: mockUsers,
    } as any);

    render(
      <MemoryRouter>
        <StaffCustomersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
      expect(screen.getByText('Trần Thị Bình')).toBeDefined();
      expect(screen.getByText('Lê Hoàng Long')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Tìm theo Tên, Email, SĐT...');

    // Filter by name
    fireEvent.change(searchInput, { target: { value: 'Bình' } });
    expect(screen.queryByText('Nguyễn Văn An')).toBeNull();
    expect(screen.getByText('Trần Thị Bình')).toBeDefined();

    // Filter by email
    fireEvent.change(searchInput, { target: { value: 'long.le' } });
    expect(screen.queryByText('Trần Thị Bình')).toBeNull();
    expect(screen.getByText('Lê Hoàng Long')).toBeDefined();

    // Filter by phone
    fireEvent.change(searchInput, { target: { value: '090123' } });
    expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    expect(screen.queryByText('Lê Hoàng Long')).toBeNull();
  });

  it('does NOT render any admin mutation buttons or controls', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValueOnce(mockUsers as any);

    render(
      <MemoryRouter>
        <StaffCustomersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    });

    // Check absence of mutation buttons
    expect(screen.queryByText(/Thêm người dùng/i)).toBeNull();
    expect(screen.queryByText(/Tạo người dùng/i)).toBeNull();
    expect(screen.queryByText(/Đổi vai trò/i)).toBeNull();
    expect(screen.queryByText(/Đặt lại mật khẩu/i)).toBeNull();
    expect(screen.queryByText(/Khóa tài khoản/i)).toBeNull();
    expect(screen.queryByText(/Kích hoạt/i)).toBeNull();
    expect(screen.queryByText(/Tạm ngưng/i)).toBeNull();
  });
});
