// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { StaffInventoryPage } from '../StaffInventoryPage';

// Mock matchMedia and ResizeObserver for Ant Design components in JSDOM
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

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

// Mock child components
vi.mock('../../../Admin/Inventory/components/InventoryStockTab', () => ({
  InventoryStockTab: () => <div data-testid="inventory-stock-tab">Mocked InventoryStockTab</div>,
}));

vi.mock('../../../Admin/Inventory/components/InventoryLedgerTab', () => ({
  InventoryLedgerTab: () => <div data-testid="inventory-ledger-tab">Mocked InventoryLedgerTab</div>,
}));

vi.mock('../../../Admin/InventoryImei/AdminImeiPage', () => ({
  AdminImeiPage: () => <div data-testid="admin-imei-page">Mocked AdminImeiPage</div>,
}));

vi.mock('../../../../services/inventoryService', () => ({
  inventoryService: {
    getInventoryList: vi.fn().mockResolvedValue([]),
  },
}));

describe('StaffInventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title "Kho hàng & Quản lý IMEI" and defaults to stock tab', async () => {
    render(
      <MemoryRouter initialEntries={['/staff/inventory']}>
        <StaffInventoryPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Kho hàng & Quản lý IMEI')).toBeDefined();
    expect(screen.getByText('Tồn kho & Mức cảnh báo')).toBeDefined();
    expect(screen.getByText('Lịch sử Biến động kho')).toBeDefined();
    expect(screen.getByText('Quản lý Mã IMEI & Barcode')).toBeDefined();

    expect(screen.getByTestId('inventory-stock-tab')).toBeDefined();
  });

  it('activates ledger tab when ?tab=ledger is provided in URL', async () => {
    render(
      <MemoryRouter initialEntries={['/staff/inventory?tab=ledger']}>
        <StaffInventoryPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('inventory-ledger-tab')).toBeDefined();
  });

  it('activates imei tab when ?tab=imei is provided in URL', async () => {
    render(
      <MemoryRouter initialEntries={['/staff/inventory?tab=imei']}>
        <StaffInventoryPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-imei-page')).toBeDefined();
  });

  it('updates tab and query param when tab is switched', async () => {
    const QueryParamTracker = () => {
      const [params] = useSearchParams();
      return <div data-testid="param-tab">{params.get('tab') || 'stock'}</div>;
    };

    render(
      <MemoryRouter initialEntries={['/staff/inventory']}>
        <QueryParamTracker />
        <StaffInventoryPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('param-tab').textContent).toBe('stock');

    const ledgerTabButton = screen.getByRole('tab', { name: /Lịch sử Biến động kho/i });
    fireEvent.click(ledgerTabButton);

    await waitFor(() => {
      expect(screen.getByTestId('param-tab').textContent).toBe('ledger');
      expect(screen.getByTestId('inventory-ledger-tab')).toBeDefined();
    });

    const imeiTabButton = screen.getByRole('tab', { name: /Quản lý Mã IMEI & Barcode/i });
    fireEvent.click(imeiTabButton);

    await waitFor(() => {
      expect(screen.getByTestId('param-tab').textContent).toBe('imei');
      expect(screen.getByTestId('admin-imei-page')).toBeDefined();
    });
  });
});
