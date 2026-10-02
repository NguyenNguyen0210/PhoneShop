import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
export declare class BrandsController {
    private readonly brandsService;
    constructor(brandsService: BrandsService);
    findAllPublic(search?: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }[]>;
    findOne(id: string): Promise<{
        products: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            status: import("@prisma/client").$Enums.ProductStatus;
            updatedAt: Date;
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
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    create(dto: CreateBrandDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    findAllAdmin(search?: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }[]>;
    update(id: string, dto: UpdateBrandDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    activate(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
    deactivate(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        websiteUrl: string | null;
        isActive: boolean;
    }>;
}
