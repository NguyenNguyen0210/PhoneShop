import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from '../productService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('productService filter queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes hardware filter params to apiClient', async () => {
    (apiClient.get as any).mockResolvedValue({ data: { data: [], total: 0 } });
    await productService.getProducts({
      has5G: true,
      ram: ['8GB'],
      minPrice: 10000000,
      sortBy: 'best-seller',
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/products',
      expect.objectContaining({
        params: expect.objectContaining({
          has5G: true,
          ram: ['8GB'],
          sortBy: 'best-seller',
        }),
      })
    );
  });
});
