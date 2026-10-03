import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  ShippingMethodSelector,
  calculateShippingFee,
  SHIPPING_METHODS,
} from '../ShippingMethodSelector';

describe('ShippingMethodSelector', () => {
  describe('Metadata and Fee Calculations', () => {
    it('defines the 3 required shipping methods with correct initial values', () => {
      expect(SHIPPING_METHODS).toHaveLength(3);

      const economy = SHIPPING_METHODS.find((m) => m.id === 'ECONOMY');
      expect(economy).toBeDefined();
      expect(economy?.name).toBe('Giao tiết kiệm');
      expect(economy?.time).toBe('3 - 5 ngày');
      expect(economy?.baseFee).toBe(15000);

      const standard = SHIPPING_METHODS.find((m) => m.id === 'STANDARD');
      expect(standard).toBeDefined();
      expect(standard?.name).toBe('Giao tiêu chuẩn');
      expect(standard?.time).toBe('1 - 2 ngày');
      expect(standard?.baseFee).toBe(30000);
      expect(standard?.badge).toBe('Khuyên dùng');

      const express = SHIPPING_METHODS.find((m) => m.id === 'EXPRESS_2H');
      expect(express).toBeDefined();
      expect(express?.name).toBe('Giao hỏa tốc 2h');
      expect(express?.time).toBe('Nhận hàng trong 2 giờ');
      expect(express?.baseFee).toBe(60000);
      expect(express?.badge).toBe('Nhanh nhất');
    });

    it('calculates full base fees when subtotal <= 500,000₫', () => {
      const subtotal = 450000;

      const eco = calculateShippingFee('ECONOMY', subtotal);
      expect(eco.fee).toBe(15000);
      expect(eco.isDiscounted).toBe(false);

      const std = calculateShippingFee('STANDARD', subtotal);
      expect(std.fee).toBe(30000);
      expect(std.isDiscounted).toBe(false);

      const exp = calculateShippingFee('EXPRESS_2H', subtotal);
      expect(exp.fee).toBe(60000);
      expect(exp.isDiscounted).toBe(false);
    });

    it('applies free shipping or discount when subtotal > 500,000₫', () => {
      const subtotal = 500001;

      const eco = calculateShippingFee('ECONOMY', subtotal);
      expect(eco.fee).toBe(0);
      expect(eco.isDiscounted).toBe(true);
      expect(eco.discountTag).toBe('Miễn phí');

      const std = calculateShippingFee('STANDARD', subtotal);
      expect(std.fee).toBe(0);
      expect(std.isDiscounted).toBe(true);
      expect(std.discountTag).toBe('Miễn phí');

      const exp = calculateShippingFee('EXPRESS_2H', subtotal);
      expect(exp.fee).toBe(30000);
      expect(exp.isDiscounted).toBe(true);
      expect(exp.discountTag).toBe('Giảm 30.000₫');
    });
  });

  describe('Component Rendering', () => {
    it('renders all 3 shipping options with radio inputs and badges', () => {
      const onChange = vi.fn();
      const html = renderToString(
        <ShippingMethodSelector
          subtotal={300000}
          selectedMethod="STANDARD"
          onChange={onChange}
        />
      );

      expect(html).toContain('Giao tiết kiệm');
      expect(html).toContain('Giao tiêu chuẩn');
      expect(html).toContain('Giao hỏa tốc 2h');
      expect(html).toContain('Khuyên dùng');
      expect(html).toContain('Nhanh nhất');
      expect(html).toContain('3 - 5 ngày');
      expect(html).toContain('1 - 2 ngày');
      expect(html).toContain('Nhận hàng trong 2 giờ');
    });

    it('highlights the selected method with active classes', () => {
      const onChange = vi.fn();
      const html = renderToString(
        <ShippingMethodSelector
          subtotal={300000}
          selectedMethod="STANDARD"
          onChange={onChange}
        />
      );

      // Selected state should include blue border and ring
      expect(html).toContain('border-blue-600');
      expect(html).toContain('bg-blue-50/40');
      expect(html).toContain('ring-1 ring-blue-600');
    });

    it('displays "Miễn phí" badge when subtotal > 500,000₫ for eligible methods', () => {
      const onChange = vi.fn();
      const html = renderToString(
        <ShippingMethodSelector
          subtotal={600000}
          selectedMethod="STANDARD"
          onChange={onChange}
        />
      );

      expect(html).toContain('Miễn phí');
      expect(html).toContain('Giảm 30.000₫');
      expect(html).toContain('line-through');
    });
  });
});
