# Kế Hoạch Triển Khai: Tinh Giản Customer 360 & Audit Log (Level Intern)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tinh gọn toàn diện cấu trúc backend và giao diện frontend của Customer 360 và Audit Log, loại bỏ code rườm rà/mock CRM notes/JSON diff phức tạp để mã nguồn đạt chuẩn mực trực quan, dễ bảo trì và phù hợp cấp độ Intern.

**Architecture:** 
- Customer 360: Thu gọn DTO và Prisma query trong `UsersService` chỉ lấy thông tin cá nhân, 2 chỉ số thực tế (`totalSpent`, `totalOrders`), đơn hàng gần đây và địa chỉ. Xây dựng component `Customer360View.tsx` dùng chung cho cả Admin và Staff.
- Audit Log: Thu gọn DTO và Prisma query trong `AuditLogService` chỉ lọc theo `action` và `search`. Frontend tinh gọn Table hiển thị và Drawer chi tiết JSON sạch sẽ, loại bỏ 4 thẻ KPI thống kê rườm rà và xuất CSV.

**Tech Stack:** NestJS 11, Prisma ORM, React 19, TypeScript, Ant Design 6.

---

## Danh Sách File Tác Động

### Backend:
- `backend/src/modules/users/dto/customer-360.dto.ts`: Định nghĩa DTO phản hồi tinh gọn cho Customer 360.
- `backend/src/modules/users/users.service.ts`: Rút gọn phương thức `getCustomer360(id, currentUser)`.
- `backend/src/modules/audit-log/dto/filter-audit-log.dto.ts`: Tinh giản DTO bộ lọc tìm kiếm Audit Log.
- `backend/src/modules/audit-log/audit-log.service.ts`: Tinh giản phương thức `findAll(filter)` của Audit Log.

### Frontend:
- `frontend/src/types/customer.ts`: Cập nhật interface `Customer360Data` và `Customer360Metrics`.
- `frontend/src/components/common/Customer360View.tsx`: Tạo component dùng chung giao diện Customer 360 cho Admin & Staff.
- `frontend/src/pages/Admin/Customers/AdminCustomer360Page.tsx`: Chuyển thành thin wrapper gọi `Customer360View`.
- `frontend/src/pages/Staff/Customers/StaffCustomer360Page.tsx`: Chuyển thành thin wrapper gọi `Customer360View`.
- `frontend/src/pages/Admin/AuditLogs/AdminAuditLogsPage.tsx`: Bỏ 4 thẻ KPI, RangePicker, nút CSV, giữ lại Table và Search/Action filter.
- `frontend/src/pages/Admin/AuditLogs/components/AuditLogDetailDrawer.tsx`: Bỏ diff JSON engine phức tạp, thay bằng Descriptions và `<pre>` format JSON sạch sẽ.

---

### Task 1: Tinh Giản Backend Customer 360 DTO & Service

**Files:**
- Modify: `backend/src/modules/users/dto/customer-360.dto.ts`
- Modify: `backend/src/modules/users/users.service.ts`

- [x] **Step 1: Cập nhật `customer-360.dto.ts`**

Thay thế toàn bộ nội dung `backend/src/modules/users/dto/customer-360.dto.ts` bằng định nghĩa tinh gọn:
```typescript
export interface Customer360Metrics {
  totalSpent: number;
  totalOrders: number;
}

export interface Customer360AddressItem {
  id: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface Customer360OrderItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: Date;
  itemCount: number;
}

export interface Customer360Response {
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    status: string;
    createdAt: Date;
  };
  metrics: Customer360Metrics;
  addresses: Customer360AddressItem[];
  recentOrders: Customer360OrderItem[];
}
```

- [x] **Step 2: Cập nhật phương thức `getCustomer360` trong `users.service.ts`**

