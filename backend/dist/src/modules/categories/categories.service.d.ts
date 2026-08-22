import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }>;
    findAll(activeOnly?: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }[]>;
    getTree(activeOnly?: boolean): Promise<({
        children: ({
            children: ({
                children: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    description: string | null;
                    slug: string;
                    isActive: boolean;
                    parentId: string | null;
                    imageUrl: string | null;
                    sortOrder: number;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                slug: string;
                isActive: boolean;
                parentId: string | null;
                imageUrl: string | null;
                sortOrder: number;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            slug: string;
            isActive: boolean;
            parentId: string | null;
            imageUrl: string | null;
            sortOrder: number;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    })[]>;
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
        children: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            slug: string;
            isActive: boolean;
            parentId: string | null;
            imageUrl: string | null;
            sortOrder: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }>;
}
