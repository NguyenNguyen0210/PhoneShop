import { Test, TestingModule } from '@nestjs/testing';
import { OrdersScheduler } from '../src/modules/orders/orders.scheduler';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderStatus, PaymentStatus, ImeiStatus, PaymentMethod } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('OrdersHoldScheduler & Hold Expiration', () => {
  let scheduler: OrdersScheduler;
  let ordersService: OrdersService;
  let prisma: any;
  let module: TestingModule;

  beforeEach(async () => {
    prisma = {
      order: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      voucher: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      voucherUsage: {
        deleteMany: jest.fn(),
      },
      imeiDevice: {
        updateMany: jest.fn(),
      },
      inventory: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    module = await Test.createTestingModule({
      providers: [
        OrdersScheduler,
        {
          provide: OrdersService,
          useValue: {
            releaseOrderReservation: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    scheduler = module.get<OrdersScheduler>(OrdersScheduler);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    jest.clearAllTimers();
  });

  it('should find expired online orders and release reservation', async () => {
    const expiredDate = new Date(Date.now() - 1000 * 60 * 20); // 20 mins ago
    const mockExpiredOrders = [
      {
        id: 'order-1',
        orderNumber: 'ORD-1',
        status: OrderStatus.PENDING,
        holdExpiresAt: expiredDate,
        voucherCode: 'DISCOUNT10',
        items: [{ variantId: 'v-1', quantity: 1, imeiDeviceId: 'imei-1' }],
      },
    ];

    prisma.order.findMany.mockResolvedValue(mockExpiredOrders);
    (ordersService.releaseOrderReservation as jest.Mock).mockResolvedValue(true);

    await scheduler.handleExpiredHolds();

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: OrderStatus.PENDING,
          holdExpiresAt: expect.objectContaining({
            not: null,
          }),
        }),
      }),
    );

    expect(ordersService.releaseOrderReservation).toHaveBeenCalledTimes(1);
    expect(ordersService.releaseOrderReservation).toHaveBeenCalledWith(
      expect.anything(),
      mockExpiredOrders[0],
      expect.objectContaining({
        allowedCurrentStatuses: [OrderStatus.PENDING],
      }),
    );
  });

  it('should not query or touch orders with holdExpiresAt = null (COD orders)', async () => {
    // When prisma returns empty list (COD orders have holdExpiresAt = null, so where filter excludes them)
    prisma.order.findMany.mockResolvedValue([]);

    await scheduler.handleExpiredHolds();

    expect(ordersService.releaseOrderReservation).not.toHaveBeenCalled();
  });
});
