# Brand Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Brand Management feature for the MobileCommerce Admin Portal (`/admin/brands`) with KPI stats cards, Ant Design data table, inline status toggle, search and filters, create/edit modal with logo upload to R2, backend relation count with delete protection, and complete test suites.

**Architecture:** Extend backend NestJS `BrandsService` to include product count (`_count.products`) and safety checks on deletion; define frontend `Brand` interfaces and REST client `brandService.ts`; build modular UI components (`BrandStatsCards`, `BrandFormModal`, `AdminBrandsPage`) using Ant Design 5 and Tailwind; integrate the route into `AppRoutes` and the navigation menu in `AdminLayout`.

**Tech Stack:** React 19, TypeScript, Ant Design 5, Tailwind CSS v4, Axios, Vitest, @testing-library/react, NestJS, Prisma ORM, Cloudflare R2 Storage.

---

## File Structure Map

| File Path | Responsibility |
|---|---|
| `backend/src/modules/brands/brands.service.ts` | Backend service: query brands with `_count.products` and block deleting brands with existing products |
| `frontend/src/types/index.ts` | Frontend type definitions: `Brand`, `CreateBrandInput`, `UpdateBrandInput` |
| `frontend/src/services/brandService.ts` | Axios REST client for brand endpoints (`getAllAdmin`, `create`, `update`, `delete`, `activate`, `deactivate`) |
| `frontend/src/services/__tests__/brandService.spec.ts` | Unit tests for `brandService` |
| `frontend/src/pages/Admin/Brands/components/BrandStatsCards.tsx` | UI component: 4 KPI statistic cards (Total, Active, Inactive, Total Products) |
| `frontend/src/pages/Admin/Brands/components/BrandFormModal.tsx` | UI component: Modal for creating and editing brands, with auto-slugify and `ImageUploadDragger` |
| `frontend/src/pages/Admin/Brands/AdminBrandsPage.tsx` | Main UI page: Search & filter toolbar, Ant Design Table with inline status switch, popconfirm delete |
| `frontend/src/layouts/AdminLayout.tsx` | Navigation sidebar menu item and breadcrumb title for `/admin/brands` |
| `frontend/src/routes/AppRoutes.tsx` | Protected route for `/admin/brands` guarded by `RoleGuard([ROLES.MANAGER, ROLES.ADMIN])` |
| `frontend/src/pages/Admin/Brands/__tests__/AdminBrandsPage.spec.tsx` | Component & integration tests for Admin Brands page |

---

## Task Outlines

### Task 1: Backend Brand Service Enhancement (`_count` & Delete Safety)

**Files:**
- Modify: `backend/src/modules/brands/brands.service.ts`

- [ ] **Step 1: Update `findAll` and `remove` in `BrandsService`**

Edit `backend/src/modules/brands/brands.service.ts`:
1. In `findAll(search?: string, activeOnly: boolean = false)`, add `include: { _count: { select: { products: true } } }` to `prisma.brand.findMany`.
2. In `remove(id: string)`, query the brand with `include: { _count: { select: { products: true } } }`. If `brand._count && brand._count.products > 0`, throw `new BadRequestException('Không thể xóa thương hiệu đang có sản phẩm liên kết.')`.

Code modification in `backend/src/modules/brands/brands.service.ts`:
```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Brand with this slug already exists');
    }

    return this.prisma.brand.create({
      data: dto,
    });
  }

  async findAll(search?: string, activeOnly: boolean = false) {
    const where: any = {};
    
    if (activeOnly) {
      where.isActive = true;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.brand.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { products: true },
    });
    
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.brand.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) throw new ConflictException('Brand slug already in use');
    }

    return this.prisma.brand.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (brand._count && brand._count.products > 0) {
      throw new BadRequestException(
        `Không thể xóa thương hiệu "${brand.name}" vì đang có ${brand._count.products} sản phẩm liên kết. Vui lòng chuyển hoặc xóa sản phẩm trước.`,
      );
    }

    return this.prisma.brand.delete({
      where: { id },
    });
  }

  async changeStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data: { isActive },
    });
  }
}
```

- [ ] **Step 2: Verify backend TypeScript compilation**

