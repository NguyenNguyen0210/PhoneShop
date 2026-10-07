export const VoucherType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  FREE_SHIPPING: 'FREE_SHIPPING',
} as const;

export type VoucherType = (typeof VoucherType)[keyof typeof VoucherType];

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  value: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoucherInput {
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  value: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startAt: string;
  endAt: string;
}

export interface VoucherUsageRecord {
  id: string;
  voucherId: string;
  userId: string;
  orderId?: string;
  discountAmount: number;
  usedAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface PromotionSummary {
  totalVouchers: number;
  activeVouchers: number;
  expiredOrExhausted: number;
  totalUsages: number;
  totalDiscountAmount: number;
}

export interface FlashSaleItem {
  id: string;
  campaignId: string;
  variantId: string;
  flashPrice: number;
  stockLimit: number;
  soldCount: number;
  variant?: {
    id: string;
    sku: string;
    name: string;
    price: number;
    compareAtPrice?: number;
    imageUrl?: string;
    color?: string;
    storage?: string;
    product?: {
      id: string;
      name: string;
      slug: string;
      thumbnailUrl?: string;
    };
    inventory?: {
      quantity: number;
      availableQty?: number;
    };
  };
}

export interface FlashSaleCampaign {
  id: string;
  name: string;
  description?: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  items: FlashSaleItem[];
  _count?: {
    items: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlashSaleInput {
  name: string;
  description?: string;
  startAt: string;
  endAt: string;
  items: {
    variantId: string;
    flashPrice: number;
    stockLimit: number;
  }[];
}
