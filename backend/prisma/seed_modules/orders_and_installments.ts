import {
  PrismaClient,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
  TransactionStatus,
  ShippingStatus,
  InstallmentProvider,
  InstallmentStatus,
  ImeiStatus,
  ShippingMethod,
} from '@prisma/client';
import { SeededCustomer } from './customers';

export interface DeliveredItemInfo {
  orderId: string;
  userId: string;
  variantId: string;
  orderItemId: string;
  imeiDeviceId: string;
  deliveredAt: Date;
  productName?: string;
  productId?: string;
  price?: number;
  unitPrice?: number;
}

export interface SeededOrderResult {
  orders?: any[];
  completedOrders?: any[];
  deliveredItems: DeliveredItemInfo[];
}

interface OrderBlueprint {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  ageDays: number;
  installmentProvider?: InstallmentProvider;
  installmentStatus?: InstallmentStatus;
  cancelledReason?: string;
}

function formatOrderDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function getPaymentProviderName(
  method: PaymentMethod,
  installmentProvider?: InstallmentProvider
): string {
  switch (method) {
    case PaymentMethod.INSTALLMENT:
      return installmentProvider === InstallmentProvider.FE_CREDIT ? 'FE Credit' : 'Home Credit';
    case PaymentMethod.COD:
      return 'COD';
    case PaymentMethod.VNPAY:
      return 'VNPAY';
    case PaymentMethod.MOMO:
      return 'MoMo';
    case PaymentMethod.BANK_TRANSFER:
      return 'Vietcombank';
    default:
      return method.toString();
  }
}

/**
 * Builds exactly 200 order blueprints spanning the past 180 days.
 *
 * Status distribution (covers ALL OrderStatus for filter testing):
 * - 120 COMPLETED
 * - 20 DELIVERED
 * - 18 SHIPPING
 * - 10 PROCESSING
 * - 6 CONFIRMED
 * - 5 PACKED
 * - 5 RETURNED
 * - 8 PENDING
 * - 8 CANCELLED
 *
 * Payment distribution:
 * - 20 INSTALLMENT (16 APPROVED, 2 PENDING, 2 REJECTED)
 * - 70 COD
 * - 60 VNPAY
 * - 30 MOMO
 * - 20 BANK_TRANSFER
 */
