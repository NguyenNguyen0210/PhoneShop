// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminUsersPage } from '../AdminUsersPage';
import { userService } from '../../../../services/userService';

// Mock matchMedia for Ant Design
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

(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../../../services/userService', () => ({
  userService: {
    getUsers: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    changeRole: vi.fn(),
    resetPassword: vi.fn(),
    activateUser: vi.fn(),
    deactivateUser: vi.fn(),
    banUser: vi.fn(),
    getUserAuditLogs: vi.fn(),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = {
      user: {
        id: 'admin-id-1',
        email: 'admin@cellphones.com',
        role: 'ADMIN',
        fullName: 'Admin User',
      },
      isAdmin: () => true,
    };
    return selector ? selector(state) : state;
  },
}));

const mockUsersData = [
  {
    id: 'admin-id-1',
    email: 'admin@cellphones.com',
    firstName: 'Admin',
    lastName: 'User',
    phone: '0911222333',
    status: 'ACTIVE' as const,
    roles: [{ role: { name: 'ADMIN' as const } }],
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'user-2',
    email: 'customer@gmail.com',
    firstName: 'Van',
    lastName: 'Nguyen',
    phone: '0988776655',
    status: 'ACTIVE' as const,
    roles: [{ role: { name: 'USER' as const } }],
    createdAt: '2026-10-02T09:00:00.000Z',
  },
  {
    id: 'user-3',
    email: 'banned@test.com',
    firstName: 'Banned',
    lastName: 'Person',
    phone: '0977665544',
    status: 'BANNED' as const,
    roles: [{ role: { name: 'USER' as const } }],
    createdAt: '2026-10-03T10:00:00.000Z',
  },
];

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (userService.getUsers as any).mockResolvedValue({
      data: mockUsersData,
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders KPI cards, toolbar and user table with loaded data', async () => {
    (userService.getUsers as any).mockResolvedValueOnce({
      data: mockUsersData,
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    render(<AdminUsersPage />);

    expect(screen.getByText(/Quản lý Người dùng/i)).toBeDefined();
    expect(screen.getByText('Tổng người dùng')).toBeDefined();
    expect(screen.getByText('Đang hoạt động')).toBeDefined();
    expect(screen.getByText('Bị khóa / Cấm')).toBeDefined();
    expect(screen.getByText('Quản trị & Nhân sự')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('admin@cellphones.com')).toBeDefined();
      expect(screen.getByText('customer@gmail.com')).toBeDefined();
      expect(screen.getByText('banned@test.com')).toBeDefined();
    });

    expect(screen.getByText('Van Nguyen')).toBeDefined();
  }, 15000);

  it('enforces self-lockout prevention on current admin row', async () => {
    render(<AdminUsersPage />);

    await waitFor(
      () => {
        expect(screen.getByText('admin@cellphones.com')).toBeDefined();
      },
      { timeout: 8000 },
    );

    const roleButtons = screen.getAllByRole('button', { name: /Đổi vai trò/i });
    expect(roleButtons[0]).toHaveProperty('disabled', true);
  }, 15000);

  it('opens CreateUserModal when clicking Thêm người dùng mới button', async () => {
    (userService.getUsers as any).mockResolvedValueOnce({
      data: mockUsersData,
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    render(<AdminUsersPage />);

    const addBtn = screen.getByRole('button', { name: /Thêm người dùng mới/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Tạo tài khoản')).toBeDefined();
    });
  }, 15000);

  it('opens UserAuditLogsDrawer when clicking Nhật ký button', async () => {
    (userService.getUsers as any).mockResolvedValueOnce({
      data: mockUsersData,
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    (userService.getUserAuditLogs as any).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('customer@gmail.com')).toBeDefined();
    });

    const auditButtons = screen.getAllByRole('button', { name: /Nhật ký/i });
    fireEvent.click(auditButtons[0]);

    await waitFor(() => {
      expect(userService.getUserAuditLogs).toHaveBeenCalled();
    });
  }, 15000);
});
