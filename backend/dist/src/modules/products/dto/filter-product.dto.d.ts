import { ProductCondition, ProductStatus } from '@prisma/client';
export declare class FilterProductDto {
    search?: string;
    brandId?: string;
    categoryId?: string;
    status?: ProductStatus;
    condition?: ProductCondition;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
