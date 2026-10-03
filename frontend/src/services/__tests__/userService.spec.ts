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

  it('getUsers should call GET /users with query params and return response data', async () => {
    const mockResponse = {
      data: {
        data: [
          {
            id: 'user-1',
            email: 'admin@example.com',
            firstName: 'Super',
            lastName: 'Admin',
            status: 'ACTIVE',
            roles: [{ role: { id: 'r1', name: 'ADMIN' } }],
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };
    (apiClient.get as any).mockResolvedValueOnce(mockResponse);

    const params = { page: 1, limit: 10, search: 'Admin', role: 'ADMIN', status: 'ACTIVE' };
    const res = await userService.getUsers(params);

    expect(apiClient.get).toHaveBeenCalledWith('/users', { params });
    expect(res).toEqual(mockResponse.data);
  });

  it('getUserById should call GET /users/:id and return user', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@example.com',
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE',
      roles: [{ role: { id: 'r1', name: 'ADMIN' } }],
      createdAt: '2026-10-01T00:00:00.000Z',
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockUser });

    const res = await userService.getUserById('user-1');
    expect(apiClient.get).toHaveBeenCalledWith('/users/user-1');
    expect(res).toEqual(mockUser);
  });

  it('createUser should call POST /users with payload and return created user', async () => {
    const payload = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '0901234567',
      roles: ['STAFF'] as any,
      status: 'ACTIVE' as any,
    };
    const createdUser = { id: 'user-2', ...payload };
    (apiClient.post as any).mockResolvedValueOnce({ data: createdUser });

    const res = await userService.createUser(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/users', payload);
    expect(res).toEqual(createdUser);
  });

  it('updateUser should call PATCH /users/:id with payload and return updated user', async () => {
    const payload = {
      firstName: 'Johnny',
      lastName: 'Doe',
      phone: '0987654321',
    };
    (apiClient.patch as any).mockResolvedValueOnce({ data: { id: 'user-2', ...payload } });

    const res = await userService.updateUser('user-2', payload);
    expect(apiClient.patch).toHaveBeenCalledWith('/users/user-2', payload);
    expect(res.firstName).toBe('Johnny');
  });

  it('changeRole should call PATCH /users/:id with roles array', async () => {
    (apiClient.patch as any).mockResolvedValueOnce({ data: { id: 'user-2', roles: [{ role: { name: 'MANAGER' } }] } });

    const res = await userService.changeRole('user-2', ['MANAGER']);
    expect(apiClient.patch).toHaveBeenCalledWith('/users/user-2', { roles: ['MANAGER'] });
    expect(res.roles[0].role.name).toBe('MANAGER');
  });

  it('resetPassword should call PATCH /users/:id with password body', async () => {
    (apiClient.patch as any).mockResolvedValueOnce({ data: { success: true } });

    await userService.resetPassword('user-1', 'NewSecurePassword123!');
    expect(apiClient.patch).toHaveBeenCalledWith('/users/user-1', {
      password: 'NewSecurePassword123!',
    });
  });

  it('activateUser should call PUT /users/:id/activate', async () => {
    (apiClient.put as any).mockResolvedValueOnce({ data: { id: 'user-1', status: 'ACTIVE' } });

    const res = await userService.activateUser('user-1');
    expect(apiClient.put).toHaveBeenCalledWith('/users/user-1/activate');
    expect(res.status).toBe('ACTIVE');
  });

  it('deactivateUser should call PUT /users/:id/deactivate', async () => {
    (apiClient.put as any).mockResolvedValueOnce({ data: { id: 'user-1', status: 'INACTIVE' } });

    const res = await userService.deactivateUser('user-1');
    expect(apiClient.put).toHaveBeenCalledWith('/users/user-1/deactivate');
    expect(res.status).toBe('INACTIVE');
  });

  it('banUser should call PUT /users/:id/ban', async () => {
    (apiClient.put as any).mockResolvedValueOnce({ data: { id: 'user-1', status: 'BANNED' } });

    const res = await userService.banUser('user-1');
    expect(apiClient.put).toHaveBeenCalledWith('/users/user-1/ban');
    expect(res.status).toBe('BANNED');
  });

  it('changePassword should call POST /users/change-password with payload', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: { success: true, message: 'Password changed' } });

    const res = await userService.changePassword({
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/users/change-password', {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    });
    expect(res).toEqual({ success: true, message: 'Password changed' });
  });

  it('getUserAuditLogs should call GET /audit-logs with userId and limit', async () => {
    const logsResponse = {
      data: [
        {
          id: 'log-1',
          action: 'UPDATE',
          entity: 'User',
          entityId: 'user-1',
          userId: 'admin-1',
          createdAt: '2026-10-02T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: logsResponse });

    const res = await userService.getUserAuditLogs('user-1');
    expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', {
      params: { userId: 'user-1', limit: 50 },
    });
    expect(res).toEqual(logsResponse);
  });
});
