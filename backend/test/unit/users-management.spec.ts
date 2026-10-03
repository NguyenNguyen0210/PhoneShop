import 'reflect-metadata';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsersService } from '../../src/modules/users/users.service';
import { UsersController } from '../../src/modules/users/users.controller';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { BadRequestException } from '@nestjs/common';

const mockFn = (): any => jest.fn();

describe('UsersService & UsersController Management & Audit Features', () => {
  let service: UsersService;
  let controller: UsersController;
  let auditLogService: AuditLogService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: mockFn(),
        count: mockFn(),
        findUnique: mockFn(),
        findFirst: mockFn(),
        create: mockFn(),
        update: mockFn(),
      },
      refreshToken: {
        updateMany: mockFn(),
      },
      auditLog: {
        create: mockFn().mockResolvedValue({ id: 'log-1' }),
        count: mockFn().mockResolvedValue(0),
        findMany: mockFn().mockResolvedValue([]),
        findUnique: mockFn(),
      },
      role: {
        findMany: mockFn(),
      },
      userRole: {
        deleteMany: mockFn(),
      },
    };

    service = new UsersService(prisma as any);
    controller = new UsersController(service);
    auditLogService = new AuditLogService(prisma as any);
  });

  describe('Task 1: Multi-Token Search & Filter Enhancements', () => {
    it('should construct multi-token search query for composite names', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        { id: '1', email: 'test@example.com', firstName: 'Van', lastName: 'Nguyen', roles: [] },
      ]);

      const result = await service.findAll(
        { search: 'Nguyen Van', page: 1, limit: 10 },
        { id: 'admin-1', roles: ['ADMIN'] },
      );

      expect(prisma.user.findMany).toHaveBeenCalled();
      const whereArg = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toBeDefined();

      // Check multi-token AND condition exists in whereArg.OR
      const multiTokenClause = whereArg.OR.find((clause: any) => clause.AND !== undefined);
      expect(multiTokenClause).toBeDefined();
      expect(multiTokenClause.AND).toHaveLength(2);
      expect(multiTokenClause.AND[0].OR).toEqual([
        { firstName: { contains: 'Nguyen', mode: 'insensitive' } },
        { lastName: { contains: 'Nguyen', mode: 'insensitive' } },
      ]);
      expect(multiTokenClause.AND[1].OR).toEqual([
        { firstName: { contains: 'Van', mode: 'insensitive' } },
        { lastName: { contains: 'Van', mode: 'insensitive' } },
      ]);
      expect(result.data).toHaveLength(1);
    });

    it('should handle single-token search without composite AND clause', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        { id: '1', email: 'test@example.com', firstName: 'Nguyen', lastName: 'An', roles: [] },
      ]);

      const result = await service.findAll(
        { search: 'Nguyen', page: 1, limit: 10 },
        { id: 'admin-1', roles: ['ADMIN'] },
      );

      const whereArg = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toBeDefined();
      const multiTokenClause = whereArg.OR.find((clause: any) => clause.AND !== undefined);
      expect(multiTokenClause).toBeUndefined();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('Task 2: Security Safeguards (Token Revocation & Self-Lockout Prevention)', () => {
    it('should throw BadRequestException if admin tries to remove ADMIN role from self', async () => {
      const adminUser = { id: 'admin-1', roles: ['ADMIN'] };
      await expect(
        service.update('admin-1', { roles: ['STAFF'] as any }, adminUser),
      ).rejects.toThrow('Không thể tự hạ quyền ADMIN của chính mình');
    });

    it('should allow admin to update own roles if ADMIN is preserved', async () => {
      const adminUser = { id: 'admin-1', roles: ['ADMIN'] };
      prisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
      prisma.role.findMany.mockResolvedValue([{ id: 'r1', name: 'ADMIN' }, { id: 'r2', name: 'STAFF' }]);
      prisma.user.update.mockResolvedValue({ id: 'admin-1', roles: [] });

      await service.update('admin-1', { roles: ['ADMIN', 'STAFF'] as any }, adminUser);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if admin tries to deactivate/ban self via update', async () => {
      const adminUser = { id: 'admin-1', roles: ['ADMIN'] };
      await expect(
        service.update('admin-1', { status: 'INACTIVE' }, adminUser),
      ).rejects.toThrow('Không thể tự khóa tài khoản của chính mình');

      await expect(
        service.update('admin-1', { status: 'BANNED' }, adminUser),
      ).rejects.toThrow('Không thể tự khóa tài khoản của chính mình');
    });

    it('should throw BadRequestException if admin tries to deactivate/ban self via changeStatus', async () => {
      const adminUser = { id: 'admin-1', roles: ['ADMIN'] };
      await expect(
        service.changeStatus('admin-1', 'BANNED', adminUser),
      ).rejects.toThrow('Không thể tự khóa tài khoản của chính mình');

      await expect(
        service.changeStatus('admin-1', 'INACTIVE', adminUser),
      ).rejects.toThrow('Không thể tự khóa tài khoản của chính mình');
    });

    it('should allow admin to activate self via changeStatus', async () => {
      const adminUser = { id: 'admin-1', roles: ['ADMIN'] };
      prisma.user.update.mockResolvedValue({ id: 'admin-1', status: 'ACTIVE' });

      const res = await service.changeStatus('admin-1', 'ACTIVE', adminUser);
      expect(res.status).toBe('ACTIVE');
    });

    it('should revoke all refresh tokens when password is reset in update', async () => {
      prisma.user.update.mockResolvedValue({ id: 'target-1', email: 'user@test.com', roles: [] });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.update('target-1', { password: 'newSecurePassword123' }, { id: 'admin-1', roles: ['ADMIN'] });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'target-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should revoke all refresh tokens when status is changed to INACTIVE in update', async () => {
      prisma.user.update.mockResolvedValue({ id: 'target-1', email: 'user@test.com', roles: [] });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.update('target-1', { status: 'INACTIVE' }, { id: 'admin-1', roles: ['ADMIN'] });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'target-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should revoke all refresh tokens when changeStatus is called with INACTIVE or BANNED', async () => {
      prisma.user.update.mockResolvedValue({ id: 'target-2', status: 'BANNED' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.changeStatus('target-2', 'BANNED', { id: 'admin-1', roles: ['ADMIN'] });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'target-2', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should NOT revoke refresh tokens when changeStatus is called with ACTIVE', async () => {
      prisma.user.update.mockResolvedValue({ id: 'target-2', status: 'ACTIVE' });

      await service.changeStatus('target-2', 'ACTIVE', { id: 'admin-1', roles: ['ADMIN'] });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('UsersController should pass currentUser to update, activate, deactivate, ban, and create', async () => {
      const updateSpy = jest.spyOn(service, 'update').mockResolvedValue({ id: 'u1' } as any);
      const statusSpy = jest.spyOn(service, 'changeStatus').mockResolvedValue({ id: 'u1' } as any);
      const createSpy = jest.spyOn(service, 'create').mockResolvedValue({ id: 'u1' } as any);

      const currentUser = { id: 'admin-1', roles: ['ADMIN'] };

      await controller.update('u1', { firstName: 'Test' }, currentUser);
      expect(updateSpy).toHaveBeenCalledWith('u1', { firstName: 'Test' }, currentUser);

      await controller.activateUser('u1', currentUser);
      expect(statusSpy).toHaveBeenCalledWith('u1', 'ACTIVE', currentUser);

      await controller.deactivateUser('u1', currentUser);
      expect(statusSpy).toHaveBeenCalledWith('u1', 'INACTIVE', currentUser);

      await controller.banUser('u1', currentUser);
      expect(statusSpy).toHaveBeenCalledWith('u1', 'BANNED', currentUser);

      await controller.create({ email: 'a@b.com', password: '123', firstName: 'A', lastName: 'B' }, currentUser);
      expect(createSpy).toHaveBeenCalledWith(
        { email: 'a@b.com', password: '123', firstName: 'A', lastName: 'B' },
        currentUser,
      );
    });
  });

  describe('Task 3: Backend Audit Logs Integration for User Management', () => {
    it('should record audit log when an admin creates a user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.role.findMany.mockResolvedValue([{ id: 'r1', name: 'USER' }]);
      prisma.user.create.mockResolvedValue({ id: 'u2', email: 'new@example.com', status: 'ACTIVE', roles: [] });

      await service.create(
        { email: 'new@example.com', password: 'pass', firstName: 'A', lastName: 'B' },
        { id: 'admin-1', email: 'admin@example.com' },
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          entity: 'User',
          entityId: 'u2',
          userId: 'admin-1',
          newData: expect.objectContaining({ email: 'new@example.com' }),
        }),
      });
    });

    it('should record audit log when an admin updates a user', async () => {
      prisma.user.update.mockResolvedValue({ id: 'u3', email: 'edit@example.com', roles: [] });

      await service.update(
        'u3',
        { firstName: 'NewName', phone: '0987654321' },
        { id: 'admin-1', email: 'admin@example.com' },
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          entity: 'User',
          entityId: 'u3',
          userId: 'admin-1',
          newData: expect.objectContaining({ firstName: 'NewName', phone: '0987654321' }),
        }),
      });
    });

    it('should record audit log when an admin changes user status', async () => {
      prisma.user.update.mockResolvedValue({ id: 'u4', status: 'BANNED' });

      await service.changeStatus('u4', 'BANNED', { id: 'admin-1', email: 'admin@example.com' });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          entity: 'User',
          entityId: 'u4',
          userId: 'admin-1',
          newData: { status: 'BANNED' },
        }),
      });
    });

    it('AuditLogService should support entityId and userId matching performer or target entity', async () => {
      await auditLogService.findAll({ userId: 'user-xyz', limit: 10, page: 1 });

      expect(prisma.auditLog.findMany).toHaveBeenCalled();
      const whereArg = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toEqual([
        { userId: 'user-xyz' },
        { entity: 'User', entityId: 'user-xyz' },
      ]);
    });

    it('AuditLogService should support filtering directly by entityId', async () => {
      await auditLogService.findAll({ entity: 'User', entityId: 'user-abc', limit: 10, page: 1 });

      const whereArg = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(whereArg.entity).toBe('User');
      expect(whereArg.entityId).toBe('user-abc');
    });
  });
});
