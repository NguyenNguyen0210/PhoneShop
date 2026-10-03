# Hoàn thiện Quản lý Kho & IMEI (Inventory & IMEI Management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hoàn chỉnh trung tâm Quản trị Kho & IMEI tại `/admin/inventory` (gồm thống kê tồn, cảnh báo hàng sắp hết, bảng tồn kho biến thể, modal điều chỉnh số lượng `+/-`, modal cập nhật định mức) và gỡ bỏ rào cản phân quyền cho tài khoản `STAFF` khi truy cập danh sách và nhập lô máy IMEI.

**Architecture:** Mở quyền `Role.STAFF` cho `GET /imei` và `POST /imei/import` trên NestJS backend; bổ sung kiểu dữ liệu và `inventoryService` trên Frontend; xây dựng giao diện hợp nhất `AdminInventoryPage` gồm Stat Cards, Tab Tồn kho (với `StockAdjustmentModal`, `ReorderLevelModal`) và Tab IMEI; đồng bộ routing và AdminSidebar.

**Tech Stack:** NestJS, Prisma, Jest (Backend); React 19, TypeScript, Ant Design v5, Vitest, React Router v7 (Frontend).

---

## File Structure Map

### Backend
- Modify: `backend/src/modules/imei/imei.controller.ts` (Mở `@Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)` cho `findAll` và `import`)
- Test: `backend/test/unit/imei-rbac.spec.ts` (Test kiểm tra metadata phân quyền các route IMEI cho STAFF)

### Frontend
- Modify: `frontend/src/types/index.ts` (Bổ sung `InventoryRecord`, `AdjustStockPayload`, `SetReorderLevelPayload`)
- Create: `frontend/src/services/inventoryService.ts` (Tầng service gọi API `/inventory`)
- Test: `frontend/src/services/__tests__/inventoryService.spec.ts` (Unit test cho `inventoryService`)
- Create: `frontend/src/pages/Admin/Inventory/components/StockAdjustmentModal.tsx` (Modal nhập/xuất kho `+/-`)
- Create: `frontend/src/pages/Admin/Inventory/components/ReorderLevelModal.tsx` (Modal sửa định mức cảnh báo)
- Create: `frontend/src/pages/Admin/Inventory/components/InventoryStatsCards.tsx` (3 thẻ thống kê & widget cảnh báo low-stock)
- Create: `frontend/src/pages/Admin/Inventory/components/InventoryStockTab.tsx` (Bảng quản lý tồn kho biến thể)
- Create: `frontend/src/pages/Admin/Inventory/AdminInventoryPage.tsx` (Trang chính gồm Header, Stats, Tab Tồn kho và Tab IMEI)
- Modify: `frontend/src/routes/AppRoutes.tsx` (Khai báo route `/admin/inventory` và tương thích `/admin/imei`)
- Modify: `frontend/src/components/admin/AdminSidebar.tsx` (Cập nhật route menu Quản lý Kho & IMEI sang `/admin/inventory`)

---

## Task List Outline

## Task Details

### Task 1: Cập nhật phân quyền STAFF cho IMEI Backend & Unit Test RBAC

**Files:**
- Modify: `backend/src/modules/imei/imei.controller.ts:20-25, 63-68`
- Create: `backend/test/unit/imei-rbac.spec.ts`

- [ ] **Step 1: Viết failing test kiểm tra RBAC của ImeiController**

