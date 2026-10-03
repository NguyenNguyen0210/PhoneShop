// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { VariantFormModal } from '../VariantFormModal';
import { productService } from '../../../../../services/productService';
import { message } from 'antd';
import type { ProductVariant } from '../../../../../types';

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

vi.mock('../../../../../services/productService', () => ({
  productService: {
    addVariant: vi.fn(),
    updateVariant: vi.fn(),
  },
}));

vi.mock('../../../../../components/admin/ImageUploadDragger', () => ({
  ImageUploadDragger: ({ value, onChange, folder }: any) => (
    <div data-testid="image-upload-dragger" data-folder={folder}>
      <input
        data-testid="mock-image-input"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  ),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  };
});

describe('VariantFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockProduct = {
    id: 'prod-123',
    name: 'iPhone 15 Pro Max',
  };

  const mockVariant: ProductVariant = {
    id: 'var-999',
    productId: 'prod-123',
    sku: 'IP15PM-256GB-TITAN',
    name: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
    color: 'Titan Tự Nhiên',
    storage: '256GB',
    ram: '8GB',
    price: 29990000,
    compareAtPrice: 34990000,
    costPrice: 26000000,
    imageUrl: 'https://cdn.example.com/titan.webp',
  };

  it('renders modal in create mode with title and all required fields', () => {
    render(
      <VariantFormModal
        open={true}
        productId={mockProduct.id}
        productName={mockProduct.name}
        variant={null}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Thêm biến thể mới')).toBeDefined();
    expect(screen.getByLabelText(/Tên biến thể/i)).toBeDefined();
    expect(screen.getByLabelText(/Mã SKU/i)).toBeDefined();
    expect(screen.getByText('Gợi ý SKU')).toBeDefined();
    expect(screen.getByLabelText(/Màu sắc/i)).toBeDefined();
    expect(screen.getByLabelText(/Bộ nhớ ROM/i)).toBeDefined();
    expect(screen.getByLabelText(/RAM/i)).toBeDefined();
    expect(screen.getByLabelText(/Giá bán/i)).toBeDefined();
    expect(screen.getByLabelText(/Giá gốc niêm yết/i)).toBeDefined();
    expect(screen.getByTestId('image-upload-dragger')).toBeDefined();
    expect(screen.getByTestId('image-upload-dragger').getAttribute('data-folder')).toBe('variants');
  });

  it('generates suggested SKU when clicking "Gợi ý SKU" button', async () => {
    render(
      <VariantFormModal
        open={true}
        productId={mockProduct.id}
        productName="iPhone 15 Pro Max"
        variant={null}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Enter color
    const colorInput = screen.getByLabelText(/Màu sắc/i);
    fireEvent.change(colorInput, { target: { value: 'Titan Tự Nhiên' } });

    // Click "Gợi ý SKU"
    const suggestBtn = screen.getByRole('button', { name: /Gợi ý SKU/i });
    fireEvent.click(suggestBtn);

    const skuInput = screen.getByLabelText(/Mã SKU/i) as HTMLInputElement;
    expect(skuInput.value).toContain('IPHONE-15-PRO-MAX');
    expect(skuInput.value).toContain('TITAN-TU-NHIEN');
  });

  it('submits form successfully in create mode', async () => {
    vi.mocked(productService.addVariant).mockResolvedValueOnce({
      ...mockVariant,
      id: 'var-new-1',
    });

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <VariantFormModal
        open={true}
        productId={mockProduct.id}
        productName={mockProduct.name}
        variant={null}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText(/Tên biến thể/i), {
      target: { value: 'iPhone 15 Pro Max 256GB Blue' },
    });
    fireEvent.change(screen.getByLabelText(/Mã SKU/i), {
      target: { value: 'IP15PM-256GB-BLUE' },
    });
    fireEvent.change(screen.getByLabelText(/Màu sắc/i), {
      target: { value: 'Xanh Titan' },
    });
    fireEvent.change(screen.getByLabelText(/Giá bán/i), {
      target: { value: '28990000' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lưu|Thêm|Tạo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(productService.addVariant).toHaveBeenCalledWith(
        mockProduct.id,
        expect.objectContaining({
          name: 'iPhone 15 Pro Max 256GB Blue',
          sku: 'IP15PM-256GB-BLUE',
          color: 'Xanh Titan',
          price: 28990000,
        })
      );
      expect(message.success).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders in edit mode and submits updateVariant successfully', async () => {
    vi.mocked(productService.updateVariant).mockResolvedValueOnce({
      ...mockVariant,
      price: 27990000,
    });

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <VariantFormModal
        open={true}
        productId={mockProduct.id}
        productName={mockProduct.name}
        variant={mockVariant}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText('Chỉnh sửa biến thể')).toBeDefined();

    const nameInput = screen.getByLabelText(/Tên biến thể/i) as HTMLInputElement;
    expect(nameInput.value).toBe(mockVariant.name);

    const skuInput = screen.getByLabelText(/Mã SKU/i) as HTMLInputElement;
    expect(skuInput.value).toBe(mockVariant.sku);

    const priceInput = screen.getByLabelText(/Giá bán/i) as HTMLInputElement;
    expect(priceInput.value.replace(/,/g, '')).toBe(mockVariant.price.toString());

    // Edit price
    fireEvent.change(priceInput, { target: { value: '27990000' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu|Cập nhật/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(productService.updateVariant).toHaveBeenCalledWith(
        mockProduct.id,
        mockVariant.id,
        expect.objectContaining({
          price: 27990000,
        })
      );
      expect(message.success).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error message when submission fails', async () => {
    vi.mocked(productService.addVariant).mockRejectedValueOnce(
      new Error('Mã SKU đã tồn tại')
    );

    const onSuccess = vi.fn();

    render(
      <VariantFormModal
        open={true}
        productId={mockProduct.id}
        productName={mockProduct.name}
        variant={null}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText(/Tên biến thể/i), {
      target: { value: 'iPhone 15' },
    });
    fireEvent.change(screen.getByLabelText(/Mã SKU/i), {
      target: { value: 'DUP-SKU' },
    });
    fireEvent.change(screen.getByLabelText(/Giá bán/i), {
      target: { value: '20000000' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lưu|Thêm|Tạo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith(
        expect.stringContaining('Mã SKU đã tồn tại')
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  it('calls onClose when clicking cancel button', () => {
    const onClose = vi.fn();

    render(
      <VariantFormModal
        open={true}
        productId={mockProduct.id}
        productName={mockProduct.name}
        variant={null}
        onClose={onClose}
        onSuccess={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Hủy/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
