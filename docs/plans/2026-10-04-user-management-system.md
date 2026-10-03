# User Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the User Management system by enhancing Backend search, security controls (session revocation, self-lockout prevention, audit logging) and building the comprehensive Admin Portal User Management page (`/admin/users`) with KPI cards, filters, CRUD modals, role switching, password reset, and an audit logs drawer.

**Architecture:** 
- Backend: NestJS + Prisma ORM with multi-token search in `users.service.ts`, session revocation via `refreshToken.updateMany`, self-lockout prevention guards, and audit log generation.
- Frontend: React + TypeScript + Ant Design with `userService.ts`, `AdminUsersPage.tsx`, interactive modals (`CreateUserModal`, `EditUserModal`, `ChangeRoleModal`, `ResetPasswordModal`), and `UserAuditLogsDrawer` connected to `/audit-logs`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React 18, TypeScript, Ant Design 5, Lucide / Ant Design Icons, Vitest / Jest.

---

## File Structure & Responsibilities

### Backend
- `backend/src/modules/users/users.service.ts`: Core user query, creation, update, role change, status toggle, token revocation, self-lockout safety.
- `backend/src/modules/users/users.controller.ts`: Endpoints for `GET /users`, `PATCH /users/:id`, status changes, and current user validation.
- `backend/src/modules/users/dto/query-user.dto.ts`: Query DTO supporting search, role, status, page, limit.
- `backend/test/unit/users-management.spec.ts`: Unit tests verifying search, token revocation, role updates, self-lockout prevention, and audit logs.

### Frontend
- `frontend/src/types/userManagement.ts`: Type definitions for User, UserRole, UserAuditLog, pagination responses, and form payloads.
- `frontend/src/services/userService.ts`: API service wrapping Axios calls to `/users` and `/audit-logs`.
- `frontend/src/components/admin/AdminSidebar.tsx`: Add "Quản lý Người dùng" menu item.
- `frontend/src/routes/AppRoutes.tsx`: Register `/admin/users` protected by `RoleGuard` (`allowedRoles={[ROLES.ADMIN]}`).
- `frontend/src/pages/Admin/Users/components/CreateUserModal.tsx`: Modal for creating users with strong password generator and copy button.
- `frontend/src/pages/Admin/Users/components/EditUserModal.tsx`: Modal for editing user profile (name, phone).
- `frontend/src/pages/Admin/Users/components/ChangeRoleModal.tsx`: Modal for assigning roles (USER, STAFF, MANAGER, ADMIN) with safety warnings.
- `frontend/src/pages/Admin/Users/components/ResetPasswordModal.tsx`: Modal for resetting password with random password generator and session revocation notice.
- `frontend/src/pages/Admin/Users/components/UserAuditLogsDrawer.tsx`: Right-side drawer rendering timeline of user audit logs.
- `frontend/src/pages/Admin/Users/AdminUsersPage.tsx`: Main page uniting KPI cards, search toolbar, user data table, status actions, and modal orchestrations.
- `frontend/src/pages/Admin/Users/__tests__/AdminUsersPage.spec.tsx`: Frontend unit/component tests using Vitest.

---

## Task List Outline

- [ ] **Task 1: Backend Multi-Token Search & Filter Enhancements**
- [ ] **Task 2: Backend Security Safeguards (Token Revocation & Self-Lockout Prevention)**
- [ ] **Task 3: Backend Audit Logs Integration for User Management**
- [ ] **Task 4: Frontend Type Definitions & userService API Layer**
- [ ] **Task 5: Frontend Route & Sidebar Navigation Configuration**
- [ ] **Task 6: Frontend Action Modals (Create, Edit, Change Role, Reset Password) & Audit Drawer**
- [ ] **Task 7: Frontend AdminUsersPage Implementation (KPI Cards, Table, Actions)**
- [ ] **Task 8: End-to-End Verification and Automated Tests**

---

### Task 1: Backend Multi-Token Search & Filter Enhancements

**Files:**
- Modify: `backend/src/modules/users/users.service.ts:80-115`
- Test: `backend/test/unit/users-management.spec.ts`

- [ ] **Step 1: Write failing unit test for user search and filtering**

