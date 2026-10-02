import { apiClient } from './apiClient';

export interface CreatePaymentDto {
  orderId: string;
  amount: number;
  method: 'COD' | 'VIETQR' | 'VNPAY';
}

export interface VietQrData {
  qrImageUrl: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  transferContent: string;
}

export const paymentService = {
  async createPayment(dto: CreatePaymentDto) {
    const response = await apiClient.post('/payments', dto);
    return response.data?.data ?? response.data;
  },

  async getVietQrCode(orderId: string, amount: number, orderNumber: string): Promise<VietQrData> {
    const bankId = '970422'; // MB Bank
    const bankName = 'MBBank (Quân Đội)';
    const accountNo = '0987654321';
    const accountName = 'CONG TY MOBILECOMMERCE';
    const transferContent = orderNumber || `ORD-${orderId.slice(0, 8).toUpperCase()}`;

    // Standard VietQR QuickLink image URL as defined in spec
    const qrImageUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      transferContent
    )}&accountName=${encodeURIComponent(accountName)}`;

    try {
      // Also notify backend if endpoint is ready
      const res = await apiClient.post(`/payments/vietqr/${orderId}`, {
        amount,
        orderNumber,
      });
      const data = res.data?.data ?? res.data;
      if (data?.qrImageUrl) {
        return data;
      }
    } catch {
      // Graceful fallback to client-generated VietQR Napas URL
    }

    return {
      qrImageUrl,
      bankName,
      accountNumber: accountNo,
      accountName,
      amount,
      transferContent,
    };
  },

  async createVnpayUrl(data: {
    orderId: string;
    amount: number;
    orderInfo?: string;
  }): Promise<{ paymentUrl: string }> {
    try {
      const response = await apiClient.post('/payments/vnpay/create-url', data);
      return response.data?.data ?? response.data;
    } catch {
      // Mock / fallback sandbox URL for verification if backend payments module is offline
      const mockUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=${
        data.amount * 100
      }&vnp_Command=pay&vnp_CreateDate=${Date.now()}&vnp_CurrCode=VND&vnp_TxnRef=${
        data.orderId
      }&vnp_OrderInfo=${encodeURIComponent(data.orderInfo || 'Thanh toan don hang')}`;
      return { paymentUrl: mockUrl };
    }
  },
};
