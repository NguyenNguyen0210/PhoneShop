import { AuditAction } from '@prisma/client';
export declare class FilterAuditLogDto {
    action?: AuditAction;
    entity?: string;
    userId?: string;
    page?: number;
    limit?: number;
}
