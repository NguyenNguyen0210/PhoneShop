import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '../types';
import { cartService } from '../services/cartService';
import { notifyError, notifyWarning } from '../utils/notify';

const hasAccessToken = () =>
  typeof localStorage !== 'undefined' &&
  Boolean(localStorage.getItem('phoneshop_access_token'));

// Local items chỉ được đẩy lên backend ĐÚNG 1 lần (lúc login hoặc khi offline
// thêm rồi có mạng lại). Đẩy lại toàn bộ mỗi lần sync sẽ cộng dồn số lượng
// vì API add là cộng thêm, không phải set. Pending list theo variantId.
const PENDING_KEY = 'phoneshop_cart_pending';

const readPending = (): string[] => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const markPending = (variantId: string) => {
  if (typeof localStorage === 'undefined' || !variantId) return;
  const pending = readPending();
  if (!pending.includes(variantId)) {
    localStorage.setItem(PENDING_KEY, JSON.stringify([...pending, variantId]));
  }
};

// Mirror of markPending: drop a variant once its backend push succeeds so a
// later sync does not re-add it (the add API merges quantities).
const clearPending = (variantId: string) => {
  if (typeof localStorage === 'undefined' || !variantId) return;
  const pending = readPending().filter((v) => v !== variantId);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
};

const CART_SYNC_FAIL_MSG =
  'Không thể đồng bộ với giỏ hàng trên hệ thống. Vui lòng thử lại.';

// Single-flight guard: concurrent syncs would double-push pending items (the
// add API merges quantities) and fire duplicate /cart reads.
let syncInFlight: Promise<void> | null = null;

interface CartState {
  items: CartItem[];
  selectedItemIds: string[];

  addItem: (
    product: Product,
    variant: ProductVariant,
    quantity?: number,
    priceOverride?: number,
    isFlashSale?: boolean,
    flashQuotaLeft?: number
  ) => void;
  /** Buy-now: add/merge the variant, select ONLY it for checkout, never open any popup. */
  buyNow: (
    product: Product,
    variant: ProductVariant,
    quantity?: number,
    priceOverride?: number,
    isFlashSale?: boolean,
    flashQuotaLeft?: number
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  /** Wipe user-specific cart data + pending queue (logout / account switch). */
  resetForUserChange: () => void;
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
  reconcileWithFlashSale: (campaign: any) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedItemIds: [],

      addItem: (
        product: Product,
        variant: ProductVariant,
        quantity = 1,
        priceOverride?: number,
        isFlashSale?: boolean,
        flashQuotaLeft?: number
      ) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((i) => i.variantId === variant.id);
        const existingItem = existingIndex > -1 ? currentItems[existingIndex] : undefined;
        const existingQty = existingItem ? existingItem.quantity : 0;

        const effectiveIsFlashSale = isFlashSale ?? existingItem?.isFlashSale;
        const effectiveFlashQuotaLeft = flashQuotaLeft ?? existingItem?.flashQuotaLeft;

        // Infinity ONLY when the inventory object is absent (unknown stock);
        // availableQty === 0 is a real limit.
        const stockCap = !variant.inventory
          ? Infinity
          : Number(variant.inventory.availableQty ?? 0);
        const maxLimit = effectiveIsFlashSale
          ? Math.min(effectiveFlashQuotaLeft ?? stockCap, stockCap)
          : stockCap;

        if (maxLimit === 0) {
          notifyWarning('Sản phẩm hiện đã hết hàng.');
          return;
        }

        let qty = quantity;
        if (maxLimit !== Infinity) {
          const allowed = Math.max(0, maxLimit - existingQty);
          if (allowed < qty) {
            if (effectiveIsFlashSale) {
              notifyWarning(
                `Ưu đãi Flash Sale chỉ áp dụng tối đa ${maxLimit} suất cho phiên bản này` +
                  (existingQty > 0 ? ` (giỏ đã có ${existingQty})` : '') +
                  '.'
              );
            } else {
              notifyWarning(
                `Kho chỉ còn tối đa ${maxLimit} sản phẩm khả dụng` +
                  (existingQty > 0 ? ` (giỏ đã có ${existingQty})` : '') +
                  '.'
              );
            }
          }
          qty = Math.min(qty, allowed);
          if (qty <= 0) return;
        }

        // Re-adding an item that already carries a flash price (no explicit
        // priceOverride) must keep that flash price — falling back to
        // variant.price would silently un-flash the existing line.
        const finalPrice =
          priceOverride !== undefined
            ? priceOverride
            : existingItem?.isFlashSale === true && existingItem.unitPrice
            ? existingItem.unitPrice
            : variant.price;
        let newItems: CartItem[];
        if (existingIndex > -1) {
          newItems = currentItems.map((item, idx) =>
            idx === existingIndex
              ? {
                  ...item,
                  quantity: item.quantity + qty,
                  unitPrice: finalPrice,
                  price: finalPrice,
                  isFlashSale: effectiveIsFlashSale,
                  flashQuotaLeft: effectiveIsFlashSale
                    ? (flashQuotaLeft ?? item.flashQuotaLeft)
                    : undefined,
                  originalPrice: item.originalPrice ?? variant.price,
                }
              : item
          );
        } else {
          const newItem: CartItem = {
            id: `local-${variant.id}-${Date.now()}`,
            variantId: variant.id,
            quantity: qty,
            unitPrice: finalPrice,
            price: finalPrice,
            product,
            variant,
            isFlashSale: !!isFlashSale,
            flashQuotaLeft: isFlashSale ? flashQuotaLeft : undefined,
            originalPrice: variant.price,
          };
          newItems = [...currentItems, newItem];
        }

        set({ items: newItems });

        // Đẩy ngay khi có mạng; thất bại/offline thì đánh dấu pending để sync đẩy 1 lần.
        if (hasAccessToken()) {
          cartService
            .addToCart(variant.id, qty)
            .then(() => clearPending(variant.id))
            .catch(() => markPending(variant.id));
        } else {
          markPending(variant.id);
        }
      },

