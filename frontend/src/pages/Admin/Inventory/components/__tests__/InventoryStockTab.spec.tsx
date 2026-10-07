// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { InventoryStockTab } from '../InventoryStockTab';
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

// Mock ResizeObserver for Ant Design Table / Drawer
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../../services/inventoryService', () => ({
  inventoryService: {
    adjustStock: vi.fn(),
    setReorderLevel: vi.fn(),
    getVariantLedger: vi.fn(),
    syncMissingInventories: vi.fn(),
    getInventoryList: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../../../services/productService', () => ({
  productService: {
    getAllProductsAdmin: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getProducts: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  },
}));

vi.mock('../../../../../services/supplierService', () => ({
  supplierService: {
    getSuppliers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { role: 'ADMIN' },
  }),
}));

describe('InventoryStockTab', () => {
  const mockItems: InventoryRecord[] = [
    {
      id: 'inv-1',
      variantId: 'var-1',
      quantity: 50,
      availableQty: 45,
      reservedQty: 5,
      reorderLevel: 10,
      variant: {
        id: 'var-1',
        sku: 'IP15-128-BLK',
        color: 'Đen',
        storage: '128GB',
        price: 22000000,
        product: {
          id: 'prod-1',
          name: 'iPhone 15 128GB',
        },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders inventory table and opens ProductStockLedgerDrawer when "Xem thẻ kho" is clicked', async () => {
    vi.mocked(inventoryService.getVariantLedger).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      summary: {
        totalInQuantity: 0,
        totalOutQuantity: 0,
        totalInAmount: 0,
        totalOutAmount: 0,
        netAmount: 0,
        totalTransactions: 0,
      },
    });

    render(
      <InventoryStockTab
        items={mockItems}
        loading={false}
        onRefresh={vi.fn()}
        filterLowStockOnly={false}
        onToggleLowStockFilter={vi.fn()}
      />
    );

    expect(screen.getByText('iPhone 15 128GB')).toBeDefined();
    expect(screen.getByText('IP15-128-BLK')).toBeDefined();
    expect(screen.getByText('Điều chỉnh')).toBeDefined();

    // Find "Xem thẻ kho" button (button with history icon)
    const historyButton = screen.getByRole('button', { name: /history/i });
    expect(historyButton).toBeDefined();

    fireEvent.click(historyButton);

    await waitFor(() => {
      // Drawer is opened
      expect(screen.getByText(/Thẻ kho sản phẩm: iPhone 15 128GB/i)).toBeDefined();
      expect(inventoryService.getVariantLedger).toHaveBeenCalledWith(
        'var-1',
        expect.objectContaining({ page: 1, limit: 10 })
      );
    });
  });

  it('shows Nhap kho picker so admin can stock exact color/config variant', async () => {
    const { container } = render(
      <InventoryStockTab
        items={mockItems}
        loading={false}
        onRefresh={vi.fn()}
        filterLowStockOnly={false}
        onToggleLowStockFilter={vi.fn()}
      />
    );

    // Nút nhập kho đúng loại phải luôn hiển thị
    expect(screen.getByText(/Nhập kho \(chọn màu \+ cấu hình\)/i)).toBeDefined();
    expect(screen.getByText(/Đồng bộ kho thiếu/i)).toBeDefined();

    fireEvent.click(screen.getByText(/Nhập kho \(chọn màu \+ cấu hình\)/i));

    await waitFor(() => {
      expect(screen.getByText(/Nhập kho theo biến thể/i)).toBeDefined();
      expect(screen.getByText(/Điện thoại \(Sản phẩm X\)/i)).toBeDefined();
      expect(screen.getByText(/Màu \+ Cấu hình \(Biến thể Y-Z\)/i)).toBeDefined();
    });
    expect(container).toBeDefined();
  });
});
