import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '../types';
import { cartService } from '../services/cartService';

interface CartState {
  items: CartItem[];
  selectedItemIds: string[];
  isDrawerOpen: boolean;

  addItem: (
    product: Product,
    variant: ProductVariant,
    quantity?: number,
    priceOverride?: number,
    isFlashSale?: boolean
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  totalAmount: () => number;
  totalCount: () => number;

  // Selection actions & getters
  toggleSelectItem: (itemId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  removeSelectedItems: () => void;
  selectedItems: () => CartItem[];
  selectedSubtotal: () => number;
  selectedTotalCount: () => number;
  isAllSelected: () => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedItemIds: [],
      isDrawerOpen: false,

      addItem: (
        product: Product,
        variant: ProductVariant,
        quantity = 1,
        priceOverride?: number,
        isFlashSale?: boolean
      ) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((i) => i.variantId === variant.id);

        const finalPrice = priceOverride !== undefined ? priceOverride : variant.price;
        let newItems: CartItem[];
        if (existingIndex > -1) {
          newItems = currentItems.map((item, idx) =>
            idx === existingIndex
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  unitPrice: finalPrice,
                  price: finalPrice,
                  isFlashSale: isFlashSale ?? item.isFlashSale,
                  originalPrice: item.originalPrice ?? variant.price,
                }
              : item
          );
        } else {
          const newItem: CartItem = {
            id: `local-${variant.id}-${Date.now()}`,
            variantId: variant.id,
            quantity,
            unitPrice: finalPrice,
            price: finalPrice,
            product,
            variant,
            isFlashSale: !!isFlashSale,
            originalPrice: variant.price,
          };
          newItems = [...currentItems, newItem];
        }

        set({ items: newItems, isDrawerOpen: true });

        // Optionally sync with backend if token exists
        if (typeof localStorage !== 'undefined' && localStorage.getItem('mobilecommerce_access_token')) {
          cartService.addToCart(variant.id, quantity).catch(() => {});
        }
      },

      removeItem: (itemId: string) => {
        const itemToRemove = get().items.find((i) => i.id === itemId);
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId),
        }));

        if (itemToRemove && typeof localStorage !== 'undefined' && localStorage.getItem('mobilecommerce_access_token')) {
          cartService.removeFromCart(itemToRemove.variantId).catch(() => {});
        }
      },

      updateQuantity: (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));

        const item = get().items.find((i) => i.id === itemId);
        if (item && typeof localStorage !== 'undefined' && localStorage.getItem('mobilecommerce_access_token')) {
          cartService.updateCartItem(item.variantId, quantity).catch(() => {});
        }
      },

      clearCart: () => {
        set({ items: [], selectedItemIds: [] });
        if (typeof localStorage !== 'undefined' && localStorage.getItem('mobilecommerce_access_token')) {
          cartService.clearCart().catch(() => {});
        }
      },

      setDrawerOpen: (open: boolean) => set({ isDrawerOpen: open }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      totalAmount: () => {
        return get().items.reduce(
          (sum, item) => sum + (item.unitPrice ?? item.price ?? 0) * item.quantity,
          0
        );
      },

      totalCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      toggleSelectItem: (itemId: string) => {
        set((state) => {
          const exists = state.selectedItemIds.includes(itemId);
          return {
            selectedItemIds: exists
              ? state.selectedItemIds.filter((id) => id !== itemId)
              : [...state.selectedItemIds, itemId],
          };
        });
      },

      selectAll: () => {
        set((state) => ({
          selectedItemIds: state.items.map((i) => i.id),
        }));
      },

      deselectAll: () => {
        set({ selectedItemIds: [] });
      },

      removeSelectedItems: () => {
        const selected = get().selectedItemIds;
        if (selected.length === 0) return;
        const remainingItems = get().items.filter((i) => !selected.includes(i.id));
        set({ items: remainingItems, selectedItemIds: [] });

        if (typeof localStorage !== 'undefined' && localStorage.getItem('mobilecommerce_access_token')) {
          cartService.removeBulk(selected).catch(() => {});
        }
      },

      selectedItems: () => {
        const ids = new Set(get().selectedItemIds);
        return get().items.filter((i) => ids.has(i.id));
      },

      selectedSubtotal: () => {
        return get()
          .selectedItems()
          .reduce((sum, item) => sum + (item.unitPrice ?? item.price ?? 0) * item.quantity, 0);
      },

      selectedTotalCount: () => {
        return get().selectedItems().reduce((sum, item) => sum + item.quantity, 0);
      },

      isAllSelected: () => {
        const { items, selectedItemIds } = get();
        return items.length > 0 && items.every((i) => selectedItemIds.includes(i.id));
      },
    }),
    {
      name: 'mobilecommerce_cart_storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
