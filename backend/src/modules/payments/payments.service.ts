import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { VietqrService } from './vietqr.service';
import { EmailService } from '../../infrastructure/email/email.service';
import {
  CreatePaymentDto,
  CreateVnpayUrlDto,
  PaymentCallbackDto,
} from './dto/payment.dto';
import {
  PaymentStatus,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
  OrderStatus,
  ImeiStatus,
  WarrantyStatus,
} from '@prisma/client';
import { createHmac, randomBytes } from 'crypto';

export function buildVnpaySignData(params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).sort();
  return sortedKeys
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key] ?? '')).replace(/%20/g, '+')}`,
    )
    .join('&');
}

export function hashVnpayParams(params: Record<string, any>, secret: string): string {
  const signData = buildVnpaySignData(params);
  const hmac = createHmac('sha512', secret);
  return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vietqrService: VietqrService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private generateTransactionCode(): string {
    return `TXN-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  // ============================================================
  // VIETQR INTEGRATION
  // ============================================================

  async generateVietQr(orderId: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userId && order.userId !== userId) {
      throw new BadRequestException('Unauthorized order access');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot generate payment QR for cancelled order');
    }

    const amount = Number(order.totalAmount);
    const qrData = this.vietqrService.generateQr(amount, order.orderNumber);

    // Find or create pending payment record for VietQR transfer
    let payment = order.payments.find(
      (p) => p.status === PaymentStatus.PENDING && p.method === PaymentMethod.BANK_TRANSFER,
    );

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          method: PaymentMethod.BANK_TRANSFER,
          status: PaymentStatus.PENDING,
          amount: order.totalAmount,
          provider: 'VIETQR',
        },
      });
    }

    return {
      paymentId: payment.id,
      orderId: order.id,
      ...qrData,
    };
  }

  // ============================================================
  // VNPAY INTEGRATION
  // ============================================================

  async createVnpayPaymentUrl(dto: CreateVnpayUrlDto, clientIp?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    if (
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new BadRequestException('Order has already been paid and confirmed');
    }

    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE', 'SANDBOX1');
    const hashSecret = this.configService.get<string>(
      'VNPAY_HASH_SECRET',
      'SANDBOX_SECRET_KEY_1234567890ABCDEF',
    );
    const vnpUrl = this.configService.get<string>(
      'VNPAY_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    const returnUrl = this.configService.get<string>(
      'VNPAY_RETURN_URL',
      'http://localhost:5173/order/vnpay-return',
    );

    const now = new Date();
    const createDate =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: order.orderNumber,
      vnp_OrderInfo: `Thanh toan don hang ${order.orderNumber}`,
      vnp_OrderType: 'other',
      vnp_Amount: (Math.round(Number(order.totalAmount) * 100)).toString(),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: clientIp || dto.ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    if (dto.bankCode) {
      vnpParams['vnp_BankCode'] = dto.bankCode;
    }

    const signData = buildVnpaySignData(vnpParams);
    const signed = hashVnpayParams(vnpParams, hashSecret);

    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

    return {
      paymentUrl,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
    };
  }

  async handleVnpayIpn(query: Record<string, any>) {
    this.logger.log(`Received VNPay IPN webhook: ${JSON.stringify(query)}`);

    const secureHash = query['vnp_SecureHash'];
    const hashSecret = this.configService.get<string>(
      'VNPAY_HASH_SECRET',
      'SANDBOX_SECRET_KEY_1234567890ABCDEF',
    );

    const cleanParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && value !== undefined && value !== null) {
        cleanParams[key] = String(value);
      }
    }

    const checkHash = hashVnpayParams(cleanParams, hashSecret);

    if (checkHash !== secureHash) {
      this.logger.warn(`VNPay IPN: Invalid checksum (expected: ${checkHash}, received: ${secureHash})`);
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }

    const orderNumber = query['vnp_TxnRef'];
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payments: true,
        user: true,
      },
    });

    if (!order) {
      this.logger.warn(`VNPay IPN: Order not found: ${orderNumber}`);
      return { RspCode: '01', Message: 'Order not found' };
    }

    const vnpAmount = Number(query['vnp_Amount']) / 100;
    if (Math.round(Number(order.totalAmount)) !== Math.round(vnpAmount)) {
      this.logger.warn(
        `VNPay IPN: Invalid amount (order: ${order.totalAmount}, vnp: ${vnpAmount})`,
      );
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (order.status === OrderStatus.CANCELLED) {
      this.logger.warn(`VNPay IPN: Order ${orderNumber} already cancelled`);
      return { RspCode: '02', Message: 'Order already cancelled' };
    }

    if (
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.DELIVERED
    ) {
      this.logger.log(`VNPay IPN: Order ${orderNumber} already confirmed`);
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const responseCode = query['vnp_ResponseCode'];
    if (responseCode === '00') {
      // Payment Successful
      await this.prisma.$transaction(async (tx) => {
        // 1. Create or update payment
        let payment = order.payments.find((p) => p.status === PaymentStatus.PENDING);
        if (!payment) {
          payment = await tx.payment.create({
            data: {
              orderId: order.id,
              method: PaymentMethod.VNPAY,
              status: PaymentStatus.PAID,
              amount: order.totalAmount,
              provider: 'VNPAY',
              providerOrderId: query['vnp_TransactionNo'] || query['vnp_TxnRef'],
              paidAt: new Date(),
            },
          });
        } else {
          payment = await tx.payment.update({
            where: { id: payment.id },
            data: {
              method: PaymentMethod.VNPAY,
              status: PaymentStatus.PAID,
              provider: 'VNPAY',
              providerOrderId: query['vnp_TransactionNo'] || query['vnp_TxnRef'],
              paidAt: new Date(),
            },
          });
        }

        // 2. Record transaction
        await tx.paymentTransaction.create({
          data: {
            paymentId: payment.id,
            transactionCode: query['vnp_TransactionNo'] || this.generateTransactionCode(),
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCESS,
            amount: order.totalAmount,
            providerReference: query['vnp_BankTranNo'],
            responseData: query,
          },
        });

        // 3. Update Order status = CONFIRMED
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CONFIRMED,
            confirmedAt: new Date(),
          },
        });

        // 4. Mark all reserved IMEIs as SOLD and auto-create Warranty (12 months)
        const warrantyEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        for (const item of order.items) {
          if (item.imeiDeviceId) {
            await tx.imeiDevice.update({
              where: { id: item.imeiDeviceId },
              data: {
                status: ImeiStatus.SOLD,
                soldAt: new Date(),
              },
            });

            const warrantyCode = `WRT-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
            await tx.warranty.upsert({
              where: { orderItemId: item.id },
              update: {
                status: WarrantyStatus.ACTIVE,
                startDate: new Date(),
                endDate: warrantyEndDate,
              },
              create: {
                userId: order.userId,
                productVariantId: item.variantId,
                orderItemId: item.id,
                imeiDeviceId: item.imeiDeviceId,
                warrantyCode,
                startDate: new Date(),
                endDate: warrantyEndDate,
                status: WarrantyStatus.ACTIVE,
                notes: 'Tự động kích hoạt khi thanh toán VNPay thành công',
              },
            });
          }
        }
      });

      // 5. Trigger email notification
      try {
        if (order.user?.email) {
          await this.emailService.sendOrderConfirmation(
            order.user.email,
            order.orderNumber,
            Number(order.totalAmount),
          );
        }
      } catch (emailErr) {
        this.logger.error(
          `Failed to send order confirmation email:`,
          (emailErr as Error).message,
        );
      }

      this.logger.log(`VNPay IPN: Successfully processed order ${orderNumber}`);
      return { RspCode: '00', Message: 'Confirm Success' };
    } else {
      // Payment Failed
      this.logger.warn(
        `VNPay IPN: Payment failed for order ${orderNumber} with code ${responseCode}`,
      );
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          method: PaymentMethod.VNPAY,
          status: PaymentStatus.FAILED,
          amount: order.totalAmount,
          provider: 'VNPAY',
          providerOrderId: query['vnp_TransactionNo'],
        },
      });

      return { RspCode: '00', Message: 'Confirm Success' };
    }
  }

  async handleVnpayReturn(query: Record<string, any>) {
    const secureHash = query['vnp_SecureHash'];
    const hashSecret = this.configService.get<string>(
      'VNPAY_HASH_SECRET',
      'SANDBOX_SECRET_KEY_1234567890ABCDEF',
    );

    const cleanParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && value !== undefined && value !== null) {
        cleanParams[key] = String(value);
      }
    }

    const checkHash = hashVnpayParams(cleanParams, hashSecret);

    const isValid = checkHash === secureHash;
    const isSuccess = isValid && query['vnp_ResponseCode'] === '00';

    return {
      success: isSuccess,
      isValid,
      orderNumber: query['vnp_TxnRef'],
      amount: Number(query['vnp_Amount']) / 100,
      responseCode: query['vnp_ResponseCode'],
      transactionNo: query['vnp_TransactionNo'],
      message: isSuccess
        ? 'Giao dịch thành công'
        : 'Giao dịch không thành công hoặc chữ ký không hợp lệ',
    };
  }

  // ============================================================
  // EXISTING METHODS
  // ============================================================

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
      include: {
        payment: {
          include: {
            order: { select: { id: true, orderNumber: true, userId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
