import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import {
  CreateShippingDto,
  AssignShippingDto,
  UpdateShippingDto,
  UpdateShippingStatusDto,
  UpdateOrderShippingDto,
  ShippingStatus,
} from './dto/shipping.dto';
import { Role } from '../../common/enums/role.enum';
import { STANDARD_SHIPPING_FEE } from '../../common/constants';
import { getPagination, buildPaginatedResponse } from '../../common/utils/pagination.util';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '@prisma/client';

const STATUS_TRANSITIONS: Partial<Record<ShippingStatus, ShippingStatus[]>> = {
  [ShippingStatus.PENDING]:       [ShippingStatus.READY_TO_SHIP],
  [ShippingStatus.READY_TO_SHIP]: [ShippingStatus.PICKED_UP],
  [ShippingStatus.PICKED_UP]:     [ShippingStatus.IN_TRANSIT],
  [ShippingStatus.IN_TRANSIT]:    [ShippingStatus.DELIVERED, ShippingStatus.FAILED, ShippingStatus.RETURNED],
  [ShippingStatus.FAILED]:        [ShippingStatus.IN_TRANSIT, ShippingStatus.RETURNED],
};

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Optional()
    private readonly emailService?: EmailService,
  ) {}

  /**
   * Calculate shipping fee based on address/weight (placeholder logic).
   * Replace with actual carrier API call.
   */
  estimateFee(_city?: string, _weight?: number): number {
    return STANDARD_SHIPPING_FEE;
  }

  async assign(dto: AssignShippingDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.shipping.findUnique({ where: { orderId: dto.orderId } });

    if (existing) {
      const fee = dto.shippingFee ?? Number(existing.shippingFee);
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.shipping.update({
          where: { id: existing.id },
          data: {
            providerName: dto.providerName,
            trackingNumber: dto.trackingNumber ?? existing.trackingNumber,
            shippingFee: dto.shippingFee ?? existing.shippingFee,
            estimatedDeliveryDate: dto.estimatedDeliveryDate
              ? new Date(dto.estimatedDeliveryDate)
              : existing.estimatedDeliveryDate,
            status:
              existing.status === ShippingStatus.PENDING
                ? ShippingStatus.READY_TO_SHIP
                : existing.status,
          },
        });
        // Keep the order's charged fee in sync with the shipping record.
        if (dto.shippingFee !== undefined) {
          await tx.order.update({
            where: { id: dto.orderId },
            data: { shippingFee: fee },
          });
        }
        return updated;
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.shipping.create({
        data: {
          orderId: dto.orderId,
          providerName: dto.providerName,
          trackingNumber: dto.trackingNumber,
          shippingFee: dto.shippingFee ?? Number(order.shippingFee) ?? this.estimateFee(),
          estimatedDeliveryDate: dto.estimatedDeliveryDate
            ? new Date(dto.estimatedDeliveryDate)
            : undefined,
          status: ShippingStatus.READY_TO_SHIP,
        },
      });
      if (dto.shippingFee !== undefined && Number(dto.shippingFee) !== Number(order.shippingFee)) {
        await tx.order.update({
          where: { id: dto.orderId },
          data: { shippingFee: dto.shippingFee },
        });
      }
      return created;
    });
  }

  async update(id: string, dto: UpdateShippingDto) {
    const existing = await this.findOne(id);
    const data: any = {
      ...(dto.providerName && { providerName: dto.providerName }),
      ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
      ...(dto.shippingFee !== undefined && { shippingFee: dto.shippingFee }),
      ...(dto.estimatedDeliveryDate && { estimatedDeliveryDate: new Date(dto.estimatedDeliveryDate) }),
    };
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipping.update({ where: { id }, data });
      // Keep the order's charged fee in sync with the shipping record.
      if (dto.shippingFee !== undefined) {
        await tx.order.update({
          where: { id: existing.orderId },
          data: { shippingFee: dto.shippingFee },
        });
      }
      return updated;
    });
  }

  async create(dto: CreateShippingDto) {
    // Validate order exists
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Check shipping not already created
    const existing = await this.prisma.shipping.findUnique({ where: { orderId: dto.orderId } });
    if (existing) throw new BadRequestException('Shipping record already exists for this order');

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.shipping.create({
        data: {
          orderId: dto.orderId,
          providerName: dto.providerName,
          trackingNumber: dto.trackingNumber,
          // P1: fee defaults to what the buyer was actually charged — a
          // caller-supplied fee decoupled from the order is a bookkeeping hole.
          shippingFee: dto.shippingFee ?? Number(order.shippingFee) ?? this.estimateFee(),
          estimatedDeliveryDate: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : undefined,
        },
      });
      if (dto.shippingFee !== undefined && Number(dto.shippingFee) !== Number(order.shippingFee)) {
        await tx.order.update({
          where: { id: dto.orderId },
          data: { shippingFee: dto.shippingFee },
        });
      }
      return created;
    });
  }

  // P1: owner-or-staff scoping — tracking numbers are private logistics data.
  private isPrivileged(user: any): boolean {
    const roles: string[] = user?.roles ?? [];
    return (
      user?.role === Role.STAFF || user?.role === Role.MANAGER || user?.role === Role.ADMIN ||
      roles.includes(Role.STAFF) || roles.includes(Role.MANAGER) || roles.includes(Role.ADMIN)
    );
  }

  async findByOrderScoped(orderId: string, user: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!this.isPrivileged(user) && order.userId !== user?.id) {
      throw new NotFoundException('Shipping not found for this order');
    }
    return this.findByOrder(orderId);
  }

  async findOneScoped(id: string, user: any) {
    const shipping = await this.findOne(id);
    const order = await this.prisma.order.findUnique({
      where: { id: shipping.orderId },
      select: { userId: true },
    });
    if (!this.isPrivileged(user) && order?.userId !== user?.id) {
      throw new NotFoundException('Shipping record not found');
    }
    return shipping;
  }

  async findByOrder(orderId: string) {
    const shipping = await this.prisma.shipping.findUnique({ where: { orderId } });
    if (!shipping) throw new NotFoundException('Shipping not found for this order');
    return shipping;
  }

  async findOne(id: string) {
    const shipping = await this.prisma.shipping.findUnique({ where: { id } });
    if (!shipping) throw new NotFoundException('Shipping record not found');
    return shipping;
  }

  async updateStatus(id: string, dto: UpdateShippingStatusDto) {
    const shipping = await this.findOne(id);

    const allowed = STATUS_TRANSITIONS[shipping.status as ShippingStatus] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition shipping status from ${shipping.status} to ${dto.status}`,
      );
    }

    const data: any = {
      status: dto.status,
      ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
      ...(dto.estimatedDeliveryDate && { estimatedDeliveryDate: new Date(dto.estimatedDeliveryDate) }),
    };

    if (dto.status === ShippingStatus.PICKED_UP) data.shippedAt = new Date();
    if (dto.status === ShippingStatus.DELIVERED) data.deliveredAt = new Date();

    const updated = await this.prisma.shipping.update({ where: { id }, data });

    if (dto.status === ShippingStatus.PICKED_UP || dto.status === ShippingStatus.IN_TRANSIT) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: shipping.orderId },
          include: { user: { select: { email: true } } },
        });
        if (order && (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PROCESSING || order.status === OrderStatus.PACKED)) {
          if (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PROCESSING) {
            try {
              await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.PACKED);
            } catch (err) {
              this.logger.warn(
                `Auto-sync order ${shipping.orderId} to PACKED deferred (shipping ${id} is ${dto.status}): ${(err as Error).message}`,
              );
            }
          }
          await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.SHIPPING);
        }

        const isFirstShippingNotice =
          (dto.status === ShippingStatus.PICKED_UP || dto.status === ShippingStatus.IN_TRANSIT) &&
          shipping.status !== ShippingStatus.PICKED_UP &&
          shipping.status !== ShippingStatus.IN_TRANSIT;

        if (this.emailService && order?.user?.email && isFirstShippingNotice) {
          try {
            await this.emailService.sendShippingNotification(
              order.user.email,
              order.orderNumber,
              updated.trackingNumber || 'Đang cập nhật',
              updated.providerName || 'Đơn vị vận chuyển',
            );
          } catch (e) {
            this.logger.warn(
              `Failed to send shipping email for order ${shipping.orderId}: ${(e as Error).message}`,
            );
          }
        }
      } catch (err) {
        this.logger.warn(
          `Auto-sync order ${shipping.orderId} to SHIPPING failed (shipping ${id} is ${dto.status}): ${(err as Error).message}`,
        );
      }
    } else if (dto.status === ShippingStatus.DELIVERED) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: shipping.orderId } });
        if (order && (order.status === OrderStatus.SHIPPING || order.status === OrderStatus.PACKED)) {
          await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.DELIVERED);
        }
      } catch (err) {
        this.logger.warn(
          `Auto-sync order ${shipping.orderId} to DELIVERED failed (shipping ${id} is ${dto.status}): ${(err as Error).message}`,
        );
      }
    } else if (dto.status === ShippingStatus.RETURNED) {
      try {
        await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.RETURNED);
      } catch (err) {
        this.logger.warn(
          `Auto-sync order ${shipping.orderId} to RETURNED failed (shipping ${id} is ${dto.status}): ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }

  async findAll(page?: number | string, limit?: number | string) {
    const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit, 20);
    const [total, data] = await Promise.all([
      this.prisma.shipping.count(),
      this.prisma.shipping.findMany({
        include: { order: { select: { orderNumber: true, userId: true, totalAmount: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);
    return buildPaginatedResponse(data, total, safePage, safeLimit);
  }

  async updateByOrder(orderId: string, dto: UpdateOrderShippingDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const updateData: any = {};
    if (dto.providerName) updateData.providerName = dto.providerName;
    if (dto.trackingNumber !== undefined) updateData.trackingNumber = dto.trackingNumber;
    if (dto.estimatedDeliveryDate) {
      updateData.estimatedDeliveryDate = new Date(dto.estimatedDeliveryDate);
    }

    return this.prisma.shipping.upsert({
      where: { orderId },
      update: updateData,
      create: {
        orderId,
        providerName: dto.providerName || 'Giao hàng Tiêu chuẩn',
        trackingNumber: dto.trackingNumber,
        estimatedDeliveryDate: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : undefined,
      },
    });
  }
}
