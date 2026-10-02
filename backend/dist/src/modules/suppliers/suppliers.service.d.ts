import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
export declare class SuppliersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateSupplierDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        email: string | null;
        phone: string | null;
        updatedAt: Date;
        isActive: boolean;
        address: string | null;
        contactName: string | null;
        taxCode: string | null;
    }>;
    findAll(activeOnly?: boolean): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        email: string | null;
        phone: string | null;
        updatedAt: Date;
        isActive: boolean;
        address: string | null;
        contactName: string | null;
        taxCode: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        email: string | null;
        phone: string | null;
        updatedAt: Date;
        isActive: boolean;
        address: string | null;
        contactName: string | null;
        taxCode: string | null;
    }>;
    update(id: string, dto: UpdateSupplierDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        email: string | null;
        phone: string | null;
        updatedAt: Date;
        isActive: boolean;
        address: string | null;
        contactName: string | null;
        taxCode: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        email: string | null;
        phone: string | null;
        updatedAt: Date;
        isActive: boolean;
        address: string | null;
        contactName: string | null;
        taxCode: string | null;
    }>;
}
