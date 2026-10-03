import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { VietqrService } from './vietqr.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { SystemSettingsService } from '../settings/settings.service';
import {
  CreatePaymentDto,
  CreateVnpayUrlDto,
  ConfirmPaymentDto,
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
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

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

// LOW: constant-time HMAC comparison (length-checked first —
// timingSafeEqual throws on length mismatch).
export function vnpSignaturesEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vietqrService: VietqrService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Optional() private readonly settingsService?: SystemSettingsService,
  ) {
    // LOW: in production, refuse to sign/verify VNPay traffic with the
    // publicly visible sandbox placeholders. Dev keeps working with sandbox.
    if ((configService.get<string>('NODE_ENV') || '').toLowerCase() === 'production') {
      const tmn = configService.get<string>('VNPAY_TMN_CODE');
      const secret = configService.get<string>('VNPAY_HASH_SECRET');
      if (
        !tmn || !secret ||
        tmn === 'SANDBOX1' ||
        secret === 'SANDBOX_SECRET_KEY_1234567890ABCDEF'
      ) {
        throw new Error(
          'FATAL: production requires real VNPAY_TMN_CODE / VNPAY_HASH_SECRET (sandbox placeholders refused)',
        );
      }
    }
  }

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

    await this.rejectIfHoldExpired(order);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot generate payment QR for cancelled order');
    }

    const amount = Number(order.totalAmount);
    const qrData = this.vietqrService.generateQrAsync
      ? await this.vietqrService.generateQrAsync(amount, order.orderNumber)
      : this.vietqrService.generateQr(amount, order.orderNumber);

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

  // ── H7: HOLD-EXPIRY ENFORCEMENT ─────────────────────────────
  // A PENDING order whose 15-minute hold has passed must never be payable:
  // paying for it would confirm stock that may already belong to someone
  // else. Release the hold inline (same guarded semantics as the expiry
  // job: conditional cancel + status-filtered IMEI/inventory release +
  // voucher rollback) and reject the payment attempt.
  private async rejectIfHoldExpired(order: {
    id: string;
    status: OrderStatus;
    holdExpiresAt: Date | null;
    voucherCode?: string | null;
  }): Promise<void> {
    if (order.status !== OrderStatus.PENDING) return;
    if (!order.holdExpiresAt || order.holdExpiresAt.getTime() > Date.now()) return;

    const full = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    if (full) {
      await this.prisma.$transaction(async (tx) => {
        const affected = await tx.order.updateMany({
          where: { id: full.id, status: OrderStatus.PENDING },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledReason: 'Hold expired (15 minutes)',
          },
        });
        if (affected.count === 0) return;
        if (full.voucherCode) {
          const voucher = await tx.voucher.findUnique({
            where: { code: full.voucherCode },
            select: { id: true },
          });
          if (voucher) {
            await tx.voucher.update({
              where: { id: voucher.id },
              data: { usageCount: { decrement: 1 } },
            });
          }
          await tx.voucherUsage.deleteMany({ where: { orderId: full.id } });
        }
        for (const item of full.items) {
          if (item.imeiDeviceId) {
            await tx.imeiDevice.updateMany({
              where: { id: item.imeiDeviceId, status: ImeiStatus.RESERVED },
              data: { status: ImeiStatus.AVAILABLE },
            });
          }
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: {
              reservedQty: { decrement: item.quantity },
              availableQty: { increment: item.quantity },
            },
          });
        }
      });
    }
    throw new BadRequestException(
      'Order hold has expired. The reserved stock was released — please place the order again.',
    );
  }

  // ── H8: UNIFIED WARRANTY ACTIVATION ─────────────────────────
  // Warranty coverage must depend on POLICY (product.warrantyMonths),
  // never on which payment method confirmed the order. Previously the VNPay
  // IPN hardcoded 365 days while COD/manual confirms created no warranty at
  // all. Every paid/confirmed order funnels through this helper with a
  // calendar-month end date anchored at the given date.
  private addWarrantyMonths(date: Date, months: number): Date {
    // P7: clamp to month-end so Jan 31 + 1 month lands on Feb 28/29,
    // not Mar 2-3 (native setMonth overflow).
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) d.setDate(0);
    return d;
  }

  private async activateWarranties(
    tx: any,
    order: { id: string; userId: string },
    anchorDate: Date,
    note: string,
  ): Promise<void> {
    const items = await tx.orderItem.findMany({
      where: { orderId: order.id },
      include: {
        variant: { include: { product: { select: { warrantyMonths: true } } } },
      },
    });
    for (const item of items) {
      if (!item.imeiDeviceId) continue;
      const months = item.variant?.product?.warrantyMonths ?? 12;
      const warrantyCode = `WRT-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
      await tx.warranty.upsert({
        where: { orderItemId: item.id },
        update: {
          status: WarrantyStatus.ACTIVE,
          startDate: anchorDate,
          endDate: this.addWarrantyMonths(anchorDate, months),
        },
        create: {
          userId: order.userId,
          productVariantId: item.variantId,
          orderItemId: item.id,
          imeiDeviceId: item.imeiDeviceId,
          warrantyCode,
          startDate: anchorDate,
          endDate: this.addWarrantyMonths(anchorDate, months),
          status: WarrantyStatus.ACTIVE,
          notes: note,
        },
      });
    }
  }

  async createVnpayPaymentUrl(dto: CreateVnpayUrlDto, clientIp?: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userId && order.userId !== userId) {
      throw new BadRequestException('Unauthorized order access');
    }

    await this.rejectIfHoldExpired(order);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    if (
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new BadRequestException('Order has already been paid and confirmed');
    }

    const isVnpayEnabled = this.settingsService
      ? (await this.settingsService.get('PAYMENT_VNPAY_ENABLED', 'true')) === 'true'
      : (this.configService.get<string>('PAYMENT_VNPAY_ENABLED', 'true')) === 'true';

    if (!isVnpayEnabled) {
      throw new BadRequestException('Cổng thanh toán VNPay đang tạm thời đóng để bảo trì');
    }

    const tmnCode = this.settingsService
      ? await this.settingsService.get('VNPAY_TMN_CODE', 'SANDBOX1')
      : this.configService.get<string>('VNPAY_TMN_CODE', 'SANDBOX1');
    const hashSecret = this.settingsService
      ? await this.settingsService.get(
          'VNPAY_HASH_SECRET',
          'SANDBOX_SECRET_KEY_1234567890ABCDEF',
        )
      : this.configService.get<string>(
          'VNPAY_HASH_SECRET',
          'SANDBOX_SECRET_KEY_1234567890ABCDEF',
        );
    const vnpUrl = this.settingsService
      ? await this.settingsService.get(
          'VNPAY_URL',
          'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        )
      : this.configService.get<string>(
          'VNPAY_URL',
          'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        );
    const returnUrl = this.settingsService
      ? await this.settingsService.get(
          'VNPAY_RETURN_URL',
          'http://localhost:5173/order/vnpay-return',
        )
      : this.configService.get<string>(
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
    const hashSecret = this.settingsService
      ? await this.settingsService.get(
          'VNPAY_HASH_SECRET',
          'SANDBOX_SECRET_KEY_1234567890ABCDEF',
        )
      : this.configService.get<string>(
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

    // LOW: constant-time comparison — plain !== leaks prefix timing.
    if (!vnpSignaturesEqual(checkHash, secureHash)) {
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

    // H7: a success IPN arriving after the 15-minute hold expired must not
    // confirm released stock. Release inline and report so VNPay/the buyer
    // knows the money needs a refund flow instead of silent confirmation.
    try {
      await this.rejectIfHoldExpired(order);
    } catch (holdErr) {
      this.logger.warn(
        `VNPay IPN: Order ${orderNumber} hold expired — released instead of confirming`,
      );
      return { RspCode: '02', Message: 'Order hold expired' };
    }

    const responseCode = query['vnp_ResponseCode'];
    if (responseCode === '00') {
      // Payment Successful
      try {
        await this.prisma.$transaction(async (tx) => {
          // H3(IPN): claim the order PENDING → CONFIRMED conditionally FIRST.
          // A concurrent duplicate IPN finds count===0 and bails out instead
          // of writing a second SUCCESS transaction row.
          const claimed = await tx.order.updateMany({
            where: { id: order.id, status: OrderStatus.PENDING },
            data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
          });
          if (claimed.count === 0) {
            const dup: any = new Error('Order already processed by another IPN');
            dup.code = 'VNPAY_ALREADY_PROCESSED';
            throw dup;
          }
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

        // 3. Order status was already claimed PENDING → CONFIRMED at the top
        // of this transaction (conditional updateMany).

        // 4. Mark reserved IMEIs as SOLD (H6: conditional — never resurrect a
        // unit that was meanwhile BLOCKED/released) and activate warranties
        // from product policy instead of a hardcoded 365 days (H8).
        const paidAt = new Date();
        for (const item of order.items) {
          if (item.imeiDeviceId) {
            await tx.imeiDevice.updateMany({
              where: { id: item.imeiDeviceId, status: ImeiStatus.RESERVED },
              data: {
                status: ImeiStatus.SOLD,
                soldAt: paidAt,
              },
            });
          }
        }
        await this.activateWarranties(
          tx,
          order,
          paidAt,
          'Tự động kích hoạt khi thanh toán VNPay thành công',
        );
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
      } catch (txErr: any) {
      // H3(IPN): duplicate concurrent success IPN — already handled.
      if (txErr?.code === 'VNPAY_ALREADY_PROCESSED') {
        this.logger.log(`VNPay IPN: Order ${orderNumber} already processed by concurrent IPN`);
        return { RspCode: '02', Message: 'Order already confirmed' };
      }
      throw txErr;
    }
    } else {
      // Payment Failed — dedupe: VNPay retries IPNs, so record at most one
      // FAILED row per provider transaction instead of one per retry.
      this.logger.warn(
        `VNPay IPN: Payment failed for order ${orderNumber} with code ${responseCode}`,
      );
      const txnNo = query['vnp_TransactionNo'];
      const alreadyRecorded = txnNo
        ? await this.prisma.payment.findFirst({
            where: {
              orderId: order.id,
              status: PaymentStatus.FAILED,
              providerOrderId: txnNo,
            },
            select: { id: true },
          })
        : null;
      if (!alreadyRecorded) {
        await this.prisma.payment.create({
          data: {
            orderId: order.id,
            method: PaymentMethod.VNPAY,
            status: PaymentStatus.FAILED,
            amount: order.totalAmount,
            provider: 'VNPAY',
            providerOrderId: txnNo,
          },
        });
      }

      return { RspCode: '00', Message: 'Confirm Success' };
    }
  }

  async handleVnpayReturn(query: Record<string, any>) {
    const secureHash = query['vnp_SecureHash'];
    const hashSecret = this.settingsService
      ? await this.settingsService.get(
          'VNPAY_HASH_SECRET',
          'SANDBOX_SECRET_KEY_1234567890ABCDEF',
        )
      : this.configService.get<string>(
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

    const isValid = vnpSignaturesEqual(checkHash, secureHash);
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

    await this.rejectIfHoldExpired(order);

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    const existing = await this.prisma.payment.findFirst({
      where: { orderId: dto.orderId, status: PaymentStatus.PAID },
    });
    if (existing) throw new BadRequestException('Order is already paid');

    await this.rejectIfHoldExpired(order as any);

    // M5: double-clicking "pay" must not stack PENDING rows — reuse the fresh
    // pending payment for the same order+method instead of creating another.
    const pending = await this.prisma.payment.findFirst({
      where: {
        orderId: dto.orderId,
        method: dto.method,
        status: PaymentStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) return pending;

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

  // ── H5: MANUAL CONFIRM WITH EVIDENCE ────────────────────────
  // Confirming a bank-transfer payment mints ledger truth from a human click,
  // so it must carry evidence and perform the SAME atomic settlement the
  // VNPay IPN does: amount match → PAID → order CONFIRMED → IMEI SOLD →
  // warranties. Previously it flipped PAID alone (order stayed PENDING and
  // could later be auto-cancelled by hold expiry; IMEIs never SOLD; no
  // warranty) and could be clicked repeatedly or on FAILED payments.
  async confirmPayment(
    paymentId: string,
    dto: ConfirmPaymentDto,
    actorId?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Only a PENDING payment can be confirmed (current: ${payment.status})`,
      );
    }

    const order = payment.order;
    if (!order) throw new NotFoundException('Order for payment not found');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot confirm payment for a cancelled order');
    }
    if (
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException('Order is already confirmed');
    }
    // H5: the confirmed amount must equal what the buyer actually owes.
    if (Math.round(Number(payment.amount)) !== Math.round(Number(order.totalAmount))) {
      throw new BadRequestException(
        `Payment amount (${payment.amount}) does not match order total (${order.totalAmount})`,
      );
    }
    await this.rejectIfHoldExpired(order as any);

    const paidAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.PAID, paidAt: new Date(paidAt) },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('Payment was already processed concurrently');
      }

      await tx.paymentTransaction.create({
        data: {
          paymentId,
          transactionCode: this.generateTransactionCode(),
          type: TransactionType.PAYMENT,
          status: TransactionStatus.SUCCESS,
          amount: payment.amount,
          providerReference: dto.providerRef,
          responseData: {
            confirmedBy: actorId || null,
            providerRef: dto.providerRef,
          },
        },
      });

      await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CONFIRMED, confirmedAt: paidAt },
      });

      for (const item of order.items) {
        if (item.imeiDeviceId) {
          await tx.imeiDevice.updateMany({
            where: { id: item.imeiDeviceId, status: ImeiStatus.RESERVED },
            data: { status: ImeiStatus.SOLD, soldAt: paidAt },
          });
        }
      }
      await this.activateWarranties(
        tx,
        { id: order.id, userId: order.userId },
        paidAt,
        'Kích hoạt khi soát chứng từ chuyển khoản thành công',
      );

      return tx.payment.findUnique({ where: { id: paymentId } });
    });
  }

  async failPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Only a PENDING payment can be marked failed (current: ${payment.status})`,
      );
    }

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

  // H11: payment reads are scoped — a buyer sees only their own orders'
  // payments. Staff roles keep cross-order visibility for support.
  private isPrivilegedRole(user: { role?: string; roles?: Array<{ role?: { name?: string } } | string> }): boolean {
    if (!user) return false;
    if (user.role && ['STAFF', 'MANAGER', 'ADMIN'].includes(user.role)) return true;
    const roles = user.roles ?? [];
    return roles.some((r) => {
      const name = typeof r === 'string' ? r : r?.role?.name;
      return name && ['STAFF', 'MANAGER', 'ADMIN'].includes(name);
    });
  }

  async getStatus(paymentId: string, user?: { role?: string; roles?: any }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { transactions: true, order: { select: { id: true, userId: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (user && !this.isPrivilegedRole(user) && payment.order?.userId !== (user as any)?.id) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async findByOrder(orderId: string, user?: { role?: string; roles?: any }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (user && !this.isPrivilegedRole(user) && order.userId !== (user as any)?.id) {
      throw new NotFoundException('Order not found');
    }
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
