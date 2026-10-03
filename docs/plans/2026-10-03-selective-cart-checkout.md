# Selective Cart Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Shopee/Tiki-style selective cart checkout allowing customers to select specific items in their cart for checkout, leaving unselected items intact.

**Architecture:** Client-driven selection state managed in Zustand (`useCartStore`) with default-unselected behavior, transmitting `selectedItemIds` to NestJS Backend in `CreateOrderDto`. The backend validates and processes inventory, IMEIs, pricing, and vouchers strictly on selected items inside an atomic Prisma transaction, selectively deleting only purchased items and providing a bulk-delete cart item endpoint.

**Tech Stack:** TypeScript, React, Zustand, Tailwind CSS, Lucide Icons, NestJS, Prisma ORM, PostgreSQL, Jest.

---

## Parallel Execution Strategy

The tasks are split into two parallel streams that can be implemented concurrently by independent agents:

```
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│  Track A: Backend Agent                     │    │  Track B: Frontend Agent                     │
├──────────────────────────────────────────────┤    ├──────────────────────────────────────────────┤
│  Task 1: DTOs & Bulk Delete Cart Endpoint    │    │  Task 3: Zustand Store & API Services        │
│  Task 2: Selective Checkout Order Logic      │    │  Task 4: CartPage, Drawer & Checkout UI      │
└──────────────────────┬───────────────────────┘    └──────────────────────┬───────────────────────┘
                       │                                                   │
                       └─────────────────────┬─────────────────────────────┘
                                             ▼
                       ┌──────────────────────────────────────────────┐
                       │  Track C: Integration & Verification         │
                       ├──────────────────────────────────────────────┤
                       │  Task 5: Fullstack Integration & End-to-End  │
                       └──────────────────────────────────────────────┘
```

---

## File Structure & Responsibilities

### Backend Files
- `backend/src/modules/cart/dto/cart.dto.ts`: Define `BulkDeleteCartItemsDto` with UUID array validation.
- `backend/src/modules/cart/cart.service.ts`: Implement `removeItemsBulk(userId, itemIds)`.
- `backend/src/modules/cart/cart.controller.ts`: Expose `DELETE /cart/items/bulk`.
- `backend/src/modules/orders/dto/order.dto.ts`: Add `selectedItemIds?: string[]` to `CreateOrderDto`.
- `backend/src/modules/orders/orders.service.ts`: Update `checkout` to filter `itemsToCheckout`, compute subtotal and check stock/voucher on selected items, and selectively delete purchased items.
- `backend/test/unit/cart-bulk-delete.spec.ts`: Unit tests for cart bulk deletion and IDOR protection.
- `backend/test/unit/orders-selective-checkout.spec.ts`: Unit tests for selective checkout transaction.

### Frontend Files
- `frontend/src/stores/useCartStore.ts`: Add `selectedItemIds`, selection actions (`toggleSelectItem`, `selectAll`, `deselectAll`, `removeSelectedItems`), and computed helpers (`selectedItems`, `selectedSubtotal`, `selectedTotalCount`, `isAllSelected`).
- `frontend/src/services/cartService.ts`: Add `removeBulk(itemIds: string[])`.
- `frontend/src/services/orderService.ts`: Add `selectedItemIds?: string[]` to `CheckoutPayload`.
- `frontend/src/components/storefront/CartDrawer.tsx`: Update checkout button to navigate to `/cart`.
- `frontend/src/pages/storefront/Cart/CartPage.tsx`: Add item checkboxes, "Select All", "Delete Selected", recalculate voucher & subtotal on selected items, disable checkout CTA when 0 items selected.
- `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`: Guard empty selection by redirecting to `/cart`, render only selected items, and invoke `removeSelectedItems()` upon success.
- `frontend/src/stores/__tests__/useCartStore.spec.ts`: Unit test suite for store selection logic.

---

## Track A: Backend Implementation

### Task 1: Backend DTOs & Cart Bulk Delete Endpoint

**Files:**
- Modify: `backend/src/modules/cart/dto/cart.dto.ts`
- Modify: `backend/src/modules/cart/cart.service.ts`
- Modify: `backend/src/modules/cart/cart.controller.ts`
- Create: `backend/test/unit/cart-bulk-delete.spec.ts`

- [ ] **Step 1: Write the failing unit test for Cart bulk deletion**

