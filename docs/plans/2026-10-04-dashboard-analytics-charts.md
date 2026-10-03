# Dashboard & Analytics Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện tính năng Dashboard & Analytics trên trang Quản trị (`/admin`) bằng cách bổ sung API báo cáo thương hiệu ở backend, nhúng thư viện Recharts để trực quan hóa doanh thu theo ngày, tỷ trọng thương hiệu, trạng thái đơn hàng, top sản phẩm bán chạy, và tích hợp bộ lọc thời gian linh hoạt chuẩn múi giờ Việt Nam.

**Architecture:** Mở rộng NestJS `ReportsModule` với endpoint `GET /reports/brand-sales` tổng hợp dữ liệu từ PostgreSQL qua Prisma. Ở frontend React 19, xây dựng module `reportService.ts` kết nối toàn bộ API `/reports/*`, cài đặt `recharts` và phân rã giao diện Dashboard thành các component độc lập (`DashboardFilterBar`, `DashboardKpiCards`, `RevenueChartCard`, `OrderStatusChartCard`, `BrandSalesChartCard`, `TopProductsChartCard`, `DashboardAlertsAndOrders`) xử lý đầy đủ loading skeleton, empty states và lỗi mạng.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, React 19, Vite, Recharts, Ant Design 6, Tailwind CSS 4, Vitest, Jest.

---

## File Structure Map

```
backend/
├── src/modules/reports/
│   ├── reports.controller.ts (Thêm GET /reports/brand-sales)
│   ├── reports.service.ts (Thêm getBrandSalesReport query)
│   └── reports.service.spec.ts (Unit tests cho brand sales)

frontend/
├── package.json (Thêm recharts dependency)
├── src/
│   ├── types/
│   │   └── report.ts (TypeScript interfaces cho API reports & charts)
│   ├── services/
│   │   ├── reportService.ts (Axios client cho 6 endpoint reports & date helpers)
│   │   └── __tests__/
│   │       └── reportService.spec.ts (Unit tests cho reportService)
│   └── pages/Admin/Dashboard/
│       ├── AdminDashboardPage.tsx (Trang Dashboard chính tích hợp toàn bộ widgets)
│       └── components/
│           ├── DashboardFilterBar.tsx (Bộ lọc preset 7d/30d/tháng & RangePicker)
│           ├── DashboardKpiCards.tsx (4 Bento KPI cards từ GET /reports/dashboard)
│           ├── RevenueChartCard.tsx (AreaChart doanh thu theo ngày)
│           ├── OrderStatusChartCard.tsx (Donut Chart trạng thái đơn hàng)
│           ├── BrandSalesChartCard.tsx (Donut/Pie Chart tỷ trọng doanh thu theo hãng)
│           ├── TopProductsChartCard.tsx (Horizontal Bar Chart top 10 sản phẩm bán chạy)
│           ├── DashboardAlertsAndOrders.tsx (Tabs Đơn hàng mới & Cảnh báo tồn kho)
│           └── __tests__/
│               ├── DashboardFilterBar.spec.tsx
│               └── DashboardKpiCards.spec.tsx
```

---

### Task 1: Backend - Add Brand Sales Endpoint (`GET /reports/brand-sales`)

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/reports/reports.controller.ts`
- Modify / Create: `backend/src/modules/reports/reports.service.spec.ts`

- [ ] **Step 1: Write the failing unit test for brand sales report**

Tạo/cập nhật `backend/src/modules/reports/reports.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ReportsService - getBrandSalesReport', () => {
  let service: ReportsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: {
            order: { count: jest.fn() },
            payment: { aggregate: jest.fn(), findMany: jest.fn() },
            refund: { aggregate: jest.fn() },
            inventory: { findMany: jest.fn() },
            product: { count: jest.fn() },
            user: { count: jest.fn() },
            productVariant: { findMany: jest.fn() },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return brand sales aggregated with percentages', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
      { brandId: 'b-apple', brandName: 'Apple', logoUrl: null, qty: 10, revenue: 100000000 },
      { brandId: 'b-samsung', brandName: 'Samsung', logoUrl: null, qty: 5, revenue: 50000000 },
    ]);

    const result = await service.getBrandSalesReport('2026-01-01', '2026-12-31');

    expect(result.brands).toHaveLength(2);
    expect(result.totalRevenue).toBe(150000000);
    expect(result.brands[0].percentage).toBe(66.7);
    expect(result.brands[1].percentage).toBe(33.3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test src/modules/reports/reports.service.spec.ts`
Expected: FAIL with `service.getBrandSalesReport is not a function`.

- [ ] **Step 3: Implement `getBrandSalesReport` in `ReportsService` and expose in `ReportsController`**

Trong `backend/src/modules/reports/reports.service.ts`:
```typescript
  async getBrandSalesReport(fromInput?: string, toInput?: string) {
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (fromInput && toInput) {
      fromDate = new Date(`${fromInput}T00:00:00+07:00`);
      toDate = new Date(`${toInput}T23:59:59.999+07:00`);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid date range (expected YYYY-MM-DD)');
      }
      if (fromDate > toDate) {
        throw new BadRequestException('"from" must not be after "to"');
      }
    }

    const rows: Array<{
      brandId: string;
      brandName: string;
      logoUrl: string | null;
      qty: number;
      revenue: number;
    }> = await this.prisma.$queryRaw`
      SELECT b.id AS "brandId",
             b.name AS "brandName",
             b.logo_url AS "logoUrl",
             COALESCE(SUM(oi.quantity), 0)::int AS qty,
             COALESCE(SUM(oi.total_price), 0)::numeric AS revenue
      FROM brands b
      JOIN products p ON p.brand_id = b.id
      JOIN product_variants pv ON pv.product_id = p.id
      JOIN order_items oi ON oi.variant_id = pv.id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status <> 'CANCELLED'
        ${fromDate && toDate ? this.prisma.$queryRaw`AND o.created_at >= ${fromDate} AND o.created_at <= ${toDate}` : this.prisma.$queryRaw``}
      GROUP BY b.id, b.name, b.logo_url
      ORDER BY revenue DESC
    `;

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);

    const brands = rows.map((r) => {
      const rev = Number(r.revenue || 0);
      const percentage = totalRevenue > 0 ? Number(((rev / totalRevenue) * 100).toFixed(1)) : 0;
      return {
        brandId: r.brandId,
        brandName: r.brandName,
        logoUrl: r.logoUrl,
        quantitySold: Number(r.qty || 0),
        revenue: rev,
        percentage,
      };
    });

    return {
      from: fromInput,
      to: toInput,
      totalRevenue,
      brands,
    };
  }
