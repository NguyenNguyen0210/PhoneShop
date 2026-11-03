import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { WarrantyService } from '../src/modules/warranty/warranty.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { SystemSettingsService } from '../src/modules/settings/settings.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  TransactionType,
  TransactionStatus,
  ImeiStatus,
  StockMovementType,
  WarrantyStatus,
  NotificationType,
  AuditAction,
} from '@prisma/client';

describe('OrdersService - Refund Workflow & Business Invariants', () => {
  let ordersService: OrdersService;
  let prisma: any;
  let notificationsService: any;
  let warrantyService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        update: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
      },
      imeiDevice: {
        updateMany: jest.fn(),
      },
      inventory: {
        updateMany: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
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

  const baseOrder = {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    orderNumber: 'ORD-123456',
    userId: 'user-uuid-1',
    status: OrderStatus.CONFIRMED,
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
        { amount: 5000000, reason: 'Customer returned' },
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
        { amount: 5000000, reason: 'Customer returned' },
        'admin-uuid-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('INVARIANT: Should reject if refund amount exceeds paid payment amount (anti-over-refund)', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder);

    await expect(
      ordersService.processRefund(
        baseOrder.id,
        { amount: 15000000, reason: 'Customer returned' }, // 15m > 10m
        'admin-uuid-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('INVARIANT: Should successfully execute full refund transaction with all side effects', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder);
    prisma.inventory.findUnique.mockResolvedValue({ quantity: 10 });
    prisma.paymentTransaction.create.mockImplementation(({ data }) => Promise.resolve({ id: 'tx-1', ...data }));
    prisma.order.update.mockResolvedValue({ ...baseOrder, status: OrderStatus.RETURNED });

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
          transactionCode: expect.stringMatching(/^REF-\d+-a1b2c3d4$/),
        }),
      }),
    );

    // 2. Payment status set to REFUNDED
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-uuid-1' },
      data: { status: PaymentStatus.REFUNDED },
    });

    // 3. Order status set to RETURNED
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: baseOrder.id },
      data: { status: OrderStatus.RETURNED },
    });

    // 4. ImeiDevice set to RETURNED
    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['imei-uuid-1'] } },
      data: { status: ImeiStatus.RETURNED },
    });

    // 5. StockMovement created with IMPORT_RETURN
    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          variantId: 'variant-uuid-1',
          type: StockMovementType.IMPORT_RETURN,
          quantity: 1,
          referenceType: 'ORDER_REFUND',
          referenceId: baseOrder.id,
        }),
      }),
    );

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
    prisma.inventory.findUnique.mockResolvedValue({ quantity: 10 });
    prisma.order.update.mockResolvedValue({ ...baseOrder, status: OrderStatus.RETURNED });

    await ordersService.processRefund(
      baseOrder.id,
      { amount: 3000000, reason: 'Partial damage compensation' },
      'admin-uuid-1',
    );

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-uuid-1' },
      data: { status: PaymentStatus.PARTIALLY_REFUNDED },
    });
  });
});