Tạo file `backend/test/unit/imei-rbac.spec.ts`:
```typescript
import 'reflect-metadata';
import { describe, it, expect } from '@jest/globals';
import { ImeiController } from '../../src/modules/imei/imei.controller';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';
import { Role } from '../../src/common/enums/role.enum';

describe('ImeiController RBAC Permissions', () => {
  it('findAll should allow STAFF, MANAGER, ADMIN', () => {
    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, ImeiController.prototype.findAll);
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.ADMIN);
  });

  it('import should allow STAFF, MANAGER, ADMIN', () => {
    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, ImeiController.prototype.import);
    expect(roles).toBeDefined();
    expect(roles).toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.ADMIN);
  });

  it('sell should remain restricted to MANAGER, ADMIN', () => {
    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, ImeiController.prototype.markSold);
    expect(roles).toBeDefined();
    expect(roles).not.toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.ADMIN);
  });

  it('block should remain restricted to MANAGER, ADMIN', () => {
    const roles: Role[] = Reflect.getMetadata(ROLES_KEY, ImeiController.prototype.block);
    expect(roles).toBeDefined();
    expect(roles).not.toContain(Role.STAFF);
    expect(roles).toContain(Role.MANAGER);
    expect(roles).toContain(Role.ADMIN);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Chạy:
```bash
npm --prefix backend test -- test/unit/imei-rbac.spec.ts
```
Kỳ vọng: Test fail ở `findAll should allow STAFF` và `import should allow STAFF`.

- [ ] **Step 3: Cập nhật roles decorator trong ImeiController**

Chỉnh sửa `backend/src/modules/imei/imei.controller.ts`:
Đổi dòng 21:
```typescript
  @Get()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'View all IMEI devices (STAFF/MANAGER/ADMIN)' })
  findAll(@Query() query: QueryImeiDto) {
```
Đổi dòng 64:
```typescript
  @Post('import')
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Bulk import IMEI devices (STAFF/MANAGER/ADMIN)' })
  import(@Body() dto: ImportImeiDto) {
```

- [ ] **Step 4: Chạy lại test để xác nhận pass**

Chạy:
```bash
npm --prefix backend test -- test/unit/imei-rbac.spec.ts
```
Kỳ vọng: PASS cả 4 tests.

- [ ] **Step 5: Commit thay đổi**

```bash
git add backend/src/modules/imei/imei.controller.ts backend/test/unit/imei-rbac.spec.ts
git commit -m "fix(imei): grant STAFF role permission to list and import IMEIs"
```
### Task 2: Bổ sung Types và Tầng Dịch vụ `inventoryService` kèm Unit Test

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/__tests__/inventoryService.spec.ts`
- Create: `frontend/src/services/inventoryService.ts`

- [ ] **Step 1: Khai báo types trong `frontend/src/types/index.ts`**

Mở `frontend/src/types/index.ts` và thêm vào cuối file:
```typescript
export interface InventoryRecord {
  id: string;
  variantId: string;
  quantity: number;
  availableQty: number;
  reservedQty: number;
  reorderLevel: number;
  updatedAt?: string;
  variant: {
    id: string;
    sku: string;
    color: string;
    storage: string;
    price: number;
    compareAtPrice?: number;
    product: {
      id: string;
      name: string;
      thumbnail?: string;
    };
  };
}

export interface AdjustStockPayload {
  quantity: number;
  note?: string;
}

export interface SetReorderLevelPayload {
  reorderLevel: number;
}
```

- [ ] **Step 2: Viết failing test cho `inventoryService`**

Tạo file `frontend/src/services/__tests__/inventoryService.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoryService } from '../inventoryService';
import apiClient from '../apiClient';

vi.mock('../apiClient', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('inventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getInventoryList calls GET /inventory', async () => {
    const mockData = [{ id: 'inv-1', variantId: 'var-1', quantity: 10, availableQty: 8, reservedQty: 2, reorderLevel: 5 }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    const result = await inventoryService.getInventoryList();
    expect(apiClient.get).toHaveBeenCalledWith('/inventory');
    expect(result).toEqual(mockData);
  });

  it('getLowStockAlerts calls GET /inventory/low-stock with threshold when provided', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    await inventoryService.getLowStockAlerts(5);
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/low-stock', { params: { threshold: 5 } });
  });

  it('checkStock calls GET /inventory/:variantId/check', async () => {
    const mockCheck = { variantId: 'v1', availableQty: 4, reservedQty: 1, inStock: true };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockCheck });

    const result = await inventoryService.checkStock('v1');
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/v1/check');
    expect(result).toEqual(mockCheck);
  });

  it('adjustStock calls PUT /inventory/:variantId/adjust', async () => {
    const payload = { quantity: 10, note: 'Restock batch' };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { success: true } });

    await inventoryService.adjustStock('v1', payload);
    expect(apiClient.put).toHaveBeenCalledWith('/inventory/v1/adjust', payload);
  });

  it('setReorderLevel calls PUT /inventory/:variantId/reorder-level', async () => {
    const payload = { reorderLevel: 15 };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { success: true } });

    await inventoryService.setReorderLevel('v1', payload);
    expect(apiClient.put).toHaveBeenCalledWith('/inventory/v1/reorder-level', payload);
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận fail**

Chạy:
```bash
npm --prefix frontend test -- src/services/__tests__/inventoryService.spec.ts
```
Kỳ vọng: FAIL vì `inventoryService.ts` chưa tồn tại.

- [ ] **Step 4: Hiện thực `frontend/src/services/inventoryService.ts`**

Tạo file `frontend/src/services/inventoryService.ts`:
```typescript
import apiClient from './apiClient';
import type { InventoryRecord, AdjustStockPayload, SetReorderLevelPayload } from '../types';

export interface StockCheckResult {
  variantId: string;
  availableQty: number;
  reservedQty: number;
  inStock: boolean;
}

export const inventoryService = {
  getInventoryList: async (): Promise<InventoryRecord[]> => {
    const response = await apiClient.get<InventoryRecord[]>('/inventory');
    return response.data;
  },

  getLowStockAlerts: async (threshold?: number): Promise<InventoryRecord[]> => {
    const response = await apiClient.get<InventoryRecord[]>('/inventory/low-stock', {
      params: threshold !== undefined ? { threshold } : undefined,
    });
    return response.data;
  },

  checkStock: async (variantId: string): Promise<StockCheckResult> => {
    const response = await apiClient.get<StockCheckResult>(`/inventory/${variantId}/check`);
    return response.data;
  },

  adjustStock: async (variantId: string, payload: AdjustStockPayload): Promise<InventoryRecord> => {
    const response = await apiClient.put<InventoryRecord>(`/inventory/${variantId}/adjust`, payload);
    return response.data;
  },

  setReorderLevel: async (variantId: string, payload: SetReorderLevelPayload): Promise<InventoryRecord> => {
    const response = await apiClient.put<InventoryRecord>(`/inventory/${variantId}/reorder-level`, payload);
    return response.data;
  },
};
```

- [ ] **Step 5: Chạy lại test để xác nhận pass**

Chạy:
```bash
npm --prefix frontend test -- src/services/__tests__/inventoryService.spec.ts
```
Kỳ vọng: PASS cả 5 test cases.

- [ ] **Step 6: Commit thay đổi**

```bash
git add frontend/src/types/index.ts frontend/src/services/inventoryService.ts frontend/src/services/__tests__/inventoryService.spec.ts
git commit -m "feat(inventory): add inventory types and inventoryService with unit tests"
```
### Task 3: Xây dựng Modal Điều chỉnh Tồn kho (`StockAdjustmentModal`) & Modal Định mức (`ReorderLevelModal`)

**Files:**
- Create: `frontend/src/pages/Admin/Inventory/components/StockAdjustmentModal.tsx`
- Create: `frontend/src/pages/Admin/Inventory/components/ReorderLevelModal.tsx`

- [ ] **Step 1: Hiện thực `StockAdjustmentModal.tsx`**

Tạo file `frontend/src/pages/Admin/Inventory/components/StockAdjustmentModal.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Radio, InputNumber, Input, Alert, Space, Typography, Tag, message } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { inventoryService } from '../../../../services/inventoryService';
import type { InventoryRecord } from '../../../../types';

const { Text } = Typography;
const { TextArea } = Input;

interface StockAdjustmentModalProps {
  open: boolean;
  item: InventoryRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  open,
  item,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [qty, setQty] = useState<number>(1);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setMode('ADD');
      setQty(1);
      form.setFieldsValue({ mode: 'ADD', quantity: 1, note: '' });
    }
  }, [open, form]);

  if (!item) return null;

  const currentQty = item.quantity;
  const currentAvailable = item.availableQty;
  const delta = mode === 'ADD' ? qty : -qty;
  const projectedQty = currentQty + delta;
  const projectedAvailable = Math.min(Math.max(0, currentAvailable + delta), projectedQty);
  const isInvalidSubtract = mode === 'SUBTRACT' && projectedQty < 0;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isInvalidSubtract) {
        message.error('Số lượng giảm không thể vượt quá tổng tồn kho thực tế!');
        return;
      }
      setLoading(true);
      await inventoryService.adjustStock(item.variantId, {
        quantity: values.mode === 'ADD' ? values.quantity : -values.quantity,
        note: values.note?.trim() || undefined,
      });
      message.success('Điều chỉnh số lượng kho thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi điều chỉnh tồn kho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <span>Điều chỉnh Tồn kho</span>
          <Tag color="blue">{item.variant.sku}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okButtonProps={{ disabled: isInvalidSubtract }}
      okText="Xác nhận lưu"
      cancelText="Hủy bỏ"
      destroyOnClose
    >
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
        <Text strong style={{ fontSize: 15 }}>{item.variant.product.name}</Text>
        <div>
          <Text type="secondary">
            Phân loại: {item.variant.color} - {item.variant.storage} | Tồn vật lý hiện tại: <Text strong>{currentQty}</Text> (Khả dụng: <Text strong type="success">{currentAvailable}</Text>, Giữ: <Text strong type="warning">{item.reservedQty}</Text>)
          </Text>
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="mode" label="Hình thức điều chỉnh" rules={[{ required: true }]}>
          <Radio.Group
            buttonStyle="solid"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <Radio.Button value="ADD">
              <Space>
                <PlusCircleOutlined style={{ color: '#52c41a' }} />
                <span>Nhập thêm (+)</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="SUBTRACT">
              <Space>
                <MinusCircleOutlined style={{ color: '#ff4d4f' }} />
                <span>Xuất / Giảm (-)</span>
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="quantity"
          label="Số lượng thay đổi"
          rules={[
            { required: true, message: 'Vui lòng nhập số lượng' },
            { type: 'number', min: 1, message: 'Số lượng tối thiểu là 1' },
          ]}
        >
          <InputNumber
            min={1}
            style={{ width: '100%' }}
            value={qty}
            onChange={(val) => setQty(val || 1)}
            placeholder="Nhập số lượng máy"
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          {isInvalidSubtract ? (
            <Alert
              type="error"
              showIcon
              message={`Lỗi: Tồn kho chỉ còn ${currentQty} máy, không thể giảm ${qty} máy (âm tồn).`}
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message={
                <div>
                  Dự báo sau điều chỉnh:{' '}
                  <Text strong>Tồn thực tế: {currentQty} ➔ {projectedQty} ({delta > 0 ? `+${delta}` : delta})</Text> |{' '}
                  <Text strong>Khả dụng: {currentAvailable} ➔ {projectedAvailable}</Text>
                </div>
              }
            />
          )}
        </div>

        <Form.Item name="note" label="Lý do / Ghi chú">
          <TextArea rows={3} placeholder="VD: Nhập lô hàng mới đợt 2, Kiểm kê kho bù trừ, Hàng lỗi xuất trả..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

- [ ] **Step 2: Hiện thực `ReorderLevelModal.tsx`**

Tạo file `frontend/src/pages/Admin/Inventory/components/ReorderLevelModal.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Alert, Space, Typography, Tag, message } from 'antd';
import { inventoryService } from '../../../../services/inventoryService';
import type { InventoryRecord } from '../../../../types';

const { Text } = Typography;

interface ReorderLevelModalProps {
  open: boolean;
  item: InventoryRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReorderLevelModal: React.FC<ReorderLevelModalProps> = ({
  open,
  item,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && item) {
      form.setFieldsValue({ reorderLevel: item.reorderLevel ?? 5 });
    }
  }, [open, item, form]);

  if (!item) return null;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await inventoryService.setReorderLevel(item.variantId, {
        reorderLevel: values.reorderLevel,
      });
      message.success('Cập nhật định mức cảnh báo thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Có lỗi khi cập nhật định mức cảnh báo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <span>Thiết lập Định mức Báo động (Reorder Level)</span>
          <Tag color="orange">{item.variant.sku}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Lưu định mức"
      cancelText="Hủy"
      destroyOnClose
    >
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
        <Text strong>{item.variant.product.name}</Text>
        <div>
          <Text type="secondary">
            {item.variant.color} - {item.variant.storage} | Tồn khả dụng hiện tại: <Text strong>{item.availableQty}</Text>
          </Text>
        </div>
      </div>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Hệ thống sẽ kích hoạt cảnh báo 'Sắp hết hàng' khi lượng tồn khả dụng (availableQty) giảm bằng hoặc thấp hơn định mức này."
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="reorderLevel"
          label="Mức tồn cảnh báo tối thiểu"
          rules={[
            { required: true, message: 'Vui lòng nhập định mức' },
            { type: 'number', min: 0, message: 'Định mức tối thiểu là 0' },
          ]}
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 5" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

- [ ] **Step 3: Commit các modal**

```bash
git add frontend/src/pages/Admin/Inventory/components/StockAdjustmentModal.tsx frontend/src/pages/Admin/Inventory/components/ReorderLevelModal.tsx
git commit -m "feat(inventory): add StockAdjustmentModal and ReorderLevelModal components"
```
### Task 4: Xây dựng Thẻ Thống kê (`InventoryStatsCards`) & Bảng Tồn kho Biến thể (`InventoryStockTab`)

**Files:**
- Create: `frontend/src/pages/Admin/Inventory/components/InventoryStatsCards.tsx`
- Create: `frontend/src/pages/Admin/Inventory/components/InventoryStockTab.tsx`

- [ ] **Step 1: Hiện thực `InventoryStatsCards.tsx`**

Tạo file `frontend/src/pages/Admin/Inventory/components/InventoryStatsCards.tsx`:
```tsx
import React from 'react';
import { Row, Col, Card, Statistic, Badge } from 'antd';
import { AppstoreOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { InventoryRecord } from '../../../../types';

interface InventoryStatsCardsProps {
  items: InventoryRecord[];
  loading: boolean;
  filterLowStockOnly: boolean;
  onToggleLowStockFilter: () => void;
}

export const InventoryStatsCards: React.FC<InventoryStatsCardsProps> = ({
  items,
  loading,
  filterLowStockOnly,
  onToggleLowStockFilter,
}) => {
  const totalVariants = items.length;
  const totalAvailable = items.reduce((sum, item) => sum + (item.availableQty || 0), 0);
  const lowStockItems = items.filter(
    (item) => item.availableQty <= (item.reorderLevel ?? 0)
  );
  const lowStockCount = lowStockItems.length;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      <Col xs={24} sm={8}>
        <Card loading={loading} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Statistic
            title="Tổng mã biến thể (SKU)"
            value={totalVariants}
            prefix={<AppstoreOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
            suffix="SKU"
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loading} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Statistic
            title="Tổng tồn kho khả dụng"
            value={totalAvailable}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
            suffix="máy"
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card
          loading={loading}
          hoverable
          onClick={onToggleLowStockFilter}
          style={{
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: filterLowStockOnly ? '2px solid #ff4d4f' : '1px solid #f0f0f0',
            background: filterLowStockOnly ? '#fff2f0' : '#ffffff',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Statistic
              title={
                <span>
                  Cảnh báo sắp hết hàng{' '}
                  <Badge count={filterLowStockOnly ? 'Đang lọc' : undefined} style={{ backgroundColor: '#ff4d4f' }} />
                </span>
              }
              value={lowStockCount}
              valueStyle={{ color: lowStockCount > 0 ? '#ff4d4f' : '#8c8c8c' }}
              prefix={<WarningOutlined style={{ color: lowStockCount > 0 ? '#ff4d4f' : '#8c8c8c', marginRight: 8 }} />}
              suffix="biến thể"
            />
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 12, color: filterLowStockOnly ? '#cf1322' : '#8c8c8c' }}>
              {filterLowStockOnly ? 'Nhấp để bỏ lọc danh sách' : 'Nhấp để lọc danh sách cần nhập hàng'}
            </span>
          </div>
        </Card>
      </Col>
    </Row>
  );
};
```

- [ ] **Step 2: Hiện thực `InventoryStockTab.tsx`**

Tạo file `frontend/src/pages/Admin/Inventory/components/InventoryStockTab.tsx`:
```tsx
import React, { useState, useMemo } from 'react';
import { Table, Input, Button, Space, Tag, Typography, Tooltip, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  SettingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { InventoryRecord } from '../../../../types';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { ReorderLevelModal } from './ReorderLevelModal';

const { Text } = Typography;

interface InventoryStockTabProps {
  items: InventoryRecord[];
  loading: boolean;
  onRefresh: () => void;
  filterLowStockOnly: boolean;
  onToggleLowStockFilter: () => void;
}

export const InventoryStockTab: React.FC<InventoryStockTabProps> = ({
  items,
  loading,
  onRefresh,
  filterLowStockOnly,
  onToggleLowStockFilter,
}) => {
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [adjustItem, setAdjustItem] = useState<InventoryRecord | null>(null);
  const [reorderItem, setReorderItem] = useState<InventoryRecord | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.variant.product.name.toLowerCase().includes(search.toLowerCase()) ||
        item.variant.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.variant.color.toLowerCase().includes(search.toLowerCase()) ||
        item.variant.storage.toLowerCase().includes(search.toLowerCase());

      const matchLowStock =
        !filterLowStockOnly || item.availableQty <= (item.reorderLevel ?? 0);

      return matchSearch && matchLowStock;
    });
  }, [items, search, filterLowStockOnly]);

  const columns: ColumnsType<InventoryRecord> = [
    {
      title: 'Sản phẩm & SKU',
      key: 'product',
      render: (_, record) => (
        <Space orientation="horizontal" align="center">
          {record.variant.product.thumbnail ? (
            <img
              src={record.variant.product.thumbnail}
              alt={record.variant.product.name}
              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0' }}
            />
          ) : (
            <div style={{ width: 44, height: 44, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📱
            </div>
          )}
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>
              {record.variant.product.name}
            </Text>
            <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
              {record.variant.sku}
            </Tag>
          </div>
        </Space>
      ),
    },
    {
      title: 'Phân loại',
      key: 'variant',
      width: 140,
      render: (_, record) => (
        <div>
          <div><Text>{record.variant.color}</Text></div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.variant.storage}</Text>
        </div>
      ),
    },
    {
      title: 'Tồn vật lý',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 100,
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: 'Tạm giữ',
      dataIndex: 'reservedQty',
      key: 'reservedQty',
      align: 'right',
      width: 90,
      render: (reserved: number) => (
        <Text style={{ color: reserved > 0 ? '#722ed1' : '#8c8c8c' }}>{reserved}</Text>
      ),
    },
    {
      title: 'Khả dụng',
      dataIndex: 'availableQty',
      key: 'availableQty',
      align: 'right',
      width: 100,
      render: (avail: number, record) => {
        const isLow = avail <= (record.reorderLevel ?? 0);
        return (
          <Text strong style={{ color: isLow ? '#cf1322' : '#389e0d', fontSize: 14 }}>
            {avail}
          </Text>
        );
      },
    },
    {
      title: 'Định mức',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      align: 'right',
      width: 90,
      render: (lvl: number) => <Text type="secondary">{lvl ?? 0}</Text>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_, record) => {
        if (record.availableQty === 0) {
          return <Tag color="error">Hết hàng</Tag>;
        }
        if (record.availableQty <= (record.reorderLevel ?? 0)) {
          return (
            <Tag icon={<WarningOutlined />} color="warning">
              Sắp hết hàng
            </Tag>
          );
        }
        return <Tag color="success">Còn hàng</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setAdjustItem(record)}
          >
            Điều chỉnh
          </Button>
          {isManagerOrAdmin && (
            <Tooltip title="Thiết lập ngưỡng cảnh báo (Reorder Level)">
              <Button
                size="small"
                icon={<SettingOutlined />}
                onClick={() => setReorderItem(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Input
            placeholder="Tìm theo Tên máy, SKU, Màu, Dung lượng..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 320 }}
            allowClear
          />
          <Button
            danger={filterLowStockOnly}
            type={filterLowStockOnly ? 'primary' : 'default'}
            onClick={onToggleLowStockFilter}
          >
            {filterLowStockOnly ? 'Đang lọc: Sắp hết hàng' : 'Lọc hàng sắp hết'}
          </Button>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Làm mới
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredItems}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
        locale={{
          emptyText: (
            <Empty
              description={
                filterLowStockOnly
                  ? 'Tuyệt vời! Không có mặt hàng nào dưới định mức tồn an toàn.'
                  : 'Chưa có dữ liệu tồn kho.'
              }
            />
          ),
        }}
      />

      <StockAdjustmentModal
        open={!!adjustItem}
        item={adjustItem}
        onClose={() => setAdjustItem(null)}
        onSuccess={onRefresh}
      />

      <ReorderLevelModal
        open={!!reorderItem}
        item={reorderItem}
        onClose={() => setReorderItem(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
```

- [ ] **Step 3: Commit các component bảng tồn kho**

```bash
git add frontend/src/pages/Admin/Inventory/components/InventoryStatsCards.tsx frontend/src/pages/Admin/Inventory/components/InventoryStockTab.tsx
git commit -m "feat(inventory): add InventoryStatsCards and InventoryStockTab components"
```
### Task 5: Xây dựng Trang Chính `AdminInventoryPage` (Hợp nhất 2 Tabs Kho & IMEI)

**Files:**
- Create: `frontend/src/pages/Admin/Inventory/AdminInventoryPage.tsx`

- [ ] **Step 1: Hiện thực `AdminInventoryPage.tsx`**

Tạo file `frontend/src/pages/Admin/Inventory/AdminInventoryPage.tsx`:
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Typography, message, Alert } from 'antd';
import { DatabaseOutlined, BarcodeOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { inventoryService } from '../../../services/inventoryService';
import type { InventoryRecord } from '../../../types';
import { InventoryStatsCards } from './components/InventoryStatsCards';
import { InventoryStockTab } from './components/InventoryStockTab';
import { AdminImeiPage } from '../InventoryImei/AdminImeiPage';

const { Title, Text } = Typography;

export const AdminInventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabKey = searchParams.get('tab') === 'imei' ? 'imei' : 'stock';

  const [items, setItems] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getInventoryList();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách tồn kho:', err);
      const msg = err?.response?.data?.message || 'Không thể tải dữ liệu tồn kho từ máy chủ';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const handleTabChange = (key: string) => {
    setSearchParams(key === 'imei' ? { tab: 'imei' } : {});
  };

  const handleToggleLowStock = () => {
    if (activeTabKey !== 'stock') {
      setSearchParams({});
    }
    setFilterLowStockOnly((prev) => !prev);
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Quản lý Kho & Thiết bị IMEI
        </Title>
        <Text type="secondary">
          Kiểm soát tồn kho sản phẩm, theo dõi ngưỡng cảnh báo nhập hàng và quản lý danh sách mã máy IMEI.
        </Text>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Lỗi tải dữ liệu"
          description={error}
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {/* 3 Thẻ thống kê tổng quan */}
      <InventoryStatsCards
        items={items}
        loading={loading}
        filterLowStockOnly={filterLowStockOnly}
        onToggleLowStockFilter={handleToggleLowStock}
      />

      {/* Tabs chuyển đổi giữa Tồn kho biến thể và Quản lý IMEI */}
      <Card style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs
          activeKey={activeTabKey}
          onChange={handleTabChange}
          items={[
            {
              key: 'stock',
              label: (
                <span>
                  <DatabaseOutlined style={{ marginRight: 6 }} />
                  Tồn kho biến thể (Stock)
                </span>
              ),
              children: (
                <InventoryStockTab
                  items={items}
                  loading={loading}
                  onRefresh={fetchInventory}
                  filterLowStockOnly={filterLowStockOnly}
                  onToggleLowStockFilter={handleToggleLowStock}
                />
              ),
            },
            {
              key: 'imei',
              label: (
                <span>
                  <BarcodeOutlined style={{ marginRight: 6 }} />
                  Quản lý thiết bị IMEI
                </span>
              ),
              children: <AdminImeiPage />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default AdminInventoryPage;
```

- [ ] **Step 2: Commit trang chính**

```bash
git add frontend/src/pages/Admin/Inventory/AdminInventoryPage.tsx
git commit -m "feat(inventory): add AdminInventoryPage unifying stock and imei tabs"
```
### Task 6: Cập nhật Routing (`AppRoutes.tsx`) và Menu Sidebar (`AdminSidebar.tsx`)

**Files:**
- Modify: `frontend/src/routes/AppRoutes.tsx:30, 90-95`
- Modify: `frontend/src/components/admin/AdminSidebar.tsx:25-30, 50-65`

- [ ] **Step 1: Cập nhật routing trong `frontend/src/routes/AppRoutes.tsx`**

Mở `frontend/src/routes/AppRoutes.tsx`:
Import:
```tsx
import { AdminInventoryPage } from '../pages/Admin/Inventory/AdminInventoryPage';
```
Trong khối routes của Admin (`AdminRoute` -> `AdminLayout`):
Thay đổi:
```tsx
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/inventory" element={<AdminInventoryPage />} />
          <Route path="/admin/imei" element={<Navigate to="/admin/inventory?tab=imei" replace />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
```

- [ ] **Step 2: Cập nhật menu trong `frontend/src/components/admin/AdminSidebar.tsx`**

Mở `frontend/src/components/admin/AdminSidebar.tsx`:
Cập nhật `adminMenuItems`:
```tsx
  {
    key: '/admin/inventory',
    icon: <BarcodeOutlined style={{ fontSize: 16 }} />,
    label: 'Quản lý Kho & IMEI',
  },
```
Cập nhật `selectedKeys` trong `<Menu>` để khi ở `/admin/inventory` hoặc `/admin/imei` đều highlight đúng menu:
```tsx
  const currentKey = location.pathname.startsWith('/admin/inventory') || location.pathname.startsWith('/admin/imei')
    ? '/admin/inventory'
    : location.pathname;

  return (
    <div style={{ padding: '12px 0' }}>
      <Menu
        mode="inline"
        selectedKeys={[currentKey]}
        items={adminMenuItems}
        onClick={handleMenuClick}
        inlineCollapsed={collapsed}
        style={{
          background: '#ffffff',
          borderRight: 'none',
        }}
      />
    </div>
  );
```

- [ ] **Step 3: Commit cập nhật điều hướng**

```bash
git add frontend/src/routes/AppRoutes.tsx frontend/src/components/admin/AdminSidebar.tsx
git commit -m "feat(navigation): route /admin/inventory and update AdminSidebar item"
```
### Task 7: Kiểm thử Toàn diện & Xác thực Nghiệp vụ

**Files:**
- Verification only

- [ ] **Step 1: Chạy toàn bộ Unit Tests trên Backend**

Chạy:
```bash
npm --prefix backend test
```
Kỳ vọng: Toàn bộ test suite của backend pass, bao gồm cả `imei.spec.ts`, `imei-rbac.spec.ts` và `imei-pagination.spec.ts`.

- [ ] **Step 2: Chạy toàn bộ Unit Tests trên Frontend**

Chạy:
```bash
npm --prefix frontend test
```
Kỳ vọng: Toàn bộ test suite của frontend pass, bao gồm `inventoryService.spec.ts`.

- [ ] **Step 3: Chạy TypeScript Build trên Frontend**

Chạy:
```bash
npm --prefix frontend run build
```
Kỳ vọng: Lệnh build `tsc -b && vite build` hoàn tất thành công 0 lỗi.

- [ ] **Step 4: Kiểm tra và xác nhận danh mục yêu cầu (Checklist Nghiệp vụ)**

1. [x] **Xem inventory:** Đã có trang `/admin/inventory` hiển thị danh sách biến thể sản phẩm, tồn kho, phân loại.
2. [x] **Xem stock:** Hiển thị rõ ràng 3 cột số liệu: Tồn vật lý (`quantity`), Đang giữ (`reservedQty`), Khả dụng (`availableQty`).
3. [x] **Update stock / Stock adjustment:** Có nút "Điều chỉnh", mở modal `StockAdjustmentModal` hỗ trợ tăng `+` hoặc giảm `-`, dự báo số lượng sau chỉnh, validate không âm tồn và lưu kèm ghi chú.
4. [x] **Xem low-stock products:** Thẻ Stat Card thứ 3 hiển thị số lượng mặt hàng sắp hết, nhấp vào thẻ tự động lọc danh sách bảng theo các mặt hàng `availableQty <= reorderLevel`.
5. [x] **Sửa định mức Reorder Level:** Nút bánh răng mở modal cho MANAGER/ADMIN cập nhật ngưỡng cảnh báo an toàn.
6. [x] **Quản lý máy theo IMEI (/admin/imei):** Backend mở quyền `Role.STAFF` cho `GET /imei` và `POST /imei/import`, nhân viên STAFF vào tab IMEI tra cứu và nhập lô không còn bị lỗi 403 Forbidden.

