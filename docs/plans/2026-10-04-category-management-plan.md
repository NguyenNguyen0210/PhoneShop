# Category Management (Quản lý Danh mục Smartphone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hoàn chỉnh tính năng Quản lý Danh mục Smartphone (Category Management) toàn diện bao gồm mở rộng Backend API (NestJS + Prisma) và xây dựng Giao diện Quản trị viên (React 19 + Ant Design Tree Table) với đầy đủ CRUD, quan hệ cha-con phân cấp, kiểm tra ràng buộc toàn vẹn dữ liệu, và kiểm thử tự động.

**Architecture:** Mở rộng CategoriesController & CategoriesService ở backend để hỗ trợ đếm số sản phẩm liên kết (`_count`), chặn xóa khi có ràng buộc con/sản phẩm, ngăn ngừa lặp phân cấp, và cung cấp endpoint activate/deactivate. Ở frontend, chuẩn hóa types, xây dựng categoryService chuyên trách, cấu hình định tuyến và tích hợp trang quản lý danh mục dạng Ant Design Tree Table với modal tạo/sửa thông minh.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, React 19, Ant Design (Tree, Table, Form, TreeSelect), TypeScript, Vitest, Jest.

---

### Task 1: Backend Categories Service & Controller Enhancements

**Files:**
- Modify: `backend/src/modules/categories/categories.service.ts`
- Modify: `backend/src/modules/categories/categories.controller.ts`
- Test: `backend/test/unit/categories.spec.ts`

- [ ] **Step 1: Write the failing unit tests for CategoriesService & Controller**

Tạo file `backend/test/unit/categories.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { CategoriesController } from '../../src/modules/categories/categories.controller';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      category: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new CategoriesService(prisma);
  });

  describe('activate and deactivate (changeStatus)', () => {
    it('should activate category successfully', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại', isActive: false });
      prisma.category.update.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại', isActive: true });

      const result = await service.changeStatus('cat-1', true);
      expect(result.isActive).toBe(true);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: true },
      });
    });

    it('should deactivate category successfully', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại', isActive: true });
      prisma.category.update.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại', isActive: false });

      const result = await service.changeStatus('cat-1', false);
      expect(result.isActive).toBe(false);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: false },
      });
    });
  });

  describe('remove with constraints', () => {
    it('should prevent deletion if category has products', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'iPhone',
        children: [],
        products: [{ id: 'prod-1' }],
      });

      await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('should prevent deletion if category has children', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Điện thoại',
        children: [{ id: 'cat-2' }],
        products: [],
      });

      await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('should allow deletion if category has no products and no children', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Điện thoại cũ',
        children: [],
        products: [],
      });
      prisma.category.delete.mockResolvedValue({ id: 'cat-1' });

      const result = await service.remove('cat-1');
      expect(result).toEqual({ id: 'cat-1' });
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });

  describe('cyclic hierarchy check on update', () => {
    it('should reject setting parentId to itself', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại' });

      await expect(service.update('cat-1', { parentId: 'cat-1' })).rejects.toThrow(ConflictException);
    });

    it('should reject setting parentId to one of its descendants', async () => {
      prisma.category.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'cat-1') return Promise.resolve({ id: 'cat-1', name: 'Điện thoại' });
        if (where.id === 'cat-sub') return Promise.resolve({ id: 'cat-sub', parentId: 'cat-1' });
        return Promise.resolve(null);
      });

      await expect(service.update('cat-1', { parentId: 'cat-sub' })).rejects.toThrow(ConflictException);
    });
  });

  describe('getTree with product counts', () => {
    it('should include _count for products and children', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      await service.getTree(false);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: { select: { products: true, children: true } },
          }),
        })
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npm --prefix backend test -- test/unit/categories.spec.ts
```
Expected: FAIL (service.changeStatus is not a function, or constraint checks missing)

- [ ] **Step 3: Update `backend/src/modules/categories/categories.service.ts`**

