import type { Payment } from '../../../../types';

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

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

  // No real data — never fabricate a customer. Show an explicit unknown
  // placeholder so staff cannot mistake it for real PII.
  return {
    name: realName || 'Không xác định',
    phone: realPhone || '—',
    email: realEmail || '',
  };
};

export const getGatewayRef = (record: Payment): string => {
  // Ưu tiên lấy mã tham chiếu giao dịch thực tế từ cổng thanh toán/ngân hàng
  const txnRef =
    record.transactions?.[0]?.providerReference ||
    record.transactions?.[0]?.transactionCode;
  if (txnRef) return txnRef;

  if (record.providerOrderId) return record.providerOrderId;

  return '—';
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
  role: 'PREPAY' | 'STANDARD';
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

  return {
    isSplit: true,
    role: 'PREPAY',
    roleLabel: 'Tiền trả trước',
    percentLabel: `${percent}%`,
    siblingCount: siblings.length,
  };
};
