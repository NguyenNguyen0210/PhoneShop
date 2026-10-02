import { PrismaService } from '../../prisma/prisma.service';
import { AdjustStockDto, SetReorderLevelDto, ReserveStockDto } from './dto/inventory.dto';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    private getInventory;
    findAll(): Promise<({
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
        updatedAt: Date;
        variantId: string;
        quantity: number;
        reservedQty: number;
        availableQty: number;
        reorderLevel: number;
    })[]>;
    findOne(variantId: string): Promise<{
        id: string;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        reservedQty: number;
        availableQty: number;
        reorderLevel: number;
    }>;
    checkStock(variantId: string): Promise<{
        variantId: string;
        availableQty: number;
        reservedQty: number;
        inStock: boolean;
    }>;
    getLowStockAlerts(threshold?: number): Promise<({
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
        updatedAt: Date;
        variantId: string;
        quantity: number;
        reservedQty: number;
        availableQty: number;
        reorderLevel: number;
    })[]>;
    adjustStock(variantId: string, dto: AdjustStockDto): Promise<{
        id: string;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        reservedQty: number;
        availableQty: number;
        reorderLevel: number;
    }>;
    reserveStock(variantId: string, dto: ReserveStockDto): Promise<{
        id: string;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        reservedQty: number;
        availableQty: number;
        reorderLevel: number;
    }>;
    releaseStock(variantId: string, dto: ReserveStockDto): Promise<{
        id: string;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        reservedQty: number;
        availableQty: number;
        reorderLevel: number;
    }>;
    setReorderLevel(variantId: string, dto: SetReorderLevelDto): Promise<{
        id: string;
        updatedAt: Date;
        variantId: string;
        quantity: number;
        reservedQty: number;
        availableQty: number;
        reorderLevel: number;
    }>;
}
