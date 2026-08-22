import { VoucherType } from '@prisma/client';
export declare class CreateVoucherDto {
    code: string;
    name: string;
    description?: string;
    type: VoucherType;
    value: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    perUserLimit?: number;
    startAt: string;
    endAt: string;
    isActive?: boolean;
}
export declare class ValidateVoucherDto {
    code: string;
    orderTotal: number;
}
