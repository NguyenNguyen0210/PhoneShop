import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { WarrantyService } from '../src/modules/warranty/warranty.service';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, ImeiStatus } from '@prisma/client';

describe('OrdersService - Return & Refund Lifecycle (PR #3)', () => {
  let ordersService: OrdersService;
  let prisma: any;
  let warrantyService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentTransaction: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ quantity: 10 }),
      },
      stockMovement: {
        create: jest.fn(),
      },
      imeiDevice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    warrantyService = {
      voidWarrantiesForOrder: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: WarrantyService, useValue: warrantyService },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('nên chặn transitionStatus trực tiếp từ DELIVERED sang RETURNED', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'del-1',
      status: OrderStatus.DELIVERED,
      items: [],
    });

    await expect(
      ordersService.transitionStatus('del-1', OrderStatus.RETURNED),
    ).rejects.toThrow(BadRequestException);
  });

  it('hoàn tiền đơn DELIVERED và cách ly IMEI, không tự nhập lại kho khả dụng', async () => {
    const mockOrder = {
      id: 'del-2',
      orderNumber: 'ORD-DEL-2',
      status: OrderStatus.DELIVERED,
      userId: 'customer-1',
      totalAmount: 15000000,
      payments: [{ id: 'p2', status: PaymentStatus.PAID, amount: 15000000 }],
      items: [{ variantId: 'v2', quantity: 1, imeiDeviceId: 'imei-2' }],
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.paymentTransaction.create.mockResolvedValue({ id: 'refund-tx' });

    const result = await ordersService.processRefund('del-2', {
      reason: 'Hàng lỗi màn hình',
      amount: 15000000,
      providerReference: 'BANK-REF-DEL2',
    } as any, 'admin-1');

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-2', status: OrderStatus.DELIVERED },
        data: { status: OrderStatus.RETURNED },
      }),
    );
    expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.imeiDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: ImeiStatus.RETURNED },
      }),
    );
    expect(warrantyService.voidWarrantiesForOrder).toHaveBeenCalled();
    expect(result.order.status).toBe(OrderStatus.RETURNED);
  });

  it('nên từ chối processRefund lần hai khi đơn đã RETURNED (chống double-restock)', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'del-3',
      status: OrderStatus.RETURNED,
      payments: [{ status: PaymentStatus.REFUNDED }],
    });

    await expect(
      ordersService.processRefund('del-3', {
        amount: 15000000,
        reason: 'Hoàn lại',
        providerReference: 'BANK-REF-DEL3',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('hoàn tiền cho đơn đã RETURNED do nhà vận chuyển nhưng không chạy lại tác vụ IMEI', async () => {
    const returnedOrder = {
      id: 'returned-1',
      status: OrderStatus.RETURNED,
      orderNumber: 'ORD-RETURNED',
      payments: [{ id: 'p-returned', status: PaymentStatus.PAID, amount: 2000000 }],
      items: [{ variantId: 'v-returned', quantity: 1, imeiDeviceId: 'imei-returned' }],
    };
    prisma.order.findUnique.mockResolvedValue(returnedOrder);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.paymentTransaction.create.mockResolvedValue({ id: 'tx-returned' });

    const result = await ordersService.processRefund('returned-1', {
      amount: 2000000, reason: 'Carrier return', providerReference: 'BANK-REF-RETURNED',
    });

    expect(result.order.status).toBe(OrderStatus.RETURNED);
    expect(prisma.imeiDevice.updateMany).not.toHaveBeenCalled();
    expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    expect(warrantyService.voidWarrantiesForOrder).not.toHaveBeenCalled();
  });
});
