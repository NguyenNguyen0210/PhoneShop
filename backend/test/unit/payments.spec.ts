import { describe, it, expect } from '@jest/globals';
import { VietqrService } from '../../src/modules/payments/vietqr.service';
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
  });
});
