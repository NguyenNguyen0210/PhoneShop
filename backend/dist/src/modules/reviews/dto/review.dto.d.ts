export declare class CreateReviewDto {
    productId: string;
    rating: number;
    title?: string;
    content?: string;
}
export declare class UpdateReviewDto {
    rating?: number;
    title?: string;
    content?: string;
}
export declare class ModerateReviewDto {
    adminNote?: string;
}
