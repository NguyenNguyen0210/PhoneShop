import { AddressType } from '@prisma/client';
export declare class CreateAddressDto {
    type?: AddressType;
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    ward?: string;
    district?: string;
    city: string;
    province?: string;
    postalCode?: string;
    country?: string;
    isDefault?: boolean;
}
