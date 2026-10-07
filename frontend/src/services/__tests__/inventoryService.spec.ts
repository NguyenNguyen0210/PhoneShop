import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoryService } from '../inventoryService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('inventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getInventoryList calls GET /inventory with default limit 100 to see all variants', async () => {
    const mockData = [{ id: 'inv-1', variantId: 'var-1', quantity: 10, availableQty: 8, reservedQty: 2, reorderLevel: 5 }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    const result = await inventoryService.getInventoryList();
    expect(apiClient.get).toHaveBeenCalledWith('/inventory', {
      params: { limit: 100 },
    });
    expect(result).toEqual(mockData);
  });

  it('getInventoryList forwards search params for variant picker', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    await inventoryService.getInventoryList({ search: 'iPhone', limit: 50 });
    expect(apiClient.get).toHaveBeenCalledWith('/inventory', {
      params: { limit: 50, search: 'iPhone' },
    });
  });

  it('getLowStockAlerts calls GET /inventory/low-stock with threshold when provided', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    await inventoryService.getLowStockAlerts(5);
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/low-stock', { params: { threshold: 5 } });
  });

  it('checkStock calls GET /inventory/:variantId/check', async () => {
    const mockCheck = { variantId: 'v1', availableQty: 4, reservedQty: 1, inStock: true };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockCheck });

    const result = await inventoryService.checkStock('v1');
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/v1/check');
    expect(result).toEqual(mockCheck);
  });

  it('adjustStock calls PUT /inventory/:variantId/adjust', async () => {
    const payload = { quantity: 10, note: 'Restock batch' };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { success: true } });

    await inventoryService.adjustStock('v1', payload);
    expect(apiClient.put).toHaveBeenCalledWith('/inventory/v1/adjust', payload);
  });

  it('setReorderLevel calls PUT /inventory/:variantId/reorder-level', async () => {
    const payload = { reorderLevel: 15 };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { success: true } });

    await inventoryService.setReorderLevel('v1', payload);
    expect(apiClient.put).toHaveBeenCalledWith('/inventory/v1/reorder-level', payload);
  });

  it('syncMissingInventories calls POST /inventory/sync-missing', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { created: 3 } });

    const result = await inventoryService.syncMissingInventories();
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/sync-missing');
    expect(result).toEqual({ created: 3 });
  });
});
