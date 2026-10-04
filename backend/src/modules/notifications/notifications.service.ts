import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto, BroadcastNotificationDto } from './dto/notification.dto';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { getPagination, buildPaginatedResponse } from '../../common/utils/pagination.util';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // AUDIT: strip <script> payloads — notification bodies are rendered in
  // webviews/clients that may interpret HTML, so stored XSS via a crafted
  // title/message must not survive persistence.
  private sanitize(text: string | undefined): string | undefined {
    if (typeof text !== 'string') return text;
    return text.replace(/<script.*?>.*?<\/script>/gi, '');
  }

  async create(dto: CreateNotificationDto) {
    // AUDIT: fail loudly on unknown recipients instead of writing orphan
    // rows (userId has no FK constraint at the DB layer).
    const target = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true } });
    if (!target) throw new NotFoundException(`User ${dto.userId} not found`);
    return this.prisma.notification.create({
      data: { ...dto, title: this.sanitize(dto.title) ?? dto.title, message: this.sanitize(dto.message) ?? dto.message },
    });
  }

  // Utility method called by other services (e.g., OrdersService, PaymentsService)
  async sendToUser(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
    channel: NotificationChannel = NotificationChannel.IN_APP,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title: this.sanitize(title) ?? title, message: this.sanitize(message) ?? message, data, channel },
    });
  }

  async getMyNotifications(
    userId: string,
    page: number | string = 1,
    limit: number | string = 20,
    type?: NotificationType,
    isRead?: string,
  ) {
    const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit, 20);

    const where: any = { userId };
    if (type) {
      where.type = type;
    }
    if (isRead !== undefined && isRead !== '') {
      where.isRead = isRead === 'true';
    }

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);
    return buildPaginatedResponse(data, total, safePage, safeLimit);
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async deleteMyNotification(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  async sendSystemNotification(dto: BroadcastNotificationDto) {
    // M13: chunk the fan-out — one giant createMany breaks at scale
    // (statement size, lock time, gateway timeout) and misreports on partial
    // failure. 1k rows per batch keeps every statement small.
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    const CHUNK_SIZE = 1000;
    let inserted = 0;
    const safeTitle = this.sanitize(dto.title) ?? dto.title;
    const safeMessage = this.sanitize(dto.message) ?? dto.message;
    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
      const chunk = users.slice(i, i + CHUNK_SIZE);
      const res = await this.prisma.notification.createMany({
        data: chunk.map((user) => ({
          userId: user.id,
          type: dto.type,
          title: safeTitle,
          message: safeMessage,
          channel: NotificationChannel.IN_APP,
        })),
      });
      inserted += res.count;
    }

    return { sent: inserted };
  }

  async findAll(page?: number | string, limit?: number | string) {
    const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit, 20);
    const [total, data] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.findMany({
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);
    return buildPaginatedResponse(data, total, safePage, safeLimit);
  }
}
