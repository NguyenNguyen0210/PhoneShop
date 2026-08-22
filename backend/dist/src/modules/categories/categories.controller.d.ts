import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAllPublic(): Promise<{
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
    getTreePublic(): Promise<({
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
    findAllAdmin(): Promise<{
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
    getTreeAdmin(): Promise<({
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