      buyNow: (
        product: Product,
        variant: ProductVariant,
        quantity = 1,
        priceOverride?: number,
        isFlashSale?: boolean,
        flashQuotaLeft?: number
      ) => {
        const currentItems = get().items;
        const existing = currentItems.find((i) => i.variantId === variant.id);
        const existingQty = existing ? existing.quantity : 0;

        const effectiveIsFlashSale = isFlashSale ?? existing?.isFlashSale;
        const effectiveFlashQuotaLeft = flashQuotaLeft ?? existing?.flashQuotaLeft;

        // Infinity ONLY when the inventory object is absent (unknown stock);
        // availableQty === 0 is a real limit.
        const stockCap = !variant.inventory
          ? Infinity
          : Number(variant.inventory.availableQty ?? 0);
        const maxLimit = effectiveIsFlashSale
          ? Math.min(effectiveFlashQuotaLeft ?? stockCap, stockCap)
          : stockCap;

        if (maxLimit === 0) {
          notifyWarning('Sản phẩm hiện đã hết hàng.');
          return;
        }

        let qty = quantity;
        if (maxLimit !== Infinity) {
          const allowed = Math.max(0, maxLimit - existingQty);
          if (allowed < qty) {
            if (effectiveIsFlashSale) {
              notifyWarning(
                `Ưu đãi Flash Sale chỉ áp dụng tối đa ${maxLimit} suất cho phiên bản này` +
                  (existingQty > 0 ? ` (giỏ đã có ${existingQty})` : '') +
                  '.'
              );
            } else {
              notifyWarning(
                `Kho chỉ còn tối đa ${maxLimit} sản phẩm khả dụng` +
                  (existingQty > 0 ? ` (giỏ đã có ${existingQty})` : '') +
                  '.'
              );
            }
          }
          qty = Math.min(qty, allowed);
          if (qty <= 0) return;
        }

        // Same re-price rule as addItem: keep an existing flash unitPrice.
        const finalPrice =
          priceOverride !== undefined
            ? priceOverride
            : existing?.isFlashSale === true && existing.unitPrice
            ? existing.unitPrice
            : variant.price;
        let targetId: string;
        let newItems: CartItem[];
        if (existing) {
          targetId = existing.id;
          newItems = currentItems.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  quantity: item.quantity + qty,
                  unitPrice: finalPrice,
                  price: finalPrice,
                  isFlashSale: effectiveIsFlashSale,
                  flashQuotaLeft: effectiveIsFlashSale
                    ? (flashQuotaLeft ?? item.flashQuotaLeft)
                    : undefined,
                  originalPrice: item.originalPrice ?? variant.price,
                }
              : item
          );
        } else {
          targetId = `local-${variant.id}-${Date.now()}`;
          newItems = [
            ...currentItems,
            {
              id: targetId,
              variantId: variant.id,
              quantity: qty,
              unitPrice: finalPrice,
              price: finalPrice,
              product,
              variant,
              isFlashSale: !!isFlashSale,
              flashQuotaLeft: isFlashSale ? flashQuotaLeft : undefined,
              originalPrice: variant.price,
            },
          ];
        }

        // Checkout only proceeds with selected items — select just this one
        // so /checkout never bounces to /cart on an empty selection.
        set({ items: newItems, selectedItemIds: [targetId] });

        if (hasAccessToken()) {
          cartService
            .addToCart(variant.id, qty)
            .then(() => clearPending(variant.id))
            .catch(() => markPending(variant.id));
        } else {
          markPending(variant.id);
        }
      },

      removeItem: (itemId: string) => {
        const itemToRemove = get().items.find((i) => i.id === itemId);
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId),
        }));

        if (itemToRemove && hasAccessToken()) {
          cartService
            .removeFromCart(itemToRemove.variantId)
            .catch(() => notifyWarning(CART_SYNC_FAIL_MSG));
        }
      },

      updateQuantity: (itemId: string, quantity: number) => {
        const item = get().items.find((i) => i.id === itemId);
        if (!item) return;

        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        const inventory = item.variant?.inventory;
        const stockCap = !inventory ? Infinity : Number(inventory.availableQty ?? 0);
        const maxLimit = item.isFlashSale
          ? Math.min(item.flashQuotaLeft ?? stockCap, stockCap)
          : stockCap;

        if (maxLimit === 0) {
          notifyWarning('Sản phẩm hiện đã hết hàng.');
          return;
        }

        if (quantity > maxLimit) {
          if (item.isFlashSale) {
            notifyWarning(`Ưu đãi Flash Sale chỉ áp dụng tối đa ${maxLimit} suất cho phiên bản này.`);
          } else {
            notifyWarning(`Kho chỉ còn tối đa ${maxLimit} sản phẩm khả dụng.`);
          }
          return;
        }

        const previousQty = item.quantity;
        // The quantity THIS request is setting — used to detect whether a later
        // failure may still roll back (a newer change must win).
        const targetQty = quantity;
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        }));

        if (item && hasAccessToken()) {
          cartService.updateCartItem(item.variantId, quantity).catch((err) => {
            // Only restore when the current quantity is still what THIS request
            // set — otherwise a newer update already superseded it.
            if (get().items.find((i) => i.id === itemId)?.quantity === targetQty) {
              set((state) => ({
                items: state.items.map((i) =>
                  i.id === itemId ? { ...i, quantity: previousQty } : i
                ),
              }));
            }
            notifyError(err, 'Số lượng trong kho không đủ để đáp ứng.');
          });
        }
      },

      clearCart: () => {
        set({ items: [], selectedItemIds: [] });
        if (hasAccessToken()) {
          cartService.clearCart().catch(() => notifyWarning(CART_SYNC_FAIL_MSG));
        }
      },

      resetForUserChange: () => {
        set({ items: [], selectedItemIds: [] });
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(PENDING_KEY);
          // Persist middleware rewrites on every set — drop user A's persisted
          // cart, then re-set the empty state so storage ends up empty/clean.
          localStorage.removeItem('phoneshop_cart_storage');
          set({ items: [], selectedItemIds: [] });
        }
      },

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
        // Backend bulk delete OR-matches cart item id or variantId — send
        // variantIds so locally-created items (which have no backend id yet)
        // are removed as well.
        const selectedVariantIds = get()
          .items.filter((i) => selected.includes(i.id))
          .map((i) => i.variantId);
        const remainingItems = get().items.filter((i) => !selected.includes(i.id));
        set({ items: remainingItems, selectedItemIds: [] });

        if (selectedVariantIds.length > 0 && hasAccessToken()) {
          cartService.removeBulk(selectedVariantIds).catch(() => notifyWarning(CART_SYNC_FAIL_MSG));
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

      syncWithBackend: () => {
        // E4: share one in-flight sync — concurrent callers re-use the same
        // promise instead of duplicating pushes and /cart reads.
        if (syncInFlight) {
          return syncInFlight;
        }
        const run = async () => {
          if (!hasAccessToken()) {
            return;
          }
          try {
            // Chỉ đẩy những variant còn pending, mỗi variant đúng 1 lần.
            const failed: string[] = [];
            for (const variantId of readPending()) {
              const item = get().items.find((i) => i.variantId === variantId);
              if (!item) continue;
              try {
                await cartService.addToCart(variantId, item.quantity);
              } catch {
                failed.push(variantId);
              }
            }
            localStorage.setItem(PENDING_KEY, JSON.stringify(failed));
            const backendCart = await cartService.getCart();
            if (backendCart && Array.isArray(backendCart.items)) {
              const prevItems = get().items;
              const mappedItems: CartItem[] = backendCart.items.map((bItem: any) => {
                const existing = prevItems.find((i) => i.variantId === bItem.variantId);
                const isFlashSale = bItem.isFlashSale ?? existing?.isFlashSale ?? false;
                const flashQuotaLeft = bItem.flashQuotaLeft ?? existing?.flashQuotaLeft;
                const originalPrice = Number(
                  bItem.originalPrice || bItem.variant?.price || existing?.originalPrice || 0
                );
                const unitPrice = Number(
                  bItem.unitPrice ||
                    bItem.price ||
                    (isFlashSale && existing?.unitPrice ? existing.unitPrice : undefined) ||
                    bItem.variant?.price ||
                    0
                );
                return {
                  id: bItem.id,
                  variantId: bItem.variantId,
                  quantity: bItem.quantity,
                  unitPrice,
                  price: unitPrice,
                  product: bItem.variant?.product || existing?.product,
                  variant: bItem.variant || existing?.variant,
                  originalPrice,
                  isFlashSale,
                  flashQuotaLeft,
                };
              });

              const prevSelectedSet = new Set(get().selectedItemIds);
              const prevSelectedVariantIds = new Set(
                prevItems
                  .filter((i) => prevSelectedSet.has(i.id) || prevSelectedSet.has(i.variantId))
                  .map((i) => i.variantId)
              );
              const preservedSelectedIds = mappedItems
                .filter(
                  (i) => prevSelectedVariantIds.has(i.variantId) || prevSelectedSet.has(i.id)
                )
                .map((i) => i.id);

              set({
                items: mappedItems,
                // E14: stale local ids no longer match the fresh backend items —
                // an empty selection is safer than invisible "selected" items.
                selectedItemIds: preservedSelectedIds.length > 0 ? preservedSelectedIds : [],
              });
            }
          } catch {
            // Keep local state on network error
          }
        };
        syncInFlight = run().finally(() => {
          syncInFlight = null;
        });
        return syncInFlight;
      },

      reconcileWithFlashSale: (campaign: any) => {
        const currentItems = get().items;
        if (!currentItems || currentItems.length === 0) return;

        const isCampaignActive = Boolean(
          campaign && campaign.isActive !== false && Array.isArray(campaign.items)
        );

        let changed = false;
        const newItems = currentItems.map((item) => {
          const flashItem = isCampaignActive
            ? campaign.items.find((fi: any) => fi.variantId === item.variantId)
            : null;
          const quotaLeft = flashItem
            ? Math.max(0, Number(flashItem.stockLimit || 0) - Number(flashItem.soldCount || 0))
            : 0;

          if (flashItem && quotaLeft > 0) {
            const flashPrice = Number(flashItem.flashPrice);
            const origPrice = Number(
              item.originalPrice || item.variant?.price || item.unitPrice || flashPrice
            );
            if (
              item.unitPrice !== flashPrice ||
              item.isFlashSale !== true ||
              item.flashQuotaLeft !== quotaLeft ||
              item.originalPrice !== origPrice
            ) {
              changed = true;
              return {
                ...item,
                unitPrice: flashPrice,
                price: flashPrice,
                isFlashSale: true,
                flashQuotaLeft: quotaLeft,
                originalPrice: origPrice,
              };
            }
          } else if (item.isFlashSale) {
            const normalPrice = Number(
              item.originalPrice || item.variant?.price || item.unitPrice || 0
            );
            changed = true;
            return {
              ...item,
              unitPrice: normalPrice,
              price: normalPrice,
              isFlashSale: false,
              flashQuotaLeft: undefined,
              originalPrice: normalPrice,
            };
          }
          return item;
        });

        if (changed) {
          set({ items: newItems });
        }
      },
    }),
    {
      name: 'phoneshop_cart_storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
