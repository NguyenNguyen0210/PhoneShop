import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { seedFeedbackAndAftersales } from '../../prisma/seed_modules/feedback_and_warranties';
import { SeededCustomer } from '../../prisma/seed_modules/customers';
import { SeededOrderResult, DeliveredItemInfo } from '../../prisma/seed_modules/orders_and_installments';
import {
  PrismaClient,
  WarrantyStatus,
  ReturnStatus,
  RefundStatus,
  ReviewStatus,
  VoucherType,
  CartStatus,
} from '@prisma/client';

describe('Feedback, Warranties, and Aftersales Seed Module Tests', () => {
  let mockPrisma: any;
  let mockCustomers: SeededCustomer[];
  let mockDeliveredItems: DeliveredItemInfo[];
  let mockOrderResult: SeededOrderResult;
  const staffUserId = 'staff-uuid-00000000-1111-2222-3333-444444444444';

  const upsertedVouchers: any[] = [];
  const createdVoucherUsages: any[] = [];
  const upsertedWarranties: any[] = [];
  const upsertedReturns: any[] = [];
  const createdReturnItems: any[] = [];
  const upsertedRefunds: any[] = [];
  const upsertedReviews: any[] = [];
  const createdReviewReplies: any[] = [];
  const upsertedCarts: any[] = [];
  const upsertedCartItems: any[] = [];
  const upsertedWishlists: any[] = [];
  const upsertedWishlistItems: any[] = [];

  beforeEach(() => {
    upsertedVouchers.length = 0;
    createdVoucherUsages.length = 0;
    upsertedWarranties.length = 0;
    upsertedReturns.length = 0;
    createdReturnItems.length = 0;
    upsertedRefunds.length = 0;
    upsertedReviews.length = 0;
    createdReviewReplies.length = 0;
    upsertedCarts.length = 0;
    upsertedCartItems.length = 0;
    upsertedWishlists.length = 0;
    upsertedWishlistItems.length = 0;

    mockCustomers = Array.from({ length: 40 }, (_, i) => ({
      id: `cust-uuid-${i + 1}`,
      email: `customer${i + 1}@example.com`,
      firstName: `First${i + 1}`,
      lastName: `Last${i + 1}`,
      phone: `09012345${String(i + 1).padStart(2, '0')}`,
      addressId: `addr-uuid-${i + 1}`,
    }));

    mockDeliveredItems = Array.from({ length: 110 }, (_, i) => ({
      userId: `cust-uuid-${(i % 40) + 1}`,
      orderId: `order-uuid-${i + 1}`,
      variantId: `variant-uuid-${(i % 20) + 1}`,
      orderItemId: `order-item-uuid-${i + 1}`,
      imeiDeviceId: `imei-uuid-${i + 1}`,
      deliveredAt: new Date('2026-02-15T10:00:00.000Z'),
      productName: `Smartphone Flagship Model ${(i % 10) + 1}`,
    }));

    mockOrderResult = {
      orders: Array.from({ length: 200 }, (_, i) => ({
        id: `order-uuid-${i + 1}`,
        status: i < 130 ? 'COMPLETED' : i < 150 ? 'DELIVERED' : 'PROCESSING',
      })),
      completedOrders: Array.from({ length: 50 }, (_, i) => ({
        id: `order-uuid-${i + 1}`,
        userId: `cust-uuid-${(i % 40) + 1}`,
        totalAmount: 15000000,
        createdAt: new Date('2026-02-10T10:00:00.000Z'),
      })),
      deliveredItems: mockDeliveredItems,
    };

    const mockProducts = Array.from({ length: 24 }, (_, i) => ({
      id: `product-uuid-${i + 1}`,
      name: `Smartphone Flagship Model ${i + 1}`,
    }));

    const mockVariants = Array.from({ length: 24 }, (_, i) => ({
      id: `variant-uuid-${i + 1}`,
      price: 15000000,
    }));

    mockPrisma = {
      user: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: staffUserId })),
        findMany: jest.fn().mockImplementation(() => Promise.resolve(mockCustomers)),
      },
      product: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve(mockProducts)),
      },
      productVariant: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve(mockVariants)),
      },
      voucher: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `voucher-uuid-${args.where.code}`, ...args.create };
          upsertedVouchers.push(record);
          return Promise.resolve(record);
        }),
        update: jest.fn().mockImplementation(() => Promise.resolve({})),
      },
      voucherUsage: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(null)),
        create: jest.fn().mockImplementation((args: any) => {
          const record = { id: `usage-uuid-${createdVoucherUsages.length + 1}`, ...args.data };
          createdVoucherUsages.push(record);
          return Promise.resolve(record);
        }),
      },
      warranty: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `warranty-uuid-${upsertedWarranties.length + 1}`, ...args.create };
          upsertedWarranties.push(record);
          return Promise.resolve(record);
        }),
      },
      return: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `return-uuid-${upsertedReturns.length + 1}`, ...args.create };
          upsertedReturns.push(record);
          return Promise.resolve(record);
        }),
      },
      returnItem: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(null)),
        create: jest.fn().mockImplementation((args: any) => {
          const record = { id: `return-item-uuid-${createdReturnItems.length + 1}`, ...args.data };
          createdReturnItems.push(record);
          return Promise.resolve(record);
        }),
      },
      orderItem: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve({ unitPrice: 15000000 })),
        findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      payment: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: 'payment-uuid-1' })),
      },
      refund: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `refund-uuid-${upsertedRefunds.length + 1}`, ...args.create };
          upsertedRefunds.push(record);
          return Promise.resolve(record);
        }),
      },
      review: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = {
            id: `review-uuid-${upsertedReviews.length + 1}`,
            createdAt: new Date(),
            ...args.create,
          };
          upsertedReviews.push(record);
          return Promise.resolve(record);
        }),
      },
      reviewReply: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(null)),
        create: jest.fn().mockImplementation((args: any) => {
          const record = { id: `reply-uuid-${createdReviewReplies.length + 1}`, ...args.data };
          createdReviewReplies.push(record);
          return Promise.resolve(record);
        }),
      },
      cart: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `cart-uuid-${upsertedCarts.length + 1}`, ...args.create };
          upsertedCarts.push(record);
          return Promise.resolve(record);
        }),
      },
      cartItem: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `cart-item-uuid-${upsertedCartItems.length + 1}`, ...args.create };
          upsertedCartItems.push(record);
          return Promise.resolve(record);
        }),
      },
      wishlist: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `wishlist-uuid-${upsertedWishlists.length + 1}`, ...args.create };
          upsertedWishlists.push(record);
          return Promise.resolve(record);
        }),
      },
      wishlistItem: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `wishlist-item-uuid-${upsertedWishlistItems.length + 1}`, ...args.create };
          upsertedWishlistItems.push(record);
          return Promise.resolve(record);
        }),
      },
    } as unknown as PrismaClient;
  });

  it('should seed exactly 6 realistic vouchers with correct values and constraints', async () => {
    await seedFeedbackAndAftersales(mockPrisma, mockCustomers, mockOrderResult, staffUserId);

    expect(upsertedVouchers).toHaveLength(6);
    const codes = upsertedVouchers.map((v) => v.code);
    expect(codes).toEqual([
      'WELCOME50',
      'FREESHIP',
      'TECHVIP10',
      'FLAGSHIP500',
      'SALEMIDMONTH',
      'APPFIRST',
    ]);

    const welcome = upsertedVouchers.find((v) => v.code === 'WELCOME50');
    expect(welcome.type).toBe(VoucherType.FIXED_AMOUNT);
    expect(welcome.value).toBe(50000);
    expect(welcome.minOrderValue).toBe(500000);

    const techVip = upsertedVouchers.find((v) => v.code === 'TECHVIP10');
    expect(techVip.type).toBe(VoucherType.PERCENTAGE);
    expect(techVip.value).toBe(10);
    expect(techVip.maxDiscountAmount).toBe(1000000);
    expect(techVip.minOrderValue).toBe(2000000);

    const flagship = upsertedVouchers.find((v) => v.code === 'FLAGSHIP500');
    expect(flagship.type).toBe(VoucherType.FIXED_AMOUNT);
    expect(flagship.value).toBe(500000);
    expect(flagship.minOrderValue).toBe(15000000);
  });

  it('should generate 30 voucher usages for completed orders', async () => {
    await seedFeedbackAndAftersales(mockPrisma, mockCustomers, mockOrderResult, staffUserId);

    expect(createdVoucherUsages).toHaveLength(30);
    for (const usage of createdVoucherUsages) {
      expect(usage.voucherId).toBeDefined();
      expect(usage.userId).toBeDefined();
      expect(usage.orderId).toBeDefined();
      expect(usage.discountAmount).toBeGreaterThan(0);
    }
  });

  it('should provision electronic warranties for all delivered order items', async () => {
    await seedFeedbackAndAftersales(mockPrisma, mockCustomers, mockOrderResult, staffUserId);

    expect(upsertedWarranties).toHaveLength(mockDeliveredItems.length);
    for (let i = 0; i < upsertedWarranties.length; i++) {
      const warranty = upsertedWarranties[i];
      const sourceItem = mockDeliveredItems[i];

      expect(warranty.userId).toBe(sourceItem.userId);
      expect(warranty.productVariantId).toBe(sourceItem.variantId);
      expect(warranty.orderItemId).toBe(sourceItem.orderItemId);
      expect(warranty.imeiDeviceId).toBe(sourceItem.imeiDeviceId);
      expect(warranty.warrantyCode).toBe(`WAR-2026-${String(i + 10000).padStart(6, '0')}`);
      expect(warranty.status).toBe(WarrantyStatus.ACTIVE);
      expect(warranty.notes).toContain('Bảo hành chính hãng 12 tháng');

      const start = new Date(warranty.startDate);
      const end = new Date(warranty.endDate);
      expect(end.getFullYear() - start.getFullYear()).toBe(1);
    }
  });

  it('should create 5 return requests (3 COMPLETED, 1 INSPECTING, 1 REJECTED) and 3 refunds', async () => {
    await seedFeedbackAndAftersales(mockPrisma, mockCustomers, mockOrderResult, staffUserId);

    expect(upsertedReturns).toHaveLength(5);
    const returnStatuses = upsertedReturns.map((r) => r.status);
    expect(returnStatuses).toEqual([
      ReturnStatus.COMPLETED,
      ReturnStatus.COMPLETED,
      ReturnStatus.COMPLETED,
      ReturnStatus.INSPECTING,
      ReturnStatus.REJECTED,
    ]);

    expect(upsertedReturns[0].returnNumber).toBe('RET-2026-0001');
    expect(upsertedReturns[4].returnNumber).toBe('RET-2026-0005');

    // Return items
    expect(createdReturnItems).toHaveLength(5);

    // Refunds for the 3 completed returns
    expect(upsertedRefunds).toHaveLength(3);
    expect(upsertedRefunds[0].refundNumber).toBe('REF-2026-0001');
    expect(upsertedRefunds[1].refundNumber).toBe('REF-2026-0002');
    expect(upsertedRefunds[2].refundNumber).toBe('REF-2026-0003');
    for (const ref of upsertedRefunds) {
      expect(ref.status).toBe(RefundStatus.COMPLETED);
      expect(ref.amount).toBe(15000000);
    }
  });

  it('should generate 120 verified reviews respecting unique userId-productId pairs with ~60 staff replies', async () => {
    await seedFeedbackAndAftersales(mockPrisma, mockCustomers, mockOrderResult, staffUserId);

    expect(upsertedReviews).toHaveLength(120);

    // Verify rating distribution: 70% 5-star (~84), 20% 4-star (~24), 10% 3-star (~12)
    const fiveStar = upsertedReviews.filter((r) => r.rating === 5);
    const fourStar = upsertedReviews.filter((r) => r.rating === 4);
    const threeStar = upsertedReviews.filter((r) => r.rating === 3);

    expect(fiveStar.length).toBe(84);
    expect(fourStar.length).toBe(24);
    expect(threeStar.length).toBe(12);

    // Verify all reviews are verified and approved
    for (const rev of upsertedReviews) {
      expect(rev.status).toBe(ReviewStatus.APPROVED);
      expect(rev.isVerified).toBe(true);
      expect(rev.title).toBeDefined();
      expect(rev.content).toBeDefined();
    }

    // Verify unique user-product pairs
    const pairs = upsertedReviews.map((r) => `${r.userId}_${r.productId}`);
    const uniquePairs = new Set(pairs);
    expect(uniquePairs.size).toBe(120);

    // Verify staff replies (~60 replies created with staffUserId)
    expect(createdReviewReplies).toHaveLength(60);
    for (const reply of createdReviewReplies) {
      expect(reply.userId).toBe(staffUserId);
      expect(reply.content).toMatch(/MobileCommerce|hỗ trợ kỹ thuật|Dạ cảm ơn/);
    }
  });

  it('should seed active Carts for 15 customers with 1-2 items each', async () => {
    await seedFeedbackAndAftersales(mockPrisma, mockCustomers, mockOrderResult, staffUserId);

    expect(upsertedCarts).toHaveLength(15);
    for (const cart of upsertedCarts) {
      expect(cart.status).toBe(CartStatus.ACTIVE);
    }

    // Between 15 and 30 items
    expect(upsertedCartItems.length).toBeGreaterThanOrEqual(15);
    expect(upsertedCartItems.length).toBeLessThanOrEqual(30);
  });

  it('should seed Wishlists for 20 customers with 1-3 items each', async () => {
    await seedFeedbackAndAftersales(mockPrisma, mockCustomers, mockOrderResult, staffUserId);

    expect(upsertedWishlists).toHaveLength(20);
    // Between 20 and 60 wishlist items
    expect(upsertedWishlistItems.length).toBeGreaterThanOrEqual(20);
    expect(upsertedWishlistItems.length).toBeLessThanOrEqual(60);
  });
});
