// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartPage } from '../CartPage';

let mockCartState: any;

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

describe('CartPage Stock Stepper and Limit Feedback', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('disables "+" button and renders stock limit message when normal item quantity reaches availableQty', async () => {
    const updateQuantity = vi.fn();
    mockCartState = {
      items: [
        {
          id: 'item-1',
          variantId: 'v-1',
          quantity: 3,
          unitPrice: 15000000,
          price: 15000000,
          product: { id: 'p-1', name: 'iPhone 15' },
          variant: {
            id: 'v-1',
            color: 'Black',
            storage: '128GB',
            price: 15000000,
            inventory: {
              availableQty: 3,
            },
          },
          isFlashSale: false,
        },
      ],
      selectedItemIds: ['item-1'],
      updateQuantity,
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      totalCount: () => 1,
      toggleSelectItem: vi.fn(),
      selectAll: vi.fn(),
      deselectAll: vi.fn(),
      removeSelectedItems: vi.fn(),
      selectedSubtotal: () => 45000000,
      selectedTotalCount: () => 1,
      isAllSelected: () => true,
      syncWithBackend: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    const plusBtn = screen.getByRole('button', { name: 'Tăng số lượng' }) as HTMLButtonElement;
    expect(plusBtn.disabled).toBe(true);
    expect(plusBtn.className).toContain('cursor-not-allowed');

    expect(
      screen.getByText('Đã đạt số lượng tồn kho tối đa (3 máy)')
    ).toBeDefined();

    // Ensure async effects finish cleanly
    await waitFor(() => {
      expect(plusBtn.disabled).toBe(true);
    });
  });

  it('disables "+" button and renders flash sale limit message when flash sale item quantity reaches flashQuotaLeft', async () => {
    const updateQuantity = vi.fn();
    mockCartState = {
      items: [
        {
          id: 'item-2',
          variantId: 'v-2',
          quantity: 2,
          unitPrice: 12000000,
          originalPrice: 16000000,
          price: 12000000,
          product: { id: 'p-2', name: 'iPhone 14' },
          variant: {
            id: 'v-2',
            color: 'Blue',
            storage: '256GB',
            price: 12000000,
            inventory: {
              availableQty: 10,
            },
          },
          isFlashSale: true,
          flashQuotaLeft: 2,
        },
      ],
      selectedItemIds: ['item-2'],
      updateQuantity,
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      totalCount: () => 1,
      toggleSelectItem: vi.fn(),
      selectAll: vi.fn(),
      deselectAll: vi.fn(),
      removeSelectedItems: vi.fn(),
      selectedSubtotal: () => 24000000,
      selectedTotalCount: () => 1,
      isAllSelected: () => true,
      syncWithBackend: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    const plusBtn = screen.getByRole('button', { name: 'Tăng số lượng' }) as HTMLButtonElement;
    expect(plusBtn.disabled).toBe(true);
    expect(plusBtn.className).toContain('cursor-not-allowed');

    expect(
      screen.getByText('⚡ Đã đạt tối đa 2 suất Flash Sale')
    ).toBeDefined();

    await waitFor(() => {
      expect(plusBtn.disabled).toBe(true);
    });
  });

  it('enables "+" button and triggers updateQuantity when quantity is below limit', async () => {
    const updateQuantity = vi.fn();
    mockCartState = {
      items: [
        {
          id: 'item-3',
          variantId: 'v-3',
          quantity: 1,
          unitPrice: 10000000,
          price: 10000000,
          product: { id: 'p-3', name: 'Samsung Galaxy S23' },
          variant: {
            id: 'v-3',
            color: 'Green',
            storage: '128GB',
            price: 10000000,
            inventory: {
              availableQty: 5,
            },
          },
          isFlashSale: false,
        },
      ],
      selectedItemIds: ['item-3'],
      updateQuantity,
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      totalCount: () => 1,
      toggleSelectItem: vi.fn(),
      selectAll: vi.fn(),
      deselectAll: vi.fn(),
      removeSelectedItems: vi.fn(),
      selectedSubtotal: () => 10000000,
      selectedTotalCount: () => 1,
      isAllSelected: () => true,
      syncWithBackend: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    const plusBtn = screen.getByRole('button', { name: 'Tăng số lượng' }) as HTMLButtonElement;
    expect(plusBtn.disabled).toBe(false);
    expect(
      screen.queryByText(/Đã đạt số lượng tồn kho tối đa/i)
    ).toBeNull();
    expect(
      screen.queryByText(/Đã đạt tối đa/i)
    ).toBeNull();

    fireEvent.click(plusBtn);
    expect(updateQuantity).toHaveBeenCalledTimes(1);
    expect(updateQuantity).toHaveBeenCalledWith('item-3', 2);

    await waitFor(() => {
      expect(updateQuantity).toHaveBeenCalled();
    });
  });
});
