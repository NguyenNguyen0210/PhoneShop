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
// Ignore server snapshots fetched before the user modified the local cart.
let cartRevision = 0;

// Checkout must not race with an earlier fire-and-forget add/update/delete.
// In particular, POST /cart/items increments quantity rather than replacing it.
const pendingCartWrites = new Set<Promise<unknown>>();
// Keep cart writes in user-action order. Otherwise a PATCH/DELETE can arrive
// before the POST that created a row, or an older PATCH can overwrite a newer
// quantity. Guard queued writes against logout/account changes as well.
let cartWriteTail: Promise<void> = Promise.resolve();
const cartToken = () => localStorage.getItem('phoneshop_access_token');
// Access tokens rotate during refresh; a user's cart session does not.
// Use the authenticated principal plus a local logout/account-reset epoch.
let cartSessionEpoch = 0;
const cartPrincipal = (): string | null => {
  try {
    const user = JSON.parse(localStorage.getItem('phoneshop_user') || 'null');
    return user?.id ?? user?.email ?? null;
  } catch {
    return null;
  }
};
const captureCartSession = () => ({ principal: cartPrincipal(), epoch: cartSessionEpoch });
const isCurrentCartSession = (session: ReturnType<typeof captureCartSession>) =>
  Boolean(cartToken()) &&
  session.principal === cartPrincipal() &&
  session.epoch === cartSessionEpoch;
const trackCartWrite = <T>(write: () => Promise<T>): Promise<T> => {
  const session = captureCartSession();
  const request = cartWriteTail.then(() => {
    if (!isCurrentCartSession(session)) {
      throw new Error('Cart session changed before write');
    }
    return write();
  });
  cartWriteTail = request.then(() => {}, () => {});
  pendingCartWrites.add(request);
  void request.then(
    () => pendingCartWrites.delete(request),
    () => pendingCartWrites.delete(request),
  );
  return request;
};

