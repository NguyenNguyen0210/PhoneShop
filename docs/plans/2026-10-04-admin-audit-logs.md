# Admin Audit Logs (`/admin/audit-logs`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build an enterprise-ready Audit Logs management page (`/admin/audit-logs`) with full-stack support: backend date-range/fuzzy search/statistics query, and frontend Ant Design dashboard with overview metrics, filters, data table, JSON diff drawer, and UTF-8 CSV export.

**Architecture:**
- **Backend:** Extend NestJS `FilterAuditLogDto` with `startDate`, `endDate`, and `search`. Implement date range filtering, multi-field fuzzy search, and a `getStats()` endpoint in `AuditLogService` and `AuditLogController`.
- **Frontend Services:** Create `auditLog.ts` type definitions and `auditLogService.ts` (API client for paginated logs, stats, and CSV blob export).
- **Frontend Presentation:** Add route `/admin/audit-logs` guarded by `RoleGuard(Role.ADMIN)` and menu item in `AdminSidebar.tsx`. Build `AdminAuditLogsPage.tsx` with 4 metric cards, a multi-parameter filter toolbar, Ant Design `Table`, and `AuditLogDetailDrawer.tsx` featuring side-by-side JSON diff highlighting.

**Tech Stack:** NestJS, Prisma ORM, TypeScript, React 18, Vite, Ant Design 5, Vitest, Jest.

---

## File Structure

### Backend
- Modify: `backend/src/modules/audit-log/dto/filter-audit-log.dto.ts` (Add `startDate`, `endDate`, `search`)
- Modify: `backend/src/modules/audit-log/audit-log.service.ts` (Add date filtering, keyword search, `getStats()`)
- Modify: `backend/src/modules/audit-log/audit-log.controller.ts` (Add `GET /audit-logs/stats`, update Swagger)
- Test: `backend/test/unit/audit-log.spec.ts` (Unit tests for service and controller)

### Frontend
- Create: `frontend/src/types/auditLog.ts` (Type definitions for AuditLog, Actions, Filters, Stats)
- Create: `frontend/src/services/auditLogService.ts` (API methods for audit logs, stats, CSV export)
- Test: `frontend/src/services/__tests__/auditLogService.spec.ts` (Unit test for auditLogService)
- Create: `frontend/src/pages/Admin/AuditLogs/components/AuditLogDetailDrawer.tsx` (Side drawer with JSON diff viewer)
- Create: `frontend/src/pages/Admin/AuditLogs/AdminAuditLogsPage.tsx` (Main page: Header, Stats, Filters, Table, Drawer)
- Modify: `frontend/src/routes/AppRoutes.tsx` (Register `/admin/audit-logs` under Admin layout with RoleGuard)
- Modify: `frontend/src/components/admin/AdminSidebar.tsx` (Add navigation item for Audit Logs)
- Test: `frontend/src/pages/Admin/AuditLogs/__tests__/AdminAuditLogsPage.spec.tsx` (Component test for main page)
- Test: `frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx` (Verify sidebar renders new menu)

---

## Tasks Overview

- [x] **Task 1: Backend DTO & Query Enhancement**

### Task 1: Backend DTO & Query Enhancement

**Files:**
- Modify: `backend/src/modules/audit-log/dto/filter-audit-log.dto.ts`
- Modify: `backend/src/modules/audit-log/audit-log.service.ts`
- Test: `backend/test/unit/audit-log.spec.ts`

- [x] **Step 1: Write failing unit test for AuditLogService query filtering & stats**

Create `backend/test/unit/audit-log.spec.ts`:
```typescript
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service';
import { AuditAction } from '@prisma/client';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: {
    auditLog: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      groupBy?: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      auditLog: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new AuditLogService(prisma as any);
  });

  describe('findAll with date range and search', () => {
    it('should build date range query when startDate and endDate are provided', async () => {
      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.findAll({
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-04T23:59:59.999Z',
        page: 1,
        limit: 20,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-10-01T00:00:00.000Z'),
              lte: new Date('2026-10-04T23:59:59.999Z'),
            },
          }),
        }),
      );
    });

    it('should build fuzzy search query when search term is provided', async () => {
      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.findAll({
        search: 'admin@example.com',
        page: 1,
        limit: 20,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { entity: { contains: 'admin@example.com', mode: 'insensitive' } },
              { entityId: { contains: 'admin@example.com', mode: 'insensitive' } },
              { ipAddress: { contains: 'admin@example.com' } },
              { user: { email: { contains: 'admin@example.com', mode: 'insensitive' } } },
            ]),
          }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should calculate total, today, and sensitive operation counts', async () => {
      prisma.auditLog.count
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(25)  // today
        .mockResolvedValueOnce(12); // sensitive

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalLogs: 150,
        todayLogs: 25,
        sensitiveOperations: 12,
      });
      expect(prisma.auditLog.count).toHaveBeenCalledTimes(3);
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test -- test/unit/audit-log.spec.ts`
Expected: FAIL (getStats is not a function / query fields missing)