Cập nhật `categories.service.ts` bao gồm:
1. `changeStatus(id: string, isActive: boolean)`
2. `remove(id: string)`: kiểm tra `category.products.length > 0` và `category.children.length > 0`
3. `update(id: string, dto)`: kiểm tra đệ quy ngăn ngừa parentId là con cháu của category đang sửa
4. `getTree` và `findAll`: include `_count: { select: { products: true, children: true } }`

```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    if (dto.parentId) {
      await this.findOne(dto.parentId); // Ensure parent exists
    }

    return this.prisma.category.create({
      data: dto,
    });
  }

  async findAll(activeOnly: boolean = false) {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getTree(activeOnly: boolean = false) {
    const where: any = { parentId: null };
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true, children: true },
        },
        children: {
          where: activeOnly ? { isActive: true } : undefined,
          include: {
            _count: {
              select: { products: true, children: true },
            },
            children: {
              where: activeOnly ? { isActive: true } : undefined,
              include: {
                _count: {
                  select: { products: true, children: true },
                },
                children: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        products: true,
        _count: {
          select: { products: true, children: true },
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.category.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) throw new ConflictException('Category slug already in use');
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('Category cannot be its own parent');
      }

      // Check if candidate parent is a descendant of this category
      let currentParentId: string | null = dto.parentId;
      while (currentParentId) {
        if (currentParentId === id) {
          throw new ConflictException('Cannot set parent to a descendant category (cyclic hierarchy)');
        }
        const candidateParent = await this.prisma.category.findUnique({
          where: { id: currentParentId },
        });
        if (!candidateParent) break;
        currentParentId = candidateParent.parentId;
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async changeStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    if (category.products && category.products.length > 0) {
      throw new BadRequestException(
        `Danh mục đang chứa ${category.products.length} sản phẩm liên kết. Vui lòng chuyển sản phẩm sang danh mục khác trước khi xóa.`
      );
    }

    if (category.children && category.children.length > 0) {
      throw new BadRequestException(
        `Danh mục đang chứa ${category.children.length} danh mục con. Vui lòng xóa hoặc di chuyển danh mục con trước.`
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
```

- [ ] **Step 4: Update `backend/src/modules/categories/categories.controller.ts`**