const persistAddedQuantity = (variantId: string, quantity: number) => {
  const session = captureCartSession();
  // A later successful add does not repair an earlier failed add. Keep any
  // existing pending marker until a sync sets the absolute local quantity.
  trackCartWrite(() => cartService.addToCart(variantId, quantity))
    .catch(() => { if (isCurrentCartSession(session)) markPending(variantId); });
};

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
  /** Checkout already removed purchased rows on the server; only clear local state. */
  removeCheckedOutItems: () => void;
  selectedItems: () => CartItem[];
  selectedSubtotal: () => number;
  selectedTotalCount: () => number;
  isAllSelected: () => boolean;
  syncWithBackend: () => Promise<void>;
  waitForCartWrites: () => Promise<void>;
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
        cartRevision++;

        // Đẩy ngay khi có mạng; thất bại/offline thì đánh dấu pending để sync đẩy 1 lần.
        if (hasAccessToken()) {
          persistAddedQuantity(variant.id, qty);
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
        cartRevision++;

        if (hasAccessToken()) {
          persistAddedQuantity(variant.id, qty);
        } else {
          markPending(variant.id);
        }
      },

      removeItem: (itemId: string) => {
        const itemToRemove = get().items.find((i) => i.id === itemId);
        cartRevision++;
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId),
        }));

        if (itemToRemove) clearPending(itemToRemove.variantId);

        if (itemToRemove && hasAccessToken()) {
          const session = captureCartSession();
          trackCartWrite(() => cartService.removeFromCart(itemToRemove.variantId))
            .catch(() => { if (isCurrentCartSession(session)) notifyWarning(CART_SYNC_FAIL_MSG); });
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
        cartRevision++;
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        }));

        if (item && hasAccessToken()) {
          const session = captureCartSession();
          trackCartWrite(() => cartService.updateCartItem(item.variantId, quantity)).catch((err) => {
            if (!isCurrentCartSession(session)) return;
            // A prior add may have failed, or a network request may have
            // reached the server without a response. Keep the intended local
            // quantity for the next absolute-quantity sync instead of losing it.
            if (readPending().includes(item.variantId) || !err?.response || err.response.status === 404) {
              markPending(item.variantId);
              notifyWarning(CART_SYNC_FAIL_MSG);
              return;
            }
            // Only restore when the current quantity is still what THIS request
            // set — otherwise a newer update already superseded it.
            if (get().items.find((i) => i.id === itemId)?.quantity === targetQty) {
              cartRevision++;
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
        cartRevision++;
        set({ items: [], selectedItemIds: [] });
        if (typeof localStorage !== 'undefined') localStorage.removeItem(PENDING_KEY);
        if (hasAccessToken()) {
          const session = captureCartSession();
          trackCartWrite(() => cartService.clearCart())
            .catch(() => { if (isCurrentCartSession(session)) notifyWarning(CART_SYNC_FAIL_MSG); });
        }
      },

      resetForUserChange: () => {
        cartSessionEpoch++;
        cartRevision++;
        // A new account must not inherit an old account's in-flight sync.
        syncInFlight = null;
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
        get().removeCheckedOutItems();

        if (selectedVariantIds.length > 0 && hasAccessToken()) {
          const session = captureCartSession();
          trackCartWrite(() => cartService.removeBulk(selectedVariantIds))
            .catch(() => { if (isCurrentCartSession(session)) notifyWarning(CART_SYNC_FAIL_MSG); });
        }
      },

      removeCheckedOutItems: () => {
        const selected = new Set(get().selectedItemIds);
        if (selected.size === 0) return;
        cartRevision++;
        const purchased = get().items.filter((i) => selected.has(i.id));
        set((state) => ({
          items: state.items.filter((i) => !selected.has(i.id)),
          selectedItemIds: [],
        }));
        // Offline/pending variants must not be re-added on the next login/sync.
        purchased.forEach((i) => clearPending(i.variantId));
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

      waitForCartWrites: async () => {
        // An existing sync can also push pending offline items to the server.
        while (pendingCartWrites.size > 0 || syncInFlight) {
          await Promise.allSettled([
            ...pendingCartWrites,
            ...(syncInFlight ? [syncInFlight] : []),
          ]);
        }
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
          const session = captureCartSession();
          try {
            // Wait for earlier cart writes before taking the server snapshot.
            // Sync must not overlap a delayed add that already reached the API.
            while (pendingCartWrites.size > 0) {
              await Promise.allSettled([...pendingCartWrites]);
            }
            if (!isCurrentCartSession(session)) return;

            const initialRevision = cartRevision;
            const backendCart = await cartService.getCart();
            const backendByVariant = new Map<string, any>(
              (backendCart?.items || []).map((item: any) => [item.variantId, item]),
            );

            // A previous POST may have reached the server even if the browser
            // saw a network error. Re-POSTing would double the quantity.
            // PATCH existing rows to the locally displayed absolute quantity.
            for (const variantId of readPending()) {
              if (cartRevision !== initialRevision || !isCurrentCartSession(session)) return;
              const item = get().items.find((i) => i.variantId === variantId);
              if (!item) {
                clearPending(variantId);
                continue;
              }
              try {
                const existing = backendByVariant.get(variantId);
                if (!existing) {
                  await cartService.addToCart(variantId, item.quantity);
                } else if (existing.quantity !== item.quantity) {
                  await cartService.updateCartItem(existing.id, item.quantity);
                }
                if (cartRevision === initialRevision && isCurrentCartSession(session)) {
                  clearPending(variantId);
                }
              } catch {
                // Leave this variant pending for the next sync attempt.
              }
            }
            const freshCart = await cartService.getCart();
            if (
              freshCart && Array.isArray(freshCart.items) &&
              cartRevision === initialRevision &&
              isCurrentCartSession(session)
            ) {
              const prevItems = get().items;
              const unresolved = new Set(readPending());
              const mappedItems: CartItem[] = freshCart.items.map((bItem: any) => {
                const existing = prevItems.find((i) => i.variantId === bItem.variantId);
                // A failed push must keep the quantity the buyer selected.
                // Syncing a stale server quantity here would silently discard it.
                if (existing && unresolved.has(bItem.variantId)) {
                  return { ...existing, id: bItem.id };
                }
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

              // Pending local-only variants were not present in the server
              // response when their POST failed. Keep them for later retry.
              for (const item of prevItems) {
                if (unresolved.has(item.variantId) && !mappedItems.some((i) => i.variantId === item.variantId)) {
                  mappedItems.push(item);
                }
              }

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
        const flight = run().finally(() => {
          if (syncInFlight === flight) syncInFlight = null;
        });
        syncInFlight = flight;
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
          cartRevision++;
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
