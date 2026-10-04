import { describe, it, expect } from '@jest/globals';
import { generateLuhnImei, validateImei } from '../../src/common/utils/imei.util';
import { ImeiStatus } from '@prisma/client';

describe('IMEI Concurrency & Luhn Validation Unit Tests', () => {
  describe('Luhn Algorithm Validation', () => {
    it('should generate valid 15-digit Luhn IMEIs from 14-digit prefixes', () => {
      const prefixes = [
        '35890101000001',
        '35780202000002',
        '86910303000003',
        '01234567890123',
        '99000086247185',
      ];

      for (const prefix of prefixes) {
        const imei = generateLuhnImei(prefix);
        expect(imei).toHaveLength(15);
        expect(imei.startsWith(prefix)).toBe(true);
        expect(validateImei(imei)).toBe(true);
      }
    });

    it('should return false for invalid check digit', () => {
      const validImei = generateLuhnImei('35890101000001');
      const lastDigit = parseInt(validImei[14], 10);
      const wrongDigit = (lastDigit + 1) % 10;
      const invalidImei = validImei.slice(0, 14) + wrongDigit.toString();

      expect(validateImei(invalidImei)).toBe(false);
    });

    it('should return false for invalid formats (length, non-digits)', () => {
      expect(validateImei('')).toBe(false);
      expect(validateImei('123456')).toBe(false);
      expect(validateImei('1234567890123456')).toBe(false); // 16 digits
      expect(validateImei('35890101000001A')).toBe(false); // contains letter
    });

    it('should throw when generating with non-14 digit prefix', () => {
      expect(() => generateLuhnImei('123')).toThrow();
      expect(() => generateLuhnImei('123456789012345')).toThrow();
      expect(() => generateLuhnImei('1234567890123A')).toThrow();
    });
  });

  describe('IMEI State Transition Rules', () => {
    // Valid state transitions in Phone Shop lifecycle:
    // AVAILABLE -> RESERVED (when order placed / 15m hold starts)
    // RESERVED -> AVAILABLE (when hold expires or order cancelled)
    // RESERVED -> SOLD (when payment succeeds)
    // SOLD -> WARRANTY (when under repair) or RETURNED

    const allowedTransitions: Record<ImeiStatus, ImeiStatus[]> = {
      [ImeiStatus.AVAILABLE]: [ImeiStatus.RESERVED, ImeiStatus.BLOCKED],
      [ImeiStatus.RESERVED]: [ImeiStatus.AVAILABLE, ImeiStatus.SOLD, ImeiStatus.BLOCKED],
      [ImeiStatus.SOLD]: [ImeiStatus.RETURNED, ImeiStatus.WARRANTY, ImeiStatus.BLOCKED],
      [ImeiStatus.RETURNED]: [ImeiStatus.AVAILABLE, ImeiStatus.WARRANTY, ImeiStatus.BLOCKED],
      [ImeiStatus.WARRANTY]: [ImeiStatus.AVAILABLE, ImeiStatus.SOLD, ImeiStatus.BLOCKED],
      [ImeiStatus.BLOCKED]: [ImeiStatus.AVAILABLE],
    };

    function canTransition(current: ImeiStatus, target: ImeiStatus): boolean {
      return (allowedTransitions[current] || []).includes(target);
    }

    it('should allow AVAILABLE -> RESERVED during checkout', () => {
      expect(canTransition(ImeiStatus.AVAILABLE, ImeiStatus.RESERVED)).toBe(true);
    });

    it('should allow RESERVED -> AVAILABLE when 15m hold expires', () => {
      expect(canTransition(ImeiStatus.RESERVED, ImeiStatus.AVAILABLE)).toBe(true);
    });

    it('should allow RESERVED -> SOLD when payment confirmed via IPN', () => {
      expect(canTransition(ImeiStatus.RESERVED, ImeiStatus.SOLD)).toBe(true);
    });

    it('should disallow RESERVED -> RESERVED (no double reservation)', () => {
      expect(canTransition(ImeiStatus.RESERVED, ImeiStatus.RESERVED)).toBe(false);
    });

    it('should disallow SOLD -> RESERVED (sold device cannot be reserved)', () => {
      expect(canTransition(ImeiStatus.SOLD, ImeiStatus.RESERVED)).toBe(false);
    });

    it('should allow SOLD -> WARRANTY or RETURNED', () => {
      expect(canTransition(ImeiStatus.SOLD, ImeiStatus.WARRANTY)).toBe(true);
      expect(canTransition(ImeiStatus.SOLD, ImeiStatus.RETURNED)).toBe(true);
    });
  });
});
