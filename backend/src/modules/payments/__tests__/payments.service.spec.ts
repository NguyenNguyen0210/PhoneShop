import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PaymentsService } from '../payments.service';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('PaymentsService - reportTransfer & VNPay resilience', () => {
  let service: PaymentsService;
  let mockPrisma: any;
  let mockVietqr: any;
  let mockEmail: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findFirst: (jest.fn() as any),
        findUnique: (jest.fn() as any),
        update: (jest.fn() as any).mockResolvedValue({}),
      },
      payment: {
        create: (jest.fn() as any),
      },
      paymentTransaction: {
        findFirst: (jest.fn() as any).mockResolvedValue(null),
        create: (jest.fn() as any).mockImplementation((args: any) => Promise.resolve({ id: 'txn-1', ...args.data })),
      },
    };
    mockVietqr = {};
    mockEmail = {};
    mockConfig = {
      get: (jest.fn() as any).mockImplementation((key: string, defaultVal?: string) => defaultVal || ''),
    };

    service = new PaymentsService(mockPrisma, mockVietqr, mockEmail, mockConfig);
  });

  it('extends order holdExpiresAt by 24 hours when reporting transfer on a pending order', async () => {
    const mockOrder = {
      id: 'ord-123',
      orderNumber: 'ORD-123',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      totalAmount: 10000000,
      paymentMethod: PaymentMethod.VNPAY,
      payments: [
        {
          id: 'pay-vnp-1',
          method: PaymentMethod.VNPAY,
          status: PaymentStatus.PENDING,
          amount: 10000000,
        },
      ],
    };

    mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

    const now = Date.now();
    await service.reportTransfer('ord-123', 'user-1');

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ord-123' },
        data: expect.objectContaining({
          holdExpiresAt: expect.any(Date),
        }),
      }),
    );

    const updatedDate = mockPrisma.order.update.mock.calls[0][0].data.holdExpiresAt;
    const diffHours = (updatedDate.getTime() - now) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThanOrEqual(23.9);
  });

  it('creates a VNPAY pending payment record if none exists when reporting transfer', async () => {
    const mockOrder = {
      id: 'ord-456',
      orderNumber: 'ORD-456',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      totalAmount: 5000000,
      paymentMethod: PaymentMethod.VNPAY,
      payments: [],
    };

    mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
    mockPrisma.payment.create.mockResolvedValue({
      id: 'pay-new-1',
      method: PaymentMethod.VNPAY,
      status: PaymentStatus.PENDING,
      amount: 5000000,
    });

    await service.reportTransfer('ord-456', 'user-1');

    expect(mockPrisma.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 'ord-456',
        method: PaymentMethod.VNPAY,
        status: PaymentStatus.PENDING,
        amount: 5000000,
        provider: 'VNPAY',
      },
    });

    expect(mockPrisma.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentId: 'pay-new-1',
          providerReference: 'CUSTOMER_REPORTED',
        }),
      }),
    );
  });

  it('rejects reporting transfer if the order is already CANCELLED', async () => {
    const cancelledOrder = {
      id: 'ord-cancelled',
      orderNumber: 'ORD-CANCELLED',
      userId: 'user-1',
      status: OrderStatus.CANCELLED,
      totalAmount: 5000000,
      paymentMethod: PaymentMethod.VNPAY,
      payments: [],
    };

    mockPrisma.order.findFirst.mockResolvedValue(cancelledOrder);

    await expect(service.reportTransfer('ord-cancelled', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
