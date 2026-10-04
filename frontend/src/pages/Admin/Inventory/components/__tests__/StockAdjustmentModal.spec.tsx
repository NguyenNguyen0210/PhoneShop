// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { StockAdjustmentModal } from '../StockAdjustmentModal';
import { inventoryService } from '../../../../../services/inventoryService';
import { supplierService } from '../../../../../services/supplierService';

// Mock ResizeObserver for Ant Design components
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

// Mock window.matchMedia for Ant Design in jsdom
beforeAll(() => {
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
});

vi.mock('../../../../../services/inventoryService', () => ({
  inventoryService: {
    adjustStock: vi.fn(),
  },
}));

vi.mock('../../../../../services/supplierService', () => ({
  supplierService: {
    getSuppliers: vi.fn(),
  },
}));

describe('StockAdjustmentModal', () => {
  const mockItem: any = {
    id: 'inv-1',
    variantId: 'v-1',
    quantity: 10,
    availableQty: 10,
    reservedQty: 0,
    reorderLevel: 2,
    variant: {
      id: 'v-1',
      sku: 'IP15-BLK',
      color: 'Đen',
      storage: '128GB',
      costPrice: 15000000,
      price: 20000000,
      product: {
        id: 'p-1',
        name: 'iPhone 15',
        thumbnail: 'https://example.com/thumb.png',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supplierService.getSuppliers).mockResolvedValue([
      {
        id: 'sup-1',
        name: 'Apple Vietnam',
        contactName: 'Nguyen Van A',
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'sup-2',
        name: 'Digiworld',
        contactName: null,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders unit price input with label and placeholder', () => {
    render(
      <StockAdjustmentModal
        open={true}
        item={mockItem}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('iPhone 15')).toBeDefined();
    expect(screen.getByLabelText(/Đơn giá điều chỉnh/i)).toBeDefined();
    expect(screen.getByPlaceholderText('Nhập đơn giá (VNĐ)')).toBeDefined();
  });

  it('prefills unitPrice with costPrice and displays hint text', () => {
    render(
      <StockAdjustmentModal
        open={true}
        item={mockItem}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const unitPriceInput = screen.getByPlaceholderText('Nhập đơn giá (VNĐ)') as HTMLInputElement;
    expect(unitPriceInput.value).toBe('15,000,000');
    expect(screen.getByText('(Giá vốn hiện tại: 15.000.000)')).toBeDefined();
  });

  it('prefills unitPrice with price when costPrice is undefined or zero', () => {
    const itemWithoutCost: any = {
      ...mockItem,
      variant: {
        ...mockItem.variant,
        costPrice: undefined,
        price: 20000000,
      },
    };

    render(
      <StockAdjustmentModal
        open={true}
        item={itemWithoutCost}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const unitPriceInput = screen.getByPlaceholderText('Nhập đơn giá (VNĐ)') as HTMLInputElement;
    expect(unitPriceInput.value).toBe('20,000,000');
    expect(screen.getByText('(Giá vốn hiện tại: 0)')).toBeDefined();
  });

  it('updates total preview when quantity or unit price changes and toggles color by mode', async () => {
    render(
      <StockAdjustmentModal
        open={true}
        item={mockItem}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Initial total preview: 1 * 15,000,000 = 15,000,000 in ADD mode (green)
    const previewText = screen.getByText(/Thành tiền ước tính: 15\.000\.000 VNĐ/i);
    expect(previewText).toBeDefined();
    expect(previewText.style.color).toBe('rgb(82, 196, 26)');

    // Change quantity to 3 -> preview = 3 * 15,000,000 = 45,000,000
    const qtyInput = screen.getByPlaceholderText('Nhập số lượng máy');
    fireEvent.change(qtyInput, { target: { value: '3' } });

    await waitFor(() => {
      expect(screen.getByText(/Thành tiền ước tính: 45\.000\.000 VNĐ/i)).toBeDefined();
    });

    // Change unit price to 10,000,000 -> preview = 3 * 10,000,000 = 30,000,000
    const priceInput = screen.getByPlaceholderText('Nhập đơn giá (VNĐ)');
    fireEvent.change(priceInput, { target: { value: '10000000' } });

    await waitFor(() => {
      expect(screen.getByText(/Thành tiền ước tính: 30\.000\.000 VNĐ/i)).toBeDefined();
    });

    // Switch mode to SUBTRACT -> preview remains 30,000,000 but color turns red (#ff4d4f / rgb(255, 77, 79))
    const subtractRadio = screen.getByText(/Xuất \/ Giảm/i);
    fireEvent.click(subtractRadio);

    await waitFor(() => {
      const redPreview = screen.getByText(/Thành tiền ước tính: 30\.000\.000 VNĐ/i);
      expect(redPreview).toBeDefined();
      expect(redPreview.style.color).toBe('rgb(255, 77, 79)');
    });
  });

  it('passes unitPrice in adjustStock payload on submit', async () => {
    vi.mocked(inventoryService.adjustStock).mockResolvedValueOnce({} as any);

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <StockAdjustmentModal
        open={true}
        item={mockItem}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Xác nhận lưu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inventoryService.adjustStock).toHaveBeenCalledWith('v-1', {
        quantity: 1,
        unitPrice: 15000000,
        note: undefined,
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('passes modified unitPrice in adjustStock payload on submit', async () => {
    vi.mocked(inventoryService.adjustStock).mockResolvedValueOnce({} as any);

    render(
      <StockAdjustmentModal
        open={true}
        item={mockItem}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const priceInput = screen.getByPlaceholderText('Nhập đơn giá (VNĐ)');
    fireEvent.change(priceInput, { target: { value: '16500000' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận lưu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inventoryService.adjustStock).toHaveBeenCalledWith('v-1', {
        quantity: 1,
        unitPrice: 16500000,
        note: undefined,
      });
    });
  });

  it('submits negative quantity and unitPrice when in SUBTRACT mode', async () => {
    vi.mocked(inventoryService.adjustStock).mockResolvedValueOnce({} as any);

    render(
      <StockAdjustmentModal
        open={true}
        item={mockItem}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Switch to SUBTRACT
    const subtractRadio = screen.getByText(/Xuất \/ Giảm/i);
    fireEvent.click(subtractRadio);

    // Change quantity to 4
    const qtyInput = screen.getByPlaceholderText('Nhập số lượng máy');
    fireEvent.change(qtyInput, { target: { value: '4' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận lưu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inventoryService.adjustStock).toHaveBeenCalledWith('v-1', {
        quantity: -4,
        unitPrice: 15000000,
        note: undefined,
      });
    });
  });

  it('returns null when item is null', () => {
    const { container } = render(
      <StockAdjustmentModal
        open={true}
        item={null}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders supplier dropdown in ADD mode and includes supplier in note and payload on submit', async () => {
    vi.mocked(inventoryService.adjustStock).mockResolvedValueOnce({} as any);

    render(
      <StockAdjustmentModal
        open={true}
        item={mockItem}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Verify supplierService.getSuppliers(true) was called
    expect(supplierService.getSuppliers).toHaveBeenCalledWith(true);

    // Supplier dropdown is rendered in ADD mode
    const supplierSelect = screen.getByLabelText(/Nhà cung cấp \(Tùy chọn\)/i);
    expect(supplierSelect).toBeDefined();

    // Open select dropdown and choose supplier
    fireEvent.mouseDown(supplierSelect);
    const option = await screen.findByText('Apple Vietnam (Nguyen Van A)');
    fireEvent.click(option);

    // Enter note
    const noteInput = screen.getByPlaceholderText(/VD: Nhập lô hàng mới đợt 2/i);
    fireEvent.change(noteInput, { target: { value: 'Nhập lô tháng 10' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Xác nhận lưu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inventoryService.adjustStock).toHaveBeenCalledWith('v-1', {
        quantity: 1,
        unitPrice: 15000000,
        note: '[NCC: Apple Vietnam] Nhập lô tháng 10',
        referenceType: 'SUPPLIER',
        referenceId: 'sup-1',
      });
    });
  });

  it('sets note to [NCC: supplierName] when no initial note is provided and supplier is selected', async () => {
    vi.mocked(inventoryService.adjustStock).mockResolvedValueOnce({} as any);

    render(
      <StockAdjustmentModal
        open={true}
        item={mockItem}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const supplierSelect = screen.getByLabelText(/Nhà cung cấp \(Tùy chọn\)/i);
    fireEvent.mouseDown(supplierSelect);
    const option = await screen.findByText('Digiworld');
    fireEvent.click(option);

    const submitBtn = screen.getByRole('button', { name: /Xác nhận lưu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inventoryService.adjustStock).toHaveBeenCalledWith('v-1', {
        quantity: 1,
        unitPrice: 15000000,
        note: '[NCC: Digiworld]',
        referenceType: 'SUPPLIER',
        referenceId: 'sup-2',
      });
    });
  });

  it('does not render supplier dropdown in SUBTRACT mode', async () => {
    render(
      <StockAdjustmentModal
        open={true}
        item={mockItem}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const subtractRadio = screen.getByText(/Xuất \/ Giảm/i);
    fireEvent.click(subtractRadio);

    await waitFor(() => {
      expect(screen.queryByLabelText(/Nhà cung cấp \(Tùy chọn\)/i)).toBeNull();
    });
  });
});
