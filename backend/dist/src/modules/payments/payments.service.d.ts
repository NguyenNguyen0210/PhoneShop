import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { VietqrService } from './vietqr.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { CreatePaymentDto, CreateVnpayUrlDto, PaymentCallbackDto } from './dto/payment.dto';
export declare class PaymentsService {
    private readonly prisma;
    private readonly vietqrService;
    private readonly emailService;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, vietqrService: VietqrService, emailService: EmailService, configService: ConfigService);
    private generateTransactionCode;
    generateVietQr(orderId: string, userId?: string): Promise<{
        qrUrl: string;
        bankId: string;
        accountNo: string;
        accountName: string;
        amount: number;
        orderNumber: string;
        paymentId: string;
        orderId: string;
    }>;
    createVnpayPaymentUrl(dto: CreateVnpayUrlDto, clientIp?: string): Promise<{
        paymentUrl: string;
        orderNumber: string;
        amount: number;
    }>;
    handleVnpayIpn(query: Record<string, any>): Promise<{
        RspCode: string;
        Message: string;
    }>;
    handleVnpayReturn(query: Record<string, any>): Promise<{
        success: boolean;
        isValid: boolean;
        orderNumber: any;
        amount: number;
        responseCode: any;
        transactionNo: any;
        message: string;
    }>;
    create(userId: string, dto: CreatePaymentDto): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        updatedAt: Date;
        orderId: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client-runtime-utils").Decimal;
        provider: string | null;
        providerOrderId: string | null;
        paidAt: Date | null;
    }>;
    handleCallback(dto: PaymentCallbackDto): Promise<{
        received: boolean;
        provider: string;
    }>;
    confirmPayment(paymentId: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        updatedAt: Date;
        orderId: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client-runtime-utils").Decimal;
        provider: string | null;
        providerOrderId: string | null;
        paidAt: Date | null;
    }>;
    failPayment(paymentId: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        updatedAt: Date;
        orderId: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client-runtime-utils").Decimal;
        provider: string | null;
        providerOrderId: string | null;
        paidAt: Date | null;
    }>;
    getStatus(paymentId: string): Promise<{
        transactions: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.TransactionStatus;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TransactionType;
            amount: import("@prisma/client-runtime-utils").Decimal;
            transactionCode: string;
            paymentId: string;
            providerReference: string | null;
            responseData: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        updatedAt: Date;
        orderId: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client-runtime-utils").Decimal;
        provider: string | null;
        providerOrderId: string | null;
        paidAt: Date | null;
    }>;
    findByOrder(orderId: string): Promise<({
        transactions: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.TransactionStatus;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TransactionType;
            amount: import("@prisma/client-runtime-utils").Decimal;
            transactionCode: string;
            paymentId: string;
            providerReference: string | null;
            responseData: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        updatedAt: Date;
        orderId: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client-runtime-utils").Decimal;
        provider: string | null;
        providerOrderId: string | null;
        paidAt: Date | null;
    })[]>;
    findAll(): Promise<({
        order: {
            id: string;
            userId: string;
            orderNumber: string;
        };
        transactions: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.TransactionStatus;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TransactionType;
            amount: import("@prisma/client-runtime-utils").Decimal;
            transactionCode: string;
            paymentId: string;
            providerReference: string | null;
            responseData: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        updatedAt: Date;
        orderId: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client-runtime-utils").Decimal;
        provider: string | null;
        providerOrderId: string | null;
        paidAt: Date | null;
    })[]>;
    getTransactionHistory(): Promise<({
        payment: {
            order: {
                id: string;
                userId: string;
                orderNumber: string;
            };
        } & {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            updatedAt: Date;
            orderId: string;
            method: import("@prisma/client").$Enums.PaymentMethod;
            amount: import("@prisma/client-runtime-utils").Decimal;
            provider: string | null;
            providerOrderId: string | null;
            paidAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.TransactionStatus;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.TransactionType;
        amount: import("@prisma/client-runtime-utils").Decimal;
        transactionCode: string;
        paymentId: string;
        providerReference: string | null;
        responseData: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
}
