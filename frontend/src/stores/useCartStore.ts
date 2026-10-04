import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '../types';
import { cartService } from '../services/cartService';

const hasAccessToken = () =>
  typeof localStorage !== 'undefined' &&
  Boolean(localStorage.getItem('phoneshop_access_token'));

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
  syncWithBackend: () => Promise<void>;
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
        if (hasAccessToken()) {
          cartService.addToCart(variant.id, quantity).catch(() => {});
        }
      },

      removeItem: (itemId: string) => {
        const itemToRemove = get().items.find((i) => i.id === itemId);
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId),
        }));

        if (itemToRemove && hasAccessToken()) {
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
        if (item && hasAccessToken()) {
          cartService.updateCartItem(item.variantId, quantity).catch(() => {});
        }
      },

      clearCart: () => {
        set({ items: [], selectedItemIds: [] });
        if (hasAccessToken()) {
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

        if (hasAccessToken()) {
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

      syncWithBackend: async () => {
        if (!hasAccessToken()) {
          return;
        }
        try {
          const localItems = get().items;
          for (const item of localItems) {
            await cartService.addToCart(item.variantId, item.quantity).catch(() => {});
          }
          const backendCart = await cartService.getCart();
          if (backendCart && Array.isArray(backendCart.items) && backendCart.items.length > 0) {
            const mappedItems: CartItem[] = backendCart.items.map((bItem: any) => ({
              id: bItem.id,
              variantId: bItem.variantId,
              quantity: bItem.quantity,
              unitPrice: Number(bItem.unitPrice || bItem.price || bItem.variant?.price || 0),
              price: Number(bItem.unitPrice || bItem.price || bItem.variant?.price || 0),
              product: bItem.variant?.product,
              variant: bItem.variant,
              originalPrice: Number(bItem.variant?.price || 0),
            }));
            set({ items: mappedItems });
          }
        } catch {
          // Keep local state on network error
        }
      },
    }),
    {
      name: 'phoneshop_cart_storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
