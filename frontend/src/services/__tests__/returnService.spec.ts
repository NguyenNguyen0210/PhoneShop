import { describe, it, expect, vi, beforeEach } from 'vitest';
import { returnService } from '../returnService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('returnService - Admin methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllReturnsAdmin calls GET /returns', async () => {
    const mockData = [{ id: 'ret-1', returnNumber: 'RET-001', status: 'REQUESTED' }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockData } });

    const result = await returnService.getAllReturnsAdmin();
    expect(apiClient.get).toHaveBeenCalledWith('/returns');
    expect(result).toEqual(mockData);
  });

  it('getReturnDetailAdmin calls GET /returns/:id', async () => {
    const mockDetail = { id: 'ret-1', returnNumber: 'RET-001', reason: 'Defective screen' };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockDetail } });

    const result = await returnService.getReturnDetailAdmin('ret-1');
    expect(apiClient.get).toHaveBeenCalledWith('/returns/ret-1');
    expect(result).toEqual(mockDetail);
  });

  it('approveReturn calls PUT /returns/:id/approve with adminNote', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'APPROVED' } } });

    await returnService.approveReturn('ret-1', 'Approved for inspection');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/approve', { adminNote: 'Approved for inspection' });
  });

  it('rejectReturn calls PUT /returns/:id/reject with required adminNote', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'REJECTED' } } });

    await returnService.rejectReturn('ret-1', 'Liquid damage');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/reject', { adminNote: 'Liquid damage' });
  });

  it('markShippingReturn calls PUT /returns/:id/mark-shipping', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'SHIPPING' } } });

    await returnService.markShippingReturn('ret-1');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/mark-shipping');
  });

  it('receiveReturn calls PUT /returns/:id/receive', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'RECEIVED' } } });

    await returnService.receiveReturn('ret-1', 'Box intact, serial matches');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/receive', { adminNote: 'Box intact, serial matches' });
  });

  it('inspectReturn calls PUT /returns/:id/inspect', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'INSPECTING' } } });

    await returnService.inspectReturn('ret-1');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/inspect');
  });

  it('completeReturn calls PUT /returns/:id/complete', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'COMPLETED' } } });

    await returnService.completeReturn('ret-1');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/complete');
  });

  it('createRefund calls POST /returns/refunds with payload', async () => {
    const payload = { returnId: 'ret-1', amount: 5000000, reason: 'Screen glitch refund' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: { id: 'ref-1', amount: 5000000 } } });

    const res = await returnService.createRefund(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/returns/refunds', payload);
    expect(res).toEqual({ id: 'ref-1', amount: 5000000 });
  });

  it('processRefund calls PUT /returns/refunds/:id/process', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'PROCESSING' } } });

    await returnService.processRefund('ref-1');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/refunds/ref-1/process');
  });

  it('completeRefund calls PUT /returns/refunds/:id/complete', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'COMPLETED' } } });

    await returnService.completeRefund('ref-1');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/refunds/ref-1/complete');
  });
});
