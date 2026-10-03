import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ShippingService } from '../../src/modules/shipping/shipping.service';
import { ShippingStatus } from '../../src/modules/shipping/dto/shipping.dto';
import { OrderStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ShippingService', () => {
  let service: ShippingService;
  let mockPrisma: any;
  let mockOrdersService: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
      },
      shipping: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    mockOrdersService = {
      transitionStatus: jest.fn(),
    };
    service = new ShippingService(mockPrisma, mockOrdersService as any);
  });

  describe('assign', () => {
    it('should update existing PENDING shipping record to READY_TO_SHIP with carrier and tracking info', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', shippingFee: 30000 });
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        status: ShippingStatus.PENDING,
      });
      mockPrisma.shipping.update.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        providerName: 'Giao Hàng Nhanh',
        trackingNumber: 'GHN123456',
        status: ShippingStatus.READY_TO_SHIP,
        shippingFee: 30000,
      });

      const result = await service.assign({
        orderId: 'order-1',
        providerName: 'Giao Hàng Nhanh',
        trackingNumber: 'GHN123456',
      });

      expect(mockPrisma.shipping.update).toHaveBeenCalledWith({
        where: { id: 'ship-1' },
        data: expect.objectContaining({
          providerName: 'Giao Hàng Nhanh',
          trackingNumber: 'GHN123456',
          status: ShippingStatus.READY_TO_SHIP,
        }),
      });
      expect(result.status).toBe(ShippingStatus.READY_TO_SHIP);
    });

    it('should create new shipping record with READY_TO_SHIP if not exists', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-2', shippingFee: 40000 });
      mockPrisma.shipping.findUnique.mockResolvedValue(null);
      mockPrisma.shipping.create.mockResolvedValue({
        id: 'ship-2',
        orderId: 'order-2',
        providerName: 'Viettel Post',
        trackingNumber: 'VT987654',
        status: ShippingStatus.READY_TO_SHIP,
        shippingFee: 40000,
      });

      const result = await service.assign({
        orderId: 'order-2',
        providerName: 'Viettel Post',
        trackingNumber: 'VT987654',
      });

      expect(mockPrisma.shipping.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-2',
          providerName: 'Viettel Post',
          trackingNumber: 'VT987654',
          status: ShippingStatus.READY_TO_SHIP,
        }),
      });
      expect(result.status).toBe(ShippingStatus.READY_TO_SHIP);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.assign({
          orderId: 'order-nonexistent',
          providerName: 'Giao Hàng Nhanh',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus & auto-sync', () => {
    it('should reject invalid status transition', async () => {
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        status: ShippingStatus.PENDING,
      });

      await expect(
        service.updateStatus('ship-1', { status: ShippingStatus.DELIVERED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should sync order to SHIPPING when shipping transitions to PICKED_UP', async () => {
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        status: ShippingStatus.READY_TO_SHIP,
      });
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PROCESSING,
      });
      mockPrisma.shipping.update.mockResolvedValue({
        id: 'ship-1',
        status: ShippingStatus.PICKED_UP,
      });

      await service.updateStatus('ship-1', { status: ShippingStatus.PICKED_UP });

      expect(mockOrdersService.transitionStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.SHIPPING,
      );
    });

    it('should sync order to DELIVERED when shipping transitions to DELIVERED', async () => {
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        status: ShippingStatus.IN_TRANSIT,
      });
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.SHIPPING,
      });
      mockPrisma.shipping.update.mockResolvedValue({
        id: 'ship-1',
        status: ShippingStatus.DELIVERED,
      });

      await service.updateStatus('ship-1', { status: ShippingStatus.DELIVERED });

      expect(mockOrdersService.transitionStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.DELIVERED,
      );
    });

    it('should sync order to RETURNED when shipping transitions to RETURNED', async () => {
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        orderId: 'order-1',
        status: ShippingStatus.FAILED,
      });
      mockPrisma.shipping.update.mockResolvedValue({
        id: 'ship-1',
        status: ShippingStatus.RETURNED,
      });

      await service.updateStatus('ship-1', { status: ShippingStatus.RETURNED });

      expect(mockOrdersService.transitionStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.RETURNED,
      );
    });
  });

  describe('update', () => {
    it('should update carrier details', async () => {
      mockPrisma.shipping.findUnique.mockResolvedValue({
        id: 'ship-1',
        providerName: 'Old Carrier',
      });
      mockPrisma.shipping.update.mockResolvedValue({
        id: 'ship-1',
        providerName: 'New Carrier',
        trackingNumber: 'NEW123',
      });

      const result = await service.update('ship-1', {
        providerName: 'New Carrier',
        trackingNumber: 'NEW123',
      });

      expect(mockPrisma.shipping.update).toHaveBeenCalledWith({
        where: { id: 'ship-1' },
        data: expect.objectContaining({
          providerName: 'New Carrier',
          trackingNumber: 'NEW123',
        }),
      });
      expect(result.providerName).toBe('New Carrier');
    });
  });
});
