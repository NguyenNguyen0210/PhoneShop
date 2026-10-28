export type LoyaltyTier = 'STANDARD' | 'SILVER' | 'GOLD' | 'VIP';

export interface CustomerSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  createdAt: string;
  lastLoginAt: string | null;
  roles?: Array<{ role: { name: string } }>;
  totalSpent?: number;
  orderCount?: number;
  lastOrderDate?: string | null;
  loyaltyTier?: LoyaltyTier;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  banned: number;
}

export interface Customer360Metrics {
  totalSpent: number;
  totalOrders: number;
}

export interface Customer360Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED' | string;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface Customer360Address {
  id: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface Customer360RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  itemCount: number;
}

export interface Customer360Data {
  customer: Customer360Customer;
  metrics: Customer360Metrics;
  addresses: Customer360Address[];
  recentOrders: Customer360RecentOrder[];
}