- [x] **Step 3: Update FilterAuditLogDto**

Edit `backend/src/modules/audit-log/dto/filter-audit-log.dto.ts`:
```typescript
import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import { Type } from 'class-transformer';

export class FilterAuditLogDto {
  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Start date in ISO format' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date in ISO format' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Fuzzy search keyword' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;
}
```

- [x] **Step 4: Update AuditLogService implementation**

Edit `backend/src/modules/audit-log/audit-log.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterAuditLogDto } from './dto/filter-audit-log.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: FilterAuditLogDto) {
    const { action, entity, entityId, userId, startDate, endDate, search, page = 1, limit = 50 } = filter;
    const where: any = {};

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;

    if (userId) {
      where.OR = [{ userId }, { entity: 'User', entityId: userId }];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      const searchConditions: any[] = [
        { entity: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, sensitiveOperations] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: {
            in: [AuditAction.CHANGE_ROLE, AuditAction.CANCEL_ORDER, AuditAction.DELETE],
          },
        },
      }),
    ]);

    return {
      totalLogs,
      todayLogs,
      sensitiveOperations,
    };
  }
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npm --prefix backend test -- test/unit/audit-log.spec.ts`
Expected: PASS

- [x] **Step 6: Commit backend service changes**

```bash
git add backend/src/modules/audit-log/dto/filter-audit-log.dto.ts backend/src/modules/audit-log/audit-log.service.ts backend/test/unit/audit-log.spec.ts
git commit -m "feat(audit-log): add date range, search filters and stats query"
```
- [x] **Task 2: Backend Controller Stats Endpoint & Unit Tests**

### Task 2: Backend Controller Stats Endpoint & Unit Tests

**Files:**
- Modify: `backend/src/modules/audit-log/audit-log.controller.ts`
- Modify: `backend/test/unit/audit-log.spec.ts`

- [x] **Step 1: Add Controller tests to audit-log.spec.ts**

Append to `backend/test/unit/audit-log.spec.ts`:
```typescript
import { AuditLogController } from '../../src/modules/audit-log/audit-log.controller';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    getStats: jest.Mock;
  };

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getStats: jest.fn(),
    };
    controller = new AuditLogController(service as any);
  });

  it('should call service.getStats from /stats', async () => {
    service.getStats.mockResolvedValue({ totalLogs: 50, todayLogs: 10, sensitiveOperations: 2 });
    const result = await controller.getStats();
    expect(service.getStats).toHaveBeenCalled();
    expect(result).toEqual({ totalLogs: 50, todayLogs: 10, sensitiveOperations: 2 });
  });

  it('should call service.findAll with filter from /', async () => {
    service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    const filter = { page: 1, limit: 20 };
    const result = await controller.findAll(filter as any);
    expect(service.findAll).toHaveBeenCalledWith(filter);
    expect(result.total).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test -- test/unit/audit-log.spec.ts`
Expected: FAIL (`controller.getStats is not a function`)

- [x] **Step 3: Update AuditLogController**

Edit `backend/src/modules/audit-log/audit-log.controller.ts`:
```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { FilterAuditLogDto } from './dto/filter-audit-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Audit Log')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(Role.ADMIN) // System audit logs are strictly for ADMIN
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get overview statistics for audit logs (ADMIN)' })
  getStats() {
    return this.auditLogService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'Get all audit logs with filters (ADMIN)' })
  findAll(@Query() filter: FilterAuditLogDto) {
    return this.auditLogService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log details (ADMIN)' })
  findOne(@Param('id') id: string) {
    return this.auditLogService.findOne(id);
  }
}
```
*Note: `@Get('stats')` is declared before `@Get(':id')` so `stats` is not treated as a dynamic `:id` param.*

