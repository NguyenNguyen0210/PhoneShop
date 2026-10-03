import { create } from 'zustand';
import type { Product, WishlistItem } from '../types';
import { wishlistService } from '../services/wishlistService';
import { cartService } from '../services/cartService';
import { useCartStore } from './useCartStore';

interface WishlistState {
  items: WishlistItem[];
  itemIds: string[];
  isLoading: boolean;
  error: string | null;

  fetchWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<boolean>;
  removeItem: (productId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  moveToCart: (productId: string) => Promise<boolean>;
  clearState: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  itemIds: [],
  isLoading: false,
  error: null,

  isInWishlist: (productId: string) => {
    return get().itemIds.includes(productId);
  },

  fetchWishlist: async () => {
    const token = localStorage.getItem('mobilecommerce_access_token');
    if (!token) {
      set({ items: [], itemIds: [] });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const data = await wishlistService.getWishlist();
      const items = Array.isArray(data?.items) ? data.items : [];
      set({
        items,
        itemIds: items.map((i) => i.productId),
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || 'Lỗi khi tải danh sách yêu thích',
        isLoading: false,
      });
    }
  },

  toggleWishlist: async (product: Product) => {
    const token = localStorage.getItem('mobilecommerce_access_token');
    if (!token) return false;

    const { itemIds, items } = get();
    const currentlyInWishlist = itemIds.includes(product.id);

    if (currentlyInWishlist) {
      // Optimistic remove
      set({
        itemIds: itemIds.filter((id) => id !== product.id),
        items: items.filter((item) => item.productId !== product.id),
      });

      try {
        await wishlistService.removeFromWishlist(product.id);
        return false;
      } catch (err) {
        // Rollback
        set({ itemIds, items });
        throw err;
      }
    } else {
      // Optimistic add
      const tempItem: WishlistItem = {
        id: `temp-${Date.now()}`,
        wishlistId: 'current',
        productId: product.id,
        createdAt: new Date().toISOString(),
        product,
      };

      set({
        itemIds: [...itemIds, product.id],
        items: [tempItem, ...items],
      });

      try {
        const addedItem = await wishlistService.addToWishlist(product.id);
        if (addedItem && addedItem.id) {
          set((state) => ({
            items: state.items.map((i) => (i.id === tempItem.id ? addedItem : i)),
          }));
        }
        return true;
      } catch (err) {
        // Rollback
        set({ itemIds, items });
        throw err;
      }
    }
  },

  removeItem: async (productId: string) => {
    const { itemIds, items } = get();
    set({
      itemIds: itemIds.filter((id) => id !== productId),
      items: items.filter((item) => item.productId !== productId),
    });

    try {
      await wishlistService.removeFromWishlist(productId);
    } catch (err) {
      // Rollback
      set({ itemIds, items });
      throw err;
    }
  },

  clearAll: async () => {
    const prevItems = get().items;
    const prevItemIds = get().itemIds;

    set({ items: [], itemIds: [] });
    try {
      await wishlistService.clearWishlist();
    } catch (err) {
      // Rollback
      set({ items: prevItems, itemIds: prevItemIds });
      throw err;
    }
  },

  moveToCart: async (productId: string) => {
    await wishlistService.moveToCart(productId);

    // Update local wishlist state
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
      itemIds: state.itemIds.filter((id) => id !== productId),
    }));

    // Synchronize cart state with backend cart & open drawer
    try {
      const backendCart = await cartService.getCart();
      if (backendCart && Array.isArray(backendCart.items)) {
        useCartStore.setState({ items: backendCart.items, isDrawerOpen: true });
      } else {
        useCartStore.getState().setDrawerOpen(true);
      }
    } catch {
      useCartStore.getState().setDrawerOpen(true);
    }

    return true;
  },

  clearState: () => {
    set({ items: [], itemIds: [], isLoading: false, error: null });
  },
}));
