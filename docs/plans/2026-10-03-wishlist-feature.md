# Kế hoạch Triển khai: Tính năng Sản phẩm Yêu thích (Wishlist Feature)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện toàn diện tính năng Danh sách Yêu thích (Wishlist) cho cả Backend và Frontend: làm giàu dữ liệu sản phẩm, bổ sung nút Trái tim trên ProductCard và PDP, hiển thị badge số lượng trên Navbar, xây dựng trang `/wishlist` chuyên dụng và hỗ trợ chuyển sản phẩm sang giỏ hàng.

**Architecture:**
- Backend: Cập nhật Prisma query trong `WishlistService` để eager-load `brand`, `category`, và `variants` (active + inventory), đồng thời cung cấp unit test đầy đủ cho service.
- Frontend Core: Bổ sung TypeScript interfaces, `wishlistService`, và Zustand store `useWishlistStore` với $O(1)$ item lookup và Optimistic UI update.
- UI Touchpoints: Nút Trái tim tròn trên `ProductCard` (chặn nổi bọt, yêu cầu đăng nhập đối với khách), nút Trái tim nổi bật trên `ProductDetailPage`.
- Navigation & View: Thêm Heart badge counter trên `Navbar`, tạo trang `/wishlist` với responsive grid, Empty State, Skeleton loader, và tính năng "Chuyển vào giỏ" (`move-to-cart`).

**Tech Stack:** NestJS 11, Prisma ORM, PostgreSQL, React 19, TypeScript, Tailwind CSS v4, Zustand, Lucide React, Ant Design (message/confirm).

---

## Cấu trúc Tệp & Phân chia Luồng Thực thi (Streams Map)

```
backend/
├── src/modules/wishlist/
│   └── wishlist.service.ts                     [Stream A - Backend Service Enrichment]
└── test/unit/
    └── wishlist.spec.ts                        [Stream A - Backend Unit Test]

frontend/
├── src/types/
│   └── index.ts                                [Stream A - Frontend Types]
├── src/services/
│   └── wishlistService.ts                      [Stream A - Frontend Service]
├── src/stores/
│   └── useWishlistStore.ts                     [Stream A - Zustand State Store]
├── src/components/storefront/
│   └── ProductCard.tsx                         [Stream B - Card Heart Button]
├── src/pages/storefront/ProductDetail/
│   └── ProductDetailPage.tsx                  [Stream B - PDP Heart Action]
├── src/components/common/
│   └── Navbar.tsx                              [Stream C - Navbar Heart & Badge]
├── src/pages/storefront/Wishlist/
│   └── WishlistPage.tsx                        [Stream C - Dedicated Wishlist View]
└── src/routes/
    └── AppRoutes.tsx                           [Stream C - Route Registration]
```

### Các Luồng Thực thi Song song (Parallel Streams):
- **Stream A (Nền tảng Backend & State Store)**: Thực hiện Task 1 và Task 2 trước làm nền tảng.
- **Stream B (Tương tác Sản phẩm Storefront)**: Task 3 và Task 4 (ProductCard và PDP) có thể chạy song song độc lập.
- **Stream C (Điều hướng & Trang Wishlist)**: Task 5 và Task 6 (Navbar và WishlistPage) có thể chạy song song với Stream B.
- **Stream D (Kiểm thử Tổng thể & Build)**: Task 7 hợp nhất và kiểm tra toàn bộ.

---

### Task 1: Backend Wishlist Data Enrichment & Unit Tests (Stream A)

**Files:**
- Modify: `backend/src/modules/wishlist/wishlist.service.ts`
- Test: `backend/test/unit/wishlist.spec.ts`

- [ ] **Step 1: Viết Unit Test kiểm tra Eager Loading và Move to Cart**

