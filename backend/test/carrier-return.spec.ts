import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { WarrantyService } from '../src/modules/warranty/warranty.service';
import { OrderStatus, PaymentStatus, ImeiStatus, PaymentMethod } from '@prisma/client';

describe('OrdersService - Carrier Return (PR #1)', () => {
  let ordersService: OrdersService;
  let prisma: any;
  let warrantyService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      imeiDevice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      voucher: {
        update: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    warrantyService = {
      voidWarrantiesForOrder: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: WarrantyService, useValue: warrantyService },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('nên cho phép bưu tá trả hàng đơn VNPAY đã PAID mà không ném BadRequestException', async () => {
    const mockOrder = {
      id: 'order-vnpay-1',
      status: OrderStatus.SHIPPING,
      paymentMethod: PaymentMethod.VNPAY,
      items: [{ variantId: 'v1', quantity: 1, imeiDeviceId: 'imei-1' }],
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    // Giả lập đơn có thanh toán PAID
    prisma.payment.findFirst.mockResolvedValue({ id: 'p1', status: PaymentStatus.PAID });

    await expect(
      ordersService.transitionStatus('order-vnpay-1', OrderStatus.RETURNED),
    ).resolves.toBeDefined();

    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-1' },
      data: { status: ImeiStatus.RETURNED },
    });
    expect(warrantyService.voidWarrantiesForOrder).toHaveBeenCalled();
  });

  it('nên trả IMEI về AVAILABLE đối với đơn COD chưa thanh toán', async () => {
    const mockOrder = {
      id: 'order-cod-1',
      status: OrderStatus.SHIPPING,
      paymentMethod: PaymentMethod.COD,
      items: [{ variantId: 'v1', quantity: 1, imeiDeviceId: 'imei-cod-1' }],
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    prisma.payment.findFirst.mockResolvedValue(null);

    await ordersService.transitionStatus('order-cod-1', OrderStatus.RETURNED);

    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-cod-1', status: ImeiStatus.RESERVED },
      data: { status: ImeiStatus.AVAILABLE },
    });
    expect(prisma.inventory.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { variantId: 'v1', reservedQty: { gte: 1 } },
        data: expect.objectContaining({
          reservedQty: { decrement: 1 },
        }),
      }),
    );
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'order-cod-1', status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.CANCELLED },
    });
  });
});
