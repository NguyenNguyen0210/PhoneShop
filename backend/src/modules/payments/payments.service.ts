import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, PaymentCallbackDto } from './dto/payment.dto';
import { PaymentStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private generateTransactionCode(): string {
    return `TXN-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async create(userId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    const existing = await this.prisma.payment.findFirst({
      where: { orderId: dto.orderId, status: PaymentStatus.PAID },
    });
    if (existing) throw new BadRequestException('Order is already paid');

    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        method: dto.method,
        amount: order.totalAmount,
      },
    });

    // For COD, automatically create a pending transaction
    if (dto.method === 'COD') {
      await this.prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          transactionCode: this.generateTransactionCode(),
          type: TransactionType.PAYMENT,
          status: TransactionStatus.PENDING,
          amount: order.totalAmount,
        },
      });
    }

    return payment;
  }

  async handleCallback(dto: PaymentCallbackDto) {
    // Stub: real integration would verify webhook signature and update status
    return { received: true, provider: dto.provider };
  }

  async confirmPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.prisma.paymentTransaction.create({
      data: {
        paymentId,
        transactionCode: this.generateTransactionCode(),
        type: TransactionType.PAYMENT,
        status: TransactionStatus.SUCCESS,
        amount: payment.amount,
      },
    });

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.PAID, paidAt: new Date() },
    });
  }

  async failPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.prisma.paymentTransaction.create({
      data: {
        paymentId,
        transactionCode: this.generateTransactionCode(),
        type: TransactionType.PAYMENT,
        status: TransactionStatus.FAILED,
        amount: payment.amount,
      },
    });

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED },
    });
  }

  async getStatus(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { transactions: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async findByOrder(orderId: string) {
    return this.prisma.payment.findMany({
      where: { orderId },
      include: { transactions: true },
    });
  }

  async findAll() {
    return this.prisma.payment.findMany({
      include: {
        order: { select: { id: true, orderNumber: true, userId: true } },
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransactionHistory() {
    return this.prisma.paymentTransaction.findMany({
      include: { payment: { include: { order: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
