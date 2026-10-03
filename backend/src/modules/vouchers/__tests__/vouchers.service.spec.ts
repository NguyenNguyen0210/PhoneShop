import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { VouchersService } from '../vouchers.service';

const mockFn = () => (jest.fn() as any);

describe('VouchersService - getSummaryAnalytics', () => {
  let service: VouchersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      voucher: {
        count: mockFn(),
        findUnique: mockFn(),
        findMany: mockFn(),
        create: mockFn(),
        update: mockFn(),
        delete: mockFn(),
      },
      voucherUsage: {
        count: mockFn(),
        aggregate: mockFn(),
      },
    };

    service = new VouchersService(prisma as any);
  });

  it('should return aggregated voucher metrics', async () => {
    prisma.voucher.count
      .mockResolvedValueOnce(18) // totalVouchers
      .mockResolvedValueOnce(12) // activeVouchers
      .mockResolvedValueOnce(6); // expiredOrExhausted

    prisma.voucherUsage.count.mockResolvedValue(1420);
    prisma.voucherUsage.aggregate.mockResolvedValue({
      _sum: { discountAmount: 48500000 },
    });

    const result = await service.getSummaryAnalytics();
    expect(result.totalVouchers).toBe(18);
    expect(result.activeVouchers).toBe(12);
    expect(result.expiredOrExhausted).toBe(6);
    expect(result.totalUsages).toBe(1420);
    expect(result.totalDiscountAmount).toBe(48500000);
  });

  it('should default totalDiscountAmount to 0 when discountAmount is null', async () => {
    prisma.voucher.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    prisma.voucherUsage.count.mockResolvedValue(0);
    prisma.voucherUsage.aggregate.mockResolvedValue({
      _sum: { discountAmount: null },
    });

    const result = await service.getSummaryAnalytics();
    expect(result.totalVouchers).toBe(0);
    expect(result.activeVouchers).toBe(0);
    expect(result.expiredOrExhausted).toBe(0);
    expect(result.totalUsages).toBe(0);
    expect(result.totalDiscountAmount).toBe(0);
  });
});
