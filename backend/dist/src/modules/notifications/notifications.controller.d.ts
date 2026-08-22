import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, BroadcastNotificationDto } from './dto/notification.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getMyNotifications(user: any): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }[]>;
    getUnreadCount(user: any): Promise<{
        unreadCount: number;
    }>;
    markRead(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    markAllRead(user: any): Promise<{
        success: boolean;
    }>;
    findAll(): Promise<({
        user: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    })[]>;
    create(dto: CreateNotificationDto): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/client").JsonValue | null;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        channel: import("@prisma/client").$Enums.NotificationChannel;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    broadcast(dto: BroadcastNotificationDto): Promise<{
        sent: number;
    }>;
}
