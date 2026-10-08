import { describe, it, expect } from 'vitest';
import { getCustomerInfo } from '../paymentAccountingHelpers';

describe('getCustomerInfo', () => {
  it('returns real user info when present', () => {
    const r = getCustomerInfo({
      id: 'p1',
      orderId: 'o1',
      order: {
        orderNumber: 'ORD-1',
        user: { email: 'a@b.c', firstName: 'An', lastName: 'Nguyen', phone: '0901' },
      },
    } as any);
    expect(r.name).toContain('Nguyen');
  });

  it('never fabricates a real-looking customer when data is missing', () => {
    const r = getCustomerInfo({
      id: 'p2',
      orderId: 'o2',
      order: { orderNumber: 'ORD-XYZ-999' },
    } as any);
    expect(r.name).toBe('Không xác định');
    expect(r.phone).toBe('—');
    expect(r.email).toBe('');
  });
});
