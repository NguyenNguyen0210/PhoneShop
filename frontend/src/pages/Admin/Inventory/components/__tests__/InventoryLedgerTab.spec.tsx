// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { InventoryLedgerTab } from '../InventoryLedgerTab';
import { inventoryService } from '../../../../../services/inventoryService';

// Mock window.matchMedia for Ant Design components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock ResizeObserver for Ant Design Table
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

// Mock window.URL methods for CSV export
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob');
}
if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = vi.fn();
}

vi.mock('../../../../../services/inventoryService', () => ({
  inventoryService: {
    getLedger: vi.fn(),
    exportLedgerCsv: vi.fn(),
  },
}));

describe('InventoryLedgerTab', () => {
  const mockLedgerData = {
    items: [
      {
        id: 'sm-1',
        variantId: 'var-1',
        type: 'IMPORT_MANUAL' as const,
        quantity: 10,
        balanceBefore: 5,
        balanceAfter: 15,
        unitPrice: 20000000,
        totalAmount: 200000000,
        referenceId: 'PO-2026-001',
        referenceType: 'MANUAL',
        createdAt: '2026-10-04T10:00:00.000Z',
        performer: { id: 'u-1', fullName: 'Nguyễn Quản Trị' },
        note: 'Nhập hàng lô mới',
        variant: {
          id: 'var-1',
          sku: 'IP15-128-BLK',
          color: 'Đen',
          storage: '128GB',
          price: 22000000,
          costPrice: 20000000,
          product: {
            id: 'prod-1',
            name: 'iPhone 15 128GB',
            thumbnail: 'https://example.com/ip15.jpg',
          },
        },
      },
      {
        id: 'sm-2',
        variantId: 'var-2',
        type: 'EXPORT_ORDER' as const,
        quantity: -2,
        balanceBefore: 10,
        balanceAfter: 8,
        unitPrice: 25000000,
        totalAmount: 50000000,
        referenceId: 'ORD-999',
        referenceType: 'ORDER',
        createdAt: '2026-10-04T11:00:00.000Z',
        performer: { id: 'u-2', fullName: 'Trần Nhân Viên' },
        note: 'Xuất giao hàng #ORD-999',
        variant: {
          id: 'var-2',
          sku: 'SS24-256-GRY',
          color: 'Xám',
          storage: '256GB',
          price: 25000000,
          costPrice: 22000000,
          product: {
            id: 'prod-2',
            name: 'Samsung Galaxy S24',
          },
        },
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    },
    summary: {
      totalInQuantity: 10,
      totalOutQuantity: 2,
      totalInAmount: 200000000,
      totalOutAmount: 50000000,
      netAmount: -150000000,
      totalTransactions: 2,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders KPI summary cards and ledger table with correct metrics', async () => {
    vi.mocked(inventoryService.getLedger).mockResolvedValue(mockLedgerData as any);

    render(<InventoryLedgerTab />);

    await waitFor(() => {
      // KPI cards
      expect(screen.getByText('Tổng tiền hàng Nhập')).toBeDefined();
      expect(screen.getByText('+10 máy')).toBeDefined();
      expect(screen.getByText('Tổng tiền hàng Xuất')).toBeDefined();
      expect(screen.getByText('-2 máy')).toBeDefined();
      expect(screen.getByText('Dòng tiền Ròng')).toBeDefined();
      expect(screen.getByText('Tổng số lượt biến động')).toBeDefined();
      expect(screen.getByText('2 giao dịch')).toBeDefined();

      // Table items
      expect(screen.getByText('iPhone 15 128GB')).toBeDefined();
      expect(screen.getByText('IP15-128-BLK')).toBeDefined();
      expect(screen.getByText('Nhập thủ công')).toBeDefined();
      expect(screen.getByText('PO-2026-001')).toBeDefined();
      expect(screen.getByText('+10')).toBeDefined();

      expect(screen.getByText('Samsung Galaxy S24')).toBeDefined();
      expect(screen.getByText('SS24-256-GRY')).toBeDefined();
      expect(screen.getByText('Xuất đơn hàng')).toBeDefined();
      expect(screen.getByText('ORD-999')).toBeDefined();
      expect(screen.getByText('-2')).toBeDefined();
    });
  });

  it('filters data when search input is submitted', async () => {
    vi.mocked(inventoryService.getLedger).mockResolvedValue(mockLedgerData as any);

    render(<InventoryLedgerTab />);

    await waitFor(() => {
      expect(inventoryService.getLedger).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByPlaceholderText('Tìm theo SKU hoặc tên...');
    fireEvent.change(searchInput, { target: { value: 'iPhone' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(inventoryService.getLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'iPhone',
        })
      );
    });
  });

  it('filters data when movement type is changed', async () => {
    vi.mocked(inventoryService.getLedger).mockResolvedValue(mockLedgerData as any);

    render(<InventoryLedgerTab />);

    await waitFor(() => {
      expect(inventoryService.getLedger).toHaveBeenCalledTimes(1);
    });

    const selectCombobox = screen.getByLabelText('movement-type-select');
    fireEvent.mouseDown(selectCombobox);

    await waitFor(() => {
      const option = screen.getByTitle('Nhập thủ công');
      expect(option).toBeDefined();
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(inventoryService.getLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'IMPORT_MANUAL',
        })
      );
    });
  });

  it('triggers CSV export when "Xuất file CSV" button is clicked', async () => {
    vi.mocked(inventoryService.getLedger).mockResolvedValue(mockLedgerData as any);
    const mockBlob = new Blob(['Mã GD,Thời gian,Số lượng\nsm-1,2026-10-04,10'], {
      type: 'text/csv',
    });
    vi.mocked(inventoryService.exportLedgerCsv).mockResolvedValue(mockBlob);

    render(<InventoryLedgerTab />);

    await waitFor(() => {
      expect(screen.getByText('Xuất file CSV')).toBeDefined();
    });

    const exportBtn = screen.getByText('Xuất file CSV').closest('button');
    expect(exportBtn).toBeTruthy();
    fireEvent.click(exportBtn!);

    await waitFor(() => {
      expect(inventoryService.exportLedgerCsv).toHaveBeenCalledTimes(1);
    });
  });

  it('displays alert on error and retries upon clicking retry button', async () => {
    vi.mocked(inventoryService.getLedger).mockRejectedValueOnce(new Error('Network Error'));

    render(<InventoryLedgerTab />);

    await waitFor(() => {
      expect(screen.getByText('Lỗi tải dữ liệu sổ kho')).toBeDefined();
      expect(screen.getByText('Network Error')).toBeDefined();
    });

    // Mock success for retry
    vi.mocked(inventoryService.getLedger).mockResolvedValueOnce(mockLedgerData as any);

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 128GB')).toBeDefined();
    });
  });
});
