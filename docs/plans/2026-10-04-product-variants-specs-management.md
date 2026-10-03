# Product, Variants & Specifications Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện tính năng Quản lý Sản phẩm (Update Product), Quản lý Biến thể độc lập (Variants CRUD), và Quản lý Thông số kỹ thuật (Manage Specifications) trên cả Backend và Frontend.

**Architecture:** Mở rộng Backend DTO & Service để whitelist trường `specs` và xử lý an toàn CRUD biến thể; mở rộng frontend `productService`; xây dựng cụm component chuyên biệt (`ProductEditModal`, `ProductGeneralTab`, `ProductVariantsTab`, `VariantFormModal`, `ProductSpecsTab`) trên nền Ant Design 6 và tích hợp vào `AdminProductsPage`.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, TypeScript, React 19, Ant Design 6, Tailwind CSS 4, Vitest, Testing Library, Jest.

---

## File Structure Map

### Backend
- `backend/src/modules/products/dto/create-product.dto.ts` - Bổ sung `@IsOptional() @IsObject() specs?: Record<string, any>` và slug fallback logic.
- `backend/src/modules/products/products.service.ts` - Đảm bảo `create`, `update`, `updateVariant`, `removeVariant` xử lý đầy đủ specs và variant.
- `backend/test/unit/products-specs-variants.spec.ts` - Unit test kiểm tra DTO validation, CRUD variant và cập nhật specs.

### Frontend
- `frontend/src/types/index.ts` - Mở rộng kiểu dữ liệu cho Variant DTO và Product specs nếu cần.
- `frontend/src/services/productService.ts` - Thêm các hàm `updateVariant`, `deleteVariant`, `toggleVariantStatus`.
- `frontend/src/services/__tests__/productService.spec.ts` - Unit test cho các phương thức mới của `productService`.
- `frontend/src/pages/Admin/Products/components/ProductSpecsTab.tsx` - Tab 3: Form nhập thông số kỹ thuật (Preset di động + Dynamic key-value).
- `frontend/src/pages/Admin/Products/components/__tests__/ProductSpecsTab.spec.tsx` - Unit test cho `ProductSpecsTab`.
- `frontend/src/pages/Admin/Products/components/VariantFormModal.tsx` - Modal con thêm mới hoặc chỉnh sửa 1 biến thể sản phẩm.
- `frontend/src/pages/Admin/Products/components/__tests__/VariantFormModal.spec.tsx` - Unit test cho `VariantFormModal`.
- `frontend/src/pages/Admin/Products/components/ProductVariantsTab.tsx` - Tab 2: Danh sách biến thể, bật/tắt active, xóa biến thể.
- `frontend/src/pages/Admin/Products/components/__tests__/ProductVariantsTab.spec.tsx` - Unit test cho `ProductVariantsTab`.
- `frontend/src/pages/Admin/Products/components/ProductGeneralTab.tsx` - Tab 1: Form sửa thông tin chung sản phẩm.
- `frontend/src/pages/Admin/Products/components/ProductEditModal.tsx` - Modal trung tâm 3 tab sửa sản phẩm.
- `frontend/src/pages/Admin/Products/components/__tests__/ProductEditModal.spec.tsx` - Unit test cho `ProductEditModal`.
- `frontend/src/pages/Admin/Products/AdminProductsPage.tsx` - Tích hợp nút "Sửa" và luồng tạo sản phẩm mở modal edit.
- `frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx` - Integration test cho trang AdminProductsPage.

---

## Task List Outline

- Task 1: Backend DTO & Service Support for Specs and Variant Constraints
- Task 2: Frontend API Service Extension & Unit Tests
- Task 3: Product Specs Tab Component (Hardware Presets & Dynamic Key-Values)
- Task 4: Variant Form Modal Component (Create & Edit Variant Form)
- Task 5: Product Variants Tab Component (Variants Table & Action Handlers)
- Task 6: Product General Tab & Main Tabbed Modal (ProductEditModal)
- Task 7: Integration with AdminProductsPage & Full Verification

---

### Task 1: Backend DTO & Service Support for Specs and Variant Constraints

**Files:**
- Modify: `backend/src/modules/products/dto/create-product.dto.ts`
- Modify: `backend/src/modules/products/products.service.ts`
- Test: `backend/test/unit/products-specs-variants.spec.ts`

- [ ] **Step 1: Write the failing unit test**

