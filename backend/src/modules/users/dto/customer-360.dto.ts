export interface Customer360Metrics {
  totalSpent: number;
  totalOrders: number;
}

export interface Customer360AddressItem {
  id: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface Customer360OrderItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: Date;
  itemCount: number;
}

export interface Customer360Response {
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    status: string;
    createdAt: Date;
  };
  metrics: Customer360Metrics;
  addresses: Customer360AddressItem[];
  recentOrders: Customer360OrderItem[];
}
