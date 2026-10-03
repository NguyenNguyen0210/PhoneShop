// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateUserModal } from '../CreateUserModal';
import { EditUserModal } from '../EditUserModal';
import { ChangeRoleModal } from '../ChangeRoleModal';
import { ResetPasswordModal } from '../ResetPasswordModal';
import { UserAuditLogsDrawer } from '../UserAuditLogsDrawer';
import { userService } from '../../../../../services/userService';
import type { ManagedUser } from '../../../../../types/userManagement';

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

vi.mock('../../../../../services/userService', () => ({
  userService: {
    createUser: vi.fn(),
    updateUser: vi.fn(),
    changeRole: vi.fn(),
    resetPassword: vi.fn(),
    getUserAuditLogs: vi.fn(),
  },
}));

const mockUser: ManagedUser = {
  id: 'user-1',
  email: 'test@user.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '0901234567',
  status: 'ACTIVE',
  roles: [{ role: { name: 'USER' } }],
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('UserModals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateUserModal', () => {
    it('renders CreateUserModal with form fields and random password generator', () => {
      const onCancel = vi.fn();
      const onSuccess = vi.fn();

      render(<CreateUserModal open={true} onCancel={onCancel} onSuccess={onSuccess} />);

      expect(screen.getByText('Thêm người dùng mới')).toBeDefined();
      expect(screen.getByLabelText(/Email/i)).toBeDefined();
      const genBtn = screen.getByRole('button', { name: /Tạo mật khẩu/i });
      expect(genBtn).toBeDefined();

      // Click generate password button
      fireEvent.click(genBtn);
      const passInput = screen.getByLabelText(/Mật khẩu/i) as HTMLInputElement;
      expect(passInput.value.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('EditUserModal', () => {
    it('renders EditUserModal with populated values', () => {
      const onCancel = vi.fn();
      const onSuccess = vi.fn();

      render(
        <EditUserModal
          open={true}
          user={mockUser}
          onCancel={onCancel}
          onSuccess={onSuccess}
        />,
      );

      expect(screen.getByText('Chỉnh sửa thông tin người dùng')).toBeDefined();
      const firstNameInput = screen.getByLabelText(/Họ đệm/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Tên/i) as HTMLInputElement;
      expect(firstNameInput.value).toBe('John');
      expect(lastNameInput.value).toBe('Doe');
    });
  });

  describe('ChangeRoleModal', () => {
    it('renders ChangeRoleModal and shows warning when ADMIN role is selected', async () => {
      const onCancel = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ChangeRoleModal
          open={true}
          user={mockUser}
          onCancel={onCancel}
          onSuccess={onSuccess}
        />,
      );

      expect(screen.getByText('Thay đổi vai trò người dùng')).toBeDefined();
      expect(screen.getByText(/test@user.com/i)).toBeDefined();
    });
  });

  describe('ResetPasswordModal', () => {
    it('renders ResetPasswordModal with session revocation warning and random password button', () => {
      const onCancel = vi.fn();
      const onSuccess = vi.fn();

      render(
        <ResetPasswordModal
          open={true}
          user={mockUser}
          onCancel={onCancel}
          onSuccess={onSuccess}
        />,
      );

      expect(screen.getByText(/Đặt lại mật khẩu cho: John Doe/i)).toBeDefined();
      expect(screen.getByText(/Tất cả phiên đăng nhập trên các thiết bị khác sẽ bị hủy bỏ/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Tạo mật khẩu/i })).toBeDefined();
    });
  });

  describe('UserAuditLogsDrawer', () => {
    it('renders UserAuditLogsDrawer and fetches audit logs', async () => {
      const onClose = vi.fn();
      (userService.getUserAuditLogs as any).mockResolvedValueOnce({
        data: [
          {
            id: 'log-1',
            action: 'UPDATE',
            entity: 'User',
            entityId: 'user-1',
            userId: 'admin-1',
            createdAt: '2026-10-02T10:00:00.000Z',
            newData: { firstName: 'Johnny' },
            oldData: { firstName: 'John' },
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      });

      render(
        <UserAuditLogsDrawer
          open={true}
          user={mockUser}
          onClose={onClose}
        />,
      );

      expect(screen.getByText(/Nhật ký hoạt động/i)).toBeDefined();
      await waitFor(() => {
        expect(userService.getUserAuditLogs).toHaveBeenCalledWith('user-1');
      });
    });
  });
});
