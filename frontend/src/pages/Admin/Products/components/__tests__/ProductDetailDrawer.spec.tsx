// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { message } from 'antd';
import { ProductDetailDrawer } from '../ProductDetailDrawer';
import { productService } from '../../../../../services/productService';
import { supplierService } from '../../../../../services/supplierService';
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

// Mock ResizeObserver for Ant Design Drawer and Table
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../../services/productService', () => ({
  productService: {
    getProductById: vi.fn(),
  },
}));

vi.mock('../../../../../services/supplierService', () => ({
  supplierService: {
    getSuppliers: vi.fn(),
  },
}));

vi.mock('../../../../../services/inventoryService', () => ({
  inventoryService: {
    getVariantLedger: vi.fn(),
  },
}));

const mockProduct = {
  id: 'prod-101',
  name: 'iPhone 16 Pro Max',
  slug: 'iphone-16-pro-max',
  description: 'Flagship siêu phẩm từ Apple với chip A18 Pro mạnh mẽ.',
  brandId: 'br-1',
  categoryId: 'cat-1',
  brand: { id: 'br-1', name: 'Apple' },
  category: { id: 'cat-1', name: 'Điện thoại' },
  status: 'ACTIVE' as const,
  condition: 'NEW',
  warrantyMonths: 12,
  thumbnailUrl: 'https://example.com/thumb.png',
  variants: [
    {
      id: 'var-1',
      productId: 'prod-101',
      sku: 'IP16PM-256-TI',
      name: 'iPhone 16 Pro Max 256GB Titan Tự Nhiên',
      color: 'Titan Tự Nhiên',
      storage: '256GB',
      ram: '8GB',
      price: 29990000,
      costPrice: 26000000,
      inventory: {
        quantity: 15,
        availableQty: 15,
        reservedQty: 0,
      },
      isActive: true,
    },
  ],
  specs: {
    'Màn hình': '6.9 inch OLED',
    'Chipset / CPU': 'Apple A18 Pro',
  },
};

const mockSuppliers = [
  {
    id: 'sup-1',
    name: 'FPT Synnex',
    contactName: 'Nguyễn Văn A',
    phone: '0901234567',
    email: 'a@synnex.fpt.vn',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockLedger = {
  items: [
    {
      id: 'sm-1',
      variantId: 'var-1',
      type: 'INBOUND' as const,
      quantity: 50,
      balanceBefore: 0,
      balanceAfter: 50,
      unitPrice: 26000000,
      totalAmount: 1300000000,
      referenceType: 'SUPPLIER',
      referenceId: 'sup-1',
      note: '[NCC: FPT Synnex] Nhập hàng đợt 1',
      createdAt: '2026-03-15T08:30:00Z',
    },
  ],
  pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
  summary: {
    totalInQuantity: 50,
    totalOutQuantity: 0,
    totalInAmount: 1300000000,
    totalOutAmount: 0,
    netAmount: 1300000000,
    totalTransactions: 1,
  },
};

describe('ProductDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productService.getProductById).mockResolvedValue(mockProduct as any);
    vi.mocked(supplierService.getSuppliers).mockResolvedValue(mockSuppliers as any);
    vi.mocked(inventoryService.getVariantLedger).mockResolvedValue(mockLedger as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders overview information (brand, category, warranty, name, status, id, slug)', async () => {
    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('iPhone 16 Pro Max')).toBeDefined();
    });

    expect(screen.getByText('Đang kinh doanh')).toBeDefined();
    expect(screen.getByText('Apple')).toBeDefined();
    expect(screen.getByText('Điện thoại')).toBeDefined();
    expect(screen.getByText(/12 tháng/i)).toBeDefined();
    expect(screen.getByText(/Mới 100%/i)).toBeDefined();
    expect(screen.getByText('iphone-16-pro-max')).toBeDefined();
    expect(screen.getByText('prod-101')).toBeDefined();
  });

  it('renders supplier information from inbound variant ledger and falls back when none', async () => {
    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/FPT Synnex/i)).toBeDefined();
    });

    expect(inventoryService.getVariantLedger).toHaveBeenCalledWith('var-1', { page: 1, limit: 5 });
    expect(screen.getByText(/Nguyễn Văn A/i)).toBeDefined();
    expect(screen.getByText(/0901234567/i)).toBeDefined();
    expect(screen.getByText(/50/i)).toBeDefined();
    expect(screen.getByText('Giá nhập')).toBeDefined();
    expect(screen.getAllByText(/26\.000\.000/).length).toBeGreaterThanOrEqual(1);

    cleanup();

    // Test fallback when no inbound movement exists
    vi.mocked(inventoryService.getVariantLedger).mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      summary: { totalInQuantity: 0, totalOutQuantity: 0, totalInAmount: 0, totalOutAmount: 0, netAmount: 0, totalTransactions: 0 },
    } as any);

    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Chưa có thông tin nhập kho từ nhà cung cấp/i)).toBeDefined();
    });
  });

  it('renders variant list, description and specs correctly', async () => {
    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('IP16PM-256-TI')).toBeDefined();
    });

    expect(screen.getByText('Titan Tự Nhiên')).toBeDefined();
    expect(screen.getByText('8GB / 256GB')).toBeDefined();
    expect(screen.getByText(/29\.990\.000/)).toBeDefined();
    expect(screen.getAllByText(/26\.000\.000/).length).toBeGreaterThanOrEqual(1);

    // Specs
    expect(screen.getByText('Màn hình')).toBeDefined();
    expect(screen.getByText('6.9 inch OLED')).toBeDefined();
    expect(screen.getByText('Chipset / CPU')).toBeDefined();
    expect(screen.getByText('Apple A18 Pro')).toBeDefined();

    // Description
    expect(screen.getByText(/Flagship siêu phẩm từ Apple với chip A18 Pro mạnh mẽ\./i)).toBeDefined();
  });

  it('displays shortDescription when description is not provided', async () => {
    vi.mocked(productService.getProductById).mockResolvedValueOnce({
      ...mockProduct,
      description: '',
      shortDescription: 'Mô tả ngắn gọn của sản phẩm',
    } as any);

    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('iPhone 16 Pro Max')).toBeDefined();
    });

    expect(screen.getByText('Mô tả ngắn gọn của sản phẩm')).toBeDefined();
  });

  it('triggers onOpenEdit and onClose when clicking "Chỉnh sửa sản phẩm"', async () => {
    const handleClose = vi.fn();
    const handleOpenEdit = vi.fn();

    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={handleClose}
        onOpenEdit={handleOpenEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('iPhone 16 Pro Max')).toBeDefined();
    });

    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa sản phẩm/i });
    fireEvent.click(editBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleOpenEdit).toHaveBeenCalledWith('prod-101');
  });

  it('calls window.open with the storefront URL when clicking "Xem trên Storefront"', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('iPhone 16 Pro Max')).toBeDefined();
    });

    const storefrontBtn = screen.getByRole('button', { name: /Xem trên Storefront/i });
    fireEvent.click(storefrontBtn);

    expect(openSpy).toHaveBeenCalledWith('/products/iphone-16-pro-max', '_blank');
    openSpy.mockRestore();
  });

  it('displays error message when product fetching fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const messageErrorSpy = vi.spyOn(message, 'error').mockImplementation(() => ({} as any));
    vi.mocked(productService.getProductById).mockRejectedValueOnce(
      new Error('Lỗi kết nối máy chủ')
    );

    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-err"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(messageErrorSpy).toHaveBeenCalledWith('Lỗi kết nối máy chủ');
    });

    errorSpy.mockRestore();
    messageErrorSpy.mockRestore();
  });
});
