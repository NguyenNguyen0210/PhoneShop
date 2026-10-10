// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartPage } from '../CartPage';
import { voucherService } from '../../../../services/voucherService';
import { notifyError, notifySuccess } from '../../../../utils/notify';

const mockCartState = {
  items: [
    {
      id: 'cart-item-1',
      variantId: 'v-1',
      quantity: 1,
      unitPrice: 3000000,
      price: 3000000,
      product: { id: 'p-1', name: 'iPhone 13' },
      variant: { id: 'v-1', color: 'Midnight', storage: '128GB', price: 3000000 },
    },
  ],
  selectedItemIds: ['cart-item-1'],
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  clearCart: vi.fn(),
  totalCount: () => 1,
  toggleSelectItem: vi.fn(),
  selectAll: vi.fn(),
  deselectAll: vi.fn(),
  removeSelectedItems: vi.fn(),
  selectedSubtotal: () => 3000000,
  selectedTotalCount: () => 1,
  isAllSelected: () => true,
  syncWithBackend: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../../../stores/useCartStore', () => {
  const useCartStore = vi.fn(() => mockCartState);
  (useCartStore as any).getState = () => mockCartState;
  (useCartStore as any).setState = vi.fn();
  return { useCartStore };
});

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'u-1', email: 'test@example.com' },
    isAuthenticated: true,
  })),
}));

vi.mock('../../../../services/voucherService', () => ({
  voucherService: {
    getActiveVouchers: vi.fn().mockResolvedValue([]),
    validateVoucher: vi.fn(),
  },
}));

vi.mock('../../../../services/flashSaleService', () => ({
  flashSaleService: {
    getActiveCampaign: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../../../services/productService', () => ({
  productService: {
    getProducts: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

vi.mock('../../../../utils/notify', () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  notifyWarning: vi.fn(),
  notifyInfo: vi.fn(),
}));

describe('CartPage Voucher Application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('notifies error with response message when voucher validation returns valid: false', async () => {
    vi.mocked(voucherService.validateVoucher).mockResolvedValueOnce({
      valid: false,
      message: 'Đơn hàng tối thiểu 5.000.000đ để áp dụng mã',
    } as any);

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Nhập mã giảm giá...');
    fireEvent.change(input, { target: { value: 'MIN5M' } });

    const applyButton = screen.getByRole('button', { name: 'Áp dụng' });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(voucherService.validateVoucher).toHaveBeenCalledWith('MIN5M', 3000000, ['cart-item-1']);
      expect(notifyError).toHaveBeenCalledWith('Đơn hàng tối thiểu 5.000.000đ để áp dụng mã');
      expect(notifySuccess).not.toHaveBeenCalled();
    });
  });

  it('notifies error with fallback message when voucher validation returns valid: false without message', async () => {
    vi.mocked(voucherService.validateVoucher).mockResolvedValueOnce({
      valid: false,
    } as any);

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Nhập mã giảm giá...');
    fireEvent.change(input, { target: { value: 'INVALID' } });

    const applyButton = screen.getByRole('button', { name: 'Áp dụng' });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Mã giảm giá không đủ điều kiện áp dụng cho các sản phẩm đã chọn.');
      expect(notifySuccess).not.toHaveBeenCalled();
    });
  });

  it('notifies success when voucher validation returns valid: true', async () => {
    vi.mocked(voucherService.validateVoucher).mockResolvedValueOnce({
      valid: true,
      voucher: {
        id: 'v-1',
        code: 'SALE10',
        name: 'Giảm 10%',
        type: 'PERCENTAGE',
        value: 10,
      },
      discount: 100000,
    } as any);

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Nhập mã giảm giá...');
    fireEvent.change(input, { target: { value: 'SALE10' } });

    const applyButton = screen.getByRole('button', { name: 'Áp dụng' });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(voucherService.validateVoucher).toHaveBeenCalledWith('SALE10', 3000000, ['cart-item-1']);
      expect(notifySuccess).toHaveBeenCalledWith('Áp dụng mã giảm giá thành công!');
      expect(notifyError).not.toHaveBeenCalled();
    });

    expect(sessionStorage.getItem('phoneshop_voucher')).toContain('SALE10');
  });
});
