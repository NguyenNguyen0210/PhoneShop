import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '../types';
import { cartService } from '../services/cartService';

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;

  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  totalAmount: () => number;
  totalCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      addItem: (product: Product, variant: ProductVariant, quantity = 1) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((i) => i.variantId === variant.id);

        let newItems: CartItem[];
        if (existingIndex > -1) {
          newItems = currentItems.map((item, idx) =>
            idx === existingIndex
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          const newItem: CartItem = {
            id: `local-${variant.id}-${Date.now()}`,
            variantId: variant.id,
            quantity,
            price: variant.price,
            product,
            variant,
          };
          newItems = [...currentItems, newItem];
        }

        set({ items: newItems, isDrawerOpen: true });

        // Optionally sync with backend if token exists
        if (localStorage.getItem('mobilecommerce_access_token')) {
          cartService.addToCart(variant.id, quantity).catch(() => {});
        }
      },

      removeItem: (itemId: string) => {
        const itemToRemove = get().items.find((i) => i.id === itemId);
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));

        if (itemToRemove && localStorage.getItem('mobilecommerce_access_token')) {
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
        if (item && localStorage.getItem('mobilecommerce_access_token')) {
          cartService.updateCartItem(item.variantId, quantity).catch(() => {});
        }
      },

      clearCart: () => {
        set({ items: [] });
        if (localStorage.getItem('mobilecommerce_access_token')) {
          cartService.clearCart().catch(() => {});
        }
      },

      setDrawerOpen: (open: boolean) => set({ isDrawerOpen: open }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      totalAmount: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      totalCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'mobilecommerce_cart_storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
