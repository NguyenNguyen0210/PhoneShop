import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { TicketCategory, TicketPriority, TicketStatus, NotificationType } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generateTicketCode(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `TK-${yearMonth}-`;
    const count = await this.prisma.ticket.count({
      where: { code: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    const code = await this.generateTicketCode();

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          code,
          title: dto.title,
          category: dto.category || TicketCategory.ACCOUNT_GENERAL,
          priority: dto.priority || TicketPriority.MEDIUM,
          status: TicketStatus.OPEN,
          userId,
          orderId: dto.orderId || null,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: userId,
          message: dto.message,
          attachments: dto.attachments || [],
          isInternalNote: false,
        },
      });

      return tx.ticket.findUnique({
        where: { id: ticket.id },
        include: {
          messages: true,
          order: { select: { id: true, orderNumber: true, totalAmount: true } },
        },
      });
    });
  }

  async getMyTickets(userId: string, query: QueryTicketDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;

    const [total, tickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return {
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTicketDetailForCustomer(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: { select: { id: true, orderNumber: true, totalAmount: true, status: true } },
        messages: {
          where: { isInternalNote: false }, // MASK internal notes
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, roles: { include: { role: true } } },
            },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (ticket.userId !== userId) throw new ForbiddenException('Bạn không có quyền truy cập vé này');

    return ticket;
  }

  async addCustomerReply(ticketId: string, userId: string, dto: CreateTicketMessageDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (ticket.userId !== userId) throw new ForbiddenException('Bạn không có quyền truy cập vé này');
    if (ticket.status === 'CLOSED') throw new BadRequestException('Vé hỗ trợ này đã đóng');

    const nextStatus = ticket.status === 'RESOLVED' ? TicketStatus.IN_PROGRESS : ticket.status;

    const [message] = await Promise.all([
      this.prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          message: dto.message,
          attachments: dto.attachments || [],
          isInternalNote: false,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: nextStatus, lastRepliedAt: new Date() },
      }),
    ]);

    return message;
  }

  async closeTicketByCustomer(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (ticket.userId !== userId) throw new ForbiddenException('Bạn không có quyền truy cập vé này');

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.CLOSED, resolvedAt: new Date() },
    });
  }

  async findAllAdmin(query: QueryTicketDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { user: { phone: { contains: s } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, orderNumber: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return {
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneAdmin(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        order: { select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, roles: { include: { role: true } } },
            },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    return ticket;
  }

  async addAdminReply(ticketId: string, staffUser: any, dto: CreateTicketMessageDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const isInternal = Boolean(dto.isInternalNote);

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: staffUser.id,
        message: dto.message,
        attachments: dto.attachments || [],
        isInternalNote: isInternal,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, roles: { include: { role: true } } },
        },
      },
    });

    if (!isInternal) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: ticket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : ticket.status,
          lastRepliedAt: new Date(),
          assignedToId: ticket.assignedToId || staffUser.id,
        },
      });

      // Send In-App notification to customer
      try {
        await this.notificationsService.create({
          userId: ticket.userId,
          type: NotificationType.SUPPORT,
          title: `Phản hồi vé hỗ trợ ${ticket.code}`,
          message: `Nhân viên CSKH vừa gửi phản hồi cho yêu cầu: "${ticket.title}".`,
          data: { ticketId: ticket.id, code: ticket.code },
        });
      } catch (err) {
        // Log & proceed without breaking response
      }
    }

    return message;
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const updateData: any = { status };
    if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
      updateData.resolvedAt = new Date();
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    if (status === TicketStatus.RESOLVED) {
      try {
        await this.notificationsService.create({
          userId: ticket.userId,
          type: NotificationType.SUPPORT,
          title: `Vé hỗ trợ ${ticket.code} đã được xử lý`,
          message: `Yêu cầu hỗ trợ "${ticket.title}" đã được nhân viên giải quyết. Vui lòng kiểm tra và xác nhận.`,
          data: { ticketId: ticket.id, code: ticket.code },
        });
      } catch (err) {
        // Log & proceed without breaking response
      }
    }

    return updated;
  }

  async assignTicket(ticketId: string, assignedToId: string) {
    const [ticket, staff] = await Promise.all([
      this.prisma.ticket.findUnique({ where: { id: ticketId } }),
      this.prisma.user.findUnique({ where: { id: assignedToId } }),
    ]);

    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (!staff) throw new NotFoundException('Nhân viên không tồn tại');

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId },
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}