Tạo file `backend/test/unit/wishlist.spec.ts`:
```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { WishlistService } from '../../src/modules/wishlist/wishlist.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('WishlistService Unit Tests', () => {
  let service: WishlistService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      wishlist: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      wishlistItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      productVariant: {
        findFirst: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn(),
      },
      cart: {
        upsert: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new WishlistService(mockPrisma as any);
  });

  describe('getWishlist', () => {
    it('should query wishlist with enriched product relations', async () => {
      const mockResult = {
        id: 'w-1',
        userId: 'u-1',
        items: [
          {
            id: 'wi-1',
            productId: 'p-1',
            product: {
              id: 'p-1',
              name: 'iPhone 16 Pro Max',
              brand: { name: 'Apple' },
              variants: [{ id: 'v-1', price: 34990000, isActive: true, inventory: { availableQty: 10 } }],
            },
          },
        ],
      };

      mockPrisma.wishlist.findUnique.mockResolvedValue(mockResult);

      const result = await service.getWishlist('u-1');

      expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u-1' },
          include: expect.objectContaining({
            items: expect.objectContaining({
              include: expect.objectContaining({
                product: expect.objectContaining({
                  include: expect.objectContaining({
                    brand: true,
                    category: true,
                  }),
                }),
              }),
            }),
          }),
        }),
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('addProduct', () => {
    it('should throw ConflictException if product already in wishlist', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1', userId: 'u-1' });
      mockPrisma.wishlistItem.findUnique.mockResolvedValue({ id: 'wi-1' });

      await expect(service.addProduct('u-1', { productId: 'p-1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('moveToCart', () => {
    it('should throw NotFoundException if item is not in wishlist', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1', userId: 'u-1' });
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(null);

      await expect(service.moveToCart('u-1', 'p-1')).rejects.toThrow(NotFoundException);
    });

    it('should successfully add active variant to cart and remove from wishlist', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1', userId: 'u-1' });
      mockPrisma.wishlistItem.findUnique.mockResolvedValue({ id: 'wi-1', wishlistId: 'w-1', productId: 'p-1' });
      mockPrisma.productVariant.findFirst.mockResolvedValue({ id: 'v-1', productId: 'p-1', price: 30000000 });
      mockPrisma.inventory.findUnique.mockResolvedValue({ variantId: 'v-1', availableQty: 5 });
      mockPrisma.cart.upsert.mockResolvedValue({ id: 'c-1', userId: 'u-1' });
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue({ id: 'ci-1' });
      mockPrisma.wishlistItem.delete.mockResolvedValue({ id: 'wi-1' });

      const res = await service.moveToCart('u-1', 'p-1');

      expect(res).toEqual({ success: true, message: 'Product moved to cart' });
      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { cartId: 'c-1', variantId: 'v-1', quantity: 1, unitPrice: 30000000 },
        }),
      );
      expect(mockPrisma.wishlistItem.delete).toHaveBeenCalledWith({ where: { id: 'wi-1' } });
    });
  });
});
```

- [ ] **Step 2: Chạy kiểm thử để xác minh thất bại ban đầu**

Chạy command:
```bash
npm --prefix backend test backend/test/unit/wishlist.spec.ts
```
Kỳ vọng: Test fail vì Prisma query trong `wishlist.service.ts` chưa include `brand` và `category`.

- [ ] **Step 3: Cập nhật `backend/src/modules/wishlist/wishlist.service.ts`**

Chỉnh sửa hàm `getOrCreateWishlist` và `addProduct` trong `backend/src/modules/wishlist/wishlist.service.ts`:
```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToWishlistDto } from './dto/wishlist.dto';

const WISHLIST_INCLUDE = {
  items: {
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          variants: {
            where: { isActive: true },
            include: { inventory: true },
            orderBy: { price: 'asc' as const },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: WISHLIST_INCLUDE,
    });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
        include: WISHLIST_INCLUDE,
      });
    }
    return wishlist;
  }

  async getWishlist(userId: string) {
    return this.getOrCreateWishlist(userId);
  }

  async addProduct(userId: string, dto: AddToWishlistDto) {
    const wishlist = await this.getOrCreateWishlist(userId);

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: dto.productId } },
    });
    if (existing) throw new ConflictException('Product already in wishlist');

    return this.prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId: dto.productId },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
            variants: {
              where: { isActive: true },
              include: { inventory: true },
              orderBy: { price: 'asc' as const },
            },
          },
        },
      },
    });
  }

  async removeProduct(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (!item) throw new NotFoundException('Product not in wishlist');
    return this.prisma.wishlistItem.delete({ where: { id: item.id } });
  }

  async clearWishlist(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
    return { success: true };
  }

  async checkProduct(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    return { inWishlist: !!item };
  }

  async moveToCart(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (!item) throw new NotFoundException('Product not in wishlist');

    // Find default active variant
    const variant = await this.prisma.productVariant.findFirst({
      where: { productId, isActive: true },
    });
    if (!variant) throw new BadRequestException('No active variant available');

    // Check stock
    const inventory = await this.prisma.inventory.findUnique({ where: { variantId: variant.id } });
    if (!inventory || inventory.availableQty < 1) {
      throw new BadRequestException('Variant is out of stock');
    }

    // Add to cart
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    });

    if (existingCartItem) {
      await this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: { increment: 1 } },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, variantId: variant.id, quantity: 1, unitPrice: variant.price },
      });
    }

    // Remove from wishlist
    await this.prisma.wishlistItem.delete({ where: { id: item.id } });

    return { success: true, message: 'Product moved to cart' };
  }
}
```