Trong `backend/src/modules/users/users.service.ts`, sửa lại hàm `getCustomer360` để chỉ lấy `user`, `addresses`, `orders` (bỏ tickets và warranties):
```typescript
  async getCustomer360(id: string, currentUser: any): Promise<Customer360Response> {
    const user = await this.findOne(id, currentUser);

    const [orders, addresses] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          payments: {
            take: 1,
            select: { status: true },
          },
          items: {
            select: { quantity: true },
          },
        },
      }),
      this.prisma.address.findMany({
        where: { userId: id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          recipientName: true,
          phone: true,
          addressLine1: true,
          ward: true,
          district: true,
          city: true,
          isDefault: true,
        },
      }),
    ]);

    const totalOrders = orders.length;
    const totalSpent = orders
      .filter((o: any) => {
        const isPaid = o.payments?.[0]?.status === 'PAID';
        return isPaid || o.status === 'COMPLETED';
      })
      .reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);

    const recentOrders: Customer360OrderItem[] = orders.map((o: any) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.payments?.[0]?.status || 'PENDING',
      totalAmount: Number(o.totalAmount || 0),
      createdAt: o.createdAt,
      itemCount: o.items?.reduce((cnt: number, it: any) => cnt + (it.quantity || 1), 0) || 0,
    }));

    return {
      customer: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
      },
      metrics: {
        totalSpent,
        totalOrders,
      },
      addresses,
      recentOrders,
    };
  }
```

- [x] **Step 3: Kiểm tra biên dịch tĩnh Backend**

Chạy lệnh kiểm tra type:
```bash
npx tsc --noEmit
```
(workdir: `backend`)  
Kỳ vọng: Không có lỗi biên dịch (Exit 0).

- [x] **Step 4: Commit thay đổi Task 1**

```bash
git add backend/src/modules/users/dto/customer-360.dto.ts backend/src/modules/users/users.service.ts
git commit -m "refactor(backend): simplify customer 360 dto and service logic"
```

---

### Task 2: Tạo Component Dùng Chung `Customer360View` & Tái Cấu Trúc Frontend

**Files:**
- Modify: `frontend/src/types/customer.ts`
- Create: `frontend/src/components/common/Customer360View.tsx`
- Modify: `frontend/src/pages/Admin/Customers/AdminCustomer360Page.tsx`
- Modify: `frontend/src/pages/Staff/Customers/StaffCustomer360Page.tsx`

- [x] **Step 1: Cập nhật `frontend/src/types/customer.ts`**

Cập nhật `Customer360Metrics` và `Customer360Data`:
```typescript
export interface Customer360Metrics {
  totalSpent: number;
  totalOrders: number;
}

export interface Customer360Data {
  customer: CustomerSummary;
  metrics: Customer360Metrics;
  addresses: Array<{
    id: string;
    recipientName: string;
    phone: string;
    addressLine1: string;
    ward: string;
    district: string;
    city: string;
    isDefault: boolean;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    createdAt: string;
    itemCount: number;
  }>;
}
```

- [x] **Step 2: Tạo component `frontend/src/components/common/Customer360View.tsx`**

Tạo component hoàn chỉnh với UI tinh tế, hỗ trợ Loading, Error, Empty state, Header thông tin khách hàng, 2 thẻ KPI và 2 Tabs (Đơn hàng & Địa chỉ):
- Sử dụng Ant Design `Card`, `Table`, `Tag`, `Avatar`, `Statistic`, `Tabs`, `Button`.
- Format tiền tệ `Intl.NumberFormat('vi-VN')`.
- Map màu sắc Tag trạng thái chuẩn mực (`COMPLETED`: green, `CANCELLED`: red, `PROCESSING`: blue, `PENDING`: orange).

- [x] **Step 3: Tinh giản `AdminCustomer360Page.tsx` và `StaffCustomer360Page.tsx`**

Cả 2 file trang Admin và Staff chỉ cần mount `Customer360View`:
```tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { Customer360View } from '../../../components/common/Customer360View';

export const AdminCustomer360Page: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Customer360View userId={id || ''} backPath="/admin/customers" />;
};
```
(Tương tự với `StaffCustomer360Page.tsx` với `backPath="/staff/customers"`).

- [x] **Step 4: Kiểm tra biên dịch tĩnh Frontend**

Chạy lệnh kiểm tra type:
```bash
npx tsc --noEmit
```
(workdir: `frontend`)  
Kỳ vọng: Không có lỗi biên dịch (Exit 0).

- [x] **Step 5: Commit thay đổi Task 2**

```bash
git add frontend/src/types/customer.ts frontend/src/components/common/Customer360View.tsx frontend/src/pages/Admin/Customers/AdminCustomer360Page.tsx frontend/src/pages/Staff/Customers/StaffCustomer360Page.tsx
git commit -m "refactor(frontend): create unified Customer360View and simplify admin/staff customer 360 pages"
```

