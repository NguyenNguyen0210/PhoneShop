import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { VietqrService } from '../src/modules/payments/vietqr.service';
import { EmailService } from '../src/infrastructure/email/email.service';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, ImeiStatus, TransactionStatus } from '@prisma/client';

describe('PaymentsService - failPayment (PR #2)', () => {
  let paymentsService: PaymentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      imeiDevice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: VietqrService, useValue: {} },
        { provide: EmailService, useValue: { sendEmail: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  it('nên hủy Order PENDING và giải phóng IMEI/reservedQty khi payment bị đánh dấu FAILED', async () => {
    const mockPayment = { id: 'pay-1', status: PaymentStatus.PENDING, amount: 20000000, orderId: 'ord-1' };
    const mockOrder = {
      id: 'ord-1',
      status: OrderStatus.PENDING,
      payments: [mockPayment],
      items: [{ variantId: 'v1', quantity: 1, imeiDeviceId: 'imei-1' }],
    };

    prisma.payment.findUnique.mockResolvedValue(mockPayment);
    prisma.order.findUnique.mockResolvedValue(mockOrder);

    await paymentsService.failPayment('pay-1');

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pay-1' }, data: { status: PaymentStatus.FAILED } }),
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ord-1' },
        data: expect.objectContaining({ status: OrderStatus.CANCELLED }),
      }),
    );
    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith({
      where: { id: 'imei-1', status: ImeiStatus.RESERVED },
      data: { status: ImeiStatus.AVAILABLE },
    });
    expect(prisma.inventory.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { variantId: 'v1', reservedQty: { gte: 1 } },
        data: expect.objectContaining({ reservedQty: { decrement: 1 } }),
      }),
    );
  });

  it('nên từ chối khi payment không ở trạng thái PENDING (chống double-release)', async () => {
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay-failed', status: PaymentStatus.FAILED });

    await expect(paymentsService.failPayment('pay-failed')).rejects.toThrow(BadRequestException);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('không hủy Order nếu đơn hàng vẫn còn payment PAID hoặc PENDING hợp lệ khác', async () => {
    const mockPayment = { id: 'pay-1', status: PaymentStatus.PENDING, amount: 10000000, orderId: 'ord-1' };
    const otherPayment = { id: 'pay-2', status: PaymentStatus.PAID, amount: 10000000, orderId: 'ord-1' };
    const mockOrder = {
      id: 'ord-1',
      status: OrderStatus.PENDING,
      payments: [mockPayment, otherPayment],
      items: [{ variantId: 'v1', quantity: 1, imeiDeviceId: 'imei-1' }],
    };

    prisma.payment.findUnique.mockResolvedValue(mockPayment);
    prisma.order.findUnique.mockResolvedValue(mockOrder);

    await paymentsService.failPayment('pay-1');

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pay-1' }, data: { status: PaymentStatus.FAILED } }),
    );
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.imeiDevice.updateMany).not.toHaveBeenCalled();
  });
});
