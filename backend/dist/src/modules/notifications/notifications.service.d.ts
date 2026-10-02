import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto, BroadcastNotificationDto } from './dto/notification.dto';
import { NotificationChannel, NotificationType } from '@prisma/client';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateNotificationDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    sendToUser(userId: string, type: NotificationType, title: string, message: string, data?: any, channel?: NotificationChannel): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    getMyNotifications(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }[]>;
    getUnreadCount(userId: string): Promise<{
        unreadCount: number;
    }>;
    markRead(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    markAllRead(userId: string): Promise<{
        success: boolean;
    }>;
    sendSystemNotification(dto: BroadcastNotificationDto): Promise<{
        sent: number;
    }>;
    findAll(): Promise<({
        user: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    })[]>;
}
