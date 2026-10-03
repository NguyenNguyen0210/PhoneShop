// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductStockLedgerDrawer } from '../ProductStockLedgerDrawer';
import { inventoryService } from '../../../../../services/inventoryService';
import type { InventoryRecord } from '../../../../../types';

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

// Mock ResizeObserver for Ant Design Drawer and Table
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../../services/inventoryService', () => ({
  inventoryService: {
    getVariantLedger: vi.fn(),
  },
}));

describe('ProductStockLedgerDrawer', () => {
  const mockItem: InventoryRecord = {
    id: 'inv-1',
    variantId: 'var-101',
    quantity: 25,
    availableQty: 20,
    reservedQty: 5,
    reorderLevel: 5,
    variant: {
      id: 'var-101',
      sku: 'IP15PM-256-NAT',
      color: 'Titan Tự Nhiên',
      storage: '256GB',
      price: 32000000,
      product: {
        id: 'prod-10',
        name: 'iPhone 15 Pro Max',
      },
    },
  };

  const mockVariantLedger = {
    items: [
      {
        id: 'sm-101',
        variantId: 'var-101',
        type: 'IMPORT_MANUAL' as const,
        quantity: 25,
        balanceBefore: 0,
        balanceAfter: 25,
        unitPrice: 28000000,
        totalAmount: 700000000,
        referenceId: 'PO-BATCH-1',
        createdAt: '2026-10-04T08:00:00.000Z',
        performer: { id: 'u-admin', fullName: 'Kho Tổng' },
        note: 'Nhập lô hàng chính hãng Apple',
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
    summary: {
      totalInQuantity: 25,
      totalOutQuantity: 0,
      totalInAmount: 700000000,
      totalOutAmount: 0,
      netAmount: -700000000,
      totalTransactions: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header information and variant movements table', async () => {
    vi.mocked(inventoryService.getVariantLedger).mockResolvedValue(mockVariantLedger as any);

    render(
      <ProductStockLedgerDrawer
        open={true}
        item={mockItem}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      // Header check
      expect(screen.getByText(/Thẻ kho sản phẩm: iPhone 15 Pro Max/i)).toBeDefined();
      expect(screen.getByText('IP15PM-256-NAT')).toBeDefined();
      expect(screen.getByText('Tồn vật lý')).toBeDefined();
      expect(screen.getByText('Tồn khả dụng')).toBeDefined();
      expect(screen.getByText('Đơn giá vốn')).toBeDefined();

      // Table movement check
      expect(inventoryService.getVariantLedger).toHaveBeenCalledWith(
        'var-101',
        expect.objectContaining({ page: 1, limit: 10 })
      );
      expect(screen.getByText('Nhập thủ công')).toBeDefined();
      expect(screen.getByText('PO-BATCH-1')).toBeDefined();
      expect(screen.getByText('+25')).toBeDefined();
      expect(screen.getByText('Kho Tổng')).toBeDefined();
    });
  });
});
