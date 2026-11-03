import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { EmailService } from '../src/infrastructure/email/email.service';
import { WarrantyService } from '../src/modules/warranty/warranty.service';
import { SystemSettingsService } from '../src/modules/settings/settings.service';
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  NotificationType,
  AuditAction,
} from '@prisma/client';

describe('OrdersService - Notifications & Audit Logs (Task 8)', () => {
  let ordersService: OrdersService;
  let prisma: any;
  let notificationsService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      inventory: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      imeiDevice: {
        updateMany: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      warranty: {
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      cart: {
        findUnique: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
      address: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    notificationsService = {
      sendToUser: jest.fn().mockResolvedValue(true),
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
          provide: EmailService,
          useValue: {
            sendOrderConfirmation: jest.fn(),
            sendOrderCancelled: jest.fn(),
          },
        },
        {
          provide: WarrantyService,
          useValue: {
            voidWarrantiesForOrder: jest.fn(),
          },
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

  it('INVARIANT: Should record audit log and send notification when Staff cancels order', async () => {
    const existingOrder = {
      id: 'a1b2c3d4-0000-0000-0000-000000000001',
      orderNumber: 'ORD-CANCEL-1',
      userId: 'user-uuid-1',
      status: OrderStatus.CONFIRMED,
      totalAmount: 5000000,
      items: [],
      user: { email: 'user@example.com', firstName: 'John', lastName: 'Doe' },
    };

    prisma.order.findUnique.mockResolvedValue(existingOrder);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

    await ordersService.transitionStatus(
      existingOrder.id,
      OrderStatus.CANCELLED,
      'staff-uuid-1',
      'Out of stock inventory',
    );

    // 1. Audit log recorded for Staff cancellation
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AuditAction.CANCEL_ORDER,
          entity: 'Order',
          entityId: existingOrder.id,
          userId: 'staff-uuid-1',
          newData: expect.objectContaining({
            status: OrderStatus.CANCELLED,
            reason: 'Out of stock inventory',
          }),
        }),
      }),
    );

    // 2. Notification sent to user
    expect(notificationsService.sendToUser).toHaveBeenCalledWith(
      existingOrder.userId,
      NotificationType.ORDER,
      'Đơn hàng đã bị hủy',
      expect.stringContaining(existingOrder.orderNumber),
      expect.any(Object),
    );
  });

  it('INVARIANT: Should send notification to user when user cancels their own order', async () => {
    const order = {
      id: 'a1b2c3d4-0000-0000-0000-000000000002',
      orderNumber: 'ORD-CANCEL-USER',
      userId: 'user-uuid-2',
      status: OrderStatus.PENDING,
      totalAmount: 2000000,
      voucherCode: null,
      createdAt: new Date(),
      items: [],
      user: { email: 'user2@example.com' },
    };

    prisma.order.findFirst.mockResolvedValue(order);
    prisma.order.findUnique.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });
    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });

    await ordersService.cancelMyOrder('user-uuid-2', order.id, { reason: 'Changed my mind' });

    expect(notificationsService.sendToUser).toHaveBeenCalledWith(
      'user-uuid-2',
      NotificationType.ORDER,
      'Đơn hàng đã bị hủy',
      expect.stringContaining(order.orderNumber),
      expect.any(Object),
    );
  });
});
