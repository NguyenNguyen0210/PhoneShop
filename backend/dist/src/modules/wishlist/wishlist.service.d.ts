import { PrismaService } from '../../prisma/prisma.service';
import { AddToWishlistDto } from './dto/wishlist.dto';
export declare class WishlistService {
    private prisma;
    constructor(prisma: PrismaService);
    private getOrCreateWishlist;
    getWishlist(userId: string): Promise<{
        items: ({
            product: {
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
            };
        } & {
            id: string;
            createdAt: Date;
            productId: string;
            wishlistId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    addProduct(userId: string, dto: AddToWishlistDto): Promise<{
        product: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        productId: string;
        wishlistId: string;
    }>;
    removeProduct(userId: string, productId: string): Promise<{
        id: string;
        createdAt: Date;
        productId: string;
        wishlistId: string;
    }>;
    clearWishlist(userId: string): Promise<{
        success: boolean;
    }>;
    checkProduct(userId: string, productId: string): Promise<{
        inWishlist: boolean;
    }>;
    moveToCart(userId: string, productId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
