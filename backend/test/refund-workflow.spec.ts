import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { WarrantyService } from '../src/modules/warranty/warranty.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { SystemSettingsService } from '../src/modules/settings/settings.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  TransactionType,
  TransactionStatus,
  ImeiStatus,
  NotificationType,
  AuditAction,
  Prisma,
} from '@prisma/client';

describe('OrdersService - Refund Workflow & Business Invariants', () => {
  let ordersService: OrdersService;
  let prisma: any;
  let notificationsService: any;
  let warrantyService: any;
  let module: TestingModule;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentTransaction: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      imeiDevice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      warranty: {
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    notificationsService = {
      sendToUser: jest.fn().mockResolvedValue(true),
    };

    warrantyService = {
      voidWarrantiesForOrder: jest.fn().mockResolvedValue(undefined),
    };

    module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: WarrantyService,
          useValue: warrantyService,
        },
        {
          provide: SystemSettingsService,
          useValue: {
            get: jest.fn().mockResolvedValue('false'),
          },
        },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    jest.clearAllTimers();
  });

  const baseOrder = {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    orderNumber: 'ORD-123456',
    userId: 'user-uuid-1',
    status: OrderStatus.DELIVERED,
    totalAmount: 10000000,
    payments: [
      {
        id: 'payment-uuid-1',
        amount: 10000000,
        status: PaymentStatus.PAID,
      },
    ],
    items: [
      {
        id: 'item-uuid-1',
        variantId: 'variant-uuid-1',
        quantity: 1,
        unitPrice: 10000000,
        imeiDeviceId: 'imei-uuid-1',
      },
    ],
  };

  it('INVARIANT: Should reject if order does not exist', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    await expect(
      ordersService.processRefund(
        'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        { amount: 5000000, reason: 'Customer returned', providerReference: 'REF-NOT-FOUND' },
        'admin-uuid-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('INVARIANT: Should reject if order has no PAID payment', async () => {
    prisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      payments: [{ id: 'payment-uuid-1', amount: 10000000, status: PaymentStatus.PENDING }],
    });

    await expect(
      ordersService.processRefund(
        baseOrder.id,
        { amount: 5000000, reason: 'Customer returned', providerReference: 'REF-NOT-PAID' },
        'admin-uuid-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('INVARIANT: Should reject if refund amount exceeds paid payment amount (anti-over-refund)', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder);

    await expect(
      ordersService.processRefund(
        baseOrder.id,
        { amount: 15000000, reason: 'Customer returned', providerReference: 'REF-OVER' }, // 15m > 10m
        'admin-uuid-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('INVARIANT: Should successfully execute full refund transaction with all side effects', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder);
    prisma.paymentTransaction.create.mockImplementation(({ data }) => Promise.resolve({ id: 'tx-1', ...data }));

    const result = await ordersService.processRefund(
      baseOrder.id,
      { amount: 10000000, reason: 'Defective item', providerReference: 'VNPAY-REF-999' },
      'admin-uuid-1',
    );

    // 1. Transaction Code & PaymentTransaction
    expect(prisma.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentId: 'payment-uuid-1',
          type: TransactionType.REFUND,
          status: TransactionStatus.SUCCESS,
          amount: 10000000,
          providerReference: 'VNPAY-REF-999',
          transactionCode: expect.stringMatching(/^REF-\d+-[0-9a-f]{8}$/),
        }),
      }),
    );

    // 2. Payment status set to REFUNDED
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'payment-uuid-1', status: PaymentStatus.PAID },
      data: { status: PaymentStatus.PARTIALLY_REFUNDED },
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-uuid-1' }, data: { status: PaymentStatus.REFUNDED },
    });

    // 3. Order status set to RETURNED
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: baseOrder.id, status: OrderStatus.DELIVERED },
      data: { status: OrderStatus.RETURNED },
    });

    // 4. ImeiDevice set to RETURNED
    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['imei-uuid-1'] } },
      data: { status: ImeiStatus.RETURNED },
    });

    // Returned stock is quarantined until receipt and quality control.
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.inventory.updateMany).not.toHaveBeenCalled();

    // 6. Warranties voided
    expect(warrantyService.voidWarrantiesForOrder).toHaveBeenCalledWith(
      expect.anything(),
      baseOrder.id,
    );

    // 7. Audit log recorded
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AuditAction.REFUND,
          entity: 'Order',
          entityId: baseOrder.id,
          userId: 'admin-uuid-1',
        }),
      }),
    );

    // 8. Notification sent to customer
    expect(notificationsService.sendToUser).toHaveBeenCalledWith(
      baseOrder.userId,
      NotificationType.PAYMENT,
      expect.any(String),
      expect.stringContaining('10.000.000'),
      expect.any(Object),
    );

    expect(result.order.status).toBe(OrderStatus.RETURNED);
  });

  it('INVARIANT: Should set Payment status to PARTIALLY_REFUNDED when amount < paid amount', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder);
    prisma.paymentTransaction.create.mockResolvedValue({ id: 'partial-tx-1' });

    await ordersService.processRefund(
      baseOrder.id,
      { amount: 3000000, reason: 'Partial damage compensation', providerReference: 'REF-PARTIAL-1' },
      'admin-uuid-1',
    );

    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'payment-uuid-1', status: PaymentStatus.PAID },
      data: { status: PaymentStatus.PARTIALLY_REFUNDED },
    });
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: baseOrder.id, status: OrderStatus.DELIVERED },
      data: { status: OrderStatus.DELIVERED },
    });
    expect(prisma.imeiDevice.updateMany).not.toHaveBeenCalled();
    expect(warrantyService.voidWarrantiesForOrder).not.toHaveBeenCalled();
  });

  it('allows a subsequent partial refund up to the unpaid balance', async () => {
    prisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      payments: [{ ...baseOrder.payments[0], status: PaymentStatus.PARTIALLY_REFUNDED }],
    });
    prisma.paymentTransaction.aggregate.mockResolvedValue({ _sum: { amount: 3000000 } });
    prisma.paymentTransaction.create.mockResolvedValue({ id: 'tx-second' });

    const result = await ordersService.processRefund(baseOrder.id, {
      amount: 2000000, reason: 'Additional compensation', providerReference: 'REF-PARTIAL-2',
    });

    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'payment-uuid-1', status: PaymentStatus.PARTIALLY_REFUNDED },
      data: { status: PaymentStatus.PARTIALLY_REFUNDED },
    });
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(result.order.status).toBe(OrderStatus.DELIVERED);
  });

  it('rejects refund amounts exceeding the balance of previous partial refunds', async () => {
    prisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      payments: [{ ...baseOrder.payments[0], status: PaymentStatus.PARTIALLY_REFUNDED }],
    });
    prisma.paymentTransaction.aggregate.mockResolvedValue({ _sum: { amount: 8000000 } });

    await expect(ordersService.processRefund(baseOrder.id, {
      amount: 3000000, reason: 'Over refund', providerReference: 'REF-EXCESS',
    })).rejects.toThrow(BadRequestException);
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('marks the payment refunded when the final partial refund reaches the original amount', async () => {
    prisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      payments: [{ ...baseOrder.payments[0], status: PaymentStatus.PARTIALLY_REFUNDED }],
    });
    prisma.paymentTransaction.aggregate.mockResolvedValue({ _sum: { amount: 8000000 } });

    await ordersService.processRefund(baseOrder.id, {
      amount: 2000000, reason: 'Final refund', providerReference: 'REF-FINAL',
    });

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-uuid-1' }, data: { status: PaymentStatus.REFUNDED },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: baseOrder.id, status: OrderStatus.DELIVERED },
      data: { status: OrderStatus.RETURNED },
    });
  });

  it('uses decimal arithmetic when cents complete a partial refund', async () => {
    prisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      payments: [{
        ...baseOrder.payments[0],
        amount: new Prisma.Decimal('0.30'),
        status: PaymentStatus.PARTIALLY_REFUNDED,
      }],
    });
    prisma.paymentTransaction.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('0.10') },
    });

    await ordersService.processRefund(baseOrder.id, {
      amount: 0.2, reason: 'Final amount', providerReference: 'REF-DECIMAL',
    });

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-uuid-1' }, data: { status: PaymentStatus.REFUNDED },
    });
    expect(prisma.paymentTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: TransactionType.REFUND, amount: 0.2 }),
    });
  });

  it('rejects refund amounts with more than two decimal places', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder);

    await expect(ordersService.processRefund(baseOrder.id, {
      amount: 0.001, reason: 'Invalid precision', providerReference: 'REF-PRECISION',
    })).rejects.toThrow(BadRequestException);

    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('translates a database unique-reference race into a conflict', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder);
    prisma.paymentTransaction.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate refund reference', {
        code: 'P2002', clientVersion: 'test',
      }),
    );

    await expect(ordersService.processRefund(baseOrder.id, {
      amount: 1000000, reason: 'Same reference', providerReference: 'REF-RACE-DB',
    })).rejects.toThrow(ConflictException);
  });

  it('rejects an already used external refund reference', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder);
    prisma.paymentTransaction.findFirst.mockResolvedValue({ id: 'previous-refund' });

    await expect(ordersService.processRefund(baseOrder.id, {
      amount: 2000000, reason: 'Duplicate reference', providerReference: 'REF-DUPLICATE',
    })).rejects.toThrow(ConflictException);
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('rejects a concurrent claim that already changed the payment', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder);
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });

    await expect(ordersService.processRefund(baseOrder.id, {
      amount: 10000000, reason: 'Concurrent request', providerReference: 'REF-RACE',
    })).rejects.toThrow(ConflictException);
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('allows full refunds before delivery and releases reservations', async () => {
    prisma.order.findUnique.mockResolvedValue({ ...baseOrder, status: OrderStatus.CONFIRMED });

    await expect(ordersService.processRefund(baseOrder.id, {
      amount: 10000000, reason: 'Early refund', providerReference: 'REF-EARLY',
    })).resolves.toMatchObject({ order: { status: OrderStatus.CANCELLED } });
    expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
      where: { variantId: 'variant-uuid-1', reservedQty: { gte: 1 } },
      data: { reservedQty: { decrement: 1 }, availableQty: { increment: 1 } },
    });
  });
});
