import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../apiClient';
import { promotionService } from '../promotionService';
import { flashSaleService } from '../flashSaleService';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Promotion Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotionService.getSummary should call /vouchers/analytics/summary', async () => {
    const mockData = { totalVouchers: 10, activeVouchers: 8 };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockData });

    const result = await promotionService.getSummary();
    expect(apiClient.get).toHaveBeenCalledWith('/vouchers/analytics/summary');
    expect(result).toEqual(mockData);
  });

  it('flashSaleService.getActive should call /flash-sales/active', async () => {
    const mockData = { id: 'camp-1', name: 'Sale' };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockData });

    const result = await flashSaleService.getActiveCampaign();
    expect(apiClient.get).toHaveBeenCalledWith('/flash-sales/active');
    expect(result).toEqual(mockData);
  });
});
