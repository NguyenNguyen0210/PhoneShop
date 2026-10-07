import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { VouchersService } from '../vouchers.service';

const mockFn = () => jest.fn() as any;

describe('VouchersService', () => {
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

  describe('getSummaryAnalytics', () => {
    it('should return aggregated voucher metrics', async () => {
      prisma.voucher.count.mockResolvedValue(18);
      prisma.voucher.findMany
        .mockResolvedValueOnce(Array(12).fill({ usageLimit: null, usageCount: 0 }))
        .mockResolvedValueOnce(
          Array(6).fill({ isActive: false, endAt: new Date(0), usageLimit: null, usageCount: 0 }),
        );

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
      prisma.voucher.count.mockResolvedValue(0);
      prisma.voucher.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

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

  describe('changeStatus', () => {
    it('should disallow activating an expired voucher', async () => {
      prisma.voucher.findUnique.mockResolvedValue({
        id: 'v-expired',
        code: 'EXPIRED1',
        endAt: new Date(Date.now() - 10000),
        isActive: false,
      });

      await expect(service.changeStatus('v-expired', true)).rejects.toThrow(BadRequestException);
      expect(prisma.voucher.update).not.toHaveBeenCalled();
    });

    it('should allow deactivating an active voucher', async () => {
      prisma.voucher.findUnique.mockResolvedValue({
        id: 'v-active',
        code: 'ACTIVE1',
        endAt: new Date(Date.now() + 100000),
        isActive: true,
      });
      prisma.voucher.update.mockResolvedValue({ id: 'v-active', isActive: false });

      const res = await service.changeStatus('v-active', false);
      expect(prisma.voucher.update).toHaveBeenCalledWith({
        where: { id: 'v-active' },
        data: { isActive: false },
      });
      expect(res.isActive).toBe(false);
    });
  });
});
