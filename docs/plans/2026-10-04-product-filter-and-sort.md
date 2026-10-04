# Product Filter and Sort System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện toàn diện hệ thống bộ lọc (13 tiêu chí: giá, hãng, RAM, ROM, màu sắc, màn hình, độ phân giải, chipset, camera, pin, hệ điều hành, 5G, rating) và sắp xếp (bán chạy nhất, khuyến mãi nhiều nhất, giá tăng/giảm, mới nhất, rating cao) từ Backend đến Storefront Frontend.

**Architecture:** Mở rộng DTO và Prisma Query ở Backend (`ProductsService.findAll`) để xử lý lọc JSON specs và variant attributes kèm tính toán aggregation cho sort bán chạy và khuyến mãi; nâng cấp `ProductFilterSidebar` thành giao diện Accordion với color swatches và toggle chips, đồng bộ 2 chiều qua URL search params và Backend API.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL (JSON queries), React 18, TypeScript, Tailwind CSS, Ant Design, Vitest, Jest.

---

## File Structure Map

- **Backend:**
  - Modify: `backend/src/modules/products/dto/filter-product.dto.ts` — Thêm các filter DTO params (ram, storage, color, has5G, os, chipset, screen, battery, sortBy options).
  - Modify: `backend/src/modules/products/products.service.ts` — Cập nhật `findAll` xây dựng Prisma where clause (variant & specs JSON) và sorting logic (best-seller, top-discount).
  - Create: `backend/src/modules/products/__tests__/products-filter-sort.service.spec.ts` — Unit tests cho các kịch bản filter và sort mới.
  - Modify: `backend/prisma/seed/seed.ts` — Bổ sung specs chuẩn hóa cho các sản phẩm seed (5G, màn hình, pin, chipset, os).

- **Frontend:**
  - Modify: `frontend/src/types/index.ts` — Khai báo các interface `ProductHardwareSpecs` và mở rộng `ProductFilterParams`.
  - Modify: `frontend/src/services/productService.ts` — Cập nhật service gửi đầy đủ query params lọc lên API.
  - Modify: `frontend/src/components/storefront/ProductSortToolbar.tsx` — Bổ sung các option sắp xếp: Bán chạy (`best-seller`) và Khuyến mãi nhiều nhất (`top-discount`).
  - Modify: `frontend/src/components/storefront/ProductFilterSidebar.tsx` — Nâng cấp Accordion UI, Color Swatches, Chip buttons cho Màn hình, Pin, 5G, Chipset, OS.
  - Modify: `frontend/src/pages/storefront/Products/ProductListingPage.tsx` — Kết nối các bộ lọc mới, đồng bộ với URL params và gọi Server API phân trang.

---

### Task 1: Mở rộng `FilterProductDto` và Type Definitions ở Backend

**Files:**
- Modify: `backend/src/modules/products/dto/filter-product.dto.ts`
- Create: `backend/src/modules/products/__tests__/filter-product.dto.spec.ts`

- [ ] **Step 1: Viết test kiểm tra validation cho `FilterProductDto`**

Tạo file `backend/src/modules/products/__tests__/filter-product.dto.spec.ts`:
```typescript
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FilterProductDto } from '../dto/filter-product.dto';

describe('FilterProductDto validation', () => {
  it('should validate valid filter params successfully', async () => {
    const dto = plainToInstance(FilterProductDto, {
      minPrice: 10000000,
      maxPrice: 20000000,
      ram: ['8GB', '12GB'],
      storage: ['256GB'],
      has5G: true,
      os: ['iOS'],
      minScreenSize: 6.1,
      maxScreenSize: 6.7,
      sortBy: 'best-seller',
      sortOrder: 'desc',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Run: `npm --prefix backend test -- filter-product.dto.spec.ts`
Expected: FAIL do các trường `has5G`, `ram`, v.v. chưa được định nghĩa hoặc validate trong DTO.

- [ ] **Step 3: Cập nhật `FilterProductDto`**

Cập nhật `backend/src/modules/products/dto/filter-product.dto.ts` với đầy đủ các thuộc tính và decorator `class-validator`:
```typescript
import { IsArray, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCondition, ProductStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class FilterProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: ProductCondition })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // Thuộc tính biến thể
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  ram?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  storage?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  color?: string[];

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onSale?: boolean;

  // Thông số phần cứng specs
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  has5G?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  os?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  chipset?: string[];

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minScreenSize?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxScreenSize?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBattery?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBattery?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRating?: number;

  // Phân trang & sắp xếp
  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