Create `backend/test/unit/users-management.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/modules/users/users.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('UsersService - Management Features', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      role: {
        findMany: jest.fn(),
      },
      userRole: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should construct multi-token search query for composite names', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      { id: '1', email: 'test@example.com', firstName: 'Van', lastName: 'Nguyen', roles: [] },
    ]);

    const result = await service.findAll({ search: 'Nguyen Van', page: 1, limit: 10 }, { roles: ['ADMIN'] });
    expect(prisma.user.findMany).toHaveBeenCalled();
    const whereArg = prisma.user.findMany.mock.calls[0][0].where;
    expect(whereArg.OR).toBeDefined();
    expect(result.data).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- test/unit/users-management.spec.ts`
Expected: Fails or needs enhanced search handling in `UsersService`.

- [ ] **Step 3: Implement multi-token and robust search in `users.service.ts`**

Update `findAll` in `backend/src/modules/users/users.service.ts`:
```typescript
    if (query.search) {
      const s = query.search.trim();
      const tokens = s.split(/\s+/).filter(Boolean);
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        // Multi-word matches: either both tokens match across first & last name
        ...(tokens.length > 1
          ? [
              {
                AND: tokens.map((tok) => ({
                  OR: [
                    { firstName: { contains: tok, mode: 'insensitive' } },
                    { lastName: { contains: tok, mode: 'insensitive' } },
                  ],
                })),
              },
            ]
          : []),
      ];
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- test/unit/users-management.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/users/users.service.ts backend/test/unit/users-management.spec.ts
git commit -m "feat(users): add multi-token search support in findAll"
```

---

### Task 2: Backend Security Safeguards (Token Revocation & Self-Lockout Prevention)

**Files:**
- Modify: `backend/src/modules/users/users.controller.ts`
- Modify: `backend/src/modules/users/users.service.ts`
- Test: `backend/test/unit/users-management.spec.ts`

- [ ] **Step 1: Write failing unit test for self-lockout and token revocation**

Add tests to `backend/test/unit/users-management.spec.ts`:
```typescript
  it('should throw BadRequestException if admin tries to remove ADMIN role from self', async () => {
    const adminUser = { id: 'admin-1', roles: ['ADMIN'] };
    await expect(
      service.update('admin-1', { roles: ['STAFF'] as any }, adminUser),
    ).rejects.toThrow('Không thể tự hạ quyền ADMIN của chính mình');
  });

  it('should throw BadRequestException if admin tries to deactivate/ban self', async () => {
    const adminUser = { id: 'admin-1', roles: ['ADMIN'] };
    await expect(
      service.changeStatus('admin-1', 'BANNED', adminUser),
    ).rejects.toThrow('Không thể tự khóa tài khoản của chính mình');
  });

  it('should revoke all refresh tokens when password is reset or status set to INACTIVE/BANNED', async () => {
    prisma.user.update.mockResolvedValue({ id: 'target-1', email: 'user@test.com', roles: [] });
    prisma.role.findMany.mockResolvedValue([]);
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await service.update('target-1', { password: 'newSecurePassword123' }, { id: 'admin-1', roles: ['ADMIN'] });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'target-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- test/unit/users-management.spec.ts`
Expected: FAIL because self-lockout checks and token revocation in `update` / `changeStatus` are not yet implemented.

- [ ] **Step 3: Implement security safeguards in `users.service.ts` & `users.controller.ts`**

In `backend/src/modules/users/users.service.ts`:
```typescript
  async update(id: string, dto: UpdateUserDto, currentUser?: any) {
    if (currentUser && currentUser.id === id) {
      if (dto.roles && !dto.roles.includes('ADMIN' as any)) {
        throw new BadRequestException('Không thể tự hạ quyền ADMIN của chính mình');
      }
      if (dto.status && dto.status !== 'ACTIVE') {
        throw new BadRequestException('Không thể tự khóa tài khoản của chính mình');
      }
    }

    const data: any = { ...dto };
    delete data.password;
    delete data.roles;

    let shouldRevokeTokens = false;

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      shouldRevokeTokens = true;
    }

    if (dto.status && dto.status !== 'ACTIVE') {
      shouldRevokeTokens = true;
    }

    if (dto.roles) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      const rolesToConnect = await this.prisma.role.findMany({
        where: { name: { in: dto.roles } },
      });
      data.roles = {
        create: rolesToConnect.map((r) => ({ roleId: r.id })),
      };
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });

    if (shouldRevokeTokens) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    delete (user as any).passwordHash;
    return user;
  }

  async changeStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BANNED', currentUser?: any) {
    if (currentUser && currentUser.id === id && status !== 'ACTIVE') {
      throw new BadRequestException('Không thể tự khóa tài khoản của chính mình');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
    });

    if (status !== 'ACTIVE') {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return user;
  }
```

