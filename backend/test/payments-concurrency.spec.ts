import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { VietqrService } from '../src/modules/payments/vietqr.service';
import { EmailService } from '../src/infrastructure/email/email.service';
import { SystemSettingsService } from '../src/modules/settings/settings.service';
import { NotFoundException } from '@nestjs/common';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client';

describe('PaymentsService - Concurrency & Scoping Invariants', () => {
  let paymentsService: PaymentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      paymentTransaction: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: VietqrService,
          useValue: {},
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: SystemSettingsService,
          useValue: {
            get: jest.fn().mockResolvedValue('true'),
          },
        },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  describe('Authorization and Scoping', () => {
    it('INVARIANT: A regular customer cannot inspect another customer payment record', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-target',
        status: PaymentStatus.PAID,
        order: { id: 'ord-target', userId: 'victim-user-id' },
        transactions: [],
      });

      const attackerUser = { id: 'attacker-user-id', roles: ['USER'], role: 'USER' };

      await expect(
        paymentsService.getStatus('pay-target', attackerUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('INVARIANT: Staff or Admin can inspect any payment record for customer support', async () => {
      const mockPayment = {
        id: 'pay-target',
        status: PaymentStatus.PAID,
        order: { id: 'ord-target', userId: 'customer-user-id' },
        transactions: [],
      };
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      const staffUser = { id: 'staff-user-id', roles: ['USER', 'STAFF'], role: 'STAFF' };

      const result = await paymentsService.getStatus('pay-target', staffUser);
      expect(result).toBeDefined();
      expect(result.id).toBe('pay-target');
    });
  });

  describe('VNPay IPN Deduplication & Idempotency', () => {
    it('INVARIANT: Duplicate VNPay IPN with existing SUCCESS transaction returns RspCode 00 without re-processing', async () => {
      const mockParams = {
        vnp_ResponseCode: '00',
        vnp_TxnRef: 'ord-123',
        vnp_Amount: '100000000', // 1,000,000 * 100
        vnp_TransactionNo: '14598211',
        vnp_SecureHash: 'mock-valid-hash',
      };

      // Existing transaction already processed as SUCCESS
      prisma.paymentTransaction.findFirst.mockResolvedValue({
        id: 'tx-existing',
        providerReference: '14598211',
        status: 'SUCCESS',
      });

      // Spy on verifyVnpaySignature to return true
      jest.spyOn<any, any>(paymentsService, 'verifyVnpaySignature').mockReturnValue(true);

      const result = await paymentsService.handleVnpayIpn(mockParams);

      expect(result.RspCode).toBe('00');
      expect(result.Message).toContain('Confirm Success');
      // Payment update should not be called again
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });
});
