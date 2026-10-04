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
import { getPagination, buildPaginatedResponse } from '../../common/utils/pagination.util';
import { randomBytes } from 'crypto';

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

  // Race-safe code generation: count+1 collides under concurrency, so retry
  // on unique violation (P2002) with a random suffix, up to 3 attempts.
  private withRetryCode(baseCode: string, attempt: number): string {
    if (attempt === 0) return baseCode;
    return `${baseCode}-${randomBytes(2).toString('hex').toUpperCase()}`;
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    // Tickets may only reference the caller's own orders — never trust a
    // client-supplied orderId without an ownership check.
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, userId },
      });
      if (!order) throw new ForbiddenException('Order không thuộc về bạn hoặc không tồn tại');
    }

    const baseCode = await this.generateTicketCode();

    for (let attempt = 0; attempt < 3; attempt++) {
      const code = this.withRetryCode(baseCode, attempt);
      try {
        return await this.prisma.$transaction(async (tx) => {
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

          const initialMessageText = dto.message || dto.description || '';

          await tx.ticketMessage.create({
            data: {
              ticketId: ticket.id,
              senderId: userId,
              message: initialMessageText,
              attachments: dto.attachments || [],
              isInternalNote: false,
            },
          });

          return tx.ticket.findUnique({
            where: { id: ticket.id },
            include: {
              messages: {
                where: { isInternalNote: false },
                orderBy: { createdAt: 'asc' },
                include: {
                  sender: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true, roles: { include: { role: true } } },
                  },
                },
              },
              order: { select: { id: true, orderNumber: true, totalAmount: true } },
            },
          });
        });
      } catch (err: any) {
        // Unique violation on code (concurrent count+1 collision) → retry
        // with a random suffix. Anything else (or last attempt) rethrows.
        if (err?.code === 'P2002' && attempt < 2) continue;
        throw err;
      }
    }
  }

  async getMyTickets(userId: string, query: QueryTicketDto) {
    const { page, limit, skip } = getPagination(query.page, query.limit, 10);

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

    return buildPaginatedResponse(tickets, total, page, limit);
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
    const { page, limit, skip } = getPagination(query.page, query.limit, 10);

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

    return buildPaginatedResponse(tickets, total, page, limit);
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

  // AUDIT: allowed status transitions. Illegal jumps (e.g. CLOSED→RESOLVED,
  // IN_PROGRESS→OPEN) are rejected so history stays linear and reopening a
  // CLOSED ticket goes explicitly back to OPEN.
  private static readonly ALLOWED_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED],
    [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
    [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.OPEN],
    [TicketStatus.CLOSED]: [TicketStatus.OPEN],
  };

  async updateTicketStatus(ticketId: string, status: TicketStatus) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    if (ticket.status !== status) {
      const allowed = TicketsService.ALLOWED_TICKET_TRANSITIONS[ticket.status] ?? [];
      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Không thể chuyển vé từ ${ticket.status} sang ${status}`,
        );
      }
    }

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
      this.prisma.user.findUnique({
        where: { id: assignedToId },
        include: { roles: { include: { role: true } } },
      }),
    ]);

    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (!staff) throw new NotFoundException('Nhân viên không tồn tại');

    // AUDIT: tickets may only be assigned to staff accounts — assigning to a
    // plain USER would leak the full ticket thread (incl. internal notes).
    const staffRoles = (staff.roles ?? []).map((ur) => ur.role.name);
    const isStaff = staffRoles.some((r) => ['STAFF', 'MANAGER', 'ADMIN'].includes(r));
    if (!isStaff) {
      throw new BadRequestException('Chỉ có thể gán vé cho nhân viên (STAFF/MANAGER/ADMIN)');
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId },
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}
