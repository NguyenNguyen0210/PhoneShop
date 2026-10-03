import { Controller, Get, Post, Body, Param, UseGuards, Put, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, BroadcastNotificationDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── ALL AUTHENTICATED USERS ───────────────────────────

  @Get('my')
  @ApiOperation({ summary: 'Get my notifications (paginated)' })
  getMyNotifications(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getMyNotifications(
      user.id,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }

  @Get('my/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Put('my/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Put('my/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Delete('my/:id')
  @ApiOperation({ summary: 'Delete my notification' })
  deleteMyNotification(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.deleteMyNotification(user.id, id);
  }

  // ── MANAGER / ADMIN ──────────────────────────────────

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all notifications (ADMIN)' })
  findAll() {
    return this.notificationsService.findAll();
  }

  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Send notification to a user (MANAGER/ADMIN)' })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Post('broadcast')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Broadcast system notification to all active users (MANAGER/ADMIN)' })
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.sendSystemNotification(dto);
  }
}