In `backend/src/modules/users/users.controller.ts`:
Pass `@CurrentUser() user: any` to `update`, `activateUser`, `deactivateUser`, and `banUser`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- test/unit/users-management.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/users/users.service.ts backend/src/modules/users/users.controller.ts backend/test/unit/users-management.spec.ts
git commit -m "feat(users): add self-lockout prevention and session revocation on password/status changes"
```

---

### Task 3: Backend Audit Logs Integration for User Management

**Files:**
- Modify: `backend/src/modules/users/users.service.ts`
- Modify: `backend/src/modules/audit-log/dto/filter-audit-log.dto.ts`
- Modify: `backend/src/modules/audit-log/audit-log.service.ts`
- Test: `backend/test/unit/users-management.spec.ts`

- [ ] **Step 1: Write failing test for user audit logging**

Add tests to `backend/test/unit/users-management.spec.ts`:
```typescript
  it('should record audit log when an admin creates or updates a user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.role.findMany.mockResolvedValue([{ id: 'r1', name: 'USER' }]);
    prisma.user.create.mockResolvedValue({ id: 'u2', email: 'new@example.com', roles: [] });

    await service.create(
      { email: 'new@example.com', password: 'pass', firstName: 'A', lastName: 'B' },
      { id: 'admin-1', email: 'admin@example.com' },
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: expect.any(String),
        entity: 'User',
        entityId: 'u2',
        userId: 'admin-1',
      }),
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- test/unit/users-management.spec.ts`
Expected: FAIL because `auditLog.create` is not yet called in `UsersService`.

- [ ] **Step 3: Implement audit logging in `users.service.ts` & support `entityId` in `audit-log.service.ts`**

Update `backend/src/modules/audit-log/dto/filter-audit-log.dto.ts`:
Add `entityId?: string;` to `FilterAuditLogDto`.

Update `backend/src/modules/audit-log/audit-log.service.ts`:
```typescript
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (filter.entityId) where.entityId = filter.entityId;
    if (userId) {
      // Return logs where user is either the performer OR the target entity
      where.OR = [{ userId }, { entity: 'User', entityId: userId }];
    }
```

In `backend/src/modules/users/users.service.ts`:
Record audit logs upon `create`, `update`, and `changeStatus`:
```typescript
    await this.prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        userId: currentUser?.id,
        newData: { email: user.email, roles: roleNames, status: user.status },
      },
    }).catch((err) => console.error('Audit log failed:', err));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- test/unit/users-management.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/users/users.service.ts backend/src/modules/audit-log/ backend/test/unit/users-management.spec.ts
