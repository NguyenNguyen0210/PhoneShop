import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { AuditLogController } from '../../src/modules/audit-log/audit-log.controller';
import { AuditAction } from '@prisma/client';
import { FilterAuditLogDto } from '../../src/modules/audit-log/dto/filter-audit-log.dto';

describe('AuditLog Module Unit Tests', () => {
  let service: AuditLogService;
  let controller: AuditLogController;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    service = new AuditLogService(mockPrisma as any);
    controller = new AuditLogController(service);
  });

  describe('AuditLogService', () => {
    describe('findAll', () => {
      it('should apply default pagination (page=1, limit=50) and return paginated data', async () => {
        const mockLogs = [
          { id: 'log-1', action: AuditAction.CREATE, entity: 'Product', entityId: 'p-1', createdAt: new Date() },
        ];
        (mockPrisma.auditLog.count as any).mockResolvedValue(1);
        (mockPrisma.auditLog.findMany as any).mockResolvedValue(mockLogs);

        const result = await service.findAll({});

        expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({ where: {} });
        expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
          where: {},
          skip: 0,
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        });
        expect(result).toEqual({
          data: mockLogs,
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        });
      });

      it('should filter by action, entity, and entityId', async () => {
        (mockPrisma.auditLog.count as any).mockResolvedValue(0);
        (mockPrisma.auditLog.findMany as any).mockResolvedValue([]);

        const filter: FilterAuditLogDto = {
          action: AuditAction.UPDATE,
          entity: 'Order',
          entityId: 'ord-123',
          page: 2,
          limit: 10,
        };

        await service.findAll(filter);

        expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
          where: {
            action: AuditAction.UPDATE,
            entity: 'Order',
            entityId: 'ord-123',
          },
        });
        expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              action: AuditAction.UPDATE,
              entity: 'Order',
              entityId: 'ord-123',
            },
            skip: 10,
            take: 10,
          }),
        );
      });

      it('should filter by userId including user acting or user as entity', async () => {
        (mockPrisma.auditLog.count as any).mockResolvedValue(0);
        (mockPrisma.auditLog.findMany as any).mockResolvedValue([]);

        await service.findAll({ userId: 'user-xyz' });

        expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
          where: {
            OR: [{ userId: 'user-xyz' }, { entity: 'User', entityId: 'user-xyz' }],
          },
        });
      });

      it('should handle startDate and endDate filtering', async () => {
        (mockPrisma.auditLog.count as any).mockResolvedValue(0);
        (mockPrisma.auditLog.findMany as any).mockResolvedValue([]);

        const startDate = '2026-01-01T00:00:00.000Z';
        const endDate = '2026-01-31T23:59:59.999Z';

        await service.findAll({ startDate, endDate });

        expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
        });
      });

      it('should handle only startDate', async () => {
        (mockPrisma.auditLog.count as any).mockResolvedValue(0);
        (mockPrisma.auditLog.findMany as any).mockResolvedValue([]);

        const startDate = '2026-05-01T00:00:00.000Z';
        await service.findAll({ startDate });

        expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
          where: {
            createdAt: {
              gte: new Date(startDate),
            },
          },
        });
      });

      it('should handle fuzzy search across entity, entityId, ipAddress, user.email, user.firstName, user.lastName', async () => {
        (mockPrisma.auditLog.count as any).mockResolvedValue(0);
        (mockPrisma.auditLog.findMany as any).mockResolvedValue([]);

        await service.findAll({ search: '  admin@example.com  ' });

        const expectedSearchConditions = [
          { entity: { contains: 'admin@example.com', mode: 'insensitive' } },
          { entityId: { contains: 'admin@example.com', mode: 'insensitive' } },
          { ipAddress: { contains: 'admin@example.com' } },
          { user: { email: { contains: 'admin@example.com', mode: 'insensitive' } } },
          { user: { firstName: { contains: 'admin@example.com', mode: 'insensitive' } } },
          { user: { lastName: { contains: 'admin@example.com', mode: 'insensitive' } } },
        ];

        expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
          where: {
            OR: expectedSearchConditions,
          },
        });
      });

      it('should combine userId condition and fuzzy search conditions under AND', async () => {
        (mockPrisma.auditLog.count as any).mockResolvedValue(0);
        (mockPrisma.auditLog.findMany as any).mockResolvedValue([]);

        await service.findAll({ userId: 'user-1', search: 'Product' });

        const expectedUserOr = [{ userId: 'user-1' }, { entity: 'User', entityId: 'user-1' }];
        const expectedSearchConditions = [
          { entity: { contains: 'Product', mode: 'insensitive' } },
          { entityId: { contains: 'Product', mode: 'insensitive' } },
          { ipAddress: { contains: 'Product' } },
          { user: { email: { contains: 'Product', mode: 'insensitive' } } },
          { user: { firstName: { contains: 'Product', mode: 'insensitive' } } },
          { user: { lastName: { contains: 'Product', mode: 'insensitive' } } },
        ];

        expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
          where: {
            AND: [
              { OR: expectedUserOr },
              { OR: expectedSearchConditions },
            ],
          },
        });
      });
    });

    describe('findOne', () => {
      it('should fetch single audit log by id with user relation', async () => {
        const mockLog = { id: 'log-1', action: AuditAction.LOGIN, user: { id: 'u-1', email: 'test@example.com' } };
        (mockPrisma.auditLog.findUnique as any).mockResolvedValue(mockLog);

        const result = await service.findOne('log-1');

        expect(mockPrisma.auditLog.findUnique).toHaveBeenCalledWith({
          where: { id: 'log-1' },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        });
        expect(result).toBe(mockLog);
      });
    });

    describe('getStats', () => {
      it('should calculate totalLogs, todayLogs, and sensitiveOperations', async () => {
        (mockPrisma.auditLog.count as any)
          .mockResolvedValueOnce(150) // totalLogs
          .mockResolvedValueOnce(25)  // todayLogs
          .mockResolvedValueOnce(12); // sensitiveOperations
        (mockPrisma.auditLog.groupBy as any).mockResolvedValue([
          { userId: 'u-1' },
          { userId: 'u-2' },
        ]); // activeOperators

        const result = await service.getStats();

        expect(mockPrisma.auditLog.count).toHaveBeenCalledTimes(3);

        // First call: total count
        expect(mockPrisma.auditLog.count).toHaveBeenNthCalledWith(1);

        // Second call: todayLogs
        expect(mockPrisma.auditLog.count).toHaveBeenNthCalledWith(2, {
          where: {
            createdAt: {
              gte: expect.any(Date),
            },
          },
        });

        // Third call: sensitive operations
        expect(mockPrisma.auditLog.count).toHaveBeenNthCalledWith(3, {
          where: {
            action: {
              in: [AuditAction.CHANGE_ROLE, AuditAction.CANCEL_ORDER, AuditAction.DELETE],
            },
          },
        });

        expect(result).toEqual({
          totalLogs: 150,
          todayLogs: 25,
          sensitiveOperations: 12,
          activeOperators: 2,
        });
      });
    });
  });

  describe('AuditLogController', () => {
    it('getStats should delegate to service.getStats', async () => {
      const stats = { totalLogs: 100, todayLogs: 10, sensitiveOperations: 5, activeOperators: 2 };
      jest.spyOn(service, 'getStats').mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });

    it('findAll should delegate to service.findAll with query dto', async () => {
      const mockResult: any = { data: [], total: 0, page: 1, limit: 50, totalPages: 1 };
      jest.spyOn(service, 'findAll').mockResolvedValue(mockResult);

      const filter: FilterAuditLogDto = { search: 'test', page: 1 };
      const result = await controller.findAll(filter);

      expect(service.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(mockResult);
    });

    it('findOne should delegate to service.findOne with id', async () => {
      const mockLog: any = { id: 'log-1' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockLog);

      const result = await controller.findOne('log-1');

      expect(service.findOne).toHaveBeenCalledWith('log-1');
      expect(result).toEqual(mockLog);
    });
  });
});
