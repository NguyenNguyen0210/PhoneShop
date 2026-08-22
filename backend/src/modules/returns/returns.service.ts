import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReturnDto, AdminNoteDto, CreateRefundDto } from './dto/return.dto';
import { ReturnStatus, RefundStatus, OrderStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  private generateReturnNumber(): string {
    return `RET-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private generateRefundNumber(): string {
    return `REF-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  // ── RETURN ────────────────────────────────────────────

  async createReturn(userId: string, dto: CreateReturnDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const allowedStatuses: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.COMPLETED];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException('Return can only be requested for delivered or completed orders');
    }

    return this.prisma.return.create({
      data: {
        orderId: dto.orderId,
        userId,
        returnNumber: this.generateReturnNumber(),
        reason: dto.reason,
        customerNote: dto.customerNote,
        items: {
          create: dto.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reason: item.reason,
            condition: item.condition,
          })),
        },
      },
      include: { items: true, order: true },
    });
  }

  async getMyReturns(userId: string) {
    return this.prisma.return.findMany({
      where: { userId },
      include: { items: true, refunds: true, order: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyReturn(userId: string, id: string) {
    const ret = await this.prisma.return.findFirst({
      where: { id, userId },
      include: { items: true, refunds: true, order: true },
    });
    if (!ret) throw new NotFoundException('Return request not found');
    return ret;
  }

  async findAll() {
    return this.prisma.return.findMany({
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: true,
        refunds: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const ret = await this.prisma.return.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: true,
        refunds: true,
        order: true,
      },
    });
    if (!ret) throw new NotFoundException('Return not found');
    return ret;
  }

  async transitionStatus(id: string, newStatus: ReturnStatus, dto?: AdminNoteDto) {
    await this.findOne(id);
    const data: any = { status: newStatus };
    if (dto?.adminNote) data.adminNote = dto.adminNote;

    const now = new Date();
    if (newStatus === ReturnStatus.APPROVED)  data.approvedAt  = now;
    if (newStatus === ReturnStatus.RECEIVED)  data.receivedAt  = now;
    if (newStatus === ReturnStatus.COMPLETED) data.completedAt = now;

    return this.prisma.return.update({ where: { id }, data });
  }

  async cancelReturn(userId: string, id: string) {
    const ret = await this.prisma.return.findFirst({ where: { id, userId } });
    if (!ret) throw new NotFoundException('Return not found');
    if (ret.status !== ReturnStatus.REQUESTED) {
      throw new BadRequestException('Can only cancel return in REQUESTED status');
    }
    return this.prisma.return.update({
      where: { id },
      data: { status: ReturnStatus.CANCELLED },
    });
  }

  // ── REFUND ────────────────────────────────────────────

  async createRefund(dto: CreateRefundDto) {
    const ret = await this.findOne(dto.returnId);

    if (ret.status !== ReturnStatus.COMPLETED && ret.status !== ReturnStatus.RECEIVED) {
      throw new BadRequestException('Return must be RECEIVED or COMPLETED before issuing a refund');
    }

    return this.prisma.refund.create({
      data: {
        returnId: dto.returnId,
        refundNumber: this.generateRefundNumber(),
        amount: dto.amount,
        reason: dto.reason,
      },
    });
  }

  async processRefund(refundId: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Refund is not in PENDING status');
    }

    return this.prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.PROCESSING },
    });
  }

  async completeRefund(refundId: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');

    return this.prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.COMPLETED, processedAt: new Date() },
    });
  }

  async getRefundHistory() {
    return this.prisma.refund.findMany({
      include: { return: { include: { order: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