function buildOrderBlueprints(): OrderBlueprint[] {
  const blueprints: OrderBlueprint[] = [];

  // 1. COMPLETED: 120 orders (Ages from 178 days ago down to 8 days ago)
  // Methods: 12 INSTALLMENT (APPROVED), 46 COD, 33 VNPAY, 17 MOMO, 12 BANK_TRANSFER
  for (let i = 0; i < 120; i++) {
    const ageDays = 178 - (i / 119) * (178 - 8);
    let paymentMethod: PaymentMethod;
    let installmentProvider: InstallmentProvider | undefined;
    let installmentStatus: InstallmentStatus | undefined;

    if (i < 12) {
      paymentMethod = PaymentMethod.INSTALLMENT;
      installmentProvider = i % 2 === 0 ? InstallmentProvider.HOME_CREDIT : InstallmentProvider.FE_CREDIT;
      installmentStatus = InstallmentStatus.APPROVED;
    } else if (i < 12 + 46) {
      paymentMethod = PaymentMethod.COD;
    } else if (i < 12 + 46 + 33) {
      paymentMethod = PaymentMethod.VNPAY;
    } else if (i < 12 + 46 + 33 + 17) {
      paymentMethod = PaymentMethod.MOMO;
    } else {
      paymentMethod = PaymentMethod.BANK_TRANSFER;
    }

    blueprints.push({
      status: OrderStatus.COMPLETED,
      paymentMethod,
      ageDays,
      installmentProvider,
      installmentStatus,
    });
  }

  // 2. DELIVERED: 20 orders (Ages from 7 days ago down to 3 days ago)
  // Methods: 2 INSTALLMENT (APPROVED), 10 VNPAY, 5 MOMO, 3 BANK_TRANSFER (All online -> PAID)
  for (let i = 0; i < 20; i++) {
    const ageDays = 7 - (i / 19) * (7 - 3);
    let paymentMethod: PaymentMethod;
    let installmentProvider: InstallmentProvider | undefined;
    let installmentStatus: InstallmentStatus | undefined;

    if (i < 2) {
      paymentMethod = PaymentMethod.INSTALLMENT;
      installmentProvider = i % 2 === 0 ? InstallmentProvider.HOME_CREDIT : InstallmentProvider.FE_CREDIT;
      installmentStatus = InstallmentStatus.APPROVED;
    } else if (i < 2 + 10) {
      paymentMethod = PaymentMethod.VNPAY;
    } else if (i < 2 + 10 + 5) {
      paymentMethod = PaymentMethod.MOMO;
    } else {
      paymentMethod = PaymentMethod.BANK_TRANSFER;
    }

    blueprints.push({
      status: OrderStatus.DELIVERED,
      paymentMethod,
      ageDays,
      installmentProvider,
      installmentStatus,
    });
  }

  // 3. SHIPPING: 18 orders (Ages from 3 days ago down to 1.2 days ago)
  // Methods: 2 INSTALLMENT (APPROVED), 7 COD, 5 VNPAY, 2 MOMO, 2 BANK_TRANSFER
  for (let i = 0; i < 18; i++) {
    const ageDays = 3 - (i / 17) * (3 - 1.2);
    let paymentMethod: PaymentMethod;
    let installmentProvider: InstallmentProvider | undefined;
    let installmentStatus: InstallmentStatus | undefined;

    if (i < 2) {
      paymentMethod = PaymentMethod.INSTALLMENT;
      installmentProvider = i % 2 === 0 ? InstallmentProvider.HOME_CREDIT : InstallmentProvider.FE_CREDIT;
      installmentStatus = InstallmentStatus.APPROVED;
    } else if (i < 2 + 7) {
      paymentMethod = PaymentMethod.COD;
    } else if (i < 2 + 7 + 5) {
      paymentMethod = PaymentMethod.VNPAY;
    } else if (i < 2 + 7 + 5 + 2) {
      paymentMethod = PaymentMethod.MOMO;
    } else {
      paymentMethod = PaymentMethod.BANK_TRANSFER;
    }

    blueprints.push({
      status: OrderStatus.SHIPPING,
      paymentMethod,
      ageDays,
      installmentProvider,
      installmentStatus,
    });
  }

  // 3b. CONFIRMED: 6 orders (Ages 1.0 -> 0.6 days) — paid online, awaiting packing
  for (let i = 0; i < 6; i++) {
    const ageDays = 1.0 - (i / 5) * (1.0 - 0.6);
    blueprints.push({
      status: OrderStatus.CONFIRMED,
      paymentMethod: i % 2 === 0 ? PaymentMethod.VNPAY : PaymentMethod.MOMO,
      ageDays,
    });
  }

  // 3c. PACKED: 5 orders (Ages 0.9 -> 0.5 days) — packed, awaiting carrier pickup
  for (let i = 0; i < 5; i++) {
    const ageDays = 0.9 - (i / 4) * (0.9 - 0.5);
    blueprints.push({
      status: OrderStatus.PACKED,
      paymentMethod: i % 2 === 0 ? PaymentMethod.COD : PaymentMethod.VNPAY,
      ageDays,
    });
  }

  // 3d. RETURNED: 5 orders (Ages 60 -> 10 days) — delivered then returned
  const returnedAges = [60, 45, 30, 18, 10];
  for (let i = 0; i < 5; i++) {
    blueprints.push({
      status: OrderStatus.RETURNED,
      paymentMethod: i % 2 === 0 ? PaymentMethod.COD : PaymentMethod.VNPAY,
      ageDays: returnedAges[i],
      cancelledReason: 'Khách đổi ý sau khi nhận hàng, yêu cầu trả hàng',
    });
  }

  // 4. PROCESSING: 10 orders (Ages from 1.2 days ago down to 0.5 days ago)
  // Methods: 1 INSTALLMENT (PENDING), 4 COD, 3 VNPAY, 1 MOMO, 1 BANK_TRANSFER
  for (let i = 0; i < 10; i++) {
    const ageDays = 1.2 - (i / 9) * (1.2 - 0.5);
    let paymentMethod: PaymentMethod;
    let installmentProvider: InstallmentProvider | undefined;
    let installmentStatus: InstallmentStatus | undefined;

    if (i === 0) {
      paymentMethod = PaymentMethod.INSTALLMENT;
      installmentProvider = InstallmentProvider.HOME_CREDIT;
      installmentStatus = InstallmentStatus.PENDING;
    } else if (i < 1 + 4) {
      paymentMethod = PaymentMethod.COD;
    } else if (i < 1 + 4 + 3) {
      paymentMethod = PaymentMethod.VNPAY;
    } else if (i < 1 + 4 + 3 + 1) {
      paymentMethod = PaymentMethod.MOMO;
    } else {
      paymentMethod = PaymentMethod.BANK_TRANSFER;
    }

    blueprints.push({
      status: OrderStatus.PROCESSING,
      paymentMethod,
      ageDays,
      installmentProvider,
      installmentStatus,
    });
  }

  // 5. PENDING: 8 orders (Ages from 0.5 days ago down to 0.05 days / ~1 hour ago)
  // Methods: 1 INSTALLMENT (PENDING), 3 COD, 2 VNPAY, 1 MOMO, 1 BANK_TRANSFER
  for (let i = 0; i < 8; i++) {
    const ageDays = 0.5 - (i / 7) * (0.5 - 0.05);
    let paymentMethod: PaymentMethod;
    let installmentProvider: InstallmentProvider | undefined;
    let installmentStatus: InstallmentStatus | undefined;

    if (i === 0) {
      paymentMethod = PaymentMethod.INSTALLMENT;
      installmentProvider = InstallmentProvider.FE_CREDIT;
      installmentStatus = InstallmentStatus.PENDING;
    } else if (i < 1 + 3) {
      paymentMethod = PaymentMethod.COD;
    } else if (i < 1 + 3 + 2) {
      paymentMethod = PaymentMethod.VNPAY;
    } else if (i < 1 + 3 + 2 + 1) {
      paymentMethod = PaymentMethod.MOMO;
    } else {
      paymentMethod = PaymentMethod.BANK_TRANSFER;
    }

    blueprints.push({
      status: OrderStatus.PENDING,
      paymentMethod,
      ageDays,
      installmentProvider,
      installmentStatus,
    });
  }

  // 6. CANCELLED: 8 orders (Distributed across the 180 days)
  // Methods: 2 INSTALLMENT (REJECTED), 2 COD, 2 VNPAY, 1 MOMO, 1 BANK_TRANSFER
  const cancelledAges = [170, 145, 120, 95, 70, 45, 20, 0.2];
  const cancelledReasons = [
    'Khách muốn đổi sang màu khác',
    'Đặt nhầm dung lượng',
    'Khách muốn đổi sang màu khác',
    'Đặt nhầm dung lượng',
    'Khách muốn đổi sang màu khác',
    'Đặt nhầm dung lượng',
    'Khách muốn đổi sang màu khác',
    'Điểm tín dụng CIC không đạt tiêu chuẩn',
  ];

  for (let i = 0; i < 8; i++) {
    let paymentMethod: PaymentMethod;
    let installmentProvider: InstallmentProvider | undefined;
    let installmentStatus: InstallmentStatus | undefined;

    if (i < 2) {
      paymentMethod = PaymentMethod.INSTALLMENT;
      installmentProvider = i % 2 === 0 ? InstallmentProvider.HOME_CREDIT : InstallmentProvider.FE_CREDIT;
      installmentStatus = InstallmentStatus.REJECTED;
    } else if (i < 2 + 2) {
      paymentMethod = PaymentMethod.COD;
    } else if (i < 2 + 2 + 2) {
      paymentMethod = PaymentMethod.VNPAY;
    } else if (i < 2 + 2 + 2 + 1) {
      paymentMethod = PaymentMethod.MOMO;
    } else {
      paymentMethod = PaymentMethod.BANK_TRANSFER;
    }

    blueprints.push({
      status: OrderStatus.CANCELLED,
      paymentMethod,
      ageDays: cancelledAges[i],
      installmentProvider,
      installmentStatus,
      cancelledReason: cancelledReasons[i],
    });
  }

  // Sort chronologically from oldest (largest ageDays) to newest (smallest ageDays)
  blueprints.sort((a, b) => b.ageDays - a.ageDays);

  return blueprints;
}

