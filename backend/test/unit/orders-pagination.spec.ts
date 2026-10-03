import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OrdersService, QueryOrdersDto } from '../../src/modules/orders/orders.service';
import { OrdersController } from '../../src/modules/orders/orders.controller';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

describe('Orders Pagination Unit Tests', () => {
  let ordersService: OrdersService;
  let ordersController: OrdersController;
  let mockPrisma: any;
  let mockOrderQueue: any;

  beforeEach(() => {
    mockOrderQueue = {
      add: jest.fn().mockReturnValue(Promise.resolve()),
    };

    mockPrisma = {
      order: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    ordersService = new OrdersService(mockPrisma as any, mockOrderQueue as any);
    ordersController = new OrdersController(ordersService);
  });

  describe('OrdersService.findAll pagination & offset', () => {
    it('should use default page = 1, limit = 10, skip = 0 when no query is passed', async () => {
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await ordersService.findAll();

      expect(mockPrisma.order.count).toHaveBeenCalledWith({ where: {} });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: {},
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate skip correctly for custom page and limit', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          user: { firstName: 'Nguyen', lastName: 'An', email: 'an@example.com', phone: '0901112222' },
          address: { recipientName: 'Nguyen An', phone: '0901112222', addressLine1: '123 Le Loi', ward: 'Ben Nghe', district: 'Q1', city: 'TP HCM' },
          payments: [{ method: PaymentMethod.COD, status: PaymentStatus.PENDING }],
          items: [],
        },
      ];

      mockPrisma.order.count.mockResolvedValue(25);
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const query: QueryOrdersDto = { page: 2, limit: 10 };
      const result = await ordersService.findAll(query);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].customerName).toBe('Nguyen An');
      expect(result.data[0].paymentMethod).toBe(PaymentMethod.COD);
    });

    it('should correctly calculate totalPages when total is exact multiple of limit', async () => {
      mockPrisma.order.count.mockResolvedValue(30);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await ordersService.findAll({ page: 3, limit: 10 });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(30);
    });

    it('should handle empty results gracefully and return totalPages = 1', async () => {
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await ordersService.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('OrdersService.findAll status filtering', () => {
    it('should filter orders by status when provided', async () => {
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.order.findMany.mockResolvedValue([]);

      await ordersService.findAll({ status: OrderStatus.CONFIRMED });

      expect(mockPrisma.order.count).toHaveBeenCalledWith({
        where: { status: OrderStatus.CONFIRMED },
      });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OrderStatus.CONFIRMED },
        }),
      );
    });
  });

  describe('OrdersService.findAll keyword search filtering', () => {
    it('should build case-insensitive OR clause for orderNumber, address and user fields', async () => {
      mockPrisma.order.count.mockResolvedValue(2);
      mockPrisma.order.findMany.mockResolvedValue([]);

      await ordersService.findAll({ search: '0901234567' });

      const expectedWhere = {
        OR: [
          { orderNumber: { contains: '0901234567', mode: 'insensitive' } },
          { address: { recipientName: { contains: '0901234567', mode: 'insensitive' } } },
          { address: { phone: { contains: '0901234567', mode: 'insensitive' } } },
          { user: { phone: { contains: '0901234567', mode: 'insensitive' } } },
          { user: { email: { contains: '0901234567', mode: 'insensitive' } } },
        ],
      };

      expect(mockPrisma.order.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('should combine status and search filters in where clause', async () => {
      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findMany.mockResolvedValue([]);

      await ordersService.findAll({
        status: OrderStatus.SHIPPING,
        search: 'ORD-2026',
        page: 1,
        limit: 10,
      });

      const expectedWhere = {
        status: OrderStatus.SHIPPING,
        OR: [
          { orderNumber: { contains: 'ORD-2026', mode: 'insensitive' } },
          { address: { recipientName: { contains: 'ORD-2026', mode: 'insensitive' } } },
          { address: { phone: { contains: 'ORD-2026', mode: 'insensitive' } } },
          { user: { phone: { contains: 'ORD-2026', mode: 'insensitive' } } },
          { user: { email: { contains: 'ORD-2026', mode: 'insensitive' } } },
        ],
      };

      expect(mockPrisma.order.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });
  });

  describe('OrdersController.findAll delegation', () => {
    it('should delegate query parameters to ordersService.findAll', async () => {
      const query: QueryOrdersDto = { page: 2, limit: 20, status: OrderStatus.COMPLETED };
      const mockResult = {
        data: [],
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      };

      jest.spyOn(ordersService, 'findAll').mockResolvedValue(mockResult);

      const result = await ordersController.findAll(query);

      expect(ordersService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });
});
