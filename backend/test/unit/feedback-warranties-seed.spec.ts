import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { seedFeedbackAndAftersales } from '../../prisma/seed_modules/feedback_and_warranties';
import { SeededCustomer } from '../../prisma/seed_modules/customers';
import { SeededOrderResult, DeliveredItemInfo } from '../../prisma/seed_modules/orders_and_installments';
import {
  PrismaClient,
  WarrantyStatus,
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
      flashSaleCampaign: {
        upsert: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'campaign-1', ...args.create })),
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(null)),
        create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'campaign-1', ...args.data })),
      },
      flashSaleItem: {
        upsert: jest.fn().mockImplementation(() => Promise.resolve({})),
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
        createMany: jest.fn().mockImplementation((args: any) => {
          for (const item of args.data) {
            upsertedWarranties.push({ id: `warranty-uuid-${upsertedWarranties.length + 1}`, ...item });
          }
          return Promise.resolve({ count: args.data.length });
        }),
      },
      orderItem: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve({ unitPrice: 15000000 })),
        findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      payment: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: 'payment-uuid-1' })),
      },
      order: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
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
        createManyAndReturn: jest.fn().mockImplementation((args: any) => {
          const created: any[] = [];
          for (const item of args.data) {
            const record = {
              id: `review-uuid-${upsertedReviews.length + 1}`,
              createdAt: item.createdAt || new Date(),
              ...item,
            };
            upsertedReviews.push(record);
            created.push(record);
          }
          return Promise.resolve(created);
        }),
      },
      reviewReply: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(null)),
        create: jest.fn().mockImplementation((args: any) => {
          const record = { id: `reply-uuid-${createdReviewReplies.length + 1}`, ...args.data };
          createdReviewReplies.push(record);
          return Promise.resolve(record);
        }),
        createMany: jest.fn().mockImplementation((args: any) => {
          for (const item of args.data) {
            createdReviewReplies.push({ id: `reply-uuid-${createdReviewReplies.length + 1}`, ...item });
          }
          return Promise.resolve({ count: args.data.length });
        }),
      },
      cart: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `cart-uuid-${upsertedCarts.length + 1}`, ...args.create };
          upsertedCarts.push(record);
          return Promise.resolve(record);
        }),
        createManyAndReturn: jest.fn().mockImplementation((args: any) => {
          const created: any[] = [];
          for (const item of args.data) {
            const record = { id: `cart-uuid-${upsertedCarts.length + 1}`, ...item };
            upsertedCarts.push(record);
            created.push(record);
          }
          return Promise.resolve(created);
        }),
      },
      cartItem: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `cart-item-uuid-${upsertedCartItems.length + 1}`, ...args.create };
          upsertedCartItems.push(record);
          return Promise.resolve(record);
        }),
        createMany: jest.fn().mockImplementation((args: any) => {
          for (const item of args.data) {
            upsertedCartItems.push({ id: `cart-item-uuid-${upsertedCartItems.length + 1}`, ...item });
          }
          return Promise.resolve({ count: args.data.length });
        }),
      },
      wishlist: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `wishlist-uuid-${upsertedWishlists.length + 1}`, ...args.create };
          upsertedWishlists.push(record);
          return Promise.resolve(record);
        }),
        createManyAndReturn: jest.fn().mockImplementation((args: any) => {
          const created: any[] = [];
          for (const item of args.data) {
            const record = { id: `wishlist-uuid-${upsertedWishlists.length + 1}`, ...item };
            upsertedWishlists.push(record);
            created.push(record);
          }
          return Promise.resolve(created);
        }),
      },
      wishlistItem: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = { id: `wishlist-item-uuid-${upsertedWishlistItems.length + 1}`, ...args.create };
          upsertedWishlistItems.push(record);
          return Promise.resolve(record);
        }),
        createMany: jest.fn().mockImplementation((args: any) => {
          for (const item of args.data) {
            upsertedWishlistItems.push({ id: `wishlist-item-uuid-${upsertedWishlistItems.length + 1}`, ...item });
          }
          return Promise.resolve({ count: args.data.length });
        }),
      },
      notification: {
        createMany: jest.fn().mockImplementation((args: any) => {
          return Promise.resolve({ count: args.data.length });
        }),
      },
      ticket: {
        upsert: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: `ticket-${args.where.code}`, ...args.create }),
        ),
        findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      ticketMessage: {
        deleteMany: jest.fn().mockImplementation(() => Promise.resolve({ count: 0 })),
        create: jest.fn().mockImplementation((args: any) =>
          Promise.resolve({ id: 'msg-uuid-1', ...args.data }),
        ),
      },
      conversation: {
        upsert: jest.fn().mockImplementation(() => Promise.resolve({})),
        findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      conversationMessage: {
        create: jest.fn().mockImplementation(() => Promise.resolve({})),
        deleteMany: jest.fn().mockImplementation(() => Promise.resolve({})),
      },
    } as unknown as PrismaClient;
  });

  it('should seed exactly 9 realistic vouchers (active/expired/upcoming) with correct values and constraints', async () => {
    await seedFeedbackAndAftersales(mockPrisma, mockCustomers, mockOrderResult, staffUserId);

    expect(upsertedVouchers).toHaveLength(9);
    const codes = upsertedVouchers.map((v) => v.code);
    expect(codes).toEqual([
      'WELCOME50',
      'FREESHIP',
      'TECHVIP10',
      'FLAGSHIP500',
      'SALEMIDMONTH',
      'APPFIRST',
      'TET2025',
      'SALE815',
      'FREESHIP50',
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

  it('should generate 120 verified reviews (50/25/15/7/3 distribution) respecting unique userId-productId pairs with ~60 staff replies', async () => {
    await seedFeedbackAndAftersales(mockPrisma, mockCustomers, mockOrderResult, staffUserId);

    expect(upsertedReviews).toHaveLength(120);

    // Verify rating distribution: 50% 5★ (60), 25% 4★ (30), 15% 3★ (18), 7% 2★ (8), 3% 1★ (4)
    const fiveStar = upsertedReviews.filter((r) => r.rating === 5);
    const fourStar = upsertedReviews.filter((r) => r.rating === 4);
    const threeStar = upsertedReviews.filter((r) => r.rating === 3);
    const twoStar = upsertedReviews.filter((r) => r.rating === 2);
    const oneStar = upsertedReviews.filter((r) => r.rating === 1);

    expect(fiveStar.length).toBe(60);
    expect(fourStar.length).toBe(30);
    expect(threeStar.length).toBe(18);
    expect(twoStar.length).toBe(8);
    expect(oneStar.length).toBe(4);

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
      expect(reply.content).toMatch(/Phone Shop|hỗ trợ kỹ thuật|Dạ cảm ơn/);
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