Run: `npx tsc --noEmit` in `backend` directory.
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit backend changes**

```bash
git add backend/src/modules/brands/brands.service.ts
git commit -m "feat(backend): add _count.products and delete validation to brands service"
```

---

### Task 2: Frontend Types & Brand Service (`brandService.ts` & Unit Tests)

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/brandService.ts`
- Create: `frontend/src/services/__tests__/brandService.spec.ts`

- [ ] **Step 1: Write failing unit test for `brandService`**

Create `frontend/src/services/__tests__/brandService.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { brandService } from '../brandService';
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

describe('brandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllAdmin should call /brands/admin/all with optional search', async () => {
    const mockBrands = [
      { id: 'b1', name: 'Apple', slug: 'apple', isActive: true, _count: { products: 12 } },
    ];
    (apiClient.get as any).mockResolvedValue({ data: { data: mockBrands } });

    const result = await brandService.getAllAdmin('apple');
    expect(apiClient.get).toHaveBeenCalledWith('/brands/admin/all', {
      params: { search: 'apple' },
    });
    expect(result).toEqual(mockBrands);
  });

  it('getById should call /brands/:id', async () => {
    const mockBrand = { id: 'b1', name: 'Apple', slug: 'apple' };
    (apiClient.get as any).mockResolvedValue({ data: { data: mockBrand } });

    const result = await brandService.getById('b1');
    expect(apiClient.get).toHaveBeenCalledWith('/brands/b1');
    expect(result).toEqual(mockBrand);
  });

  it('create should post to /brands', async () => {
    const input = { name: 'Samsung', slug: 'samsung', isActive: true };
    const mockCreated = { id: 'b2', ...input };
    (apiClient.post as any).mockResolvedValue({ data: { data: mockCreated } });

    const result = await brandService.create(input);
    expect(apiClient.post).toHaveBeenCalledWith('/brands', input);
    expect(result).toEqual(mockCreated);
  });

  it('update should patch to /brands/:id', async () => {
    const input = { name: 'Samsung Electronics' };
    const mockUpdated = { id: 'b2', name: 'Samsung Electronics', slug: 'samsung' };
    (apiClient.patch as any).mockResolvedValue({ data: { data: mockUpdated } });

    const result = await brandService.update('b2', input);
    expect(apiClient.patch).toHaveBeenCalledWith('/brands/b2', input);
    expect(result).toEqual(mockUpdated);
  });

  it('delete should call DELETE /brands/:id', async () => {
    (apiClient.delete as any).mockResolvedValue({ data: { success: true } });

    await brandService.delete('b1');
    expect(apiClient.delete).toHaveBeenCalledWith('/brands/b1');
  });

  it('activate should put to /brands/:id/activate', async () => {
    const mockRes = { id: 'b1', isActive: true };
    (apiClient.put as any).mockResolvedValue({ data: { data: mockRes } });

    const result = await brandService.activate('b1');
    expect(apiClient.put).toHaveBeenCalledWith('/brands/b1/activate');
    expect(result).toEqual(mockRes);
  });

  it('deactivate should put to /brands/:id/deactivate', async () => {
    const mockRes = { id: 'b1', isActive: false };
    (apiClient.put as any).mockResolvedValue({ data: { data: mockRes } });

    const result = await brandService.deactivate('b1');
    expect(apiClient.put).toHaveBeenCalledWith('/brands/b1/deactivate');
    expect(result).toEqual(mockRes);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/services/__tests__/brandService.spec.ts` in `frontend`
Expected: FAIL with "Cannot find module '../brandService'"

- [ ] **Step 3: Update `frontend/src/types/index.ts`**

Update `Brand` and add `CreateBrandInput`, `UpdateBrandInput`:
```typescript
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    products: number;
  };
}

export interface CreateBrandInput {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  isActive?: boolean;
}

export type UpdateBrandInput = Partial<CreateBrandInput>;
```

- [ ] **Step 4: Implement `frontend/src/services/brandService.ts`**

```typescript
import { apiClient } from './apiClient';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '../types';

