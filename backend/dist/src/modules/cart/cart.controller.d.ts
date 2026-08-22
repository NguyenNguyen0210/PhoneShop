import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    getCart(user: any): Promise<{
        subtotal: number;
        items: ({
            variant: {
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
                inventory: {
                    id: string;
                    updatedAt: Date;
                    variantId: string;
                    quantity: number;
                    reservedQty: number;
                    availableQty: number;
                    reorderLevel: number;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                isActive: boolean;
                imageUrl: string | null;
                sku: string;
                productId: string;
                color: string | null;
                storage: string | null;
                ram: string | null;
                price: import("@prisma/client-runtime-utils").Decimal;
                compareAtPrice: import("@prisma/client-runtime-utils").Decimal | null;
                costPrice: import("@prisma/client-runtime-utils").Decimal | null;
                weight: import("@prisma/client-runtime-utils").Decimal | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            variantId: string;
            quantity: number;
            cartId: string;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
        })[];
        id: string;
        status: import("@prisma/client").$Enums.CartStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    addItem(user: any, dto: AddCartItemDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        cartId: string;
        unitPrice: import("@prisma/client-runtime-utils").Decimal;
    }>;
    updateItem(user: any, itemId: string, dto: UpdateCartItemDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        cartId: string;
        unitPrice: import("@prisma/client-runtime-utils").Decimal;
    }>;
    removeItem(user: any, itemId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        cartId: string;
        unitPrice: import("@prisma/client-runtime-utils").Decimal;
    }>;
    clearCart(user: any): Promise<{
        success: boolean;
    }>;
    validateCart(user: any): Promise<{
        valid: boolean;
        issues: string[];
        cart: {
            items: ({
                variant: {
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
                    inventory: {
                        id: string;
                        updatedAt: Date;
                        variantId: string;
                        quantity: number;
                        reservedQty: number;
                        availableQty: number;
                        reorderLevel: number;
                    } | null;
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    isActive: boolean;
                    imageUrl: string | null;
                    sku: string;
                    productId: string;
                    color: string | null;
                    storage: string | null;
                    ram: string | null;
                    price: import("@prisma/client-runtime-utils").Decimal;
                    compareAtPrice: import("@prisma/client-runtime-utils").Decimal | null;
                    costPrice: import("@prisma/client-runtime-utils").Decimal | null;
                    weight: import("@prisma/client-runtime-utils").Decimal | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                variantId: string;
                quantity: number;
                cartId: string;
                unitPrice: import("@prisma/client-runtime-utils").Decimal;
            })[];
        } & {
            id: string;
            status: import("@prisma/client").$Enums.CartStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
        };
    }>;
}
