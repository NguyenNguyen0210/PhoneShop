import 'reflect-metadata';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsersService } from '../../src/modules/users/users.service';
import { UsersController } from '../../src/modules/users/users.controller';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';
import { Role } from '../../src/common/enums/role.enum';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

describe('UsersService & UsersController RBAC & Customer 360', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
      },
      warranty: {
        findMany: jest.fn(),
      },
      installmentApplication: {
        findMany: jest.fn(),
      },
      ticket: {
        findMany: jest.fn(),
      },
    };

    service = new UsersService(prisma);
  });

  describe('UsersController Route RBAC Roles', () => {
    it('findAll should allow ADMIN and STAFF', () => {
      const roles: Role[] = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.findAll);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.STAFF);
    });

    it('findOne should allow ADMIN and STAFF', () => {
      const roles: Role[] = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.findOne);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.STAFF);
    });

    it('getCustomer360 should allow ADMIN and STAFF', () => {
      const roles: Role[] = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.getCustomer360);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.ADMIN);
      expect(roles).toContain(Role.STAFF);
    });

    it('mutations (create, update, activate, deactivate, ban) should only allow ADMIN', () => {
      const createRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.create);
      const updateRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.update);
      const activateRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.activateUser);
      const deactivateRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.deactivateUser);
      const banRoles = Reflect.getMetadata(ROLES_KEY, UsersController.prototype.banUser);

      expect(createRoles).toEqual([Role.ADMIN]);
      expect(updateRoles).toEqual([Role.ADMIN]);
      expect(activateRoles).toEqual([Role.ADMIN]);
      expect(deactivateRoles).toEqual([Role.ADMIN]);
      expect(banRoles).toEqual([Role.ADMIN]);
    });
  });

  describe('findAll RBAC & Search', () => {
    it('should restrict Staff user to only querying users with role USER', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', email: 'cust@mail.com', passwordHash: 'secret_hash', roles: [{ role: { name: 'USER' } }] },
      ]);

      const staffUser = { id: 's1', roles: ['STAFF'] };
      const result = await service.findAll({ page: 1, limit: 10 }, staffUser);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roles: { some: { role: { name: 'USER' } } },
          }),
        }),
      );
      expect((result.data[0] as any).passwordHash).toBeUndefined();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should allow Admin to query users with custom role and search filters', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u2', email: 'admin@mail.com', passwordHash: 'secret_hash', roles: [{ role: { name: 'ADMIN' } }] },
      ]);

      const adminUser = { id: 'a1', roles: ['ADMIN'] };
      const result = await service.findAll(
        { page: 2, limit: 5, role: 'ADMIN', status: UserStatus.ACTIVE, search: ' admin ' },
        adminUser,
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expect.objectContaining({
            roles: { some: { role: { name: 'ADMIN' } } },
            status: UserStatus.ACTIVE,
            OR: [
              { email: { contains: 'admin', mode: 'insensitive' } },
              { firstName: { contains: 'admin', mode: 'insensitive' } },
              { lastName: { contains: 'admin', mode: 'insensitive' } },
              { phone: { contains: 'admin' } },
            ],
          }),
        }),
      );
      expect((result.data[0] as any).passwordHash).toBeUndefined();
    });
  });

  describe('findOne RBAC', () => {
    it('should forbid Staff from viewing Admin user detail', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'admin@mail.com',
        roles: [{ role: { name: 'ADMIN' } }],
      });

      const staffUser = { id: 's1', roles: ['STAFF'] };
      await expect(service.findOne('a1', staffUser)).rejects.toThrow(ForbiddenException);
    });

    it('should allow Staff to view Customer user detail and strip passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'c1',
        email: 'cust@mail.com',
        passwordHash: 'secret_hash',
        roles: [{ role: { name: 'USER' } }],
        addresses: [],
      });

      const staffUser = { id: 's1', roles: ['STAFF'] };
      const user = await service.findOne('c1', staffUser);

      expect(user.id).toBe('c1');
      expect((user as any).passwordHash).toBeUndefined();
    });

    it('should allow Admin to view any user detail', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 's1',
        email: 'staff@mail.com',
        passwordHash: 'secret_hash',
        roles: [{ role: { name: 'STAFF' } }],
        addresses: [],
      });

      const adminUser = { id: 'a1', roles: ['ADMIN'] };
      const user = await service.findOne('s1', adminUser);

      expect(user.id).toBe('s1');
      expect((user as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const staffUser = { id: 's1', roles: ['STAFF'] };
      await expect(service.findOne('non-existent', staffUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCustomer360', () => {
    it('should aggregate Customer 360 metrics correctly', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'c1',
        email: 'c@mail.com',
        firstName: 'Nguyen',
        lastName: 'Van A',
        phone: '0901234567',
        avatarUrl: null,
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01'),
        lastLoginAt: new Date('2026-10-01'),
        roles: [{ role: { name: 'USER' } }],
        addresses: [{ id: 'addr-1', city: 'HCM' }],
      });

      prisma.order.findMany.mockResolvedValue([
        {
          id: 'o1',
          orderNumber: 'ORD-001',
          totalAmount: 15000000,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          createdAt: new Date(),
          items: [{ id: 'it-1', productName: 'iPhone 15', quantity: 1, unitPrice: 15000000 }],
        },
        {
          id: 'o2',
          orderNumber: 'ORD-002',
          totalAmount: 5000000,
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          createdAt: new Date(),
          items: [],
        },
        {
          id: 'o3',
          orderNumber: 'ORD-003',
          totalAmount: 8000000,
          status: 'PROCESSING',
          paymentStatus: 'PENDING',
          createdAt: new Date(),
          items: [],
        },
      ]);

      prisma.warranty.findMany.mockResolvedValue([
        { id: 'w1', status: 'ACTIVE', warrantyCode: 'WAR-1' },
        { id: 'w2', status: 'EXPIRED', warrantyCode: 'WAR-2' },
      ]);

      prisma.installmentApplication.findMany.mockResolvedValue([
        { id: 'i1', status: 'APPROVED', termMonths: 6, monthlyAmount: 1500000 },
        { id: 'i2', status: 'PENDING', termMonths: 12, monthlyAmount: 800000 },
      ]);

      prisma.ticket.findMany.mockResolvedValue([
        { id: 't1', status: 'OPEN', code: 'TK-01', title: 'Support screen' },
        { id: 't2', status: 'IN_PROGRESS', code: 'TK-02', title: 'Payment check' },
        { id: 't3', status: 'RESOLVED', code: 'TK-03', title: 'Delivered inquiry' },
      ]);

      const staffUser = { id: 's1', roles: ['STAFF'] };
      const res = await service.getCustomer360('c1', staffUser);

      // Customer info
      expect(res.customer.id).toBe('c1');
      expect(res.customer.email).toBe('c@mail.com');
      expect(res.addresses).toHaveLength(1);

      // Metrics
      expect(res.metrics.totalSpent).toBe(15000000);
      expect(res.metrics.totalOrders).toBe(3);
      expect(res.metrics.completedOrders).toBe(1);
      expect(res.metrics.processingOrders).toBe(1);
      expect(res.metrics.cancelledOrders).toBe(1);

      expect(res.metrics.totalTickets).toBe(3);
      expect(res.metrics.openTickets).toBe(2); // OPEN + IN_PROGRESS

      expect(res.metrics.activeWarranties).toBe(1);

      expect(res.metrics.totalInstallments).toBe(2);
      expect(res.metrics.approvedInstallments).toBe(1);

      // Arrays attached
      expect(res.recentOrders).toHaveLength(3);
      expect(res.warranties).toHaveLength(2);
      expect(res.installments).toHaveLength(2);
      expect(res.tickets).toHaveLength(3);
    });

    it('should forbid Staff from getting Customer 360 of an Admin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'admin@mail.com',
        roles: [{ role: { name: 'ADMIN' } }],
        addresses: [],
      });

      const staffUser = { id: 's1', roles: ['STAFF'] };
      await expect(service.getCustomer360('a1', staffUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
