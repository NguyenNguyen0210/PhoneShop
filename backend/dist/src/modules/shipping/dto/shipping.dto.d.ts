export declare enum ShippingStatus {
    PENDING = "PENDING",
    READY_TO_SHIP = "READY_TO_SHIP",
    PICKED_UP = "PICKED_UP",
    IN_TRANSIT = "IN_TRANSIT",
    DELIVERED = "DELIVERED",
    FAILED = "FAILED",
    RETURNED = "RETURNED"
}
export declare class CreateShippingDto {
    orderId: string;
    providerName: string;
    trackingNumber?: string;
    shippingFee?: number;
    estimatedDeliveryDate?: string;
}
export declare class UpdateShippingStatusDto {
    status: ShippingStatus;
    trackingNumber?: string;
    estimatedDeliveryDate?: string;
}
declare const UpdateShippingDto_base: import("@nestjs/common").Type<Partial<CreateShippingDto>>;
export declare class UpdateShippingDto extends UpdateShippingDto_base {
}
export {};
