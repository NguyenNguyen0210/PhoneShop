import { ProductCondition, ProductStatus } from '@prisma/client';
export declare class CreateProductDto {
    brandId: string;
    categoryId: string;
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    condition?: ProductCondition;
    status?: ProductStatus;
    thumbnailUrl?: string;
    warrantyMonths?: number;
}
