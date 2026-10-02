import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, CreateVnpayUrlDto, PaymentCallbackDto } from './dto/payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    generateVietQr(orderId: string, user: any): Promise<{
        qrUrl: string;
        bankId: string;
        accountNo: string;
        accountName: string;
        amount: number;
        orderNumber: string;
        paymentId: string;
        orderId: string;
    }>;
    createVnpayUrl(dto: CreateVnpayUrlDto, req: Request): Promise<{
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
    create(user: any, dto: CreatePaymentDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
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
            status: import("@prisma/client").$Enums.TransactionStatus;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@prisma/client-runtime-utils").Decimal;
            paymentId: string;
            transactionCode: string;
            type: import("@prisma/client").$Enums.TransactionType;
            providerReference: string | null;
            responseData: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        orderId: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client-runtime-utils").Decimal;
        provider: string | null;
        providerOrderId: string | null;
        paidAt: Date | null;
    })[]>;
    getStatus(id: string): Promise<{
        transactions: {
            id: string;
            status: import("@prisma/client").$Enums.TransactionStatus;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@prisma/client-runtime-utils").Decimal;
            paymentId: string;
            transactionCode: string;
            type: import("@prisma/client").$Enums.TransactionType;
            providerReference: string | null;
            responseData: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
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
    findAll(): Promise<({
        order: {
            id: string;
            orderNumber: string;
            userId: string;
        };
        transactions: {
            id: string;
            status: import("@prisma/client").$Enums.TransactionStatus;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@prisma/client-runtime-utils").Decimal;
            paymentId: string;
            transactionCode: string;
            type: import("@prisma/client").$Enums.TransactionType;
            providerReference: string | null;
            responseData: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
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
                orderNumber: string;
                userId: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
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
        status: import("@prisma/client").$Enums.TransactionStatus;
        createdAt: Date;
        updatedAt: Date;
        amount: import("@prisma/client-runtime-utils").Decimal;
        paymentId: string;
        transactionCode: string;
        type: import("@prisma/client").$Enums.TransactionType;
        providerReference: string | null;
        responseData: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
    confirmPayment(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        orderId: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client-runtime-utils").Decimal;
        provider: string | null;
        providerOrderId: string | null;
        paidAt: Date | null;
    }>;
    failPayment(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        orderId: string;
        method: import("@prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client-runtime-utils").Decimal;
        provider: string | null;
        providerOrderId: string | null;
        paidAt: Date | null;
    }>;
}
