import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterAuditLogDto } from './dto/filter-audit-log.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: FilterAuditLogDto) {
    const { action, entity, entityId, userId, startDate, endDate, search, page = 1, limit = 50 } = filter;
    const where: any = {};

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;

    if (userId) {
      where.OR = [{ userId }, { entity: 'User', entityId: userId }];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      const searchConditions: any[] = [
        { entity: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, sensitiveOperations] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: {
            in: [AuditAction.CHANGE_ROLE, AuditAction.CANCEL_ORDER, AuditAction.DELETE],
          },
        },
      }),
    ]);

    return {
      totalLogs,
      todayLogs,
      sensitiveOperations,
    };
  }
}