Create `backend/test/unit/cart-bulk-delete.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from '../../src/modules/cart/cart.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CartService - removeItemsBulk', () => {
  let service: CartService;
  let prisma: {
    cart: { findUnique: jest.Mock; create: jest.Mock };
    cartItem: { deleteMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should delete multiple items belonging to the user cart', async () => {
    const mockCart = { id: 'cart-uuid-1', userId: 'user-uuid-1', items: [] };
    prisma.cart.findUnique.mockResolvedValue(mockCart);
    prisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });

    const itemIds = ['item-uuid-1', 'item-uuid-2'];
    const result = await service.removeItemsBulk('user-uuid-1', itemIds);

    expect(prisma.cart.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-uuid-1' },
      include: expect.any(Object),
    });
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: {
        cartId: 'cart-uuid-1',
        id: { in: itemIds },
      },
    });
    expect(result).toEqual({ count: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm --prefix backend test -- test/unit/cart-bulk-delete.spec.ts
```
Expected: FAIL with "service.removeItemsBulk is not a function"

- [ ] **Step 3: Add BulkDeleteCartItemsDto in cart.dto.ts**

Edit `backend/src/modules/cart/dto/cart.dto.ts`:
```typescript
import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteCartItemsDto {
  @ApiProperty({ type: [String], description: 'List of CartItem IDs to delete' })
  @IsArray()
  @IsUUID('all', { each: true })
  itemIds: string[];
}
```

- [ ] **Step 4: Implement removeItemsBulk in cart.service.ts**

Edit `backend/src/modules/cart/cart.service.ts`:
```typescript
  async removeItemsBulk(userId: string, itemIds: string[]) {
    const cart = await this.getOrCreateCart(userId);
    return this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        id: { in: itemIds },
      },
    });
  }
```

- [ ] **Step 5: Expose DELETE /cart/items/bulk in cart.controller.ts**

Edit `backend/src/modules/cart/cart.controller.ts` to add:
```typescript
  @Delete('items/bulk')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove multiple items from cart' })
  async removeItemsBulk(
    @CurrentUser('id') userId: string,
    @Body() dto: BulkDeleteCartItemsDto,
  ) {
    return this.cartService.removeItemsBulk(userId, dto.itemIds);
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run:
```bash
npm --prefix backend test -- test/unit/cart-bulk-delete.spec.ts
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/cart/ backend/test/unit/cart-bulk-delete.spec.ts
git commit -m "feat(backend): add bulk delete cart items endpoint"
```

---

### Task 2: Backend Selective Checkout in OrdersService

**Files:**
- Modify: `backend/src/modules/orders/dto/order.dto.ts`
- Modify: `backend/src/modules/orders/orders.service.ts`
- Create: `backend/test/unit/orders-selective-checkout.spec.ts`

- [ ] **Step 1: Write unit tests for selective checkout**

Create `backend/test/unit/orders-selective-checkout.spec.ts`:
```typescript
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../../src/modules/orders/orders.service';

