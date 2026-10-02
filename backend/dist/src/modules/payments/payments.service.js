"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const vietqr_service_1 = require("./vietqr.service");
const email_service_1 = require("../../infrastructure/email/email.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    prisma;
    vietqrService;
    emailService;
    configService;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(prisma, vietqrService, emailService, configService) {
        this.prisma = prisma;
        this.vietqrService = vietqrService;
        this.emailService = emailService;
        this.configService = configService;
    }
    generateTransactionCode() {
        return `TXN-${Date.now()}-${(0, crypto_1.randomBytes)(4).toString('hex').toUpperCase()}`;
    }
    async generateVietQr(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true, payments: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (userId && order.userId !== userId) {
            throw new common_1.BadRequestException('Unauthorized order access');
        }
        const amount = Number(order.totalAmount);
        const qrData = this.vietqrService.generateQr(amount, order.orderNumber);
        let payment = order.payments.find((p) => p.status === client_1.PaymentStatus.PENDING && p.method === client_1.PaymentMethod.BANK_TRANSFER);
        if (!payment) {
            payment = await this.prisma.payment.create({
                data: {
                    orderId: order.id,
                    method: client_1.PaymentMethod.BANK_TRANSFER,
                    status: client_1.PaymentStatus.PENDING,
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
    async createVnpayPaymentUrl(dto, clientIp) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { payments: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status === client_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot pay for a cancelled order');
        }
        if (order.status === client_1.OrderStatus.CONFIRMED ||
            order.status === client_1.OrderStatus.COMPLETED) {
            throw new common_1.BadRequestException('Order has already been paid and confirmed');
        }
        const tmnCode = this.configService.get('VNPAY_TMN_CODE', 'SANDBOX1');
        const hashSecret = this.configService.get('VNPAY_HASH_SECRET', 'SANDBOX_SECRET_KEY_1234567890ABCDEF');
        const vnpUrl = this.configService.get('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
        const returnUrl = this.configService.get('VNPAY_RETURN_URL', 'http://localhost:5173/order/vnpay-return');
        const now = new Date();
        const createDate = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');
        const vnpParams = {
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
        const sortedKeys = Object.keys(vnpParams).sort();
        const signData = sortedKeys
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(vnpParams[key])}`)
            .join('&');
        const hmac = (0, crypto_1.createHmac)('sha512', hashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
        const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;
        return {
            paymentUrl,
            orderNumber: order.orderNumber,
            amount: Number(order.totalAmount),
        };
    }
    async handleVnpayIpn(query) {
        this.logger.log(`Received VNPay IPN webhook: ${JSON.stringify(query)}`);
        const secureHash = query['vnp_SecureHash'];
        const hashSecret = this.configService.get('VNPAY_HASH_SECRET', 'SANDBOX_SECRET_KEY_1234567890ABCDEF');
        const cleanParams = {};
        for (const [key, value] of Object.entries(query)) {
            if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && value !== undefined && value !== null) {
                cleanParams[key] = String(value);
            }
        }
        const sortedKeys = Object.keys(cleanParams).sort();
        const signData = sortedKeys
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(cleanParams[key])}`)
            .join('&');
        const hmac = (0, crypto_1.createHmac)('sha512', hashSecret);
        const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
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
            this.logger.warn(`VNPay IPN: Invalid amount (order: ${order.totalAmount}, vnp: ${vnpAmount})`);
            return { RspCode: '04', Message: 'Invalid amount' };
        }
        if (order.status === client_1.OrderStatus.CONFIRMED ||
            order.status === client_1.OrderStatus.COMPLETED ||
            order.status === client_1.OrderStatus.DELIVERED) {
            this.logger.log(`VNPay IPN: Order ${orderNumber} already confirmed`);
            return { RspCode: '02', Message: 'Order already confirmed' };
        }
        const responseCode = query['vnp_ResponseCode'];
        if (responseCode === '00') {
            await this.prisma.$transaction(async (tx) => {
                let payment = order.payments.find((p) => p.status === client_1.PaymentStatus.PENDING);
                if (!payment) {
                    payment = await tx.payment.create({
                        data: {
                            orderId: order.id,
                            method: client_1.PaymentMethod.VNPAY,
                            status: client_1.PaymentStatus.PAID,
                            amount: order.totalAmount,
                            provider: 'VNPAY',
                            providerOrderId: query['vnp_TransactionNo'] || query['vnp_TxnRef'],
                            paidAt: new Date(),
                        },
                    });
                }
                else {
                    payment = await tx.payment.update({
                        where: { id: payment.id },
                        data: {
                            method: client_1.PaymentMethod.VNPAY,
                            status: client_1.PaymentStatus.PAID,
                            provider: 'VNPAY',
                            providerOrderId: query['vnp_TransactionNo'] || query['vnp_TxnRef'],
                            paidAt: new Date(),
                        },
                    });
                }
                await tx.paymentTransaction.create({
                    data: {
                        paymentId: payment.id,
                        transactionCode: query['vnp_TransactionNo'] || this.generateTransactionCode(),
                        type: client_1.TransactionType.PAYMENT,
                        status: client_1.TransactionStatus.SUCCESS,
                        amount: order.totalAmount,
                        providerReference: query['vnp_BankTranNo'],
                        responseData: query,
                    },
                });
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: client_1.OrderStatus.CONFIRMED,
                        confirmedAt: new Date(),
                    },
                });
                const warrantyEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                for (const item of order.items) {
                    if (item.imeiDeviceId) {
                        await tx.imeiDevice.update({
                            where: { id: item.imeiDeviceId },
                            data: {
                                status: client_1.ImeiStatus.SOLD,
                                soldAt: new Date(),
                            },
                        });
                        const warrantyCode = `WRT-${Date.now()}-${(0, crypto_1.randomBytes)(3).toString('hex').toUpperCase()}`;
                        await tx.warranty.upsert({
                            where: { orderItemId: item.id },
                            update: {
                                status: client_1.WarrantyStatus.ACTIVE,
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
                                status: client_1.WarrantyStatus.ACTIVE,
                                notes: 'Tự động kích hoạt khi thanh toán VNPay thành công',
                            },
                        });
                    }
                }
            });
            try {
                if (order.user?.email) {
                    await this.emailService.sendOrderConfirmation(order.user.email, order.orderNumber, Number(order.totalAmount));
                }
            }
            catch (emailErr) {
                this.logger.error(`Failed to send order confirmation email:`, emailErr.message);
            }
            this.logger.log(`VNPay IPN: Successfully processed order ${orderNumber}`);
            return { RspCode: '00', Message: 'Confirm Success' };
        }
        else {
            this.logger.warn(`VNPay IPN: Payment failed for order ${orderNumber} with code ${responseCode}`);
            await this.prisma.payment.create({
                data: {
                    orderId: order.id,
                    method: client_1.PaymentMethod.VNPAY,
                    status: client_1.PaymentStatus.FAILED,
                    amount: order.totalAmount,
                    provider: 'VNPAY',
                    providerOrderId: query['vnp_TransactionNo'],
                },
            });
            return { RspCode: '00', Message: 'Confirm Success' };
        }
    }
    async handleVnpayReturn(query) {
        const secureHash = query['vnp_SecureHash'];
        const hashSecret = this.configService.get('VNPAY_HASH_SECRET', 'SANDBOX_SECRET_KEY_1234567890ABCDEF');
        const cleanParams = {};
        for (const [key, value] of Object.entries(query)) {
            if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && value !== undefined && value !== null) {
                cleanParams[key] = String(value);
            }
        }
        const sortedKeys = Object.keys(cleanParams).sort();
        const signData = sortedKeys
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(cleanParams[key])}`)
            .join('&');
        const hmac = (0, crypto_1.createHmac)('sha512', hashSecret);
        const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
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
    async create(userId, dto) {
        const order = await this.prisma.order.findFirst({
            where: { id: dto.orderId, userId },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Cannot pay for a cancelled order');
        }
        const existing = await this.prisma.payment.findFirst({
            where: { orderId: dto.orderId, status: client_1.PaymentStatus.PAID },
        });
        if (existing)
            throw new common_1.BadRequestException('Order is already paid');
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
                    type: client_1.TransactionType.PAYMENT,
                    status: client_1.TransactionStatus.PENDING,
                    amount: order.totalAmount,
                },
            });
        }
        return payment;
    }
    async handleCallback(dto) {
        return { received: true, provider: dto.provider };
    }
    async confirmPayment(paymentId) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        await this.prisma.paymentTransaction.create({
            data: {
                paymentId,
                transactionCode: this.generateTransactionCode(),
                type: client_1.TransactionType.PAYMENT,
                status: client_1.TransactionStatus.SUCCESS,
                amount: payment.amount,
            },
        });
        return this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: client_1.PaymentStatus.PAID, paidAt: new Date() },
        });
    }
    async failPayment(paymentId) {
        const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        await this.prisma.paymentTransaction.create({
            data: {
                paymentId,
                transactionCode: this.generateTransactionCode(),
                type: client_1.TransactionType.PAYMENT,
                status: client_1.TransactionStatus.FAILED,
                amount: payment.amount,
            },
        });
        return this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: client_1.PaymentStatus.FAILED },
        });
    }
    async getStatus(paymentId) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: { transactions: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        return payment;
    }
    async findByOrder(orderId) {
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
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vietqr_service_1.VietqrService,
        email_service_1.EmailService,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map