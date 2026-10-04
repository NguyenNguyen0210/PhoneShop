import { describe, it, expect, jest } from '@jest/globals';
import {
  seedOrdersAndInstallments,
  SeededOrderResult,
} from '../../prisma/seed_modules/orders_and_installments';
import { SeededCustomer } from '../../prisma/seed_modules/customers';
import {
  PrismaClient,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingStatus,
  InstallmentProvider,
  InstallmentStatus,
  ImeiStatus,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';

describe('Orders and Installments Seed Module Unit Tests', () => {
  // Generate 40 mock customers
  const mockCustomers: SeededCustomer[] = Array.from({ length: 40 }, (_, idx) => ({
    id: `cust-uuid-${idx + 1}`,
    email: `customer${idx + 1}@example.com`,
    firstName: `Khách ${idx + 1}`,
    lastName: 'Nguyễn',
    phone: `09012345${String(idx + 1).padStart(2, '0')}`,
    addressId: `addr-uuid-${idx + 1}`,
  }));

  // Generate mock variants
  const mockVariants = [
    {
      id: 'var-1',
      productId: 'prod-1',
      sku: 'SKU-IP16-128',
      name: 'iPhone 16 128GB Đen',
      price: 22000000,
      costPrice: 19000000,
      product: { name: 'iPhone 16' },
      isActive: true,
    },
    {
      id: 'var-2',
      productId: 'prod-2',
      sku: 'SKU-S24U-256',
      name: 'Samsung Galaxy S24 Ultra 256GB Xám',
      price: 29000000,
      costPrice: 25000000,
      product: { name: 'Samsung Galaxy S24 Ultra' },
      isActive: true,
    },
    {
      id: 'var-3',
      productId: 'prod-3',
      sku: 'SKU-X14-256',
      name: 'Xiaomi 14 256GB Trắng',
      price: 18000000,
      costPrice: 15000000,
      product: { name: 'Xiaomi 14' },
      isActive: true,
    },
  ];

  const staffUserId = 'staff-uuid-001';

  it('should throw an error if customers list is empty', async () => {
    const mockPrisma = {} as unknown as PrismaClient;
    const createImeiMock = jest.fn();

    await expect(
      seedOrdersAndInstallments(mockPrisma, [], staffUserId, createImeiMock as any)
    ).rejects.toThrow('No customers provided for seedOrdersAndInstallments');
  });

  it('should throw an error if no active variants are found in database', async () => {
    const mockPrisma = {
      productVariant: {
        findMany: (jest.fn() as any).mockResolvedValue([]),
      },
    } as unknown as PrismaClient;
    const createImeiMock = jest.fn();

    await expect(
      seedOrdersAndInstallments(mockPrisma, mockCustomers, staffUserId, createImeiMock as any)
    ).rejects.toThrow('No active product variants found in database');
  });

  it('should generate exactly 200 orders with correct status and payment distributions', async () => {
    const createdOrders: any[] = [];
    const createdOrderItems: any[] = [];
    const createdShippings: any[] = [];
    const createdPayments: any[] = [];
    const createdTransactions: any[] = [];
    const createdInstallments: any[] = [];

    const mockPrisma = {
      productVariant: {
        findMany: (jest.fn() as any).mockResolvedValue(mockVariants),
      },
      order: {
        create: (jest.fn() as any).mockImplementation(({ data }: any) => {
          const order = { id: `ord-uuid-${createdOrders.length + 1}`, ...data };
          createdOrders.push(order);
          return Promise.resolve(order);
        }),
      },
      orderItem: {
        create: (jest.fn() as any).mockImplementation(({ data }: any) => {
          const item = { id: `item-uuid-${createdOrderItems.length + 1}`, ...data };
          createdOrderItems.push(item);
          return Promise.resolve(item);
        }),
      },
      shipping: {
        create: (jest.fn() as any).mockImplementation(({ data }: any) => {
          const shipping = { id: `ship-uuid-${createdShippings.length + 1}`, ...data };
          createdShippings.push(shipping);
          return Promise.resolve(shipping);
        }),
      },
      payment: {
        create: (jest.fn() as any).mockImplementation(({ data }: any) => {
          const payment = { id: `pay-uuid-${createdPayments.length + 1}`, ...data };
          createdPayments.push(payment);
          return Promise.resolve(payment);
        }),
      },
      paymentTransaction: {
        create: (jest.fn() as any).mockImplementation(({ data }: any) => {
          const txn = { id: `txn-uuid-${createdTransactions.length + 1}`, ...data };
          createdTransactions.push(txn);
          return Promise.resolve(txn);
        }),
      },
      installmentApplication: {
        create: (jest.fn() as any).mockImplementation(({ data }: any) => {
          const app = { id: `inst-uuid-${createdInstallments.length + 1}`, ...data };
          createdInstallments.push(app);
          return Promise.resolve(app);
        }),
      },
    } as unknown as PrismaClient;

    let imeiCounter = 1000;
    const createImeiMock = (jest.fn() as any).mockImplementation(
      (variantId: string, sku: string, costPrice: any, status: ImeiStatus) => {
        imeiCounter++;
        return Promise.resolve({
          id: `imei-uuid-${imeiCounter}`,
          imei: `8675430${imeiCounter}12345`,
        });
      }
    );

    const result: SeededOrderResult = await seedOrdersAndInstallments(
      mockPrisma,
      mockCustomers,
      staffUserId,
      createImeiMock
    );

    // 1. Overall counts
    expect(result.orders).toHaveLength(200);
    expect(createdOrders).toHaveLength(200);
    expect(createdOrderItems.length).toBeGreaterThanOrEqual(200);
    expect(createdPayments).toHaveLength(200);
    expect(createdShippings).toHaveLength(192); // 200 - 8 CANCELLED = 192
    expect(createdInstallments).toHaveLength(20);

    // 2. Order status distribution (covers all 9 statuses)
    const statusCounts: Record<string, number> = {};
    for (const ord of createdOrders) {
      statusCounts[ord.status] = (statusCounts[ord.status] || 0) + 1;
    }
    expect(statusCounts[OrderStatus.COMPLETED]).toBe(120);
    expect(statusCounts[OrderStatus.DELIVERED]).toBe(20);
    expect(statusCounts[OrderStatus.SHIPPING]).toBe(18);
    expect(statusCounts[OrderStatus.PROCESSING]).toBe(10);
    expect(statusCounts[OrderStatus.CONFIRMED]).toBe(6);
    expect(statusCounts[OrderStatus.PACKED]).toBe(5);
    expect(statusCounts[OrderStatus.RETURNED]).toBe(5);
    expect(statusCounts[OrderStatus.PENDING]).toBe(8);
    expect(statusCounts[OrderStatus.CANCELLED]).toBe(8);

    // 3. Payment method distribution
    const methodCounts: Record<string, number> = {};
    for (const pay of createdPayments) {
      methodCounts[pay.method] = (methodCounts[pay.method] || 0) + 1;
    }
    expect(methodCounts[PaymentMethod.INSTALLMENT]).toBe(20);
    expect(methodCounts[PaymentMethod.COD]).toBe(68);
    expect(methodCounts[PaymentMethod.VNPAY]).toBe(62);
    expect(methodCounts[PaymentMethod.MOMO]).toBe(30);
    expect(methodCounts[PaymentMethod.BANK_TRANSFER]).toBe(20);

    // 4. Delivered items and IMEI attachment
    expect(result.deliveredItems.length).toBeGreaterThanOrEqual(150);
    for (const item of result.deliveredItems) {
      expect(item.orderId).toBeDefined();
      expect(item.userId).toBeDefined();
      expect(item.variantId).toBeDefined();
      expect(item.orderItemId).toBeDefined();
      expect(item.imeiDeviceId).toMatch(/^imei-uuid-/);
      expect(item.deliveredAt).toBeInstanceOf(Date);
      expect(item.productName).toBeDefined();
    }

    // 5. Installment application properties
    expect(createdInstallments).toHaveLength(20);
    const approvedInstallments = createdInstallments.filter(
      (i) => i.status === InstallmentStatus.APPROVED
    );
    const pendingInstallments = createdInstallments.filter(
      (i) => i.status === InstallmentStatus.PENDING
    );
    const rejectedInstallments = createdInstallments.filter(
      (i) => i.status === InstallmentStatus.REJECTED
    );

    expect(approvedInstallments).toHaveLength(16); // 80% of 20
    expect(pendingInstallments).toHaveLength(2); // 10% of 20
    expect(rejectedInstallments).toHaveLength(2); // 10% of 20

    for (const inst of approvedInstallments) {
      expect(inst.reviewedBy).toBe(staffUserId);
      expect(inst.reviewedAt).toBeInstanceOf(Date);
      expect(inst.staffNotes).toContain('Hồ sơ tín dụng tốt');
      expect(inst.citizenId).toHaveLength(12);
      expect([20, 30, 50]).toContain(inst.prepayPercent);
      expect([6, 12]).toContain(inst.termMonths);
    }

    for (const inst of rejectedInstallments) {
      expect(inst.reviewedBy).toBe(staffUserId);
      expect(inst.rejectionReason).toBe('Điểm tín dụng CIC không đạt tiêu chuẩn');
    }

    for (const inst of pendingInstallments) {
      expect(inst.reviewedBy).toBeNull();
      expect(inst.reviewedAt).toBeNull();
    }

    // 6. Non-cancelled orders must have shippings
    for (const ship of createdShippings) {
      expect(['Giao Hàng Nhanh', 'Viettel Post', 'Giao Hàng Tiết Kiệm']).toContain(
        ship.providerName
      );
      expect(ship.trackingNumber).toMatch(/^(GHN|VTP|GHTK)/);
      expect([
        ShippingStatus.DELIVERED,
        ShippingStatus.RETURNED,
        ShippingStatus.IN_TRANSIT,
        ShippingStatus.READY_TO_SHIP,
        ShippingStatus.PENDING,
      ]).toContain(ship.status);
    }

    // 7. Verify all PAID payments have successful PaymentTransactions
    const paidPayments = createdPayments.filter((p) => p.status === PaymentStatus.PAID);
    expect(paidPayments.length).toBe(createdTransactions.length);

    for (const txn of createdTransactions) {
      expect(txn.type).toBe(TransactionType.PAYMENT);
      expect(txn.status).toBe(TransactionStatus.SUCCESS);
      expect(txn.transactionCode).toMatch(/^TXN-/);
      expect(txn.providerReference).toBeDefined();
    }
  });
});
