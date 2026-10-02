import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAllPublic(): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }[]>;
    getTreePublic(): Promise<({
        children: ({
            children: ({
                children: {
                    id: string;
                    name: string;
                    description: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    slug: string;
                    isActive: boolean;
                    parentId: string | null;
                    imageUrl: string | null;
                    sortOrder: number;
                }[];
            } & {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                isActive: boolean;
                parentId: string | null;
                imageUrl: string | null;
                sortOrder: number;
            })[];
        } & {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            isActive: boolean;
            parentId: string | null;
            imageUrl: string | null;
            sortOrder: number;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    })[]>;
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
        children: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            isActive: boolean;
            parentId: string | null;
            imageUrl: string | null;
            sortOrder: number;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }>;
    create(dto: CreateCategoryDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }>;
    findAllAdmin(): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }[]>;
    getTreeAdmin(): Promise<({
        children: ({
            children: ({
                children: {
                    id: string;
                    name: string;
                    description: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    slug: string;
                    isActive: boolean;
                    parentId: string | null;
                    imageUrl: string | null;
                    sortOrder: number;
                }[];
            } & {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                isActive: boolean;
                parentId: string | null;
                imageUrl: string | null;
                sortOrder: number;
            })[];
        } & {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            isActive: boolean;
            parentId: string | null;
            imageUrl: string | null;
            sortOrder: number;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    })[]>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        isActive: boolean;
        parentId: string | null;
        imageUrl: string | null;
        sortOrder: number;
    }>;
}
