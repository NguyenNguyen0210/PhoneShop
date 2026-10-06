import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import {
  CreateInstallmentApplicationDto,
  QueryInstallmentDto,
  ReviewInstallmentDto,
} from './dto';
import {
  ImeiStatus,
  InstallmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class InstallmentsService {
  private readonly logger = new Logger(InstallmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  async findAll(query: QueryInstallmentDto) {
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InstallmentApplicationWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { order: { orderNumber: { contains: s, mode: 'insensitive' } } },
        { fullName: { contains: s, mode: 'insensitive' } },
        { citizenId: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.installmentApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              items: {
                include: {
                  variant: {
                    include: { product: true },
                  },
                },
              },
              payments: true,
              address: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.installmentApplication.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string) {
    const app = await this.prisma.installmentApplication.findUnique({
      where: { id },
      include: {
        paymentTerms: { orderBy: { termNo: 'asc' } },
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: { product: true },
                },
                imeiDevice: true,
              },
            },
            address: true,
            payments: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!app) {
      throw new NotFoundException(`Hồ sơ trả góp với ID ${id} không tồn tại`);
    }

    return app;
  }

  async findByOrderId(orderId: string, userId?: string) {
    const where: Prisma.InstallmentApplicationWhereInput = { orderId };
    if (userId) {
      where.userId = userId;
    }

    const app = await this.prisma.installmentApplication.findFirst({
      where,
      include: {
        paymentTerms: { orderBy: { termNo: 'asc' } },
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
            address: true,
            payments: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!app) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ trả góp cho đơn hàng ${orderId}`,
      );
    }

    return app;
  }

  async getMyInstallments(userId: string) {
    return this.prisma.installmentApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        paymentTerms: { orderBy: { termNo: 'asc' } },
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
            payments: true,
          },
        },
      },
    });
  }

  async review(id: string, staffId: string, dto: ReviewInstallmentDto) {
    const app = await this.prisma.installmentApplication.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!app) {
      throw new NotFoundException(`Hồ sơ trả góp với ID ${id} không tồn tại`);
    }

    if (app.status !== InstallmentStatus.PENDING) {
      throw new BadRequestException(
        `Hồ sơ trả góp đã được xử lý (trạng thái: ${app.status})`,
      );
    }

    if (
      dto.status === 'REJECTED' &&
      (!dto.rejectionReason || !dto.rejectionReason.trim())
    ) {
      throw new BadRequestException(
        'Vui lòng cung cấp lý do từ chối hồ sơ trả góp',
      );
    }

    const now = new Date();

    const appWithRelations = {
      order: {
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    };

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.status === 'APPROVED') {
        // Approve only a live hold: the order must still be PENDING and its
        // hold must not have expired — approving a released/cancelled order
        // would confirm stock that no longer belongs to it.
        const freshOrder = await tx.order.findUnique({
          where: { id: app.orderId },
          select: { status: true, holdExpiresAt: true },
        });
        if (!freshOrder || freshOrder.status !== OrderStatus.PENDING) {
          throw new BadRequestException(
            'Only a PENDING order can be approved for installment',
          );
        }
        if (
          !freshOrder.holdExpiresAt ||
          freshOrder.holdExpiresAt.getTime() <= Date.now()
        ) {
          throw new BadRequestException(
            'Order hold has expired. The reserved stock was released — please place the order again.',
          );
        }

        const claimedApp = await tx.installmentApplication.updateMany({
          where: { id, status: InstallmentStatus.PENDING },
          data: {
            status: InstallmentStatus.APPROVED,
            reviewedBy: staffId,
            reviewedAt: now,
            staffNotes: dto.staffNotes?.trim() || null,
          },
        });
        if (claimedApp.count === 0) {
          throw new ConflictException(
            'Installment application was already processed concurrently',
          );
        }

        const claimedOrder = await tx.order.updateMany({
          where: { id: app.orderId, status: OrderStatus.PENDING },
          data: {
            status: OrderStatus.CONFIRMED,
            confirmedAt: now,
          },
        });
        if (claimedOrder.count === 0) {
          throw new ConflictException(
            'Order status changed concurrently; please refresh and retry',
          );
        }

        // Build the monthly repayment schedule in the same transaction:
        // calendar-month due dates from approval, last term absorbing
        // rounding so the terms sum to exactly the loan amount.
        // Never let a schedule failure block the approval itself.
        try {
          await this.createScheduleRows(tx, id, app, now);
        } catch (scheduleErr) {
          this.logger.warn(
            `Schedule generation deferred for application ${id}: ${(scheduleErr as Error).message}`,
          );
        }

        const updatedApp = await tx.installmentApplication.findUnique({
          where: { id },
          include: appWithRelations,
        });

        this.logger.log(
          `Installment application ${id} approved for order ${app.orderId} by staff ${staffId}`,
        );

        return updatedApp;
      } else {
        const rejectionReason = dto.rejectionReason!.trim();
        const claimedApp = await tx.installmentApplication.updateMany({
          where: { id, status: InstallmentStatus.PENDING },
          data: {
            status: InstallmentStatus.REJECTED,
            reviewedBy: staffId,
            reviewedAt: now,
            staffNotes: dto.staffNotes?.trim() || null,
            rejectionReason,
          },
        });
        if (claimedApp.count === 0) {
          throw new ConflictException(
            'Installment application was already processed concurrently',
          );
        }

        const claimedOrder = await tx.order.updateMany({
          where: { id: app.orderId, status: OrderStatus.PENDING },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: now,
            cancelledReason: `Từ chối hồ sơ trả góp: ${rejectionReason}`,
          },
        });
        if (claimedOrder.count === 0) {
          throw new ConflictException(
            'Order is no longer PENDING and cannot be cancelled by rejection',
          );
        }

        // Close the checkout-created PENDING payment so the cancelled order
        // keeps no live payment rows.
        await tx.payment.updateMany({
          where: { orderId: app.orderId, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.CANCELLED },
        });

        // Rollback voucher usage if any
        if (app.order.voucherCode) {
          const voucher = await tx.voucher.findUnique({
            where: { code: app.order.voucherCode },
            select: { id: true },
          });
          if (voucher) {
            await tx.voucher.updateMany({
              where: { id: voucher.id, usageCount: { gt: 0 } },
              data: { usageCount: { decrement: 1 } },
            });
          }
          await tx.voucherUsage.deleteMany({ where: { orderId: app.orderId } });
        }

        // Release inventory and reserved IMEIs (re-read items inside the txn
        // so a concurrent change cannot release stale quantities twice)
        const freshItems = await tx.orderItem.findMany({
          where: { orderId: app.orderId },
        });
        for (const item of freshItems) {
          if (item.imeiDeviceId) {
            await tx.imeiDevice.updateMany({
              where: { id: item.imeiDeviceId, status: ImeiStatus.RESERVED },
              data: { status: ImeiStatus.AVAILABLE },
            });
          }
          await tx.inventory.updateMany({
            where: { variantId: item.variantId, reservedQty: { gte: item.quantity } },
            data: {
              reservedQty: { decrement: item.quantity },
              availableQty: { increment: item.quantity },
            },
          });
        }

        this.logger.log(
          `Installment application ${id} rejected for order ${app.orderId} by staff ${staffId}. Stock released.`,
        );

        return tx.installmentApplication.findUnique({
          where: { id },
          include: appWithRelations,
        });
      }
    });

    const emailService = this.emailService;
    if (emailService && (result as any)?.user?.email && (result as any)?.order) {
      try {
        const u = (result as any).user;
        const o = (result as any).order;
        const recipientName =
          [u.firstName, u.lastName].filter(Boolean).join(' ') ||
          (result as any).fullName ||
          undefined;

        const providerLabel =
          (result as any).provider === 'HOME_CREDIT'
            ? 'Home Credit'
            : (result as any).provider === 'FE_CREDIT'
              ? 'FE Credit'
              : String((result as any).provider);

        if ((result as any).status === InstallmentStatus.APPROVED) {
          await emailService.sendInstallmentApproved(u.email, {
            orderNumber: o.orderNumber,
            recipientName,
            providerName: providerLabel,
            prepayAmount: Number((result as any).prepayAmount || 0),
            monthlyAmount: Number((result as any).monthlyAmount || 0),
            termMonths: Number((result as any).termMonths || 0),
          });
        } else if ((result as any).status === InstallmentStatus.REJECTED) {
          await emailService.sendInstallmentRejected(u.email, {
            orderNumber: o.orderNumber,
            recipientName,
            rejectionReason:
              (result as any).rejectionReason ||
              'Hồ sơ chưa đạt tiêu chuẩn thẩm định tín dụng',
          });
        }
      } catch (emailErr) {
        this.logger.warn(
          `Failed to dispatch installment email for application ${id}: ${(emailErr as Error).message}`,
        );
      }
    }

    return result;
  }

  // ── MONTHLY REPAYMENT SCHEDULE ────────────────────────────
  // Money itself moves through the finance company — these rows only record
  // what is due when and whether staff confirmed its collection. OVERDUE is
  // derived on read (PENDING + past dueDate), never stored, so no cron job.

  private addMonthsClamped(date: Date, months: number): Date {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) d.setDate(0);
    return d;
  }

  private withOverdue<T extends { status: unknown; dueDate: Date | string }>(
    term: T,
  ): T & { isOverdue: boolean } {
    const due = new Date(term.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      ...term,
      isOverdue:
        String(term.status) === 'PENDING' && due.getTime() < today.getTime(),
    };
  }

  private async createScheduleRows(
    tx: any,
    applicationId: string,
    app: { loanAmount: unknown; termMonths: unknown },
    anchor: Date,
  ): Promise<void> {
    // Resilient: if the terms table/client predates this feature (setup
    // script not run yet), skip instead of breaking the approval — staff
    // can generate the schedule later via the regenerate endpoint.
    if (!tx.installmentPaymentTerm?.create) {
      this.logger.warn(
        `Skipping schedule for application ${applicationId}: installment_payment_terms unavailable`,
      );
      return;
    }
    const loan = Math.round(Number(app.loanAmount));
    const terms = Number(app.termMonths);
    if (!Number.isFinite(loan) || loan <= 0 || !Number.isInteger(terms) || terms <= 0) {
      this.logger.warn(
        `Skipping schedule for application ${applicationId}: invalid loan/terms`,
      );
      return;
    }
    const monthly = Math.round(loan / terms);
    for (let n = 1; n <= terms; n++) {
      await tx.installmentPaymentTerm.create({
        data: {
          applicationId,
          termNo: n,
          dueDate: this.addMonthsClamped(anchor, n),
          amount: n < terms ? monthly : loan - monthly * (terms - 1),
        },
      });
    }
  }

  private shapeSchedule(app: any) {
    const terms = ((app?.paymentTerms ?? []) as any[])
      .slice()
      .sort((a, b) => a.termNo - b.termNo)
      .map((t) => this.withOverdue(t));
    return {
      id: app.id,
      orderId: app.orderId,
      orderNumber: app.order?.orderNumber,
      orderStatus: app.order?.status,
      provider: app.provider,
      status: app.status,
      termMonths: app.termMonths,
      prepayAmount: Number(app.prepayAmount ?? 0),
      loanAmount: Number(app.loanAmount ?? 0),
      fullName: app.fullName,
      phoneNumber: app.phoneNumber,
      customerEmail: app.user?.email,
      customerName:
        [app.user?.firstName, app.user?.lastName].filter(Boolean).join(' ') ||
        app.fullName,
      terms,
      paidTerms: terms.filter((t: any) => t.status === 'PAID').length,
      overdueTerms: terms.filter((t: any) => t.isOverdue).length,
    };
  }

  async getSchedule(
    applicationId: string,
    requester: { userId?: string; isStaff?: boolean },
  ) {
    const app = await this.prisma.installmentApplication.findUnique({
      where: { id: applicationId },
      include: {
        paymentTerms: { orderBy: { termNo: 'asc' } },
        order: { select: { orderNumber: true, status: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!app) {
      throw new NotFoundException(`Hồ sơ trả góp với ID ${applicationId} không tồn tại`);
    }
    if (!requester.isStaff && app.userId !== requester.userId) {
      throw new NotFoundException(`Hồ sơ trả góp với ID ${applicationId} không tồn tại`);
    }
    return this.shapeSchedule(app);
  }

  async getScheduleByOrder(
    orderId: string,
    requester: { userId?: string; isStaff?: boolean },
  ) {
    const where: any = { orderId };
    if (!requester.isStaff) where.userId = requester.userId;
    const app = await this.prisma.installmentApplication.findFirst({
      where,
      include: {
        paymentTerms: { orderBy: { termNo: 'asc' } },
        order: { select: { orderNumber: true, status: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!app) {
      throw new NotFoundException('Đơn hàng này không có hồ sơ trả góp');
    }
    return this.shapeSchedule(app);
  }

  async markTermPaid(
    termId: string,
    staffId: string,
    dto: { paidNote?: string },
  ) {
    const term = await this.prisma.installmentPaymentTerm.findUnique({
      where: { id: termId },
      include: { application: { select: { id: true, status: true, orderId: true } } },
    });
    if (!term) {
      throw new NotFoundException(`Kỳ góp với ID ${termId} không tồn tại`);
    }
    if ((term.application as any)?.status !== InstallmentStatus.APPROVED) {
      throw new BadRequestException('Chỉ ghi nhận kỳ góp của hồ sơ đã được phê duyệt');
    }
    // Idempotent: re-ticking an already-paid term is a no-op success.
    if ((term as any).status === 'PAID') {
      return this.withOverdue(term);
    }

    const claimed = await this.prisma.installmentPaymentTerm.updateMany({
      where: { id: termId, status: 'PENDING' },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidNote: dto.paidNote?.trim()?.slice(0, 255) || null,
        markedBy: staffId,
      },
    });
    if (claimed.count === 0) {
      throw new ConflictException('Kỳ góp đã được xử lý đồng thời, vui lòng tải lại');
    }

    this.logger.log(`Installment term ${termId} marked PAID by staff ${staffId}`);
    const updated = await this.prisma.installmentPaymentTerm.findUnique({
      where: { id: termId },
    });
    return this.withOverdue(updated);
  }

  async regenerateSchedule(applicationId: string, staffId: string) {
    const app = await this.prisma.installmentApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      throw new NotFoundException(`Hồ sơ trả góp với ID ${applicationId} không tồn tại`);
    }
    if ((app as any).status !== InstallmentStatus.APPROVED) {
      throw new BadRequestException('Chỉ tạo lịch trả cho hồ sơ đã được phê duyệt');
    }
    const existing = await this.prisma.installmentPaymentTerm.count({
      where: { applicationId },
    });
    if (existing > 0) {
      throw new BadRequestException('Hồ sơ này đã có lịch trả góp');
    }
    const anchor = (app as any).reviewedAt ? new Date((app as any).reviewedAt) : new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.createScheduleRows(tx, applicationId, app as any, anchor);
    });
    this.logger.log(
      `Installment schedule regenerated for application ${applicationId} by staff ${staffId}`,
    );
    return this.getSchedule(applicationId, { isStaff: true });
  }

  async remindApplication(applicationId: string, staffId: string) {
    const schedule = await this.getSchedule(applicationId, { isStaff: true });
    if (schedule.status !== InstallmentStatus.APPROVED) {
      throw new BadRequestException('Chỉ nhắc nợ hồ sơ đã được phê duyệt');
    }
    const pending = (schedule.terms as any[]).filter((t) => t.status === 'PENDING');
    if (pending.length === 0) {
      throw new BadRequestException('Hồ sơ này không còn kỳ góp nào chưa thu');
    }
    const overdue = pending.filter((t) => t.isOverdue);
    // Remind all overdue terms, or the single next upcoming one.
    const targets = overdue.length > 0 ? overdue : [pending[0]];
    if (!schedule.customerEmail) {
      throw new BadRequestException('Hồ sơ này không có email khách hàng để gửi nhắc nợ');
    }

    const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('vi-VN');
    const fmtMoney = (n: number) =>
      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    const rows = targets
      .map(
        (t) =>
          `<tr><td style="padding:8px;border:1px solid #e2e8f0;">Kỳ ${t.termNo}/${schedule.termMonths}</td>` +
          `<td style="padding:8px;border:1px solid #e2e8f0;">${fmtDate(t.dueDate)}</td>` +
          `<td style="padding:8px;border:1px solid #e2e8f0;">${fmtMoney(Number(t.amount))}</td>` +
          `<td style="padding:8px;border:1px solid #e2e8f0;">${t.isOverdue ? 'Quá hạn' : 'Sắp đến hạn'}</td></tr>`,
      )
      .join('');
    const subject = overdue.length > 0
      ? `[Phone Shop] Nhắc thanh toán ${overdue.length} kỳ góp quá hạn (đơn ${schedule.orderNumber})`
      : `[Phone Shop] Nhắc lịch trả góp kỳ ${targets[0].termNo} (đơn ${schedule.orderNumber})`;

    try {
      await this.emailService.send({
        to: schedule.customerEmail,
        subject,
        html:
          `<p>Chào ${schedule.customerName || 'quý khách'},</p>` +
          `<p>Phone Shop nhắc lịch trả góp 0% cho đơn hàng <strong>${schedule.orderNumber}</strong>. ` +
          `Quý khách vui lòng thanh toán các kỳ sau cho công ty tài chính đúng hạn:</p>` +
          `<table style="border-collapse:collapse;"><tr>` +
          `<th style="padding:8px;border:1px solid #e2e8f0;">Kỳ</th>` +
          `<th style="padding:8px;border:1px solid #e2e8f0;">Hạn trả</th>` +
          `<th style="padding:8px;border:1px solid #e2e8f0;">Số tiền</th>` +
          `<th style="padding:8px;border:1px solid #e2e8f0;">Trạng thái</th></tr>${rows}</table>` +
          `<p>Mọi thắc mắc vui lòng liên hệ hotline <strong>1800 6868</strong>.</p>`,
      });
    } catch (emailErr) {
      this.logger.warn(
        `Failed to send installment reminder for application ${applicationId}: ${(emailErr as Error).message}`,
      );
      throw new BadRequestException('Không gửi được email nhắc nợ lúc này, vui lòng thử lại');
    }

    this.logger.log(
      `Installment reminder sent for application ${applicationId} (terms ${targets.map((t) => t.termNo).join(',')}) by staff ${staffId}`,
    );
    return {
      sentTo: schedule.customerEmail,
      remindedTerms: targets.map((t) => t.termNo),
      overdueCount: overdue.length,
    };
  }
}
