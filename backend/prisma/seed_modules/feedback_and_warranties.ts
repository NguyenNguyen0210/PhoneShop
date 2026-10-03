import {
  PrismaClient,
  WarrantyStatus,
  ReturnStatus,
  RefundStatus,
  ReviewStatus,
  VoucherType,
  CartStatus,
} from '@prisma/client';
import { SeededCustomer } from './customers';
import { SeededOrderResult, DeliveredItemInfo } from './orders_and_installments';

interface VoucherSeedData {
  code: string;
  name: string;
  description: string;
  type: VoucherType;
  value: number;
  minOrderValue: number;
  maxDiscountAmount: number | null;
  usageLimit: number;
  perUserLimit: number;
  startAt: Date;
  endAt: Date;
}

const VOUCHER_SEEDS: VoucherSeedData[] = [
  {
    code: 'WELCOME50',
    name: 'Voucher Chào Mừng Khách Hàng Mới',
    description: 'Giảm 50.000đ cho đơn hàng từ 500.000đ',
    type: VoucherType.FIXED_AMOUNT,
    value: 50000,
    minOrderValue: 500000,
    maxDiscountAmount: 50000,
    usageLimit: 1000,
    perUserLimit: 1,
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-12-31T23:59:59.000Z'),
  },
  {
    code: 'FREESHIP',
    name: 'Miễn Phí Vận Chuyển Toàn Quốc',
    description: 'Giảm 35.000đ phí giao hàng cho đơn từ 200.000đ',
    type: VoucherType.FREE_SHIPPING,
    value: 35000,
    minOrderValue: 200000,
    maxDiscountAmount: 35000,
    usageLimit: 5000,
    perUserLimit: 5,
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-12-31T23:59:59.000Z'),
  },
  {
    code: 'TECHVIP10',
    name: 'Ưu Đãi Thành Viên Công Nghệ VIP',
    description: 'Giảm 10% tối đa 1.000.000đ cho đơn từ 2.000.000đ',
    type: VoucherType.PERCENTAGE,
    value: 10,
    minOrderValue: 2000000,
    maxDiscountAmount: 1000000,
    usageLimit: 500,
    perUserLimit: 2,
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-12-31T23:59:59.000Z'),
  },
  {
    code: 'FLAGSHIP500',
    name: 'Ưu Đãi Khủng Mua Smartphone Flagship',
    description: 'Giảm 500.000đ cho đơn hàng từ 15.000.000đ',
    type: VoucherType.FIXED_AMOUNT,
    value: 500000,
    minOrderValue: 15000000,
    maxDiscountAmount: 500000,
    usageLimit: 200,
    perUserLimit: 1,
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-12-31T23:59:59.000Z'),
  },
  {
    code: 'SALEMIDMONTH',
    name: 'Đại Tiệc Siêu Sale Giữa Tháng',
    description: 'Giảm 200.000đ cho đơn hàng từ 5.000.000đ',
    type: VoucherType.FIXED_AMOUNT,
    value: 200000,
    minOrderValue: 5000000,
    maxDiscountAmount: 200000,
    usageLimit: 300,
    perUserLimit: 1,
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-12-31T23:59:59.000Z'),
  },
  {
    code: 'APPFIRST',
    name: 'Ưu Đãi Đặt Hàng Đầu Tiên Mobile App',
    description: 'Giảm 100.000đ cho đơn hàng đầu tiên từ 1.000.000đ',
    type: VoucherType.FIXED_AMOUNT,
    value: 100000,
    minOrderValue: 1000000,
    maxDiscountAmount: 100000,
    usageLimit: 1000,
    perUserLimit: 1,
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-12-31T23:59:59.000Z'),
  },
];

interface ReviewContentItem {
  rating: number;
  title: string;
  content: string;
}