- [x] **Step 4: Run test to verify it passes**

Run: `npm --prefix backend test -- test/unit/audit-log.spec.ts`
Expected: PASS

- [x] **Step 5: Commit controller changes**

```bash
git add backend/src/modules/audit-log/audit-log.controller.ts backend/test/unit/audit-log.spec.ts
git commit -m "feat(audit-log): expose GET /audit-logs/stats for admin dashboard metrics"
```
- [x] **Task 3: Frontend Types & AuditLogService**

### Task 3: Frontend Types & AuditLogService

**Files:**
- Create: `frontend/src/types/auditLog.ts`
- Create: `frontend/src/services/auditLogService.ts`
- Create: `frontend/src/services/__tests__/auditLogService.spec.ts`

- [x] **Step 1: Write failing unit test for auditLogService**

Create `frontend/src/services/__tests__/auditLogService.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditLogService } from '../auditLogService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('auditLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAuditLogs should request GET /audit-logs with query params', async () => {
    const mockData = {
      data: [{ id: 'log-1', action: 'CREATE', entity: 'Product' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockData });

    const result = await auditLogService.getAuditLogs({ page: 1, limit: 20, action: 'CREATE' });
    expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', {
      params: { page: 1, limit: 20, action: 'CREATE' },
    });
    expect(result).toEqual(mockData);
  });

  it('getAuditLogStats should request GET /audit-logs/stats', async () => {
    const mockStats = { totalLogs: 100, todayLogs: 15, sensitiveOperations: 4 };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockStats });

    const result = await auditLogService.getAuditLogStats();
    expect(apiClient.get).toHaveBeenCalledWith('/audit-logs/stats');
    expect(result).toEqual(mockStats);
  });

  it('getAuditLogById should request GET /audit-logs/:id', async () => {
    const mockEntry = { id: 'log-123', action: 'UPDATE', entity: 'User' };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockEntry });

    const result = await auditLogService.getAuditLogById('log-123');
    expect(apiClient.get).toHaveBeenCalledWith('/audit-logs/log-123');
    expect(result).toEqual(mockEntry);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- src/services/__tests__/auditLogService.spec.ts`
Expected: FAIL (Cannot find module '../auditLogService')

- [x] **Step 3: Create types definition frontend/src/types/auditLog.ts**

Create `frontend/src/types/auditLog.ts`:
```typescript
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PAYMENT'
  | 'REFUND'
  | 'CANCEL_ORDER'
  | 'UPDATE_STOCK'
  | 'CHANGE_ROLE'
  | 'OTHER';

export interface AuditLogUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: AuditLogUser | null;
}

export interface AuditLogFilterParams {
  action?: AuditAction;
  entity?: string;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  todayLogs: number;
  sensitiveOperations: number;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

- [x] **Step 4: Create service frontend/src/services/auditLogService.ts**

Create `frontend/src/services/auditLogService.ts`:
```typescript
import { apiClient } from './apiClient';
import type {
  AuditLogEntry,
  AuditLogFilterParams,
  AuditLogStats,
  PaginatedAuditLogsResponse,
} from '../types/auditLog';

