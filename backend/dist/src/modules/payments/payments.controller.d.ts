import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PaymentCallbackDto } from './dto/payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
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
            type: import("@prisma/client").$Enums.TransactionType;
            amount: import("@prisma/client-runtime-utils").Decimal;
            transactionCode: string;
            paymentId: string;
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
            type: import("@prisma/client").$Enums.TransactionType;
            amount: import("@prisma/client-runtime-utils").Decimal;
            transactionCode: string;
            paymentId: string;
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
            userId: string;
            orderNumber: string;
        };
        transactions: {
            id: string;
            status: import("@prisma/client").$Enums.TransactionStatus;
            createdAt: Date;
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
                status: import("@prisma/client").$Enums.OrderStatus;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                orderNumber: string;
                addressId: string | null;
                subtotal: import("@prisma/client-runtime-utils").Decimal;
                discountAmount: import("@prisma/client-runtime-utils").Decimal;
                shippingFee: import("@prisma/client-runtime-utils").Decimal;
                taxAmount: import("@prisma/client-runtime-utils").Decimal;
                totalAmount: import("@prisma/client-runtime-utils").Decimal;
                voucherCode: string | null;
                customerNote: string | null;
                cancelledReason: string | null;
                confirmedAt: Date | null;
                shippedAt: Date | null;
                deliveredAt: Date | null;
                completedAt: Date | null;
                cancelledAt: Date | null;
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
        type: import("@prisma/client").$Enums.TransactionType;
        amount: import("@prisma/client-runtime-utils").Decimal;
        transactionCode: string;
        paymentId: string;
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