git commit -m "feat(users): record audit logs for admin user management operations"
```

---

### Task 4: Frontend Type Definitions & userService API Layer

**Files:**
- Create: `frontend/src/types/userManagement.ts`
- Create: `frontend/src/services/userService.ts`
- Test: `frontend/src/services/__tests__/userService.spec.ts`

- [ ] **Step 1: Write failing unit test for userService**

Create `frontend/src/services/__tests__/userService.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../userService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getUsers should call GET /users with params', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: { data: [], total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    const res = await userService.getUsers({ page: 1, limit: 10, search: 'test' });
    expect(apiClient.get).toHaveBeenCalledWith('/users', {
      params: { page: 1, limit: 10, search: 'test' },
    });
    expect(res.total).toBe(0);
  });

  it('resetPassword should call PATCH /users/:id with password body', async () => {
    (apiClient.patch as any).mockResolvedValueOnce({ data: { success: true } });

    await userService.resetPassword('user-1', 'newPass123');
    expect(apiClient.patch).toHaveBeenCalledWith('/users/user-1', {
      password: 'newPass123',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/services/__tests__/userService.spec.ts`
Expected: FAIL ("Cannot find module '../userService'").

- [ ] **Step 3: Implement `frontend/src/types/userManagement.ts` & `frontend/src/services/userService.ts`**

Create `frontend/src/types/userManagement.ts`:
```typescript
export type UserRoleName = 'ADMIN' | 'MANAGER' | 'STAFF' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED';

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  status: UserStatus;
  roles: { role: { id: string; name: UserRoleName } }[];
  createdAt: string;
  updatedAt?: string;
}

export interface UserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface UserListResponse {
  data: ManagedUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserPayload {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles?: UserRoleName[];
  status?: UserStatus;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: UserStatus;
  roles?: UserRoleName[];
  password?: string;
}

export interface UserAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  oldData?: any;
  newData?: any;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}
```

Create `frontend/src/services/userService.ts`:
```typescript
import { apiClient } from './apiClient';
import type {
  ManagedUser,
  UserFilterParams,
  UserListResponse,
  CreateUserPayload,
  UpdateUserPayload,
  UserAuditLog,
} from '../types/userManagement';

export const userService = {
  getUsers: async (params?: UserFilterParams) => {
    const res = await apiClient.get<UserListResponse>('/users', { params });
    return res.data;
  },

  getUserById: async (id: string) => {
    const res = await apiClient.get<ManagedUser>(`/users/${id}`);
    return res.data;
  },

  createUser: async (payload: CreateUserPayload) => {
    const res = await apiClient.post<ManagedUser>('/users', payload);
    return res.data;
  },

  updateUser: async (id: string, payload: UpdateUserPayload) => {
    const res = await apiClient.patch<ManagedUser>(`/users/${id}`, payload);
    return res.data;
  },

  changeRole: async (id: string, roles: string[]) => {
    const res = await apiClient.patch<ManagedUser>(`/users/${id}`, { roles });
    return res.data;
  },

  resetPassword: async (id: string, password: string) => {
    const res = await apiClient.patch<ManagedUser>(`/users/${id}`, { password });
    return res.data;
  },

  activateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/activate`);
    return res.data;
  },

  deactivateUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/deactivate`);
    return res.data;
  },

  banUser: async (id: string) => {
    const res = await apiClient.put(`/users/${id}/ban`);
    return res.data;
  },

  getUserAuditLogs: async (userId: string) => {
    const res = await apiClient.get<{
      data: UserAuditLog[];
      total: number;
      page: number;
      limit: number;
    }>('/audit-logs', { params: { userId, limit: 50 } });
    return res.data;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/services/__tests__/userService.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/userManagement.ts frontend/src/services/userService.ts frontend/src/services/__tests__/userService.spec.ts
git commit -m "feat(frontend): create userManagement types and userService"
```

---

### Task 5: Frontend Route & Sidebar Navigation Configuration

**Files:**
- Modify: `frontend/src/components/admin/AdminSidebar.tsx:17-64`
- Modify: `frontend/src/routes/AppRoutes.tsx:120-130`
- Test: `frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx`

- [ ] **Step 1: Write test for AdminSidebar user management link**

Create/update `frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminSidebar } from '../AdminSidebar';
import { describe, it, expect } from 'vitest';

describe('AdminSidebar', () => {
  it('should render Quản lý Người dùng menu item', () => {
    render(
      <BrowserRouter>
        <AdminSidebar />
      </BrowserRouter>,
    );
    expect(screen.getByText('Quản lý Người dùng')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/admin/__tests__/AdminSidebar.spec.tsx`
Expected: FAIL ("Unable to find an element with text: Quản lý Người dùng").

- [ ] **Step 3: Update `AdminSidebar.tsx` and `AppRoutes.tsx`**

In `frontend/src/components/admin/AdminSidebar.tsx`:
Import `TeamOutlined` from `@ant-design/icons`, and add to `adminMenuItems`:
```typescript
  {
    key: '/admin/users',
    icon: <TeamOutlined style={{ fontSize: 16 }} />,
    label: 'Quản lý Người dùng',
  },
```

In `frontend/src/routes/AppRoutes.tsx`:
Import `AdminUsersPage`:
```tsx
import { AdminUsersPage } from '../pages/Admin/Users/AdminUsersPage';
```
Add route under AdminLayout:
```tsx
  <Route
    path="/admin/users"
    element={
      <RoleGuard allowedRoles={[ROLES.ADMIN]}>
        <AdminUsersPage />
      </RoleGuard>
    }
  />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/admin/__tests__/AdminSidebar.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/AdminSidebar.tsx frontend/src/routes/AppRoutes.tsx frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx
git commit -m "feat(frontend): add User Management link to sidebar and register /admin/users route"
```

---

### Task 6: Frontend Action Modals & Audit Drawer

**Files:**
- Create: `frontend/src/pages/Admin/Users/components/CreateUserModal.tsx`
- Create: `frontend/src/pages/Admin/Users/components/EditUserModal.tsx`
- Create: `frontend/src/pages/Admin/Users/components/ChangeRoleModal.tsx`
- Create: `frontend/src/pages/Admin/Users/components/ResetPasswordModal.tsx`
- Create: `frontend/src/pages/Admin/Users/components/UserAuditLogsDrawer.tsx`
- Test: `frontend/src/pages/Admin/Users/components/__tests__/UserModals.spec.tsx`

- [ ] **Step 1: Write test for CreateUserModal and ResetPasswordModal**

Create `frontend/src/pages/Admin/Users/components/__tests__/UserModals.spec.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateUserModal } from '../CreateUserModal';
import { ResetPasswordModal } from '../ResetPasswordModal';

describe('UserModals', () => {
  it('renders CreateUserModal with random password generator', async () => {
    const onCancel = vi.fn();
    const onSuccess = vi.fn();

    render(
      <CreateUserModal
        open={true}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText('Thêm người dùng mới')).toBeDefined();
    const genBtn = screen.getByRole('button', { name: /Tạo mật khẩu/i });
    expect(genBtn).toBeDefined();
  });

  it('renders ResetPasswordModal with session revocation warning', () => {
    const onCancel = vi.fn();
    const onSuccess = vi.fn();

    render(
      <ResetPasswordModal
        open={true}
        user={{ id: '1', email: 'test@user.com', firstName: 'John', lastName: 'Doe' } as any}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText(/Đặt lại mật khẩu cho: John Doe/i)).toBeDefined();
    expect(screen.getByText(/Tất cả phiên đăng nhập trên các thiết bị khác sẽ bị hủy bỏ/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/Admin/Users/components/__tests__/UserModals.spec.tsx`
Expected: FAIL (files do not exist yet).

- [ ] **Step 3: Implement Modals & Drawer**

1. Create `CreateUserModal.tsx`:
   - Inputs: Email, Password, First Name, Last Name, Phone, Roles (select), Status (select).
   - "Tạo mật khẩu ngẫu nhiên" generator function generating random strong password.
   - Result modal/alert allowing 1-click copy of email + password.
2. Create `EditUserModal.tsx`:
   - Inputs: First Name, Last Name, Phone.
3. Create `ChangeRoleModal.tsx`:
   - Select role (USER, STAFF, MANAGER, ADMIN).
   - Warning if setting to ADMIN.
4. Create `ResetPasswordModal.tsx`:
   - Password input with random password generator button.
   - Security warning banner about active sessions revocation.
5. Create `UserAuditLogsDrawer.tsx`:
   - Ant Design Drawer with Timeline or Table.
   - Calls `userService.getUserAuditLogs(userId)`.
   - Displays timestamp, action tag, IP, details diff.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/Admin/Users/components/__tests__/UserModals.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Users/components/
git commit -m "feat(frontend): implement User Management modals and Audit Logs drawer"
```

---

### Task 7: Frontend AdminUsersPage Implementation

**Files:**
- Create: `frontend/src/pages/Admin/Users/AdminUsersPage.tsx`
- Test: `frontend/src/pages/Admin/Users/__tests__/AdminUsersPage.spec.tsx`

- [ ] **Step 1: Write component test for AdminUsersPage**

Create `frontend/src/pages/Admin/Users/__tests__/AdminUsersPage.spec.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUsersPage } from '../AdminUsersPage';
import { userService } from '../../../services/userService';

vi.mock('../../../services/userService', () => ({
  userService: {
    getUsers: vi.fn(),
    getUserAuditLogs: vi.fn(),
  },
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { id: 'admin-id-1', email: 'admin@cellphones.com', role: 'ADMIN' },
    isAdmin: true,
  }),
}));

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders KPI cards, toolbar and user list', async () => {
    (userService.getUsers as any).mockResolvedValueOnce({
      data: [
        {
          id: 'user-1',
          email: 'customer@test.com',
          firstName: 'Nguyen',
          lastName: 'An',
          status: 'ACTIVE',
          roles: [{ role: { id: 'r1', name: 'USER' } }],
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    render(<AdminUsersPage />);

    expect(screen.getByText(/Quản lý Người dùng/i)).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('customer@test.com')).toBeDefined();
    });
    expect(screen.getByText('Nguyen An')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/Admin/Users/__tests__/AdminUsersPage.spec.tsx`
Expected: FAIL (`AdminUsersPage.tsx` does not exist yet).

- [ ] **Step 3: Implement `AdminUsersPage.tsx`**

Create `frontend/src/pages/Admin/Users/AdminUsersPage.tsx`:
- Render Title and subtitle.
- Render 4 KPI statistic cards:
  1. Tổng số tài khoản (`total`)
  2. Đang hoạt động (`ACTIVE`)
  3. Bị khóa / Cấm (`INACTIVE` + `BANNED`)
  4. Quản trị & Nhân viên (`ADMIN` + `STAFF` + `MANAGER`)
- Render Search & Filter Toolbar:
  - Input with `SearchOutlined` and debounce.
  - Select for Role filter: Tất cả, ADMIN, MANAGER, STAFF, USER.
  - Select for Status filter: Tất cả, ACTIVE, INACTIVE, BANNED.
  - Button "Làm mới dữ liệu" with `ReloadOutlined`.
  - Button "+ Thêm người dùng mới" with `UserAddOutlined`.
- Render Table:
  - Avatar + Full name.
  - Email + Phone.
  - Role Tags (ADMIN = red, MANAGER = purple, STAFF = blue, USER = default).
  - Status Tag (ACTIVE = green, INACTIVE = orange, BANNED = red).
  - Created Date formatted.
  - Action buttons:
    * Sửa (Edit)
    * Đổi vai trò (Change Role)
    * Đổi mật khẩu (Reset Password)
    * Nhật ký hoạt động (Audit Logs)
    * Khóa/Mở khóa (Activate / Deactivate / Ban) with Popconfirm.
    * Self-Lockout check: If `user.id === currentUser.id`, disable role change and ban/deactivate with Tooltip: *"Bạn không thể tự khóa hoặc hạ quyền của chính mình"*.
- Wire up state hooks for `isCreateOpen`, `isEditOpen`, `isChangeRoleOpen`, `isResetPassOpen`, `isAuditLogsOpen`, `selectedUser`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/Admin/Users/__tests__/AdminUsersPage.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Users/AdminUsersPage.tsx frontend/src/pages/Admin/Users/__tests__/AdminUsersPage.spec.tsx
git commit -m "feat(frontend): implement AdminUsersPage with KPI cards, toolbar and safety guards"
```

---

### Task 8: End-to-End Verification and Automated Tests

**Files:**
- Test all: `backend/test/unit/users-management.spec.ts`
- Test all: `frontend/src/pages/Admin/Users/__tests__/`
- Test all: `frontend/src/services/__tests__/userService.spec.ts`

- [ ] **Step 1: Run all Backend tests**

Run: `cd backend && npm test -- test/unit/users-management.spec.ts`
Expected: All tests PASS.

- [ ] **Step 2: Run all Frontend tests**

Run: `cd frontend && npx vitest run src/pages/Admin/Users src/services/__tests__/userService.spec.ts src/components/admin/__tests__/AdminSidebar.spec.tsx`
Expected: All tests PASS.

- [ ] **Step 3: Run TypeScript type checks and builds**

Run:
```bash
cd backend && npm run build
cd ../frontend && npm run build
```
Expected: Both Backend and Frontend build cleanly with 0 type errors.

- [ ] **Step 4: Final commit and cleanup**

```bash
git add .
git commit -m "feat: complete user management system on backend and admin portal"
```




