import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { NotificationsController } from '../../src/modules/notifications/notifications.controller';
import { NotificationType } from '@prisma/client';

describe('Notifications Module Unit Tests', () => {
  describe('NotificationsService', () => {
    let service: NotificationsService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        notification: {
          count: jest.fn(),
          findMany: jest.fn(),
        },
      };

      service = new NotificationsService(mockPrisma as any);
    });

    it('should query notifications with default pagination and userId only when no filters given', async () => {
      const mockNotifications = [{ id: 'n-1', userId: 'user-1', title: 'Test' }];
      mockPrisma.notification.count.mockResolvedValue(1);
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.getMyNotifications('user-1');

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({
        data: mockNotifications,
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('should filter by notification type when provided', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await service.getMyNotifications('user-1', 1, 20, NotificationType.ORDER);

      const expectedWhere = {
        userId: 'user-1',
        type: NotificationType.ORDER,
      };

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by isRead = true when isRead is "true"', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await service.getMyNotifications('user-1', 1, 20, undefined, 'true');

      const expectedWhere = {
        userId: 'user-1',
        isRead: true,
      };

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by isRead = false when isRead is "false"', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await service.getMyNotifications('user-1', 1, 20, undefined, 'false');

      const expectedWhere = {
        userId: 'user-1',
        isRead: false,
      };

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should ignore isRead filter when isRead is empty string or undefined', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await service.getMyNotifications('user-1', 1, 20, undefined, '');

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should filter by both type and isRead when both provided', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await service.getMyNotifications('user-1', 2, 10, NotificationType.PAYMENT, 'false');

      const expectedWhere = {
        userId: 'user-1',
        type: NotificationType.PAYMENT,
        isRead: false,
      };

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
    });

    it('should clamp page and limit to safe boundaries', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.notification.findMany.mockResolvedValue([]);

      const result = await service.getMyNotifications('user-1', -1, 500);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 100,
        }),
      );
    });
  });

  describe('NotificationsController', () => {
    let controller: NotificationsController;
    let mockService: any;

    beforeEach(() => {
      mockService = {
        getMyNotifications: jest.fn(),
      };
      controller = new NotificationsController(mockService as any);
    });

    it('should call getMyNotifications with default page and limit when query params are absent', async () => {
      const user = { id: 'u-123' };
      const expectedResponse = { data: [], total: 0, page: 1, limit: 20 };
      mockService.getMyNotifications.mockResolvedValue(expectedResponse);

      const result = await controller.getMyNotifications(user);

      expect(mockService.getMyNotifications).toHaveBeenCalledWith(
        'u-123',
        1,
        20,
        undefined,
        undefined,
      );
      expect(result).toBe(expectedResponse);
    });

    it('should parse page, limit and pass type and isRead query parameters to service', async () => {
      const user = { id: 'u-123' };
      const expectedResponse = { data: [], total: 0, page: 3, limit: 15 };
      mockService.getMyNotifications.mockResolvedValue(expectedResponse);

      const result = await controller.getMyNotifications(
        user,
        '3',
        '15',
        NotificationType.SHIPPING,
        'true',
      );

      expect(mockService.getMyNotifications).toHaveBeenCalledWith(
        'u-123',
        3,
        15,
        NotificationType.SHIPPING,
        'true',
      );
      expect(result).toBe(expectedResponse);
    });
  });
});
