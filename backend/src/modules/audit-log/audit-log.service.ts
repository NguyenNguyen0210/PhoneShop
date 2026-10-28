import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterAuditLogDto } from './dto/filter-audit-log.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: FilterAuditLogDto) {
    const { action, search, page = 1, limit = 20 } = filter;
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { entity: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    if (!log) throw new NotFoundException(`Audit log ${id} not found`);
    return log;
  }

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalLogs, todayLogs, sensitiveOperations, activeOperatorsRows] = await Promise.all([
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
      // AUDIT: distinct operators active in the last 24h (null userId =
      // system actions — excluded so the count reflects human operators).
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: last24h }, NOT: { userId: null } },
      }),
    ]);

    return {
      totalLogs,
      todayLogs,
      sensitiveOperations,
      activeOperators: activeOperatorsRows.length,
    };
  }
}
