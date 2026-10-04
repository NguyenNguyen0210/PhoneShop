import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { CreateReturnDto, AdminNoteDto, CreateRefundDto } from './dto/return.dto';
import { ReturnStatus, RefundStatus, OrderStatus, ImeiStatus, StockMovementType, PaymentStatus } from '@prisma/client';
import { getPagination, buildPaginatedResponse } from '../../common/utils/pagination.util';
import { randomBytes } from 'crypto';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

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
        return: { status: { notIn: [ReturnStatus.CANCELLED, ReturnStatus.REJECTED] } },
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

    // Re-check + create atomically so two concurrent requests cannot both
    // pass the remaining-quantity check and over-return the same line.
    return this.prisma.$transaction(async (tx) => {
      const freshPrior = await tx.returnItem.findMany({
        where: {
          orderItemId: { in: orderItemIds },
          return: { status: { notIn: [ReturnStatus.CANCELLED, ReturnStatus.REJECTED] } },
        },
        select: { orderItemId: true, quantity: true },
      });
      const freshReturned = new Map<string, number>();
      for (const pi of freshPrior) {
        freshReturned.set(pi.orderItemId, (freshReturned.get(pi.orderItemId) || 0) + pi.quantity);
      }
      for (const item of dto.items) {
        const oi = byId.get(item.orderItemId)!;
        const remaining = oi.quantity - (freshReturned.get(item.orderItemId) || 0);
        if (item.quantity < 1 || item.quantity > remaining) {
          throw new BadRequestException(
            `Invalid return quantity for item ${oi.sku}: at most ${remaining} unit(s) can be returned`,
          );
        }
      }
      return tx.return.create({
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
    });
  }

  async getMyReturns(userId: string, page?: number | string, limit?: number | string) {
    const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit, 10);
    const where = { userId };
    const [total, data] = await Promise.all([
      this.prisma.return.count({ where }),
      this.prisma.return.findMany({
        where,
        include: { items: true, refunds: true, order: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);
    return buildPaginatedResponse(data, total, safePage, safeLimit);
  }

  async getMyReturn(userId: string, id: string) {
    const ret = await this.prisma.return.findFirst({
      where: { id, userId },
      include: { items: true, refunds: true, order: true },
    });
    if (!ret) throw new NotFoundException('Return request not found');
    return ret;
  }

  async findAll(page?: number | string, limit?: number | string, status?: string, search?: string) {
    const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit, 10);
    const where: any = {};
    if (status && status !== 'ALL') {
      const mappedStatus = status === 'PENDING' ? ReturnStatus.REQUESTED : status;
      if (Object.values(ReturnStatus).includes(mappedStatus as ReturnStatus)) {
        where.status = mappedStatus as ReturnStatus;
      }
    }
    if (search?.trim()) {
      const s = search.trim();
      where.OR = [
        { returnNumber: { contains: s, mode: 'insensitive' } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { user: { phone: { contains: s } } },
        { order: { orderNumber: { contains: s, mode: 'insensitive' } } },
      ];
    }
    const [total, data] = await Promise.all([
      this.prisma.return.count({ where }),
      this.prisma.return.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: true,
          refunds: true,
          order: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);
    return buildPaginatedResponse(data, total, safePage, safeLimit);
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
    [ReturnStatus.APPROVED]: [ReturnStatus.SHIPPING, ReturnStatus.CANCELLED],
    [ReturnStatus.SHIPPING]: [ReturnStatus.RECEIVED, ReturnStatus.CANCELLED],
    [ReturnStatus.INSPECTING]: [ReturnStatus.COMPLETED, ReturnStatus.REJECTED],
    [ReturnStatus.RECEIVED]: [ReturnStatus.INSPECTING, ReturnStatus.COMPLETED, ReturnStatus.REJECTED],
    [ReturnStatus.REJECTED]: [],
    [ReturnStatus.COMPLETED]: [],
    [ReturnStatus.CANCELLED]: [],
  };

  async transitionStatus(id: string, newStatus: ReturnStatus, dto?: AdminNoteDto) {
    const ret = await this.findOne(id);
    const oldStatus = ret.status;
    const allowed = ReturnsService.ALLOWED_RETURN_TRANSITIONS[oldStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition return from ${oldStatus} to ${newStatus}`,
      );
    }
    const data: any = { status: newStatus };
    if (dto?.adminNote) data.adminNote = dto.adminNote;

    const now = new Date();
    if (newStatus === ReturnStatus.APPROVED)  data.approvedAt  = now;
    if (newStatus === ReturnStatus.RECEIVED)  data.receivedAt  = now;
    if (newStatus === ReturnStatus.COMPLETED) data.completedAt = now;

    // Guarded write: only flip if the row is still in the expected old
    // status — a concurrent transition wins instead of silently overwriting.
    const guardError = () =>
      new ConflictException(
        `Return status changed concurrently (expected ${oldStatus})`,
      );

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
              select: { id: true, variantId: true, quantity: true, imeiDeviceId: true, unitPrice: true },
            })
          : [];
        const byId = new Map(orderItems.map((oi) => [oi.id, oi]));
        const returnId = id;

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
          if (tx.inventory) {
            await tx.inventory.upsert({
              where: { variantId: oi.variantId },
              create: { variantId: oi.variantId, quantity: ri.quantity, availableQty: ri.quantity, reservedQty: 0 },
              update: {
                quantity: { increment: ri.quantity },
                availableQty: { increment: ri.quantity },
              },
            });

            const inv = await tx.inventory.findUnique({ where: { variantId: oi.variantId } });
            const balanceAfter = inv ? inv.quantity : 0;
            const balanceBefore = balanceAfter - ri.quantity;
            const unitPrice = Number(oi.unitPrice || 0);
            const totalAmount = ri.quantity * unitPrice;

            if (tx.stockMovement) {
              await tx.stockMovement.create({
                data: {
                  variantId: oi.variantId,
                  type: StockMovementType.IMPORT_RETURN,
                  quantity: ri.quantity,
                  balanceBefore,
                  balanceAfter,
                  unitPrice,
                  totalAmount,
                  referenceType: 'RETURN',
                  referenceId: returnId,
                  note: `Nhập lại kho từ đơn hoàn trả #${returnId}`,
                },
              });
            }
          }
        }
        const res = await tx.return.updateMany({ where: { id, status: oldStatus }, data });
        if (res.count === 0) throw guardError();
        return tx.return.findUnique({ where: { id } });
      });
    }

    const res = await this.prisma.return.updateMany({ where: { id, status: oldStatus }, data });
    if (res.count === 0) throw guardError();
    const updated = await this.prisma.return.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });

    if (newStatus === ReturnStatus.APPROVED && this.emailService && updated?.user?.email) {
      try {
        await this.emailService.sendReturnApproved(updated.user.email, updated.returnNumber);
      } catch (e) {
        this.logger.warn(`Failed to send return approved email: ${(e as Error).message}`);
      }
    }

    return updated;
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

    // Cap total refunds (non-voided) at what the customer actually paid
    // (sum of PAID payments), read + written inside one transaction so two
    // concurrent refunds cannot both pass the cap.
    return this.prisma.$transaction(async (tx) => {
      const paidPayments = await tx.payment.findMany({
        where: { orderId: ret.orderId, status: PaymentStatus.PAID },
        select: { id: true, amount: true, paidAt: true },
        orderBy: { paidAt: 'desc' },
      });
      if (paidPayments.length === 0) {
        throw new BadRequestException('No PAID payment found for this order');
      }
      const paidTotal = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const paidPayment = paidPayments[0];

      const existing = await tx.refund.findMany({
        where: {
          returnId: dto.returnId,
          status: { notIn: [RefundStatus.FAILED, RefundStatus.CANCELLED] },
        },
        select: { amount: true },
      });
      const alreadyRefunded = existing.reduce((sum, r) => sum + Number(r.amount), 0);
      if (alreadyRefunded + dto.amount > paidTotal) {
        throw new BadRequestException(
          `Refund exceeds paid amount: already refunded ${alreadyRefunded}, paid total ${paidTotal}`,
        );
      }

      return tx.refund.create({
        data: {
          returnId: dto.returnId,
          paymentId: paidPayment.id,
          refundNumber: this.generateRefundNumber(),
          amount: dto.amount,
          reason: dto.reason,
        },
      });
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

  async failRefund(refundId: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status !== RefundStatus.PROCESSING) {
      throw new BadRequestException('Only a PROCESSING refund can be marked as failed');
    }
    return this.prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.FAILED },
    });
  }

  async cancelRefund(refundId: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status !== RefundStatus.PROCESSING) {
      throw new BadRequestException('Only a PROCESSING refund can be cancelled');
    }
    return this.prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.CANCELLED },
    });
  }

  async getRefundHistory(page?: number | string, limit?: number | string) {
    const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit, 10);
    const [total, data] = await Promise.all([
      this.prisma.refund.count(),
      this.prisma.refund.findMany({
        include: { return: { include: { order: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);
    return buildPaginatedResponse(data, total, safePage, safeLimit);
  }
}
