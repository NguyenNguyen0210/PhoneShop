import { PaymentMethod } from '@prisma/client';
export declare class CreatePaymentDto {
    orderId: string;
    method: PaymentMethod;
}
export declare class CreateVnpayUrlDto {
    orderId: string;
    ipAddr?: string;
    bankCode?: string;
}
export declare class PaymentCallbackDto {
    provider: string;
    data: any;
}