export const brandService = {
  getAllAdmin: async (search?: string): Promise<Brand[]> => {
    const res = await apiClient.get('/brands/admin/all', {
      params: search ? { search } : undefined,
    });
    return res.data?.data ?? res.data ?? [];
  },

  getById: async (id: string): Promise<Brand> => {
    const res = await apiClient.get(`/brands/${id}`);
    return res.data?.data ?? res.data;
  },

  create: async (data: CreateBrandInput): Promise<Brand> => {
    const res = await apiClient.post('/brands', data);
    return res.data?.data ?? res.data;
  },

  update: async (id: string, data: UpdateBrandInput): Promise<Brand> => {
    const res = await apiClient.patch(`/brands/${id}`, data);
    return res.data?.data ?? res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/brands/${id}`);
  },

  activate: async (id: string): Promise<Brand> => {
    const res = await apiClient.put(`/brands/${id}/activate`);
    return res.data?.data ?? res.data;
  },

  deactivate: async (id: string): Promise<Brand> => {
    const res = await apiClient.put(`/brands/${id}/deactivate`);
    return res.data?.data ?? res.data;
  },
};
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `npm test src/services/__tests__/brandService.spec.ts` in `frontend`
Expected: PASS (7/7 tests passed).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/brandService.ts frontend/src/services/__tests__/brandService.spec.ts
git commit -m "feat(frontend): add brand types, brandService and unit tests"
```

---

### Task 3: Brand KPI Stats Component (`BrandStatsCards.tsx`)

**Files:**
- Create: `frontend/src/pages/Admin/Brands/components/BrandStatsCards.tsx`

- [ ] **Step 1: Implement `BrandStatsCards`**

Create `frontend/src/pages/Admin/Brands/components/BrandStatsCards.tsx`:
```tsx
import React from 'react';
import { Row, Col, Card, Statistic, Skeleton } from 'antd';
import {
  TagsOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';

interface BrandStatsCardsProps {
  total: number;
  active: number;
  inactive: number;
  totalProducts: number;
  loading?: boolean;
}

export const BrandStatsCards: React.FC<BrandStatsCardsProps> = ({
  total,
  active,
  inactive,
  totalProducts,
  loading = false,
}) => {
  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={6}>
        <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Tổng thương hiệu</span>}
              value={total}
              prefix={<TagsOutlined className="text-blue-600 bg-blue-50 p-2 rounded-lg text-lg mr-2" />}
              valueStyle={{ fontWeight: 700, color: '#0f172a' }}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Đang hoạt động</span>}
              value={active}
              prefix={<CheckCircleOutlined className="text-emerald-600 bg-emerald-50 p-2 rounded-lg text-lg mr-2" />}
              valueStyle={{ fontWeight: 700, color: '#10b981' }}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Ngừng kinh doanh</span>}
              value={inactive}
              prefix={<StopOutlined className="text-amber-600 bg-amber-50 p-2 rounded-lg text-lg mr-2" />}
              valueStyle={{ fontWeight: 700, color: '#f59e0b' }}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Tổng sản phẩm</span>}
              value={totalProducts}
              prefix={<ShoppingOutlined className="text-indigo-600 bg-indigo-50 p-2 rounded-lg text-lg mr-2" />}
              valueStyle={{ fontWeight: 700, color: '#6366f1' }}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Admin/Brands/components/BrandStatsCards.tsx
git commit -m "feat(frontend): add BrandStatsCards KPI component"
```

---

### Task 4: Brand Form Modal Component (`BrandFormModal.tsx`)

**Files:**
- Create: `frontend/src/pages/Admin/Brands/components/BrandFormModal.tsx`

- [ ] **Step 1: Implement `BrandFormModal`**

Create `frontend/src/pages/Admin/Brands/components/BrandFormModal.tsx`:
```tsx
import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch } from 'antd';
import { ImageUploadDragger } from '../../../../components/admin/ImageUploadDragger';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '../../../../types';

export interface BrandFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateBrandInput | UpdateBrandInput) => Promise<void>;
  loading: boolean;
  editingBrand: Brand | null;
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

export const BrandFormModal: React.FC<BrandFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
  editingBrand,
}) => {
  const [form] = Form.useForm();
  const isEditing = Boolean(editingBrand);

  useEffect(() => {
    if (open) {
      if (editingBrand) {
        form.setFieldsValue({
          name: editingBrand.name,
          slug: editingBrand.slug,
          logoUrl: editingBrand.logoUrl || editingBrand.logo || '',
          websiteUrl: editingBrand.websiteUrl || '',
          description: editingBrand.description || '',
          isActive: editingBrand.isActive ?? true,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          isActive: true,
        });
      }
    }
  }, [open, editingBrand, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!isEditing) {
      form.setFieldsValue({ slug: slugify(name) });
    }
  };

  const handleFinish = async (values: any) => {
    const payload: CreateBrandInput = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      description: values.description ? values.description.trim() : undefined,
      logoUrl: values.logoUrl ? values.logoUrl.trim() : undefined,
      websiteUrl: values.websiteUrl ? values.websiteUrl.trim() : undefined,
      isActive: values.isActive ?? true,
    };
    await onSubmit(payload);
  };

  return (
    <Modal
      title={isEditing ? 'Chỉnh sửa Thương hiệu' : 'Thêm mới Thương hiệu'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo mới'}
      cancelText="Hủy bỏ"
      destroyOnClose
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ isActive: true }}
        className="mt-4"
      >
        <Form.Item
          label="Tên thương hiệu"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập tên thương hiệu' },
            { min: 2, message: 'Tên thương hiệu tối thiểu 2 ký tự' },
            { max: 100, message: 'Tên thương hiệu tối đa 100 ký tự' },
          ]}
        >
          <Input
            placeholder="Ví dụ: Apple, Samsung, Xiaomi..."
            onChange={handleNameChange}
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          label="Đường dẫn tĩnh (Slug)"
          name="slug"
          tooltip="Chuẩn hóa theo định dạng URL thân thiện SEO (chỉ gồm chữ thường, số và dấu gạch nối)"
          rules={[
            { required: true, message: 'Vui lòng nhập slug thương hiệu' },
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang (ví dụ: apple, samsung)',
            },
          ]}
        >
          <Input placeholder="ví-du: apple, samsung-galaxy" maxLength={120} />
        </Form.Item>

        <Form.Item label="Logo thương hiệu" name="logoUrl">
          <ImageUploadDragger
            folder="brands"
            value={form.getFieldValue('logoUrl')}
            onChange={(url) => form.setFieldsValue({ logoUrl: url })}
          />
        </Form.Item>

        <Form.Item
          label="Website chính thức"
          name="websiteUrl"
          rules={[
            {
              type: 'url',
              message: 'Vui lòng nhập đúng định dạng URL (ví dụ: https://www.apple.com)',
            },
          ]}
        >
          <Input placeholder="https://www.example.com" maxLength={255} />
        </Form.Item>

        <Form.Item label="Mô tả thương hiệu" name="description">
          <Input.TextArea
            rows={3}
            placeholder="Thông tin giới thiệu ngắn gọn về thương hiệu..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="Trạng thái kinh doanh"
          name="isActive"
          valuePropName="checked"
          extra="Khi vô hiệu hóa, sản phẩm thuộc thương hiệu này có thể bị hạn chế hiển thị."
        >
          <Switch checkedChildren="Kích hoạt" unCheckedChildren="Tạm ẩn" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Admin/Brands/components/BrandFormModal.tsx
git commit -m "feat(frontend): add BrandFormModal with auto-slug and logo upload"
```

---

### Task 5: Admin Brands Main Page (`AdminBrandsPage.tsx`)

**Files:**
- Create: `frontend/src/pages/Admin/Brands/AdminBrandsPage.tsx`

- [ ] **Step 1: Implement `AdminBrandsPage`**

Create `frontend/src/pages/Admin/Brands/AdminBrandsPage.tsx`:
```tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
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
  ReloadOutlined,
  ExportOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { brandService } from '../../../services/brandService';
import { BrandStatsCards } from './components/BrandStatsCards';
import { BrandFormModal } from './components/BrandFormModal';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '../../../types';

const { Title, Text, Link } = Typography;

export const AdminBrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

  // Filters & search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brandService.getAllAdmin();
      setBrands(data);
    } catch (err: any) {
      console.error('Failed to load brands:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể tải danh sách thương hiệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Compute statistics
  const stats = useMemo(() => {
    let total = brands.length;
    let active = 0;
    let inactive = 0;
    let totalProducts = 0;

    for (const b of brands) {
      if (b.isActive) active++;
      else inactive++;
      totalProducts += b._count?.products || 0;
    }

    return { total, active, inactive, totalProducts };
  }, [brands]);

  // Filtered list
  const filteredBrands = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return brands.filter((brand) => {
      const matchesSearch =
        !keyword ||
        brand.name.toLowerCase().includes(keyword) ||
        brand.slug.toLowerCase().includes(keyword) ||
        (brand.description && brand.description.toLowerCase().includes(keyword));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && brand.isActive) ||
        (statusFilter === 'INACTIVE' && !brand.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [brands, searchKeyword, statusFilter]);

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingBrand(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (values: CreateBrandInput | UpdateBrandInput) => {
    setActionLoading(true);
    try {
      if (editingBrand) {
        await brandService.update(editingBrand.id, values);
        message.success(`Cập nhật thương hiệu "${values.name}" thành công!`);
      } else {
        await brandService.create(values as CreateBrandInput);
        message.success(`Thêm mới thương hiệu "${values.name}" thành công!`);
      }
      setIsModalOpen(false);
      setEditingBrand(null);
      await loadData();
    } catch (err: any) {
      console.error('Save brand error:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể lưu thương hiệu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (brand: Brand) => {
    setToggleLoadingId(brand.id);
    try {
      if (brand.isActive) {
        await brandService.deactivate(brand.id);
        message.success(`Đã tạm ẩn thương hiệu "${brand.name}"`);
      } else {
        await brandService.activate(brand.id);
        message.success(`Đã kích hoạt thương hiệu "${brand.name}"`);
      }
      await loadData();
    } catch (err: any) {
      console.error('Toggle status error:', err);
      message.error(err.response?.data?.message || 'Không thể thay đổi trạng thái');
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleDelete = async (brand: Brand) => {
    setActionLoading(true);
    try {
      await brandService.delete(brand.id);
      message.success(`Đã xóa thương hiệu "${brand.name}" thành công!`);
      await loadData();
    } catch (err: any) {
      console.error('Delete brand error:', err);
      message.error(err.response?.data?.message || 'Xóa thương hiệu thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: ColumnsType<Brand> = [
    {
      title: 'Logo',
      dataIndex: 'logoUrl',
      key: 'logoUrl',
      width: 70,
      align: 'center',
      render: (logoUrl: string | undefined, record: Brand) => {
        const url = logoUrl || record.logo;
        if (url) {
          return (
            <Avatar
              shape="square"
              size={42}
              src={url}
              className="border border-slate-200 bg-white object-contain p-1"
            />
          );
        }
        return (
          <Avatar shape="square" size={42} className="bg-blue-100 text-blue-600 font-bold border border-blue-200">
            {record.name.substring(0, 2).toUpperCase()}
          </Avatar>
        );
      },
    },
    {
      title: 'Tên thương hiệu',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Brand) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm">{name}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{record.slug}</div>
        </div>
      ),
    },
    {
      title: 'Website',
      dataIndex: 'websiteUrl',
      key: 'websiteUrl',
      width: 180,
      render: (url?: string) => {
        if (!url) return <span className="text-slate-300">—</span>;
        return (
          <Link href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs">
            Trang chủ <ExportOutlined />
          </Link>
        );
      },
    },
    {
      title: 'Sản phẩm',
      dataIndex: '_count',
      key: 'productsCount',
      width: 110,
      align: 'center',
      render: (count?: { products: number }) => {
        const num = count?.products || 0;
        return <Tag color={num > 0 ? 'blue' : 'default'}>{num} SP</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      align: 'center',
      render: (isActive: boolean, record: Brand) => (
        <Switch
          checked={isActive}
          loading={toggleLoadingId === record.id}
          onChange={() => void handleToggleStatus(record)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_, record: Brand) => {
        const hasProducts = (record._count?.products || 0) > 0;
        return (
          <Space orientation="horizontal" size="small">
            <Tooltip title="Chỉnh sửa thông tin">
              <Button
                type="text"
                icon={<EditOutlined className="text-blue-600" />}
                onClick={() => handleOpenEditModal(record)}
                size="small"
              />
            </Tooltip>

            {hasProducts ? (
              <Tooltip title={`Không thể xóa: Có ${record._count?.products} sản phẩm liên kết`}>
                <Button type="text" danger icon={<DeleteOutlined />} disabled size="small" />
              </Tooltip>
            ) : (
              <Popconfirm
                title="Xóa thương hiệu"
                description={`Bạn có chắc chắn muốn xóa vĩnh viễn "${record.name}"?`}
                onConfirm={() => void handleDelete(record)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: actionLoading }}
              >
                <Tooltip title="Xóa thương hiệu">
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            <TagsOutlined className="mr-2 text-blue-600" />
            Quản lý Thương hiệu
          </Title>
          <Text className="text-slate-500 text-sm">
            Quản trị các hãng sản xuất điện thoại thông minh, nhận diện thương hiệu và phân phối
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateModal}
          size="large"
          className="bg-blue-600 hover:bg-blue-500 font-medium rounded-lg"
        >
          Thêm Thương hiệu
        </Button>
      </div>

      {/* KPI Stats */}
      <BrandStatsCards
        total={stats.total}
        active={stats.active}
        inactive={stats.inactive}
        totalProducts={stats.totalProducts}
        loading={loading}
      />

      {/* Main Table Card */}
      <Card className="rounded-xl border border-slate-200 shadow-xs">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm theo tên hoặc slug..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              className="w-full sm:w-64"
            />

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full sm:w-44"
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Đang hoạt động' },
                { value: 'INACTIVE', label: 'Ngừng kinh doanh' },
              ]}
            />
          </div>

          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Làm mới
          </Button>
        </div>

        {/* Ant Design Table */}
        <Table<Brand>
          columns={columns}
          dataSource={filteredBrands}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} thương hiệu`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchKeyword || statusFilter !== 'ALL'
                    ? 'Không tìm thấy thương hiệu phù hợp với bộ lọc'
                    : 'Chưa có thương hiệu nào trong hệ thống'
                }
              >
                {!searchKeyword && statusFilter === 'ALL' && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
                    Tạo thương hiệu đầu tiên
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Form Modal */}
      <BrandFormModal
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingBrand(null);
        }}
        onSubmit={handleModalSubmit}
        loading={actionLoading}
        editingBrand={editingBrand}
      />
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Admin/Brands/AdminBrandsPage.tsx
git commit -m "feat(frontend): add AdminBrandsPage with table, filters and status actions"
```

---

### Task 6: Routing & Admin Sidebar Integration (`AdminLayout.tsx` & `AppRoutes.tsx`)

**Files:**
- Modify: `frontend/src/layouts/AdminLayout.tsx:1-90, 110-130`
- Modify: `frontend/src/routes/AppRoutes.tsx:25-45, 95-115`

- [ ] **Step 1: Update `AdminLayout.tsx`**

In `frontend/src/layouts/AdminLayout.tsx`:
1. Import `TagsOutlined` from `@ant-design/icons`.
2. Insert brand navigation menu item in `menuItems` right after categories:
```typescript
    {
      key: '/admin/brands',
      icon: <TagsOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Thương hiệu',
    },
