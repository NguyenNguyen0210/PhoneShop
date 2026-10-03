# Design Specification: Dashboard & Analytics Charts (Báo cáo & Phân tích Trực quan)

**Date:** 2026-10-04  
**Status:** Approved  
**Author:** AI Agent & Development Team  
**Scope:** Smartphone E-Commerce Platform (MobileCommerce) - Admin Analytics Hub

---

## 1. Overview & Business Objectives

Trang Quản trị viên (`/admin`) hiện tại chỉ hiển thị các con số thống kê tĩnh và bảng đơn hàng cơ bản mà chưa khai thác triệt để hệ thống API phân tích sẵn có của backend (`/reports/*`). Ngoài ra, hệ thống chưa có giao diện biểu đồ trực quan để người quản trị theo dõi biến động doanh thu theo thời gian, tỷ trọng doanh số theo thương hiệu (Apple, Samsung, Xiaomi,...), phân bổ trạng thái xử lý đơn và top thiết bị bán chạy.

Mục tiêu của dự án là **nâng cấp trang `/admin` thành Trung tâm Điều hành & Phân tích (Executive & Operational Analytics Hub)** hiện đại, mượt mà và trực quan với các mục tiêu trọng tâm:
1. **Trực quan hóa dữ liệu (Data Visualization)**: Nhúng thư viện `recharts` (chuẩn React 19 declarative) để dựng các biểu đồ tăng trưởng doanh thu (Area Chart), phân bổ trạng thái đơn hàng (Donut Chart), tỷ trọng thương hiệu (Pie Chart), và Top sản phẩm bán chạy (Horizontal Bar Chart).
2. **Bộ lọc thời gian linh hoạt (Time Range Filtering)**: Hỗ trợ các nút preset nhanh (*7 ngày qua*, *30 ngày qua*, *Tháng này*) cùng bộ chọn `DatePicker.RangePicker` linh hoạt, chuẩn hóa múi giờ Việt Nam (`Asia/Ho_Chi_Minh`).
3. **Mở rộng Backend API Báo cáo Thương hiệu (`GET /reports/brand-sales`)**: Bổ sung endpoint thống kê doanh thu và sản lượng theo thương hiệu sản phẩm smartphone để cung cấp dữ liệu cho biểu đồ tỷ trọng thương hiệu.
4. **Đồng bộ hóa dữ liệu toàn diện (Full API Integration)**: Thay thế hoàn toàn việc tính toán tạm ở client bằng các API backend chuyên trách (`/reports/dashboard`, `/reports/revenue`, `/reports/top-products`, `/reports/order-status`, `/reports/brand-sales`, `/reports/low-stock`).
5. **Kiến trúc module sạch sẽ (Clean Modular Architecture)**: Tách nhỏ các widget biểu đồ thành sub-components độc lập, có loading skeleton, xử lý empty/error states toàn diện và kiểm thử unit test tự động.

---

## 2. Architecture & Data Flow

```
[ Frontend: React 19 + Recharts + Ant Design 6 ]
   │
   ├── DashboardFilterBar (Preset range: 7d, 30d, thisMonth, custom DatePicker)
   ├── DashboardKpiCards (Real-time summary counters)
   ├── RevenueChartCard (Recharts AreaChart - Daily Revenue)
   ├── OrderStatusChartCard (Recharts Donut Chart - Order Statuses)
   ├── BrandSalesChartCard (Recharts Donut/Pie Chart - Brand Share)
   ├── TopProductsChartCard (Recharts BarChart - Top Sold Devices)
   └── DashboardAlertsAndOrders (Recent Orders & Low Stock Alerts Tabs)
         │
         ▼
   [ frontend/src/services/reportService.ts ] (Axios Client with Bearer Token)
         │
         │ (HTTP REST API with VN timezone YYYY-MM-DD)
         ▼
[ Backend: NestJS Reports Module ]
   │
   ├── ReportsController (@Roles(ADMIN), JwtAuthGuard, RolesGuard)
   │     ├── GET /reports/dashboard
   │     ├── GET /reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
   │     ├── GET /reports/top-products?limit=10
   │     ├── GET /reports/order-status
   │     ├── GET /reports/brand-sales?from=YYYY-MM-DD&to=YYYY-MM-DD (NEW)
   │     └── GET /reports/low-stock
   │
   ├── ReportsService (Aggregations, VN timezone boundary handling, raw SQL / Prisma)
   │
   ▼
[ Database: PostgreSQL (Prisma ORM) ]
   ├── orders (status <> 'CANCELLED', created_at)
   ├── payments (status = 'PAID', paid_at)
   ├── refunds (status = 'COMPLETED', processed_at)
   ├── order_items (quantity, total_price, variant_id)
   ├── product_variants (sku, name, product_id)
   ├── products (name, brand_id, category_id)
   ├── brands (id, name, logo_url)
   └── inventories (available_qty, reorder_level)
```

