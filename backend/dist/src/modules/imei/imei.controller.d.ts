import { ImeiService } from './imei.service';
import { CreateImeiDto, UpdateImeiStatusDto, ImportImeiDto } from './dto/imei.dto';
import { ImeiStatus } from '@prisma/client';
export declare class ImeiController {
    private readonly imeiService;
    constructor(imeiService: ImeiService);
    findAll(variantId?: string, status?: ImeiStatus): Promise<({
        variant: {
            product: {
                id: string;
                name: string;
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
    } & {
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
    })[]>;
    searchByImei(imei: string): Promise<{
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
        status: import("@prisma/client").$Enums.ImeiStatus;
        updatedAt: Date;
        variantId: string;
        imei: string;
        imei2: string | null;
        serialNumber: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
        soldAt: Date | null;
    }>;
    checkAvailability(imei: string): Promise<{
        imei: string;
        status: import("@prisma/client").$Enums.ImeiStatus;
        available: boolean;
    }>;
    validate(imei: string): Promise<{
        imei: string;
        valid: boolean;
    }>;
    findOne(id: string): Promise<{
        variant: {
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
        status: import("@prisma/client").$Enums.ImeiStatus;
        updatedAt: Date;
        variantId: string;
        imei: string;
        imei2: string | null;
        serialNumber: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
        soldAt: Date | null;
    }>;
    add(dto: CreateImeiDto): Promise<{
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
    }>;
    import(dto: ImportImeiDto): Promise<{
        imported: number;
        total: number;
    }>;
    reserve(id: string): Promise<{
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
    }>;
    markSold(id: string): Promise<{
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
    }>;
    returnDevice(id: string): Promise<{
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
    }>;
    block(id: string): Promise<{
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
    }>;
    warranty(id: string): Promise<{
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
    }>;
    updateStatus(id: string, dto: UpdateImeiStatusDto): Promise<{
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
    }>;
}
