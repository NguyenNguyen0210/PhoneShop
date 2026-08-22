import { ShippingService } from './shipping.service';
import { CreateShippingDto, UpdateShippingStatusDto } from './dto/shipping.dto';
export declare class ShippingController {
    private readonly shippingService;
    constructor(shippingService: ShippingService);
    create(dto: CreateShippingDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ShippingStatus;
        createdAt: Date;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        providerName: string;
        trackingNumber: string | null;
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
        status: import("@prisma/client").$Enums.ShippingStatus;
        createdAt: Date;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        providerName: string;
        trackingNumber: string | null;
        estimatedDeliveryDate: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ShippingStatus;
        createdAt: Date;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        providerName: string;
        trackingNumber: string | null;
        estimatedDeliveryDate: Date | null;
    }>;
    findByOrder(orderId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ShippingStatus;
        createdAt: Date;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        providerName: string;
        trackingNumber: string | null;
        estimatedDeliveryDate: Date | null;
    }>;
    updateStatus(id: string, dto: UpdateShippingStatusDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ShippingStatus;
        createdAt: Date;
        updatedAt: Date;
        shippingFee: import("@prisma/client-runtime-utils").Decimal;
        shippedAt: Date | null;
        deliveredAt: Date | null;
        orderId: string;
        providerName: string;
        trackingNumber: string | null;
        estimatedDeliveryDate: Date | null;
    }>;
}
