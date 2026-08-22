export declare class CreateWarrantyDto {
    userId: string;
    productVariantId: string;
    orderItemId: string;
    imeiDeviceId?: string;
    startDate: string;
    endDate: string;
    notes?: string;
}
export declare class ClaimWarrantyDto {
    reason: string;
}
