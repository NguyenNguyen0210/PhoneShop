export const e2eName = (prefix: string) =>
  `E2E-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export function luhnValidImei(base14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(base14[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${base14}${check}`;
}

export const INVALID_IMEI = '123456789012345';
export const DUPLICATE_SLUG = 'e2e-duplicate-slug';

export const voucherPayload = (name: string) => ({
  code: name,
  type: 'PERCENT',
  value: 10,
  minOrderValue: 100000,
  maxDiscount: 50000,
  usageLimit: 100,
  perUserLimit: 1,
});
