// Shared shop policy constants — single source of truth so checkout,
// vouchers, and shipping estimates can never disagree.
import { ShippingMethod } from '@prisma/client';

export const STANDARD_SHIPPING_FEE = 30000; // 30,000 VND flat rate
export const EXPRESS_SHIPPING_FEE = 45000;  // 45,000 VND express delivery
export const EXPRESS_2H_SHIPPING_FEE = 60000; // 60,000 VND instant 2h delivery
export const ECONOMY_SHIPPING_FEE = 20000;  // 20,000 VND economy rate
export const FREE_SHIPPING_THRESHOLD = 500000; // 500,000 VND threshold for free/discounted shipping

// Single shipping-fee table shared by checkout, vouchers, and shipping services.
// Subtotal > 500k gets free ECONOMY/STANDARD; EXPRESS/EXPRESS_2H receives a 30,000 VND discount.
export function calculateShippingFee(method: ShippingMethod, subtotal: number): number {
  const isFreeThreshold = subtotal > FREE_SHIPPING_THRESHOLD;
  if (isFreeThreshold) {
    switch (method) {
      case ShippingMethod.ECONOMY:
      case ShippingMethod.STANDARD:
        return 0;
      case ShippingMethod.EXPRESS:
        return 15000; // Discounted by 30,000 VND
      case ShippingMethod.EXPRESS_2H:
        return 30000; // Discounted by 30,000 VND
      default:
        return 0;
    }
  }

  switch (method) {
    case ShippingMethod.ECONOMY:
      return ECONOMY_SHIPPING_FEE;
    case ShippingMethod.EXPRESS:
      return EXPRESS_SHIPPING_FEE;
    case ShippingMethod.EXPRESS_2H:
      return EXPRESS_2H_SHIPPING_FEE;
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
