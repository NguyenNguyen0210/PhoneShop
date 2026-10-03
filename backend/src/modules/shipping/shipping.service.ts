import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateShippingDto,
  AssignShippingDto,
  UpdateShippingDto,
  UpdateShippingStatusDto,
  ShippingStatus,
} from './dto/shipping.dto';
import { Role } from '../../common/enums/role.enum';
import { STANDARD_SHIPPING_FEE } from '../../common/constants';
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
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
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
      return this.prisma.shipping.update({
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
    }

    return this.prisma.shipping.create({
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
  }

  async update(id: string, dto: UpdateShippingDto) {
    await this.findOne(id);
    const data: any = {
      ...(dto.providerName && { providerName: dto.providerName }),
      ...(dto.trackingNumber && { trackingNumber: dto.trackingNumber }),
      ...(dto.shippingFee !== undefined && { shippingFee: dto.shippingFee }),
      ...(dto.estimatedDeliveryDate && { estimatedDeliveryDate: new Date(dto.estimatedDeliveryDate) }),
    };
    return this.prisma.shipping.update({ where: { id }, data });
  }

  async create(dto: CreateShippingDto) {
    // Validate order exists
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Check shipping not already created
    const existing = await this.prisma.shipping.findUnique({ where: { orderId: dto.orderId } });
    if (existing) throw new BadRequestException('Shipping record already exists for this order');

    return this.prisma.shipping.create({
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
        const order = await this.prisma.order.findUnique({ where: { id: shipping.orderId } });
        if (order && (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PROCESSING)) {
          if (order.status === OrderStatus.CONFIRMED) {
            try {
              await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.PROCESSING);
            } catch (err) {
              console.warn('Auto-sync order to PROCESSING deferred:', err);
            }
          }
          await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.SHIPPING);
        }
      } catch (err) {
        console.warn('Auto-sync order to SHIPPING deferred:', err);
      }
    } else if (dto.status === ShippingStatus.DELIVERED) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: shipping.orderId } });
        if (order && order.status === OrderStatus.SHIPPING) {
          await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.DELIVERED);
        }
      } catch (err) {
        console.warn('Auto-sync order to DELIVERED deferred:', err);
      }
    } else if (dto.status === ShippingStatus.RETURNED) {
      try {
        await this.ordersService.transitionStatus(shipping.orderId, OrderStatus.RETURNED);
      } catch (err) {
        console.warn('Auto-sync order to RETURNED deferred:', err);
      }
    }

    return updated;
  }

  async findAll() {
    return this.prisma.shipping.findMany({
      include: { order: { select: { orderNumber: true, userId: true, totalAmount: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
