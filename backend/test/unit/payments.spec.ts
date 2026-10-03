import { describe, it, expect, jest } from '@jest/globals';
import { VietqrService } from '../../src/modules/payments/vietqr.service';
import {
  PaymentsService,
  buildVnpaySignData,
  hashVnpayParams,
} from '../../src/modules/payments/payments.service';
import { PaymentsController } from '../../src/modules/payments/payments.controller';
import { OrderStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';

describe('Payments Unit Tests', () => {
  describe('VietQR Generator Service', () => {
    it('should generate valid Napas 247 QuickLink image URL with default bank details', () => {
      const mockConfigService: any = {
        get: (key: string, defaultValue?: string) => defaultValue,
      };

      const vietqrService = new VietqrService(mockConfigService);
      const res = vietqrService.generateQr(29990000, 'ORD-123456');

      expect(res.amount).toBe(29990000);
      expect(res.orderNumber).toBe('ORD-123456');
      expect(res.bankId).toBe('970422');
      expect(res.accountNo).toBe('0987654321');
      expect(res.accountName).toBe('CONG TY MOBILECOMMERCE');
      expect(res.qrUrl).toBe(
        'https://img.vietqr.io/image/970422-0987654321-compact2.png?amount=29990000&addInfo=ORD-123456&accountName=CONG%20TY%20MOBILECOMMERCE',
      );
    });

    it('should allow custom bank options in VietQR generation', () => {
      const mockConfigService: any = {
        get: (key: string, defaultValue?: string) => defaultValue,
      };

      const vietqrService = new VietqrService(mockConfigService);
      const res = vietqrService.generateQr(15000000, 'ORD-CUSTOM', {
        bankId: '970407', // Techcombank
        accountNo: '19033333333333',
        accountName: 'NGUYEN VAN A',
      });

      expect(res.qrUrl).toBe(
        'https://img.vietqr.io/image/970407-19033333333333-compact2.png?amount=15000000&addInfo=ORD-CUSTOM&accountName=NGUYEN%20VAN%20A',
      );
    });

    it('should throw BadRequestException in generateQrAsync when PAYMENT_VIETQR_ENABLED is false', async () => {
      const mockConfigService: any = { get: () => undefined };
      const mockSettingsService: any = {
        get: jest.fn().mockImplementation((...args: any[]) => {
          const [key, def] = args;
          if (key === 'PAYMENT_VIETQR_ENABLED') return Promise.resolve('false');
          return Promise.resolve(def);
        }),
      };

      const vietqrService = new VietqrService(mockConfigService, mockSettingsService);
      await expect(vietqrService.generateQrAsync(10000, 'ORD-TEST')).rejects.toThrow(
        new BadRequestException('Phương thức thanh toán VietQR đang tạm ngưng'),
      );
    });

    it('should use dynamic settings in generateQrAsync when enabled', async () => {
      const mockConfigService: any = { get: () => undefined };
      const mockSettingsService: any = {
        get: jest.fn().mockImplementation((...args: any[]) => {
          const [key, def] = args;
          if (key === 'PAYMENT_VIETQR_ENABLED') return Promise.resolve('true');
          if (key === 'VIETQR_BANK_ID') return Promise.resolve('970407');
          if (key === 'VIETQR_ACCOUNT_NO') return Promise.resolve('123456789');
          if (key === 'VIETQR_ACCOUNT_NAME') return Promise.resolve('TEST SHOP');
          if (key === 'VIETQR_TEMPLATE') return Promise.resolve('compact');
          return Promise.resolve(def);
        }),
      };

      const vietqrService = new VietqrService(mockConfigService, mockSettingsService);
      const res = await vietqrService.generateQrAsync(50000, 'ORD-DYNAMIC');
      expect(res.bankId).toBe('970407');
      expect(res.accountNo).toBe('123456789');
      expect(res.accountName).toBe('TEST SHOP');
      expect(res.qrUrl).toContain('970407-123456789-compact.png');
    });
  });

  describe('VNPay Signature & Checksum Verification', () => {
    const hashSecret = 'TEST_SECRET_KEY';

    function signVnpayParams(params: Record<string, string>): string {
      const sortedKeys = Object.keys(params).sort();
      const signData = sortedKeys
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join('&');
      return createHmac('sha512', hashSecret)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');
    }

    it('should correctly calculate and verify HMAC-SHA512 hash matching VNPay specification', () => {
      const vnpParams: Record<string, string> = {
        vnp_Amount: '2999000000',
        vnp_Command: 'pay',
        vnp_CreateDate: '20261002153000',
        vnp_CurrCode: 'VND',
        vnp_IpAddr: '127.0.0.1',
        vnp_Locale: 'vn',
        vnp_OrderInfo: 'Thanh toan don hang ORD-123',
        vnp_OrderType: 'other',
        vnp_ReturnUrl: 'http://localhost:5173/return',
        vnp_TmnCode: 'SANDBOX1',
        vnp_TxnRef: 'ORD-123',
        vnp_Version: '2.1.0',
      };

      const hash = signVnpayParams(vnpParams);
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(128); // 512 bits / 4 = 128 hex characters

      // Re-sign to ensure determinism
      const hash2 = signVnpayParams(vnpParams);
      expect(hash2).toBe(hash);

      // Mutate one param and ensure hash mismatch
      const mutatedParams = { ...vnpParams, vnp_Amount: '1000' };
      const mutatedHash = signVnpayParams(mutatedParams);
      expect(mutatedHash).not.toBe(hash);
    });

    it('should encode spaces as + instead of %20 per VNPay specification', () => {
      const params = {
        vnp_OrderInfo: 'Thanh toan don hang ORD-123456',
        vnp_Amount: '1000000',
      };
      const signData = buildVnpaySignData(params);
      expect(signData).toContain('vnp_OrderInfo=Thanh+toan+don+hang+ORD-123456');
      expect(signData).not.toContain('%20');

      const hash = hashVnpayParams(params, hashSecret);
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(128);
    });
  });

  describe('VietQR Order Status Check', () => {
    it('should throw BadRequestException when order is CANCELLED', async () => {
      const mockPrisma: any = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-1',
              orderNumber: 'ORD-1',
              totalAmount: 1000000,
              status: OrderStatus.CANCELLED,
              userId: 'user-1',
              payments: [],
            }),
          ),
        },
      };
      const mockConfig: any = { get: () => undefined };
      const mockEmail: any = {};
      const vietqrService = new VietqrService(mockConfig);
      const paymentsService = new PaymentsService(
        mockPrisma,
        vietqrService,
        mockEmail,
        mockConfig,
      );

      await expect(paymentsService.generateVietQr('ord-1')).rejects.toThrow(
        new BadRequestException('Cannot generate payment QR for cancelled order'),
      );
    });
  });

  describe('VNPay Payment URL Guards', () => {
    function buildService(order: any) {
      const mockPrisma: any = {
        order: {
          findUnique: jest.fn().mockImplementation(() => Promise.resolve(order)),
        },
      };
      const mockConfig: any = { get: (_k: string, d?: string) => d };
      const vietqrService = new VietqrService(mockConfig);
      return new PaymentsService(mockPrisma, vietqrService, {} as any, mockConfig);
    }

    it('should throw when creating a VNPay URL for a non-PENDING order', async () => {
      const svc = buildService({
        id: 'ord-1',
        orderNumber: 'ORD-1',
        totalAmount: 1000000,
        status: OrderStatus.SHIPPING,
        userId: 'user-1',
        holdExpiresAt: new Date(Date.now() + 60000),
        payments: [],
      });

      await expect(svc.createVnpayPaymentUrl({ orderId: 'ord-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when confirming a payment whose order is not PENDING', async () => {
      const mockPrisma: any = {
        payment: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'pay-1',
              status: 'PENDING',
              amount: 1000000,
              order: {
                id: 'ord-1',
                userId: 'user-1',
                totalAmount: 1000000,
                status: OrderStatus.PROCESSING,
                holdExpiresAt: new Date(Date.now() + 60000),
              },
            }),
          ),
        },
      };
      const mockConfig: any = { get: (_k: string, d?: string) => d };
      const vietqrService = new VietqrService(mockConfig);
      const svc = new PaymentsService(mockPrisma, vietqrService, {} as any, mockConfig);

      await expect(
        svc.confirmPayment('pay-1', { providerRef: 'REF-123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('VNPay IPN Handling', () => {
    it('should reject payment for CANCELLED order with RspCode 02 and not resurrect it', async () => {
      const hashSecret = 'SANDBOX_SECRET_KEY_1234567890ABCDEF';
      const mockConfig: any = {
        get: (key: string, defaultValue?: string) => {
          if (key === 'VNPAY_HASH_SECRET') return hashSecret;
          return defaultValue;
        },
      };
      const mockTransaction = jest.fn();
      const mockPrisma: any = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-cancelled-id',
              orderNumber: 'ORD-CANCELLED',
              totalAmount: 100000,
              status: OrderStatus.CANCELLED,
              items: [],
              payments: [],
            }),
          ),
        },
        $transaction: mockTransaction,
      };
      const mockEmail: any = { sendOrderConfirmation: jest.fn() };
      const vietqrService = new VietqrService(mockConfig);
      const paymentsService = new PaymentsService(
        mockPrisma,
        vietqrService,
        mockEmail,
        mockConfig,
      );

      const ipnParams: Record<string, string> = {
        vnp_Amount: '10000000',
        vnp_Command: 'pay',
        vnp_OrderInfo: 'Thanh toan don hang ORD-CANCELLED',
        vnp_ResponseCode: '00',
        vnp_TmnCode: 'SANDBOX1',
        vnp_TxnRef: 'ORD-CANCELLED',
      };
      const secureHash = hashVnpayParams(ipnParams, hashSecret);
      const query = { ...ipnParams, vnp_SecureHash: secureHash };

      const result = await paymentsService.handleVnpayIpn(query);

      expect(result).toEqual({ RspCode: '02', Message: 'Order already cancelled' });
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('PaymentsController handleVnpayIpn Direct Response', () => {
    it('should bypass NestJS response interceptor by sending direct json via res.status(200).json', async () => {
      const mockPaymentsService: any = {
        handleVnpayIpn: jest.fn().mockImplementation(() =>
          Promise.resolve({
            RspCode: '00',
            Message: 'Confirm Success',
          }),
        ),
      };
      const controller = new PaymentsController(mockPaymentsService);

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockImplementation((data) => data),
      };

      const query = { vnp_TxnRef: 'ORD-123' };
      const result = await controller.handleVnpayIpn(query, mockRes);

      expect(mockPaymentsService.handleVnpayIpn).toHaveBeenCalledWith(query);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        RspCode: '00',
        Message: 'Confirm Success',
      });
      expect(result).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    });
  });

  describe('VNPay Dynamic Settings', () => {
    it('should throw BadRequestException when PAYMENT_VNPAY_ENABLED is false in createVnpayPaymentUrl', async () => {
      const mockPrisma: any = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-vnp-1',
              orderNumber: 'ORD-VNP-1',
              totalAmount: 100000,
              status: OrderStatus.PENDING,
              createdAt: new Date(),
              payments: [],
            }),
          ),
        },
      };
      const mockConfig: any = { get: () => undefined };
      const mockEmail: any = {};
      const mockVietqr: any = {};
      const mockSettingsService: any = {
        get: jest.fn().mockImplementation((...args: any[]) => {
          const [key, def] = args;
          if (key === 'PAYMENT_VNPAY_ENABLED') return Promise.resolve('false');
          return Promise.resolve(def);
        }),
      };

      const paymentsService = new PaymentsService(
        mockPrisma,
        mockVietqr,
        mockEmail,
        mockConfig,
        mockSettingsService,
      );

      await expect(
        paymentsService.createVnpayPaymentUrl({ orderId: 'ord-vnp-1' }),
      ).rejects.toThrow(
        new BadRequestException('Cổng thanh toán VNPay đang tạm thời đóng để bảo trì'),
      );
    });

    it('should use dynamic values for TMN code and URL from SystemSettingsService', async () => {
      const mockPrisma: any = {
        order: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: 'ord-vnp-2',
              orderNumber: 'ORD-VNP-2',
              totalAmount: 200000,
              status: OrderStatus.PENDING,
              createdAt: new Date(),
              payments: [],
            }),
          ),
        },
      };
      const mockConfig: any = { get: () => undefined };
      const mockEmail: any = {};
      const mockVietqr: any = {};
      const mockSettingsService: any = {
        get: jest.fn().mockImplementation((...args: any[]) => {
          const [key, def] = args;
          if (key === 'PAYMENT_VNPAY_ENABLED') return Promise.resolve('true');
          if (key === 'VNPAY_TMN_CODE') return Promise.resolve('CUSTOM_TMN');
          if (key === 'VNPAY_HASH_SECRET') return Promise.resolve('CUSTOM_SECRET');
          if (key === 'VNPAY_URL') return Promise.resolve('https://custom.vnpay.vn/pay');
          if (key === 'VNPAY_RETURN_URL') return Promise.resolve('https://myshop.vn/return');
          return Promise.resolve(def);
        }),
      };

      const paymentsService = new PaymentsService(
        mockPrisma,
        mockVietqr,
        mockEmail,
        mockConfig,
        mockSettingsService,
      );

      const res = await paymentsService.createVnpayPaymentUrl({ orderId: 'ord-vnp-2' });
      expect(res.paymentUrl).toContain('https://custom.vnpay.vn/pay?');
      expect(res.paymentUrl).toContain('vnp_TmnCode=CUSTOM_TMN');
      expect(res.orderNumber).toBe('ORD-VNP-2');
    });
  });
});
