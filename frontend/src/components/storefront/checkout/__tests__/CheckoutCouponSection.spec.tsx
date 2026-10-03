import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CheckoutCouponSection } from '../CheckoutCouponSection';

vi.mock('../../../../services/voucherService', () => ({
  voucherService: {
    getActiveVouchers: vi.fn(),
    validateVoucher: vi.fn(),
  },
}));

describe('CheckoutCouponSection', () => {
  const defaultProps = {
    subtotal: 1000000,
    appliedVoucher: null,
    onApplyVoucher: vi.fn(),
    onRemoveVoucher: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unapplied State', () => {
    it('renders input field, apply button, and modal trigger link when no voucher is applied', () => {
      const html = renderToString(<CheckoutCouponSection {...defaultProps} />);

      expect(html).toContain('Mã ưu đãi &amp; Giảm giá');
      expect(html).toContain('placeholder="Nhập mã ưu đãi..."');
      expect(html).toContain('Áp dụng');
      expect(html).toContain('Chọn hoặc nhập mã ưu đãi');
      expect(html).not.toContain('Gỡ bỏ');
    });
  });

  describe('Applied State', () => {
    it('renders green card with voucher code, discount badge, and "Gỡ bỏ" button when applied', () => {
      const appliedVoucher = {
        id: 'v-1',
        code: 'SALE50',
        name: 'Giảm 50k',
        description: 'Giảm 50.000₫ cho đơn từ 500k',
        type: 'FIXED_AMOUNT' as const,
        value: 50000,
        discount: 50000,
      };

      const html = renderToString(
        <CheckoutCouponSection
          {...defaultProps}
          appliedVoucher={appliedVoucher}
        />
      );

      expect(html).toContain('SALE50');
      expect(html).toContain('Gỡ bỏ');
      expect(html).toContain('bg-emerald-50');
      expect(html).toContain('border-emerald-200');
      expect(html).toContain('Giảm 50.000₫ cho đơn từ 500k');
      // When applied, the raw input form is replaced by the pill card
      expect(html).not.toContain('placeholder="Nhập mã ưu đãi..."');
    });

    it('formats percentage vouchers correctly', () => {
      const appliedVoucher = {
        id: 'v-2',
        code: 'GIAM10',
        name: 'Giảm 10%',
        type: 'PERCENTAGE' as const,
        value: 10,
        discount: 100000,
      };

      const html = renderToString(
        <CheckoutCouponSection
          {...defaultProps}
          appliedVoucher={appliedVoucher}
        />
      );

      expect(html).toContain('GIAM10');
      expect(html).toContain('Gỡ bỏ');
    });

    it('formats freeship vouchers correctly', () => {
      const appliedVoucher = {
        id: 'v-3',
        code: 'FREESHIP',
        name: 'Miễn phí giao hàng',
        type: 'FREE_SHIPPING' as const,
        value: 30000,
      };

      const html = renderToString(
        <CheckoutCouponSection
          {...defaultProps}
          appliedVoucher={appliedVoucher}
        />
      );

      expect(html).toContain('FREESHIP');
      expect(html).toContain('Miễn phí VC');
      expect(html).toContain('Gỡ bỏ');
    });
  });
});
