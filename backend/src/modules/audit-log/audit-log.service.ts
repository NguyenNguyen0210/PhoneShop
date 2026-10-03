import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterAuditLogDto } from './dto/filter-audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: FilterAuditLogDto) {
    const { action, entity, entityId, userId, page = 1, limit = 50 } = filter;
    const where: any = {};
    if (action)   where.action = action;
    if (entity)   where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) {
      where.OR = [{ userId }, { entity: 'User', entityId: userId }];
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
      include: { user: { select: { id: true, email: true } } },
    });
  }
}
