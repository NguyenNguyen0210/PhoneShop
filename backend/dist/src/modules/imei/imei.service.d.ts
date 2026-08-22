import { PrismaService } from '../../prisma/prisma.service';
import { CreateImeiDto, UpdateImeiStatusDto, ImportImeiDto } from './dto/imei.dto';
import { ImeiStatus } from '@prisma/client';
export declare class ImeiService {
    private prisma;
    constructor(prisma: PrismaService);
    add(dto: CreateImeiDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
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
    findAll(variantId?: string, status?: ImeiStatus): Promise<({
        variant: {
            product: {
                id: string;
                name: string;
            };
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
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        imei: string;
        imei2: string | null;
        serialNumber: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
        soldAt: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        variant: {
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
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        imei: string;
        imei2: string | null;
        serialNumber: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
        soldAt: Date | null;
    }>;
    searchByImei(imei: string): Promise<{
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
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
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
    validate(imei: string): Promise<boolean>;
    updateStatus(id: string, dto: UpdateImeiStatusDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        imei: string;
        imei2: string | null;
        serialNumber: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
        soldAt: Date | null;
    }>;
    reserve(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
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
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
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
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
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
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
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
        status: import("@prisma/client").$Enums.ImeiStatus;
        createdAt: Date;
        updatedAt: Date;
        variantId: string;
        imei: string;
        imei2: string | null;
        serialNumber: string | null;
        purchasePrice: import("@prisma/client-runtime-utils").Decimal | null;
        soldAt: Date | null;
    }>;
}
