export declare class CreateOrderDto {
    addressId: string;
    voucherCode?: string;
    customerNote?: string;
}
export declare class CancelOrderDto {
    reason?: string;
}
export declare class UpdateOrderStatusDto {
    status: string;
}
