import { describe, it, expect, jest } from '@jest/globals';
import { VouchersService } from '../../src/modules/vouchers/vouchers.service';
import { VoucherType } from '@prisma/client';

const buildVoucher = (over: Record<string, any> = {}) => ({
  id: 'v-1',
  code: 'SALE10',
  name: 'Sale 10%',
  description: null,
  type: VoucherType.PERCENTAGE,
  value: 10,
  minOrderValue: null,
  maxDiscountAmount: null,
  usageLimit: null,
  usageCount: 0,
  perUserLimit: null,
  isActive: true,
  startAt: new Date('2026-01-01'),
  endAt: new Date('2027-01-01'),
  ...over,
});

// Parity: validate() must quote from the SELECTED items at flash-aware
// prices — the same source checkout charges — not from stale client totals
// or full-cart catalog prices.
describe('VouchersService.validate parity with checkout', () => {
  it('quotes selected items only, at flash price when a flash item matches', async () => {
    const mockPrisma: any = {
      cart: {
        findUnique: jest.fn().mockReturnValue(
          Promise.resolve({
            id: 'cart-1',
            items: [
              {
                id: 'ci-1',
                variantId: 'var-1',
                quantity: 1,
                unitPrice: 20000000,
                variant: { price: 20000000 },
              },
              {
                id: 'ci-2',
                variantId: 'var-2',
                quantity: 1,
                unitPrice: 5000000,
                variant: { price: 5000000 },
              },
            ],
          }),
        ),
      },
      flashSaleItem: {
        findFirst: jest.fn().mockImplementation((args: any) =>
          Promise.resolve(
            args?.where?.variantId === 'var-1'
              ? { id: 'fsi-1', flashPrice: 15000000, stockLimit: 10, soldCount: 2 }
              : null,
          ),
        ),
      },
      voucher: {
        findUnique: jest.fn().mockImplementation(() =>
          Promise.resolve(buildVoucher()),
        ),
      },
      voucherUsage: {
        count: jest.fn().mockReturnValue(Promise.resolve(0)),
      },
    };

    const service = new VouchersService(mockPrisma);
    const res = await service.validate('user-1', {
      code: 'SALE10',
      orderTotal: 999, // stale client total must be ignored for authed users
      selectedItemIds: ['ci-1'],
    } as any);

    // Only ci-1 counts, at its flash price: 10% of 15,000,000.
    expect(res.valid).toBe(true);
    expect(res.discount).toBe(1500000);
  });

  it('C6a: prices quota-exhausted flash items at the normal variant price (parity with cart)', async () => {
    const mockPrisma: any = {
      cart: {
        findUnique: jest.fn().mockReturnValue(
          Promise.resolve({
            id: 'cart-1',
            items: [
              {
                id: 'ci-1',
                variantId: 'var-1',
                quantity: 1,
                unitPrice: 20000000,
                variant: { price: 20000000 },
              },
            ],
          }),
        ),
      },
      // Campaign window still open, but the quota is exhausted.
      flashSaleItem: {
        findFirst: jest.fn().mockReturnValue(
          Promise.resolve({
            id: 'fsi-1',
            flashPrice: 15000000,
            stockLimit: 5,
            soldCount: 5, // quotaLeft = 0
          }),
        ),
      },
      voucher: {
        findUnique: jest.fn().mockReturnValue(Promise.resolve(buildVoucher())),
      },
      voucherUsage: {
        count: jest.fn().mockReturnValue(Promise.resolve(0)),
      },
    };

    const service = new VouchersService(mockPrisma);
    const res = await service.validate('user-1', {
      code: 'SALE10',
      orderTotal: 999, // stale client total must be ignored for authed users
    } as any);

    // 10% of the NORMAL price 20,000,000 = 2,000,000 — NOT 10% of flash 15,000,000.
    expect(res.valid).toBe(true);
    expect(res.discount).toBe(2000000);
  });

  it('C6b: rounds percentage discount with Math.round before caps', async () => {
    const mockPrisma: any = {
      voucher: {
        findUnique: jest.fn().mockReturnValue(Promise.resolve(buildVoucher())),
      },
      voucherUsage: {
        count: jest.fn().mockReturnValue(Promise.resolve(0)),
      },
    };

    const service = new VouchersService(mockPrisma);
    const res = await service.validate(undefined, {
      code: 'SALE10',
      orderTotal: 9999999, // 10% = 999,999.9 → must round to 1,000,000
    } as any);

    expect(res.valid).toBe(true);
    expect(res.discount).toBe(1000000);
  });

  it('C6b: applies the maxDiscountAmount cap after rounding percentage discounts', async () => {
    const mockPrisma: any = {
      voucher: {
        findUnique: jest.fn().mockReturnValue(
          Promise.resolve(buildVoucher({ value: 33, maxDiscountAmount: 3000000 })),
        ),
      },
      voucherUsage: {
        count: jest.fn().mockReturnValue(Promise.resolve(0)),
      },
    };

    const service = new VouchersService(mockPrisma);
    const res = await service.validate(undefined, {
      code: 'SALE10',
      orderTotal: 10000001, // 33% = 3,300,000.33 → round 3,300,000 → cap 3,000,000
    } as any);

    expect(res.valid).toBe(true);
    expect(res.discount).toBe(3000000);
  });
});
