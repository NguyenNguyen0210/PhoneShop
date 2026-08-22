import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    create(dto: CreateSupplierDto): Promise<{
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        address: string | null;
        isActive: boolean;
        contactName: string | null;
        taxCode: string | null;
    }>;
    findAll(activeOnly?: string): Promise<{
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        address: string | null;
        isActive: boolean;
        contactName: string | null;
        taxCode: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        address: string | null;
        isActive: boolean;
        contactName: string | null;
        taxCode: string | null;
    }>;
    update(id: string, dto: UpdateSupplierDto): Promise<{
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        address: string | null;
        isActive: boolean;
        contactName: string | null;
        taxCode: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        address: string | null;
        isActive: boolean;
        contactName: string | null;
        taxCode: string | null;
    }>;
}