export const auditLogService = {
  getAuditLogs: async (params?: AuditLogFilterParams): Promise<PaginatedAuditLogsResponse> => {
    const res = await apiClient.get<PaginatedAuditLogsResponse>('/audit-logs', { params });
    return res.data;
  },

  getAuditLogById: async (id: string): Promise<AuditLogEntry> => {
    const res = await apiClient.get<AuditLogEntry>(`/audit-logs/${id}`);
    return res.data;
  },

  getAuditLogStats: async (): Promise<AuditLogStats> => {
    const res = await apiClient.get<AuditLogStats>('/audit-logs/stats');
    return res.data;
  },

  exportAuditLogsToCsv: async (params?: AuditLogFilterParams): Promise<void> => {
    // Fetch logs with current filter up to 1000 items for export
    const exportParams = { ...params, page: 1, limit: 1000 };
    const res = await apiClient.get<PaginatedAuditLogsResponse>('/audit-logs', { params: exportParams });
    const logs = res.data?.data || [];

    const headers = ['Thời gian', 'Người thực hiện', 'Email', 'Hành động', 'Thực thể', 'Entity ID', 'Địa chỉ IP'];
    const rows = logs.map((log) => [
      `"${new Date(log.createdAt).toLocaleString('vi-VN')}"`,
      `"${[log.user?.firstName, log.user?.lastName].filter(Boolean).join(' ') || (log.userId ? log.userId : 'Hệ thống')}"`,
      `"${log.user?.email || ''}"`,
      `"${log.action}"`,
      `"${log.entity}"`,
      `"${log.entityId || ''}"`,
      `"${log.ipAddress || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npm --prefix frontend test -- src/services/__tests__/auditLogService.spec.ts`
Expected: PASS

- [x] **Step 6: Commit frontend types & service**

```bash
git add frontend/src/types/auditLog.ts frontend/src/services/auditLogService.ts frontend/src/services/__tests__/auditLogService.spec.ts
git commit -m "feat(frontend): add auditLog types, service with stats and CSV export"
```
- [x] **Task 4: Frontend Detail Drawer with JSON Diff Viewer**

### Task 4: Frontend Detail Drawer with JSON Diff Viewer

**Files:**
- Create: `frontend/src/pages/Admin/AuditLogs/components/AuditLogDetailDrawer.tsx`

- [x] **Step 1: Write AuditLogDetailDrawer component skeleton and implementation**

Create `frontend/src/pages/Admin/AuditLogs/components/AuditLogDetailDrawer.tsx`:
```tsx
import React, { useState } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Tabs,
  Typography,
  Space,
  Button,
  message,
  Empty,
  Card,
  Row,
  Col,
} from 'antd';
import {
  CopyOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  DesktopOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { AuditLogEntry, AuditAction } from '../../../../types/auditLog';

const { Text, Paragraph } = Typography;

interface AuditLogDetailDrawerProps {
  open: boolean;
  log: AuditLogEntry | null;
  onClose: () => void;
}

export const getActionTagColor = (action: AuditAction): string => {
  switch (action) {
    case 'CREATE':
      return 'success';
    case 'UPDATE':
      return 'processing';
    case 'DELETE':
      return 'error';
    case 'LOGIN':
    case 'LOGOUT':
      return 'cyan';
    case 'PAYMENT':
    case 'REFUND':
      return 'gold';
    case 'CANCEL_ORDER':
      return 'volcano';
    case 'CHANGE_ROLE':
      return 'purple';
    case 'UPDATE_STOCK':
      return 'geekblue';
    default:
      return 'default';
  }
};

export const AuditLogDetailDrawer: React.FC<AuditLogDetailDrawerProps> = ({
  open,
  log,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('diff');

  if (!log) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Đã sao chép ${label} vào bộ nhớ tạm!`);
  };

  const oldKeys = log.oldData ? Object.keys(log.oldData) : [];
  const newKeys = log.newData ? Object.keys(log.newData) : [];
  const allKeys = Array.from(new Set([...oldKeys, ...newKeys]));

  const renderDiffSection = () => {
    if (!log.oldData && !log.newData) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Bản ghi này không lưu trữ dữ liệu thay đổi (JSON payload)"
        />
      );
    }

    if (!log.oldData && log.newData) {
      return (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Tag icon={<PlusCircleOutlined />} color="success">
              Dữ liệu được tạo mới
            </Tag>
          </div>
          <pre
            style={{
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              padding: 12,
              borderRadius: 6,
              overflowX: 'auto',
              fontSize: 13,
            }}
          >
            {JSON.stringify(log.newData, null, 2)}
          </pre>
        </div>
      );
    }

    if (log.oldData && !log.newData) {
      return (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Tag icon={<MinusCircleOutlined />} color="error">
              Dữ liệu đã bị xóa
            </Tag>
          </div>
          <pre
            style={{
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              padding: 12,
              borderRadius: 6,
              overflowX: 'auto',
              fontSize: 13,
            }}
          >
            {JSON.stringify(log.oldData, null, 2)}
          </pre>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {allKeys.map((key) => {
          const oldVal = log.oldData ? log.oldData[key] : undefined;
          const newVal = log.newData ? log.newData[key] : undefined;
          const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          return (
            <Card
              key={key}
              size="small"
              title={
                <Space>
                  <Text strong>{key}</Text>
                  {isChanged ? (
                    <Tag color="warning">Thay đổi</Tag>
                  ) : (
                    <Tag color="default">Không đổi</Tag>
                  )}
                </Space>
              }
              style={{
                borderColor: isChanged ? '#faad14' : '#f0f0f0',
                background: isChanged ? '#fffbe6' : '#ffffff',
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Trước thay đổi:
                  </Text>
                  <div
                    style={{
                      background: isChanged ? '#fff1f0' : '#fafafa',
                      color: isChanged ? '#cf1322' : '#595959',
                      padding: '6px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {oldVal !== undefined ? JSON.stringify(oldVal) : <i>undefined</i>}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Sau thay đổi:
                  </Text>
                  <div
                    style={{
                      background: isChanged ? '#f6ffed' : '#fafafa',
                      color: isChanged ? '#389e0d' : '#595959',
                      padding: '6px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {newVal !== undefined ? JSON.stringify(newVal) : <i>undefined</i>}
                  </div>
                </Col>
              </Row>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderRawJsonSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {log.oldData && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text strong>Dữ liệu cũ (oldData)</Text>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(JSON.stringify(log.oldData, null, 2), 'oldData')}
            >
              Sao chép
            </Button>
          </div>
          <pre
            style={{
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              padding: 12,
              borderRadius: 6,
              overflowX: 'auto',
              fontSize: 12,
              maxHeight: 250,
            }}
          >
            {JSON.stringify(log.oldData, null, 2)}
          </pre>
        </div>
      )}

      {log.newData && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text strong>Dữ liệu mới (newData)</Text>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(JSON.stringify(log.newData, null, 2), 'newData')}
            >
              Sao chép
            </Button>
          </div>
          <pre
            style={{
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              padding: 12,
              borderRadius: 6,
              overflowX: 'auto',
              fontSize: 12,
              maxHeight: 250,
            }}
          >
            {JSON.stringify(log.newData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          <span>Chi tiết bản ghi kiểm toán</span>
        </Space>
      }
      placement="right"
      width={680}
      onClose={onClose}
      open={open}
      extra={
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={() => copyToClipboard(log.id, 'Log ID')}
        >
          Sao chép ID
        </Button>
      }
    >
      <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
        <Descriptions.Item label="Mã Log">
          <Text code copyable>{log.id}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Thời gian">
          {new Date(log.createdAt).toLocaleString('vi-VN')}
        </Descriptions.Item>
        <Descriptions.Item label="Hành động">
          <Tag color={getActionTagColor(log.action)}>{log.action}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Thực thể (Entity)">
          <Space>
            <Tag color="blue">{log.entity}</Tag>
            {log.entityId && <Text code copyable>{log.entityId}</Text>}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Người thực hiện">
          {log.user ? (
            <div>
              <Text strong>{[log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || 'Chưa đặt tên'}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>({log.user.email})</Text>
            </div>
          ) : log.userId ? (
            <Text code>{log.userId}</Text>
          ) : (
            <Text italic>Hệ thống tự động</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ IP">
          <Space>
            <GlobalOutlined />
            <Text code>{log.ipAddress || 'N/A'}</Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="User Agent">
          <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }} style={{ marginBottom: 0 }}>
            <DesktopOutlined style={{ marginRight: 6 }} />
            {log.userAgent || 'N/A'}
          </Paragraph>
        </Descriptions.Item>
      </Descriptions>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'diff',
            label: 'So sánh thay đổi (Diff)',
            children: renderDiffSection(),
          },
          {
            key: 'raw',
            label: 'Dữ liệu gốc (JSON)',
            children: renderRawJsonSection(),
          },
        ]}
      />
    </Drawer>
  );
};
```

- [x] **Step 2: Commit AuditLogDetailDrawer component**

```bash
git add frontend/src/pages/Admin/AuditLogs/components/AuditLogDetailDrawer.tsx
git commit -m "feat(frontend): create AuditLogDetailDrawer with JSON diff and raw tabs"
```
- [x] **Task 5: Frontend AdminAuditLogsPage**

### Task 5: Frontend AdminAuditLogsPage

**Files:**
- Create: `frontend/src/pages/Admin/AuditLogs/AdminAuditLogsPage.tsx`

- [x] **Step 1: Create AdminAuditLogsPage component with metrics, filters, and table**

Create `frontend/src/pages/Admin/AuditLogs/AdminAuditLogsPage.tsx`:
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  DatePicker,
  Typography,
  Tooltip,
  message,
  Avatar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  UserOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { auditLogService } from '../../../services/auditLogService';
import type { AuditLogEntry, AuditAction, AuditLogStats } from '../../../types/auditLog';
import { AuditLogDetailDrawer, getActionTagColor } from './components/AuditLogDetailDrawer';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

const ACTION_OPTIONS: { label: string; value: AuditAction }[] = [
  { label: 'Tạo mới (CREATE)', value: 'CREATE' },
  { label: 'Cập nhật (UPDATE)', value: 'UPDATE' },
  { label: 'Xóa (DELETE)', value: 'DELETE' },
  { label: 'Đăng nhập (LOGIN)', value: 'LOGIN' },
  { label: 'Đăng xuất (LOGOUT)', value: 'LOGOUT' },
  { label: 'Thanh toán (PAYMENT)', value: 'PAYMENT' },
  { label: 'Hoàn tiền (REFUND)', value: 'REFUND' },
  { label: 'Hủy đơn hàng (CANCEL_ORDER)', value: 'CANCEL_ORDER' },
  { label: 'Cập nhật kho (UPDATE_STOCK)', value: 'UPDATE_STOCK' },
  { label: 'Phân quyền (CHANGE_ROLE)', value: 'CHANGE_ROLE' },
  { label: 'Khác (OTHER)', value: 'OTHER' },
];

const ENTITY_OPTIONS = [
  { label: 'Người dùng (User)', value: 'User' },
  { label: 'Đơn hàng (Order)', value: 'Order' },
  { label: 'Sản phẩm (Product)', value: 'Product' },
  { label: 'Danh mục (Category)', value: 'Category' },
  { label: 'Đổi trả (ReturnRequest)', value: 'ReturnRequest' },
  { label: 'Kho & IMEI (Inventory/IMEI)', value: 'Inventory' },
  { label: 'Phiếu hỗ trợ (Ticket)', value: 'Ticket' },
];

export const AdminAuditLogsPage: React.FC = () => {
  // Data states
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Stats
  const [stats, setStats] = useState<AuditLogStats>({
    totalLogs: 0,
    todayLogs: 0,
    sensitiveOperations: 0,
  });

  // Filters
  const [actionFilter, setActionFilter] = useState<AuditAction | undefined>(undefined);
  const [entityFilter, setEntityFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // Detail drawer
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await auditLogService.getAuditLogStats();
      setStats(data);
    } catch {
      // Ignore background stats fetch errors
    }
  }, []);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
      };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString();
        params.endDate = dateRange[1].endOf('day').toISOString();
      }

      const res = await auditLogService.getAuditLogs(params);
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch {
      message.error('Không thể tải danh sách nhật ký kiểm toán. Vui lòng thử lại.');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, entityFilter, debouncedSearch, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleResetFilters = () => {
    setActionFilter(undefined);
    setEntityFilter(undefined);
    setSearch('');
    setDateRange(null);
    setPage(1);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString();
        params.endDate = dateRange[1].endOf('day').toISOString();
      }
      await auditLogService.exportAuditLogsToCsv(params);
      message.success('Đã tải xuống tệp CSV nhật ký kiểm toán thành công!');
    } catch {
      message.error('Lỗi khi xuất tệp CSV!');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<AuditLogEntry> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => (
        <Tooltip title={new Date(val).toISOString()}>
          <Space orientation="vertical" size={2}>
            <Text strong style={{ fontSize: 13 }}>
              {new Date(val).toLocaleDateString('vi-VN')}
            </Text>
            <Text orientation="left" type="secondary" style={{ fontSize: 12 }}>
              {new Date(val).toLocaleTimeString('vi-VN')}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Người thực hiện',
      key: 'user',
      width: 220,
      render: (_, record) => {
        if (!record.user && !record.userId) {
          return (
            <Space orientation="horizontal" size={8}>
              <Avatar size="small" icon={<ThunderboltOutlined />} style={{ backgroundColor: '#8c8c8c' }} />
              <Text orientation="left" italic>Hệ thống tự động</Text>
            </Space>
          );
        }
        const name = [record.user?.firstName, record.user?.lastName].filter(Boolean).join(' ') || 'Admin/User';
        return (
          <Space orientation="horizontal" size={8}>
            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
            <div>
              <Text strong style={{ display: 'block', fontSize: 13 }}>
                {name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.user?.email || record.userId}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action: AuditAction) => (
        <Tag color={getActionTagColor(action)} style={{ fontWeight: 500 }}>
          {action}
        </Tag>
      ),
    },
    {
      title: 'Thực thể / Bản ghi',
      key: 'entity',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{record.entity}</Tag>
          {record.entityId && (
            <Tooltip title="Nhấp để sao chép ID">
              <Text
                code
                style={{ fontSize: 11, cursor: 'pointer' }}
                onClick={() => {
                  navigator.clipboard.writeText(record.entityId!);
                  message.success('Đã sao chép Entity ID!');
                }}
              >
                {record.entityId.length > 16 ? `${record.entityId.slice(0, 16)}...` : record.entityId}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Địa chỉ IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (ip: string | null) => (
        <Space>
          <GlobalOutlined style={{ color: '#8c8c8c' }} />
          <Text code style={{ fontSize: 12 }}>{ip || 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actionButton',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedLog(record);
            setIsDrawerOpen(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <SafetyCertificateOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            Nhật ký kiểm toán hệ thống
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
            Theo dõi vết lịch sử thay đổi dữ liệu, đăng nhập và các thao tác quản trị trên toàn sàn thương mại điện tử.
          </Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchLogs(); fetchStats(); }} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportCsv}
            loading={exporting}
          >
            Xuất CSV
          </Button>
        </Space>
      </div>

      {/* Metrics Overview Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng số nhật ký hệ thống"
              value={stats.totalLogs}
              prefix={<HistoryOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Hoạt động hôm nay"
              value={stats.todayLogs}
              valueStyle={{ color: '#52c41a' }}
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Thao tác nhạy cảm (Xóa/Hủy/Role)"
              value={stats.sensitiveOperations}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<WarningOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Card */}
      <Card
        bordered={false}
        style={{ marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates as any);
                setPage(1);
              }}
              placeholder={['Từ ngày', 'Đến ngày']}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              allowClear
              placeholder="Lọc theo hành động"
              style={{ width: '100%' }}
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              options={ACTION_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              allowClear
              placeholder="Lọc theo thực thể"
              style={{ width: '100%' }}
              value={entityFilter}
              onChange={(val) => {
                setEntityFilter(val);
                setPage(1);
              }}
              options={ENTITY_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              allowClear
              placeholder="Tìm email, entityId, IP..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={2}>
            <Button onClick={handleResetFilters} style={{ width: '100%' }}>
              Đặt lại
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Table Card */}
      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table<AuditLogEntry>
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t) => `Tổng cộng ${t} bản ghi`,
            onChange: (p, ps) => {
              setPage(p);
              setLimit(ps);
            },
          }}
        />
      </Card>

      {/* Detail Drawer */}
      <AuditLogDetailDrawer
        open={isDrawerOpen}
        log={selectedLog}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
};

export default AdminAuditLogsPage;
```

- [x] **Step 2: Commit AdminAuditLogsPage component**

```bash
git add frontend/src/pages/Admin/AuditLogs/AdminAuditLogsPage.tsx
git commit -m "feat(frontend): create AdminAuditLogsPage with metrics, filters, and logs table"
```
- [x] **Task 6: Routing & Admin Sidebar Integration**

### Task 6: Routing & Admin Sidebar Integration

**Files:**
- Modify: `frontend/src/routes/AppRoutes.tsx`
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`

- [x] **Step 1: Register route in AppRoutes.tsx**

Edit `frontend/src/routes/AppRoutes.tsx`:
Add import:
```typescript
import { AdminAuditLogsPage } from '../pages/Admin/AuditLogs/AdminAuditLogsPage';
```
Add Route inside the `<Route element={<AdminLayout />}>` block (restricted to `ADMIN`):
```tsx
          <Route
            path="/admin/audit-logs"
            element={
              <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                <AdminAuditLogsPage />
              </RoleGuard>
            }
          />
```

- [x] **Step 2: Add Audit Logs to AdminSidebar.tsx**

Edit `frontend/src/components/admin/AdminSidebar.tsx`:
Add icon import `SafetyCertificateOutlined`:
```typescript
import {
  DashboardOutlined,
  ShoppingOutlined,
  BarcodeOutlined,
  OrderedListOutlined,
  CreditCardOutlined,
  UndoOutlined,
  CommentOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
```
Add item to `adminMenuItems`:
```typescript
  {
    key: '/admin/audit-logs',
    icon: <SafetyCertificateOutlined style={{ fontSize: 16 }} />,
    label: 'Nhật ký kiểm toán',
  },
```
(Place right after `key: '/admin/users'`).

- [x] **Step 3: Commit routing & sidebar changes**

```bash
git add frontend/src/routes/AppRoutes.tsx frontend/src/components/admin/AdminSidebar.tsx
git commit -m "feat(frontend): integrate /admin/audit-logs route and admin sidebar navigation"
```

---

- [x] **Task 7: Component Tests & End-to-End Build Verification**

### Task 7: Component Tests & End-to-End Build Verification

**Files:**
- Modify: `frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx`
- Create: `frontend/src/pages/Admin/AuditLogs/__tests__/AdminAuditLogsPage.spec.tsx`

- [x] **Step 1: Update AdminSidebar.spec.tsx to verify 'Nhật ký kiểm toán' item**

Edit `frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx`:
Add test assertion:
```typescript
  it('should render Nhật ký kiểm toán menu item', () => {
    render(
      <MemoryRouter>
        <AdminSidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('Nhật ký kiểm toán')).toBeInTheDocument();
  });
```

- [x] **Step 2: Create unit/component test for AdminAuditLogsPage**

Create `frontend/src/pages/Admin/AuditLogs/__tests__/AdminAuditLogsPage.spec.tsx`:
```tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminAuditLogsPage } from '../AdminAuditLogsPage';
import { auditLogService } from '../../../services/auditLogService';

vi.mock('../../../services/auditLogService', () => ({
  auditLogService: {
    getAuditLogs: vi.fn(),
    getAuditLogStats: vi.fn(),
    exportAuditLogsToCsv: vi.fn(),
  },
}));

describe('AdminAuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auditLogService.getAuditLogStats as any).mockResolvedValue({
      totalLogs: 120,
      todayLogs: 15,
      sensitiveOperations: 5,
    });
    (auditLogService.getAuditLogs as any).mockResolvedValue({
      data: [
        {
          id: 'log-001',
          action: 'CREATE',
          entity: 'Product',
          entityId: 'prod-123',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date().toISOString(),
          user: {
            id: 'u-1',
            email: 'admin@system.com',
            firstName: 'Super',
            lastName: 'Admin',
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('should render header and metric cards', async () => {
    render(<AdminAuditLogsPage />);

    expect(screen.getByText('Nhật ký kiểm toán hệ thống')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Tổng số nhật ký hệ thống')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('should render audit log rows and open detail drawer on click', async () => {
    render(<AdminAuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('admin@system.com')).toBeInTheDocument();
    });

    const detailBtn = screen.getByRole('button', { name: /chi tiết/i });
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết bản ghi kiểm toán')).toBeInTheDocument();
      expect(screen.getByText('Mã Log')).toBeInTheDocument();
    });
  });
});
```

- [x] **Step 3: Run Vitest tests to verify all tests pass**

Run:
```bash
npm --prefix frontend test -- src/components/admin/__tests__/AdminSidebar.spec.tsx src/pages/Admin/AuditLogs/__tests__/AdminAuditLogsPage.spec.tsx
```
Expected: PASS

- [x] **Step 4: Run backend Jest tests**

Run:
```bash
npm --prefix backend test -- test/unit/audit-log.spec.ts
```
Expected: PASS

- [x] **Step 5: Run TypeScript build check across frontend and backend**

Run:
```bash
npm --prefix frontend run build
npm --prefix backend run build
```
Expected: TypeScript compile passes without errors

- [x] **Step 6: Commit all tests and plan completion**

```bash
git add frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx frontend/src/pages/Admin/AuditLogs/__tests__/AdminAuditLogsPage.spec.tsx
git commit -m "test(audit-log): add component and integration tests for audit log management"
```
