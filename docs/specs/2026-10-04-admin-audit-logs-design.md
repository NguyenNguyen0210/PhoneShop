# Design Specification: Admin Audit Logs Management (`/admin/audit-logs`)

- **Date:** 2026-10-04
- **Author:** Antigravity Engineering Team
- **Status:** Approved
- **Scope:** Full-stack (Backend Query Enhancement + Frontend Management UI)

---

## 1. Overview & Problem Statement

Currently, the system captures audit logs for critical operations across various services (authentication, user profile updates, orders, inventory, etc.) and persists them in the `audit_logs` table via Prisma.

While a partial timeline drawer exists inside the User Management screen (`UserAuditLogsDrawer`), the system lacks a centralized administrative interface for audit logs (`/admin/audit-logs`). System Administrators have no central portal to monitor, query, filter, inspect before/after diffs, or export audit logs for security, compliance, and operational incident tracking.

This specification details the end-to-end architecture and implementation to deliver a comprehensive, enterprise-ready Audit Logs management interface.

---

## 2. Architecture & Backend Enhancements

### 2.1 Backend DTO (`backend/src/modules/audit-log/dto/filter-audit-log.dto.ts`)
Extend `FilterAuditLogDto` to support date-range filtering, full-text keyword searches, and statistics queries:
```typescript
import { IsEnum, IsOptional, IsString, IsNumber, IsDateString, Min } from 'class-validator';
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
```

### 2.2 Backend Service & Endpoints (`backend/src/modules/audit-log/audit-log.service.ts` & `audit-log.controller.ts`)
1. **Enhanced `findAll(filter: FilterAuditLogDto)`**:
   - `createdAt` filter: Constructs `{ gte: new Date(startDate), lte: new Date(endDate) }`.
   - `search` filter: Case-insensitive fuzzy matching across:
     - `entity`
     - `entityId`
     - `ipAddress`
     - `user.email`, `user.firstName`, `user.lastName`
   - Explicit filters: `action`, `entity`, `entityId`, `userId`.
   - Optimized pagination: Queries count and rows concurrently with indexed sort on `createdAt: 'desc'`.
2. **New `getStats()` Endpoint (`GET /audit-logs/stats`)**:
   - Calculates key indicators:
     - `totalLogs`: Total records in database.
     - `todayLogs`: Logs created since `00:00:00` of current date.
     - `sensitiveOperations`: Count of actions with elevated security impact (`CHANGE_ROLE`, `CANCEL_ORDER`, `DELETE`).
     - `activeOperators`: Count of distinct `userId`s who performed actions within the last 24 hours.

---

## 3. Frontend Architecture

### 3.1 Type Definitions (`frontend/src/types/auditLog.ts`)
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
  activeOperators: number;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### 3.2 Service Layer (`frontend/src/services/auditLogService.ts`)
- `getAuditLogs(params: AuditLogFilterParams): Promise<PaginatedAuditLogsResponse>`
- `getAuditLogById(id: string): Promise<AuditLogEntry>`
- `getAuditLogStats(): Promise<AuditLogStats>`
- `exportAuditLogs(params: AuditLogFilterParams): Promise<Blob>` (Exports CSV with UTF-8 BOM encoding for Excel compatibility)

---

## 4. User Interface & Experience Specifications

### 4.1 Route & Sidebar Integration
- Route URL: `/admin/audit-logs`
- Route Guard: `<RoleGuard allowedRoles={[ROLES.ADMIN]}>`
- Navigation: Add item to `AdminSidebar.tsx`:
  - Label: `"Nhật ký kiểm toán"`
  - Key: `"/admin/audit-logs"`
  - Icon: `<SafetyCertificateOutlined />`
  - Position: Right beside User Management (`/admin/users`).

