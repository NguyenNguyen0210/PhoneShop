import { Test, TestingModule } from '@nestjs/testing';
import { VouchersService } from '../src/modules/vouchers/vouchers.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VoucherType } from '@prisma/client';

describe('VouchersService - Business Invariants & Limits', () => {
  let vouchersService: VouchersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      voucher: {
        findUnique: jest.fn(),
      },
      voucherUsage: {
        count: jest.fn(),
      },
      cart: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VouchersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    vouchersService = module.get<VouchersService>(VouchersService);
  });

  const baseVoucher = {
    id: 'voucher-1',
    code: 'SALE50',
    type: VoucherType.PERCENTAGE,
    value: 10, // 10%
    isActive: true,
    startAt: new Date(Date.now() - 1000 * 60 * 60), // started 1h ago
    endAt: new Date(Date.now() + 1000 * 60 * 60),   // ends in 1h
    usageLimit: 100,
    usageCount: 10,
    perUserLimit: 1,
    minOrderValue: 500000,
  };

  it('INVARIANT: Should reject if voucher code does not exist', async () => {
    prisma.voucher.findUnique.mockResolvedValue(null);

    await expect(
      vouchersService.validate('user-1', { code: 'INVALID', orderTotal: 1000000 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('INVARIANT: Should reject if voucher usageLimit is exhausted', async () => {
    prisma.voucher.findUnique.mockResolvedValue({
      ...baseVoucher,
      usageLimit: 10,
      usageCount: 10, // exhausted
    });
    prisma.cart.findUnique.mockResolvedValue(null);

    await expect(
      vouchersService.validate('user-1', { code: 'SALE50', orderTotal: 1000000 }),
    ).rejects.toThrow('Mã voucher đã hết lượt sử dụng');
  });

  it('INVARIANT: Should reject if perUserLimit is exceeded for this customer', async () => {
    prisma.voucher.findUnique.mockResolvedValue(baseVoucher);
    prisma.cart.findUnique.mockResolvedValue(null);
    prisma.voucherUsage.count.mockResolvedValue(1); // already used 1 time

    await expect(
      vouchersService.validate('user-1', { code: 'SALE50', orderTotal: 1000000 }),
    ).rejects.toThrow('Bạn đã dùng hết số lượt cho phép của voucher này');
  });

  it('INVARIANT: Should reject if orderTotal does not meet minOrderValue', async () => {
    prisma.voucher.findUnique.mockResolvedValue(baseVoucher);
    prisma.cart.findUnique.mockResolvedValue(null);
    prisma.voucherUsage.count.mockResolvedValue(0);

    await expect(
      vouchersService.validate('user-1', { code: 'SALE50', orderTotal: 200000 }),
    ).rejects.toThrow('Đơn hàng tối thiểu để áp dụng mã');
  });

  it('INVARIANT: Computes rounded discount amount correctly', async () => {
    prisma.voucher.findUnique.mockResolvedValue({
      ...baseVoucher,
      type: VoucherType.PERCENTAGE,
      value: 15, // 15%
      maxDiscountAmount: 200000,
    });
    prisma.cart.findUnique.mockResolvedValue(null);
    prisma.voucherUsage.count.mockResolvedValue(0);

    const result = await vouchersService.validate('user-1', { code: 'SALE50', orderTotal: 1000000 });

    // 15% of 1,000,000 = 150,000
    expect(result.discount).toBe(150000);
  });
});