```

Trong `backend/src/modules/reports/reports.controller.ts`, thêm:
```typescript
  @Get('brand-sales')
  @ApiOperation({ summary: 'Get brand sales distribution report (Admin)' })
  @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
  getBrandSales(@Query('from') from?: string, @Query('to') to?: string) {
    if ((from && !to) || (!from && to)) {
      throw new BadRequestException('Both "from" and "to" must be provided together');
    }
    if (from && (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to || ''))) {
      throw new BadRequestException('Invalid date range (expected YYYY-MM-DD)');
    }
    return this.reportsService.getBrandSalesReport(from, to);
  }
```

- [ ] **Step 4: Run backend unit test to verify it passes**

Run: `npm --prefix backend test src/modules/reports/reports.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit backend changes**

```bash
git add backend/src/modules/reports/reports.service.ts backend/src/modules/reports/reports.controller.ts backend/src/modules/reports/reports.service.spec.ts
git commit -m "feat(backend): add brand sales distribution report endpoint"
```

---

### Task 2: Frontend - Install `recharts` & Create Report Types & Report Service

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/types/report.ts`
- Create: `frontend/src/services/reportService.ts`
- Create: `frontend/src/services/__tests__/reportService.spec.ts`

- [ ] **Step 1: Install recharts in frontend**

Run: `npm --prefix frontend install recharts`

- [ ] **Step 2: Define report interfaces in `frontend/src/types/report.ts`**

```typescript
export interface DashboardSummary {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  refundedTotal: number;
  netRevenue: number;
  totalUsers: number;
  totalProducts: number;
  totalLowStock: number;
}

export interface DailyRevenueItem {
  date: string;
  revenue: number;
}

export interface RevenueReport {
  from: string;
  to: string;
  timeZone: string;
  totalRevenue: number;
  refundedTotal: number;
  netRevenue: number;
  dailyBreakdown: DailyRevenueItem[];
  paymentCount: number;
}

export interface TopProductItem {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface OrderStatusItem {
  status: string;
  count: number;
}

export interface BrandSalesItem {
  brandId: string;
  brandName: string;
  logoUrl: string | null;
  quantitySold: number;
  revenue: number;
  percentage: number;
}

export interface BrandSalesReport {
  from?: string;
  to?: string;
  totalRevenue: number;
  brands: BrandSalesItem[];
}

export interface LowStockItem {
  variantId: string;
  productName: string;
  sku: string;
  availableQty: number;
  reorderLevel: number;
  deficit: number;
}

export type DatePresetKey = '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'CUSTOM';
```

- [ ] **Step 3: Write failing unit test for `reportService.ts`**

Tạo `frontend/src/services/__tests__/reportService.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportService } from '../reportService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches dashboard summary', async () => {
    const mockSummary = { totalOrders: 10, netRevenue: 1000000 };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockSummary });

    const res = await reportService.getDashboardSummary();
    expect(apiClient.get).toHaveBeenCalledWith('/reports/dashboard');
    expect(res).toEqual(mockSummary);
  });

  it('fetches revenue report with correct params', async () => {
    const mockRev = { dailyBreakdown: [] };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockRev });

    const res = await reportService.getRevenueReport('2026-10-01', '2026-10-04');
    expect(apiClient.get).toHaveBeenCalledWith('/reports/revenue', {
      params: { from: '2026-10-01', to: '2026-10-04' },
    });
    expect(res).toEqual(mockRev);
  });

  it('calculates date presets in VN local time format YYYY-MM-DD', () => {
    const preset = reportService.getDatePresetRange('7_DAYS');
    expect(preset.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(preset.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(preset.from <= preset.to).toBe(true);
  });
});
```

- [ ] **Step 4: Implement `frontend/src/services/reportService.ts`**

```typescript
import { apiClient } from './apiClient';
import type {
  DashboardSummary,
  RevenueReport,
  TopProductItem,
  OrderStatusItem,
  BrandSalesReport,
  LowStockItem,
  DatePresetKey,
} from '../types/report';

function formatVnDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const reportService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>('/reports/dashboard');
    return response.data;
  },

  async getRevenueReport(from: string, to: string): Promise<RevenueReport> {
    const response = await apiClient.get<RevenueReport>('/reports/revenue', {
      params: { from, to },
    });
    return response.data;
  },

  async getTopSellingProducts(limit = 10): Promise<TopProductItem[]> {
    const response = await apiClient.get<TopProductItem[]>('/reports/top-products', {
      params: { limit },
    });
    return response.data;
  },

  async getOrderStatusReport(): Promise<OrderStatusItem[]> {
    const response = await apiClient.get<OrderStatusItem[]>('/reports/order-status');
    return response.data;
  },

  async getBrandSalesReport(from?: string, to?: string): Promise<BrandSalesReport> {
    const response = await apiClient.get<BrandSalesReport>('/reports/brand-sales', {
      params: from && to ? { from, to } : undefined,
    });
    return response.data;
  },

  async getLowStockReport(): Promise<LowStockItem[]> {
    const response = await apiClient.get<LowStockItem[]>('/reports/low-stock');
    return response.data;
  },

  getDatePresetRange(preset: DatePresetKey): { from: string; to: string } {
    const now = new Date();
    const to = formatVnDate(now);

    if (preset === '7_DAYS') {
      const past = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      return { from: formatVnDate(past), to };
    }

    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatVnDate(firstDay), to };
    }

    // Default 30_DAYS
    const past = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    return { from: formatVnDate(past), to };
  },
};
```

- [ ] **Step 5: Run frontend test to verify it passes**

Run: `npm --prefix frontend test src/services/__tests__/reportService.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/types/report.ts frontend/src/services/reportService.ts frontend/src/services/__tests__/reportService.spec.ts
git commit -m "feat(frontend): install recharts and add reportService with tests"
```

---

### Task 3: Frontend - Create `DashboardFilterBar` & `DashboardKpiCards` Components

**Files:**
- Create: `frontend/src/pages/Admin/Dashboard/components/DashboardFilterBar.tsx`
- Create: `frontend/src/pages/Admin/Dashboard/components/DashboardKpiCards.tsx`
- Create: `frontend/src/pages/Admin/Dashboard/components/__tests__/DashboardFilterBar.spec.tsx`

- [ ] **Step 1: Write unit test for `DashboardFilterBar`**

Tạo `frontend/src/pages/Admin/Dashboard/components/__tests__/DashboardFilterBar.spec.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardFilterBar } from '../DashboardFilterBar';