### 4.2 Page Layout (`frontend/src/pages/Admin/AuditLogs/AdminAuditLogsPage.tsx`)
1. **Page Header:**
   - Title: `Nhật ký kiểm toán hệ thống`
   - Subtitle: `Theo dõi lịch sử truy cập, thay đổi dữ liệu và mọi thao tác quản trị trên toàn sàn thương mại điện tử.`
   - Actions:
     - `Làm mới` (ReloadOutlined button with loading indicator)
     - `Xuất CSV` (DownloadOutlined button with active filters applied)

2. **Metrics Overview Cards:**
   - 4 responsive cards showing:
     - Total Logs
     - Logs Today
     - Sensitive Actions (`CHANGE_ROLE`, `CANCEL_ORDER`, `DELETE`)
     - Active Operators in 24h

3. **Advanced Filter Toolbar:**
   - **Date Range Picker:** Presets for *Hôm nay*, *7 ngày qua*, *30 ngày qua*, *Tháng này*.
   - **Action Filter Select:** Single/multiple select for `AuditAction` with custom colored badges.
   - **Entity Filter Input/Select:** Filter by common entities (`User`, `Order`, `Product`, `Category`, `ReturnRequest`, `Inventory`, etc.).
   - **Search Input:** Free-text debounce (300ms) matching email, entityId, IP.
   - **Reset Filter Button:** Clears all applied filters and restores default state.

4. **Audit Logs Table:**
   - Columns:
     - `Thời gian`: Formatted `DD/MM/YYYY HH:mm:ss` + relative time tooltip.
     - `Người thực hiện`: Avatar + Full Name + Email or "Hệ thống".
     - `Hành động`: Tag styled according to action category.
     - `Thực thể / ID`: Entity name with tag + truncated `entityId` with one-click copy.
     - `Địa chỉ IP`: IP Address with tooltip.
     - `Thao tác`: "Chi tiết" button triggering the side drawer.
   - Pagination: Server-side pagination with page size options (10, 20, 50, 100).

### 4.3 Detail Drawer & Diff Viewer (`frontend/src/pages/Admin/AuditLogs/components/AuditLogDetailDrawer.tsx`)
- Drawer Width: 650px (Right placement).
- Content Sections:
  1. **Metadata Overview:** ID, Timestamp, User details, IP address, Full User Agent browser/platform string.
  2. **Data Comparison (Diff Viewer):**
     - Two tabs: **"So sánh thay đổi (Diff)"** and **"Dữ liệu gốc (Raw JSON)"**.
     - Diff tab parses `oldData` and `newData` keys:
       - Displays modified keys with before (red) and after (green) highlights.
       - Handles created entities (`oldData` is null) with informative badge.
       - Handles deleted entities (`newData` is null) with warning badge.
     - Raw JSON tab offers JSON code viewer with formatted syntax and one-click copy button.

### 4.4 UX State Coverage
- **Loading State:** Table skeleton or spinning overlay while data is being fetched.
- **Empty State:** Illustrated empty card with clear messaging when search yields no results.
- **Error State:** Error banner or toast notification if server is unreachable.
- **Permission State:** Immediate redirection to `/admin` or standard 403 error for non-Admin users.

---

## 5. Testing & Validation Strategy

1. **Unit & Integration Tests:**
   - Backend unit tests for `AuditLogService` ensuring `startDate`, `endDate`, `search`, and `getStats` queries execute correctly.
   - Frontend service tests for `auditLogService.ts` verifying API calls and query param serializations.
   - Component tests for `AdminAuditLogsPage` and `AuditLogDetailDrawer` verifying rendering, filtering, and diff calculation.
2. **Manual End-to-End Verification:**
   - Log in as ADMIN.
   - Navigate to `/admin/audit-logs` via sidebar.
   - Test filtering by date range, action, and keyword.
   - Open detail drawer for UPDATE, CREATE, and DELETE actions to verify diff presentation.
   - Test CSV export with Vietnamese characters and UTF-8 encoding.
   - Verify non-admin role redirection.
