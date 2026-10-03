// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefundsLedgerTab } from '../RefundsLedgerTab';
import { returnService } from '../../../../../services/returnService';
import type { RefundItem } from '../../../../../types';

// Mock matchMedia and ResizeObserver for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

declare module 'vitest' {
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toBeInTheDocument(): R;
  }
}

expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null && received !== undefined && (document.body.contains(received) || false);
    return {
      pass,
      message: () => `expected element ${pass ? 'not ' : ''}to be in document`,
    };
  },
});

vi.mock('../../../../../services/returnService', () => ({
  returnService: {
    processRefund: vi.fn(),
    completeRefund: vi.fn(),
  },
}));

describe('RefundsLedgerTab', () => {
  const mockRefunds: RefundItem[] = [
    {
      id: 'ref-1',
      returnId: 'ret-101',
      refundNumber: 'RF-2026-001',
      amount: 12000000,
      status: 'PENDING',
      reason: 'Hàng lỗi camera',
      createdAt: '2026-10-04T09:00:00Z',
    },
    {
      id: 'ref-2',
      returnId: 'ret-102',
      refundNumber: 'RF-2026-002',
      amount: 8000000,
      status: 'PROCESSING',
      reason: 'Đổi máy khác',
      createdAt: '2026-10-04T09:10:00Z',
    },
  ];

  const handleRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders refund items with amounts and reasons', () => {
    render(
      <RefundsLedgerTab
        refunds={mockRefunds}
        loading={false}
        canManage={true}
        onRefresh={handleRefresh}
      />
    );

    expect(screen.getByText('RF-2026-001')).toBeInTheDocument();
    expect(screen.getByText('RF-2026-002')).toBeInTheDocument();
    expect(screen.getByText(/12\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText('Hàng lỗi camera')).toBeInTheDocument();
  });

  it('disables action buttons when canManage is false (STAFF role)', () => {
    render(
      <RefundsLedgerTab
        refunds={mockRefunds}
        loading={false}
        canManage={false}
        onRefresh={handleRefresh}
      />
    );

    const lockLabels = screen.getAllByText(/🔒/);
    expect(lockLabels.length).toBeGreaterThan(0);
  });

  it('calls processRefund when canManage is true and button clicked', async () => {
    vi.mocked(returnService.processRefund).mockResolvedValueOnce({
      ...mockRefunds[0],
      status: 'PROCESSING',
    });

    render(
      <RefundsLedgerTab
        refunds={mockRefunds}
        loading={false}
        canManage={true}
        onRefresh={handleRefresh}
      />
    );

    const processBtn = screen.getByRole('button', { name: /Bắt đầu giải ngân/i });
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(returnService.processRefund).toHaveBeenCalledWith('ref-1');
      expect(handleRefresh).toHaveBeenCalled();
    });
  });

  it('calls completeRefund when confirmation in popconfirm is confirmed', async () => {
    vi.mocked(returnService.completeRefund).mockResolvedValueOnce({
      ...mockRefunds[1],
      status: 'COMPLETED',
    });

    render(
      <RefundsLedgerTab
        refunds={mockRefunds}
        loading={false}
        canManage={true}
        onRefresh={handleRefresh}
      />
    );

    const completeBtn = screen.getByRole('button', { name: /Xác nhận đã chuyển/i });
    fireEvent.click(completeBtn);

    // Popconfirm opens and shows ok button "Đã chuyển"
    const confirmOkBtn = await screen.findByRole('button', { name: /^Đã chuyển$/i });
    fireEvent.click(confirmOkBtn);

    await waitFor(() => {
      expect(returnService.completeRefund).toHaveBeenCalledWith('ref-2');
      expect(handleRefresh).toHaveBeenCalled();
    });
  });

  it('renders completed refund with Hoàn tất text', () => {
    const completedRefunds: RefundItem[] = [
      {
        id: 'ref-3',
        returnId: 'ret-103',
        refundNumber: 'RF-2026-003',
        amount: 5000000,
        status: 'COMPLETED',
        reason: 'Hàng trả lại kho',
        createdAt: '2026-10-04T08:00:00Z',
        processedAt: '2026-10-04T09:00:00Z',
      },
    ];

    render(
      <RefundsLedgerTab
        refunds={completedRefunds}
        loading={false}
        canManage={true}
        onRefresh={handleRefresh}
      />
    );

    expect(screen.getByText('Hoàn tất')).toBeInTheDocument();
    expect(screen.getByText('Đã hoàn tiền')).toBeInTheDocument();
  });

  it('handles error in processRefund gracefully', async () => {
    vi.mocked(returnService.processRefund).mockRejectedValueOnce(new Error('Network error'));

    render(
      <RefundsLedgerTab
        refunds={mockRefunds}
        loading={false}
        canManage={true}
        onRefresh={handleRefresh}
      />
    );

    const processBtn = screen.getByRole('button', { name: /Bắt đầu giải ngân/i });
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(returnService.processRefund).toHaveBeenCalledWith('ref-1');
      expect(handleRefresh).not.toHaveBeenCalled();
    });
  });
});
