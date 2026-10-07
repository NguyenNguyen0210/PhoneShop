import {
  PrismaClient,
  WarrantyStatus,
  ReturnStatus,
  RefundStatus,
  ReviewStatus,
  VoucherType,
  CartStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
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
    startAt: new Date('2026-10-14T00:00:00.000Z'),
    endAt: new Date('2026-10-18T23:59:59.000Z'),
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

const TWO_STAR_REVIEWS: ReviewContentItem[] = [
  {
    rating: 2,
    title: 'Pin tụt nhanh hơn quảng cáo',
    content:
      'Mới mua 2 tuần mà pin tụt nhanh hơn kỳ vọng, on-screen chỉ tầm 5 tiếng. Shop bảo theo dõi thêm 1 tháng, hơi thất vọng.',
  },
  {
    rating: 2,
    title: 'Máy nóng + sạc chậm',
    content:
      'Chơi game nhẹ 30 phút đã nóng ran, sạc đầy mất gần 2 tiếng. Tầm giá này mình kỳ vọng tốt hơn.',
  },
];

const ONE_STAR_REVIEWS: ReviewContentItem[] = [
  {
    rating: 1,
    title: 'Màn ám vàng, đổi trả khó khăn',
    content:
      'Nhận máy thấy màn ám vàng nhẹ ở mép, liên hệ đổi thì phải chờ kiểm tra 7 ngày. Trải nghiệm chưa tốt, mong shop cải thiện.',
  },
  {
    rating: 1,
    title: 'Giao nhầm màu, hỗ trợ chậm',
    content:
      'Đặt màu đen giao màu xanh, gọi hotline 2 ngày mới có người xử lý. Máy thì ổn nhưng khâu vận hành cần tốt hơn.',
  },
];

const STAFF_REPLIES: string[] = [
  'Dạ Phone Shop chân thành cảm ơn quý khách đã tin tưởng và ủng hộ cửa hàng. Chúc quý khách có trải nghiệm tuyệt vời với thiết bị mới!',
  'Dạ cảm ơn phản hồi của quý khách! Cửa hàng luôn sẵn sàng hỗ trợ kỹ thuật qua hotline 1800 6868.',
  'Dạ Phone Shop ghi nhận góp ý của quý khách về trải nghiệm dịch vụ và sẽ nỗ lực nâng cao chất lượng phục vụ hơn nữa ạ. Cảm ơn quý khách!',
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
      where: { email: 'staff@phoneshop.vn' },
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
        email: {
          notIn: ['admin@phoneshop.vn', 'staff@phoneshop.vn'],
        },
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
  // 1. VOUCHERS & VOUCHER USAGES (Active + Expired + Upcoming)
  // ============================================================
  console.log('  1. Seeding 9 promotional vouchers (active/expired/upcoming) and ~30 usages...');
  const nowTs = Date.now();
  const DAY = 86400000;
  const EXTRA_VOUCHERS: typeof VOUCHER_SEEDS = [
    {
      code: 'TET2025',
      name: 'Ưu Đãi Đón Tết Nguyên Đán 2025',
      description: 'Ưu đãi đón Tết Nguyên Đán cho đơn hàng từ 10.000.000đ',
      type: VoucherType.FIXED_AMOUNT,
      value: 500000,
      minOrderValue: 10000000,
      maxDiscountAmount: 500000,
      usageLimit: 200,
      perUserLimit: 1,
      startAt: new Date(nowTs - 400 * DAY),
      endAt: new Date(nowTs - 300 * DAY),
    },
    {
      code: 'SALE815',
      name: 'Siêu Hội Mua Sắm Siêu Sale 8.8',
      description: 'Ưu đãi giảm 15% tối đa 1.500.000₫ cho đơn từ 5.000.000đ',
      type: VoucherType.PERCENTAGE,
      value: 15,
      minOrderValue: 5000000,
      maxDiscountAmount: 1500000,
      usageLimit: 1000,
      perUserLimit: 1,
      startAt: new Date(nowTs + 30 * DAY),
      endAt: new Date(nowTs + 60 * DAY),
    },
    {
      code: 'FREESHIP50',
      name: 'Miễn Phí Vận Chuyển Đơn Từ 500k',
      description: 'Áp dụng cho mọi đơn hàng điện thoại từ 500k',
      type: VoucherType.FREE_SHIPPING,
      value: 30000,
      minOrderValue: 500000,
      maxDiscountAmount: 30000,
      usageLimit: 2000,
      perUserLimit: 2,
      startAt: new Date(nowTs - 200 * DAY),
      endAt: new Date(nowTs - 100 * DAY),
    },
  ];
  const ALL_VOUCHERS = [...VOUCHER_SEEDS, ...EXTRA_VOUCHERS];
  const seededVouchers: Array<{
    id: string;
    code: string;
    type: VoucherType;
    value: any;
    maxDiscountAmount: any;
    [key: string]: any;
  }> = [];
  for (const v of ALL_VOUCHERS) {
    const isPast = new Date(v.endAt).getTime() < nowTs;
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
        isActive: !isPast,
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
        isActive: !isPast,
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
  console.log(`    + Upserted ${seededVouchers.length} vouchers, created ${voucherUsageCount} new voucher usages.`);

  // ============================================================
  // 1b. FLASH SALE CAMPAIGNS (Active + Expired) — top-discount sort testing
  // ============================================================
  console.log('  1b. Seeding Flash Sale campaigns...');
  const flashVariants = await prisma.productVariant.findMany({
    where: { isActive: true, compareAtPrice: { not: null } },
    select: { id: true, price: true, compareAtPrice: true },
    take: 12,
  });
  if (flashVariants.length >= 8) {
    const HOUR = 3600000;
    const FRIENDLY_DESC = 'Săn deal công nghệ chớp nhoáng — 8 dòng điện thoại giảm sâu nhất tuần';
    // Khung giờ vàng trong ngày để giữ hiệu ứng FOMO (kết thúc sau vài tiếng, không để 100+ giờ)
    const activeStart = new Date(nowTs - 1 * HOUR);
    const activeEnd = new Date(nowTs + 4 * HOUR + 44 * 60 * 1000);
    // % giảm giá đa dạng, bất quy tắc như thực tế (tránh hardcode đồng loạt -12%)
    const DISCOUNT_RATES = [0.15, 0.24, 0.08, 0.31, 0.18, 0.27, 0.12, 0.21];
    const STOCK_LIMITS = [20, 15, 25, 12, 30, 18, 22, 16];
    const SOLD_COUNTS = [6, 12, 3, 10, 9, 15, 2, 13];
    const activeCampaign = await prisma.flashSaleCampaign.upsert({
      where: { id: '00000000-0000-4000-8000-flashsale01' } as any,
      update: {
        name: 'Flash Sale Giữa Tháng',
        description: FRIENDLY_DESC,
        startAt: activeStart,
        endAt: activeEnd,
        isActive: true,
      },
      create: {
        name: 'Flash Sale Giữa Tháng',
        description: FRIENDLY_DESC,
        startAt: activeStart,
        endAt: activeEnd,
        isActive: true,
      },
    }).catch(async () => {
      const existing = await prisma.flashSaleCampaign.findFirst({ where: { name: 'Flash Sale Giữa Tháng' } });
      if (existing) {
        return await prisma.flashSaleCampaign.update({
          where: { id: (existing as any).id },
          data: {
            description: FRIENDLY_DESC,
            startAt: activeStart,
            endAt: activeEnd,
            isActive: true,
          },
        });
      }
      return (await prisma.flashSaleCampaign.create({
        data: {
          name: 'Flash Sale Giữa Tháng',
          description: FRIENDLY_DESC,
          startAt: activeStart,
          endAt: activeEnd,
          isActive: true,
        },
      }));
    });
    for (let i = 0; i < 8; i++) {
      const v = flashVariants[i];
      const flashPrice = Math.round(Number(v.price) * (1 - DISCOUNT_RATES[i]) / 1000) * 1000;
      await prisma.flashSaleItem.upsert({
        where: { campaignId_variantId: { campaignId: (activeCampaign as any).id, variantId: v.id } },
        update: { flashPrice, stockLimit: STOCK_LIMITS[i], soldCount: SOLD_COUNTS[i] },
        create: { campaignId: (activeCampaign as any).id, variantId: v.id, flashPrice, stockLimit: STOCK_LIMITS[i], soldCount: SOLD_COUNTS[i] },
      });
    }
    const expiredCampaign = await prisma.flashSaleCampaign.findFirst({ where: { name: 'Flash Sale Khai Trương' } })
      ?? await prisma.flashSaleCampaign.create({
        data: {
          name: 'Flash Sale Khai Trương',
          description: 'Campaign đã kết thúc để test expired',
          startAt: new Date(nowTs - 60 * DAY),
          endAt: new Date(nowTs - 53 * DAY),
          isActive: false,
        },
      });
    for (let i = 8; i < Math.min(12, flashVariants.length); i++) {
      const v = flashVariants[i];
      const flashPrice = Math.round(Number(v.price) * 0.9 / 1000) * 1000;
      await prisma.flashSaleItem.upsert({
        where: { campaignId_variantId: { campaignId: (expiredCampaign as any).id, variantId: v.id } },
        update: {},
        create: { campaignId: (expiredCampaign as any).id, variantId: v.id, flashPrice, stockLimit: 30, soldCount: 30 },
      });
    }
    console.log('    + 1 ACTIVE + 1 EXPIRED flash sale campaigns.');
  }

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

  const warrantyData = deliveredItemsList.map((item, index) => {
    const startDate = item.deliveredAt ? new Date(item.deliveredAt) : new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const warrantyCode = `WAR-2026-${String(index + 10000).padStart(6, '0')}`;
    const notes =
      'Bảo hành chính hãng 12 tháng - 1 đổi 1 trong 30 ngày nếu có lỗi do nhà sản xuất.';

    return {
      userId: item.userId,
      productVariantId: item.variantId,
      orderItemId: item.orderItemId,
      imeiDeviceId: item.imeiDeviceId || null,
      warrantyCode,
      startDate,
      endDate,
      status: WarrantyStatus.ACTIVE,
      notes,
    };
  });

  const warrantyResult = await prisma.warranty.createMany({
    data: warrantyData,
    skipDuplicates: true,
  });
  const warrantyCreatedCount = warrantyResult.count;
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

  // Generate 120 review content items (50% 5★, 25% 4★, 15% 3★, 7% 2★, 3% 1★)
  // 60 + 30 + 18 + 8 + 4 = 120 — realistic + covers minRating 5/4/3 + low-rated products
  const reviewTemplates: ReviewContentItem[] = [];
  for (let i = 0; i < 60; i++) {
    reviewTemplates.push(FIVE_STAR_REVIEWS[i % FIVE_STAR_REVIEWS.length]);
  }
  for (let i = 0; i < 30; i++) {
    reviewTemplates.push(FOUR_STAR_REVIEWS[i % FOUR_STAR_REVIEWS.length]);
  }
  for (let i = 0; i < 18; i++) {
    reviewTemplates.push(THREE_STAR_REVIEWS[i % THREE_STAR_REVIEWS.length]);
  }
  for (let i = 0; i < 8; i++) {
    reviewTemplates.push(TWO_STAR_REVIEWS[i % TWO_STAR_REVIEWS.length]);
  }
  for (let i = 0; i < 4; i++) {
    reviewTemplates.push(ONE_STAR_REVIEWS[i % ONE_STAR_REVIEWS.length]);
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

  const targetReviewCount = Math.min(120, candidatePairs.length);
  const reviewsToInsert: any[] = [];
  for (let idx = 0; idx < targetReviewCount; idx++) {
    const pair = candidatePairs[idx];
    const template = reviewTemplates[idx % reviewTemplates.length];
    usedUserProductPairs.add(`${pair.userId}_${pair.productId}`);

    const attachImages = idx % 3 === 0
      ? [
          'https://images.unsplash.com/photo-1511707171634-5f897ff02545?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
        ].slice(0, (idx % 2) + 1)
      : [];

    reviewsToInsert.push({
      userId: pair.userId,
      productId: pair.productId,
      rating: template.rating,
      title: template.title,
      content: template.content,
      images: attachImages,
      status: ReviewStatus.APPROVED,
      isVerified: true,
      createdAt: new Date(Date.now() - (idx * 2 + 1) * 3600000),
    });
  }

  const createdReviews = await prisma.review.createManyAndReturn({
    data: reviewsToInsert,
    skipDuplicates: true,
  });
  const reviewsCreated = createdReviews.length;

  let repliesCreated = 0;
  if (effectiveStaffId && createdReviews.length > 0) {
    const replyCount = Math.min(60, createdReviews.length);
    const repliesToInsert: any[] = [];
    for (let idx = 0; idx < replyCount; idx++) {
      const review = createdReviews[idx];
      repliesToInsert.push({
        reviewId: review.id,
        userId: effectiveStaffId,
        content: STAFF_REPLIES[idx % STAFF_REPLIES.length],
        createdAt: new Date(review.createdAt.getTime() + 7200000),
      });
    }
    const replyRes = await prisma.reviewReply.createMany({
      data: repliesToInsert,
      skipDuplicates: true,
    });
    repliesCreated = replyRes.count;
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
  const createdCarts = await prisma.cart.createManyAndReturn({
    data: cartCustomers.map((c) => ({
      userId: c.id,
      status: CartStatus.ACTIVE,
    })),
    skipDuplicates: true,
  });

  const cartItemsToInsert: any[] = [];
  createdCarts.forEach((cart, i) => {
    if (activeVariants.length > 0) {
      const itemCount = (i % 2) + 1; // 1 or 2 items
      for (let j = 0; j < itemCount; j++) {
        const variant = activeVariants[(i * 2 + j) % activeVariants.length];
        cartItemsToInsert.push({
          cartId: cart.id,
          variantId: variant.id,
          quantity: 1,
          unitPrice: variant.price,
        });
      }
    }
  });
  if (cartItemsToInsert.length > 0) {
    await prisma.cartItem.createMany({
      data: cartItemsToInsert,
      skipDuplicates: true,
    });
  }
  console.log(`    + Seeded active Carts with items for ${cartCustomers.length} customers.`);

  // Wishlists for 20 customers
  const wishlistCustomers = customerList.slice(10, 30);
  const createdWishlists = await prisma.wishlist.createManyAndReturn({
    data: wishlistCustomers.map((c) => ({
      userId: c.id,
    })),
    skipDuplicates: true,
  });

  const wishlistItemsToInsert: any[] = [];
  createdWishlists.forEach((wishlist, i) => {
    if (productList.length > 0) {
      const wishCount = (i % 3) + 1; // 1, 2, or 3 items
      for (let k = 0; k < wishCount; k++) {
        const prod = productList[(i * 3 + k) % productList.length];
        wishlistItemsToInsert.push({
          wishlistId: wishlist.id,
          productId: prod.id,
        });
      }
    }
  });
  if (wishlistItemsToInsert.length > 0) {
    await prisma.wishlistItem.createMany({
      data: wishlistItemsToInsert,
      skipDuplicates: true,
    });
  }
  console.log(`    + Seeded Wishlists with items for ${wishlistCustomers.length} customers.`);

  console.log('  6. Seeding realistic Notifications for customer engagement...');
  const notifCustomers = customerList.slice(0, 30);
  const notificationsToInsert: any[] = [];
  for (const user of notifCustomers) {
    notificationsToInsert.push({
      userId: user.id,
      type: 'SYSTEM',
      channel: 'IN_APP',
      title: 'Chào mừng bạn đến với PhoneShop',
      message: `Xin chào ${user.firstName || 'bạn'}, cảm ơn bạn đã gia nhập PhoneShop! Trải nghiệm mua sắm đồ công nghệ chính hãng hàng đầu.`,
      data: { welcome: true },
      isRead: true,
      readAt: new Date(Date.now() - 7 * 86400000),
      createdAt: new Date(Date.now() - 7 * 86400000),
    });
    notificationsToInsert.push({
      userId: user.id,
      type: 'PROMOTION',
      channel: 'IN_APP',
      title: '🎁 Ưu đãi đặc quyền: Giảm 200.000đ cho đơn hàng tiếp theo',
      message: 'Áp dụng mã PHONENEW khi thanh toán đơn hàng từ 5.000.000đ. Số lượng có hạn!',
      data: { couponCode: 'PHONENEW', discountAmount: 200000 },
      isRead: false,
      createdAt: new Date(Date.now() - 4 * 3600000),
    });
  }
  if (prisma.notification && notificationsToInsert.length > 0) {
    await prisma.notification.createMany({
      data: notificationsToInsert,
      skipDuplicates: true,
    });
  }
  console.log(`    + Seeded ${notificationsToInsert.length} notifications for ${notifCustomers.length} customers.`);

  // ============================================================
  // 7. SUPPORT TICKETS, LIVE CHAT & INQUIRIES
  // ============================================================
  console.log('  7. Seeding 13 realistic Support Tickets & Live Chat conversations...');
  const sampleOrders = await prisma.order.findMany({
    select: { id: true, userId: true, orderNumber: true },
    take: 10,
  });

  const ticketBlueprints = [
    {
      code: 'TK-202610-0001',
      title: 'Yêu cầu đổi địa chỉ nhận hàng do đi công tác đột xuất',
      category: TicketCategory.ORDER_INQUIRY,
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      linkOrder: true,
      assigned: false,
      minutesAgo: 45,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Chào shop, mình vừa đặt đơn hàng nhưng mai mình phải đi công tác gấp ra Hà Nội. Nhờ shop đổi địa chỉ nhận hàng giúp mình sang số 18 Hoàng Đạo Thúy, Cầu Giấy được không ạ? Cảm ơn shop nhiều.',
          minsAfter: 0,
        },
      ],
    },
    {
      code: 'TK-202610-0002',
      title: '[Live Chat] Tư vấn chọn màu iPhone 15 Pro và thời gian giao hỏa tốc',
      category: TicketCategory.PRODUCT_INQUIRY,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      linkOrder: false,
      assigned: false,
      minutesAgo: 30,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Dạ shop ơi, em đang phân vân giữa màu Titan Tự nhiên và Titan Xanh. Bản nào nhìn sang hơn ạ? Với nếu em đặt trong tối nay thì sáng mai ở Q.1 nhận kịp không shop?',
          minsAfter: 0,
        },
      ],
    },
    {
      code: 'TK-202610-0003',
      title: 'Báo lỗi trừ tiền thẻ tín dụng nhưng chưa thấy xác nhận đơn hàng',
      category: TicketCategory.PAYMENT_INSTALLMENT,
      priority: TicketPriority.URGENT,
      status: TicketStatus.OPEN,
      linkOrder: true,
      assigned: false,
      minutesAgo: 15,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Tôi thanh toán đơn hàng qua cổng thẻ tín dụng Techcombank, tài khoản đã bị trừ tiền nhưng hệ thống báo lỗi Timeout và đơn hàng vẫn ở trạng thái Chờ thanh toán. Yêu cầu bộ phận tài chính kiểm tra gấp!',
          minsAfter: 0,
        },
      ],
    },
    {
      code: 'TK-202610-0004',
      title: 'Màn hình xuất hiện sọc xanh sau 2 tuần mua máy',
      category: TicketCategory.WARRANTY_SUPPORT,
      priority: TicketPriority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      linkOrder: true,
      assigned: true,
      minutesAgo: 240,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Chào PhoneShop, máy mình mua cách đây 2 tuần tự nhiên sáng nay bật lên bị 1 đường sọc xanh mảnh ở mép phải màn hình. Máy không hề rơi rớt hay dính nước, còn nguyên bảo hành. Cần hỗ trợ gấp.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: true,
          text: 'Kỹ thuật đã xem ảnh chụp IMEI từ khách hàng. Xác định máy còn bảo hành chính hãng 11 tháng. Đã tạo phiếu hẹn mang máy qua TTBH 86 Nguyễn Trãi để đổi cụm màn hình mới theo chính sách 1 đổi 1 30 ngày.',
          minsAfter: 20,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ chào anh/chị, PhoneShop rất tiếc về sự cố này. Theo chính sách của cửa hàng trong 30 ngày đầu, máy anh/chị được áp dụng bảo hành 1 đổi 1 linh kiện chính hãng. Kỹ thuật viên đã tiếp nhận thông tin và mời anh/chị mang máy qua chi nhánh gần nhất để được kiểm tra thay thế ngay trong ngày ạ.',
          minsAfter: 25,
        },
      ],
    },
    {
      code: 'TK-202610-0005',
      title: '[Live Chat] Hỏi chính sách thu cũ đổi mới lên đời Samsung Galaxy S24 Ultra',
      category: TicketCategory.PRODUCT_INQUIRY,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      linkOrder: false,
      assigned: true,
      minutesAgo: 180,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Em đang xài Galaxy S22 Ultra 256GB bản VN fullbox, bên shop có thu lại bù tiền lấy S24 Ultra không ạ? Trợ giá thu cũ bao nhiêu % vậy shop?',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ PhoneShop có chương trình Trade-in Thu cũ đổi mới trợ giá lên đến 2.500.000₫ ạ! Với dòng S22 Ultra ngoại hình đẹp máy loại 1, bên em định giá dự kiến từ 11 - 12.5 triệu tùy tình trạng pin và viền máy. Bạn có thể ghé shop để kỹ thuật test máy trong 15 phút nhé.',
          minsAfter: 10,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Dạ tuyệt quá, chiều nay khoảng 17h mình ghé cửa hàng nha shop!',
          minsAfter: 15,
        },
      ],
    },
    {
      code: 'TK-202610-0006',
      title: 'Cần hỗ trợ đóng gói và mã vận chuyển gửi đổi trả sản phẩm',
      category: TicketCategory.RETURN_REFUND,
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      linkOrder: true,
      assigned: true,
      minutesAgo: 360,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Phiếu yêu cầu đổi trả của mình đã được duyệt, nhưng mình chưa nhận được mã vận đơn gửi hàng của bên Viettel Post. Nhờ CSKH gửi lại mã giúp mình.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: true,
          text: 'Đã liên hệ điều phối bưu cục Viettel Post khu vực Tân Bình, mã vận đơn tạo bổ sung: VTP-99281726.',
          minsAfter: 30,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ chào anh/chị, bên em đã gửi mã bưu gửi miễn phí VTP-99281726 qua tin nhắn SMS và email của anh/chị rồi ạ. Shipper bưu tá sẽ liên hệ lấy hàng tận nơi trong chiều nay ạ.',
          minsAfter: 35,
        },
      ],
    },
    {
      code: 'TK-202610-0007',
      title: 'Yêu cầu xuất lại hóa đơn GTGT điện tử công ty (sai mã số thuế)',
      category: TicketCategory.ORDER_INQUIRY,
      priority: TicketPriority.LOW,
      status: TicketStatus.IN_PROGRESS,
      linkOrder: true,
      assigned: true,
      minutesAgo: 500,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Kế toán bên mình kiểm tra hóa đơn điện tử đơn hàng bị sai 1 số cuối của MST. Kính nhờ PhoneShop xuất biên bản điều chỉnh và gửi lại hóa đơn thay thế qua email ketoan@vietnamcorp.vn.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ bộ phận Kế toán của PhoneShop đã nhận được thông tin và đang lập biên bản điều chỉnh hóa đơn điện tử. Bản sửa đổi sẽ được gửi qua email cho quý công ty trong vòng 24h làm việc ạ.',
          minsAfter: 45,
        },
      ],
    },
    {
      code: 'TK-202610-0008',
      title: '[Live Chat] Hướng dẫn kích hoạt tính năng eSIM trên điện thoại mới nhận',
      category: TicketCategory.PRODUCT_INQUIRY,
      priority: TicketPriority.LOW,
      status: TicketStatus.RESOLVED,
      linkOrder: false,
      assigned: true,
      minutesAgo: 1440,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Mình mới nhận điện thoại hồi sáng mà quét mã QR eSIM Viettel báo lỗi không thêm được gói cước, shop chỉ mình với.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ anh/chị vào Cài đặt -> Mạng di động -> Thêm eSIM -> Quét mã QR, lưu ý điện thoại cần kết nối Wifi ổn định trước khi quét mã kích hoạt nhé ạ.',
          minsAfter: 5,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Mình kết nối Wifi rồi quét được ngay rồi, cảm ơn bạn nhân viên hỗ trợ nhiệt tình nhé!',
          minsAfter: 12,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ vâng, chúc anh/chị có trải nghiệm tuyệt vời cùng máy mới ạ! Em xin phép đóng phiên hỗ trợ này nhé ạ.',
          minsAfter: 15,
        },
      ],
    },
    {
      code: 'TK-202610-0009',
      title: 'Thắc mắc lịch thanh toán trả góp kỳ đầu tiên qua Home Credit',
      category: TicketCategory.PAYMENT_INSTALLMENT,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.RESOLVED,
      linkOrder: true,
      assigned: true,
      minutesAgo: 2000,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Hồ sơ trả góp của tôi duyệt ngày 15/09, tôi muốn hỏi ngày thanh toán hàng tháng là ngày bao nhiêu và đóng qua app nào thì không bị phí trễ hạn?',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ chào anh, kỳ hạn thanh toán cố định là ngày 15 hàng tháng ạ. Anh có thể tải app Home Credit hoặc đóng trực tiếp qua MoMo/ZaloPay mục Thanh toán khoản vay, nhập số hợp đồng để tra cứu và thanh toán tiện lợi ạ.',
          minsAfter: 30,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Mình đã tra cứu thành công trên MoMo rồi, cảm ơn shop.',
          minsAfter: 45,
        },
      ],
    },
    {
      code: 'TK-202610-0010',
      title: 'Khôi phục mật khẩu tài khoản và cập nhật số điện thoại nhận thông báo',
      category: TicketCategory.ACCOUNT_GENERAL,
      priority: TicketPriority.LOW,
      status: TicketStatus.RESOLVED,
      linkOrder: false,
      assigned: true,
      minutesAgo: 2880,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Số điện thoại cũ của mình bị mất sim, nhờ hỗ trợ xác minh đổi số điện thoại trên tài khoản để nhận mã OTP nhận hàng.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: true,
          text: 'Đã kiểm tra lịch sử đơn hàng và đối chiếu giấy tờ tùy thân CCCD khớp thông tin tài khoản.',
          minsAfter: 20,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ bộ phận CSKH đã cập nhật số điện thoại mới thành công. Anh/chị có thể đăng nhập lại và đổi mật khẩu bình thường rồi ạ.',
          minsAfter: 25,
        },
      ],
    },
    {
      code: 'TK-202610-0011',
      title: '[Live Chat] Kiểm tra tồn kho Xiaomi 14 Ultra tại chi nhánh Cầu Giấy',
      category: TicketCategory.PRODUCT_INQUIRY,
      priority: TicketPriority.LOW,
      status: TicketStatus.CLOSED,
      linkOrder: false,
      assigned: true,
      minutesAgo: 4000,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Shop cho mình hỏi bản màu Đen 512GB ở shop Cầu Giấy còn hàng sẵn để qua xem máy không?',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ chi nhánh 134 Cầu Giấy hiện có sẵn 2 máy nguyên seal ạ. Anh có muốn em giữ máy trước cho anh đến 20h tối nay không ạ?',
          minsAfter: 4,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Ok giữ giúp mình nhé, sđt mình là 0912345678, lát tan làm mình ghé liền.',
          minsAfter: 8,
        },
      ],
    },
    {
      code: 'TK-202610-0012',
      title: 'Tư vấn mua gói bảo hành mở rộng rơi vỡ vào nước PhoneShop Care+',
      category: TicketCategory.WARRANTY_SUPPORT,
      priority: TicketPriority.LOW,
      status: TicketStatus.CLOSED,
      linkOrder: true,
      assigned: true,
      minutesAgo: 5000,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Máy mình mua được 5 ngày, giờ mình muốn mua thêm gói bảo hành rơi vỡ 1 năm thì làm thế nào?',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ trong vòng 30 ngày kể từ ngày nhận máy, anh chỉ cần mang máy ra shop để nhân viên kỹ thuật kiểm tra ngoại quan nguyên vẹn là có thể kích hoạt gói PhoneShop Care+ 12 tháng với giá ưu đãi giảm 20% ạ!',
          minsAfter: 25,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Cảm ơn bạn, mình vừa ghé shop mua xong rồi, dịch vụ rất chu đáo!',
          minsAfter: 60,
        },
      ],
    },
    {
      code: 'TK-202610-0013',
      title: 'Phản ánh shipper giao hàng trễ hẹn không liên hệ trước',
      category: TicketCategory.ORDER_INQUIRY,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.CLOSED,
      linkOrder: true,
      assigned: true,
      minutesAgo: 6000,
      messages: [
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Hôm qua hẹn giao buổi sáng mà đến chiều tối mới giao, lúc tới nơi cũng không gọi trước 15 phút làm mình phải nhờ bảo vệ nhận hộ.',
          minsAfter: 0,
        },
        {
          isStaff: true,
          isInternalNote: false,
          text: 'Dạ PhoneShop chân thành xin lỗi anh vì sự bất tiện này. Bên em đã làm việc với đối tác vận chuyển để chấn chỉnh tài xế và gửi tặng anh mã voucher giảm giá cho đơn hàng sau ạ.',
          minsAfter: 40,
        },
        {
          isStaff: false,
          isInternalNote: false,
          text: 'Cảm ơn shop đã lắng nghe và xử lý nhanh chóng.',
          minsAfter: 90,
        },
      ],
    },
  ];

  let seededTicketCount = 0;
  for (let idx = 0; idx < ticketBlueprints.length; idx++) {
    const bp = ticketBlueprints[idx];
    const customer = customerList[idx % customerList.length];
    const order =
      bp.linkOrder && sampleOrders.length > 0 ? sampleOrders[idx % sampleOrders.length] : null;

    const createdAt = new Date(Date.now() - bp.minutesAgo * 60000);
    const resolvedAt =
      bp.status === TicketStatus.RESOLVED || bp.status === TicketStatus.CLOSED
        ? new Date(createdAt.getTime() + 60 * 60000)
        : null;

    const ticket = await prisma.ticket.upsert({
      where: { code: bp.code },
      update: {
        title: bp.title,
        category: bp.category,
        priority: bp.priority,
        status: bp.status,
        userId: customer.id,
        orderId: order?.id || null,
        assignedToId: bp.assigned ? effectiveStaffId : null,
        resolvedAt,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 10 * 60000),
      },
      create: {
        code: bp.code,
        title: bp.title,
        category: bp.category,
        priority: bp.priority,
        status: bp.status,
        userId: customer.id,
        orderId: order?.id || null,
        assignedToId: bp.assigned ? effectiveStaffId : null,
        resolvedAt,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 10 * 60000),
      },
    });

    // Clear previous messages to avoid duplicates on re-seed
    await prisma.ticketMessage.deleteMany({
      where: { ticketId: ticket.id },
    });

    for (const msg of bp.messages) {
      const msgCreatedAt = new Date(createdAt.getTime() + (msg.minsAfter || 0) * 60000);
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: msg.isStaff ? effectiveStaffId : customer.id,
          message: msg.text,
          isInternalNote: Boolean(msg.isInternalNote),
          createdAt: msgCreatedAt,
        },
      });
    }

    seededTicketCount++;
  }
  console.log(`    + Successfully seeded ${seededTicketCount} tickets and conversation threads.`);

  console.log('✅ Feedback and aftersales seed module completed successfully.\n');
}