export async function seedOrdersAndInstallments(
  prisma: PrismaClient,
  customers: SeededCustomer[],
  staffUserId: string,
  createImeiForVariant: (
    variantId: string,
    sku: string,
    costPrice: any,
    status: ImeiStatus
  ) => Promise<{ id: string; imei: string }>
): Promise<SeededOrderResult> {
  if (!customers || customers.length === 0) {
    throw new Error('No customers provided for seedOrdersAndInstallments');
  }

  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: { product: true },
  });

  if (!variants || variants.length === 0) {
    throw new Error('No active product variants found in database');
  }

  console.log(`📦 Seeding 200 lifecycle orders across 180 days with ${variants.length} available variants...`);

  const blueprints = buildOrderBlueprints();
  const createdOrders: any[] = [];
  const deliveredItems: SeededOrderResult['deliveredItems'] = [];

  const customerNotes = [
    'Giao hàng giờ hành chính',
    'Gọi trước khi giao 15 phút',
    'Đóng gói cẩn thận giúp mình nhé',
    'Giao tại sảnh lễ tân tòa nhà',
    null,
    'Hàng giá trị cao vui lòng đồng kiểm',
    null,
  ];

  const carriers = [
    { name: 'Giao Hàng Nhanh', prefix: 'GHN' },
    { name: 'Viettel Post', prefix: 'VTP' },
    { name: 'Giao Hàng Tiết Kiệm', prefix: 'GHTK' },
  ];

  const now = new Date();
  let shippingIdx = 0;
  let installmentAppIdx = 0;

  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    const orderIndex = i + 1;

    // Determine order creation timestamp based on ageDays
    const createdAt = new Date(now.getTime() - bp.ageDays * 24 * 3600 * 1000);
    const orderNumber = `ORD-${formatOrderDate(createdAt)}-${String(orderIndex).padStart(4, '0')}`;

    // Select customer and default address
    const customer = customers[i % customers.length];
    const addressId = customer.addressId || null;
    const customerName = `${customer.lastName} ${customer.firstName}`.trim();

    // Determine chronological sub-timestamps
    let confirmedAt: Date | null = null;
    let packedAt: Date | null = null;
    let shippedAt: Date | null = null;
    let deliveredAt: Date | null = null;
    let completedAt: Date | null = null;
    let cancelledAt: Date | null = null;

    if (bp.status === OrderStatus.COMPLETED) {
      confirmedAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
      packedAt = new Date(createdAt.getTime() + 6 * 3600 * 1000);
      shippedAt = new Date(createdAt.getTime() + 24 * 3600 * 1000);
      deliveredAt = new Date(createdAt.getTime() + 3 * 24 * 3600 * 1000);
      completedAt = new Date(createdAt.getTime() + 5 * 24 * 3600 * 1000);
    } else if (bp.status === OrderStatus.DELIVERED) {
      confirmedAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
      packedAt = new Date(createdAt.getTime() + 6 * 3600 * 1000);
      shippedAt = new Date(createdAt.getTime() + 24 * 3600 * 1000);
      deliveredAt = new Date(
        Math.min(now.getTime() - 2 * 3600 * 1000, createdAt.getTime() + 2.5 * 24 * 3600 * 1000)
      );
    } else if (bp.status === OrderStatus.RETURNED) {
      confirmedAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
      packedAt = new Date(createdAt.getTime() + 6 * 3600 * 1000);
      shippedAt = new Date(createdAt.getTime() + 24 * 3600 * 1000);
      deliveredAt = new Date(createdAt.getTime() + 3 * 24 * 3600 * 1000);
    } else if (bp.status === OrderStatus.SHIPPING) {
      confirmedAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
      packedAt = new Date(createdAt.getTime() + 6 * 3600 * 1000);
      shippedAt = new Date(
        Math.min(now.getTime() - 2 * 3600 * 1000, createdAt.getTime() + 18 * 3600 * 1000)
      );
    } else if (bp.status === OrderStatus.PACKED) {
      confirmedAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
      packedAt = new Date(
        Math.min(now.getTime() - 60 * 60 * 1000, createdAt.getTime() + 6 * 3600 * 1000)
      );
    } else if (bp.status === OrderStatus.PROCESSING) {
      confirmedAt = new Date(
        Math.min(now.getTime() - 30 * 60 * 1000, createdAt.getTime() + 30 * 60 * 1000)
      );
    } else if (bp.status === OrderStatus.CONFIRMED) {
      confirmedAt = new Date(
        Math.min(now.getTime() - 30 * 60 * 1000, createdAt.getTime() + 30 * 60 * 1000)
      );
    } else if (bp.status === OrderStatus.CANCELLED) {
      cancelledAt = new Date(createdAt.getTime() + 45 * 60 * 1000);
    }

    const updatedAt = completedAt ?? deliveredAt ?? shippedAt ?? packedAt ?? confirmedAt ?? cancelledAt ?? createdAt;

    // Pick 1 or 2 items using diverse variants
    const itemCount = i % 2 === 0 ? 2 : 1;
    const selectedVariants: typeof variants = [];
    const varIdx1 = (i * 2) % variants.length;
    selectedVariants.push(variants[varIdx1]);
    if (itemCount === 2) {
      const varIdx2 = (i * 2 + 1) % variants.length;
      selectedVariants.push(variants[varIdx2]);
    }

    let subtotal = 0;
    for (const v of selectedVariants) {
      subtotal += Number(v.price);
    }

    let shippingMethod: ShippingMethod = ShippingMethod.STANDARD;
    let shippingFee = subtotal > 500000 ? 0 : 30000;
    if (i % 7 === 0) {
      shippingMethod = ShippingMethod.ECONOMY;
      shippingFee = subtotal > 500000 ? 0 : 15000;
    } else if (i % 4 === 0) {
      shippingMethod = ShippingMethod.EXPRESS_2H;
      shippingFee = subtotal > 500000 ? 30000 : 60000;
    }
    const discountAmount = 0;
    const taxAmount = 0;
    const totalAmount = subtotal + shippingFee;

    // Create Order record
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customer.id,
        addressId,
        status: bp.status,
        subtotal,
        discountAmount,
        shippingFee,
        shippingMethod,
        taxAmount,
        totalAmount,
        customerNote: customerNotes[i % customerNotes.length],
        cancelledReason: bp.cancelledReason ?? null,
        confirmedAt,
        packedAt,
        shippedAt,
        deliveredAt,
        completedAt,
        cancelledAt,
        createdAt,
        updatedAt,
      },
    });

    // Create OrderItems and assign sold IMEIs for delivered orders
    for (const v of selectedVariants) {
      let imeiDeviceId: string | null = null;
      if (
        bp.status === OrderStatus.COMPLETED ||
        bp.status === OrderStatus.DELIVERED ||
        bp.status === OrderStatus.RETURNED
      ) {
        const imeiDevice = await createImeiForVariant(v.id, v.sku, v.costPrice, ImeiStatus.SOLD);
        imeiDeviceId = imeiDevice.id;
      }

      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          variantId: v.id,
          imeiDeviceId,
          productName: v.product?.name ?? v.name,
          sku: v.sku,
          quantity: 1,
          unitPrice: v.price,
          discountAmount: 0,
          totalPrice: v.price,
          createdAt,
        },
      });

      if (imeiDeviceId) {
        deliveredItems.push({
          orderId: order.id,
          userId: customer.id,
          variantId: v.id,
          productId: v.productId,
          orderItemId: orderItem.id,
          imeiDeviceId,
          deliveredAt: order.deliveredAt ?? order.createdAt,
          productName: v.product?.name ?? v.name,
          price: Number(v.price),
          unitPrice: Number(v.price),
        });
      }
    }

    // Create Shipping record for non-cancelled orders
    if (bp.status !== OrderStatus.CANCELLED) {
      const carrier = carriers[shippingIdx % carriers.length];
      shippingIdx++;

      const trackingNumber = `${carrier.prefix}${formatOrderDate(createdAt)}${String(orderIndex).padStart(4, '0')}`;

      let shippingStatus: ShippingStatus = ShippingStatus.PENDING;
      if (bp.status === OrderStatus.COMPLETED || bp.status === OrderStatus.DELIVERED) {
        shippingStatus = ShippingStatus.DELIVERED;
      } else if (bp.status === OrderStatus.RETURNED) {
        shippingStatus = ShippingStatus.RETURNED;
      } else if (bp.status === OrderStatus.SHIPPING) {
        shippingStatus = ShippingStatus.IN_TRANSIT;
      } else if (bp.status === OrderStatus.PACKED) {
        shippingStatus = ShippingStatus.READY_TO_SHIP;
      } else if (bp.status === OrderStatus.CONFIRMED || bp.status === OrderStatus.PROCESSING) {
        shippingStatus = ShippingStatus.PENDING;
      }

      await prisma.shipping.create({
        data: {
          orderId: order.id,
          providerName: carrier.name,
          trackingNumber,
          status: shippingStatus,
          shippingFee,
          estimatedDeliveryDate: new Date(createdAt.getTime() + 3 * 24 * 3600 * 1000),
          shippedAt,
          deliveredAt,
          createdAt,
          updatedAt: deliveredAt ?? shippedAt ?? createdAt,
        },
      });
    }

    // Determine payment status
    // Online methods on shipped/delivered/completed/returned/packed/confirmed orders are PAID
    // COD on completed/delivered/returned orders is PAID
    // Otherwise PENDING
    const isPaidFlow =
      bp.status === OrderStatus.COMPLETED ||
      bp.status === OrderStatus.DELIVERED ||
      bp.status === OrderStatus.RETURNED ||
      bp.status === OrderStatus.SHIPPING ||
      bp.status === OrderStatus.PACKED ||
      bp.status === OrderStatus.CONFIRMED;

    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    if (bp.paymentMethod === PaymentMethod.COD) {
      paymentStatus =
        bp.status === OrderStatus.COMPLETED ||
        bp.status === OrderStatus.DELIVERED ||
        bp.status === OrderStatus.RETURNED
          ? PaymentStatus.PAID
          : PaymentStatus.PENDING;
    } else if (isPaidFlow) {
      paymentStatus = PaymentStatus.PAID;
    } else {
      paymentStatus = PaymentStatus.PENDING;
    }

    const paidAt = paymentStatus === PaymentStatus.PAID ? (confirmedAt ?? createdAt) : null;
    const providerName = getPaymentProviderName(bp.paymentMethod, bp.installmentProvider);

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: bp.paymentMethod,
        status: paymentStatus,
        amount: totalAmount,
        provider: providerName,
        providerOrderId: `PAY-${order.orderNumber}`,
        paidAt,
        createdAt,
        updatedAt: paidAt ?? createdAt,
      },
    });

    if (paymentStatus === PaymentStatus.PAID) {
      await prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          transactionCode: `TXN-${formatOrderDate(createdAt)}-${String(orderIndex).padStart(4, '0')}`,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.SUCCESS,
          amount: totalAmount,
          providerReference: `REF-${bp.paymentMethod}-${formatOrderDate(createdAt)}${String(orderIndex).padStart(4, '0')}`,
          responseData: {
            responseCode: '00',
            message: 'Giao dịch thành công',
            method: bp.paymentMethod,
            orderNumber: order.orderNumber,
          },
          createdAt: paidAt ?? createdAt,
          updatedAt: paidAt ?? createdAt,
        },
      });
    }

    // Create InstallmentApplication record if payment method is INSTALLMENT
    if (bp.paymentMethod === PaymentMethod.INSTALLMENT) {
      const installmentIndex = installmentAppIdx++;
      const prepayPercent = [20, 30, 50][installmentIndex % 3];
      const termMonths = installmentIndex % 2 === 0 ? 6 : 12;
      const prepayAmount = (totalAmount * prepayPercent) / 100;
      const loanAmount = totalAmount - prepayAmount;
      const monthlyAmount = Math.round(loanAmount / termMonths + loanAmount * 0.015);
      const provider =
        bp.installmentProvider ??
        (installmentIndex % 2 === 0 ? InstallmentProvider.HOME_CREDIT : InstallmentProvider.FE_CREDIT);
      const appStatus = bp.installmentStatus ?? InstallmentStatus.APPROVED;

      let reviewedBy: string | null = null;
      let reviewedAt: Date | null = null;
      let staffNotes: string | null = null;
      let rejectionReason: string | null = null;

      if (appStatus === InstallmentStatus.APPROVED) {
        reviewedBy = staffUserId || null;
        reviewedAt = createdAt;
        staffNotes = 'Hồ sơ tín dụng tốt, đã phê duyệt giải ngân.';
      } else if (appStatus === InstallmentStatus.REJECTED) {
        reviewedBy = staffUserId || null;
        reviewedAt = createdAt;
        staffNotes = 'Hồ sơ bị từ chối do điểm tín dụng không đạt tiêu chuẩn.';
        rejectionReason = 'Điểm tín dụng CIC không đạt tiêu chuẩn';
      }

      const citizenId = `07920100${String(installmentIndex + 1).padStart(4, '0')}`;
      const birthYear = 1990 + (installmentIndex % 10);
      const birthMonth = installmentIndex % 12;
      const birthDay = ((installmentIndex * 3) % 25) + 1;
      const birthDate = new Date(birthYear, birthMonth, birthDay);

      await prisma.installmentApplication.create({
        data: {
          orderId: order.id,
          userId: customer.id,
          provider,
          status: appStatus,
          termMonths,
          prepayPercent,
          prepayAmount,
          loanAmount,
          monthlyAmount,
          fullName: customerName,
          citizenId,
          birthDate,
          phoneNumber: customer.phone,
          currentAddress: 'TP. Hồ Chí Minh',
          incomeRange: '15 - 25 triệu',
          cccdFrontUrl: 'https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev/demo/cccd_front.webp',
          cccdBackUrl: 'https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev/demo/cccd_back.webp',
          reviewedBy,
          reviewedAt,
          staffNotes,
          rejectionReason,
          createdAt,
          updatedAt: reviewedAt ?? createdAt,
        },
      });
    }

    createdOrders.push(order);
  }

  console.log(`✅ Seeded ${createdOrders.length} orders successfully.`);
  console.log(`✅ Collected ${deliveredItems.length} delivered items for warranty generation.`);

  return {
    orders: createdOrders,
    completedOrders: createdOrders.filter((o) => o.status === OrderStatus.COMPLETED),
    deliveredItems,
  };
}
