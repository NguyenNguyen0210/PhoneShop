export type Role = 'ADMIN' | 'STAFF' | 'MANAGER' | 'USER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  avatar?: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  isActive?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  color: string;
  colorHex?: string;
  storage: string;
  ram?: string;
  price: number;
  compareAtPrice?: number;
  inventoryQty?: number;
  status?: string;
  images?: string[];
  product?: {
    id: string;
    name: string;
    slug?: string;
    thumbnail?: string;
    brand?: Brand;
    category?: Category;
  };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  brandId: string;
  categoryId: string;
  brand?: Brand;
  category?: Category;
  variants: ProductVariant[];
  thumbnail?: string;
  images?: string[];
  specs?: Record<string, string>;
  rating?: number;
  reviewCount?: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  featured?: boolean;
  createdAt?: string;
}

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  price: number;
  product: Product;
  variant: ProductVariant;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'VIETQR' | 'VNPAY';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imeiDeviceId?: string;
  imeiDevice?: {
    id: string;
    imeiNumber: string;
    status?: string;
  };
  variant?: ProductVariant;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  shippingPhone: string;
  shippingAddress: string;
  notes?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  holdExpiresAt?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export type ImeiStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'WARRANTY' | 'DEFECTIVE';

export interface ImeiDevice {
  id: string;
  imeiNumber: string;
  variantId: string;
  status: ImeiStatus;
  variant?: ProductVariant & { product?: Product };
  createdAt: string;
  soldAt?: string;
}

export interface Warranty {
  id: string;
  warrantyCode: string;
  imeiDeviceId: string;
  imeiDevice?: {
    id: string;
    imeiNumber: string;
    variant?: ProductVariant & { product?: Product };
  };
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOID';
  terms?: string;
  remainingDays?: number;
  deviceInfo?: {
    productName: string;
    color?: string;
    storage?: string;
    imeiNumber: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: T;
}
