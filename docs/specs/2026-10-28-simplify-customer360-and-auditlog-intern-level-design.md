# Thiết Kế Tinh Giản Customer 360 & Audit Log (Level Intern)

> **Ngày tạo:** 28/10/2026  
> **Trạng thái:** Đã phê duyệt  
> **Mục tiêu:** Tinh gọn toàn diện cấu trúc backend và giao diện frontend của hai phân hệ **Customer 360** và **Audit Log**, loại bỏ các thành phần rườm rà/over-engineering (mock CRM notes, nested stats, JSON diff engine, export CSV) để đạt chuẩn mực trực quan, dễ bảo trì và dễ thuyết trình đồ án cho cấp độ thực tập sinh (Intern level).

---

## 1. Bối Cảnh & Vấn Đề Hiện Tại

1. **Customer 360**:
   - Backend truy vấn đồng thời nhiều bảng không thực sự cần thiết cho nghiệp vụ bán lẻ cơ bản (Tickets, Warranties, tính toán phức tạp).
   - Frontend bị phân mảnh thành 2 file riêng biệt `AdminCustomer360Page.tsx` và `StaffCustomer360Page.tsx` với hơn 500 dòng code trùng lặp.
   - Giao diện chứa nhiều tính năng giả lập (CRM Notes lưu trong bộ nhớ tạm thời, phân hạng VIP/thẻ thành viên phức tạp) gây bối rối khi giải thích luồng dữ liệu.

2. **Audit Log**:
   - Backend hỗ trợ bộ lọc quá nhiều tầng với các điều kiện AND/OR phức tạp cho IP, tên, email, ngày tháng.
   - Frontend hiển thị 4 thẻ KPI thống kê không cần thiết, tính năng xuất CSV giả lập và Drawer hiển thị so sánh diff JSON phức tạp.

---

## 2. Mục Tiêu Thiết Kế

- **Đơn giản hóa luồng dữ liệu**: Từ Prisma -> Service -> Controller -> UI một cách mạch lạc, không code thừa.
- **Tái sử dụng Component (DRY)**: Gom Customer 360 thành 1 component dùng chung giữa Admin và Staff.
- **Tập trung vào nghiệp vụ thực tế**:
  - Customer 360: Thông tin cá nhân + 2 chỉ số thực tế (Tổng chi tiêu, Số đơn) + Lịch sử đơn hàng + Sổ địa chỉ.
  - Audit Log: Bảng nhật ký thao tác trực quan (Ai, Làm gì, Vào thực thể nào, Lúc mấy giờ) + Bộ lọc cơ bản + Drawer xem chi tiết đơn giản.

---

## 3. Đặc Tả Chi Tiết

### 3.1. Phân Hệ Customer 360

#### A. Backend (`backend/src/modules/users/`)
1. **DTO (`dto/customer-360.dto.ts`)**:
   ```typescript
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
     metrics: {
       totalSpent: number;
       totalOrders: number;
     };
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
       createdAt: Date;
       itemCount: number;
     }>;
   }
   ```
2. **Service (`users.service.ts` -> `getCustomer360`)**:
   - Truy vấn người dùng bằng `prisma.user.findUnique` với relations `addresses` và `orders`.
   - Tính toán `totalSpent` (tổng tiền các đơn có trạng thái `COMPLETED` hoặc thanh toán `PAID`) và `totalOrders`.
   - Map danh sách đơn hàng sang định dạng `recentOrders` gọn nhẹ kèm `itemCount`.

#### B. Frontend
1. **Component dùng chung (`frontend/src/components/common/Customer360View.tsx`)**:
   - Props: `{ userId: string; backPath: string; }`
   - Gọi API qua `userService.getCustomer360(userId)`.
   - Bố cục:
     - Header: Nút quay lại (`backPath`), Họ tên, Avatar, Email, SĐT, Ngày tạo, Trạng thái hoạt động.
     - 2 Thẻ Statistic: **Tổng đơn hàng** và **Tổng chi tiêu** (`Intl.NumberFormat('vi-VN')`).
     - Tabs (2 tabs):
       - **Lịch sử đơn hàng**: Table gồm Mã đơn, Ngày tạo, Số món, Tổng tiền, Trạng thái đơn, Trạng thái thanh toán.
       - **Sổ địa chỉ**: Cards hiển thị địa chỉ nhận hàng, đánh dấu rõ địa chỉ mặc định.