const FIVE_STAR_REVIEWS: ReviewContentItem[] = [
  {
    rating: 5,
    title: 'Máy nguyên seal, bảo hành điện tử chuẩn',
    content:
      'Giao hàng cực nhanh, máy đập hộp nguyên seal zin 100%. Check IMEI trên web ra ngay bảo hành 12 tháng. Rất an tâm!',
  },
  {
    rating: 5,
    title: 'Pin trâu dùng 2 ngày, màn hình siêu mượt',
    content:
      'Trải nghiệm lướt 120Hz quá mượt mà. Dùng 4G cả ngày xem video, lướt web tối về vẫn còn 35% pin.',
  },
  {
    rating: 5,
    title: 'Camera chụp đêm sắc nét đỉnh cao',
    content:
      'Chụp ảnh thiếu sáng không hề bị nhiễu hạt, màu sắc chân thực. Rất xứng đáng từng đồng.',
  },
  {
    rating: 5,
    title: 'Giao hàng hoả tốc 2 tiếng, đóng gói cẩn thận',
    content:
      'Giao hàng siêu nhanh chỉ trong 2 tiếng tại nội thành, đóng gói cẩn thận 3 lớp xốp chống sốc, nhân viên giao hàng rất lịch sự.',
  },
  {
    rating: 5,
    title: 'Trải nghiệm mượt mà, nhân viên tư vấn nhiệt tình',
    content:
      'Máy chạy cực kỳ mượt mà, nhân viên tư vấn nhiệt tình từ lúc chọn máy đến hướng dẫn chuyển dữ liệu. 5 sao cho shop!',
  },
];

const FOUR_STAR_REVIEWS: ReviewContentItem[] = [
  {
    rating: 4,
    title: 'Máy dùng tốt trong tầm giá, loa hơi nhỏ xíu',
    content:
      'Tổng thể mọi thứ đều rất hài lòng. Máy mượt, màn đẹp, chỉ có loa ngoài mở max volume hơi rè nhẹ một chút trong phòng kín.',
  },
  {
    rating: 4,
    title: 'Thiết kế đẹp, sạc hơi ấm máy',
    content:
      'Cầm nắm rất sang trọng và đầm tay, viền màn hình mỏng. Khi sạc nhanh công suất cao máy có hơi ấm nhẹ nhưng sau đó hạ nhiệt nhanh.',
  },
  {
    rating: 4,
    title: 'Tổng thể hài lòng, chỉ mong tặng thêm ốp lưng',
    content:
      'Chất lượng máy rất tốt, bảo hành chính hãng chuẩn. Chỉ mong shop tặng kèm ốp lưng hoặc dán màn hình sẵn thì tuyệt vời hơn.',
  },
];

const THREE_STAR_REVIEWS: ReviewContentItem[] = [
  {
    rating: 3,
    title: 'Giao trễ 1 ngày so với hẹn',
    content:
      'Máy dùng tốt không có gì để chê, nhưng bên vận chuyển giao trễ 1 ngày so với lịch hẹn làm mình phải đổi kế hoạch nhận hàng.',
  },
  {
    rating: 3,
    title: 'Máy hơi nóng khi chơi game liên tục',
    content:
      'Mọi tính năng bình thường mượt mà, nhưng chơi game nặng liên tục tầm 45 phút thì máy hơi nóng ở phần cụm camera.',
  },
];

const STAFF_REPLIES: string[] = [
  'Dạ MobileCommerce chân thành cảm ơn quý khách đã tin tưởng và ủng hộ cửa hàng. Chúc quý khách có trải nghiệm tuyệt vời với thiết bị mới!',
  'Dạ cảm ơn phản hồi của quý khách! Cửa hàng luôn sẵn sàng hỗ trợ kỹ thuật qua hotline 1800 6868.',
  'Dạ MobileCommerce ghi nhận góp ý của quý khách về trải nghiệm dịch vụ và sẽ nỗ lực nâng cao chất lượng phục vụ hơn nữa ạ. Cảm ơn quý khách!',
];

