// Shared shop policy constants — single source of truth so checkout,
// vouchers, and shipping estimates can never disagree.
import { ShippingMethod } from '@prisma/client';

export const STANDARD_SHIPPING_FEE = 30000; // 30,000 VND flat rate

// Single shipping-fee table shared by checkout and voucher validation.
// Subtotal > 500k gets free ECONOMY/STANDARD; EXPRESS_2H stays surcharged.
export function calculateShippingFee(method: ShippingMethod, subtotal: number): number {
  if (subtotal > 500000) {
    switch (method) {
      case ShippingMethod.ECONOMY:
        return 0;
      case ShippingMethod.EXPRESS_2H:
        return 30000;
      case ShippingMethod.STANDARD:
      default:
        return 0;
    }
  }
  switch (method) {
    case ShippingMethod.ECONOMY:
      return 15000;
    case ShippingMethod.EXPRESS_2H:
      return 60000;
    case ShippingMethod.STANDARD:
    default:
      return STANDARD_SHIPPING_FEE;
  }
}

// A freeship voucher discounts the SHIPPING fee actually charged,
// capped by the voucher value — never the merchandise subtotal.
export function computeFreeshipDiscount(voucherValue: number, shippingFee: number): number {
  return Math.min(voucherValue, shippingFee);
}
