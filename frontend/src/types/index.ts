export type Role = 'ADMIN' | 'STAFF' | 'MANAGER' | 'USER';

export const ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  MANAGER: 'MANAGER',
  USER: 'USER',
} as const;

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  avatar?: string;
  avatarUrl?: string;
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
  logoUrl?: string;
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
  inventory?: {
    quantity?: number;
    availableQty?: number;
    reservedQty?: number;
  };
  status?: string;
  images?: string[];
  imageUrl?: string;
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
  thumbnailUrl?: string;
  images?: string[];
  specs?: Record<string, string>;
  rating?: number | null;
  reviewCount?: number;
  reviews?: Review[];
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  featured?: boolean;
  createdAt?: string;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    email?: string;
  };
  product?: {
    id: string;
    name?: string;
    thumbnail?: string;
    thumbnailUrl?: string;
  };
  replies?: ReviewReply[];
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    roles?: Array<{ role?: { name?: string } }>;
  };
}

export const isShopReply = (reply: ReviewReply): boolean => {
  const roles = reply.user?.roles ?? [];
  return roles.some((r) => ['ADMIN', 'STAFF', 'MANAGER'].includes(r.role?.name ?? ''));
};

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
  | 'PACKED'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'VIETQR' | 'VNPAY' | 'INSTALLMENT';
export type ShippingMethod = 'ECONOMY' | 'STANDARD' | 'EXPRESS_2H';

export type InstallmentProvider = 'HOME_CREDIT' | 'FE_CREDIT';
export type InstallmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface InstallmentApplication {
  id: string;
  orderId: string;
  userId: string;
  provider: InstallmentProvider;
  status: InstallmentStatus;
  termMonths: number;
  prepayPercent: number;
  prepayAmount: number;
  loanAmount: number;
  monthlyAmount: number;
  fullName: string;
  citizenId: string;
  birthDate: string;
  phoneNumber: string;
  currentAddress: string;
  incomeRange: string;
  cccdFrontUrl: string;
  cccdBackUrl: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  staffNotes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: any;
  user?: any;
  reviewer?: any;
}

export interface InstallmentFormData {
  provider: InstallmentProvider;
  termMonths: number;
  prepayPercent: number;
  fullName: string;
  citizenId: string;
  birthDate: string;
  phoneNumber: string;
  currentAddress: string;
  incomeRange: string;
  cccdFrontUrl: string;
  cccdBackUrl: string;
}

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
    imei?: string;
    imeiNumber?: string;
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
  installmentApplication?: InstallmentApplication;
  shipping?: Shipping;
  returns?: ReturnRequest[];
  packedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ShippingStatus =
  | 'PENDING'
  | 'READY_TO_SHIP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED';

export interface Shipping {
  id: string;
  orderId: string;
  providerName: string;
  trackingNumber?: string;
  status: ShippingStatus;
  shippingFee: number;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SHIPPING'
  | 'RECEIVED'
  | 'INSPECTING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ReturnItem {
  id: string;
  returnId: string;
  orderItemId: string;
  quantity: number;
  reason?: string;
  condition?: string;
  orderItem?: OrderItem;
}

export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ReturnUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface RefundItem {
  id: string;
  returnId: string;
  refundNumber: string;
  amount: number;
  status: RefundStatus;
  reason?: string;
  providerRef?: string;
  processedAt?: string;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  returnNumber: string;
  status: ReturnStatus;
  reason: string;
  customerNote?: string;
  adminNote?: string;
  requestedAt: string;
  approvedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  items: ReturnItem[];
  order?: Order;
  user?: ReturnUser;
  refunds?: RefundItem[];
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

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  createdAt: string;
  product: Product;
}

export interface WishlistResponse {
  id: string;
  userId: string;
  items: WishlistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  ward?: string;
  district?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressPayload {
  recipientName: string;
  phone: string;
  addressLine1: string;
  ward?: string;
  district?: string;
  city: string;
  type?: 'HOME' | 'WORK' | 'OTHER';
  isDefault?: boolean;
}

export type NotificationType =
  | 'ORDER'
  | 'PAYMENT'
  | 'SHIPPING'
  | 'PROMOTION'
  | 'SYSTEM'
  | 'WARRANTY'
  | 'RETURN';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPaginationResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationFilterParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}

export interface InventoryRecord {
  id: string;
  variantId: string;
  quantity: number;
  availableQty: number;
  reservedQty: number;
  reorderLevel: number;
  updatedAt?: string;
  variant: {
    id: string;
    sku: string;
    color: string;
    storage: string;
    price: number;
    compareAtPrice?: number;
    product: {
      id: string;
      name: string;
      thumbnail?: string;
    };
  };
}

export interface AdjustStockPayload {
  quantity: number;
  note?: string;
}

export interface SetReorderLevelPayload {
  reorderLevel: number;
}

