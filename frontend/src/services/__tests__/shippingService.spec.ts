import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shippingService } from '../shippingService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('shippingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assignShipping calls POST /shipping/assign with payload', async () => {
    const mockRes = { data: { id: 'ship-1', providerName: 'GHN' } };
    vi.mocked(apiClient.post).mockResolvedValue(mockRes as any);

    const payload = {
      orderId: 'order-1',
      providerName: 'GHN',
      trackingNumber: 'GHN999',
    };
    const res = await shippingService.assignShipping(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/shipping/assign', payload);
    expect(res).toEqual(mockRes.data);
  });

  it('updateShippingStatus calls PATCH /shipping/:id/status', async () => {
    const mockRes = { data: { id: 'ship-1', status: 'IN_TRANSIT' } };
    vi.mocked(apiClient.patch).mockResolvedValue(mockRes as any);

    const res = await shippingService.updateShippingStatus('ship-1', {
      status: 'IN_TRANSIT',
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/shipping/ship-1/status', {
      status: 'IN_TRANSIT',
    });
    expect(res).toEqual(mockRes.data);
  });

  it('getCarrierTrackingUrl returns valid URL for known carriers', () => {
    expect(shippingService.getCarrierTrackingUrl('GHN Express', 'GHN123')).toBe(
      'https://donhang.ghn.vn/?order_code=GHN123',
    );
    expect(shippingService.getCarrierTrackingUrl('Viettel Post', 'VT456')).toBe(
      'https://viettelpost.vn/tra-cuu-hanh-trinh-don?code=VT456',
    );
    expect(shippingService.getCarrierTrackingUrl('GHTK', 'GHTK789')).toBe(
      'https://i.ghtk.vn/GHTK789',
    );
    expect(shippingService.getCarrierTrackingUrl('Unknown', '123')).toBeNull();
  });
});
