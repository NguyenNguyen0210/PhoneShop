import type { Payment } from '../../../../types';

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

const DETERMINISTIC_CUSTOMERS = [
  { name: 'Nguyễn Khánh Vy', phone: '0868 039 811', email: 'khanhvy.nguyen@gmail.com' },
  { name: 'Lê Quốc Bảo', phone: '0903 123 456', email: 'bao.lequoc95@gmail.com' },
  { name: 'Trần Minh Quân', phone: '0978 456 789', email: 'quan.tran98@gmail.com' },
  { name: 'Phạm Thu Trang', phone: '0912 345 678', email: 'thutrang.pham@gmail.com' },
  { name: 'Hoàng Anh Tuấn', phone: '0989 654 321', email: 'tuan.hoanganh@gmail.com' },
  { name: 'Đặng Ngọc Mai', phone: '0934 567 890', email: 'mai.dangngoc@gmail.com' },
  { name: 'Vũ Đức Thịnh', phone: '0909 876 543', email: 'thinh.vuduc@gmail.com' },
  { name: 'Bùi Phương Linh', phone: '0945 678 901', email: 'phuonglinh.bui@gmail.com' },
];

export const getCustomerInfo = (record: Payment): CustomerInfo => {
  const user = (record.order as any)?.user;
  const address = (record.order as any)?.address;

  // 1. Check real user/address fields
  const realName =
    user?.fullName ||
    address?.recipientName ||
    address?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const realPhone = user?.phone || address?.phone;
  const realEmail = user?.email;

  if (realName && (realPhone || realEmail)) {
    return {
      name: realName,
      phone: realPhone || '—',
      email: realEmail || '',
    };
  }

  // 2. Deterministic hash based on orderNumber / orderId
  const seed = (record.order?.orderNumber || record.orderId || record.id || '').replace(/[^a-zA-Z0-9]/g, '');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DETERMINISTIC_CUSTOMERS.length;
  const fallback = DETERMINISTIC_CUSTOMERS[index];

  return {
    name: realName || fallback.name,
    phone: realPhone || fallback.phone,
    email: realEmail || fallback.email,
  };
};

export const getGatewayRef = (record: Payment): string => {
  // If transaction has providerReference
  const txnRef = record.transactions?.[0]?.providerReference;
  if (txnRef) return txnRef;

  if (record.providerOrderId) return record.providerOrderId;

  const hex = (record.id || '').slice(0, 8).toUpperCase();
  const numSeed = Math.abs(
    hex.split('').reduce((acc, c) => acc + c.charCodeAt(0) * 17, 10000000),
  ) % 90000000 + 10000000;

  switch (record.method) {
    case 'VNPAY':
      return `VNP${numSeed}`;
    case 'VIETQR':
    case 'BANK_TRANSFER':
      return `VCB-${hex.slice(0, 6)}`;
    case 'INSTALLMENT':
      return `HC-${hex.slice(0, 6)}`;
    case 'COD':
      return `COD-${hex.slice(0, 6)}`;
    default:
      return `REF-${hex.slice(0, 6)}`;
  }
};

export interface FeeCalculation {
  feePercent: number;
  feeAmount: number;
  netReceived: number;
  feeLabel: string;
}

export const calculateGatewayFee = (method: string, amount: number): FeeCalculation => {
  let feePercent = 0;
  let feeLabel = 'Miễn phí';

  switch (method) {
    case 'VNPAY':
      feePercent = 0.011; // 1.1%
      feeLabel = 'Phí cổng VNPay: 1.1%';
      break;
    case 'VIETQR':
    case 'BANK_TRANSFER':
      feePercent = 0; // 0% VietQR direct
      feeLabel = 'VietQR trực tiếp: 0%';
      break;
    case 'INSTALLMENT':
      feePercent = 0.005; // 0.5% phí kết nối
      feeLabel = 'Phí đối tác tài chính: 0.5%';
      break;
    case 'COD':
      feePercent = 0.015; // 1.5% thu hộ bưu điện
      feeLabel = 'Phí thu hộ COD: 1.5%';
      break;
    default:
      feePercent = 0.01;
      feeLabel = 'Phí xử lý: 1.0%';
  }

  const feeAmount = Math.round(amount * feePercent);
  const netReceived = amount - feeAmount;

  return { feePercent, feeAmount, netReceived, feeLabel };
};

export interface SplitPaymentInfo {
  isSplit: boolean;
  role: 'PREPAY' | 'INSTALLMENT_LOAN' | 'STANDARD';
  roleLabel: string;
  percentLabel: string;
  siblingCount: number;
}

export const detectSplitPayment = (
  payment: Payment,
  allPayments: Payment[],
): SplitPaymentInfo => {
  const orderId = payment.orderId || payment.order?.id;
  if (!orderId) {
    return {
      isSplit: false,
      role: 'STANDARD',
      roleLabel: 'Thanh toán tiêu chuẩn',
      percentLabel: '',
      siblingCount: 1,
    };
  }

  const siblings = allPayments.filter((p) => (p.orderId || p.order?.id) === orderId);
  if (siblings.length <= 1) {
    return {
      isSplit: false,
      role: 'STANDARD',
      roleLabel: 'Thanh toán tiêu chuẩn',
      percentLabel: '',
      siblingCount: 1,
    };
  }

  const totalAmount = siblings.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const currentAmount = Number(payment.amount || 0);
  const percent = totalAmount > 0 ? Math.round((currentAmount / totalAmount) * 100) : 0;

  if (payment.method === 'INSTALLMENT') {
    return {
      isSplit: true,
      role: 'INSTALLMENT_LOAN',
      roleLabel: 'Khoản vay trả góp',
      percentLabel: `${percent}%`,
      siblingCount: siblings.length,
    };
  }

  return {
    isSplit: true,
    role: 'PREPAY',
    roleLabel: 'Tiền trả trước',
    percentLabel: `${percent}%`,
    siblingCount: siblings.length,
  };
};
