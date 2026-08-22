import { NotificationChannel, NotificationType } from '@prisma/client';
export declare class CreateNotificationDto {
    userId: string;
    type: NotificationType;
    channel?: NotificationChannel;
    title: string;
    message: string;
    data?: any;
}
export declare class BroadcastNotificationDto {
    type: NotificationType;
    title: string;
    message: string;
}
