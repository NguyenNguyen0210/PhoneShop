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
import {
  STANDARD_SHIPPING_FEE,
  EXPRESS_SHIPPING_FEE,
  EXPRESS_2H_SHIPPING_FEE,
  ECONOMY_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  calculateShippingFee,
} from '../../common/constants';
import { getPagination, buildPaginatedResponse } from '../../common/utils/pagination.util';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus, ShippingMethod } from '@prisma/client';

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
   * Calculate shipping fee based on address/weight or method and subtotal.
   */
  estimateFee(_city?: string, _weight?: number, method: ShippingMethod = ShippingMethod.STANDARD, subtotal: number = 0): number {
    return calculateShippingFee(method, subtotal);
  }

  /**
   * Calculate shipping fee based on method and order subtotal.
   * Matches shop-wide policy for STANDARD, EXPRESS, EXPRESS_2H, ECONOMY.
   */
  calculateFee(method: ShippingMethod | string = ShippingMethod.STANDARD, subtotal: number = 0): number {
    return calculateShippingFee(method as ShippingMethod, subtotal);
  }

  /**
   * Get all 4 supported shipping methods and their calculated fees for a given subtotal.
   */
  getShippingMethods(subtotal: number = 0) {
    const isFreeThreshold = subtotal > FREE_SHIPPING_THRESHOLD;
    return [
      {
        id: ShippingMethod.ECONOMY,
        name: 'Giao tiết kiệm',
        estimatedTime: '3 - 5 ngày',
        baseFee: ECONOMY_SHIPPING_FEE,
        fee: calculateShippingFee(ShippingMethod.ECONOMY, subtotal),
        isFree: isFreeThreshold,
        discountTag: isFreeThreshold ? 'Miễn phí' : undefined,
      },
      {
        id: ShippingMethod.STANDARD,
        name: 'Giao tiêu chuẩn',
        estimatedTime: '1 - 2 ngày',
        baseFee: STANDARD_SHIPPING_FEE,
        fee: calculateShippingFee(ShippingMethod.STANDARD, subtotal),
        isFree: isFreeThreshold,
        discountTag: isFreeThreshold ? 'Miễn phí' : undefined,
      },
      {
        id: ShippingMethod.EXPRESS,
        name: 'Giao nhanh',
        estimatedTime: '24 giờ',
        baseFee: EXPRESS_SHIPPING_FEE,
        fee: calculateShippingFee(ShippingMethod.EXPRESS, subtotal),
        isFree: false,
        discountTag: isFreeThreshold ? 'Giảm 30.000₫' : undefined,
      },
      {
        id: ShippingMethod.EXPRESS_2H,
        name: 'Giao hỏa tốc 2h',
        estimatedTime: 'Nhận hàng trong 2 giờ',
        baseFee: EXPRESS_2H_SHIPPING_FEE,
        fee: calculateShippingFee(ShippingMethod.EXPRESS_2H, subtotal),
        isFree: false,
        discountTag: isFreeThreshold ? 'Giảm 30.000₫' : undefined,
      },
    ];
  }

  async assign(dto: AssignShippingDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.shipping.findUnique({ where: { orderId: dto.orderId } });

    if (existing) {
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
      return created;
    });
  }

  async update(id: string, dto: UpdateShippingDto) {
    await this.findOne(id);
    const data: any = {
      ...(dto.providerName && { providerName: dto.providerName }),
      ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
      ...(dto.shippingFee !== undefined && { shippingFee: dto.shippingFee }),
      ...(dto.estimatedDeliveryDate && { estimatedDeliveryDate: new Date(dto.estimatedDeliveryDate) }),
    };
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipping.update({ where: { id }, data });
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
      ...(dto.estimatedDeliveryDate && {
        estimatedDeliveryDate: new Date(dto.estimatedDeliveryDate),
      }),
    };
    if (dto.status === ShippingStatus.PICKED_UP) data.shippedAt = new Date();
    if (dto.status === ShippingStatus.DELIVERED) data.deliveredAt = new Date();

    const order = await this.prisma.order.findUnique({
      where: { id: shipping.orderId },
      include: { user: { select: { email: true } } },
    });
    if (!order) throw new NotFoundException('Order not found for shipment');

    const carrierUpdate = { id, previousStatus: shipping.status as ShippingStatus, data };
    const updateCarrierOnly = async () => {
      const changed = await this.prisma.shipping.updateMany({
        where: { id, status: shipping.status },
        data,
      });
      if (changed.count !== 1) {
        throw new BadRequestException('Shipping state was changed concurrently');
      }
    };

    if (dto.status === ShippingStatus.PICKED_UP || dto.status === ShippingStatus.IN_TRANSIT) {
      if (([
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.PACKED,
        OrderStatus.SHIPPING,
      ] as OrderStatus[]).includes(order.status)) {
        await this.ordersService.transitionStatus(
          order.id, OrderStatus.SHIPPING, undefined, undefined, undefined, carrierUpdate,
        );
      } else {
        throw new BadRequestException('Order cannot be marked as shipping');
      }
    } else if (dto.status === ShippingStatus.DELIVERED) {
      if (([OrderStatus.SHIPPING, OrderStatus.PACKED] as OrderStatus[]).includes(order.status)) {
        await this.ordersService.transitionStatus(
          order.id, OrderStatus.DELIVERED, undefined, undefined, undefined, carrierUpdate,
        );
      } else if (([OrderStatus.DELIVERED, OrderStatus.COMPLETED] as OrderStatus[]).includes(order.status)) {
        await updateCarrierOnly();
      } else {
        throw new BadRequestException('Order cannot be marked delivered');
      }
    } else if (dto.status === ShippingStatus.RETURNED) {
      if (order.status === OrderStatus.SHIPPING) {
        await this.ordersService.transitionStatus(
          order.id, OrderStatus.RETURNED, undefined, undefined, undefined, carrierUpdate,
        );
      } else if (order.status === OrderStatus.RETURNED) {
        await updateCarrierOnly();
      } else {
        throw new BadRequestException('Order cannot be marked returned');
      }
    } else {
      await updateCarrierOnly();
    }

    const result = await this.findOne(id);
    const firstNotice = (dto.status === ShippingStatus.PICKED_UP ||
      dto.status === ShippingStatus.IN_TRANSIT) &&
      shipping.status !== ShippingStatus.PICKED_UP &&
      shipping.status !== ShippingStatus.IN_TRANSIT;
    if (firstNotice && this.emailService && order?.user?.email) {
      try {
        await this.emailService.sendShippingNotification(
          order.user.email, order.orderNumber,
          result.trackingNumber || 'Pending',
          result.providerName || 'Carrier',
        );
      } catch (err) {
        this.logger.warn(`Shipping notification failed: ${(err as Error).message}`);
      }
    }
    return result;
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
