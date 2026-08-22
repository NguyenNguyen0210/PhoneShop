import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IdempotencyRecord } from '@prisma/client';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecord(key: string): Promise<IdempotencyRecord | null> {
    return this.prisma.idempotencyRecord.findUnique({
      where: { key },
    });
  }

  async createRecord(key: string, userId: string | null, endpoint: string): Promise<IdempotencyRecord> {
    // Expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    return this.prisma.idempotencyRecord.create({
      data: {
        key,
        userId,
        endpoint,
        expiresAt,
      },
    });
  }

  async updateRecord(key: string, responseStatus: number, responseBody: any): Promise<IdempotencyRecord> {
    return this.prisma.idempotencyRecord.update({
      where: { key },
      data: {
        responseStatus,
        responseBody,
      },
    });
  }
}