Create `backend/test/unit/products-specs-variants.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../../src/modules/products/products.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('ProductsService - Specs & Variant Constraints', () => {
  let service: ProductsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: vi?.fn?.() || jest.fn(),
        findFirst: vi?.fn?.() || jest.fn(),
        create: vi?.fn?.() || jest.fn(),
        update: vi?.fn?.() || jest.fn(),
      },
      productVariant: {
        findFirst: vi?.fn?.() || jest.fn(),
        delete: vi?.fn?.() || jest.fn(),
      },
      orderItem: {
        count: vi?.fn?.() || jest.fn(),
      },
      imeiDevice: {
        count: vi?.fn?.() || jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should prevent deleting a variant if order items exist', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'prod-1' } as any);
    prisma.productVariant.findFirst.mockResolvedValue({ id: 'var-1', productId: 'prod-1' });
    prisma.orderItem.count.mockResolvedValue(2);

    await expect(service.removeVariant('prod-1', 'var-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test backend/test/unit/products-specs-variants.spec.ts` in `backend`
Expected: FAIL (either `removeVariant` doesn't check `orderItem` or file doesn't exist yet).

- [ ] **Step 3: Modify DTO and Service**

In `backend/src/modules/products/dto/create-product.dto.ts`:
Add `@IsObject() @IsOptional() specs?: Record<string, any>;` and make `slug?: string;` optional.

In `backend/src/modules/products/products.service.ts`:
1. In `create(dto: CreateProductDto)`:
   If `!dto.slug`, auto-generate slug from `dto.name`:
   ```typescript
   const baseSlug = (dto.slug || dto.name)
     .toLowerCase()
     .normalize('NFD')
     .replace(/[\u0300-\u036f]/g, '')
     .replace(/[^a-z0-9]+/g, '-')
     .replace(/(^-|-$)+/g, '');
   const slug = dto.slug || `${baseSlug}-${Date.now().toString(36)}`;
   ```
2. In `removeVariant(productId: string, variantId: string)`:
   ```typescript
   await this.findOne(productId);
   const variant = await this.prisma.productVariant.findFirst({
     where: { id: variantId, productId },
   });
   if (!variant) throw new NotFoundException('Variant not found');

   const [orderCount, imeiCount] = await Promise.all([
     this.prisma.orderItem.count({ where: { variantId } }),
     this.prisma.imeiDevice.count({ where: { variantId } }),
   ]);
   if (orderCount > 0 || imeiCount > 0) {
     throw new BadRequestException(
       'Không thể xóa biến thể đã phát sinh đơn hàng hoặc thiết bị IMEI. Vui lòng tắt kích hoạt biến thể thay vì xóa.',
     );
   }

   return this.prisma.productVariant.delete({ where: { id: variantId } });
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test backend/test/unit/products-specs-variants.spec.ts` in `backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/products/dto/create-product.dto.ts backend/src/modules/products/products.service.ts backend/test/unit/products-specs-variants.spec.ts
git commit -m "feat(backend): support specs in product DTO and add variant deletion constraints"
```

---

### Task 2: Frontend API Service Extension & Unit Tests

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/productService.ts`
- Create: `frontend/src/services/__tests__/productService.spec.ts`

- [ ] **Step 1: Write the failing unit test**

Create `frontend/src/services/__tests__/productService.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from '../productService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('productService variant extensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateVariant should call PATCH /products/:productId/variants/:variantId', async () => {
    const mockVariant = { id: 'var-1', price: 29000000 };
    (apiClient.patch as any).mockResolvedValueOnce({ data: { data: mockVariant } });

    const result = await productService.updateVariant('prod-1', 'var-1', { price: 29000000 });
    expect(apiClient.patch).toHaveBeenCalledWith('/products/prod-1/variants/var-1', { price: 29000000 });
    expect(result).toEqual(mockVariant);
  });

  it('deleteVariant should call DELETE /products/:productId/variants/:variantId', async () => {
    (apiClient.delete as any).mockResolvedValueOnce({ data: { success: true } });

    await productService.deleteVariant('prod-1', 'var-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/products/prod-1/variants/var-1');
  });

  it('toggleVariantStatus should call PATCH /products/:productId/variants/:variantId with isActive', async () => {
    (apiClient.patch as any).mockResolvedValueOnce({ data: { data: { id: 'var-1', isActive: false } } });

    const result = await productService.toggleVariantStatus('prod-1', 'var-1', false);
    expect(apiClient.patch).toHaveBeenCalledWith('/products/prod-1/variants/var-1', { isActive: false });
    expect(result.isActive).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run frontend/src/services/__tests__/productService.spec.ts`
Expected: FAIL (`updateVariant is not a function`).

- [ ] **Step 3: Implement methods in `productService.ts` and types in `types/index.ts`**

In `frontend/src/types/index.ts`:
Ensure `UpdateVariantDto` interface is exported:
```typescript
export interface UpdateVariantDto {
  sku?: string;
  name?: string;
  color?: string;
  storage?: string;
  ram?: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  imageUrl?: string;
  isActive?: boolean;
}
```

In `frontend/src/services/productService.ts`:
Add methods:
```typescript
  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto
  ): Promise<ProductVariant> {
    const response = await apiClient.patch(`/products/${productId}/variants/${variantId}`, dto);
    return response.data?.data ?? response.data;
  },

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/variants/${variantId}`);
  },

  async toggleVariantStatus(
    productId: string,
    variantId: string,
    isActive: boolean
  ): Promise<ProductVariant> {
    const response = await apiClient.patch(`/products/${productId}/variants/${variantId}`, { isActive });
    return response.data?.data ?? response.data;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run frontend/src/services/__tests__/productService.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/productService.ts frontend/src/services/__tests__/productService.spec.ts
git commit -m "feat(frontend): extend productService with variant update, delete, and toggle status"
```

---

### Task 3: Product Specs Tab Component (Hardware Presets & Dynamic Key-Values)

**Files:**
- Create: `frontend/src/pages/Admin/Products/components/ProductSpecsTab.tsx`
- Create: `frontend/src/pages/Admin/Products/components/__tests__/ProductSpecsTab.spec.tsx`

- [ ] **Step 1: Write the failing unit test**

Create `frontend/src/pages/Admin/Products/components/__tests__/ProductSpecsTab.spec.tsx`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductSpecsTab } from '../ProductSpecsTab';
import { productService } from '../../../../../services/productService';

