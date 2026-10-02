import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarrantyDto, ClaimWarrantyDto } from './dto/warranty.dto';
export declare class WarrantyService {
    private prisma;
    constructor(prisma: PrismaService);
    private generateWarrantyCode;
    create(dto: CreateWarrantyDto): Promise<{
        productVariant: {
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
        orderItem: {
            id: string;
            createdAt: Date;
            sku: string;
            variantId: string;
            quantity: number;
            discountAmount: import("@prisma/client-runtime-utils").Decimal;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            productName: string;
            totalPrice: import("@prisma/client-runtime-utils").Decimal;
            imeiDeviceId: string | null;
            orderId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.WarrantyStatus;
        updatedAt: Date;
        userId: string;
        imeiDeviceId: string | null;
        orderItemId: string;
        warrantyCode: string;
        productVariantId: string;
        startDate: Date;
        endDate: Date;
        notes: string | null;
    }>;
    findAll(userId?: string): Promise<({
        productVariant: {
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
        imeiDevice: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.ImeiStatus;
            updatedAt: Date;
            variantId: string;
            imei: string;
            imei2: string | null;
            serialNumber: string | null;
            purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
            soldAt: Date | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.WarrantyStatus;
        updatedAt: Date;
        userId: string;
        imeiDeviceId: string | null;
        orderItemId: string;
        warrantyCode: string;
        productVariantId: string;
        startDate: Date;
        endDate: Date;
        notes: string | null;
    })[]>;
    findOne(id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        productVariant: {
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
        orderItem: {
            id: string;
            createdAt: Date;
            sku: string;
            variantId: string;
            quantity: number;
            discountAmount: import("@prisma/client-runtime-utils").Decimal;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            productName: string;
            totalPrice: import("@prisma/client-runtime-utils").Decimal;
            imeiDeviceId: string | null;
            orderId: string;
        };
        imeiDevice: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.ImeiStatus;
            updatedAt: Date;
            variantId: string;
            imei: string;
            imei2: string | null;
            serialNumber: string | null;
            purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
            soldAt: Date | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.WarrantyStatus;
        updatedAt: Date;
        userId: string;
        imeiDeviceId: string | null;
        orderItemId: string;
        warrantyCode: string;
        productVariantId: string;
        startDate: Date;
        endDate: Date;
        notes: string | null;
    }>;
    searchByCode(warrantyCode: string): Promise<{
        productVariant: {
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
        imeiDevice: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.ImeiStatus;
            updatedAt: Date;
            variantId: string;
            imei: string;
            imei2: string | null;
            serialNumber: string | null;
            purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
            soldAt: Date | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.WarrantyStatus;
        updatedAt: Date;
        userId: string;
        imeiDeviceId: string | null;
        orderItemId: string;
        warrantyCode: string;
        productVariantId: string;
        startDate: Date;
        endDate: Date;
        notes: string | null;
    }>;
    checkStatus(warrantyCode: string): Promise<{
        warrantyCode: string;
        status: import("@prisma/client").$Enums.WarrantyStatus;
        startDate: Date;
        endDate: Date;
        isExpired: boolean;
        daysRemaining: number;
    }>;
    claimWarranty(userId: string, id: string, dto: ClaimWarrantyDto): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.WarrantyStatus;
        updatedAt: Date;
        userId: string;
        imeiDeviceId: string | null;
        orderItemId: string;
        warrantyCode: string;
        productVariantId: string;
        startDate: Date;
        endDate: Date;
        notes: string | null;
    }>;
    voidWarranty(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.WarrantyStatus;
        updatedAt: Date;
        userId: string;
        imeiDeviceId: string | null;
        orderItemId: string;
        warrantyCode: string;
        productVariantId: string;
        startDate: Date;
        endDate: Date;
        notes: string | null;
    }>;
    getUserWarranties(userId: string): Promise<({
        productVariant: {
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
        imeiDevice: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.ImeiStatus;
            updatedAt: Date;
            variantId: string;
            imei: string;
            imei2: string | null;
            serialNumber: string | null;
            purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
            soldAt: Date | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.WarrantyStatus;
        updatedAt: Date;
        userId: string;
        imeiDeviceId: string | null;
        orderItemId: string;
        warrantyCode: string;
        productVariantId: string;
        startDate: Date;
        endDate: Date;
        notes: string | null;
    })[]>;
}