---

### Task 3: Tinh Giản Backend Audit Log DTO & Service

**Files:**
- Modify: `backend/src/modules/audit-log/dto/filter-audit-log.dto.ts`
- Modify: `backend/src/modules/audit-log/audit-log.service.ts`

- [x] **Step 1: Cập nhật `filter-audit-log.dto.ts`**

Tinh giản DTO chỉ nhận các tham số thực tế:
```typescript
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction } from '@prisma/client';

export class FilterAuditLogDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  action?: AuditAction;

  @IsOptional()
  @IsString()
  search?: string;
}
```

- [x] **Step 2: Tinh giản `audit-log.service.ts`**

Trong `backend/src/modules/audit-log/audit-log.service.ts`, viết lại `findAll` tinh gọn, loại bỏ các nhánh `OR` và `startDate/endDate` thừa:
```typescript
  async findAll(filter: FilterAuditLogDto) {
    const { action, search, page = 1, limit = 20 } = filter;
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { entity: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
```

- [x] **Step 3: Kiểm tra biên dịch tĩnh Backend**

Chạy lệnh kiểm tra type:
```bash
npx tsc --noEmit
```
(workdir: `backend`)  
Kỳ vọng: Không có lỗi biên dịch (Exit 0).

- [x] **Step 4: Commit thay đổi Task 3**

```bash
git add backend/src/modules/audit-log/dto/filter-audit-log.dto.ts backend/src/modules/audit-log/audit-log.service.ts
git commit -m "refactor(backend): simplify audit log filter dto and query service"
```

---

### Task 4: Tinh Giản Frontend Audit Log Page & Detail Drawer

**Files:**
- Modify: `frontend/src/pages/Admin/AuditLogs/AdminAuditLogsPage.tsx`
- Modify: `frontend/src/pages/Admin/AuditLogs/components/AuditLogDetailDrawer.tsx`

- [x] **Step 1: Tinh giản `AuditLogDetailDrawer.tsx`**

Loại bỏ các thành phần hiển thị diff phức tạp. Hiển thị thông tin qua `Descriptions` và render dữ liệu `oldData` / `newData` qua thẻ `<pre>` có định dạng JSON gọn gàng:
- Descriptions: ID, Thời gian, Người thực hiện, IP, Hành động, Thực thể tác động.
- Tab/Section: "Dữ liệu mới" và "Dữ liệu cũ" (nếu có).

- [x] **Step 2: Tinh giản `AdminAuditLogsPage.tsx`**

- Xóa bỏ 4 thẻ KPI `Statistic` rườm rà ở đầu trang.
- Xóa bỏ `RangePicker` (bộ chọn khoảng ngày) và nút Export CSV.
- Giữ lại thanh Filter gồm: `Input.Search` + `Select` lọc Action + Nút `Làm mới`.
- Giữ Table Ant Design chuẩn mực với phân trang `Pagination`.

- [x] **Step 3: Kiểm tra biên dịch tĩnh Frontend**

Chạy lệnh kiểm tra type:
```bash
npx tsc --noEmit
```
(workdir: `frontend`)  
Kỳ vọng: Không có lỗi biên dịch (Exit 0).

- [x] **Step 4: Commit thay đổi Task 4**

```bash
git add frontend/src/pages/Admin/AuditLogs/AdminAuditLogsPage.tsx frontend/src/pages/Admin/AuditLogs/components/AuditLogDetailDrawer.tsx
git commit -m "refactor(frontend): simplify admin audit logs page and detail drawer"
```

---

### Task 5: Kiểm Tra Toàn Diện & Nghiệm Thu Hệ Thống

**Files:**
- Verify: Toàn bộ Backend & Frontend

- [x] **Step 1: Biên dịch Backend**

Chạy:
```bash
npx tsc --noEmit
```
(workdir: `backend`)  
Kỳ vọng: 0 errors.

- [x] **Step 2: Biên dịch Frontend**

Chạy:
```bash
npx tsc --noEmit
```
(workdir: `frontend`)  
Kỳ vọng: 0 errors.

- [x] **Step 3: Kiểm tra trạng thái Git**

Chạy `git status` đảm bảo working tree sạch sẽ, các commit atomic đã được ghi nhận.