---

## 3. Backend Specification

### 3.1 New Endpoint: `GET /reports/brand-sales`
* **File:** `backend/src/modules/reports/reports.controller.ts` & `backend/src/modules/reports/reports.service.ts`
* **Route:** `GET /reports/brand-sales`
* **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(Role.ADMIN)`
* **Query Parameters:**
  * `from` *(optional, string, format: YYYY-MM-DD)*
  * `to` *(optional, string, format: YYYY-MM-DD)*
* **Validation:** Nếu truyền `from` hoặc `to`, cả 2 phải đúng regex `^\d{4}-\d{2}-\d{2}$` và `from <= to`. Nếu không truyền, mặc định tính toàn thời gian (all-time) hoặc 30 ngày gần nhất.
* **Business Logic (`getBrandSalesReport`):**
  * Truy vấn kết hợp `order_items`, `orders`, `product_variants`, `products`, `brands`.
  * Điều kiện lọc: `orders.status <> 'CANCELLED'`.
  * Nếu có `from` và `to`: Lọc `orders.created_at >= from` (00:00:00+07:00) và `orders.created_at <= to` (23:59:59.999+07:00).
  * Gom nhóm (`GROUP BY b.id, b.name, b.logo_url`).
  * Tính:
    * `quantitySold`: `SUM(oi.quantity)`
    * `revenue`: `SUM(oi.total_price)`
    * `percentage`: Tỷ lệ phần trăm doanh thu của thương hiệu trên tổng doanh thu các thương hiệu.
  * Sắp xếp: `ORDER BY revenue DESC`.
* **Response Shape (`BrandSalesResponse`):**
  ```typescript
  export interface BrandSalesItem {
    brandId: string;
    brandName: string;
    logoUrl: string | null;
    quantitySold: number;
    revenue: number;
    percentage: number; // Rounded to 1 decimal place, e.g., 42.5
  }

  export interface BrandSalesResponse {
    from?: string;
    to?: string;
    totalRevenue: number;
    brands: BrandSalesItem[];
  }
  ```

### 3.2 Existing Endpoints Schema Standard
Tất cả các endpoint sẵn có đều giữ nguyên tính tương thích ngược và phục vụ trực tiếp frontend:
1. `GET /reports/dashboard`:
   * Trả về: `{ totalOrders, pendingOrders, totalRevenue, refundedTotal, netRevenue, totalUsers, totalProducts, totalLowStock }`
2. `GET /reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD`:
   * Trả về: `{ from, to, timeZone, totalRevenue, refundedTotal, netRevenue, dailyBreakdown: Array<{ date: string, revenue: number }>, paymentCount }`
3. `GET /reports/top-products?limit=10`:
   * Trả về: `Array<{ variantId, productName, variantName, sku, totalQuantitySold, totalRevenue }>`
4. `GET /reports/order-status`:
   * Trả về: `Array<{ status: OrderStatus, count: number }>`
5. `GET /reports/low-stock`:
   * Trả về: `Array<{ variantId, productName, sku, availableQty, reorderLevel, deficit }>`

---

## 4. Frontend Specification & UI Components

### 4.1 Thư viện & Cài đặt
* Thư viện biểu đồ: `recharts` (phiên bản hỗ trợ React 19, cài đặt qua `npm install recharts --prefix frontend`).
* Cài đặt type declarations nếu cần: `@types/recharts` (hoặc bundled types).

### 4.2 API Service: `frontend/src/services/reportService.ts`
* Đóng gói toàn bộ các hàm gọi API tương ứng:
  * `getDashboardSummary()`
  * `getRevenueReport(from: string, to: string)`
  * `getTopSellingProducts(limit?: number)`
  * `getOrderStatusReport()`
  * `getBrandSalesReport(from?: string, to?: string)`
  * `getLowStockReport()`
* Helper chuyển đổi múi giờ và ngày tháng:
  * Format ngày theo chuẩn `YYYY-MM-DD` tại múi giờ local Việt Nam.
  * Presets generator:
    * `7_DAYS`: Từ 7 ngày trước đến hôm nay.
    * `30_DAYS`: Từ 30 ngày trước đến hôm nay.
    * `THIS_MONTH`: Từ ngày đầu tháng hiện tại đến hôm nay.

### 4.3 Modular Components Structure
Các component được đặt trong `frontend/src/pages/Admin/Dashboard/components/`:

#### 1. `DashboardFilterBar.tsx`
* Chứa thanh công cụ điều khiển thời gian:
  * Nhóm nút chọn nhanh (Segmented hoặc Radio Buttons): `7 ngày`, `30 ngày`, `Tháng này`.
  * `DatePicker.RangePicker` của Ant Design để chọn khoảng ngày linh hoạt.
  * Nút "Làm mới dữ liệu" (Refresh) với hiệu ứng spin icon.
  * Tag hiển thị múi giờ hoạt động: `Múi giờ: Asia/Ho_Chi_Minh (GMT+7)`.

#### 2. `DashboardKpiCards.tsx`
* 4 thẻ Bento Card phong cách Fintech:
  * **KPI 1: Doanh thu thuần (Net Revenue)**: Hiển thị giá trị thuần (đã trừ hoàn tiền `refundedTotal`), hiển thị badge % hoàn tiền nếu có.
  * **KPI 2: Tổng đơn hàng & Đơn chờ xử lý**: Tổng số đơn, kèm cảnh báo số đơn `PENDING` cần duyệt gấp.
  * **KPI 3: Cảnh báo hàng tồn kho thấp (Low Stock)**: Số biến thể có tồn kho $\le$ mức đặt hàng lại, kèm link chuyển tab cảnh báo.
  * **KPI 4: Quy mô hệ thống**: Tổng khách hàng và số lượng dòng smartphone trên hệ thống.
* Tích hợp Skeleton loading khi đang fetch dữ liệu.

#### 3. `RevenueChartCard.tsx`
* Biểu đồ diện tích (`AreaChart` của Recharts):
  * Trục hoành ($X$): Ngày tháng dạng `DD/MM`.
  * Trục tung ($Y$): Doanh thu, định dạng rút gọn (triệu / tỷ VNĐ, ví dụ `15.5 tr ₫`).
  * Gradient fill: `#2563eb` mờ dần xuống nền trong suốt.
  * Custom Tooltip chuyên nghiệp: Hiển thị ngày đầy đủ, tổng doanh thu chuẩn VND, số lượng giao dịch tương ứng.
  * Header thẻ: Hiển thị tổng doanh thu trong khoảng thời gian đã chọn và số đơn thanh toán thành công.