describe('OrdersService - Selective Checkout', () => {
  let service: OrdersService;
  let prisma: any;
  let queue: any;

  beforeEach(() => {
    prisma = {
      cart: { findUnique: jest.fn() },
      address: { findFirst: jest.fn() },
      productVariant: { findMany: jest.fn() },
      inventory: { update: jest.fn() },
      imeiDevice: { updateMany: jest.fn() },
      order: { create: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
      $queryRaw: jest.fn(),
    };
    queue = { add: jest.fn() };
    service = new OrdersService(prisma, queue);
  });

  it('should throw BadRequestException if selectedItemIds does not match any item in cart', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        { id: 'item-1', variantId: 'v-1', quantity: 1, variant: { isActive: true, inventory: { availableQty: 5 } } },
      ],
    });

    await expect(
      service.checkout('user-1', {
        addressId: 'addr-1',
        selectedItemIds: ['item-unknown'],
      } as any)
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
npm --prefix backend test -- test/unit/orders-selective-checkout.spec.ts
```
Expected: FAIL

- [ ] **Step 3: Update CreateOrderDto to support selectedItemIds**

Edit `backend/src/modules/orders/dto/order.dto.ts`:
Add:
```typescript
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty()
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({ type: [String], description: 'Selected CartItem IDs to checkout' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  selectedItemIds?: string[];
  
  // existing properties...
```

- [ ] **Step 4: Update OrdersService checkout logic**

Edit `backend/src/modules/orders/orders.service.ts`:
In `checkout(userId: string, dto: CreateOrderDto)`:
1. Filter `itemsToCheckout`:
```typescript
    let itemsToCheckout = cart.items;
    if (dto.selectedItemIds && dto.selectedItemIds.length > 0) {
      const selectedSet = new Set(dto.selectedItemIds);
      itemsToCheckout = cart.items.filter((item) => selectedSet.has(item.id));
      if (itemsToCheckout.length === 0) {
        throw new BadRequestException('None of the selected items were found in your cart');
      }
    }
```
2. Verify stock ONLY for `itemsToCheckout`:
```typescript
    for (const item of itemsToCheckout) {
      if (!item.variant.isActive) {
        throw new BadRequestException(`Variant ${item.variant.name} is not available`);
      }
      if (!item.variant.inventory || item.variant.inventory.availableQty < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.variant.name}`);
      }
    }
```
3. Inside `$transaction`:
- Refresh catalog prices and compute subtotal only on `itemsToCheckout`:
```typescript
      const variantIds = [...new Set(itemsToCheckout.map((i) => i.variantId))];
      const freshVariants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, price: true },
      });
      const priceByVariant = new Map(freshVariants.map((v) => [v.id, Number(v.price)]));
      for (const item of itemsToCheckout) {
        const fresh = priceByVariant.get(item.variantId);
        if (fresh === undefined || !item.variant.isActive) {
          throw new BadRequestException(
            `Variant ${item.variant?.name || item.variantId} is no longer available`,
          );
        }
        if (fresh !== Number(item.unitPrice)) {
          await tx.cartItem.update({
            where: { id: item.id },
            data: { unitPrice: fresh },
          });
          (item as any).unitPrice = fresh;
        }
      }
      const subtotal = itemsToCheckout.reduce(
        (acc, item) => acc + Number(item.unitPrice) * item.quantity,
        0,
      );
```
- Reserve IMEIs, inventory, and create order items using `itemsToCheckout` loop.
- In cart deletion step:
```typescript
      // Selective cart clear: delete only purchased items
      const purchasedItemIds = itemsToCheckout.map((i) => i.id);
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          id: { in: purchasedItemIds },
        },
      });
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
npm --prefix backend test -- test/unit/orders-selective-checkout.spec.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/orders/ backend/test/unit/orders-selective-checkout.spec.ts
git commit -m "feat(backend): support selective cart items checkout in orders service"
```

---

## Track B: Frontend Implementation

### Task 3: Frontend Store & API Services

**Files:**
- Modify: `frontend/src/stores/useCartStore.ts`
- Modify: `frontend/src/services/cartService.ts`
- Modify: `frontend/src/services/orderService.ts`
- Create: `frontend/src/stores/__tests__/useCartStore.spec.ts`

- [ ] **Step 1: Write store unit test for selection logic**

Create `frontend/src/stores/__tests__/useCartStore.spec.ts`:
```typescript
import { useCartStore } from '../useCartStore';

describe('useCartStore - Selection', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [
        {
          id: 'item-1',
          variantId: 'v-1',
          quantity: 2,
          price: 100000,
          product: { id: 'p-1', name: 'Product 1' } as any,
          variant: { id: 'v-1', price: 100000 } as any,
        },
        {
          id: 'item-2',
          variantId: 'v-2',
          quantity: 1,
          price: 300000,
          product: { id: 'p-2', name: 'Product 2' } as any,
          variant: { id: 'v-2', price: 300000 } as any,
        },
      ],
      selectedItemIds: [],
    });
  });

  it('should default to empty selection and compute 0 subtotal', () => {
    const state = useCartStore.getState();
    expect(state.selectedItemIds).toEqual([]);
    expect(state.selectedTotalCount()).toBe(0);
    expect(state.selectedSubtotal()).toBe(0);
    expect(state.isAllSelected()).toBe(false);
  });

  it('should toggle selection and compute correct subtotal', () => {
    useCartStore.getState().toggleSelectItem('item-1');
    expect(useCartStore.getState().selectedItemIds).toEqual(['item-1']);
    expect(useCartStore.getState().selectedTotalCount()).toBe(2);
    expect(useCartStore.getState().selectedSubtotal()).toBe(200000);

    useCartStore.getState().toggleSelectItem('item-1');
    expect(useCartStore.getState().selectedItemIds).toEqual([]);
  });

  it('should selectAll and deselectAll properly', () => {
    useCartStore.getState().selectAll();
    expect(useCartStore.getState().selectedItemIds).toEqual(['item-1', 'item-2']);
    expect(useCartStore.getState().isAllSelected()).toBe(true);
    expect(useCartStore.getState().selectedTotalCount()).toBe(3);
    expect(useCartStore.getState().selectedSubtotal()).toBe(500000);

    useCartStore.getState().deselectAll();
    expect(useCartStore.getState().selectedItemIds).toEqual([]);
    expect(useCartStore.getState().isAllSelected()).toBe(false);
  });

  it('should clean up selectedItemIds when removeItem is called', () => {
    useCartStore.getState().toggleSelectItem('item-1');
    useCartStore.getState().removeItem('item-1');
    expect(useCartStore.getState().selectedItemIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Update useCartStore.ts**

Edit `frontend/src/stores/useCartStore.ts`:
1. Expand `CartState` interface:
```typescript
interface CartState {
  items: CartItem[];
  selectedItemIds: string[];
  isDrawerOpen: boolean;

  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  totalAmount: () => number;
  totalCount: () => number;

  // New Selection actions & getters
  toggleSelectItem: (itemId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  removeSelectedItems: () => void;
  selectedItems: () => CartItem[];
  selectedSubtotal: () => number;
  selectedTotalCount: () => number;
  isAllSelected: () => boolean;
}
```
2. Implement actions and getters in store:
```typescript
      selectedItemIds: [],

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

        if (localStorage.getItem('mobilecommerce_access_token')) {
          cartService.removeBulk(selected).catch(() => {});
        }
      },

      selectedItems: () => {
        const ids = new Set(get().selectedItemIds);
        return get().items.filter((i) => ids.has(i.id));
      },

      selectedSubtotal: () => {
        return get().selectedItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      selectedTotalCount: () => {
        return get().selectedItems().reduce((sum, item) => sum + item.quantity, 0);
      },

      isAllSelected: () => {
        const { items, selectedItemIds } = get();
        return items.length > 0 && items.every((i) => selectedItemIds.includes(i.id));
      },
```
3. Update `removeItem` and `clearCart` to clean `selectedItemIds`:
```typescript
      removeItem: (itemId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId),
        }));
        // ...
      },
      clearCart: () => {
        set({ items: [], selectedItemIds: [] });
        // ...
      },
```

- [ ] **Step 3: Update cartService.ts with removeBulk**

Edit `frontend/src/services/cartService.ts` to add:
```typescript
  async removeBulk(itemIds: string[]): Promise<void> {
    await apiClient.delete('/cart/items/bulk', { data: { itemIds } });
  },
```

- [ ] **Step 4: Update orderService.ts with selectedItemIds**

Edit `frontend/src/services/orderService.ts`:
Update `CheckoutPayload`:
```typescript
export interface CheckoutPayload {
  customerName: string;
  shippingPhone: string;
  shippingAddress: string;
  notes?: string;
  paymentMethod?: PaymentMethod | string;
  installmentData?: InstallmentFormData | any;
  voucherCode?: string;
  addressId?: string;
  selectedItemIds?: string[];
}
```
And pass `selectedItemIds: payload.selectedItemIds` in `apiClient.post('/orders/checkout', ...)`:
```typescript
    const orderRes = await apiClient.post('/orders/checkout', {
      addressId: addressId || '00000000-0000-0000-0000-000000000000',
      voucherCode: payload.voucherCode || undefined,
      customerNote: payload.notes || undefined,
      paymentMethod: payload.paymentMethod,
      installmentData: payload.installmentData,
      selectedItemIds: payload.selectedItemIds,
    });
```

- [ ] **Step 5: Run store unit tests**

Run:
```bash
npm --prefix frontend test -- src/stores/__tests__/useCartStore.spec.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/stores/ frontend/src/services/
git commit -m "feat(frontend): add cart selection state, actions and api methods"
```

---

### Task 4: Frontend UI Components & Pages

**Files:**
- Modify: `frontend/src/components/storefront/CartDrawer.tsx`
- Modify: `frontend/src/pages/storefront/Cart/CartPage.tsx`
- Modify: `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`

- [ ] **Step 1: Update CartDrawer.tsx checkout redirection**

Edit `frontend/src/components/storefront/CartDrawer.tsx`:
Change `handleCheckout`:
```typescript
  const handleCheckout = () => {
    setDrawerOpen(false);
    navigate('/cart');
  };
```
And change the button label or keep it as navigating to cart.

- [ ] **Step 2: Update CartPage.tsx with checkboxes and selective actions**

Edit `frontend/src/pages/storefront/Cart/CartPage.tsx`:
1. Use selection getters & actions from `useCartStore`:
```typescript
  const {
    items,
    selectedItemIds,
    updateQuantity,
    removeItem,
    clearCart,
    toggleSelectItem,
    selectAll,
    deselectAll,
    removeSelectedItems,
    selectedItems,
    selectedSubtotal,
    selectedTotalCount,
    isAllSelected,
  } = useCartStore();
```
2. State for delete selected confirmation:
```typescript
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = useState(false);
```
3. Calculate subtotal, free shipping, and totals based on `selectedSubtotal()`:
```typescript
  const subtotal = selectedSubtotal();
  const selectedCount = selectedTotalCount();
  const isFreeShipping = subtotal > 500000 || subtotal === 0;
  const shippingFee = subtotal === 0 ? 0 : (isFreeShipping ? 0 : 30000);
  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);
```
4. In table header:
- Add "Select All" checkbox:
```tsx
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={isAllSelected()}
      onChange={(e) => {
        if (e.target.checked) selectAll();
        else deselectAll();
      }}
      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
    />
    <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
      Chọn tất cả ({items.length})
    </span>
  </label>
```
- Add "Xóa mục đã chọn (k)" button:
```tsx
  {selectedItemIds.length > 0 && (
    <button
      type="button"
      onClick={() => setShowDeleteSelectedConfirm(true)}
      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition cursor-pointer"
    >
      <Trash2 className="w-3.5 h-3.5" />
      <span>Xóa mục đã chọn ({selectedItemIds.length})</span>
    </button>
  )}
```
5. In item row:
- Place checkbox before product image:
```tsx
  <div className="flex items-center gap-3">
    <input
      type="checkbox"
      checked={selectedItemIds.includes(item.id)}
      onChange={() => toggleSelectItem(item.id)}
      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
      aria-label={`Chọn ${item.product?.name}`}
    />
    {/* Product Image & Info */}
```
6. In Summary & CTA button:
- When `selectedCount === 0`:
```tsx
  <button
    type="button"
    disabled
    className="w-full py-4 bg-slate-200 text-slate-400 font-black text-sm rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
  >
    <span>VUI LÒNG CHỌN SẢN PHẨM (0)</span>
  </button>
```
- When `selectedCount > 0`:
```tsx
  <button
    type="button"
    onClick={handleProceedCheckout}
    className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-98 group"
  >
    <span>TIẾN HÀNH ĐẶT HÀNG ({selectedCount})</span>
    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
  </button>
```

- [ ] **Step 3: Update CheckoutPage.tsx to use only selected items**

Edit `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`:
1. Destructure selection helpers:
```typescript
  const { selectedItems, selectedSubtotal, removeSelectedItems } = useCartStore();
  const checkoutItems = selectedItems();
```
2. Guard against empty selection:
```typescript
  useEffect(() => {
    if (checkoutItems.length === 0) {
      navigate('/cart');
      return;
    }
    // ...
```
3. Use `selectedSubtotal()` for subtotal calculation:
```typescript
  const subtotal = selectedSubtotal();
```
4. In `handleCheckoutSubmit`:
- Pass `selectedItemIds`:
```typescript
      const orderRes = await orderService.checkout({
        customerName,
        shippingPhone,
        shippingAddress,
        notes,
        paymentMethod,
        installmentData: paymentMethod === 'INSTALLMENT' ? installmentData : undefined,
        voucherCode: storedVoucher?.code,
        selectedItemIds: checkoutItems.map((i) => i.id),
      });
```
- In snapshot and completion cleanup:
```typescript
      // Clear ONLY selected items from cart
      removeSelectedItems();
      sessionStorage.removeItem('mobilecommerce_voucher');
```
5. In right column list of items, render `checkoutItems.map(...)`.

- [ ] **Step 4: Verify frontend build compiles without errors**

Run:
```bash
npm --prefix frontend run build
```
Expected: PASS with 0 TypeScript/Vite errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ frontend/src/components/
git commit -m "feat(frontend): integrate selective cart checkout UI in CartPage and CheckoutPage"
```

---

## Track C: Integration & Verification

### Task 5: End-to-End System Verification

**Files:**
- Test verification across fullstack

- [ ] **Step 1: Run complete backend test suite**

Run:
```bash
npm --prefix backend test
```
Expected: All unit tests pass.

- [ ] **Step 2: Run frontend build and tests**

Run:
```bash
npm --prefix frontend run build
```
Expected: Build succeeds cleanly.

- [ ] **Step 3: Commit any final integration adjustments**

```bash
git status
```
Ensure working tree is clean.