- [ ] **Step 4: Chạy lại Unit Test để xác nhận Pass**

Chạy command:
```bash
npm --prefix backend test backend/test/unit/wishlist.spec.ts
```
Kỳ vọng: Toàn bộ 4 test case đều PASS.

- [ ] **Step 5: Commit thay đổi**

```bash
git add backend/src/modules/wishlist/wishlist.service.ts backend/test/unit/wishlist.spec.ts
git commit -m "feat(backend): enrich wishlist products with brand and variants relations"
```

---

### Task 2: Frontend Types, Wishlist Service & Zustand Store (Stream A)

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/wishlistService.ts`
- Create: `frontend/src/stores/useWishlistStore.ts`

- [ ] **Step 1: Khai báo Types cho Wishlist trong `frontend/src/types/index.ts`**

Bổ sung vào cuối file `frontend/src/types/index.ts`:
```typescript
export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  createdAt: string;
  product: Product;
}

export interface WishlistResponse {
  id: string;
  userId: string;
  items: WishlistItem[];
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Tạo `frontend/src/services/wishlistService.ts`**

```typescript
import { apiClient } from './apiClient';
import type { WishlistResponse, WishlistItem } from '../types';

export const wishlistService = {
  async getWishlist(): Promise<WishlistResponse> {
    const response = await apiClient.get('/wishlist');
    return response.data?.data ?? response.data;
  },

  async addToWishlist(productId: string): Promise<WishlistItem> {
    const response = await apiClient.post('/wishlist/items', { productId });
    return response.data?.data ?? response.data;
  },

  async removeFromWishlist(productId: string): Promise<void> {
    await apiClient.delete(`/wishlist/items/${productId}`);
  },

  async clearWishlist(): Promise<{ success: boolean }> {
    const response = await apiClient.delete('/wishlist/clear');
    return response.data?.data ?? response.data;
  },

  async checkProduct(productId: string): Promise<{ inWishlist: boolean }> {
    const response = await apiClient.get(`/wishlist/check/${productId}`);
    return response.data?.data ?? response.data;
  },

  async moveToCart(productId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/wishlist/items/${productId}/move-to-cart`);
    return response.data?.data ?? response.data;
  },
};
```

- [ ] **Step 3: Tạo `frontend/src/stores/useWishlistStore.ts`**

```typescript
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
  toggleWishlist: (product: Product) => Promise<boolean>;
  removeItem: (productId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  moveToCart: (productId: string) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
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
      set({ items: prevItems, itemIds: prevItemIds });
      throw err;
    }
  },

  moveToCart: async (productId: string) => {
    try {
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
    } catch (err) {
      throw err;
    }
  },

  clearState: () => {
    set({ items: [], itemIds: [], isLoading: false, error: null });
  },
}));
```

- [ ] **Step 4: Kiểm tra build TypeScript Frontend**

Chạy command:
```bash
npm --prefix frontend run build
```
Kỳ vọng: Không có lỗi biên dịch type hoặc import.

- [ ] **Step 5: Commit thay đổi**

```bash
git add frontend/src/types/index.ts frontend/src/services/wishlistService.ts frontend/src/stores/useWishlistStore.ts
git commit -m "feat(storefront): implement wishlist service and zustand store"
```

---

### Task 3: ProductCard Wishlist Heart Button Integration (Stream B)

**Files:**
- Modify: `frontend/src/components/storefront/ProductCard.tsx`

- [ ] **Step 1: Cập nhật `ProductCard.tsx` bổ sung nút Trái tim**

1. Import `Heart` từ `lucide-react`.
2. Import `useWishlistStore` từ `../../stores/useWishlistStore`.
3. Import `useNavigate, useLocation` từ `react-router-dom`.
4. Import `message` từ `antd`.
5. Tạo handler `handleToggleWishlist(e: React.MouseEvent)`:
   - `e.preventDefault()`, `e.stopPropagation()`.
   - Kiểm tra `localStorage.getItem('mobilecommerce_access_token')`.
   - Nếu chưa đăng nhập:
     `message.warning('Vui lòng đăng nhập để lưu sản phẩm yêu thích!');`
     `navigate('/login', { state: { from: location.pathname } });`
     return.
   - Nếu đã đăng nhập:
     gọi `toggleWishlist(product)`.
     Hiển thị `message.success(isAdded ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích')`.
6. Render nút Trái tim nổi góc trên bên phải khung ảnh:
```tsx
{/* Wishlist Floating Toggle Button */}
<button
  type="button"
  onClick={handleToggleWishlist}
  aria-label={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
  className={`absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs ring-1 ring-slate-200/80 shadow-2xs transition-all duration-200 hover:scale-110 hover:bg-white cursor-pointer active:scale-95 ${
    isFavorite ? 'text-rose-500 shadow-rose-100' : 'text-slate-400 hover:text-rose-500'
  }`}
  title={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
>
  <Heart
    className={`h-4 w-4 transition-all duration-200 ${
      isFavorite ? 'fill-rose-500 stroke-rose-500 scale-105' : 'stroke-[2.2]'
    }`}
  />
</button>
```

- [ ] **Step 2: Kiểm tra build TypeScript Frontend**

Chạy command:
```bash
npm --prefix frontend run build
```
Kỳ vọng: Build thành công không có lỗi type.

- [ ] **Step 3: Commit thay đổi**

```bash
git add frontend/src/components/storefront/ProductCard.tsx
git commit -m "feat(storefront): add wishlist heart toggle button to ProductCard"
```

---

### Task 4: ProductDetailPage Wishlist Integration (Stream B)

**Files:**
- Modify: `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`

- [ ] **Step 1: Tích hợp nút Trái tim vào `ProductDetailPage.tsx`**

1. Import `Heart` từ `lucide-react`.
2. Import `useWishlistStore` từ `../../../stores/useWishlistStore`.
3. Import `message` từ `antd`.
4. Lấy trạng thái `isInWishlist(product.id)` và hàm `toggleWishlist`.
5. Tạo handler `handleWishlistToggle`:
   - Nếu chưa có token: Thông báo và điều hướng sang `/login`.
   - Nếu có token: Gọi `toggleWishlist(product)` và thông báo.
6. Đặt nút Trái tim tại 2 vị trí:
   - **Vị trí 1 (Cạnh tiêu đề / Đánh giá)**: Nút icon tròn cạnh Live Stock indicator hoặc rating:
     ```tsx
     <button
       type="button"
       onClick={handleWishlistToggle}
       className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
         isFavorite
           ? 'border-rose-200 bg-rose-50 text-rose-600'
           : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-rose-300 hover:text-rose-600'
       }`}
     >
       <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
       <span>{isFavorite ? 'Đã yêu thích' : 'Yêu thích'}</span>
     </button>
     ```
   - **Vị trí 2 (Action Bar cạnh nút Thêm giỏ hàng)**:
     Nút hình vuông/chữ nhật tinh tế nằm cạnh nút Thêm giỏ hàng, cho phép người dùng thao tác tiện lợi trên cả Desktop và Sticky Mobile bar.

- [ ] **Step 2: Kiểm tra build TypeScript Frontend**

Chạy command:
```bash
npm --prefix frontend run build
```
Kỳ vọng: Build thành công không có lỗi syntax/type.

- [ ] **Step 3: Commit thay đổi**

```bash
git add frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx
git commit -m "feat(storefront): integrate wishlist favorite action on ProductDetailPage"
```

---

### Task 5: Navbar Wishlist Badge Counter & Navigation (Stream C)

**Files:**
- Modify: `frontend/src/components/common/Navbar.tsx`

- [ ] **Step 1: Cập nhật `Navbar.tsx`**

1. Import `useWishlistStore` từ `../../stores/useWishlistStore`.
2. Lấy `items` từ `useWishlistStore`, tính `wishlistCount = items.length`.
3. Gọi `fetchWishlist()` trong `useEffect` khi có `user` hoặc token.
4. **Header Actions**: Thêm nút Icon Trái tim ngay trước nút Giỏ hàng:
   ```tsx
   {/* Wishlist Direct Link */}
   <Link
     to="/wishlist"
     className="relative p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-rose-600 rounded-xl transition cursor-pointer shadow-2xs group"
     aria-label="Sản phẩm yêu thích"
     title="Sản phẩm yêu thích"
   >
     <Heart className="w-5 h-5 group-hover:scale-105 transition-transform" />
     {wishlistCount > 0 && (
       <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-75">
         {wishlistCount}
       </span>
     )}
   </Link>
   ```
5. **User Dropdown**: Sửa thẻ `<Link to="/products">` của "Sản phẩm yêu thích" thành `<Link to="/wishlist">`, hiển thị badge số lượng sản phẩm:
   ```tsx
   <Link
     to="/wishlist"
     onClick={() => setUserDropdownOpen(false)}
     className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600"
   >
     <div className="flex items-center gap-2.5">
       <Heart className="h-4 w-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
       <span>Sản phẩm yêu thích</span>
     </div>
     <div className="flex items-center gap-1.5">
       {wishlistCount > 0 && (
         <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-600">
           {wishlistCount}
         </span>
       )}
       <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-rose-600 transition-colors" />
     </div>
   </Link>
   ```
6. **Mobile Menu**: Thêm mục dẫn tới `/wishlist` trong menu điện thoại:
   ```tsx
   <Link
     to="/wishlist"
     onClick={() => setMobileMenuOpen(false)}
     className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
   >
     <span className="flex items-center gap-2">❤️ Sản phẩm yêu thích</span>
     {wishlistCount > 0 && (
       <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
         {wishlistCount}
       </span>
     )}
   </Link>
   ```

- [ ] **Step 2: Kiểm tra build TypeScript Frontend**

Chạy command:
```bash
npm --prefix frontend run build
```
Kỳ vọng: Build thành công.

- [ ] **Step 3: Commit thay đổi**

```bash
git add frontend/src/components/common/Navbar.tsx
git commit -m "feat(storefront): add wishlist heart button with badge counter to Navbar"
```

---

### Task 6: Dedicated Wishlist Page & Protected Route Registration (Stream C)

**Files:**
- Create: `frontend/src/pages/storefront/Wishlist/WishlistPage.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Tạo `WishlistPage.tsx`**

