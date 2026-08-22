export declare class ReturnItemDto {
    orderItemId: string;
    quantity: number;
    reason?: string;
    condition?: string;
}
export declare class CreateReturnDto {
    orderId: string;
    reason: string;
    customerNote?: string;
    items: ReturnItemDto[];
}
export declare class AdminNoteDto {
    adminNote?: string;
}
export declare class CreateRefundDto {
    returnId: string;
    amount: number;
    reason?: string;
}