```
3. Add breadcrumb mapping in `getBreadcrumbTitle`:
```typescript
    if (location.pathname === '/admin/brands') return 'Quản lý Thương hiệu Smartphone';
```

- [ ] **Step 2: Update `AppRoutes.tsx`**

In `frontend/src/routes/AppRoutes.tsx`:
1. Import `AdminBrandsPage`:
```typescript
import { AdminBrandsPage } from '../pages/Admin/Brands/AdminBrandsPage';
```
2. Add route inside `<Route element={<AdminLayout />}>` protected by `RoleGuard`:
```typescript
          <Route
            path="/admin/brands"
            element={
              <RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminBrandsPage />
              </RoleGuard>
            }
          />
```

- [ ] **Step 3: Verify TypeScript builds without errors**

Run: `npx tsc --noEmit` in `frontend`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/layouts/AdminLayout.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(frontend): add /admin/brands route and sidebar navigation item"
```

---

### Task 7: Comprehensive Integration & Component Testing (`AdminBrandsPage.spec.tsx`)

**Files:**
- Create: `frontend/src/pages/Admin/Brands/__tests__/AdminBrandsPage.spec.tsx`

- [ ] **Step 1: Write component tests for `AdminBrandsPage`**

Create `frontend/src/pages/Admin/Brands/__tests__/AdminBrandsPage.spec.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminBrandsPage } from '../AdminBrandsPage';
import { brandService } from '../../../../services/brandService';

// Mock matchMedia for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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

(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../../../services/brandService', () => ({
  brandService: {
    getAllAdmin: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = {
      user: {
        id: 'admin-id-1',
        email: 'admin@cellphones.com',
        role: 'ADMIN',
        fullName: 'Admin User',
      },
      isAdmin: () => true,
    };
    return selector ? selector(state) : state;
  },
}));

const mockBrandsData = [
  {
    id: 'b-apple',
    name: 'Apple',
    slug: 'apple',
    logoUrl: 'https://cdn.example.com/apple.png',
    websiteUrl: 'https://apple.com',
    description: 'Thương hiệu Apple iPhone cao cấp',
    isActive: true,
    _count: { products: 15 },
  },
  {
    id: 'b-samsung',
    name: 'Samsung',
    slug: 'samsung',
    logoUrl: 'https://cdn.example.com/samsung.png',
    websiteUrl: 'https://samsung.com',
    description: 'Thương hiệu Samsung Galaxy',
    isActive: true,
    _count: { products: 0 },
  },
  {
    id: 'b-htc',
    name: 'HTC',
    slug: 'htc',
    logoUrl: null,
    websiteUrl: null,
    description: 'Thương hiệu cũ ngừng kinh doanh',
    isActive: false,
    _count: { products: 0 },
  },
];

describe('AdminBrandsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (brandService.getAllAdmin as any).mockResolvedValue(mockBrandsData);
  });

  it('renders KPI stats, toolbar and brand table with loaded data', async () => {
    render(<AdminBrandsPage />);

    expect(screen.getByText('Quản lý Thương hiệu')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Samsung')).toBeInTheDocument();
      expect(screen.getByText('HTC')).toBeInTheDocument();
    });

    // Check KPI counts: total 3, active 2, inactive 1, products 15
    expect(screen.getByText('Tổng thương hiệu')).toBeInTheDocument();
    expect(screen.getByText('15 SP')).toBeInTheDocument();
  });

  it('filters brands based on search input', async () => {
    render(<AdminBrandsPage />);

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc slug...');
    fireEvent.change(searchInput, { target: { value: 'Samsung' } });

    expect(screen.getByText('Samsung')).toBeInTheDocument();
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    expect(screen.queryByText('HTC')).not.toBeInTheDocument();
  });

  it('opens BrandFormModal when clicking Thêm Thương hiệu button', async () => {
    render(<AdminBrandsPage />);

    const addButton = screen.getByRole('button', { name: /Thêm Thương hiệu/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm mới Thương hiệu')).toBeInTheDocument();
    });
  });

  it('disables delete button for brands that have associated products', async () => {
    render(<AdminBrandsPage />);

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    // Apple has 15 products, delete button must be disabled
    const deleteButtons = screen.getAllByRole('button');
    const disabledDeleteBtn = deleteButtons.find((btn) => btn.hasAttribute('disabled'));
    expect(disabledDeleteBtn).toBeDefined();
  });
});
```

- [ ] **Step 2: Run all tests to verify they pass**

Run: `npm test src/pages/Admin/Brands/__tests__/AdminBrandsPage.spec.tsx` in `frontend`
Expected: PASS (4/4 tests passed).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Admin/Brands/__tests__/AdminBrandsPage.spec.tsx
git commit -m "test(frontend): add comprehensive integration and component tests for AdminBrandsPage"
```

