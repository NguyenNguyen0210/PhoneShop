// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminInventoryPage } from '../AdminInventoryPage';
import { inventoryService } from '../../../../services/inventoryService';

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

// Mock ResizeObserver for Ant Design Tabs / Tables
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../services/inventoryService', () => ({
  inventoryService: {
    getInventoryList: vi.fn(),
    getLedger: vi.fn(),
    exportLedgerCsv: vi.fn(),
  },
}));

vi.mock('../../../../services/imeiService', () => ({
  imeiService: {
    getDevices: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  },
}));

vi.mock('../../../../services/productService', () => ({
  productService: {
    getProducts: vi.fn().mockResolvedValue({ products: [], total: 0 }),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { role: 'ADMIN' },
  }),
}));

describe('AdminInventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.getInventoryList).mockResolvedValue([]);
    vi.mocked(inventoryService.getLedger).mockResolvedValue({
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
  });

  it('renders all three tabs including Tab 3 "Sổ kho & Dòng tiền"', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/inventory']}>
        <Routes>
          <Route path="/admin/inventory" element={<AdminInventoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tồn kho biến thể (Stock)')).toBeDefined();
      expect(screen.getByText('Quản lý thiết bị IMEI')).toBeDefined();
      expect(screen.getByText('Sổ kho & Dòng tiền')).toBeDefined();
    });
  });

  it('activates Tab 3 when ?tab=ledger query param is present', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/inventory?tab=ledger']}>
        <Routes>
          <Route path="/admin/inventory" element={<AdminInventoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // InventoryLedgerTab is rendered
      expect(screen.getByText('Tổng tiền hàng Nhập')).toBeDefined();
      expect(screen.getByText('Dòng tiền Ròng')).toBeDefined();
      expect(screen.getByText('Xuất file CSV')).toBeDefined();
    });
  });

  it('switches to Tab 3 when clicking "Sổ kho & Dòng tiền"', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/inventory']}>
        <Routes>
          <Route path="/admin/inventory" element={<AdminInventoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    const ledgerTabButton = screen.getByText('Sổ kho & Dòng tiền');
    fireEvent.click(ledgerTabButton);

    await waitFor(() => {
      expect(screen.getByText('Tổng tiền hàng Nhập')).toBeDefined();
      expect(screen.getByText('Dòng tiền Ròng')).toBeDefined();
    });
  });
});
