import { ImeiStatus } from '@prisma/client';
export declare class CreateImeiDto {
    variantId: string;
    imei: string;
    imei2?: string;
    serialNumber?: string;
    purchasePrice?: number;
}
export declare class UpdateImeiStatusDto {
    status: ImeiStatus;
}
export declare class ImportImeiDto {
    items: CreateImeiDto[];
}