```

- [ ] **Step 4: Chạy test để xác nhận test pass**

Run: `npm --prefix backend test -- filter-product.dto.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/products/dto/filter-product.dto.ts backend/src/modules/products/__tests__/filter-product.dto.spec.ts
git commit -m "feat(backend): expand FilterProductDto with hardware specs and sorting options"
```

---

### Task 2: Cập nhật `ProductsService.findAll` cho Filter và Sort Nâng cao

**Files:**
- Modify: `backend/src/modules/products/products.service.ts`
- Create: `backend/src/modules/products/__tests__/products-filter-sort.service.spec.ts`

- [ ] **Step 1: Viết test cho `ProductsService.findAll` với filter specs & sort**

Tạo file `backend/src/modules/products/__tests__/products-filter-sort.service.spec.ts` kiểm thử logic query specs và variant:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../products.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProductsService - Filter & Sort', () => {
  let service: ProductsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p-1',
            name: 'Samsung Galaxy S24',
            specs: { has5G: true, screenSize: 6.2, batteryCapacity: 4000 },
            variants: [{ id: 'v-1', price: 15000000, ram: '8GB', storage: '256GB' }],
            reviews: [{ rating: 5, status: 'APPROVED' }],
          },
        ]),
      },
      orderItem: {
        groupBy: jest.fn().mockResolvedValue([]),
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

  it('should construct query with variant and specs filters', async () => {
    const res = await service.findAll({
      has5G: true,
      ram: ['8GB'],
      minPrice: 10000000,
      maxPrice: 20000000,
    });
    expect(prisma.product.findMany).toHaveBeenCalled();
    expect(res.data.length).toBe(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test fails hoặc chưa cover đầy đủ**

Run: `npm --prefix backend test -- products-filter-sort.service.spec.ts`

- [ ] **Step 3: Triển khai cập nhật `ProductsService.findAll`**

Cập nhật `backend/src/modules/products/products.service.ts` phần `findAll`:
- Xây dựng `variantFilter` cho RAM, Storage, Color, Price Range, InStock, OnSale.
- Xây dựng các điều kiện JSON specs cho `has5G`, `minScreenSize`, `maxScreenSize`, `minBattery`, `maxBattery`, `os`, `chipset`.
- Xử lý sort `best-seller` (lấy top productId có tổng quantity nhiều nhất từ `orderItem.groupBy` hoặc in-memory sorting sau khi lấy danh sách) và `top-discount` (sắp xếp theo tỷ lệ giảm giá lớn nhất giữa compareAtPrice và price).
- Hỗ trợ sort `price-asc` và `price-desc` linh hoạt.

- [ ] **Step 4: Chạy test để xác minh pass**

Run: `npm --prefix backend test -- products-filter-sort.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/products/products.service.ts backend/src/modules/products/__tests__/products-filter-sort.service.spec.ts
git commit -m "feat(backend): implement comprehensive filter and sort in ProductsService"
```

---

### Task 3: Chuẩn hóa Dữ liệu Seed với Specs Phần Cứng

**Files:**
- Modify: `backend/prisma/seed/seed.ts`

- [ ] **Step 1: Cập nhật dữ liệu seed products**

Bổ sung trường `specs` có cấu trúc đầy đủ vào danh sách sản phẩm điện thoại mẫu trong `backend/prisma/seed/seed.ts`:
```typescript
specs: {
  screenSize: 6.7,
  screenResolution: '2796 x 1290 pixels',
  screenTechnology: 'Super Retina XDR OLED',
  screenRefreshRate: 120,
  chipset: 'Apple A17 Pro',
  os: 'iOS',
  has5G: true,
  batteryCapacity: 4422,
  rearCamera: 'Chính 48 MP & Phụ 12 MP, 12 MP',
  frontCamera: '12 MP',
  mainCameraMp: 48,
}
```
Và cho các sản phẩm Samsung Galaxy S24 Ultra, Xiaomi, OPPO, Google Pixel.

- [ ] **Step 2: Kiểm tra biên dịch TypeScript của script seed**

Run: `npm --prefix backend run build`
Expected: Không có lỗi type.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/seed/seed.ts
git commit -m "chore(seed): enrich hardware specs for demo mobile products"
```

---

