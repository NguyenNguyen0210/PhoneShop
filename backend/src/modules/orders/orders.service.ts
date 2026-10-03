import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, CancelOrderDto } from './dto/order.dto';
import {
  OrderStatus,
  VoucherType,
  ImeiStatus,
  WarrantyStatus,
  Prisma,
  PaymentStatus,
  PaymentMethod,
  TransactionStatus,
  TransactionType,
  RefundStatus,
  InstallmentStatus,
  ShippingMethod,
  ShippingStatus,
  StockMovementType,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PaginationQueryDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import {
  calculateShippingFee,
  computeFreeshipDiscount,
} from '../../common/constants';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryOrdersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.PACKED,
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('order-queue') private readonly orderQueue: Queue,
  ) {}

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private generateRefundNumber(): string {
    return `REF-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  calculateShippingFee(method: ShippingMethod, subtotal: number): number {
    // Single source of truth lives in common/constants (shared with vouchers).
    return calculateShippingFee(method, subtotal);
  }

  computeEstimatedDeliveryDate(method: ShippingMethod, fromDate: Date = new Date()): Date {
    const time = fromDate.getTime();
    if (method === ShippingMethod.EXPRESS_2H) {
      return new Date(time + 2 * 60 * 60 * 1000);
    }
    if (method === ShippingMethod.ECONOMY) {
      return new Date(time + 4 * 24 * 60 * 60 * 1000);
    }
    return new Date(time + 2 * 24 * 60 * 60 * 1000);
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    return this.checkout(userId, dto);
  }

  async checkout(userId: string, dto: CreateOrderDto) {
    // 1. Get cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: { inventory: true, product: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let itemsToCheckout = cart.items;
    if (dto.selectedItemIds && dto.selectedItemIds.length > 0) {
      const selectedSet = new Set(dto.selectedItemIds);
      itemsToCheckout = cart.items.filter((item) => selectedSet.has(item.id));
      if (itemsToCheckout.length === 0 || itemsToCheckout.length !== selectedSet.size) {
        throw new BadRequestException('None of the selected items were found in your cart');
      }
    }

    // 2. Verify stock
    for (const item of itemsToCheckout) {
      if (!item.variant.isActive) {
        throw new BadRequestException(`Variant ${item.variant.name} is not available`);
      }
      if (!item.variant.inventory || item.variant.inventory.availableQty < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.variant.name}`);
      }
    }

    const isInstallment = dto.paymentMethod === PaymentMethod.INSTALLMENT;
    if (isInstallment) {
      if (!dto.installmentData) {
        throw new BadRequestException('Thông tin hồ sơ trả góp không được để trống');
      }
      const birth = new Date(dto.installmentData.birthDate);
      if (isNaN(birth.getTime())) {
        throw new BadRequestException('Ngày sinh không hợp lệ');
      }
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new BadRequestException('Người đăng ký trả góp phải từ 18 tuổi trở lên');
      }
    }

    // 3. Fresh catalog prices are resolved INSIDE the transaction (M1);
    // subtotal is computed there, never from stale cart snapshots.
    const holdDurationMs = isInstallment ? 24 * 60 * 60 * 1000 : 15 * 60 * 1000;
    const holdExpiresAt = new Date(Date.now() + holdDurationMs);

    // 4. Atomic transaction with IMEI reservation, voucher validation, and inventory deduction.
    // LOW: orderNumber is Date.now()+rand — on the astronomically rare
    // collision the @unique constraint throws P2002 mid-checkout. Retry the
    // whole (rolled-back) transaction with a fresh number instead of 500ing.
    // Retries are safe: everything inside rolled back, IMEI re-picked.
    const MAX_CHECKOUT_ATTEMPTS = 3;
    let order: any = null;
    for (let attempt = 1; ; attempt++) {
      try {
        order = await this.prisma.$transaction(async (tx) => {
      // Address must belong to the buyer — never attach another user's address
      const addr = await tx.address.findFirst({
        where: { id: dto.addressId, userId },
      });
      if (!addr) {
        throw new BadRequestException('Shipping address not found');
      }

      // M1: re-read current catalog prices inside the transaction. A buyer
      // who added items before a price hike pays the CURRENT price, not the
      // stale snapshot. The cart row is refreshed too so the cart never
      // disagrees with what was charged.
      const variantIds = [...new Set(itemsToCheckout.map((i) => i.variantId))];
      const freshVariants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, price: true },
      });
      const priceByVariant = new Map(freshVariants.map((v) => [v.id, Number(v.price)]));
      const now = new Date();
      for (const item of itemsToCheckout) {
        const fresh = priceByVariant.get(item.variantId);
        if (fresh === undefined || !item.variant.isActive) {
          throw new BadRequestException(
            `Variant ${item.variant?.name || item.variantId} is no longer available`,
          );
        }

        let effectiveUnitPrice = fresh;

        // Dynamic Price Engine: Check if variant is in an active flash sale campaign
        const activeFlashItem = tx.flashSaleItem?.findFirst
          ? await tx.flashSaleItem.findFirst({
              where: {
                variantId: item.variantId,
                campaign: {
                  isActive: true,
                  startAt: { lte: now },
                  endAt: { gte: now },
                },
              },
            })
          : null;

        if (activeFlashItem && tx.flashSaleItem?.updateMany) {
          // Atomically increment soldCount if within stockLimit
          const reserved = await tx.flashSaleItem.updateMany({
            where: {
              id: activeFlashItem.id,
              soldCount: { lte: activeFlashItem.stockLimit - item.quantity },
            },
            data: {
              soldCount: { increment: item.quantity },
            },
          });

          if (reserved.count === 0) {
            const variantName = (item.variant as any).product?.name || item.variant?.name || item.variantId;
            throw new BadRequestException(
              `Sản phẩm ${variantName} đã hết suất ưu đãi Flash Sale. Vui lòng cập nhật lại giỏ hàng.`,
            );
          }

          effectiveUnitPrice = Number(activeFlashItem.flashPrice);
        }

        if (item.id && effectiveUnitPrice !== Number(item.unitPrice)) {
          await tx.cartItem.update({
            where: { id: item.id },
            data: { unitPrice: effectiveUnitPrice },
          });
        }
        (item as any).unitPrice = effectiveUnitPrice;
      }
      const subtotal = itemsToCheckout.reduce(
        (acc, item) => acc + Number(item.unitPrice) * item.quantity,
        0,
      );

      const chosenShippingMethod = dto.shippingMethod || ShippingMethod.STANDARD;
      const shippingFee = this.calculateShippingFee(chosenShippingMethod, subtotal);

      // Voucher validation inside transaction
      let discountAmount = 0;
      let voucherUsageData: { voucherId: string; discountAmount: number } | null = null;

      if (dto.voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: { code: dto.voucherCode },
        });

        if (!voucher) {
          throw new BadRequestException('Voucher not found');
        }
        if (!voucher.isActive) {
          throw new BadRequestException('Voucher is not active');
        }

        const now = new Date();
        if (voucher.startAt > now) {
          throw new BadRequestException('Voucher is not yet valid');
        }
        if (voucher.endAt < now) {
          throw new BadRequestException('Voucher has expired');
        }
        if (
          voucher.usageLimit !== null &&
          voucher.usageLimit !== undefined &&
          voucher.usageCount >= voucher.usageLimit
        ) {
          throw new BadRequestException('Voucher usage limit reached');
        }
        // H1: lock the voucher row for the rest of this transaction so that
        // concurrent checkouts using the SAME voucher are serialized. Without
        // FOR UPDATE, two simultaneous checkouts both read usageCount=0 and
        // both consume a single-use voucher (read-then-write race).
        // Table name comes from @@map("vouchers") in schema.prisma.
        await tx.$queryRaw`
          SELECT id FROM vouchers WHERE id = ${voucher.id}::uuid FOR UPDATE
        `;
        if (voucher.minOrderValue && subtotal < Number(voucher.minOrderValue)) {
          throw new BadRequestException(
            `Minimum order value is ${voucher.minOrderValue}`,
          );
        }
        if (voucher.perUserLimit) {
          const userUsage = await tx.voucherUsage.count({
            where: { voucherId: voucher.id, userId },
          });
          if (userUsage >= voucher.perUserLimit) {
            throw new BadRequestException(
              'You have reached the per-user usage limit',
            );
          }
        }

        if (voucher.type === VoucherType.PERCENTAGE) {
          discountAmount = (subtotal * Number(voucher.value)) / 100;
          if (voucher.maxDiscountAmount) {
            discountAmount = Math.min(
              discountAmount,
              Number(voucher.maxDiscountAmount),
            );
          }
        } else if (voucher.type === VoucherType.FIXED_AMOUNT) {
          discountAmount = Math.min(Number(voucher.value), subtotal);
        } else if (voucher.type === VoucherType.FREE_SHIPPING) {
          // M2: a freeship voucher discounts the SHIPPING fee (capped by its
          // value) — never the merchandise subtotal. Must match validate().
          discountAmount = computeFreeshipDiscount(Number(voucher.value), shippingFee);
        }

        voucherUsageData = { voucherId: voucher.id, discountAmount };

        // H1: conditional increment is the authoritative guard. Even if two
        // transactions passed the read-check above, only the first one whose
        // updateMany matches (usageCount still below limit) consumes the use.
        // Unlimited vouchers (usageLimit null) take the plain increment path.
        if (voucher.usageLimit !== null && voucher.usageLimit !== undefined) {
          const consumed = await tx.voucher.updateMany({
            where: { id: voucher.id, usageCount: { lt: voucher.usageLimit } },
            data: { usageCount: { increment: 1 } },
          });
          if (consumed.count === 0) {
            throw new BadRequestException('Voucher usage limit reached');
          }
        } else {
          await tx.voucher.update({
            where: { id: voucher.id },
            data: { usageCount: { increment: 1 } },
          });
        }
      }

      const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

      const orderItemsCreateData: Array<{
        variantId: string;
        productName: string;
        sku: string;
        quantity: number;
        unitPrice: any;
        discountAmount: number;
        totalPrice: number;
        imeiDeviceId: string;
      }> = [];

      for (const item of itemsToCheckout) {
        // Atomic row-level locking for available IMEIs
        const availableImeis: Array<{ id: string }> = await tx.$queryRaw`
          SELECT id FROM imei_devices
          WHERE variant_id = ${item.variantId}::uuid AND status = 'AVAILABLE'
          LIMIT ${item.quantity}
          FOR UPDATE SKIP LOCKED
        `;

        if (availableImeis.length < item.quantity) {
          throw new BadRequestException(
            `Not enough available IMEIs for variant ${item.variantId}`,
          );
        }

        // Mark those IMEIs as RESERVED
        const imeiIds = availableImeis.map((x) => x.id);
        await tx.imeiDevice.updateMany({
          where: { id: { in: imeiIds } },
          data: { status: ImeiStatus.RESERVED },
        });

        // Link reserved IMEIs to order items
        for (const imei of availableImeis) {
          orderItemsCreateData.push({
            variantId: item.variantId,
            productName: (item.variant as any).product?.name || item.variant.name,
            sku: item.variant.sku,
            quantity: 1,
            unitPrice: item.unitPrice,
            discountAmount: 0,
            totalPrice: Number(item.unitPrice),
            imeiDeviceId: imei.id,
          });
        }

        // Adjust inventory: atomic hold — the read-check before the
        // transaction is advisory only; this conditional updateMany is the
        // authoritative guard. Concurrent checkouts racing for the last units
        // get count===0 here instead of overselling into negative stock.
        const held = await tx.inventory.updateMany({
          where: { variantId: item.variantId, availableQty: { gte: item.quantity } },
          data: {
            reservedQty: { increment: item.quantity },
            availableQty: { decrement: item.quantity },
          },
        });
        if (held.count === 0) {
          throw new BadRequestException(`Insufficient stock for ${item.variant.name}`);
        }
      }

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId,
          addressId: dto.addressId,
          subtotal,
          discountAmount,
          shippingFee,
          shippingMethod: chosenShippingMethod,
          taxAmount: 0,
          totalAmount,
          voucherCode: dto.voucherCode,
          customerNote: dto.customerNote,
          holdExpiresAt,
          items: {
            create: orderItemsCreateData,
          },
        },
        include: { items: true },
      });

      // Create Shipping record
      const estimatedDeliveryDate = this.computeEstimatedDeliveryDate(chosenShippingMethod);
      if (tx.shipping?.create) {
        const shippingRecord = await tx.shipping.create({
          data: {
            orderId: newOrder.id,
            providerName:
              chosenShippingMethod === ShippingMethod.EXPRESS_2H
                ? 'Giao hàng Hỏa tốc 2h'
                : chosenShippingMethod === ShippingMethod.ECONOMY
                  ? 'Giao hàng Tiết kiệm'
                  : 'Giao hàng Tiêu chuẩn',
            shippingFee,
            status: ShippingStatus.PENDING,
            estimatedDeliveryDate,
          },
        });
        (newOrder as any).shipping = shippingRecord;
      }

      if (isInstallment && dto.installmentData) {
        const prepayAmount = Math.round(
          (Number(totalAmount) * dto.installmentData.prepayPercent) / 100,
        );
        const loanAmount = Number(totalAmount) - prepayAmount;
        const monthlyAmount = Math.round(
          loanAmount / dto.installmentData.termMonths,
        );

        if (tx.payment?.create) {
          await tx.payment.create({
            data: {
              orderId: newOrder.id,
              method: PaymentMethod.INSTALLMENT,
              status: PaymentStatus.PENDING,
              amount: totalAmount,
            },
          });
        }

        if (tx.installmentApplication?.create) {
          const installmentApp = await tx.installmentApplication.create({
            data: {
              orderId: newOrder.id,
              userId,
              provider: dto.installmentData.provider,
              status: InstallmentStatus.PENDING,
              termMonths: dto.installmentData.termMonths,
              prepayPercent: dto.installmentData.prepayPercent,
              prepayAmount: new Prisma.Decimal(prepayAmount),
              loanAmount: new Prisma.Decimal(loanAmount),
              monthlyAmount: new Prisma.Decimal(monthlyAmount),
              fullName: dto.installmentData.fullName,
              citizenId: dto.installmentData.citizenId,
              birthDate: new Date(dto.installmentData.birthDate),
              phoneNumber: dto.installmentData.phoneNumber,
              currentAddress: dto.installmentData.currentAddress,
              incomeRange: dto.installmentData.incomeRange,
              cccdFrontUrl: dto.installmentData.cccdFrontUrl,
              cccdBackUrl: dto.installmentData.cccdBackUrl,
            },
          });
          (newOrder as any).installmentApplication = installmentApp;
        }
      }

      // Record voucher usage
      if (voucherUsageData) {
        await tx.voucherUsage.create({
          data: {
            voucherId: voucherUsageData.voucherId,
            userId,
            orderId: newOrder.id,
            discountAmount: voucherUsageData.discountAmount,
          },
        });
        // H1 (per-user cap): re-count INSIDE the same transaction after our own
        // insert. Combined with the FOR UPDATE row lock above (which serializes
        // all checkouts consuming this voucher), a concurrent second checkout
        // for the same user either blocks until we commit (then sees count+1
        // and fails) or fails here — fail-closed, the whole checkout rolls back.
        const voucherForCap = await tx.voucher.findUnique({
          where: { id: voucherUsageData.voucherId },
          select: { perUserLimit: true },
        });
        if (voucherForCap?.perUserLimit) {
          const finalUsage = await tx.voucherUsage.count({
            where: { voucherId: voucherUsageData.voucherId, userId },
          });
          if (finalUsage > voucherForCap.perUserLimit) {
            throw new BadRequestException(
              'You have reached the per-user usage limit',
            );
          }
        }
      }

      // Selective cart clear: delete only purchased items
      const purchasedItemIds = itemsToCheckout.map((i) => i.id);
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          id: { in: purchasedItemIds },
        },
      });

      return newOrder;
        });
        break; // success
      } catch (err: any) {
        const target = (err as any)?.meta?.target;
        const isOrderNumberCollision =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          (Array.isArray(target) ? target.join(',') : String(target || '')).includes('order_number');
        if (!isOrderNumberCollision || attempt >= MAX_CHECKOUT_ATTEMPTS) throw err;
        this.logger.warn(`Checkout orderNumber collision, retrying (attempt ${attempt + 1})`);
      }
    }

    // 6. Push BullMQ job for hold auto-release (15m standard, 24h installment)
    try {
      await this.orderQueue.add(
        'expire-order-hold',
        { orderId: order.id },
        { delay: holdDurationMs },
      );
      this.logger.log(`Enqueued ${isInstallment ? '24h' : '15m'} hold expiry job for order ${order.id}`);
    } catch (queueErr) {
      this.logger.error(
        `Failed to enqueue expire-order-hold job for order ${order.id}:`,
        (queueErr as Error).message,
      );
      // H7 fallback: if the queue is down (or the local fallback silently
      // drops delayed jobs), the hold would otherwise never expire and stock
      // stays RESERVED forever. Schedule an in-process release as backstop.
      // NOTE: single-instance safety net only — with multiple instances the
      // BullMQ job is authoritative; this timer is a no-op if the order is
      // already confirmed/cancelled (guarded by conditional updateMany).
      const delayMs = Math.max(0, holdExpiresAt.getTime() - Date.now());
      const timer = setTimeout(() => {
        this.releaseExpiredHold(order.id).catch((err) =>
          this.logger.error(
            `Fallback hold release failed for order ${order.id}:`,
            (err as Error).message,
          ),
        );
      }, delayMs);
      // H7 safety: unref so the timer never keeps the process alive alone.
      if (typeof (timer as any)?.unref === 'function') (timer as any).unref();
    }

    return order;
  }

  // ── H7: FALLBACK HOLD RELEASE ─────────────────────────────────
  // Same guarded semantics as OrdersProcessor.handleExpireOrderHold:
  // only a still-PENDING order is cancelled; IMEI/inventory release is
  // status-filtered so concurrent cancel paths cannot double-release.
  // Voucher use is rolled back together (H2).
  async releaseExpiredHold(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.status !== OrderStatus.PENDING) return false;

    let cancelled = false;
    await this.prisma.$transaction(async (tx) => {
      const affected = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledReason: 'Hold expired (15 minutes)',
        },
      });
      if (affected.count === 0) return;
      cancelled = true;

      if (tx.installmentApplication?.updateMany) {
        await tx.installmentApplication.updateMany({
          where: { orderId, status: InstallmentStatus.PENDING },
          data: {
            status: InstallmentStatus.CANCELLED,
            rejectionReason: 'Hết thời hạn 24h thẩm định hồ sơ',
          },
        });
      }

      await this.rollbackVoucherUsage(tx, order);

      for (const item of order.items) {
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
    });

    if (cancelled) {
      this.logger.log(`Fallback released expired hold for order ${orderId}`);
    }
    return cancelled;
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payments: true, installmentApplication: true, shipping: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyOrder(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
            imeiDevice: true,
          },
        },
        payments: true,
        address: true,
        installmentApplication: true,
        shipping: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAll(query: QueryOrdersDto = {}): Promise<PaginatedResponse<any>> {
    const page = Number(query?.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query?.limit) > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
        { address: { recipientName: { contains: searchTerm, mode: 'insensitive' } } },
        { address: { phone: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { phone: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: true,
          address: true,
          items: {
            include: {
              variant: { include: { product: true } },
              imeiDevice: true,
            },
          },
          payments: true,
          installmentApplication: true,
          shipping: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data = orders.map((o) => {
      const customerName =
        o.address?.recipientName ||
        (o.user ? `${o.user.lastName || ''} ${o.user.firstName || ''}`.trim() : 'Khách hàng');
      const shippingPhone = o.address?.phone || o.user?.phone || '';
      const shippingAddress = o.address
        ? `${o.address.addressLine1}, ${o.address.ward ? o.address.ward + ', ' : ''}${o.address.district ? o.address.district + ', ' : ''}${o.address.city}`
        : '';
      const primaryPayment = o.payments?.[0];

      return {
        ...o,
        customerName,
        shippingPhone,
        shippingAddress,
        paymentMethod: primaryPayment?.method || 'COD',
        paymentStatus: primaryPayment?.status || 'PENDING',
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        items: { include: { variant: { include: { product: true } }, imeiDevice: true } },
        payments: { include: { transactions: true } },
        address: true,
        installmentApplication: true,
        shipping: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const customerName =
      order.address?.recipientName ||
      (order.user ? `${order.user.lastName || ''} ${order.user.firstName || ''}`.trim() : 'Khách hàng');
    const shippingPhone = order.address?.phone || order.user?.phone || '';
    const shippingAddress = order.address
      ? `${order.address.addressLine1}, ${order.address.ward ? order.address.ward + ', ' : ''}${order.address.district ? order.address.district + ', ' : ''}${order.address.city}`
      : '';
    const primaryPayment = order.payments?.[0];

    return {
      ...order,
      customerName,
      shippingPhone,
      shippingAddress,
      paymentMethod: primaryPayment?.method || 'COD',
      paymentStatus: primaryPayment?.status || 'PENDING',
    };
  }

  // ── H2: VOUCHER ROLLBACK ────────────────────────────────────
  // A cancelled/expired order must give its voucher use back: decrement the
  // global counter and remove this order's usage row. Must run INSIDE the
  // same transaction as the cancellation so the two can never diverge.
  private async rollbackVoucherUsage(
    tx: any,
    order: { id: string; voucherCode: string | null },
  ): Promise<void> {
    if (!order.voucherCode) return;
    const voucher = await tx.voucher.findUnique({
      where: { code: order.voucherCode },
      select: { id: true },
    });
    if (voucher) {
      await tx.voucher.update({
        where: { id: voucher.id },
        data: { usageCount: { decrement: 1 } },
      });
    }
    await tx.voucherUsage.deleteMany({ where: { orderId: order.id } });
  }

  // ── INVENTORY SETTLEMENT ────────────────────────────────
  // A delivered sale converts the hold into a real deduction: the reserved
  // units leave the warehouse, so reservedQty AND physical quantity drop
  // together. availableQty is untouched — it was already decremented at
  // hold time. Guarded on reservedQty so a concurrent release can never
  // drive the counters negative; a no-op means nothing was reserved.
  private async settleInventory(
    tx: any,
    items: Array<{ variantId: string; quantity: number }>,
  ): Promise<void> {
    for (const item of items) {
      await tx.inventory.updateMany({
        where: { variantId: item.variantId, reservedQty: { gte: item.quantity } },
        data: {
          reservedQty: { decrement: item.quantity },
          quantity: { decrement: item.quantity },
        },
      });
    }
  }

  async transitionStatus(
    id: string,
    newStatus: OrderStatus,
    staffId?: string,
    reason?: string,
    shippingInfo?: { providerName?: string; trackingNumber?: string; estimatedDeliveryDate?: string },
  ) {
    const order = await this.findOne(id);
    // Guarded-transition anchor: the final write re-checks this status so a
    // concurrent transition (or the hold-expiry job) cannot be overwritten.
    const oldStatus = order.status;

    const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]:    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]:  [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
      [OrderStatus.PACKED]:     [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPING]:   [OrderStatus.DELIVERED, OrderStatus.RETURNED],
      [OrderStatus.DELIVERED]:  [OrderStatus.COMPLETED, OrderStatus.RETURNED],
    };

    const allowed = allowedTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}`,
      );
    }

    const data: any = { status: newStatus };
    const now = new Date();
    if (newStatus === OrderStatus.CONFIRMED)  data.confirmedAt  = now;
    if (newStatus === OrderStatus.PACKED)     data.packedAt     = now;
    if (newStatus === OrderStatus.SHIPPING)   data.shippedAt    = now;
    if (newStatus === OrderStatus.DELIVERED)  data.deliveredAt  = now;
    if (newStatus === OrderStatus.COMPLETED)  data.completedAt  = now;
    if (newStatus === OrderStatus.CANCELLED)  data.cancelledAt  = now;
    // M10: persist the staff-supplied cancellation reason instead of
    // silently dropping the request body (user-cancel already stores its own).
    if (newStatus === OrderStatus.CANCELLED && reason) data.cancelledReason = reason;

    return this.prisma.$transaction(async (tx) => {
      // When transitioning from PENDING, CONFIRMED, PROCESSING, or PACKED to CANCELLED: release reserved IMEIs back to AVAILABLE and restore inventory availableQty
      if (
        newStatus === OrderStatus.CANCELLED &&
        ([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.PACKED] as OrderStatus[]).includes(order.status)
      ) {
        if (tx.installmentApplication?.updateMany) {
          await tx.installmentApplication.updateMany({
            where: { orderId: id, status: InstallmentStatus.PENDING },
            data: {
              status: InstallmentStatus.CANCELLED,
              rejectionReason: reason || 'Đơn hàng bị hủy bởi nhân viên',
            },
          });
        }
        await this.rollbackVoucherUsage(tx, order);
        // P2: cancelling a PAID order must refund it in the same transaction —
        // otherwise stock comes back while the money stays captured.
        const paid = (order.payments || []).find(
          (p: any) => p.status === PaymentStatus.PAID,
        );
        if (paid) {
          const existingRefund = await tx.refund.findFirst({
            where: {
              paymentId: paid.id,
              status: { notIn: [RefundStatus.FAILED, RefundStatus.CANCELLED] },
            },
            select: { id: true },
          });
          if (!existingRefund) {
            await tx.refund.create({
              data: {
                paymentId: paid.id,
                refundNumber: this.generateRefundNumber(),
                amount: paid.amount,
                status: RefundStatus.PENDING,
                reason: `Auto-created: paid order ${order.orderNumber} cancelled by staff`,
              },
            });
          }
        }
        for (const item of order.items) {
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
      }

      // When transitioning order to DELIVERED or COMPLETED: update all assigned IMEIs to SOLD and set soldAt: new Date()
      // H6: status-filtered so an IMEI that was meanwhile BLOCKED (lost,
      // stolen, QC-failed) is NOT silently resurrected to SOLD by delivery.
      // H8: activate warranties here too — COD/manual orders never pass the
      // VNPay IPN, so without this they would ship with no warranty rows and
      // customers could not claim. End date follows product.warrantyMonths.
      if (newStatus === OrderStatus.DELIVERED || newStatus === OrderStatus.COMPLETED) {
        // Decrement physical stock & reservedQty, record EXPORT_ORDER movement
        // Avoid duplicate deduction if already DELIVERED when transitioning to COMPLETED
        if (order.status !== OrderStatus.DELIVERED && tx.inventory) {
          for (const item of order.items) {
            await tx.inventory.update({
              where: { variantId: item.variantId },
              data: {
                quantity: { decrement: item.quantity },
                reservedQty: { decrement: item.quantity },
              },
            });

            const inv = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
            const balanceAfter = inv ? inv.quantity : 0;
            const balanceBefore = balanceAfter + item.quantity;
            const unitPrice = Number(item.unitPrice || 0);
            const totalAmount = item.quantity * unitPrice;

            if (tx.stockMovement) {
              await tx.stockMovement.create({
                data: {
                  variantId: item.variantId,
                  type: StockMovementType.EXPORT_ORDER,
                  quantity: -item.quantity,
                  balanceBefore,
                  balanceAfter,
                  unitPrice,
                  totalAmount,
                  referenceType: 'ORDER',
                  referenceId: order.orderNumber,
                  note: `Xuất kho giao đơn hàng #${order.orderNumber}`,
                },
              });
            }
          }
        }

        const imeiIds = order.items
          .map((item) => item.imeiDeviceId)
          .filter((imeiId): imeiId is string => Boolean(imeiId));

        if (imeiIds.length > 0) {
          await tx.imeiDevice.updateMany({
            where: { id: { in: imeiIds }, status: ImeiStatus.RESERVED },
            data: {
              status: ImeiStatus.SOLD,
              soldAt: now,
            },
          });
        }

        // Settle exactly once per fulfilled order: entering DELIVERED consumes
        // the reservation (COMPLETED is only reachable from DELIVERED, so it
        // must NOT settle again or one sale would deduct stock twice).
        if (oldStatus !== OrderStatus.DELIVERED) {
          await this.settleInventory(tx, order.items);
        }

        // P3: cash is collected at the door — flip pending COD payments to
        // PAID on delivery so finance never shows delivered orders as unpaid.
        // (VietQR/bank-transfer rows stay manual: only a bank reference proves
        // the money arrived.) Idempotent via the PENDING filter.
        const codPending = await tx.payment.findMany({
          where: { orderId: id, method: PaymentMethod.COD, status: PaymentStatus.PENDING },
          select: { id: true, amount: true },
        });
        for (const cp of codPending) {
          await tx.payment.update({
            where: { id: cp.id },
            data: { status: PaymentStatus.PAID, paidAt: now },
          });
          await tx.paymentTransaction.create({
            data: {
              paymentId: cp.id,
              transactionCode: `COD-${Date.now()}-${randomBytes(2).toString('hex').toUpperCase()}`,
              type: TransactionType.PAYMENT,
              status: TransactionStatus.SUCCESS,
              amount: cp.amount,
              providerReference: 'CASH_ON_DELIVERY',
            },
          });
        }

        const warrantable = await tx.orderItem.findMany({
          where: { orderId: id, imeiDeviceId: { not: null } },
          include: {
            variant: { include: { product: { select: { warrantyMonths: true } } } },
          },
        });
        for (const item of warrantable) {
          const months = item.variant?.product?.warrantyMonths ?? 12;
          const startDate = newStatus === OrderStatus.DELIVERED ? now : (order.deliveredAt || now);
          // P7: clamp to month-end (Jan 31 + 1mo → Feb 28/29, not Mar 2-3).
          const endDate = new Date(startDate);
          const startDay = endDate.getDate();
          endDate.setMonth(endDate.getMonth() + months);
          if (endDate.getDate() < startDay) endDate.setDate(0);
          const warrantyCode = `WRT-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
          await tx.warranty.upsert({
            where: { orderItemId: item.id },
            // Never overwrite an existing (e.g. IPN-created) warranty's dates.
            update: {},
            create: {
              userId: order.userId,
              productVariantId: item.variantId,
              orderItemId: item.id,
              imeiDeviceId: item.imeiDeviceId,
              warrantyCode,
              startDate,
              endDate,
              status: WarrantyStatus.ACTIVE,
              notes: 'Kích hoạt khi giao hàng/hoàn tất đơn hàng',
            },
          });
        }
      }

      if (newStatus === OrderStatus.SHIPPING && tx.shipping) {
        const shippingUpdateData: any = {
          status: ShippingStatus.READY_TO_SHIP,
          shippedAt: now,
        };
        if (shippingInfo?.providerName) {
          shippingUpdateData.providerName = shippingInfo.providerName;
        }
        if (shippingInfo?.trackingNumber) {
          shippingUpdateData.trackingNumber = shippingInfo.trackingNumber;
        }
        if (shippingInfo?.estimatedDeliveryDate) {
          shippingUpdateData.estimatedDeliveryDate = new Date(shippingInfo.estimatedDeliveryDate);
        }

        await tx.shipping.upsert({
          where: { orderId: id },
          update: shippingUpdateData,
          create: {
            orderId: id,
            providerName: shippingInfo?.providerName || 'Giao hàng Tiêu chuẩn',
            trackingNumber: shippingInfo?.trackingNumber,
            estimatedDeliveryDate: shippingInfo?.estimatedDeliveryDate ? new Date(shippingInfo.estimatedDeliveryDate) : undefined,
            status: ShippingStatus.READY_TO_SHIP,
            shippedAt: now,
          },
        });
      }

      // Guarded write: only the holder of oldStatus wins. A concurrent
      // transition (or hold-expiry cancel) that already moved the order makes
      // count===0 — the whole transaction rolls back instead of silently
      // overwriting it and double-applying the side effects above.
      const claimed = await tx.order.updateMany({
        where: { id, status: oldStatus },
        data,
      });
      if (claimed.count === 0) {
        throw new ConflictException(
          `Order status changed concurrently (expected ${oldStatus}); please refresh and retry`,
        );
      }
      return { ...order, ...data };
    });
  }

  async cancelMyOrder(userId: string, id: string, dto: CancelOrderDto) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
    if (!order) throw new NotFoundException('Order not found');

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled in its current status');
    }

    // P2: a paid order must never be cancelled into thin air — the money
    // would stay PAID with no refund row. Buyers go through return/refund;
    // staff use the admin cancel path (which auto-creates the refund below).
    const paidPayment = await this.prisma.payment.findFirst({
      where: { orderId: id, status: PaymentStatus.PAID },
      select: { id: true },
    });
    if (paidPayment) {
      throw new BadRequestException(
        'Order is already paid and cannot be cancelled directly. Please request a return to receive a refund.',
      );
    }

    // Release reserved stock & IMEIs
    const items = await this.prisma.orderItem.findMany({ where: { orderId: id } });
    await this.prisma.$transaction(async (tx) => {
      // H2: give the voucher use back together with the stock release
      const guarded = await tx.order.updateMany({
        where: { id, userId, status: { in: CANCELLABLE_STATUSES } },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledReason: dto.reason,
        },
      });
      // Another concurrent cancellation (or the hold-expiry job) already took
      // this order — abort instead of double-releasing inventory (H2/H7).
      if (guarded.count === 0) {
        throw new BadRequestException('Order cannot be cancelled in its current status');
      }

      if (tx.installmentApplication?.updateMany) {
        await tx.installmentApplication.updateMany({
          where: { orderId: id, status: InstallmentStatus.PENDING },
          data: {
            status: InstallmentStatus.CANCELLED,
            rejectionReason: dto.reason || 'Khách hàng hủy đơn hàng',
          },
        });
      }

      await this.rollbackVoucherUsage(tx, order);

      for (const item of items) {
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
    });

    return this.prisma.order.findUnique({ where: { id } });
  }
}