2. **Trang Admin (`AdminCustomer360Page.tsx`) & Staff (`StaffCustomer360Page.tsx`)**:
   - Trở thành thin-wrappers gọn gàng, tái sử dụng `Customer360View`.

---

### 3.2. Phân Hệ Audit Log

#### A. Backend (`backend/src/modules/audit-log/`)
1. **DTO (`dto/filter-audit-log.dto.ts`)**:
   ```typescript
   export class FilterAuditLogDto {
     page?: number = 1;
     limit?: number = 20;
     action?: string;
     search?: string;
   }
   ```
2. **Service (`audit-log.service.ts` -> `findAll`)**:
   - Xây dựng điều kiện `where`:
     - Nếu có `action`: gán `where.action = action`.
     - Nếu có `search`: tìm kiếm không phân biệt hoa thường theo `entity` hoặc `user.email`.
   - Thực thi `prisma.auditLog.findMany` kèm phân trang `skip`, `take`, sắp xếp `createdAt: 'desc'`.

#### B. Frontend (`frontend/src/pages/Admin/AuditLogs/`)
1. **Trang danh sách (`AdminAuditLogsPage.tsx`)**:
   - Loại bỏ 4 thẻ KPI thống kê, bỏ `RangePicker` và nút export CSV.
   - Thanh công cụ gồm:
     - Ô tìm kiếm `Input.Search` (tìm theo Email hoặc Tên thực thể).
     - Dropdown `Select` lọc theo Hành động (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, ...).
     - Nút Làm mới (`ReloadOutlined`).
   - Bảng Ant Design Table hiển thị:
     - Cột Thời gian (`DD/MM/YYYY HH:mm:ss`).
     - Cột Người thực hiện (Avatar + Tên/Email).
     - Cột Hành động (Tag màu chuẩn).
     - Cột Đối tượng (Thực thể tác động).
     - Cột Thao tác: Nút "Chi tiết" mở Drawer.
2. **Drawer chi tiết (`components/AuditLogDetailDrawer.tsx`)**:
   - Hiển thị bảng mô tả `Descriptions` (ID, Thời gian, Người thực hiện, IP, Hành động, Đối tượng).
   - Khung hiển thị dữ liệu thay đổi JSON formatted (`JSON.stringify(data, null, 2)`) trong thẻ `<pre>` với giao diện tối giản, sạch sẽ.

---

## 4. Xử Lý Trạng Thái & Trải Nghiệm Người Dùng (UX State Coverage)

- **Loading state**: Sử dụng `Spin` hoặc Skeleton khi đang fetch dữ liệu.
- **Empty state**: Hiển thị component `Empty` của Ant Design ("Chưa có đơn hàng nào", "Không tìm thấy nhật ký thao tác").
- **Error state**: Bắt lỗi `try...catch` và thông báo qua `message.error` thân thiện tiếng Việt.

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. `npx tsc --noEmit` trên cả Backend và Frontend đều đạt 0 lỗi biên dịch.
2. Trang Customer 360 hiển thị mượt mà trên cả quyền Admin và Staff với cùng một component dùng chung.
3. Trang Audit Log tải nhật ký nhanh chóng, phân trang chính xác, lọc theo hành động và tìm kiếm hiệu quả.
4. Không còn bất kỳ mock state nào (CRM notes ảo), không còn thư viện diff JSON phức tạp.
5. Mã nguồn rõ ràng, clean, dễ hiểu và dễ trình bày khi bảo vệ đồ án/báo cáo thực tập.