Tạo file `frontend/src/pages/storefront/Wishlist/WishlistPage.tsx` với đầy đủ các tính năng:
- Breadcrumb: Trang chủ > Sản phẩm yêu thích.
- Tiêu đề "Danh sách yêu thích của bạn" kèm tổng số mục.
- Nút "Xóa tất cả" với popup xác nhận an toàn (`Modal.confirm` từ `antd`).
- Lưới hiển thị danh sách sản phẩm:
  - Thẻ sản phẩm với hình ảnh, thương hiệu, tên, thông số, đơn giá và giá gạch.
  - Nút "Chuyển vào giỏ" (`moveToCart`): chuyển sản phẩm vào giỏ hàng và mở `CartDrawer`.
  - Nút "Xóa khỏi danh sách" (`removeItem`).
- Empty State khi danh sách rỗng: Icon trái tim lớn, thông điệp mời gọi và nút "Khám phá điện thoại ngay" dẫn về `/products`.
- Skeleton loading khi đang tải.

- [ ] **Step 2: Đăng ký route `/wishlist` trong `frontend/src/routes/AppRoutes.tsx`**

1. Import `WishlistPage` từ `../pages/storefront/Wishlist/WishlistPage`.
2. Thêm route vào bên trong nhánh `<Route element={<StorefrontLayout />}>`:
```tsx
<Route
  path="/wishlist"
  element={
    <ProtectedRoute>
      <WishlistPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Kiểm tra build TypeScript Frontend**

Chạy command:
```bash
npm --prefix frontend run build
```
Kỳ vọng: Build thành công không có lỗi type hay route.

- [ ] **Step 4: Commit thay đổi**

```bash
git add frontend/src/pages/storefront/Wishlist/WishlistPage.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(storefront): create dedicated WishlistPage and register protected route"
```

---

### Task 7: Build Verification & Integration Smoke Testing (Stream D)

**Files:**
- Create / Run: `backend/test/wishlist_verification.ts`

- [ ] **Step 1: Viết script xác minh tích hợp backend `backend/test/wishlist_verification.ts`**

Kiểm tra trực tiếp database / Prisma Client:
- Lấy hoặc tạo user test.
- Thêm sản phẩm vào wishlist.
- Truy vấn `wishlistService.getWishlist(userId)` và xác nhận kết quả trả về có `brand`, `variants`, giá bán.
- Thử nghiệm `moveToCart` và kiểm tra sản phẩm xuất hiện trong bảng `CartItem` đồng thời biến mất khỏi `WishlistItem`.
- Dọn dẹp dữ liệu test.

- [ ] **Step 2: Chạy verification script**

Chạy command:
```bash
npx --prefix backend ts-node test/wishlist_verification.ts
```
Kỳ vọng: Toàn bộ assertions đều PASS.

- [ ] **Step 3: Chạy full build backend và frontend**

```bash
npm --prefix backend run build
npm --prefix frontend run build
```
Kỳ vọng: Cả 2 dự án build sạch, exit code 0.

- [ ] **Step 4: Commit verification script**

```bash
git add backend/test/wishlist_verification.ts
git commit -m "test(wishlist): add integration smoke verification for wishlist feature"
```
