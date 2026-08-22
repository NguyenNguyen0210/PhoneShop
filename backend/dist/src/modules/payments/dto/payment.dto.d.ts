import { PaymentMethod } from '@prisma/client';
export declare class CreatePaymentDto {
    orderId: string;
    method: PaymentMethod;
}
export declare class PaymentCallbackDto {
    provider: string;
    data: any;
}