describe('DashboardFilterBar', () => {
  it('renders preset buttons and timezone tag', () => {
    const onPresetChange = vi.fn();
    const onRefresh = vi.fn();

    render(
      <DashboardFilterBar
        preset="30_DAYS"
        dateRange={['2026-09-05', '2026-10-04']}
        onPresetChange={onPresetChange}
        onCustomRangeChange={vi.fn()}
        onRefresh={onRefresh}
        loading={false}
      />
    );

    expect(screen.getByText('7 ngày qua')).toBeDefined();
    expect(screen.getByText('30 ngày qua')).toBeDefined();
    expect(screen.getByText('Tháng này')).toBeDefined();
    expect(screen.getByText(/Asia\/Ho_Chi_Minh/)).toBeDefined();

    fireEvent.click(screen.getByText('7 ngày qua'));
    expect(onPresetChange).toHaveBeenCalledWith('7_DAYS');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test src/pages/Admin/Dashboard/components/__tests__/DashboardFilterBar.spec.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `DashboardFilterBar.tsx`**

Tạo `frontend/src/pages/Admin/Dashboard/components/DashboardFilterBar.tsx`:
```tsx
import React from 'react';
import { Radio, DatePicker, Button, Tag, Space } from 'antd';
import { ReloadOutlined, CalendarOutlined, GlobalOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { DatePresetKey } from '../../../types/report';

interface DashboardFilterBarProps {
  preset: DatePresetKey;
  dateRange: [string, string];
  onPresetChange: (preset: DatePresetKey) => void;
  onCustomRangeChange: (from: string, to: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

const { RangePicker } = DatePicker;

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  preset,
  dateRange,
  onPresetChange,
  onCustomRangeChange,
  onRefresh,
  loading,
}) => {
  const handleRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      onCustomRangeChange(dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD'));
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '12px 18px',
        background: '#ffffff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Radio.Group
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
          buttonStyle="solid"
          size="middle"
        >
          <Radio.Button value="7_DAYS">7 ngày qua</Radio.Button>
          <Radio.Button value="30_DAYS">30 ngày qua</Radio.Button>
          <Radio.Button value="THIS_MONTH">Tháng này</Radio.Button>
          <Radio.Button value="CUSTOM">
            <CalendarOutlined style={{ marginRight: 4 }} />
            Tùy chọn
          </Radio.Button>
        </Radio.Group>

        {preset === 'CUSTOM' && (
          <RangePicker
            allowClear={false}
            value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
            onChange={handleRangeChange}
            format="DD/MM/YYYY"
            style={{ borderRadius: 8 }}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Tag
          icon={<GlobalOutlined />}
          style={{
            background: '#f1f5f9',
            borderColor: '#e2e8f0',
            color: '#475569',
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 12,
          }}
        >
          Múi giờ: Asia/Ho_Chi_Minh
        </Tag>
        <Button
          icon={<ReloadOutlined spin={loading} />}
          onClick={onRefresh}
          loading={loading}
          style={{ borderRadius: 8 }}
        >
          Làm mới
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Implement `DashboardKpiCards.tsx`**

Tạo `frontend/src/pages/Admin/Dashboard/components/DashboardKpiCards.tsx`:
```tsx
import React from 'react';
import { Row, Col, Card, Statistic, Skeleton } from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  AlertOutlined,
  TeamOutlined,
  RiseOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { DashboardSummary } from '../../../types/report';

interface DashboardKpiCardsProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({ summary, loading }) => {
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (loading && !summary) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  const netRevenue = summary?.netRevenue ?? 0;
  const totalOrders = summary?.totalOrders ?? 0;
  const pendingOrders = summary?.pendingOrders ?? 0;
  const totalLowStock = summary?.totalLowStock ?? 0;
  const totalUsers = summary?.totalUsers ?? 0;
  const totalProducts = summary?.totalProducts ?? 0;

  return (
    <Row gutter={[16, 16]}>
      {/* KPI 1: Doanh thu thuần */}
      <Col xs={24} sm={12} lg={6}>
        <Card
          bordered={false}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2563eb, #38bdf8)' }} />
          <Statistic
            title={<span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Doanh thu thuần (Net Revenue)</span>}
            value={netRevenue}
            precision={0}
            formatter={(val) => formatPrice(Number(val))}
            valueStyle={{ color: '#0f172a', fontWeight: 800, fontFamily: 'monospace', fontSize: 22 }}
            prefix={<DollarOutlined style={{ color: '#2563eb', fontSize: 20, marginRight: 6 }} />}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#64748b' }}>
            <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
              <RiseOutlined /> Đã trừ
            </span>
            <span>hoàn tiền {formatPrice(summary?.refundedTotal ?? 0)}</span>
          </div>
        </Card>
      </Col>

      {/* KPI 2: Tổng đơn hàng & Đơn chờ duyệt */}
      <Col xs={24} sm={12} lg={6}>
        <Card
          bordered={false}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
          <Statistic
            title={<span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Tổng số đơn hàng</span>}
            value={totalOrders}
            valueStyle={{ color: '#0f172a', fontWeight: 800, fontFamily: 'monospace', fontSize: 22 }}
            prefix={<ShoppingOutlined style={{ color: '#10b981', fontSize: 20, marginRight: 6 }} />}
            suffix={<span style={{ fontSize: 13, color: '#64748b' }}>đơn</span>}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11 }}>
            <span style={{ color: pendingOrders > 0 ? '#d97706' : '#10b981', fontWeight: 600 }}>
              {pendingOrders} đơn chờ duyệt (PENDING)
            </span>
          </div>
        </Card>
      </Col>

      {/* KPI 3: Cảnh báo tồn kho thấp */}
      <Col xs={24} sm={12} lg={6}>
        <Card
          bordered={false}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
          <Statistic
            title={<span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Thiết bị dưới mức tồn kho</span>}
            value={totalLowStock}
            valueStyle={{ color: totalLowStock > 0 ? '#b45309' : '#0f172a', fontWeight: 800, fontFamily: 'monospace', fontSize: 22 }}
            prefix={<AlertOutlined style={{ color: '#f59e0b', fontSize: 20, marginRight: 6 }} />}
            suffix={<span style={{ fontSize: 13, color: '#64748b' }}>loại</span>}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11 }}>
            <Link to="/admin/inventory" style={{ color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              Kiểm tra tồn kho <ArrowRightOutlined />
            </Link>
          </div>
        </Card>
      </Col>

      {/* KPI 4: Khách hàng & Danh mục máy */}
      <Col xs={24} sm={12} lg={6}>
        <Card
          bordered={false}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #6366f1, #818cf8)' }} />
          <Statistic
            title={<span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Khách hàng & Sản phẩm</span>}
            value={totalUsers}
            valueStyle={{ color: '#0f172a', fontWeight: 800, fontFamily: 'monospace', fontSize: 22 }}
            prefix={<TeamOutlined style={{ color: '#6366f1', fontSize: 20, marginRight: 6 }} />}
            suffix={<span style={{ fontSize: 13, color: '#64748b' }}>người dùng</span>}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#64748b' }}>
            <span>Phân phối qua {totalProducts} dòng smartphone</span>
          </div>
        </Card>
      </Col>
    </Row>
  );
};
```

- [ ] **Step 5: Run tests to verify**

Run: `npm --prefix frontend test src/pages/Admin/Dashboard/components/__tests__/DashboardFilterBar.spec.tsx`
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add frontend/src/pages/Admin/Dashboard/components/DashboardFilterBar.tsx frontend/src/pages/Admin/Dashboard/components/DashboardKpiCards.tsx frontend/src/pages/Admin/Dashboard/components/__tests__/DashboardFilterBar.spec.tsx
git commit -m "feat(frontend): create DashboardFilterBar and DashboardKpiCards components"
```

---

### Task 4: Frontend - Create Recharts Widgets: `RevenueChartCard` & `OrderStatusChartCard`

**Files:**
- Create: `frontend/src/pages/Admin/Dashboard/components/RevenueChartCard.tsx`
- Create: `frontend/src/pages/Admin/Dashboard/components/OrderStatusChartCard.tsx`
- Create: `frontend/src/pages/Admin/Dashboard/components/__tests__/RevenueChartCard.spec.tsx`

- [ ] **Step 1: Write unit test for `RevenueChartCard`**

Tạo `frontend/src/pages/Admin/Dashboard/components/__tests__/RevenueChartCard.spec.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RevenueChartCard } from '../RevenueChartCard';
import type { RevenueReport } from '../../../../types/report';

describe('RevenueChartCard', () => {
  it('renders loading skeleton when loading', () => {
    const { container } = render(<RevenueChartCard data={null} loading={true} />);
    expect(container.querySelector('.ant-skeleton')).toBeDefined();
  });

  it('renders empty state when breakdown is empty', () => {
    const emptyData: RevenueReport = {
      from: '2026-10-01',
      to: '2026-10-04',
      timeZone: 'Asia/Ho_Chi_Minh',
      totalRevenue: 0,
      refundedTotal: 0,
      netRevenue: 0,
      dailyBreakdown: [],
      paymentCount: 0,
    };
    render(<RevenueChartCard data={emptyData} loading={false} />);
    expect(screen.getByText(/Không có dữ liệu giao dịch trong khoảng thời gian này/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test src/pages/Admin/Dashboard/components/__tests__/RevenueChartCard.spec.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `RevenueChartCard.tsx`**

Tạo `frontend/src/pages/Admin/Dashboard/components/RevenueChartCard.tsx`:
```tsx
import React from 'react';
import { Card, Skeleton, Empty, Tag } from 'antd';
import { RiseOutlined, LineChartOutlined } from '@ant-design/icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RevenueReport } from '../../../types/report';

interface RevenueChartCardProps {
  data: RevenueReport | null;
  loading: boolean;
}

const formatCurrencyCompact = (val: number): string => {
  if (val >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1)} tr`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(0)} k`;
  }
  return `${val} ₫`;
};

const formatFullCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export const RevenueChartCard: React.FC<RevenueChartCardProps> = ({ data, loading }) => {
  if (loading && !data) {
    return (
      <Card
        title={<span><LineChartOutlined /> Tăng trưởng Doanh thu thuần</span>}
        style={{ borderRadius: 16, border: '1px solid #e2e8f0', minHeight: 380 }}
      >
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  const breakdown = data?.dailyBreakdown || [];
  const hasData = breakdown.length > 0 && breakdown.some((d) => d.revenue > 0);

  const chartData = breakdown.map((item) => {
    const parts = item.date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.date;
    return {
      date: item.date,
      displayDate: label,
      revenue: item.revenue,
    };
  });

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LineChartOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Biến động Doanh thu theo ngày
            </span>
          </div>
          {data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
                {data.paymentCount} giao dịch
              </Tag>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>
                Tổng: {formatFullCurrency(data.netRevenue)}
              </span>
            </div>
          )}
        </div>
      }
      bordered={false}
      style={{
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
      }}
      styles={{ body: { padding: '20px 16px 12px 16px' } }}
    >
      {!hasData ? (
        <div style={{ padding: '60px 0' }}>
          <Empty description="Không có dữ liệu giao dịch trong khoảng thời gian này" />
        </div>
      ) : (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrencyCompact}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '10px 14px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                          Ngày: {item.date}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                          Doanh thu: {formatFullCurrency(item.revenue)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
```

- [ ] **Step 4: Implement `OrderStatusChartCard.tsx`**

Tạo `frontend/src/pages/Admin/Dashboard/components/OrderStatusChartCard.tsx`:
```tsx
import React from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { OrderStatusItem } from '../../../types/report';

interface OrderStatusChartCardProps {
  data: OrderStatusItem[];
  loading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xử lý', color: '#f59e0b' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#06b6d4' },
  PROCESSING: { label: 'Đang đóng gói', color: '#3b82f6' },
  SHIPPING: { label: 'Đang giao', color: '#6366f1' },
  DELIVERED: { label: 'Đã giao', color: '#10b981' },
  COMPLETED: { label: 'Hoàn tất', color: '#059669' },
  CANCELLED: { label: 'Đã hủy', color: '#ef4444' },
  RETURNED: { label: 'Đổi trả', color: '#ec4899' },
};

export const OrderStatusChartCard: React.FC<OrderStatusChartCardProps> = ({ data, loading }) => {
  if (loading && (!data || data.length === 0)) {
    return (
      <Card
        title={<span><PieChartOutlined /> Phân bổ trạng thái đơn</span>}
        style={{ borderRadius: 16, border: '1px solid #e2e8f0', minHeight: 380 }}
      >
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  const totalOrders = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = data
    .filter((d) => d.count > 0)
    .map((item) => ({
      name: STATUS_CONFIG[item.status]?.label || item.status,
      rawStatus: item.status,
      count: item.count,
      color: STATUS_CONFIG[item.status]?.color || '#94a3b8',
      percentage: totalOrders > 0 ? ((item.count / totalOrders) * 100).toFixed(1) : 0,
    }));

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChartOutlined style={{ color: '#6366f1', fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Phân bổ trạng thái đơn hàng
          </span>
        </div>
      }
      bordered={false}
      style={{
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
      }}
      styles={{ body: { padding: '20px 16px' } }}
    >
      {chartData.length === 0 ? (
        <div style={{ padding: '60px 0' }}>
          <Empty description="Chưa có dữ liệu đơn hàng" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: '100%', height: 210, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            padding: '8px 12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: item.color }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: '#0f172a', marginTop: 2 }}>
                            {item.count} đơn ({item.percentage}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Total Count Metric */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                {totalOrders}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>tổng đơn</div>
            </div>
          </div>

          {/* Status Breakdown Legend Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px' }}>
            {chartData.map((item) => (
              <div key={item.rawStatus} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                  <span style={{ color: '#475569' }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                  {item.count} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({item.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
```

- [ ] **Step 5: Run tests to verify**

Run: `npm --prefix frontend test src/pages/Admin/Dashboard/components/__tests__/RevenueChartCard.spec.tsx`
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add frontend/src/pages/Admin/Dashboard/components/RevenueChartCard.tsx frontend/src/pages/Admin/Dashboard/components/OrderStatusChartCard.tsx frontend/src/pages/Admin/Dashboard/components/__tests__/RevenueChartCard.spec.tsx
git commit -m "feat(frontend): implement RevenueChartCard and OrderStatusChartCard with Recharts"
```

---

### Task 5: Frontend - Create Recharts Widgets: `BrandSalesChartCard` & `TopProductsChartCard`

**Files:**
- Create: `frontend/src/pages/Admin/Dashboard/components/BrandSalesChartCard.tsx`
- Create: `frontend/src/pages/Admin/Dashboard/components/TopProductsChartCard.tsx`

- [ ] **Step 1: Implement `BrandSalesChartCard.tsx`**

Tạo `frontend/src/pages/Admin/Dashboard/components/BrandSalesChartCard.tsx`:
```tsx
import React from 'react';
import { Card, Skeleton, Empty, Progress } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { BrandSalesReport } from '../../../types/report';

interface BrandSalesChartCardProps {
  data: BrandSalesReport | null;
  loading: boolean;
}

const BRAND_PALETTE = ['#0f172a', '#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const formatPrice = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export const BrandSalesChartCard: React.FC<BrandSalesChartCardProps> = ({ data, loading }) => {
  if (loading && !data) {
    return (
      <Card
        title={<span><AppstoreOutlined /> Tỷ trọng Doanh thu theo Thương hiệu</span>}
        style={{ borderRadius: 16, border: '1px solid #e2e8f0', minHeight: 380 }}
      >
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  const brands = data?.brands || [];
  const hasData = brands.length > 0 && brands.some((b) => b.revenue > 0);

  const chartData = brands.map((b, idx) => ({
    name: b.brandName,
    revenue: b.revenue,
    quantitySold: b.quantitySold,
    percentage: b.percentage,
    color: BRAND_PALETTE[idx % BRAND_PALETTE.length],
  }));

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppstoreOutlined style={{ color: '#0ea5e9', fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Tỷ trọng Doanh số theo Thương hiệu
          </span>
        </div>
      }
      bordered={false}
      style={{
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
      }}
      styles={{ body: { padding: '20px 16px' } }}
    >
      {!hasData ? (
        <div style={{ padding: '60px 0' }}>
          <Empty description="Chưa phát sinh dữ liệu bán theo thương hiệu" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="revenue"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            padding: '8px 12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: item.color }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: '#0f172a', marginTop: 2 }}>
                            Doanh thu: {formatPrice(item.revenue)} ({item.percentage}%)
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Đã bán: {item.quantitySold} máy
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Brand Breakdown List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chartData.slice(0, 5).map((item) => (
              <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                    <span style={{ color: '#94a3b8' }}>({item.quantitySold} máy)</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                    {formatPrice(item.revenue)} <span style={{ color: '#64748b', fontWeight: 500 }}>({item.percentage}%)</span>
                  </span>
                </div>
                <Progress percent={item.percentage} showInfo={false} strokeColor={item.color} size="small" />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
```

- [ ] **Step 2: Implement `TopProductsChartCard.tsx`**

Tạo `frontend/src/pages/Admin/Dashboard/components/TopProductsChartCard.tsx`:
```tsx
import React, { useState } from 'react';
import { Card, Skeleton, Empty, Radio } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TopProductItem } from '../../../types/report';

interface TopProductsChartCardProps {
  data: TopProductItem[];
  loading: boolean;
}

const formatPrice = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export const TopProductsChartCard: React.FC<TopProductsChartCardProps> = ({ data, loading }) => {
  const [metric, setMetric] = useState<'qty' | 'revenue'>('qty');

  if (loading && (!data || data.length === 0)) {
    return (
      <Card
        title={<span><TrophyOutlined /> Top sản phẩm bán chạy nhất</span>}
        style={{ borderRadius: 16, border: '1px solid #e2e8f0', minHeight: 380 }}
      >
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  const chartData = (data || []).slice(0, 7).map((item) => {
    const fullName = `${item.productName} (${item.variantName})`;
    const shortName = fullName.length > 25 ? `${fullName.slice(0, 23)}...` : fullName;
    return {
      name: shortName,
      fullName,
      sku: item.sku,
      qty: item.totalQuantitySold,
      revenue: item.totalRevenue,
    };
  });

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrophyOutlined style={{ color: '#eab308', fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Top thiết bị bán chạy nhất
            </span>
          </div>
          <Radio.Group
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="qty">Theo số lượng</Radio.Button>
            <Radio.Button value="revenue">Theo doanh thu</Radio.Button>
          </Radio.Group>
        </div>
      }
      bordered={false}
      style={{
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
      }}
      styles={{ body: { padding: '20px 16px' } }}
    >
      {chartData.length === 0 ? (
        <div style={{ padding: '60px 0' }}>
          <Empty description="Chưa có dữ liệu sản phẩm bán chạy" />
        </div>
      ) : (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                type="number"
                stroke="#94a3b8"
                fontSize={12}
                tickFormatter={(val) => (metric === 'revenue' ? `${(val / 1_000_000).toFixed(0)} tr` : `${val}`)}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#64748b"
                fontSize={12}
                width={140}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '10px 14px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.fullName}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>SKU: {item.sku}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                          Đã bán: {item.qty} máy
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                          Doanh số: {formatPrice(item.revenue)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey={metric === 'qty' ? 'qty' : 'revenue'} radius={[0, 6, 6, 0]}>
                {chartData.map((_, idx) => (
                  <Cell
                    key={`bar-cell-${idx}`}
                    fill={idx === 0 ? '#2563eb' : idx === 1 ? '#3b82f6' : '#60a5fa'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
```

- [ ] **Step 3: Commit changes**

```bash
git add frontend/src/pages/Admin/Dashboard/components/BrandSalesChartCard.tsx frontend/src/pages/Admin/Dashboard/components/TopProductsChartCard.tsx
git commit -m "feat(frontend): implement BrandSalesChartCard and TopProductsChartCard"
```

---

### Task 6: Frontend - Create `DashboardAlertsAndOrders` Component

**Files:**
- Create: `frontend/src/pages/Admin/Dashboard/components/DashboardAlertsAndOrders.tsx`

- [ ] **Step 1: Implement `DashboardAlertsAndOrders.tsx`**

Tạo `frontend/src/pages/Admin/Dashboard/components/DashboardAlertsAndOrders.tsx`:
```tsx
import React from 'react';
import { Card, Tabs, Table, Tag, Typography, Button, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ShoppingOutlined,
  AlertOutlined,
  EyeOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { Order } from '../../../types';
import type { LowStockItem } from '../../../types/report';

const { Text } = Typography;

interface DashboardAlertsAndOrdersProps {
  orders: Order[];
  lowStockItems: LowStockItem[];
  loading: boolean;
}

export const DashboardAlertsAndOrders: React.FC<DashboardAlertsAndOrdersProps> = ({
  orders,
  lowStockItems,
  loading,
}) => {
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600 }}>ĐÃ XÁC NHẬN</Tag>;
      case 'PROCESSING':
        return <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>ĐANG ĐÓNG GÓI</Tag>;
      case 'SHIPPING':
        return <Tag color="geekblue" style={{ borderRadius: 6, fontWeight: 600 }}>ĐANG GIAO HÀNG</Tag>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <Tag color="green" style={{ borderRadius: 6, fontWeight: 600 }}>HOÀN TẤT</Tag>;
      case 'CANCELLED':
        return <Tag color="error" style={{ borderRadius: 6, fontWeight: 600 }}>ĐÃ HỦY</Tag>;
      default:
        return <Tag color="warning" style={{ borderRadius: 6, fontWeight: 600 }}>CHỜ XỬ LÝ</Tag>;
    }
  };

  const orderColumns: ColumnsType<Order> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (num: string) => (
        <Text strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>
          {num}
        </Text>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.shippingPhone}
          </Text>
        </div>
      ),
    },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (m: string) => (
        <Tag style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb', fontWeight: 600, borderRadius: 6 }}>
          {m}
        </Tag>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
          {formatPrice(val)}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => getStatusTag(s),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (record) => (
        <Link to={`/admin/orders`}>
          <Button size="small" icon={<EyeOutlined />} style={{ borderRadius: 6 }}>
            Xem
          </Button>
        </Link>
      ),
    },
  ];

  const lowStockColumns: ColumnsType<LowStockItem> = [
    {
      title: 'Tên thiết bị',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
            SKU: {record.sku}
          </Text>
        </div>
      ),
    },
    {
      title: 'Hiện có',
      dataIndex: 'availableQty',
      key: 'availableQty',
      render: (qty: number) => (
        <span style={{ fontWeight: 800, color: '#ef4444', fontFamily: 'monospace', fontSize: 14 }}>
          {qty} máy
        </span>
      ),
    },
    {
      title: 'Mức đặt lại',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      render: (lvl: number) => (
        <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{lvl} máy</span>
      ),
    },
    {
      title: 'Thiếu hụt',
      dataIndex: 'deficit',
      key: 'deficit',
      render: (def: number) => (
        <Tag color="red" style={{ fontWeight: 700, borderRadius: 6 }}>
          Thiếu {def} máy
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: () => (
        <Link to="/admin/inventory">
          <Button size="small" type="primary" ghost style={{ borderRadius: 6 }}>
            Nhập kho ngay
          </Button>
        </Link>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'orders',
      label: (
        <span>
          <ShoppingOutlined style={{ marginRight: 6 }} />
          Đơn hàng phát sinh gần đây
        </span>
      ),
      children: (
        <Table
          columns={orderColumns}
          dataSource={orders.slice(0, 8)}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      ),
    },
    {
      key: 'lowStock',
      label: (
        <span>
          <AlertOutlined style={{ marginRight: 6 }} />
          Cảnh báo tồn kho thấp{' '}
          {lowStockItems.length > 0 && (
            <Badge count={lowStockItems.length} overflowCount={99} style={{ backgroundColor: '#ef4444' }} />
          )}
        </span>
      ),
      children: (
        <Table
          columns={lowStockColumns}
          dataSource={lowStockItems}
          rowKey="variantId"
          loading={loading}
          pagination={{ pageSize: 5 }}
        />
      ),
    },
  ];

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
      }}
      styles={{ body: { padding: '16px 20px' } }}
      extra={
        <Link
          to="/admin/orders"
          style={{
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: '#2563eb',
            fontWeight: 600,
          }}
        >
          Xem tất cả đơn <ArrowRightOutlined />
        </Link>
      }
    >
      <Tabs items={tabItems} defaultActiveKey="orders" />
    </Card>
  );
};
```

- [ ] **Step 2: Commit changes**

```bash
git add frontend/src/pages/Admin/Dashboard/components/DashboardAlertsAndOrders.tsx
git commit -m "feat(frontend): implement DashboardAlertsAndOrders tabs"
```

---

### Task 7: Frontend - Integrate All Components into `AdminDashboardPage` and Refactor Layout

**Files:**
- Modify: `frontend/src/pages/Admin/Dashboard/AdminDashboardPage.tsx`

- [ ] **Step 1: Refactor `AdminDashboardPage.tsx` to orchestrate data fetching and render layout**

Cập nhật `frontend/src/pages/Admin/Dashboard/AdminDashboardPage.tsx`:
- Sử dụng state quản lý `preset` (mặc định `'30_DAYS'`), `dateRange: [string, string]`.
- Gọi đồng thời các API qua `reportService`:
  - `getDashboardSummary()`
  - `getRevenueReport(from, to)`
  - `getOrderStatusReport()`
  - `getBrandSalesReport(from, to)`
  - `getTopSellingProducts(10)`
  - `getLowStockReport()`
  - `orderService.getAllOrdersAdmin()`
- Sắp xếp layout:
  1. Header & Engine status badge
  2. `DashboardFilterBar`
  3. `DashboardKpiCards`
  4. Row 1: `RevenueChartCard` (lg=15) + `OrderStatusChartCard` (lg=9)
  5. Row 2: `TopProductsChartCard` (lg=14) + `BrandSalesChartCard` (lg=10)
  6. Row 3: `DashboardAlertsAndOrders`

- [ ] **Step 2: Verify `AdminDashboardPage` builds cleanly with TypeScript**

Run: `npm --prefix frontend run build`
Expected: Build successfully without any type errors.

- [ ] **Step 3: Commit changes**

```bash
git add frontend/src/pages/Admin/Dashboard/AdminDashboardPage.tsx
git commit -m "feat(frontend): integrate analytics charts and filter bar into AdminDashboardPage"
```

---

### Task 8: Verification & End-to-End Testing

**Files:**
- Test all suites: Backend Jest & Frontend Vitest

- [ ] **Step 1: Run all backend tests**

Run: `npm --prefix backend test`
Expected: 100% tests PASS

- [ ] **Step 2: Run all frontend tests**

Run: `npm --prefix frontend test`
Expected: 100% tests PASS

- [ ] **Step 3: Run frontend build check**

Run: `npm --prefix frontend run build`
Expected: Build passes with 0 errors

- [ ] **Step 4: Final commit and verify git clean**

```bash
git status
```