#### 4. `OrderStatusChartCard.tsx`
* Biểu đồ tròn dạng Donut (`PieChart` với `innerRadius={65}` và `outerRadius={95}`):
  * Các trạng thái đơn hàng: `PENDING` (Cam), `CONFIRMED` (Xanh lam nhạt), `PROCESSING` (Xanh dương), `SHIPPING` (Chàm), `DELIVERED`/`COMPLETED` (Xanh lục), `CANCELLED` (Đỏ).
  * Custom Label / Center Metric: Hiển thị tổng số đơn ngay chính giữa vòng tròn Donut.
  * Chú thích (Legend) hiển thị trạng thái và tỷ lệ %.

#### 5. `BrandSalesChartCard.tsx`
* Biểu đồ tròn / Donut tỷ trọng doanh số theo hãng:
  * Màu sắc định danh hài hòa cho các hãng chính (Apple, Samsung, Xiaomi, OPPO, Google...).
  * Danh sách phân bổ bên cạnh hiển thị: Logo/Tên hãng, Số máy đã bán, Doanh thu và % thị phần.

#### 6. `TopProductsChartCard.tsx`
* Biểu đồ thanh ngang (`BarChart` với `layout="vertical"`):
  * Hiển thị top 5 - 10 thiết bị có doanh số cao nhất.
  * Trục $Y$ là tên sản phẩm, trục $X$ là số lượng bán ra (`qty`) hoặc doanh thu (`revenue`).
  * Cho phép toggle nhanh giữa xem theo **Số lượng bán** hoặc **Doanh thu**.

#### 7. `DashboardAlertsAndOrders.tsx`
* Thẻ Card 2 Tabs Ant Design:
  * **Tab 1: Đơn hàng mới nhất**: Bảng tóm tắt 5 - 10 đơn hàng phát sinh gần nhất kèm mã đơn, khách hàng, tổng tiền, tag trạng thái và nút xem chi tiết.
  * **Tab 2: Thiết bị tồn kho báo động (Low Stock Items)**: Bảng liệt kê thiết bị có `availableQty <= reorderLevel`, hiển thị mức thiếu hụt (`deficit`) và nút nhập kho nhanh dẫn sang `/admin/inventory`.

