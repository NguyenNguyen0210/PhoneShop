import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
export declare class BrandsController {
    private readonly brandsService;
    constructor(brandsService: BrandsService);
    findAllPublic(search?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }[]>;
    findOne(id: string): Promise<{
        products: {
            id: string;
            status: import("@prisma/client").$Enums.ProductStatus;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            slug: string;
            brandId: string;
            categoryId: string;
            shortDescription: string | null;
            condition: import("@prisma/client").$Enums.ProductCondition;
            thumbnailUrl: string | null;
            warrantyMonths: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    create(dto: CreateBrandDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    findAllAdmin(search?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }[]>;
    update(id: string, dto: UpdateBrandDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    activate(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    deactivate(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
}