Bổ sung 2 endpoint `activate` và `deactivate`:

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active categories (Public)' })
  findAllPublic() {
    return this.categoriesService.findAll(true);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get category tree (Public)' })
  getTreePublic() {
    return this.categoriesService.getTree(true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category detail (Public)' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  // --- MANAGER / ADMIN ENDPOINTS ---

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (MANAGER/ADMIN)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all categories including inactive (MANAGER/ADMIN)' })
  findAllAdmin() {
    return this.categoriesService.findAll(false);
  }

  @Get('admin/tree')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete category tree (MANAGER/ADMIN)' })
  getTreeAdmin() {
    return this.categoriesService.getTree(false);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (MANAGER/ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Put(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate category (MANAGER/ADMIN)' })
  activate(@Param('id') id: string) {
    return this.categoriesService.changeStatus(id, true);
  }

  @Put(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate category (MANAGER/ADMIN)' })
  deactivate(@Param('id') id: string) {
    return this.categoriesService.changeStatus(id, false);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (MANAGER/ADMIN)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
```

- [ ] **Step 5: Run unit tests to verify they pass**

Run:
```powershell
npm --prefix backend test -- test/unit/categories.spec.ts
```
Expected: PASS

- [ ] **Step 6: Commit backend changes**

```powershell
git add backend/src/modules/categories/ backend/test/unit/categories.spec.ts
git commit -m "feat(backend): add category activate/deactivate, count relations and constraint checks"
```

---

### Task 2: Frontend Types & Category Service

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/categoryService.ts`
- Test: `frontend/src/services/__tests__/categoryService.spec.ts`

- [ ] **Step 1: Write the failing unit tests for `categoryService`**

Tạo file `frontend/src/services/__tests__/categoryService.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryService } from '../categoryService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('categoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAdminCategoryTree should call /categories/admin/tree and return items', async () => {
    const mockData = [{ id: '1', name: 'Điện thoại', children: [] }];
    (apiClient.get as any).mockResolvedValue({ data: { data: mockData } });

    const result = await categoryService.getAdminCategoryTree();
    expect(apiClient.get).toHaveBeenCalledWith('/categories/admin/tree');
    expect(result).toEqual(mockData);
  });

  it('createCategory should post to /categories', async () => {
    const input = { name: 'Điện thoại mới', slug: 'dien-thoai-moi' };
    (apiClient.post as any).mockResolvedValue({ data: { data: { id: 'new-1', ...input } } });

    const result = await categoryService.createCategory(input);
    expect(apiClient.post).toHaveBeenCalledWith('/categories', input);
    expect(result.id).toBe('new-1');
  });

  it('activateCategory should call put /categories/:id/activate', async () => {
    (apiClient.put as any).mockResolvedValue({ data: { data: { id: '1', isActive: true } } });

    const result = await categoryService.activateCategory('1');
    expect(apiClient.put).toHaveBeenCalledWith('/categories/1/activate');
    expect(result.isActive).toBe(true);
  });

  it('deactivateCategory should call put /categories/:id/deactivate', async () => {
    (apiClient.put as any).mockResolvedValue({ data: { data: { id: '1', isActive: false } } });

    const result = await categoryService.deactivateCategory('1');
    expect(apiClient.put).toHaveBeenCalledWith('/categories/1/deactivate');
    expect(result.isActive).toBe(false);
  });

  it('deleteCategory should call delete /categories/:id', async () => {
    (apiClient.delete as any).mockResolvedValue({ data: { success: true } });

    await categoryService.deleteCategory('1');
    expect(apiClient.delete).toHaveBeenCalledWith('/categories/1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npm --prefix frontend test -- src/services/__tests__/categoryService.spec.ts
```
Expected: FAIL (Cannot find module '../categoryService')

- [ ] **Step 3: Update `frontend/src/types/index.ts`**

Mở rộng định nghĩa `Category` và DTO inputs:

```typescript
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId?: string | null;
  parent?: Category | null;
  children?: Category[];
  _count?: {
    products: number;
    children: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}
```

- [ ] **Step 4: Create `frontend/src/services/categoryService.ts`**

```typescript
import { apiClient } from './apiClient';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../types';

export const categoryService = {
  async getAdminCategoryTree(): Promise<Category[]> {
    const response = await apiClient.get('/categories/admin/tree');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getAdminCategoriesAll(): Promise<Category[]> {
    const response = await apiClient.get('/categories/admin/all');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getPublicCategories(): Promise<Category[]> {
    const response = await apiClient.get('/categories');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async createCategory(dto: CreateCategoryInput): Promise<Category> {
    const response = await apiClient.post('/categories', dto);
    return response.data?.data ?? response.data;
  },

  async updateCategory(id: string, dto: UpdateCategoryInput): Promise<Category> {
    const response = await apiClient.patch(`/categories/${id}`, dto);
    return response.data?.data ?? response.data;
  },

  async activateCategory(id: string): Promise<Category> {
    const response = await apiClient.put(`/categories/${id}/activate`);
    return response.data?.data ?? response.data;
  },

  async deactivateCategory(id: string): Promise<Category> {
    const response = await apiClient.put(`/categories/${id}/deactivate`);
    return response.data?.data ?? response.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```powershell
npm --prefix frontend test -- src/services/__tests__/categoryService.spec.ts
```
Expected: PASS

- [ ] **Step 6: Commit changes**

```powershell
git add frontend/src/types/index.ts frontend/src/services/categoryService.ts frontend/src/services/__tests__/categoryService.spec.ts
git commit -m "feat(frontend): create categoryService with admin tree, CRUD and tests"
```

---

### Task 3: Admin Navigation & Routing

**Files:**
- Modify: `frontend/src/layouts/AdminLayout.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Update `AdminLayout.tsx` to add "Quản lý Danh mục" menu item**

Trong `frontend/src/layouts/AdminLayout.tsx`:
1. Import `FolderOpenOutlined` từ `@ant-design/icons`
2. Bổ sung mục menu ngay dưới `/admin/products`:
```typescript
    {
      key: '/admin/products',
      icon: <ShoppingOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Sản phẩm',
    },
    {
      key: '/admin/categories',
      icon: <FolderOpenOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Danh mục',
    },
```

- [ ] **Step 2: Update `AppRoutes.tsx` to declare `/admin/categories` route**

Trong `frontend/src/routes/AppRoutes.tsx`:
1. Import component `AdminCategoriesPage`:
```typescript
import { AdminCategoriesPage } from '../pages/Admin/Categories/AdminCategoriesPage';
```
2. Thêm Route vào block AdminLayout với RoleGuard `[ROLES.MANAGER, ROLES.ADMIN]`:
```typescript
          <Route
            path="/admin/categories"
            element={
              <RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminCategoriesPage />
              </RoleGuard>
            }
          />
```

- [ ] **Step 3: Commit navigation & routing changes**

```powershell
git add frontend/src/layouts/AdminLayout.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(frontend): add categories route and sidebar menu entry"
```

---

### Task 4: Category Form Modal Component

**Files:**
- Create: `frontend/src/pages/Admin/Categories/components/CategoryFormModal.tsx`

- [ ] **Step 1: Implement `CategoryFormModal.tsx`**

Modal phục vụ tạo mới, chỉnh sửa và tạo nhanh danh mục con:
- Tự động sinh SEO slug khi gõ tên danh mục (chỉ khi tạo mới hoặc khi slug trùng với slug cũ).
- `TreeSelect` hiển thị cây danh mục cha:
  - Chọn "Không có - Danh mục gốc (Root)".
  - Khi ở chế độ chỉnh sửa (`editingCategory`), tự động vô hiệu hóa (`disabled`) node của chính nó và tất cả node con cháu của nó để ngăn ngừa cyclic hierarchy.
- Tích hợp `ImageUploadDragger` với `folder="categories"`.
- Nhập `sortOrder`, `description`, `isActive`.

Nội dung file `frontend/src/pages/Admin/Categories/components/CategoryFormModal.tsx`:

```tsx
import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, InputNumber, Switch, TreeSelect } from 'antd';
import { ImageUploadDragger } from '../../../../components/admin/ImageUploadDragger';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../../types';

interface CategoryFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateCategoryInput | UpdateCategoryInput) => Promise<void>;
  loading: boolean;
  editingCategory: Category | null;
  parentCategoryForNewChild: Category | null;
  categoriesTree: Category[];
}

export const slugify = (text: string): string => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
  editingCategory,
  parentCategoryForNewChild,
  categoriesTree,
}) => {
  const [form] = Form.useForm();
  const isEditing = Boolean(editingCategory);

  // Helper to build disabled IDs list (self + all descendants)
  const disabledIds = useMemo(() => {
    if (!editingCategory) return new Set<string>();
    const ids = new Set<string>([editingCategory.id]);
    const collectDescendants = (cats: Category[]) => {
      for (const cat of cats) {
        if (ids.has(cat.id)) {
          if (cat.children) {
            cat.children.forEach((c) => ids.add(c.id));
            collectDescendants(cat.children);
          }
        } else if (cat.children) {
          collectDescendants(cat.children);
        }
      }
    };
    collectDescendants(categoriesTree);
    return ids;
  }, [editingCategory, categoriesTree]);

  // Transform tree into TreeSelect data structure
  const treeData = useMemo(() => {
    const mapNode = (cat: Category): any => ({
      title: cat.name,
      value: cat.id,
      key: cat.id,
      disabled: disabledIds.has(cat.id),
      children: cat.children && cat.children.length > 0 ? cat.children.map(mapNode) : undefined,
    });

    return [
      {
        title: '📂 [Danh mục gốc - Không có cha]',
        value: 'ROOT',
        key: 'ROOT',
      },
      ...categoriesTree.map(mapNode),
    ];
  }, [categoriesTree, disabledIds]);

  useEffect(() => {
    if (open) {
      if (editingCategory) {
        form.setFieldsValue({
          name: editingCategory.name,
          slug: editingCategory.slug,
          parentId: editingCategory.parentId || 'ROOT',
          imageUrl: editingCategory.imageUrl || '',
          sortOrder: editingCategory.sortOrder ?? 0,
          isActive: editingCategory.isActive ?? true,
          description: editingCategory.description || '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          parentId: parentCategoryForNewChild ? parentCategoryForNewChild.id : 'ROOT',
          sortOrder: 0,
          isActive: true,
        });
      }
    }
  }, [open, editingCategory, parentCategoryForNewChild, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!isEditing) {
      form.setFieldsValue({ slug: slugify(name) });
    }
  };

  const handleFinish = async (values: any) => {
    const payload: any = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      parentId: values.parentId === 'ROOT' ? null : values.parentId,
      imageUrl: values.imageUrl || null,
      sortOrder: Number(values.sortOrder) || 0,
      isActive: Boolean(values.isActive),
      description: values.description?.trim() || null,
    };
    await onSubmit(payload);
  };

  return (
    <Modal
      title={
        isEditing
          ? `Chỉnh sửa danh mục: ${editingCategory?.name}`
          : parentCategoryForNewChild
          ? `Thêm danh mục con cho "${parentCategoryForNewChild.name}"`
          : 'Thêm danh mục Smartphone mới'
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={600}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo danh mục'}
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false}>
        <Form.Item
          label="Tên danh mục"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên danh mục!' }]}
        >
          <Input
            placeholder="Ví dụ: iPhone 16 Series, Smartphone Gaming..."
            onChange={handleNameChange}
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          label="Đường dẫn (Slug SEO)"
          name="slug"
          rules={[{ required: true, message: 'Vui lòng nhập đường dẫn slug!' }]}
          extra="Được tự động tạo từ tên, bạn có thể chỉnh sửa thủ công nếu muốn."
        >
          <Input placeholder="iphone-16-series" maxLength={120} />
        </Form.Item>

        <Form.Item label="Danh mục cha (Phân cấp)" name="parentId">
          <TreeSelect
            showSearch
            style={{ width: '100%' }}
            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
            placeholder="Chọn danh mục cha"
            allowClear={false}
            treeDefaultExpandAll
            treeData={treeData}
          />
        </Form.Item>

        <Form.Item label="Ảnh đại diện / Icon danh mục" name="imageUrl">
          <ImageUploadDragger folder="categories" />
        </Form.Item>

        <Form.Item label="Thứ tự hiển thị" name="sortOrder">
          <InputNumber min={0} max={9999} style={{ width: '100%' }} placeholder="0" />
        </Form.Item>

        <Form.Item label="Trạng thái kích hoạt" name="isActive" valuePropName="checked">
          <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
        </Form.Item>

        <Form.Item label="Mô tả danh mục" name="description">
          <Input.TextArea rows={3} placeholder="Mô tả ngắn gọn về nhóm smartphone này..." maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

- [ ] **Step 2: Commit `CategoryFormModal.tsx`**

```powershell
git add frontend/src/pages/Admin/Categories/components/CategoryFormModal.tsx
git commit -m "feat(frontend): create CategoryFormModal with TreeSelect, slug auto-gen and image upload"
```

---

### Task 5: Admin Categories Page Component with Tree Table & Stat Cards

**Files:**
- Create: `frontend/src/pages/Admin/Categories/AdminCategoriesPage.tsx`
- Test: `frontend/src/pages/Admin/Categories/__tests__/AdminCategoriesPage.spec.tsx`

- [ ] **Step 1: Write component tests for `AdminCategoriesPage`**

Tạo file `frontend/src/pages/Admin/Categories/__tests__/AdminCategoriesPage.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AdminCategoriesPage } from '../AdminCategoriesPage';
import { categoryService } from '../../../../services/categoryService';

// Mock window.matchMedia for Ant Design
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

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../services/categoryService', () => ({
  categoryService: {
    getAdminCategoryTree: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    activateCategory: vi.fn(),
    deactivateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

const mockTreeData = [
  {
    id: 'cat-1',
    name: 'Điện thoại iOS',
    slug: 'dien-thoai-ios',
    isActive: true,
    sortOrder: 1,
    imageUrl: 'https://example.com/ios.png',
    _count: { products: 15, children: 1 },
    children: [
      {
        id: 'cat-1-1',
        name: 'iPhone 16 Series',
        slug: 'iphone-16-series',
        parentId: 'cat-1',
        isActive: true,
        sortOrder: 1,
        imageUrl: null,
        _count: { products: 6, children: 0 },
        children: [],
      },
    ],
  },
  {
    id: 'cat-2',
    name: 'Điện thoại Android',
    slug: 'dien-thoai-android',
    isActive: false,
    sortOrder: 2,
    imageUrl: null,
    _count: { products: 10, children: 0 },
    children: [],
  },
];

describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders category tree table and stat cards correctly', async () => {
    (categoryService.getAdminCategoryTree as any).mockResolvedValue(mockTreeData);

    render(<AdminCategoriesPage />);

    expect(screen.getByText('Quản lý Danh mục Smartphone')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Điện thoại iOS')).toBeInTheDocument();
      expect(screen.getByText('Điện thoại Android')).toBeInTheDocument();
    });

    // Check stats (Total categories = 3, Active = 2, Inactive = 1, Products = 31)
    expect(screen.getByText('Tổng số danh mục')).toBeInTheDocument();
    expect(screen.getByText('Đang kích hoạt')).toBeInTheDocument();
    expect(screen.getByText('Tạm ẩn')).toBeInTheDocument();
    expect(screen.getByText('Tổng Smartphone')).toBeInTheDocument();
  });

  it('opens create modal when clicking "+ Thêm danh mục mới"', async () => {
    (categoryService.getAdminCategoryTree as any).mockResolvedValue(mockTreeData);

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Điện thoại iOS')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /\+ Thêm danh mục mới/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Thêm danh mục Smartphone mới')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npm --prefix frontend test -- src/pages/Admin/Categories/__tests__/AdminCategoriesPage.spec.tsx
```
Expected: FAIL (Cannot find module '../AdminCategoriesPage')

- [ ] **Step 3: Implement `frontend/src/pages/Admin/Categories/AdminCategoriesPage.tsx`**

```tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Input,
  Select,
  Switch,
  message,
  Typography,
  Card,
  Avatar,
  Popconfirm,
  Tooltip,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FolderOpenOutlined,
  MobileOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { categoryService } from '../../../services/categoryService';
import { CategoryFormModal } from './components/CategoryFormModal';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../types';

const { Title, Text } = Typography;

export const AdminCategoriesPage: React.FC = () => {
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentForNewChild, setParentForNewChild] = useState<Category | null>(null);

  // Recursively collect all keys for Expand All
  const getAllKeys = useCallback((items: Category[]): string[] => {
    let keys: string[] = [];
    for (const item of items) {
      keys.push(item.id);
      if (item.children && item.children.length > 0) {
        keys = keys.concat(getAllKeys(item.children));
      }
    }
    return keys;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const tree = await categoryService.getAdminCategoryTree();
      setCategoriesTree(tree);
      // Auto expand root level
      setExpandedRowKeys(tree.map((c) => c.id));
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Compute statistics from tree recursively
  const stats = useMemo(() => {
    let total = 0;
    let active = 0;
    let inactive = 0;
    let totalProducts = 0;

    const traverse = (cats: Category[]) => {
      for (const cat of cats) {
        total++;
        if (cat.isActive) active++;
        else inactive++;
        totalProducts += cat._count?.products || 0;
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children);
        }
      }
    };

    traverse(categoriesTree);
    return { total, active, inactive, totalProducts };
  }, [categoriesTree]);

  // Filter tree based on search and status
  const filteredTree = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    const filterNode = (node: Category): Category | null => {
      const matchesSearch =
        !keyword ||
        node.name.toLowerCase().includes(keyword) ||
        node.slug.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && node.isActive) ||
        (statusFilter === 'INACTIVE' && !node.isActive);

      // Filter children first
      const filteredChildren: Category[] = [];
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const matchingChild = filterNode(child);
          if (matchingChild) filteredChildren.push(matchingChild);
        }
      }

      // Keep node if it matches directly or has matching children
      if ((matchesSearch && matchesStatus) || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : undefined,
        };
      }

      return null;
    };

    return categoriesTree.map(filterNode).filter((n): n is Category => n !== null);
  }, [categoriesTree, searchKeyword, statusFilter]);

  // Handlers
  const handleOpenCreateRoot = () => {
    setEditingCategory(null);
    setParentForNewChild(null);
    setIsModalOpen(true);
  };

  const handleOpenAddChild = (parent: Category) => {
    setEditingCategory(null);
    setParentForNewChild(parent);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setParentForNewChild(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: CreateCategoryInput | UpdateCategoryInput) => {
    setActionLoading(true);
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, values);
        message.success('Cập nhật danh mục thành công!');
      } else {
        await categoryService.createCategory(values as CreateCategoryInput);
        message.success('Thêm danh mục mới thành công!');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (record: Category, checked: boolean) => {
    try {
      if (checked) {
        await categoryService.activateCategory(record.id);
        message.success(`Đã kích hoạt danh mục "${record.name}"`);
      } else {
        await categoryService.deactivateCategory(record.id);
        message.info(`Đã tạm ẩn danh mục "${record.name}"`);
      }
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể đổi trạng thái');
    }
  };

  const handleDelete = async (record: Category) => {
    try {
      await categoryService.deleteCategory(record.id);
      message.success(`Đã xóa danh mục "${record.name}"`);
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể xóa danh mục');
    }
  };

  const columns: ColumnsType<Category> = [
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Category) => (
        <Space orientation="horizontal" size={10}>
          {record.imageUrl ? (
            <Avatar src={record.imageUrl} shape="square" size={32} />
          ) : (
            <Avatar
              icon={<MobileOutlined />}
              shape="square"
              size={32}
              style={{ backgroundColor: record.parentId ? '#f0f5ff' : '#1677ff', color: record.parentId ? '#2f54eb' : '#fff' }}
            />
          )}
          <div>
            <Text strong={!record.parentId} style={{ fontSize: record.parentId ? 13 : 14 }}>
              {name}
            </Text>
            {record.description && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.description}
                </Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Đường dẫn (Slug)',
      dataIndex: 'slug',
      key: 'slug',
      width: 200,
      render: (slug: string) => (
        <Text code copyable={{ text: slug }} style={{ fontSize: 12 }}>
          {slug}
        </Text>
      ),
    },
    {
      title: 'Số Smartphone',
      key: 'productCount',
      width: 140,
      align: 'center',
      render: (_: any, record: Category) => {
        const count = record._count?.products || 0;
        return (
          <Tag color={count > 0 ? 'blue' : 'default'} style={{ borderRadius: 10, padding: '0 8px' }}>
            {count} sản phẩm
          </Tag>
        );
      },
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 90,
      align: 'center',
      render: (val: number) => <Text>{val ?? 0}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      align: 'center',
      render: (isActive: boolean, record: Category) => (
        <Tooltip title={isActive ? 'Nhấn để tạm ẩn danh mục' : 'Nhấn để kích hoạt danh mục'}>
          <Switch
            checked={isActive}
            onChange={(checked) => void handleToggleStatus(record, checked)}
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 220,
      align: 'right',
      render: (_: any, record: Category) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            icon={<PlusOutlined />}
            onClick={() => handleOpenAddChild(record)}
          >
            + Con
          </Button>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title={`Xác nhận xóa danh mục "${record.name}"?`}
            description="Lưu ý: Không thể xóa danh mục nếu đang có sản phẩm hoặc danh mục con."
            onConfirm={() => void handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpenOutlined style={{ color: '#1677ff' }} /> Quản lý Danh mục Smartphone
          </Title>
          <Text type="secondary">
            Cấu hình cây phân cấp danh mục smartphone, quản lý trạng thái hiển thị và liên kết sản phẩm.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateRoot}>
            + Thêm danh mục mới
          </Button>
        </Space>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Card size="small" style={{ borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tổng số danh mục
          </Text>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff', marginTop: 4 }}>
            {stats.total}
          </div>
        </Card>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Đang kích hoạt
          </Text>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>
            {stats.active}
          </div>
        </Card>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tạm ẩn
          </Text>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#faad14', marginTop: 4 }}>
            {stats.inactive}
          </div>
        </Card>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tổng Smartphone
          </Text>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#722ed1', marginTop: 4 }}>
            {stats.totalProducts} máy
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8 }}
        bodyStyle={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
      >
        <Space wrap>
          <Input
            placeholder="Tìm theo tên hoặc slug..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 170 }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'ACTIVE', label: 'Đang kích hoạt' },
              { value: 'INACTIVE', label: 'Tạm ẩn' },
            ]}
          />
        </Space>

        <Space wrap>
          <Button size="small" onClick={() => setExpandedRowKeys(getAllKeys(categoriesTree))}>
            Mở rộng tất cả
          </Button>
          <Button size="small" onClick={() => setExpandedRowKeys([])}>
            Thu gọn
          </Button>
        </Space>
      </Card>

      {/* Tree Table */}
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: 'hidden' }}>
        <Table<Category>
          rowKey="id"
          columns={columns}
          dataSource={filteredTree}
          loading={loading}
          pagination={false}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            rowExpandable: (record) => Boolean(record.children && record.children.length > 0),
          }}
          locale={{
            emptyText: (
              <Empty
                description="Chưa có danh mục smartphone nào"
                style={{ padding: '32px 0' }}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateRoot}>
                  Tạo danh mục đầu tiên
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <CategoryFormModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        loading={actionLoading}
        editingCategory={editingCategory}
        parentCategoryForNewChild={parentForNewChild}
        categoriesTree={categoriesTree}
      />
    </div>
  );
};
```

- [ ] **Step 4: Run component tests to verify they pass**

Run:
```powershell
npm --prefix frontend test -- src/pages/Admin/Categories/__tests__/AdminCategoriesPage.spec.tsx
```
Expected: PASS

- [ ] **Step 5: Commit `AdminCategoriesPage.tsx` and its test**

```powershell
git add frontend/src/pages/Admin/Categories/AdminCategoriesPage.tsx frontend/src/pages/Admin/Categories/__tests__/AdminCategoriesPage.spec.tsx
git commit -m "feat(frontend): create AdminCategoriesPage with Ant Design tree table, stat cards and filters"
```

---

### Task 6: Full Integration Verification & End-to-End Build Verification

**Files:**
- Test all components and end-to-end builds

- [ ] **Step 1: Run all backend tests**

Run:
```powershell
npm --prefix backend test
```
Expected: All backend unit tests pass with 0 errors.

- [ ] **Step 2: Run all frontend tests**

Run:
```powershell
npm --prefix frontend test
```
Expected: All frontend tests pass with 0 errors.

- [ ] **Step 3: Run backend build check**

Run:
```powershell
npm --prefix backend run build
```
Expected: Build succeeds without TypeScript or compilation errors.

- [ ] **Step 4: Run frontend build check**

Run:
```powershell
npm --prefix frontend run build
```
Expected: Vite build succeeds with 0 type errors.

- [ ] **Step 5: Final review and clean commit**

```powershell
git status
```
Verify no untracked or dangling files.