---

## 5. Aesthetic Direction & UX State Coverage

### 5.1 Aesthetic Direction
* **Theme Concept:** Modern Enterprise SaaS / Fintech Dashboard.
* **Colors:**
  * Primary Accent: Royal Blue (`#2563eb`), Sky Blue (`#0ea5e9`), Indigo (`#6366f1`).
  * Semantic Accents: Success Emerald (`#10b981`), Warning Amber (`#f59e0b`), Danger Rose (`#ef4444`).
  * Neutral: Background `#f8fafc`, Surface `#ffffff`, Border `#e2e8f0`, Typography Dark `#0f172a`, Muted `#64748b`.
* **Chart Styling:**
  * Tooltips: Nền trắng bo góc 8px, viền mờ `#e2e8f0`, đổ bóng mềm `0 10px 15px -3px rgba(0, 0, 0, 0.08)`.
  * Grid lines: Nét đứt nét mảnh `#f1f5f9`.
  * Responsive: 100% chiều rộng container, tự động điều chỉnh font chữ trên màn hình nhỏ.

### 5.2 State Coverage Matrix
| Component / Screen | Loading State | Empty State | Error State |
|---|---|---|---|
| **KPI Cards** | Card Skeleton với 4 khối xám shimmer | Hiển thị giá trị 0 hoặc `--` | Hiển thị icon cảnh báo và nút reload |
| **Revenue Chart** | Skeleton rect chiều cao 320px | Antd `Empty` thông báo "Không có doanh thu trong khoảng thời gian này" | Banner lỗi màu đỏ nhạt + nút "Tải lại biểu đồ" |
| **Order Status Chart** | Skeleton tròn 200px | Antd `Empty` thông báo "Chưa có đơn hàng nào" | Thông báo lỗi không tải được phân bổ |
| **Brand Sales Chart** | Skeleton tròn 200px | Antd `Empty` thông báo "Chưa phát sinh dữ liệu bán theo hãng" | Thông báo lỗi truy vấn thương hiệu |
| **Top Products** | Skeleton bar 5 dòng | Antd `Empty` thông báo "Chưa có sản phẩm bán chạy" | Thông báo lỗi |
| **Alerts & Orders Table** | Antd Table `loading={true}` | Bảng rỗng với thông báo phù hợp cho từng tab | Bảng hiển thị thông báo lỗi kết nối API |

---

## 6. Testing & Quality Assurance Plan

### 6.1 Backend Tests
* Viết unit test cho `ReportsService.getBrandSalesReport` và `ReportsController.getBrandSales` trong `backend/src/modules/reports/reports.service.spec.ts`.
* Kiểm tra tính đúng đắn khi có `from`/`to`, kiểm tra loại trừ đơn `CANCELLED`, kiểm tra trường hợp không có đơn nào.
* Kiểm tra validation lỗi `BadRequestException` khi truyền sai định dạng ngày.

### 6.2 Frontend Tests
* Viết unit test cho `reportService.ts`: Kiểm tra các hàm gọi đúng endpoint và format tham số ngày.
* Viết unit test kiểm thử render của các components: `DashboardFilterBar`, `RevenueChartCard`, `DashboardKpiCards`.
* Đảm bảo `npm run build` và `npm run test` của cả backend và frontend đều vượt qua (100% PASS).

---

## 7. Migration & Rollout Strategy

1. **Phase 1 (Backend):** Triển khai endpoint `GET /reports/brand-sales` trong `ReportsModule`, viết unit test backend.
2. **Phase 2 (Frontend Library & Service):** Cài đặt `recharts`, tạo file `frontend/src/types/report.ts` và `frontend/src/services/reportService.ts`.
3. **Phase 3 (Frontend Modular Components):** Dựng các component con (`DashboardFilterBar`, `DashboardKpiCards`, `RevenueChartCard`, `OrderStatusChartCard`, `BrandSalesChartCard`, `TopProductsChartCard`, `DashboardAlertsAndOrders`).
4. **Phase 4 (Integration & Dashboard Refactor):** Ghép toàn bộ vào `AdminDashboardPage.tsx`, cấu hình bộ lọc thời gian và responsive layout.
5. **Phase 5 (Testing & Verification):** Chạy kiểm thử tự động Vitest + Jest, kiểm tra giao diện thực tế.
