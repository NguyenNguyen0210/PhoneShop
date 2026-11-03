import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderStatus, PaymentStatus, ImeiStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { WarrantyService } from '../src/modules/warranty/warranty.service';
import { EmailService } from '../src/infrastructure/email/email.service';

describe('OrdersService - releaseOrderReservation & Cancellation Invariants', () => {
  let ordersService: OrdersService;
  let prisma: any;
  let warrantyService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
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
      orderItem: {
        findMany: jest.fn(),
      },
      flashSaleItem: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    warrantyService = {
      voidWarrantiesForOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: WarrantyService,
          useValue: warrantyService,
        },
        {
          provide: EmailService,
          useValue: {
            sendOrderCancelled: jest.fn(),
          },
        },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('INVARIANT: Should reject cancellation if order has a captured (PAID) payment', async () => {
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay-1', status: PaymentStatus.PAID });

    const order = {
      id: 'ord-paid',
      status: OrderStatus.CONFIRMED,
      voucherCode: null,
      createdAt: new Date(),
      items: [{ variantId: 'var-1', quantity: 1 }],
    };

    await expect(
      ordersService.releaseOrderReservation(prisma, order),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
  });

  it('INVARIANT: Should return false if order was already cancelled or claimed concurrently (Idempotency)', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    // updateMany returns count: 0 when where condition (status: PENDING) no longer matches
    prisma.order.updateMany.mockResolvedValue({ count: 0 });

    const order = {
      id: 'ord-race',
      status: OrderStatus.PENDING,
      voucherCode: null,
      createdAt: new Date(),
      items: [{ variantId: 'var-1', quantity: 1 }],
    };

    const result = await ordersService.releaseOrderReservation(prisma, order);

    expect(result).toBe(false);
    expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    expect(prisma.imeiDevice.updateMany).not.toHaveBeenCalled();
  });

  it('INVARIANT: Successfully releases IMEIs to AVAILABLE, restores inventory, and voids warranties', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.voucher.findUnique.mockResolvedValue({ id: 'v-1' });
    prisma.voucher.updateMany.mockResolvedValue({ count: 1 });
    prisma.voucherUsage.deleteMany.mockResolvedValue({ count: 1 });
    prisma.imeiDevice.updateMany.mockResolvedValue({ count: 1 });
    prisma.inventory.updateMany.mockResolvedValue({ count: 1 });

    const order = {
      id: 'ord-normal',
      status: OrderStatus.PENDING,
      voucherCode: 'SAVE20',
      createdAt: new Date(),
      items: [
        {
          variantId: 'var-123',
          quantity: 1,
          imeiDeviceId: 'imei-456',
        },
      ],
    };

    const result = await ordersService.releaseOrderReservation(prisma, order, {
      reason: 'User cancelled',
    });

    expect(result).toBe(true);

    // Order status marked as CANCELLED
    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'ord-normal' }),
        data: expect.objectContaining({
          status: OrderStatus.CANCELLED,
          cancelledReason: 'User cancelled',
        }),
      }),
    );

    // Cancel pending payments
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'ord-normal', status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.CANCELLED },
    });

    // Revert IMEI to AVAILABLE
    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-456', status: ImeiStatus.RESERVED },
      data: { status: ImeiStatus.AVAILABLE },
    });

    // Restore inventory (decrement reservedQty, increment availableQty)
    expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
      where: { variantId: 'var-123', reservedQty: { gte: 1 } },
      data: {
        reservedQty: { decrement: 1 },
        availableQty: { increment: 1 },
      },
    });

    // Voucher returned
    expect(prisma.voucher.updateMany).toHaveBeenCalledWith({
      where: { id: 'v-1', usageCount: { gt: 0 } },
      data: { usageCount: { decrement: 1 } },
    });
    expect(prisma.voucherUsage.deleteMany).toHaveBeenCalledWith({ where: { orderId: 'ord-normal' } });

    // Warranties voided
    expect(warrantyService.voidWarrantiesForOrder).toHaveBeenCalledWith(prisma, 'ord-normal');
  });
});