vi.mock('../../../../../services/productService', () => ({
  productService: {
    updateProduct: vi.fn(),
  },
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ProductSpecsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard hardware preset fields and handles submit', async () => {
    (productService.updateProduct as any).mockResolvedValueOnce({ id: 'prod-123' });
    const onSaveSuccess = vi.fn();

    render(
      <ProductSpecsTab
        productId="prod-123"
        initialSpecs={{ 'Màn hình': '6.9 inch OLED', 'Chipset': 'Apple A18 Pro' }}
        onSaveSuccess={onSaveSuccess}
      />
    );

    expect(screen.getByText('Thông số phần cứng chuẩn')).toBeDefined();
    expect(screen.getByDisplayValue('6.9 inch OLED')).toBeDefined();

    const saveButton = screen.getByRole('button', { name: /lưu thông số kỹ thuật/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalledWith('prod-123', expect.objectContaining({
        specs: expect.objectContaining({
          'Màn hình': '6.9 inch OLED',
          'Chipset': 'Apple A18 Pro',
        }),
      }));
      expect(onSaveSuccess).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run frontend/src/pages/Admin/Products/components/__tests__/ProductSpecsTab.spec.tsx`
Expected: FAIL (component not found).

- [ ] **Step 3: Implement ProductSpecsTab component**

Create `frontend/src/pages/Admin/Products/components/ProductSpecsTab.tsx`:
Implement preset fields (`Màn hình`, `Chipset`, `Camera sau`, `Camera trước`, `Pin & Công nghệ sạc`, `Hệ điều hành`, `Cổng kết nối`) and dynamic custom rows (`key`, `value`) using Ant Design `Form`, `Input`, `Button`, `Space`, `Divider`, `Typography`, `message`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run frontend/src/pages/Admin/Products/components/__tests__/ProductSpecsTab.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Products/components/ProductSpecsTab.tsx frontend/src/pages/Admin/Products/components/__tests__/ProductSpecsTab.spec.tsx
git commit -m "feat(frontend): implement ProductSpecsTab with presets and dynamic key-values"
```

---

### Task 4: Variant Form Modal Component (Create & Edit Variant Form)

**Files:**
- Create: `frontend/src/pages/Admin/Products/components/VariantFormModal.tsx`
- Create: `frontend/src/pages/Admin/Products/components/__tests__/VariantFormModal.spec.tsx`

- [ ] **Step 1: Write the failing unit test**

Create `frontend/src/pages/Admin/Products/components/__tests__/VariantFormModal.spec.tsx`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VariantFormModal } from '../VariantFormModal';
import { productService } from '../../../../../services/productService';

vi.mock('../../../../../services/productService', () => ({
  productService: {
    addVariant: vi.fn(),
    updateVariant: vi.fn(),
  },
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('VariantFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateVariant when editing an existing variant', async () => {
    (productService.updateVariant as any).mockResolvedValueOnce({ id: 'var-1' });
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <VariantFormModal
        open={true}
        productId="prod-123"
        variant={{
          id: 'var-1',
          productId: 'prod-123',
          sku: 'IP16PM-256-TI',
          name: 'iPhone 16 Pro Max 256GB Titan',
          color: 'Titan Tự Nhiên',
          storage: '256GB',
          ram: '8GB',
          price: 28990000,
        }}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByDisplayValue('IP16PM-256-TI')).toBeDefined();
    const submitBtn = screen.getByRole('button', { name: /lưu biến thể/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(productService.updateVariant).toHaveBeenCalledWith('prod-123', 'var-1', expect.objectContaining({
        sku: 'IP16PM-256-TI',
      }));
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run frontend/src/pages/Admin/Products/components/__tests__/VariantFormModal.spec.tsx`
Expected: FAIL (component not found).

- [ ] **Step 3: Implement VariantFormModal component**

Create `frontend/src/pages/Admin/Products/components/VariantFormModal.tsx`:
Handle both "Thêm biến thể mới" and "Cập nhật biến thể".
Include fields: `sku`, `name`, `color`, `storage`, `ram`, `price`, `compareAtPrice`, `imageUrl` (`ImageUploadDragger`).
Add auto SKU generator helper: `generateSku(name, storage, color)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run frontend/src/pages/Admin/Products/components/__tests__/VariantFormModal.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Products/components/VariantFormModal.tsx frontend/src/pages/Admin/Products/components/__tests__/VariantFormModal.spec.tsx
git commit -m "feat(frontend): implement VariantFormModal for variant create and update"
```

---

### Task 5: Product Variants Tab Component (Variants Table & Action Handlers)

**Files:**
- Create: `frontend/src/pages/Admin/Products/components/ProductVariantsTab.tsx`
- Create: `frontend/src/pages/Admin/Products/components/__tests__/ProductVariantsTab.spec.tsx`

- [ ] **Step 1: Write the failing unit test**

Create `frontend/src/pages/Admin/Products/components/__tests__/ProductVariantsTab.spec.tsx`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductVariantsTab } from '../ProductVariantsTab';
import { productService } from '../../../../../services/productService';

vi.mock('../../../../../services/productService', () => ({
  productService: {
    deleteVariant: vi.fn(),
    toggleVariantStatus: vi.fn(),
  },
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ProductVariantsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders variants table and opens add variant modal on button click', async () => {
    const mockVariants = [
      {
        id: 'var-1',
        productId: 'prod-1',
        sku: 'IP16PM-256',
        name: 'iPhone 16 Pro Max 256GB',
        color: 'Titan Tự Nhiên',
        storage: '256GB',
        price: 28990000,
        isActive: true,
      },
    ];

    render(
      <ProductVariantsTab
        productId="prod-1"
        productName="iPhone 16 Pro Max"
        variants={mockVariants as any}
        onReload={vi.fn()}
      />
    );

    expect(screen.getByText('IP16PM-256')).toBeDefined();
    expect(screen.getByText('Titan Tự Nhiên')).toBeDefined();

    const addBtn = screen.getByRole('button', { name: /thêm biến thể mới/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Thêm biến thể mới')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run frontend/src/pages/Admin/Products/components/__tests__/ProductVariantsTab.spec.tsx`
Expected: FAIL (component not found).

- [ ] **Step 3: Implement ProductVariantsTab component**

Create `frontend/src/pages/Admin/Products/components/ProductVariantsTab.tsx`:
Implement Table of variants with columns: Thumbnail, SKU Tag, Name & Color/Storage, Price (formatted VND), Active Switch, Edit Button, Delete Button with Popconfirm.
Integrate `VariantFormModal` for creating and editing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run frontend/src/pages/Admin/Products/components/__tests__/ProductVariantsTab.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Products/components/ProductVariantsTab.tsx frontend/src/pages/Admin/Products/components/__tests__/ProductVariantsTab.spec.tsx
git commit -m "feat(frontend): implement ProductVariantsTab with variants table and CRUD controls"
```

---

### Task 6: Product General Tab & Main Tabbed Modal (ProductEditModal)

**Files:**
- Create: `frontend/src/pages/Admin/Products/components/ProductGeneralTab.tsx`
- Create: `frontend/src/pages/Admin/Products/components/ProductEditModal.tsx`
- Create: `frontend/src/pages/Admin/Products/components/__tests__/ProductEditModal.spec.tsx`

- [ ] **Step 1: Write the failing unit test**

Create `frontend/src/pages/Admin/Products/components/__tests__/ProductEditModal.spec.tsx`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductEditModal } from '../ProductEditModal';
import { productService } from '../../../../../services/productService';

vi.mock('../../../../../services/productService', () => ({
  productService: {
    getProductById: vi.fn(),
    getBrands: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockResolvedValue([]),
    updateProduct: vi.fn(),
  },
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ProductEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads product details and renders 3 tabs', async () => {
    (productService.getProductById as any).mockResolvedValueOnce({
      id: 'prod-1',
      name: 'iPhone 16 Pro Max',
      slug: 'iphone-16-pro-max',
      description: 'Flagship phone',
      variants: [],
      specs: {},
      status: 'ACTIVE',
    });

    render(
      <ProductEditModal
        open={true}
        productId="prod-1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Thông tin chung')).toBeDefined();
      expect(screen.getByText(/quản lý biến thể/i)).toBeDefined();
      expect(screen.getByText(/thông số kỹ thuật/i)).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run frontend/src/pages/Admin/Products/components/__tests__/ProductEditModal.spec.tsx`
Expected: FAIL (component not found).

- [ ] **Step 3: Implement ProductGeneralTab and ProductEditModal**

1. Create `frontend/src/pages/Admin/Products/components/ProductGeneralTab.tsx`:
   Form editing: Name, Slug (with slug generator), Brand, Category, Condition (Radio NEW / LIKE_NEW), Status (Switch ACTIVE/DRAFT), WarrantyMonths, Description, Thumbnail (`ImageUploadDragger`).
2. Create `frontend/src/pages/Admin/Products/components/ProductEditModal.tsx`:
   Modal with 3 Tabs (`Thông tin chung`, `Quản lý Biến thể`, `Thông số kỹ thuật`). Manages product fetch, state synchronization, and reload trigger.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run frontend/src/pages/Admin/Products/components/__tests__/ProductEditModal.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Products/components/ProductGeneralTab.tsx frontend/src/pages/Admin/Products/components/ProductEditModal.tsx frontend/src/pages/Admin/Products/components/__tests__/ProductEditModal.spec.tsx
git commit -m "feat(frontend): implement ProductGeneralTab and ProductEditModal"
```

---

### Task 7: Integration with AdminProductsPage & Full Verification

**Files:**
- Modify: `frontend/src/pages/Admin/Products/AdminProductsPage.tsx`
- Create: `frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx`

- [ ] **Step 1: Write integration test**

Create `frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminProductsPage } from '../AdminProductsPage';
import { productService } from '../../../../services/productService';

vi.mock('../../../../services/productService', () => ({
  productService: {
    getAllProductsAdmin: vi.fn(),
    getBrands: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn(),
    deleteProduct: vi.fn(),
    updateProduct: vi.fn(),
  },
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('AdminProductsPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clicking "Sửa" button opens ProductEditModal with selected product ID', async () => {
    (productService.getAllProductsAdmin as any).mockResolvedValueOnce({
      items: [
        {
          id: 'prod-abc',
          name: 'Samsung Galaxy S24 Ultra',
          brand: { name: 'Samsung' },
          variants: [],
          status: 'ACTIVE',
        },
      ],
      total: 1,
    });
    (productService.getProductById as any).mockResolvedValueOnce({
      id: 'prod-abc',
      name: 'Samsung Galaxy S24 Ultra',
      variants: [],
      specs: {},
    });

    render(<AdminProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeDefined();
    });

    const editButtons = screen.getAllByRole('button', { name: /sửa/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(productService.getProductById).toHaveBeenCalledWith('prod-abc');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx`
Expected: FAIL (edit button does not open modal).

- [ ] **Step 3: Modify AdminProductsPage.tsx**

1. Import `ProductEditModal`.
2. Add state `editingProductId: string | null` and `isEditModalOpen: boolean`.
3. In `columns`: Add `onClick={() => { setEditingProductId(record.id); setIsEditModalOpen(true); }}` to the "Sửa" button.
4. In `handleCreateProduct`: After creation, set `setEditingProductId(created.id)` and `setIsEditModalOpen(true)` so the admin can immediately configure specs and more variants.
5. Render `<ProductEditModal open={isEditModalOpen} productId={editingProductId} onClose={() => setIsEditModalOpen(false)} onSuccess={loadData} />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx`
Expected: PASS

- [ ] **Step 5: Run full test suite for products**

Run:
- `npx vitest run frontend/src/pages/Admin/Products/`
- `npm test backend/test/unit/products-specs-variants.spec.ts` (in `backend`)
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Admin/Products/AdminProductsPage.tsx frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx
git commit -m "feat(frontend): wire ProductEditModal into AdminProductsPage and add tests"
```
