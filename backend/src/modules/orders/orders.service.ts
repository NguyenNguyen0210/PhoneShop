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
import { rollbackFlashSoldCount } from './flash-sale-rollback.util';
import { WarrantyService } from '../warranty/warranty.service';
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Order identifiers in URLs may be an orderNumber OR a UUID. Passing a raw
// non-UUID token to a `uuid` column makes Postgres fail the cast (22P02) and
// surfaces as a 500 — only compare the id column for real UUIDs.
const isUuid = (v: string) => UUID_RE.test(v || '');

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly emailService?: EmailService,
    @Optional() private readonly warrantyService?: WarrantyService,
  ) {}

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  /**
   * Single source of truth for voucher money math. MUST stay formula-identical
   * with `vouchers.service.ts validate()` (parity contract asserted by
   * test/unit/vouchers-validate-parity.spec.ts): percentage discounts are
   * rounded to whole VND, capped by maxDiscountAmount, then by the subtotal;
   * fixed discounts are capped by the subtotal; freeship discounts the
   * shipping fee capped by its value.
   */
  private computeVoucherDiscount(
    voucher: any,
    subtotal: number,
    shippingFee: number,
  ): number {
    if (voucher.type === VoucherType.PERCENTAGE) {
      let discount = Math.round((subtotal * Number(voucher.value)) / 100);
      if (voucher.maxDiscountAmount) {
        discount = Math.min(discount, Number(voucher.maxDiscountAmount));
      }
      return Math.min(discount, subtotal);
    }
    if (voucher.type === VoucherType.FIXED_AMOUNT) {
      return Math.min(Number(voucher.value), subtotal);
    }
    if (voucher.type === VoucherType.FREE_SHIPPING) {
      return computeFreeshipDiscount(Number(voucher.value), shippingFee);
    }
    return 0;
  }

  /**
   * Cancelling a captured (PAID/PROCESSING) payment order would collect money
   * with no refund record and leave SOLD IMEIs behind phantom stock. Both the
   * staff path (transitionStatus → CANCELLED) and the buyer path
   * (cancelMyOrder) re-check INSIDE the release transaction so a payment that
   * confirmed concurrently rolls the whole cancel back.
   */
  private async assertNoCapturedPayment(tx: any, orderId: string) {
    const paid = await tx.payment?.findFirst?.({
      where: {
        orderId,
        status: { in: [PaymentStatus.PAID, PaymentStatus.PROCESSING] },
      },
      select: { id: true },
    });
    if (paid) {
      throw new BadRequestException(
        'Order is already paid and cannot be cancelled. Please contact support.',
      );
    }
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
              include: {
                inventory: true,
                product: { include: { brand: true } },
              },
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
      itemsToCheckout = cart.items.filter(
        (item) => selectedSet.has(item.id) || selectedSet.has(item.variantId),
      );
      // Canonical match: a token is satisfied when it equals an item's id OR
      // its variantId. Sending BOTH tokens for the same line (id + variantId)
      // is legal — the cart snapshot could have been taken before a sync — so
      // only tokens that match NO item at all are invalid.
      const unmatched = [...selectedSet].filter(
        (token) =>
          !itemsToCheckout.some((i) => i.id === token || i.variantId === token),
      );
      if (itemsToCheckout.length === 0 || unmatched.length > 0) {
        const foundIds = new Set([
          ...itemsToCheckout.map((i) => i.id),
          ...itemsToCheckout.map((i) => i.variantId),
        ]);
        const invalidIds = unmatched.length > 0 ? unmatched : [...selectedSet].filter((s) => !foundIds.has(s));
        throw new BadRequestException(
          `Some selected items were not found in your cart: ${invalidIds.join(', ')}`,
        );
      }
    }

    // 2. Verify stock
    for (const item of itemsToCheckout) {
      if (!item.variant.isActive) {
        throw new BadRequestException(`Variant ${item.variant.name} is not available`);
      }
      if (item.variant.product?.brand?.isActive === false) {
        throw new BadRequestException(
          `Sản phẩm "${item.variant.product?.name || item.variant.name}" thuộc thương hiệu đã tạm ngừng kinh doanh.`,
        );
      }
      if (!item.variant.inventory || item.variant.inventory.availableQty < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.variant.name}`);
      }
    }

    // 3. Fresh catalog prices are resolved INSIDE the transaction (M1);
    // subtotal is computed there, never from stale cart snapshots.
    const holdDurationMs = 15 * 60 * 1000;
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
        select: { id: true, price: true, isActive: true },
      });
      const freshByVariant = new Map(freshVariants.map((v) => [v.id, v]));
      const now = new Date();
      for (const item of itemsToCheckout) {
        const fresh = freshByVariant.get(item.variantId);
        if (!fresh || fresh.isActive === false) {
          throw new BadRequestException(
            `Variant ${item.variant?.name || item.variantId} is no longer available`,
          );
        }

        let effectiveUnitPrice = Number(fresh.price);

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
              orderBy: { id: 'asc' },
            })
          : null;

        if (activeFlashItem && tx.flashSaleItem?.updateMany) {
          // Re-check the campaign window right before claiming: updateMany
          // cannot filter on relations, so a campaign that ended between the
          // read above and this write must be rejected explicitly.
          const flashCampaign = (tx as any).flashSaleCampaign?.findUnique
            ? await (tx as any).flashSaleCampaign.findUnique({
                where: { id: (activeFlashItem as any).campaignId },
              })
            : null;
          const windowOpen = flashCampaign
            ? !!flashCampaign.isActive &&
              flashCampaign.startAt <= now &&
              flashCampaign.endAt >= now
            : // Campaign row unreadable (partial test tx / older schema):
              // optimistically claim — the claim itself is guarded by
              // soldCount <= stockLimit and every release path rolls it back.
              true;

          if (windowOpen) {
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

            if (reserved.count > 0) {
              effectiveUnitPrice = Number(activeFlashItem.flashPrice);
            }
            // count === 0 → quota was exhausted between the cart display and
            // this checkout. Sell at the NORMAL catalog price instead of
            // failing: getCart/validate already show the item at normal price
            // once quotaLeft hits 0 (cart.service resolveActiveFlashSale), so
            // failing here would hard-block a cart the UI calls valid.
          }
          // Window closed between read and claim → fall through to the normal
          // price (same semantics as an inactive campaign in getCart).
        }

        if (item.id && effectiveUnitPrice !== Number(item.unitPrice)) {
          // Tolerant refresh: the cart row may have been deleted between the
          // outer read and this transaction (user removed it from another
          // tab). updateMany with count-ignored semantics never throws P2025.
          await tx.cartItem.updateMany?.({
            where: { id: item.id, cartId: cart.id },
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
        if (voucher.perUserLimit !== null && voucher.perUserLimit !== undefined) {
          const userUsage = await tx.voucherUsage.count({
            where: { voucherId: voucher.id, userId },
          });
          if (userUsage >= voucher.perUserLimit) {
            throw new BadRequestException(
              'You have reached the per-user usage limit',
            );
          }
        }

        discountAmount = this.computeVoucherDiscount(voucher, subtotal, shippingFee);

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
          throw new BadRequestException('Sản phẩm hiện không đủ số lượng trong kho');
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
          // Anchor createdAt to the claim timestamp: rollbackFlashSoldCount
          // matches campaigns by a window containing createdAt, and a campaign
          // that ends between the flash claim and this insert would otherwise
          // fall outside that window and leak its claimed quota forever.
          createdAt: now,
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

      // Every order needs a PENDING payment row at checkout
      // inside the same transaction: COD for the delivery auto-PAID step,
      // BANK_TRANSFER (VietQR) for the manual-confirm/QR flow, VNPAY for the
      // IPN flow.
      if (tx.payment?.create) {
        const methodForPayment =
          dto.paymentMethod ?? PaymentMethod.COD;
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            method: methodForPayment,
            status: PaymentStatus.PENDING,
            amount: totalAmount,
          },
        });
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
        if (
          voucherForCap?.perUserLimit !== null &&
          voucherForCap?.perUserLimit !== undefined
        ) {
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

    // P3: send confirmation email to the buyer (safe-catch: never break creation).
    // For VNPAY, confirmation is dispatched upon verified payment via PaymentsService.handleVnpayIpn
    // to avoid duplicate emails or false confirmations for abandoned payment sessions.
    if (this.emailService && dto.paymentMethod !== PaymentMethod.VNPAY) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true, lastName: true },
        });
        if (user?.email) {
          let addressText: string | undefined;
          if (order.addressId) {
            const addr = await this.prisma.address.findUnique({
              where: { id: order.addressId },
            });
            if (addr) {
              addressText = [addr.addressLine1, addr.ward, addr.district, addr.city]
                .filter(Boolean)
                .join(', ');
            }
          }

          const paymentMethod = dto.paymentMethod as PaymentMethod;
          const paymentMethodLabel =
            paymentMethod === PaymentMethod.COD
              ? 'Thanh toán khi nhận hàng (COD)'
              : paymentMethod === PaymentMethod.BANK_TRANSFER
                ? 'Chuyển khoản VietQR / Ngân hàng'
                : paymentMethod === PaymentMethod.VNPAY
                  ? 'Cổng thanh toán trực tuyến VNPAY'
                  : 'Tiêu chuẩn';

          const items = (order.items || []).map((it: any) => ({
            name: it.productName,
            quantity: it.quantity,
            price: Number(it.unitPrice),
          }));

          const recipientName =
            [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;

          await this.emailService.sendOrderConfirmation(
            user.email,
            order.orderNumber,
            Number(order.totalAmount),
            {
              recipientName,
              items,
              paymentMethod: paymentMethodLabel,
              shippingAddress: addressText,
            },
          );
        }
      } catch (emailErr) {
        this.logger.warn(
          `Failed to send order confirmation email for ${order.id}: ${(emailErr as Error).message}`,
        );
      }
    }

    return order;
  }

  private toClientOrder(o: any) {
    const customerName =
      o.address?.recipientName ||
      (o.user
        ? `${o.user.lastName || ''} ${o.user.firstName || ''}`.trim() ||
          'Khách hàng'
        : 'Khách hàng');
    const shippingPhone = o.address?.phone || o.user?.phone || '';
    const shippingAddress = o.address
      ? `${o.address.addressLine1}, ${o.address.ward ? o.address.ward + ', ' : ''}${o.address.district ? o.address.district + ', ' : ''}${o.address.city}`
      : '';
    const reportedTxn = o.payments
      ?.flatMap((p: any) => p.transactions || [])
      ?.find((t: any) => t.providerReference === 'CUSTOMER_REPORTED');
    const primaryPayment =
      o.payments?.find((p: any) => p.status === 'PAID') ||
      o.payments?.find((p: any) => p.status === 'PENDING' && (p.method === 'BANK_TRANSFER' || p.method === 'VIETQR')) ||
      o.payments?.[0];
    const discount =
      o.discount ?? (o.discountAmount !== undefined ? Number(o.discountAmount) : 0);
    const notes = o.notes ?? o.customerNote ?? undefined;

    return {
      ...o,
      customerName,
      shippingPhone,
      shippingAddress,
      paymentMethod: primaryPayment?.method || 'COD',
      paymentStatus: primaryPayment?.status || 'PENDING',
      customerReportedTransfer: Boolean(reportedTxn),
      customerReportedAt: reportedTxn?.createdAt,
      discount,
      notes,
    };
  }

  async findMyOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        payments: {
          include: {
            transactions: {
              where: { providerReference: 'CUSTOMER_REPORTED' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        shipping: true,
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toClientOrder(o));
  }

  async findMyOrder(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        OR: [...(isUuid(id) ? [{ id }] : []), { orderNumber: id }],
      },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
            imeiDevice: true,
          },
        },
        payments: {
          include: {
            transactions: {
              where: { providerReference: 'CUSTOMER_REPORTED' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        address: true,
        shipping: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.toClientOrder(order);
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
          // Never serialize the raw user row — it carries passwordHash.
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          },
          address: true,
          items: {
            include: {
              variant: { include: { product: true } },
              imeiDevice: true,
            },
          },
          payments: {
            include: {
              transactions: {
                where: { providerReference: 'CUSTOMER_REPORTED' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
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
      const reportedTxn = o.payments
        ?.flatMap((p: any) => p.transactions || [])
        ?.find((t: any) => t.providerReference === 'CUSTOMER_REPORTED');
      const primaryPayment =
        o.payments?.find((p: any) => p.status === 'PAID') ||
        o.payments?.find((p: any) => p.status === 'PENDING' && (p.method === 'BANK_TRANSFER' || p.method === 'VIETQR')) ||
        o.payments?.[0];

      return {
        ...o,
        customerName,
        shippingPhone,
        shippingAddress,
        paymentMethod: primaryPayment?.method || 'COD',
        paymentStatus: primaryPayment?.status || 'PENDING',
        customerReportedTransfer: Boolean(reportedTxn),
        customerReportedAt: reportedTxn?.createdAt,
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
    const order =
      (this.prisma.order.findFirst
        ? await this.prisma.order.findFirst({
            where: {
              OR: [...(isUuid(id) ? [{ id }] : []), { orderNumber: id }],
            },
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
              items: { include: { variant: { include: { product: true } }, imeiDevice: true } },
              payments: {
                include: {
                  transactions: {
                    where: { providerReference: 'CUSTOMER_REPORTED' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                  },
                },
              },
              address: true,
              shipping: true,
            },
          })
        : null) ||
      (await this.prisma.order.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          items: { include: { variant: { include: { product: true } }, imeiDevice: true } },
          payments: {
            include: {
              transactions: {
                where: { providerReference: 'CUSTOMER_REPORTED' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          address: true,
          shipping: true,
        },
      }));
    if (!order) throw new NotFoundException('Order not found');

    const customerName =
      order.address?.recipientName ||
      (order.user ? `${order.user.lastName || ''} ${order.user.firstName || ''}`.trim() : 'Khách hàng');
    const shippingPhone = order.address?.phone || order.user?.phone || '';
    const shippingAddress = order.address
      ? `${order.address.addressLine1}, ${order.address.ward ? order.address.ward + ', ' : ''}${order.address.district ? order.address.district + ', ' : ''}${order.address.city}`
      : '';
    const reportedTxn = order.payments
      ?.flatMap((p: any) => p.transactions || [])
      ?.find((t: any) => t.providerReference === 'CUSTOMER_REPORTED');
    const primaryPayment =
      order.payments?.find((p: any) => p.status === 'PAID') ||
      order.payments?.find((p: any) => p.status === 'PENDING' && (p.method === 'BANK_TRANSFER' || p.method === 'VIETQR')) ||
      order.payments?.[0];

    return {
      ...order,
      customerName,
      shippingPhone,
      shippingAddress,
      paymentMethod: primaryPayment?.method || 'COD',
      paymentStatus: primaryPayment?.status || 'PENDING',
      customerReportedTransfer: Boolean(reportedTxn),
      customerReportedAt: reportedTxn?.createdAt,
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
      await tx.voucher.updateMany({
        where: { id: voucher.id, usageCount: { gt: 0 } },
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

    // Idempotent retry: a duplicate PUT for the state the order is already in
    // (double-click, 401-refresh replay) is a no-op success — otherwise the
    // second request fails with "Cannot transition from X to X" even though
    // the first one already did the job. No side effects run on this path.
    if (oldStatus === newStatus) {
      return order;
    }

    const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]:    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]:  [OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
      [OrderStatus.PACKED]:     [OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
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

    const result = await this.prisma.$transaction(async (tx) => {
      // When transitioning from PENDING, CONFIRMED, PROCESSING, or PACKED to CANCELLED: release reserved IMEIs back to AVAILABLE and restore inventory availableQty
      if (
        newStatus === OrderStatus.CANCELLED &&
        ([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.PACKED] as OrderStatus[]).includes(order.status)
      ) {
        // A paid order must never be dissolved into thin air: money was
        // captured, IMEIs are SOLD, and there is no refund flow. Re-check
        // INSIDE the transaction so a payment confirming concurrently rolls
        // the whole cancel back (P2/A1).
        await this.assertNoCapturedPayment(tx, id);
        await this.rollbackVoucherUsage(tx, order);
        // Close still-pending payments so a cancelled order never keeps a
        // live PENDING row (finance filter + orphan cleanup).
        if (tx.payment?.updateMany) {
          await tx.payment.updateMany({
            where: { orderId: id, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.CANCELLED },
          });
        }
        for (const item of order.items) {
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
        // Give back the flash-sale slots this order claimed (no-op when none).
        await rollbackFlashSoldCount(tx, order.items, order.createdAt);
        // The sale is dead — void its ACTIVE warranties with the same stroke.
        await this.warrantyService?.voidWarrantiesForOrder(tx, id);
      }

      // RETURNED has real stock side effects. Without this branch a carrier
      // return (shipping.service auto-transition) left IMEIs stuck in
      // RESERVED (pre-settlement) or SOLD (post-settlement) forever — dead
      // stock no sweep or cancel path could reach.
      if (newStatus === OrderStatus.RETURNED && order.status === OrderStatus.SHIPPING) {
        // Parcel returned before settlement: identical economics to a cancel.
        await this.assertNoCapturedPayment(tx, id);
        await this.rollbackVoucherUsage(tx, order);
        if (tx.payment?.updateMany) {
          await tx.payment.updateMany({
            where: { orderId: id, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.CANCELLED },
          });
        }
        for (const item of order.items) {
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
        await rollbackFlashSoldCount(tx, order.items, order.createdAt);
        await this.warrantyService?.voidWarrantiesForOrder(tx, id);
      }

      if (newStatus === OrderStatus.RETURNED && order.status === OrderStatus.DELIVERED) {
        // Physical units come back to the warehouse after settlement: flip
        // SOLD IMEIs to RETURNED, restock quantity, and write the ledger.
        await this.rollbackVoucherUsage(tx, order);
        for (const item of order.items) {
          if (item.imeiDeviceId) {
            await tx.imeiDevice.updateMany({
              where: { id: item.imeiDeviceId, status: ImeiStatus.SOLD },
              data: { status: ImeiStatus.RETURNED },
            });
          }
          const inv = await tx.inventory.updateMany({
            where: { variantId: item.variantId },
            data: {
              quantity: { increment: item.quantity },
              availableQty: { increment: item.quantity },
            },
          });
          if (inv.count > 0 && tx.stockMovement) {
            const fresh = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
            const balanceAfter = fresh ? fresh.quantity : 0;
            const unitPrice = Number(item.unitPrice || 0);
            await tx.stockMovement.create({
              data: {
                variantId: item.variantId,
                type: StockMovementType.IMPORT_RETURN,
                quantity: item.quantity,
                balanceBefore: balanceAfter - item.quantity,
                balanceAfter,
                unitPrice,
                totalAmount: item.quantity * unitPrice,
                referenceType: 'ORDER_RETURN',
                referenceId: id,
                note: 'Nhập lại kho từ đơn hàng bị trả về',
              },
            });
          }
        }
        await rollbackFlashSoldCount(tx, order.items, order.createdAt);
        await this.warrantyService?.voidWarrantiesForOrder(tx, id);
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
            // Single guarded settlement on this path: entering DELIVERED
            // consumes the reservation (COMPLETED is only reachable from
            // DELIVERED, so the outer guard keeps it from deducting twice).
            const settled = await tx.inventory.updateMany({
              where: { variantId: item.variantId, reservedQty: { gte: item.quantity } },
              data: {
                quantity: { decrement: item.quantity },
                reservedQty: { decrement: item.quantity },
              },
            });
            if (settled.count === 0) continue;

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

        // P3: cash is collected at the door — flip pending COD payments to
        // PAID on delivery so finance never shows delivered orders as unpaid.
        // (VietQR/bank-transfer rows stay manual: only a bank reference proves
        // the money arrived.)
        // Idempotent via the PENDING filter. A6/audit: if the order ALREADY
        // has a PAID payment (e.g. paid via VNPay/transfer earlier), flipping
        // the COD row too would book 2× the order total — skip entirely.
        const hasPaidPayment = await tx.payment?.findFirst?.({
          where: { orderId: id, status: PaymentStatus.PAID },
          select: { id: true },
        });
        const doorPending = hasPaidPayment
          ? []
          : tx.payment?.findMany
            ? await tx.payment.findMany({
                where: {
                  orderId: id,
                  method: PaymentMethod.COD,
                  status: PaymentStatus.PENDING,
                },
                select: { id: true, amount: true, method: true },
              })
            : [];
        for (const cp of doorPending) {
          if (tx.payment?.update) {
            await tx.payment.update({
              where: { id: cp.id },
              data: { status: PaymentStatus.PAID, paidAt: now },
            });
          }
          if (tx.paymentTransaction?.create) {
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

      // M-shipclose: entering DELIVERED (or COMPLETED from it) closes the
      // carrier loop too. The shipping row is created at checkout as PENDING,
      // so without this it stays READY_TO_SHIP/IN_TRANSIT forever and the
      // storefront stepper/activity log keep showing "packed/shipping" as
      // current on delivered orders. Terminal carrier states
      // (already DELIVERED/FAILED/RETURNED) always win and are never
      // overwritten. updateMany is a no-op for orders without a shipping row.
      if (
        (newStatus === OrderStatus.DELIVERED || newStatus === OrderStatus.COMPLETED) &&
        tx.shipping?.updateMany
      ) {
        await tx.shipping.updateMany({
          where: {
            orderId: id,
            status: {
              notIn: [ShippingStatus.DELIVERED, ShippingStatus.FAILED, ShippingStatus.RETURNED],
            },
          },
          data: { status: ShippingStatus.DELIVERED, deliveredAt: now },
        });
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

    const emailService = this.emailService;
    if (emailService && (order as any).user?.email) {
      try {
        const u = (order as any).user;
        const recipientName =
          [u.firstName, u.lastName].filter(Boolean).join(' ') || undefined;

        if (newStatus === OrderStatus.CANCELLED) {
          await emailService.sendOrderCancelled(u.email, {
            orderNumber: order.orderNumber,
            recipientName,
            cancelledReason: reason || 'Đơn hàng đã được hủy bởi quản trị viên',
            voucherRestored: Boolean((order as any).voucherCode),
          });
        } else if (newStatus === OrderStatus.DELIVERED && oldStatus !== OrderStatus.DELIVERED) {
          const itemIds = (order.items || []).map((it: any) => it.id);
          const warranties = await this.prisma.warranty.findMany({
            where: { orderItemId: { in: itemIds } },
            include: {
              orderItem: true,
              imeiDevice: true,
            },
          });

          const warrantySummaries = warranties.map((w) => ({
            productName: w.orderItem?.productName || 'Thiết bị',
            imei: w.imeiDevice?.imei || undefined,
            warrantyCode: w.warrantyCode,
            startDate: w.startDate ? new Date(w.startDate).toLocaleDateString('vi-VN') : undefined,
            endDate: w.endDate ? new Date(w.endDate).toLocaleDateString('vi-VN') : '',
          }));

          await emailService.sendOrderDelivered(u.email, {
            orderNumber: order.orderNumber,
            recipientName,
            warranties: warrantySummaries,
          });
        }
      } catch (emailErr) {
        this.logger.warn(
          `Failed to dispatch email for order ${id} status transition ${newStatus}: ${(emailErr as Error).message}`,
        );
      }
    }

    return result;
  }

  async cancelMyOrder(userId: string, id: string, dto: CancelOrderDto) {
    if (!isUuid(id)) throw new NotFoundException('Order not found');

    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled in its current status');
    }

    // P2: a paid order must never be cancelled directly by buyer into thin air.
    // Buyers should contact support.
    const paidPayment = await this.prisma.payment.findFirst({
      where: { orderId: id, status: PaymentStatus.PAID },
      select: { id: true },
    });
    if (paidPayment) {
      throw new BadRequestException(
        'Order is already paid and cannot be cancelled directly. Please contact support.',
      );
    }

    // Release reserved stock & IMEIs (re-read inside txn to avoid stale snapshot)
    await this.prisma.$transaction(async (tx) => {
      // P2 (audit A2): the pre-transaction paidPayment check races the payment
      // confirmation (VNPay IPN can commit between the read and this claim).
      // Re-check inside the transaction so a concurrently-paid order rolls the
      // whole cancel back instead of dissolving captured money.
      await this.assertNoCapturedPayment(tx, id);

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

      // Close still-pending payments so the cancelled order keeps no live rows.
      await tx.payment.updateMany({
        where: { orderId: id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.CANCELLED },
      });

      await this.rollbackVoucherUsage(tx, order);

      const items = await tx.orderItem.findMany({ where: { orderId: id } });
      for (const item of items) {
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
      // Give back the flash-sale slots this order claimed (no-op when none).
      await rollbackFlashSoldCount(tx, items, order.createdAt);
      // The sale is dead — void its ACTIVE warranties with the same stroke.
      await this.warrantyService?.voidWarrantiesForOrder(tx, id);
    });

    const updated = await this.prisma.order.findUnique({ where: { id } });

    const emailService = this.emailService;
    if (emailService && (order as any).user?.email) {
      try {
        const u = (order as any).user;
        const recipientName =
          [u.firstName, u.lastName].filter(Boolean).join(' ') || undefined;

        await emailService.sendOrderCancelled(u.email, {
          orderNumber: order.orderNumber,
          recipientName,
          cancelledReason: dto.reason || 'Khách hàng yêu cầu hủy đơn hàng',
          voucherRestored: Boolean((order as any).voucherCode),
        });
      } catch (emailErr) {
        this.logger.warn(
          `Failed to send order cancellation email for ${id}: ${(emailErr as Error).message}`,
        );
      }
    }

    return updated;
  }
}
