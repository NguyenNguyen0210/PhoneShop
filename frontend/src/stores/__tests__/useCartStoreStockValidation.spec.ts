// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCartStore } from '../useCartStore';
import { cartService } from '../../services/cartService';
import { notifyError, notifyWarning } from '../../utils/notify';
import type { CartItem, Product, ProductVariant } from '../../types';

vi.mock('../../services/cartService', () => ({
  cartService: {
    getCart: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateCartItem: vi.fn(),
    clearCart: vi.fn(),
    removeBulk: vi.fn(),
  },
}));

vi.mock('../../utils/notify', () => ({
  notifyError: vi.fn(),
  notifyWarning: vi.fn(),
  notifySuccess: vi.fn(),
  notifyInfo: vi.fn(),
}));

const mockProduct: Product = {
  id: 'prod-1',
  name: 'iPhone 15 Pro',
  slug: 'iphone-15-pro',
  description: 'Test phone',
  variants: [],
  images: [],
  brandId: 'brand-1',
  categoryId: 'cat-1',
  status: 'ACTIVE',
  createdAt: '2026-01-01',
};

const createMockVariant = (id: string, availableQty: number, price = 25000000): ProductVariant => ({
  id,
  productId: 'prod-1',
  sku: `SKU-${id}`,
  color: 'Natural Titanium',
  storage: '256GB',
  price,
  inventory: {
    availableQty,
  },
});

const createCartItem = (
  id: string,
  variantId: string,
  quantity: number,
  options: {
    availableQty?: number;
    isFlashSale?: boolean;
    flashQuotaLeft?: number;
  } = {}
): CartItem => {
  const variant = createMockVariant(variantId, options.availableQty ?? 10);
  return {
    id,
    variantId,
    quantity,
    price: variant.price,
    unitPrice: variant.price,
    product: mockProduct,
    variant,
    isFlashSale: options.isFlashSale ?? false,
    flashQuotaLeft: options.flashQuotaLeft,
  };
};

describe('useCartStore - Stock & Flash Sale Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useCartStore.setState({ items: [], selectedItemIds: [] });
  });

  describe('updateQuantity capped by availableQty for normal items', () => {
    it('allows updating quantity up to availableQty', () => {
      const item = createCartItem('item-1', 'var-1', 2, { availableQty: 5 });
      useCartStore.setState({ items: [item] });

      useCartStore.getState().updateQuantity('item-1', 5);

      expect(useCartStore.getState().items[0].quantity).toBe(5);
      expect(notifyWarning).not.toHaveBeenCalled();
    });

    it('blocks updating quantity beyond availableQty and notifies warning', () => {
      const item = createCartItem('item-1', 'var-1', 2, { availableQty: 5 });
      useCartStore.setState({ items: [item] });

      useCartStore.getState().updateQuantity('item-1', 6);

      expect(useCartStore.getState().items[0].quantity).toBe(2);
      expect(notifyWarning).toHaveBeenCalledWith('Kho chỉ còn tối đa 5 sản phẩm khả dụng.');
    });

    it('removes item if quantity <= 0', () => {
      const item = createCartItem('item-1', 'var-1', 2, { availableQty: 5 });
      useCartStore.setState({ items: [item] });

      useCartStore.getState().updateQuantity('item-1', 0);

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('updateQuantity capped by flashQuotaLeft for flash sale items', () => {
    it('caps quantity to flashQuotaLeft when flashQuotaLeft < availableQty', () => {
      const flashItem = createCartItem('item-fs-1', 'var-fs-1', 1, {
        availableQty: 10,
        isFlashSale: true,
        flashQuotaLeft: 3,
      });
      useCartStore.setState({ items: [flashItem] });

      // Valid update
      useCartStore.getState().updateQuantity('item-fs-1', 3);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
      expect(notifyWarning).not.toHaveBeenCalled();

      // Exceeds flashQuotaLeft
      useCartStore.getState().updateQuantity('item-fs-1', 4);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
      expect(notifyWarning).toHaveBeenCalledWith(
        'Ưu đãi Flash Sale chỉ áp dụng tối đa 3 suất cho phiên bản này.'
      );
    });

    it('caps quantity to availableQty when availableQty < flashQuotaLeft', () => {
      const flashItem = createCartItem('item-fs-2', 'var-fs-2', 1, {
        availableQty: 2,
        isFlashSale: true,
        flashQuotaLeft: 5,
      });
      useCartStore.setState({ items: [flashItem] });

      // Exceeds availableQty (which is min of 5 and 2 = 2)
      useCartStore.getState().updateQuantity('item-fs-2', 3);
      expect(useCartStore.getState().items[0].quantity).toBe(1);
      expect(notifyWarning).toHaveBeenCalledWith(
        'Ưu đãi Flash Sale chỉ áp dụng tối đa 2 suất cho phiên bản này.'
      );
    });
  });

  describe('Rollback and notification when cartService.updateCartItem rejects', () => {
    it('rolls back quantity to previousQty and calls notifyError when authenticated', async () => {
      localStorage.setItem('phoneshop_access_token', 'valid-token');

      const item = createCartItem('item-1', 'var-1', 2, { availableQty: 10 });
      useCartStore.setState({ items: [item] });

      const apiError = new Error('Insufficient inventory error');
      vi.mocked(cartService.updateCartItem).mockRejectedValueOnce(apiError);

      useCartStore.getState().updateQuantity('item-1', 5);

      // Optimistic update
      expect(useCartStore.getState().items[0].quantity).toBe(5);
      expect(cartService.updateCartItem).toHaveBeenCalledWith('var-1', 5);

      // Wait for promise rejection handling
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Rolled back to previousQty
      expect(useCartStore.getState().items[0].quantity).toBe(2);
      expect(notifyError).toHaveBeenCalledWith(apiError, 'Số lượng trong kho không đủ để đáp ứng.');
    });

    it('does not call backend service when not authenticated', () => {
      const item = createCartItem('item-1', 'var-1', 2, { availableQty: 10 });
      useCartStore.setState({ items: [item] });

      useCartStore.getState().updateQuantity('item-1', 4);

      expect(useCartStore.getState().items[0].quantity).toBe(4);
      expect(cartService.updateCartItem).not.toHaveBeenCalled();
    });
  });

  describe('addItem & buyNow stock limits and flashQuotaLeft persistence', () => {
    it('clamps addItem quantity to available stock and notifies warning', () => {
      const variant = createMockVariant('var-stock', 3);
      useCartStore.getState().addItem(mockProduct, variant, 5);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
      expect(notifyWarning).toHaveBeenCalledWith('Kho chỉ còn tối đa 3 sản phẩm khả dụng.');
    });

    it('clamps addItem flash sale quantity to flashQuotaLeft and persists flashQuotaLeft', () => {
      const variant = createMockVariant('var-flash', 10);
      useCartStore.getState().addItem(mockProduct, variant, 5, 20000000, true, 2);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
      expect(items[0].isFlashSale).toBe(true);
      expect(items[0].flashQuotaLeft).toBe(2);
      expect(notifyWarning).toHaveBeenCalledWith(
        'Ưu đãi Flash Sale chỉ áp dụng tối đa 2 suất cho phiên bản này.'
      );
    });

    it('clamps buyNow quantity and persists flashQuotaLeft', () => {
      const variant = createMockVariant('var-buynow', 10);
      useCartStore.getState().buyNow(mockProduct, variant, 4, 20000000, true, 2);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
      expect(items[0].isFlashSale).toBe(true);
      expect(items[0].flashQuotaLeft).toBe(2);
      expect(useCartStore.getState().selectedItemIds).toEqual([items[0].id]);
    });
  });
});
