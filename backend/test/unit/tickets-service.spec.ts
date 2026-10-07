import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { TicketsService } from '../../src/modules/tickets/tickets.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationType, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

const mockFn = (): any => jest.fn();

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: any;
  let notifications: any;

  beforeEach(() => {
    prisma = {
      ticket: {
        count: mockFn(),
        findUnique: mockFn(),
        findMany: mockFn(),
        create: mockFn(),
        update: mockFn(),
      },
      ticketMessage: {
        create: mockFn(),
      },
      user: {
        findUnique: mockFn(),
      },
      $transaction: mockFn().mockImplementation((cb: any) => cb(prisma)),
    };
    notifications = {
      create: mockFn().mockResolvedValue({}),
    };

    service = new TicketsService(prisma as any, notifications as any);
  });

  describe('createTicket', () => {
    it('should create a ticket and initial message in transaction', async () => {
      prisma.ticket.count.mockResolvedValue(0);
      prisma.ticket.create.mockResolvedValue({
        id: 'tk-1',
        code: 'TK-202610-0001',
        title: 'Lỗi đơn hàng',
      });
      prisma.ticketMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tk-1',
        code: 'TK-202610-0001',
        title: 'Lỗi đơn hàng',
        messages: [{ id: 'msg-1', message: 'Cần hỗ trợ' }],
      });

      const result = await service.createTicket('customer-1', {
        title: 'Lỗi đơn hàng',
        category: TicketCategory.ORDER_INQUIRY,
        priority: TicketPriority.HIGH,
        message: 'Cần hỗ trợ',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Lỗi đơn hàng',
            category: TicketCategory.ORDER_INQUIRY,
            priority: TicketPriority.HIGH,
            userId: 'customer-1',
          }),
        }),
      );
      expect(prisma.ticketMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'tk-1',
            senderId: 'customer-1',
            message: 'Cần hỗ trợ',
            isInternalNote: false,
          }),
        }),
      );
      expect(result?.id).toBe('tk-1');
    });
  });

  describe('getMyTickets', () => {
    it('should return paginated tickets for the customer', async () => {
      prisma.ticket.count.mockResolvedValue(1);
      prisma.ticket.findMany.mockResolvedValue([
        { id: 'tk-1', title: 'Ticket 1', userId: 'customer-1' },
      ]);

      const res = await service.getMyTickets('customer-1', { page: 1, limit: 10 });
      expect(res.total).toBe(1);
      expect(res.data).toHaveLength(1);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'customer-1' }),
        }),
      );
    });
  });

  describe('getTicketDetailForCustomer', () => {
    it('should mask internal notes when customer views ticket detail', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tk-1',
        userId: 'customer-1',
        messages: [
          { id: 'm1', message: 'Hello, need help', isInternalNote: false },
        ],
      });

      const result = await service.getTicketDetailForCustomer('tk-1', 'customer-1');

      expect(prisma.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tk-1' },
          include: expect.objectContaining({
            messages: expect.objectContaining({
              where: { isInternalNote: false },
            }),
          }),
        }),
      );
      expect(result.id).toBe('tk-1');
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.getTicketDetailForCustomer('tk-nonexistent', 'customer-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should forbid customer from viewing another customer ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tk-2',
        userId: 'customer-2',
      });

      await expect(service.getTicketDetailForCustomer('tk-2', 'customer-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addCustomerReply', () => {
    it('should add message and switch RESOLVED ticket back to IN_PROGRESS', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tk-1',
        userId: 'customer-1',
        status: TicketStatus.RESOLVED,
      });
      prisma.ticketMessage.create.mockResolvedValue({ id: 'msg-reply' });
      prisma.ticket.update.mockResolvedValue({ id: 'tk-1', status: TicketStatus.IN_PROGRESS });

      const reply = await service.addCustomerReply('tk-1', 'customer-1', {
        message: 'Vấn đề vẫn chưa được khắc phục',
      });

      expect(prisma.ticketMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'tk-1',
            senderId: 'customer-1',
            isInternalNote: false,
          }),
        }),
      );
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tk-1' },
          data: expect.objectContaining({ status: TicketStatus.IN_PROGRESS }),
        }),
      );
      expect(reply).toEqual({ id: 'msg-reply' });
    });

    it('should throw BadRequestException if customer replies to a CLOSED ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tk-1',
        userId: 'customer-1',
        status: TicketStatus.CLOSED,
      });

      await expect(
        service.addCustomerReply('tk-1', 'customer-1', { message: 'Reply to closed' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('closeTicketByCustomer', () => {
    it('should update status to CLOSED and set resolvedAt', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tk-1',
        userId: 'customer-1',
        status: TicketStatus.IN_PROGRESS,
      });
      prisma.ticket.update.mockResolvedValue({
        id: 'tk-1',
        status: TicketStatus.CLOSED,
      });

      const closed = await service.closeTicketByCustomer('tk-1', 'customer-1');
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tk-1' },
          data: expect.objectContaining({ status: TicketStatus.CLOSED }),
        }),
      );
      expect(closed.status).toBe(TicketStatus.CLOSED);
    });
  });

  describe('addAdminReply', () => {
    it('should trigger In-App Notification when staff sends public reply', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tk-1',
        code: 'TK-202610-0001',
        title: 'Màn hình lỗi',
        userId: 'customer-1',
        status: TicketStatus.OPEN,
      });
      prisma.ticketMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.ticket.update.mockResolvedValue({ id: 'tk-1', status: TicketStatus.IN_PROGRESS });

      const staffUser = { id: 'staff-1', roles: ['STAFF'] };
      await service.addAdminReply('tk-1', staffUser, {
        message: 'Chúng tôi đang kiểm tra',
        isInternalNote: false,
      });

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer-1',
          type: NotificationType.SUPPORT,
          title: expect.stringContaining('TK-202610-0001'),
        }),
      );
    });

    it('should NOT trigger In-App Notification when staff adds internal note', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tk-1',
        code: 'TK-202610-0001',
        title: 'Màn hình lỗi',
        userId: 'customer-1',
        status: TicketStatus.OPEN,
      });
      prisma.ticketMessage.create.mockResolvedValue({ id: 'msg-internal-1' });

      const staffUser = { id: 'staff-1', roles: ['STAFF'] };
      await service.addAdminReply('tk-1', staffUser, {
        message: 'Ghi chú kỹ thuật viên kiểm tra linh kiện',
        isInternalNote: true,
      });

      expect(prisma.ticket.update).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTicketStatus', () => {
    it('should notify customer when status changes to RESOLVED', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 'tk-1',
        code: 'TK-202610-0001',
        title: 'Hỗ trợ bảo hành',
        userId: 'customer-1',
        status: TicketStatus.IN_PROGRESS,
      });
      prisma.ticket.update.mockResolvedValue({
        id: 'tk-1',
        status: TicketStatus.RESOLVED,
      });

      await service.updateTicketStatus('tk-1', TicketStatus.RESOLVED);

      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tk-1' },
          data: expect.objectContaining({
            status: TicketStatus.RESOLVED,
          }),
        }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer-1',
          type: NotificationType.SUPPORT,
          title: expect.stringContaining('TK-202610-0001'),
        }),
      );
    });
  });

  describe('assignTicket', () => {
    it('should assign ticket to a staff member', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 'tk-1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'staff-1',
        firstName: 'Staff',
        roles: [{ role: { name: 'STAFF' } }],
      });
      prisma.ticket.update.mockResolvedValue({ id: 'tk-1', assignedToId: 'staff-1' });

      const assigned = await service.assignTicket('tk-1', 'staff-1');
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tk-1' },
          data: { assignedToId: 'staff-1' },
        }),
      );
      expect(assigned.assignedToId).toBe('staff-1');
    });

    it('should throw NotFoundException if staff member not found', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 'tk-1' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.assignTicket('tk-1', 'nonexistent-staff')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSummaryAnalytics', () => {
    it('should aggregate ticket counts by status and urgent priority', async () => {
      prisma.ticket.count
        .mockResolvedValueOnce(3) // OPEN
        .mockResolvedValueOnce(4) // IN_PROGRESS
        .mockResolvedValueOnce(3) // RESOLVED
        .mockResolvedValueOnce(3) // CLOSED
        .mockResolvedValueOnce(2); // URGENT

      const stats = await service.getSummaryAnalytics();

      expect(stats.open).toBe(3);
      expect(stats.inProgress).toBe(4);
      expect(stats.resolved).toBe(6);
      expect(stats.urgent).toBe(2);
      expect(stats.total).toBe(13);
    });
  });
});