### Task 4: Khai báo Types và Cập nhật `productService` ở Frontend

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/productService.ts`

- [ ] **Step 1: Viết test kiểm tra tham số gọi `productService.getProducts`**

Tạo file `frontend/src/services/__tests__/productService.filter.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from '../productService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('productService filter queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes hardware filter params to apiClient', async () => {
    (apiClient.get as any).mockResolvedValue({ data: { data: [], total: 0 } });
    await productService.getProducts({
      has5G: true,
      ram: ['8GB'],
      minPrice: 10000000,
      sortBy: 'best-seller',
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/products',
      expect.objectContaining({
        params: expect.objectContaining({
          has5G: true,
          ram: ['8GB'],
          sortBy: 'best-seller',
        }),
      })
    );
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npm --prefix frontend test -- productService.filter.spec.ts`
Expected: FAIL do interface chưa hỗ trợ params mới.

- [ ] **Step 3: Cập nhật `frontend/src/types/index.ts` và `productService.ts`**

Mở rộng `GetProductsParams` trong `productService.ts` và `ProductHardwareSpecs` trong `types/index.ts`:
```typescript
export interface ProductHardwareSpecs {
  screenSize?: number;
  screenResolution?: string;
  chipset?: string;
  os?: string;
  has5G?: boolean;
  batteryCapacity?: number;
  mainCameraMp?: number;
  [key: string]: any;
}

export interface GetProductsParams {
  search?: string;
  brandId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  ram?: string[];
  storage?: string[];
  color?: string[];
  inStock?: boolean;
  onSale?: boolean;
  has5G?: boolean;
  os?: string[];
  chipset?: string[];
  minScreenSize?: number;
  maxScreenSize?: number;
  minBattery?: number;
  maxBattery?: number;
  minRating?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npm --prefix frontend test -- productService.filter.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/productService.ts frontend/src/services/__tests__/productService.filter.spec.ts
git commit -m "feat(frontend): add hardware specs types and expand productService query params"
```

---

### Task 5: Nâng cấp `ProductSortToolbar` với Tùy chọn Bán chạy & Khuyến mãi

**Files:**
- Modify: `frontend/src/components/storefront/ProductSortToolbar.tsx`
- Modify: `frontend/src/components/storefront/__tests__/ProductSortToolbar.spec.tsx`

- [ ] **Step 1: Viết test cho các option sắp xếp mới**

Tạo/cập nhật `frontend/src/components/storefront/__tests__/ProductSortToolbar.spec.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductSortToolbar } from '../ProductSortToolbar';

describe('ProductSortToolbar', () => {
  it('renders sort options including best-seller and top-discount', () => {
    const onSortChange = vi.fn();
    render(
      <ProductSortToolbar
        searchKeyword=""
        onSearchChange={vi.fn()}
        sortBy="default"
        onSortChange={onSortChange}
        totalCount={10}
      />
    );
    expect(screen.getByText('Bán chạy nhất')).toBeDefined();
    expect(screen.getByText('Khuyến mãi nhiều nhất')).toBeDefined();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'best-seller' } });
    expect(onSortChange).toHaveBeenCalledWith('best-seller');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npm --prefix frontend test -- ProductSortToolbar.spec.tsx`
Expected: FAIL

- [ ] **Step 3: Triển khai bổ sung options vào `ProductSortToolbar.tsx`**

Cập nhật `sortBy` type:
`'default' | 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'best-seller' | 'top-discount'`
Thêm các `<option>` vào select dropdown:
- `<option value="best-seller">🔥 Bán chạy nhất</option>`
- `<option value="top-discount">💥 Khuyến mãi nhiều nhất</option>`

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npm --prefix frontend test -- ProductSortToolbar.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/storefront/ProductSortToolbar.tsx frontend/src/components/storefront/__tests__/ProductSortToolbar.spec.tsx
git commit -m "feat(frontend): add best-seller and top-discount options to ProductSortToolbar"
```

---

### Task 6: Nâng cấp `ProductFilterSidebar` thành Giao diện Accordion Toàn diện

**Files:**
- Modify: `frontend/src/components/storefront/ProductFilterSidebar.tsx`
- Modify: `frontend/src/components/storefront/__tests__/ProductFilterSidebar.spec.tsx`

- [ ] **Step 1: Viết test cho các bộ lọc mới (5G, Màn hình, Pin, Màu sắc, Rating)**

Cập nhật `frontend/src/components/storefront/__tests__/ProductFilterSidebar.spec.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductFilterSidebar } from '../ProductFilterSidebar';

describe('ProductFilterSidebar new filters', () => {
  it('renders 5G toggle and triggers callback on click', () => {
    const onToggle5G = vi.fn();
    render(
      <ProductFilterSidebar
        priceRange={[0, 50000000]}
        onPriceRangeChange={vi.fn()}
        selectedStorages={[]}
        onToggleStorage={vi.fn()}
        selectedRams={[]}
        onToggleRam={vi.fn()}
        inStockOnly={false}
        onToggleInStock={vi.fn()}
        onSaleOnly={false}
        onToggleOnSale={vi.fn()}
        minRating={null}
        onSelectMinRating={vi.fn()}
        has5GOnly={false}
        onToggle5G={onToggle5G}
        hasActiveFilters={false}
        onResetFilters={vi.fn()}
      />
    );
    const toggle5G = screen.getByText(/5G/i);
    fireEvent.click(toggle5G);
    expect(onToggle5G).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npm --prefix frontend test -- ProductFilterSidebar.spec.tsx`
Expected: FAIL

- [ ] **Step 3: Triển khai cập nhật `ProductFilterSidebar.tsx`**

- Tổ chức các nhóm Accordion có thể đóng mở:
  - Nhóm 1: Khoảng giá & Nhu cầu (5G, Giảm giá, Còn hàng).
  - Nhóm 2: Thương hiệu.
  - Nhóm 3: RAM & Bộ nhớ trong (ROM).
  - Nhóm 4: Màn hình (<6.1", 6.1-6.7", >6.7") & Pin (<4000, 4000-5000, >5000 mAh).
  - Nhóm 5: Hệ điều hành (iOS, Android) & Chipset.
  - Nhóm 6: Bảng màu sắc (Color swatches: Đen, Trắng, Xanh, Titan, Vàng...) với mã màu trực quan.
  - Nhóm 7: Đánh giá (Rating 5 sao, 4 sao+, 3 sao+).
- Thêm hiệu ứng transition mượt mà, badge đếm số lượng bộ lọc đang active ở từng nhóm.

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npm --prefix frontend test -- ProductFilterSidebar.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/storefront/ProductFilterSidebar.tsx frontend/src/components/storefront/__tests__/ProductFilterSidebar.spec.tsx
git commit -m "feat(frontend): upgrade ProductFilterSidebar with accordion layout and comprehensive hardware filters"
```

---

### Task 7: Tích hợp Toàn bộ Bộ lọc và Sort vào `ProductListingPage`

**Files:**
- Modify: `frontend/src/pages/storefront/Products/ProductListingPage.tsx`
- Modify: `frontend/src/pages/storefront/Products/__tests__/ProductListingPage.spec.tsx`

- [ ] **Step 1: Viết test cho `ProductListingPage` kết hợp filter & URL params**

Cập nhật test `frontend/src/pages/storefront/Products/__tests__/ProductListingPage.spec.tsx`:
- Kiểm tra khi người dùng chọn filter 5G hoặc sort `best-seller`, state và request gọi API tương ứng được cập nhật.

- [ ] **Step 2: Triển khai cập nhật `ProductListingPage.tsx`**

- Mở rộng state và query params:
  - `has5GOnly`, `selectedColors`, `selectedScreenSizes`, `selectedBatteries`, `selectedOs`, `selectedChipsets`.
  - Kết nối với `ProductFilterSidebar` và `ProductSortToolbar`.
  - Gọi API `productService.getProducts` với đầy đủ các params tương ứng.
  - Xử lý các trạng thái: Loading Skeleton, Empty State (nút Xóa bộ lọc), Error State.
  - Đồng bộ 2 chiều với `searchParams` URL (hỗ trợ lưu link và chia sẻ URL).

- [ ] **Step 3: Chạy test để xác nhận pass**

Run: `npm --prefix frontend test -- ProductListingPage.spec.tsx`
Expected: PASS

- [ ] **Step 4: Kiểm tra build frontend và backend không có lỗi type**

Run: `npm --prefix backend run build`
Run: `npm --prefix frontend run build`
Expected: Build thành công cả 2 bên.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/storefront/Products/ProductListingPage.tsx frontend/src/pages/storefront/Products/__tests__/ProductListingPage.spec.tsx
git commit -m "feat(storefront): integrate comprehensive filter and sort system in ProductListingPage"
```

---

### Task 8: Kiểm thử Toàn diện & Nghiệm thu (End-to-End Verification)

**Files:**
- Verify: Toàn bộ luồng lọc và sắp xếp.

- [ ] **Step 1: Chạy toàn bộ test suite của backend**

Run: `npm --prefix backend test`
Expected: Toàn bộ tests pass.

- [ ] **Step 2: Chạy toàn bộ test suite của frontend**

Run: `npm --prefix frontend test`
Expected: Toàn bộ tests pass.

- [ ] **Step 3: Kiểm tra giao diện và tính năng hoạt động thực tế**

- Lọc theo Brand Samsung + Giá 10-20tr + RAM 8GB + 5G: Chỉ hiển thị sản phẩm thỏa mãn.
- Sắp xếp Bán chạy: Sản phẩm có đơn hàng hiển thị trước.
- Sắp xếp Khuyến mãi nhiều nhất: Sản phẩm có tỷ lệ giảm giá cao nhất hiển thị trước.
- Xóa bộ lọc: Phục hồi trạng thái mặc định.

- [ ] **Step 4: Commit hoàn tất**

```bash
git commit --allow-empty -m "chore: complete end-to-end verification for product filter and sort system"
```
