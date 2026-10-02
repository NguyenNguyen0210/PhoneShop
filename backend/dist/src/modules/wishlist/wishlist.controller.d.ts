import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/wishlist.dto';
export declare class WishlistController {
    private readonly wishlistService;
    constructor(wishlistService: WishlistService);
    getWishlist(user: any): Promise<{
        items: ({
            product: {
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
    addProduct(user: any, dto: AddToWishlistDto): Promise<{
        product: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        productId: string;
        wishlistId: string;
    }>;
    removeProduct(user: any, productId: string): Promise<{
        id: string;
        createdAt: Date;
        productId: string;
        wishlistId: string;
    }>;
    clearWishlist(user: any): Promise<{
        success: boolean;
    }>;
    checkProduct(user: any, productId: string): Promise<{
        inWishlist: boolean;
    }>;
    moveToCart(user: any, productId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
