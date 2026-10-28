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

  describe('zero stock is a real limit (E2)', () => {
    it('blocks addItem when availableQty is 0 and warns out of stock', () => {
      const variant = createMockVariant('var-zero', 0);
      useCartStore.getState().addItem(mockProduct, variant, 1);

      expect(useCartStore.getState().items).toHaveLength(0);
      expect(notifyWarning).toHaveBeenCalledWith('Sản phẩm hiện đã hết hàng.');
    });

    it('blocks buyNow when availableQty is 0 and warns out of stock', () => {
      const variant = createMockVariant('var-zero-bn', 0);
      useCartStore.getState().buyNow(mockProduct, variant, 1);

      expect(useCartStore.getState().items).toHaveLength(0);
      expect(notifyWarning).toHaveBeenCalledWith('Sản phẩm hiện đã hết hàng.');
    });

    it('blocks updateQuantity increment on a zero-stock item and warns out of stock', () => {
      const item = createCartItem('item-zero', 'var-zero', 1, { availableQty: 0 });
      useCartStore.setState({ items: [item] });

      useCartStore.getState().updateQuantity('item-zero', 2);

      expect(useCartStore.getState().items[0].quantity).toBe(1);
      expect(notifyWarning).toHaveBeenCalledWith('Sản phẩm hiện đã hết hàng.');
    });

    it('still allows addItem when the inventory object is absent', () => {
      const variant = { id: 'var-noinv', price: 100000 } as unknown as ProductVariant;
      useCartStore.getState().addItem(mockProduct, variant, 3);

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
      expect(notifyWarning).not.toHaveBeenCalled();
    });
  });

  describe('rollback does not clobber a newer quantity (E5)', () => {
    it('keeps the newer quantity when a stale update request fails', async () => {
      localStorage.setItem('phoneshop_access_token', 'tok');
      const item = createCartItem('item-1', 'var-1', 2, { availableQty: 99 });
      useCartStore.setState({ items: [item] });

      let rejectStale!: (reason?: unknown) => void;
      vi.mocked(cartService.updateCartItem)
        .mockImplementationOnce(
          () => new Promise((_resolve, reject) => { rejectStale = reject; })
        )
        .mockResolvedValueOnce({} as any);

      useCartStore.getState().updateQuantity('item-1', 5); // stale — will fail
      useCartStore.getState().updateQuantity('item-1', 8); // newer — succeeds

      rejectStale(new Error('stale failure'));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(useCartStore.getState().items[0].quantity).toBe(8);
    });

    it('still rolls back when the failed request is the latest quantity', async () => {
      localStorage.setItem('phoneshop_access_token', 'tok');
      const item = createCartItem('item-1', 'var-1', 2, { availableQty: 99 });
      useCartStore.setState({ items: [item] });

      vi.mocked(cartService.updateCartItem).mockRejectedValueOnce(new Error('out of stock'));

      useCartStore.getState().updateQuantity('item-1', 5);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(useCartStore.getState().items[0].quantity).toBe(2);
    });
  });

  describe('re-adding a flash item keeps its flash price (E3b)', () => {
    it('keeps the existing flash unitPrice when priceOverride is not provided', () => {
      const flashItem = createCartItem('item-fs', 'var-fs', 1, {
        availableQty: 10,
        isFlashSale: true,
        flashQuotaLeft: 5,
      });
      flashItem.unitPrice = 15000000;
      flashItem.price = 15000000;
      useCartStore.setState({ items: [flashItem] });

      useCartStore.getState().addItem(mockProduct, flashItem.variant, 1);

      expect(useCartStore.getState().items[0].unitPrice).toBe(15000000);
    });
  });

  describe('swallowed cart mutation failures still warn (E13)', () => {
    const SYNC_FAIL_MSG = 'Không thể đồng bộ với giỏ hàng trên hệ thống. Vui lòng thử lại.';

    it('warns when removeItem backend sync fails', async () => {
      localStorage.setItem('phoneshop_access_token', 'tok');
      useCartStore.setState({ items: [createCartItem('item-1', 'var-1', 1)], selectedItemIds: [] });
      vi.mocked(cartService.removeFromCart).mockRejectedValueOnce(new Error('network'));

      useCartStore.getState().removeItem('item-1');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(notifyWarning).toHaveBeenCalledWith(SYNC_FAIL_MSG);
    });

    it('warns when clearCart backend sync fails', async () => {
      localStorage.setItem('phoneshop_access_token', 'tok');
      useCartStore.setState({ items: [createCartItem('item-1', 'var-1', 1)], selectedItemIds: [] });
      vi.mocked(cartService.clearCart).mockRejectedValueOnce(new Error('network'));

      useCartStore.getState().clearCart();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(notifyWarning).toHaveBeenCalledWith(SYNC_FAIL_MSG);
    });

    it('warns when removeSelectedItems backend sync fails', async () => {
      localStorage.setItem('phoneshop_access_token', 'tok');
      useCartStore.setState({
        items: [createCartItem('item-1', 'var-1', 1)],
        selectedItemIds: ['item-1'],
      });
      vi.mocked(cartService.removeBulk).mockRejectedValueOnce(new Error('network'));

      useCartStore.getState().removeSelectedItems();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(notifyWarning).toHaveBeenCalledWith(SYNC_FAIL_MSG);
    });
  });

  describe('resetForUserChange clears everything user-specific (E1)', () => {
    it('clears items, selection, pending queue and persisted cart', () => {
      localStorage.setItem('phoneshop_access_token', 'tok');
      localStorage.setItem('phoneshop_cart_pending', JSON.stringify(['v1']));
      useCartStore.setState({
        items: [createCartItem('item-1', 'v1', 1)],
        selectedItemIds: ['item-1'],
      });

      useCartStore.getState().resetForUserChange();

      expect(useCartStore.getState().items).toEqual([]);
      expect(useCartStore.getState().selectedItemIds).toEqual([]);
      expect(localStorage.getItem('phoneshop_cart_pending')).toBeNull();
      const persisted = localStorage.getItem('phoneshop_cart_storage');
      expect(
        persisted === null || (JSON.parse(persisted as string)?.state?.items ?? []).length === 0
      ).toBe(true);
    });
  });
});
