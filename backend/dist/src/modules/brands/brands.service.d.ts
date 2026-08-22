import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
export declare class BrandsService {
    private prisma;
    constructor(prisma: PrismaService);
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
    findAll(search?: string, activeOnly?: boolean): Promise<{
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
    changeStatus(id: string, isActive: boolean): Promise<{
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
