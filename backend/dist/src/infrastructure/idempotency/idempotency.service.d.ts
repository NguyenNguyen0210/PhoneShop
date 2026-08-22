import { PrismaService } from '../../prisma/prisma.service';
import { IdempotencyRecord } from '@prisma/client';
export declare class IdempotencyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRecord(key: string): Promise<IdempotencyRecord | null>;
    createRecord(key: string, userId: string | null, endpoint: string): Promise<IdempotencyRecord>;
    updateRecord(key: string, responseStatus: number, responseBody: any): Promise<IdempotencyRecord>;
}
