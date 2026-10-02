import { ShippingService } from './shipping.service';
import { CreateShippingDto, UpdateShippingStatusDto } from './dto/shipping.dto';
export declare class ShippingController {
    private readonly shippingService;
    constructor(shippingService: ShippingService);
    create(dto: CreateShippingDto): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ShippingStatus;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        trackingNumber: string | null;
        providerName: string;
        estimatedDeliveryDate: Date | null;
    }>;
    findAll(): Promise<({
        order: {
            userId: string;
            orderNumber: string;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ShippingStatus;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        trackingNumber: string | null;
        providerName: string;
        estimatedDeliveryDate: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ShippingStatus;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        trackingNumber: string | null;
        providerName: string;
        estimatedDeliveryDate: Date | null;
    }>;
    findByOrder(orderId: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ShippingStatus;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        trackingNumber: string | null;
        providerName: string;
        estimatedDeliveryDate: Date | null;
    }>;
    updateStatus(id: string, dto: UpdateShippingStatusDto): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ShippingStatus;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        trackingNumber: string | null;
        providerName: string;
        estimatedDeliveryDate: Date | null;
    }>;
}
