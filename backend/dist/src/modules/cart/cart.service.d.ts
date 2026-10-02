import { PrismaService } from '../../prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
export declare class CartService {
    private prisma;
    constructor(prisma: PrismaService);
    private getOrCreateCart;
    getCart(userId: string): Promise<{
        subtotal: number;
        items: ({
            variant: {
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
                name: string;
                createdAt: Date;
                updatedAt: Date;
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
        createdAt: Date;
        status: import("@prisma/client").$Enums.CartStatus;
        updatedAt: Date;
        userId: string;
    }>;
    addItem(userId: string, dto: AddCartItemDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        cartId: string;
        unitPrice: import("@prisma/client-runtime-utils").Decimal;
    }>;
    updateItem(userId: string, itemId: string, dto: UpdateCartItemDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        cartId: string;
        unitPrice: import("@prisma/client-runtime-utils").Decimal;
    }>;
    removeItem(userId: string, itemId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        cartId: string;
        unitPrice: import("@prisma/client-runtime-utils").Decimal;
    }>;
    clearCart(userId: string): Promise<{
        success: boolean;
    }>;
    validateCart(userId: string): Promise<{
        valid: boolean;
        issues: string[];
        cart: {
            items: ({
                variant: {
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
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
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
            createdAt: Date;
            status: import("@prisma/client").$Enums.CartStatus;
            updatedAt: Date;
            userId: string;
        };
    }>;
}
