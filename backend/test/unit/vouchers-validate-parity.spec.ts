import { describe, it, expect, jest } from '@jest/globals';
import { VouchersService } from '../../src/modules/vouchers/vouchers.service';
import { VoucherType } from '@prisma/client';

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
              ? { id: 'fsi-1', flashPrice: 15000000 }
              : null,
          ),
        ),
      },
      voucher: {
        findUnique: jest.fn().mockReturnValue(
          Promise.resolve({
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
          }),
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
});
