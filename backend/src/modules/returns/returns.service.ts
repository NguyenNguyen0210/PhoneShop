import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReturnDto, AdminNoteDto, CreateRefundDto } from './dto/return.dto';
import { ReturnStatus, RefundStatus, OrderStatus, ImeiStatus } from '@prisma/client';
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

  // H4: 30-day return window anchored at delivery (mirrors the storefront
  // "30 ngày 1 đổi 1" policy). Server-side so clients cannot bypass it.
  private static readonly RETURN_WINDOW_DAYS = 30;

  async createReturn(userId: string, dto: CreateReturnDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Return must include at least one item');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: {
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const allowedStatuses: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.COMPLETED];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException('Return can only be requested for delivered or completed orders');
    }

    // H4: enforce the return window server-side.
    const deliveredAt = order.deliveredAt || order.completedAt || order.createdAt;
    const windowMs = ReturnsService.RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(deliveredAt).getTime() > windowMs) {
      throw new BadRequestException(
        `Return window expired (over ${ReturnsService.RETURN_WINDOW_DAYS} days since delivery)`,
      );
    }

    // H4: every returned line must belong to THIS order, with quantity capped
    // at (purchased − already returned via non-cancelled returns).
    const orderItemIds = dto.items.map((i) => i.orderItemId);
    const orderItems = await this.prisma.orderItem.findMany({
      where: { id: { in: orderItemIds }, orderId: dto.orderId },
    });
    if (orderItems.length !== new Set(orderItemIds).size) {
      throw new BadRequestException('One or more items do not belong to this order');
    }
    const byId = new Map(orderItems.map((oi) => [oi.id, oi]));

    const priorItems = await this.prisma.returnItem.findMany({
      where: {
        orderItemId: { in: orderItemIds },
        return: { status: { not: ReturnStatus.CANCELLED } },
      },
      select: { orderItemId: true, quantity: true },
    });
    const alreadyReturned = new Map<string, number>();
    for (const pi of priorItems) {
      alreadyReturned.set(pi.orderItemId, (alreadyReturned.get(pi.orderItemId) || 0) + pi.quantity);
    }

    for (const item of dto.items) {
      const oi = byId.get(item.orderItemId)!;
      const remaining = oi.quantity - (alreadyReturned.get(item.orderItemId) || 0);
      if (item.quantity < 1 || item.quantity > remaining) {
        throw new BadRequestException(
          `Invalid return quantity for item ${oi.sku}: at most ${remaining} unit(s) can be returned`,
        );
      }
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

  // H4: returns follow a strict pipeline — illegal jumps (e.g. completing a
  // REJECTED return, receiving before approval) are rejected instead of
  // silently stamping timestamps.
  private static readonly ALLOWED_RETURN_TRANSITIONS: Partial<Record<ReturnStatus, ReturnStatus[]>> = {
    [ReturnStatus.REQUESTED]: [ReturnStatus.APPROVED, ReturnStatus.REJECTED, ReturnStatus.CANCELLED],
    [ReturnStatus.APPROVED]: [ReturnStatus.SHIPPING, ReturnStatus.RECEIVED, ReturnStatus.CANCELLED],
    [ReturnStatus.SHIPPING]: [ReturnStatus.RECEIVED, ReturnStatus.CANCELLED],
    [ReturnStatus.INSPECTING]: [ReturnStatus.RECEIVED, ReturnStatus.COMPLETED, ReturnStatus.REJECTED],
    [ReturnStatus.RECEIVED]: [ReturnStatus.INSPECTING, ReturnStatus.COMPLETED, ReturnStatus.REJECTED],
    [ReturnStatus.REJECTED]: [],
    [ReturnStatus.COMPLETED]: [],
    [ReturnStatus.CANCELLED]: [],
  };

  async transitionStatus(id: string, newStatus: ReturnStatus, dto?: AdminNoteDto) {
    const ret = await this.findOne(id);
    const allowed = ReturnsService.ALLOWED_RETURN_TRANSITIONS[ret.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition return from ${ret.status} to ${newStatus}`,
      );
    }
    const data: any = { status: newStatus };
    if (dto?.adminNote) data.adminNote = dto.adminNote;

    const now = new Date();
    if (newStatus === ReturnStatus.APPROVED)  data.approvedAt  = now;
    if (newStatus === ReturnStatus.RECEIVED)  data.receivedAt  = now;
    if (newStatus === ReturnStatus.COMPLETED) data.completedAt = now;

    // H4: on final acceptance the handsets physically came back — restore
    // them to sellable stock (SOLD → RETURNED → AVAILABLE happens via the
    // IMEI matrix) and give inventory back, atomically with the status flip.
    if (newStatus === ReturnStatus.COMPLETED) {
      return this.prisma.$transaction(async (tx) => {
        const items = await tx.returnItem.findMany({
          where: { returnId: id },
        });
        const orderItemIds = items.map((i) => i.orderItemId);
        const orderItems = orderItemIds.length > 0
          ? await tx.orderItem.findMany({
              where: { id: { in: orderItemIds } },
              select: { id: true, variantId: true, quantity: true, imeiDeviceId: true },
            })
          : [];
        const byId = new Map(orderItems.map((oi) => [oi.id, oi]));

        for (const ri of items) {
          const oi = byId.get(ri.orderItemId);
          if (!oi) continue;
          if (oi.imeiDeviceId) {
            // SOLD → RETURNED (matrix-legal), then RETURNED → AVAILABLE.
            await tx.imeiDevice.updateMany({
              where: { id: oi.imeiDeviceId, status: ImeiStatus.SOLD },
              data: { status: ImeiStatus.RETURNED },
            });
            await tx.imeiDevice.updateMany({
              where: { id: oi.imeiDeviceId, status: ImeiStatus.RETURNED },
              data: { status: ImeiStatus.AVAILABLE, soldAt: null },
            });
          }
          await tx.inventory.upsert({
            where: { variantId: oi.variantId },
            create: { variantId: oi.variantId, quantity: ri.quantity, availableQty: ri.quantity, reservedQty: 0 },
            update: {
              quantity: { increment: ri.quantity },
              availableQty: { increment: ri.quantity },
            },
          });
        }
        return tx.return.update({ where: { id }, data });
      });
    }

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

    if (dto.amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    // H5: cap total refunds (non-voided) at what the customer actually paid.
    // findOne includes order:true, so the order total is available.
    const orderTotal = Number((ret as any).order?.totalAmount ?? 0);
    const existing = await this.prisma.refund.findMany({
      where: {
        returnId: dto.returnId,
        status: { notIn: [RefundStatus.FAILED, RefundStatus.CANCELLED] },
      },
      select: { amount: true },
    });
    const alreadyRefunded = existing.reduce((sum, r) => sum + Number(r.amount), 0);
    if (alreadyRefunded + dto.amount > orderTotal) {
      throw new BadRequestException(
        `Refund exceeds paid amount: already refunded ${alreadyRefunded}, order total ${orderTotal}`,
      );
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

    // H5: only a PROCESSING refund (money actually moving via processRefund)
    // may be completed. Completing PENDING/FAILED/CANCELLED — or completing
    // twice — would stamp payouts that never happened.
    if (refund.status !== RefundStatus.PROCESSING) {
      throw new BadRequestException('Only a PROCESSING refund can be completed');
    }

    return this.prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.COMPLETED, processedAt: new Date() },
    });
  }

  async getRefundHistory() {
    return this.prisma.refund.findMany({
      include: { return: { include: { order: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
