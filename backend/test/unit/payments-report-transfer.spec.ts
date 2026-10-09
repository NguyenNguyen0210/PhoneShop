import { describe, it, expect, jest } from '@jest/globals';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { VietqrService } from '../../src/modules/payments/vietqr.service';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';

function buildService(mockPrisma: any) {
  const mockConfig: any = { get: (_k: string, d?: string) => d };
  const vietqrService = new VietqrService(mockConfig);
  return new PaymentsService(mockPrisma, vietqrService, {} as any, mockConfig);
}

function pendingOrder() {
  return {
    id: 'ord-1',
    userId: 'user-1',
    status: OrderStatus.PENDING,
    payments: [
      {
        id: 'pay-1',
        method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.PENDING,
        amount: 1500000,
      },
    ],
  };
}

describe('reportTransfer', () => {
  it('creates a CUSTOMER_REPORTED PENDING transaction for the pending VietQR payment', async () => {
    const mockPrisma: any = {
      order: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(pendingOrder())),
      },
      paymentTransaction: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(null)),
        create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'txn-1', ...args.data })),
      },
    };
    const svc = buildService(mockPrisma);

    const result: any = await svc.reportTransfer('ord-1', 'user-1');

    expect(mockPrisma.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentId: 'pay-1',
          providerReference: 'CUSTOMER_REPORTED',
          status: 'PENDING',
        }),
      }),
    );
    expect(result.providerReference).toBe('CUSTOMER_REPORTED');
  });

  it('returns the recent report instead of creating a duplicate (anti double-click)', async () => {
    const recent = {
      id: 'txn-recent',
      paymentId: 'pay-1',
      providerReference: 'CUSTOMER_REPORTED',
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
    };
    const mockPrisma: any = {
      order: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(pendingOrder())),
      },
      paymentTransaction: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(recent)),
        create: jest.fn(),
      },
    };
    const svc = buildService(mockPrisma);

    const result: any = await svc.reportTransfer('ord-1', 'user-1');

    expect(result).toEqual(recent);
    expect(mockPrisma.paymentTransaction.create).not.toHaveBeenCalled();
  });
});
