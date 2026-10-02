/**
 * IMEI utility functions implementing Luhn algorithm
 */

export function generateLuhnImei(prefix14: string): string {
  if (prefix14.length !== 14 || !/^\d{14}$/.test(prefix14)) {
    throw new Error(`Prefix must be exactly 14 digits, got: ${prefix14}`);
  }
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(prefix14[i], 10);
    if (i % 2 !== 0) digit *= 2;
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return prefix14 + checkDigit.toString();
}

export function validateImei(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(imei[i], 10);
    if (i % 2 !== 0) digit *= 2;
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}
