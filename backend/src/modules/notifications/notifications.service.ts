import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto, BroadcastNotificationDto } from './dto/notification.dto';
import { NotificationChannel, NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({ data: dto });
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
      data: { userId, type, title, message, data, channel },
    });
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
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

  async sendSystemNotification(dto: BroadcastNotificationDto) {
    // Get all active users
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        channel: NotificationChannel.IN_APP,
      })),
    });

    return { sent: users.length };
  }

  async findAll() {
    return this.prisma.notification.findMany({
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