export async function seedFeedbackAndAftersales(
  prisma: PrismaClient,
  customers: SeededCustomer[],
  orderResult: SeededOrderResult,
  staffUserId: string,
): Promise<void> {
  console.log('\n--- Seeding Feedback, Warranties, Aftersales & Engagement ---');

  // Resolve staff user ID fallback if not provided
  let effectiveStaffId = staffUserId;
  if (!effectiveStaffId) {
    const staffUser = await prisma.user.findFirst({
      where: { email: 'staff@mobilecommerce.vn' },
      select: { id: true },
    });
    if (staffUser) {
      effectiveStaffId = staffUser.id;
    }
  }

  // Ensure customer list fallback
  let customerList = customers;
  if (!customerList || customerList.length === 0) {
    const dbCustomers = await prisma.user.findMany({
      where: {
        email: { notIn: ['admin@mobilecommerce.vn', 'staff@mobilecommerce.vn'] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
      take: 40,
    });
    customerList = dbCustomers.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      phone: u.phone ?? '',
      addressId: '',
    }));
  }

  // ============================================================
  // 1. VOUCHERS & VOUCHER USAGES
  // ============================================================
  console.log('  1. Seeding 6 promotional vouchers and ~30 usages...');
  const seededVouchers: Array<{
    id: string;
    code: string;
    type: VoucherType;
    value: any;
    maxDiscountAmount: any;
    [key: string]: any;
  }> = [];
  for (const v of VOUCHER_SEEDS) {
    const voucher = await prisma.voucher.upsert({
      where: { code: v.code },
      update: {
        name: v.name,
        description: v.description,
        type: v.type,
        value: v.value,
        minOrderValue: v.minOrderValue,
        maxDiscountAmount: v.maxDiscountAmount,
        usageLimit: v.usageLimit,
        perUserLimit: v.perUserLimit,
        startAt: v.startAt,
        endAt: v.endAt,
        isActive: true,
      },
      create: {
        code: v.code,
        name: v.name,
        description: v.description,
        type: v.type,
        value: v.value,
        minOrderValue: v.minOrderValue,
        maxDiscountAmount: v.maxDiscountAmount,
        usageLimit: v.usageLimit,
        perUserLimit: v.perUserLimit,
        startAt: v.startAt,
        endAt: v.endAt,
        isActive: true,
      },
    });
    seededVouchers.push(voucher);
  }

  // Find candidate completed orders for ~30 voucher usages
  let completedOrdersPool: Array<{
    id: string;
    userId: string;
    totalAmount?: any;
    createdAt?: Date;
  }> = [];

  if (orderResult?.completedOrders && orderResult.completedOrders.length > 0) {
    completedOrdersPool = orderResult.completedOrders.slice(0, 30);
  } else if (orderResult?.orders && orderResult.orders.length > 0) {
    completedOrdersPool = (orderResult.orders as any[])
      .filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED')
      .slice(0, 30);
  }

  if (completedOrdersPool.length < 30) {
    const dbOrders = await prisma.order.findMany({
      where: { status: { in: ['COMPLETED', 'DELIVERED'] } },
      take: 30,
      select: { id: true, userId: true, totalAmount: true, createdAt: true },
    });
    if (dbOrders.length > 0) {
      completedOrdersPool = dbOrders;
    }
  }

  let voucherUsageCount = 0;
  for (let i = 0; i < completedOrdersPool.length; i++) {
    const order = completedOrdersPool[i];
    const existingUsage = await prisma.voucherUsage.findFirst({
      where: { orderId: order.id },
    });

    if (!existingUsage) {
      const v = seededVouchers[i % seededVouchers.length];
      const discount =
        v.type === VoucherType.PERCENTAGE
          ? Math.min(200000, Number(v.maxDiscountAmount ?? 200000))
          : Number(v.value);

      await prisma.voucherUsage.create({
        data: {
          voucherId: v.id,
          userId: order.userId,
          orderId: order.id,
          discountAmount: discount,
          usedAt: order.createdAt ?? new Date(),
        },
      });

      await prisma.voucher.update({
        where: { id: v.id },
        data: { usageCount: { increment: 1 } },
      });
      voucherUsageCount++;
    }
  }
  console.log(`    + Upserted 6 vouchers, created ${voucherUsageCount} new voucher usages.`);

  // ============================================================
  // 2. ELECTRONIC WARRANTIES
  // ============================================================
  console.log('  2. Seeding Electronic Warranties for delivered order items...');
  let deliveredItemsList: DeliveredItemInfo[] = orderResult?.deliveredItems ?? [];

  if (deliveredItemsList.length === 0) {
    const dbDeliveredItems = await prisma.orderItem.findMany({
      where: {
        imeiDeviceId: { not: null },
        order: { status: { in: ['DELIVERED', 'COMPLETED'] } },
      },
      include: { order: true },
    });

    deliveredItemsList = dbDeliveredItems.map((item) => ({
      userId: item.order.userId,
      orderId: item.orderId,
      variantId: item.variantId,
      orderItemId: item.id,
      imeiDeviceId: item.imeiDeviceId ?? '',
      deliveredAt: item.order.deliveredAt ?? item.order.createdAt,
      productName: item.productName,
    }));
  }

  let warrantyCreatedCount = 0;
  for (let index = 0; index < deliveredItemsList.length; index++) {
    const item = deliveredItemsList[index];
    const startDate = item.deliveredAt ? new Date(item.deliveredAt) : new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const warrantyCode = `WAR-2026-${String(index + 10000).padStart(6, '0')}`;
    const notes =
      'Bảo hành chính hãng 12 tháng - 1 đổi 1 trong 30 ngày nếu có lỗi do nhà sản xuất.';

    await prisma.warranty.upsert({
      where: { orderItemId: item.orderItemId },
      update: {
        userId: item.userId,
        productVariantId: item.variantId,
        imeiDeviceId: item.imeiDeviceId ?? null,
        startDate,
        endDate,
        status: WarrantyStatus.ACTIVE,
        notes,
      },
      create: {
        userId: item.userId,
        productVariantId: item.variantId,
        orderItemId: item.orderItemId,
        imeiDeviceId: item.imeiDeviceId ?? null,
        warrantyCode,
        startDate,
        endDate,
        status: WarrantyStatus.ACTIVE,
        notes,
      },
    });
    warrantyCreatedCount++;
  }
  console.log(`    + Provisioned ${warrantyCreatedCount} electronic warranty records.`);

  // ============================================================
  // 3. RETURNS & REFUNDS
  // ============================================================
  console.log('  3. Seeding 5 Return & Refund requests...');
  const returnStatuses: ReturnStatus[] = [
    ReturnStatus.COMPLETED,
    ReturnStatus.COMPLETED,
    ReturnStatus.COMPLETED,
    ReturnStatus.INSPECTING,
    ReturnStatus.REJECTED,
  ];

  const returnReasons: string[] = [
    'Màn hình có 1 điểm pixel bị mờ',
    'Khay SIM bị lỏng nhẹ',
    'Đổi ý muốn lên đời Pro Max',
    'Màn hình có 1 điểm pixel bị mờ',
    'Khay SIM bị lỏng nhẹ',
  ];

  const returnCandidates = deliveredItemsList.slice(0, 5);
  for (let i = 0; i < returnCandidates.length; i++) {
    const item = returnCandidates[i];
    const returnNumber = `RET-2026-${String(i + 1).padStart(4, '0')}`;
    const status = returnStatuses[i];
    const reason = returnReasons[i];

    const requestedAt = new Date(item.deliveredAt);
    const approvedAt =
      status === ReturnStatus.REJECTED ? null : new Date(requestedAt.getTime() + 86400000);
    const receivedAt =
      status === ReturnStatus.REJECTED ? null : new Date(requestedAt.getTime() + 2 * 86400000);
    const completedAt =
      status === ReturnStatus.COMPLETED ? new Date(requestedAt.getTime() + 3 * 86400000) : null;

    let adminNote = 'Yêu cầu đổi trả đang được xử lý.';
    if (status === ReturnStatus.COMPLETED) {
      adminNote = 'Đã nhận máy, kiểm tra đúng lỗi kỹ thuật, chấp thuận hoàn tiền.';
    } else if (status === ReturnStatus.INSPECTING) {
      adminNote = 'Máy đã về trung tâm bảo hành, đang tiến hành đo đạc phần cứng.';
    } else if (status === ReturnStatus.REJECTED) {
      adminNote = 'Máy có dấu hiệu rơi cấn móp góc cạnh, từ chối chính sách đổi trả.';
    }

    const returnRecord = await prisma.return.upsert({
      where: { returnNumber },
      update: {
        status,
        reason,
        adminNote,
      },
      create: {
        orderId: item.orderId,
        userId: item.userId,
        returnNumber,
        status,
        reason,
        customerNote: 'Kính nhờ cửa hàng hỗ trợ kiểm tra và giải quyết theo chính sách đổi trả.',
        adminNote,
        requestedAt,
        approvedAt,
        receivedAt,
        completedAt,
      },
    });

    // Ensure ReturnItem attached
    const existingReturnItem = await prisma.returnItem.findFirst({
      where: {
        returnId: returnRecord.id,
        orderItemId: item.orderItemId,
      },
    });

    if (!existingReturnItem) {
      await prisma.returnItem.create({
        data: {
          returnId: returnRecord.id,
          orderItemId: item.orderItemId,
          quantity: 1,
          reason,
          condition: status === ReturnStatus.REJECTED ? 'TRẦY XƯỚC' : 'NGUYÊN VẸN',
        },
      });
    }

    // For COMPLETED returns, create Refund record
    if (status === ReturnStatus.COMPLETED) {
      const payment = await prisma.payment.findFirst({
        where: { orderId: item.orderId },
      });
      const refundNumber = `REF-2026-000${i + 1}`;

      const orderItemRecord = prisma.orderItem?.findUnique
        ? await prisma.orderItem.findUnique({
            where: { id: item.orderItemId },
            select: { unitPrice: true },
          })
        : null;
      const refundAmount =
        orderItemRecord?.unitPrice ??
        (item as any).price ??
        (item as any).unitPrice ??
        15000000;

      await prisma.refund.upsert({
        where: { refundNumber },
        update: {
          amount: refundAmount,
          status: RefundStatus.COMPLETED,
        },
        create: {
          returnId: returnRecord.id,
          paymentId: payment?.id ?? null,
          refundNumber,
          amount: refundAmount,
          status: RefundStatus.COMPLETED,
          reason: 'Hoàn tiền trả hàng thành công do sản phẩm lỗi kỹ thuật',
          providerRef: `VNPAY-REF-${String(i + 1).padStart(6, '0')}`,
          processedAt: completedAt ?? new Date(),
        },
      });
    }
  }
  console.log('    + Processed 5 return records (3 COMPLETED, 1 INSPECTING, 1 REJECTED) with refunds.');

  // ============================================================
  // 4. VERIFIED REVIEWS & SHOP REPLIES
  // ============================================================
  console.log('  4. Seeding 120 verified reviews with ~60 staff replies...');
  const allActiveProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  const productList =
    allActiveProducts.length > 0
      ? allActiveProducts
      : await prisma.product.findMany({ select: { id: true, name: true } });

  if (productList.length === 0) {
    throw new Error('No products found in database to attach reviews to.');
  }

  // Pre-load existing reviews to prevent @@unique([userId, productId]) violation
  const existingReviews = await prisma.review.findMany({
    select: { userId: true, productId: true },
  });
  const usedUserProductPairs = new Set<string>(
    existingReviews.map((r) => `${r.userId}_${r.productId}`),
  );

  // Generate 120 review content items (70% 5-star, 20% 4-star, 10% 3-star)
  // 120 * 0.70 = 84 (5-star), 120 * 0.20 = 24 (4-star), 120 * 0.10 = 12 (3-star)
  const reviewTemplates: ReviewContentItem[] = [];
  for (let i = 0; i < 84; i++) {
    reviewTemplates.push(FIVE_STAR_REVIEWS[i % FIVE_STAR_REVIEWS.length]);
  }
  for (let i = 0; i < 24; i++) {
    reviewTemplates.push(FOUR_STAR_REVIEWS[i % FOUR_STAR_REVIEWS.length]);
  }
  for (let i = 0; i < 12; i++) {
    reviewTemplates.push(THREE_STAR_REVIEWS[i % THREE_STAR_REVIEWS.length]);
  }

  // Generate candidate pairs from customers and products
  const candidatePairs: Array<{ userId: string; productId: string }> = [];
  for (let c = 0; c < customerList.length; c++) {
    for (let p = 0; p < productList.length; p++) {
      const targetProduct = productList[(c + p) % productList.length];
      const key = `${customerList[c].id}_${targetProduct.id}`;
      if (!usedUserProductPairs.has(key)) {
        candidatePairs.push({
          userId: customerList[c].id,
          productId: targetProduct.id,
        });
      }
    }
  }

  let reviewsCreated = 0;
  let repliesCreated = 0;
  const targetReviewCount = Math.min(120, candidatePairs.length);

  for (let idx = 0; idx < targetReviewCount; idx++) {
    const pair = candidatePairs[idx];
    const template = reviewTemplates[idx % reviewTemplates.length];
    usedUserProductPairs.add(`${pair.userId}_${pair.productId}`);

    const review = await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: pair.userId,
          productId: pair.productId,
        },
      },
      update: {
        rating: template.rating,
        title: template.title,
        content: template.content,
        status: ReviewStatus.APPROVED,
        isVerified: true,
      },
      create: {
        userId: pair.userId,
        productId: pair.productId,
        rating: template.rating,
        title: template.title,
        content: template.content,
        status: ReviewStatus.APPROVED,
        isVerified: true,
        createdAt: new Date(Date.now() - (idx * 2 + 1) * 3600000),
      },
    });
    reviewsCreated++;

    // For ~60 reviews (first 60), create a staff reply
    if (idx < 60 && effectiveStaffId) {
      const existingReply = await prisma.reviewReply.findFirst({
        where: { reviewId: review.id },
      });

      if (!existingReply) {
        const replyContent = STAFF_REPLIES[idx % STAFF_REPLIES.length];
        await prisma.reviewReply.create({
          data: {
            reviewId: review.id,
            userId: effectiveStaffId,
            content: replyContent,
            createdAt: new Date(review.createdAt.getTime() + 7200000),
          },
        });
        repliesCreated++;
      }
    }
  }
  console.log(`    + Created/upserted ${reviewsCreated} reviews and ${repliesCreated} staff replies.`);

  // ============================================================
  // 5. CARTS & WISHLISTS
  // ============================================================
  console.log('  5. Seeding active Carts and Wishlists for customer engagement...');
  const activeVariants = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: { id: true, price: true },
    take: 30,
  });

  // Carts for 15 customers
  const cartCustomers = customerList.slice(0, 15);
  for (let i = 0; i < cartCustomers.length; i++) {
    const cust = cartCustomers[i];
    const cart = await prisma.cart.upsert({
      where: { userId: cust.id },
      update: { status: CartStatus.ACTIVE },
      create: { userId: cust.id, status: CartStatus.ACTIVE },
    });

    if (activeVariants.length > 0) {
      const itemCount = (i % 2) + 1; // 1 or 2 items
      for (let j = 0; j < itemCount; j++) {
        const variant = activeVariants[(i * 2 + j) % activeVariants.length];
        await prisma.cartItem.upsert({
          where: {
            cartId_variantId: {
              cartId: cart.id,
              variantId: variant.id,
            },
          },
          update: {
            quantity: 1,
            unitPrice: variant.price,
          },
          create: {
            cartId: cart.id,
            variantId: variant.id,
            quantity: 1,
            unitPrice: variant.price,
          },
        });
      }
    }
  }
  console.log(`    + Seeded active Carts with items for ${cartCustomers.length} customers.`);

  // Wishlists for 20 customers
  const wishlistCustomers = customerList.slice(10, 30);
  for (let i = 0; i < wishlistCustomers.length; i++) {
    const cust = wishlistCustomers[i];
    const wishlist = await prisma.wishlist.upsert({
      where: { userId: cust.id },
      update: {},
      create: { userId: cust.id },
    });

    if (productList.length > 0) {
      const wishCount = (i % 3) + 1; // 1, 2, or 3 items
      for (let k = 0; k < wishCount; k++) {
        const prod = productList[(i * 3 + k) % productList.length];
        await prisma.wishlistItem.upsert({
          where: {
            wishlistId_productId: {
              wishlistId: wishlist.id,
              productId: prod.id,
            },
          },
          update: {},
          create: {
            wishlistId: wishlist.id,
            productId: prod.id,
          },
        });
      }
    }
  }
  console.log(`    + Seeded Wishlists with items for ${wishlistCustomers.length} customers.`);

  console.log('✅ Feedback and aftersales seed module completed successfully.\n');
}
