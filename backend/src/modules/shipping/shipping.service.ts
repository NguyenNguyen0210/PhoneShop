import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShippingDto, UpdateShippingStatusDto, ShippingStatus } from './dto/shipping.dto';

const STATUS_TRANSITIONS: Partial<Record<ShippingStatus, ShippingStatus[]>> = {
  [ShippingStatus.PENDING]:       [ShippingStatus.READY_TO_SHIP],
  [ShippingStatus.READY_TO_SHIP]: [ShippingStatus.PICKED_UP],
  [ShippingStatus.PICKED_UP]:     [ShippingStatus.IN_TRANSIT],
  [ShippingStatus.IN_TRANSIT]:    [ShippingStatus.DELIVERED, ShippingStatus.FAILED],
  [ShippingStatus.FAILED]:        [ShippingStatus.IN_TRANSIT, ShippingStatus.RETURNED],
};

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate shipping fee based on address/weight (placeholder logic).
   * Replace with actual carrier API call.
   */
  estimateFee(_city?: string, _weight?: number): number {
    return 30_000; // flat rate 30,000 VND
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
        shippingFee: dto.shippingFee ?? this.estimateFee(),
        estimatedDeliveryDate: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : undefined,
      },
    });
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

    return this.prisma.shipping.update({ where: { id }, data });
  }

  async findAll() {
    return this.prisma.shipping.findMany({
      include: { order: { select: { orderNumber: true, userId: true, totalAmount: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
