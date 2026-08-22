export declare class CreateSupplierDto {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxCode?: string;
}
declare const UpdateSupplierDto_base: import("@nestjs/common").Type<Partial<CreateSupplierDto>>;
export declare class UpdateSupplierDto extends UpdateSupplierDto_base {
    isActive?: boolean;
}
export {};
