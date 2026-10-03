import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateInstallmentApplicationDto,
  QueryInstallmentDto,
  ReviewInstallmentDto,
} from './dto';
import {
  ImeiStatus,
  InstallmentStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class InstallmentsService {
  private readonly logger = new Logger(InstallmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.$transaction(async (tx) => {
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

        // Rollback voucher usage if any
        if (app.order.voucherCode) {
          const voucher = await tx.voucher.findUnique({
            where: { code: app.order.voucherCode },
            select: { id: true },
          });
          if (voucher) {
            await tx.voucher.update({
              where: { id: voucher.id },
              data: { usageCount: { decrement: 1 } },
            });
          }
          await tx.voucherUsage.deleteMany({ where: { orderId: app.orderId } });
        }

        // Release inventory and reserved IMEIs
        for (const item of app.order.items) {
          if (item.imeiDeviceId) {
            await tx.imeiDevice.updateMany({
              where: { id: item.imeiDeviceId, status: ImeiStatus.RESERVED },
              data: { status: ImeiStatus.AVAILABLE },
            });
          }
          await tx.inventory.update({
            where: { variantId: item.variantId },
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
  }
}
