# Thiết Kế Chi Tiết: Quản Lý Đổi Trả & Hoàn Tiền Admin Portal (/admin/returns)

- **Ngày tạo:** 2026-10-03
- **Trạng thái:** Chờ phê duyệt (Pending Review)
- **Tác giả:** AI Assistant & Engineering Team
- **Nhánh triển khai:** `feature/admin-returns-management`

---

## 1. Bối cảnh & Mục tiêu

Hệ thống MobileCommerce đã xây dựng hoàn chỉnh tầng Backend API cho quy trình Đổi trả & Hoàn tiền (Returns & Refunds) với các endpoint dành cho Staff, Manager và Admin. Tuy nhiên, phía Frontend Admin Portal hiện chưa có trang giao diện quản trị, dẫn đến việc nhân viên và quản lý không thể theo dõi danh sách yêu cầu, kiểm tra bằng chứng (lý do lỗi, mô tả của khách), thực hiện thao tác nhận máy/kiểm định và giải ngân hoàn tiền.

### Mục tiêu chính:
1. **Trang Quản lý Đổi trả `/admin/returns`:** Cung cấp giao diện bảng Table đầy đủ thông tin, hỗ trợ lọc theo trạng thái (`REQUESTED`, `APPROVED`, `SHIPPING`, `RECEIVED`, `INSPECTING`, `COMPLETED`, `REJECTED`, `CANCELLED`), tìm kiếm nhanh theo mã Return, mã Order, thông tin khách hàng.
2. **Xem Lý do & Bằng chứng (Evidence & Details):** Cung cấp Drawer chi tiết hiển thị lý do (`reason`), ghi chú của khách (`customerNote`), danh sách sản phẩm hoàn trả (số lượng, tình trạng `condition`), timeline diễn tiến và lịch sử xử lý.
3. **Thao tác quy trình (Workflow Actions):**
   - Xác nhận đã nhận hàng (`Receive` -> `RECEIVED` kèm ghi chú nhận máy `adminNote`).
   - Kiểm định sản phẩm (`Inspect` -> `INSPECTING`).
   - Phê duyệt (`Approve`) hoặc Từ chối (`Reject` kèm lý do bắt buộc).
4. **Phân quyền chặt chẽ (Strict RBAC Enforcement):**
   - Nhân viên (**STAFF**): Được xem danh sách, chi tiết, thực hiện duyệt (`Approve`), từ chối (`Reject`), xác nhận nhận hàng (`Receive`), kiểm định (`Inspect`).
   - Quản lý (**MANAGER**) & Quản trị viên (**ADMIN**): Nắm giữ toàn quyền, bao gồm các bước chốt hạ nhạy cảm: Hoàn tất đổi trả (`Complete` - tự động hoàn trả IMEI và tồn kho), Tạo lệnh hoàn tiền (`Create Refund`), Xử lý giải ngân (`Process Refund`) và Hoàn tất hoàn tiền (`Complete Refund`).
   - Đối với Staff: Các nút tác vụ thuộc quyền Manager/Admin vẫn hiển thị trong quy trình nhưng ở trạng thái vô hiệu hóa (disabled), có icon khóa 🔒 và tooltip giải thích rõ ràng quyền hạn.

---

## 2. Kiến trúc & Cấu trúc Phân rã Component

Áp dụng **Phương án 1 (Module hóa)** nhằm giữ các file dưới 300 dòng, phân định trách nhiệm rõ ràng, dễ viết unit test:

```
frontend/src/
├── pages/Admin/Returns/
│   ├── AdminReturnsPage.tsx                  # Trang chính: Table, Filter tabs, Search bar
│   ├── components/
│   │   ├── ReturnDetailDrawer.tsx            # Drawer chi tiết hồ sơ & Timeline quy trình
│   │   ├── ReturnStatusTag.tsx               # Component hiển thị Tag màu trạng thái chuẩn
│   │   ├── ReceiveReturnModal.tsx            # Modal nhập ghi chú khi Staff nhận kiện hàng
│   │   ├── RejectReturnModal.tsx             # Modal nhập lý do từ chối (bắt buộc)
│   │   ├── CreateRefundModal.tsx             # Modal lập lệnh hoàn tiền (chỉ Manager/Admin)
│   │   └── RefundSection.tsx                 # Danh sách các đợt hoàn tiền & nút giải ngân
│   └── __tests__/
│       ├── AdminReturnsPage.spec.tsx         # Test render bảng, filter, search
│       └── ReturnDetailDrawer.spec.tsx       # Test chi tiết, bằng chứng và nút phân quyền RBAC
├── services/
│   ├── returnService.ts                      # Bổ sung các phương thức gọi API Admin
│   └── __tests__/
│       └── returnService.spec.ts             # Test API service endpoints
├── routes/
│   └── AppRoutes.tsx                         # Khai báo Route /admin/returns được bảo vệ bởi RoleGuard
├── layouts/
│   └── AdminLayout.tsx                       # Thêm mục menu "Quản lý Đổi trả" và breadcrumb
└── types/
    └── index.ts                              # Mở rộng ReturnRequest, ReturnUser, RefundItem
```

---

## 3. Ma trận Phân quyền & Hành động (RBAC Matrix)

| Trạng thái Return | Hành động STAFF | Hành động MANAGER & ADMIN | API tương ứng |
| :--- | :--- | :--- | :--- |
| **REQUESTED** | Phê duyệt (`Approve`), Từ chối (`Reject`) | Phê duyệt (`Approve`), Từ chối (`Reject`) | `PUT /returns/:id/approve`<br/>`PUT /returns/:id/reject` |
| **APPROVED** | Đánh dấu đang gửi (`Mark Shipping`), Nhận hàng (`Receive`) | Đánh dấu đang gửi, Nhận hàng | `PUT /returns/:id/mark-shipping`<br/>`PUT /returns/:id/receive` |
| **SHIPPING** | Xác nhận đã nhận hàng (`Receive` + nhập ghi chú máy) | Xác nhận đã nhận hàng (`Receive` + nhập ghi chú máy) | `PUT /returns/:id/receive` |
| **RECEIVED** | Bắt đầu kiểm định (`Inspect`), Từ chối (`Reject`)<br/>*Nút Complete & Refund disabled 🔒* | Bắt đầu kiểm định (`Inspect`), Từ chối (`Reject`), **Hoàn tất đổi trả (`Complete`)**, **Tạo lệnh hoàn tiền (`Create Refund`)** | `PUT /returns/:id/inspect`<br/>`PUT /returns/:id/reject`<br/>`PUT /returns/:id/complete`<br/>`POST /returns/refunds` |
| **INSPECTING** | Đưa về Received, Từ chối (`Reject`)<br/>*Nút Complete disabled 🔒* | Đưa về Received, Từ chối (`Reject`), **Hoàn tất đổi trả (`Complete`)** | `PUT /returns/:id/receive`<br/>`PUT /returns/:id/reject`<br/>`PUT /returns/:id/complete` |
| **COMPLETED** | Chỉ xem hồ sơ (Read-only) | Xem hồ sơ, **Tạo lệnh hoàn tiền (`Create Refund`)**, Giải ngân (`Process / Complete Refund`) | `POST /returns/refunds`<br/>`PUT /returns/refunds/:id/process`<br/>`PUT /returns/refunds/:id/complete` |
| **REJECTED / CANCELLED** | Chỉ xem lý do (Read-only) | Chỉ xem lý do (Read-only) | Không có action |

*Ghi chú:*
- Khi người dùng đăng nhập là **STAFF**, các nút `Hoàn tất đổi trả (Complete)` và `Tạo lệnh hoàn tiền (Create Refund)` được render với `disabled={true}`, icon khóa 🔒, và thẻ bọc `Tooltip` với nội dung: *"Chỉ Quản lý (Manager/Admin) có quyền thực hiện thao tác này"*.
- Khi người dùng đăng nhập là **MANAGER** hoặc **ADMIN**, các nút này kích hoạt bình thường.

---

## 4. Đặc tả Dữ liệu & API Service

### 4.1 Type Definitions (`frontend/src/types/index.ts`)
```typescript
export interface ReturnUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface RefundItem {
  id: string;
  returnId: string;
  refundNumber: string;
  amount: number;
  status: RefundStatus;
  reason?: string;
  providerRef?: string;
  processedAt?: string;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  returnNumber: string;
  status: ReturnStatus;
  reason: string;
  customerNote?: string;
  adminNote?: string;
  requestedAt: string;
  approvedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  items: ReturnItem[];
  order?: Order;
  user?: ReturnUser;
  refunds?: RefundItem[];
}
```

### 4.2 Admin API Service (`frontend/src/services/returnService.ts`)
Bổ sung các phương thức:
- `getAllReturnsAdmin()`: Gọi `GET /returns`
- `getReturnDetailAdmin(id: string)`: Gọi `GET /returns/${id}`
- `approveReturn(id: string, adminNote?: string)`: Gọi `PUT /returns/${id}/approve`
- `rejectReturn(id: string, adminNote: string)`: Gọi `PUT /returns/${id}/reject`
- `markShippingReturn(id: string)`: Gọi `PUT /returns/${id}/mark-shipping`
- `receiveReturn(id: string, adminNote?: string)`: Gọi `PUT /returns/${id}/receive`
- `inspectReturn(id: string)`: Gọi `PUT /returns/${id}/inspect`
- `completeReturn(id: string)`: Gọi `PUT /returns/${id}/complete`
- `createRefund(payload: { returnId: string; amount: number; reason?: string })`: Gọi `POST /returns/refunds`
- `processRefund(refundId: string)`: Gọi `PUT /returns/refunds/${refundId}/process`
- `completeRefund(refundId: string)`: Gọi `PUT /returns/refunds/${refundId}/complete`
- `getRefundHistory()`: Gọi `GET /returns/refunds/history`

---

## 5. Thiết kế Giao diện (UI/UX) & Tương tác

### 5.1 Danh sách Đổi trả (`AdminReturnsPage.tsx`)
- **Bộ lọc Trạng thái (Status Tabs):**
  - Tất cả (`ALL`)
  - Chờ duyệt (`REQUESTED`)
  - Chờ gửi hàng (`APPROVED`)
  - Đang chuyển về (`SHIPPING`)
  - Đã nhận kho (`RECEIVED`)
  - Đang kiểm tra (`INSPECTING`)
  - Đã hoàn tất (`COMPLETED`)
  - Đã từ chối (`REJECTED`)
  - Khách hủy (`CANCELLED`)
- **Tìm kiếm:** Input Search lọc realtime / debounce theo Mã Return (`RET-...`), Mã đơn hàng (`ORD-...`), hoặc Email/Tên khách.
- **Bảng Dữ liệu (Antd Table):**
  - Cột 1: Mã yêu cầu (`returnNumber`) & Ngày yêu cầu (format ngày giờ VN).
  - Cột 2: Đơn hàng gốc (`order.orderNumber`) & Tên khách hàng + Email.
  - Cột 3: Lý do đổi trả (`reason`) hiển thị rút gọn (Ellipsis kèm tooltip).
  - Cột 4: Số lượng thiết bị (`items.length` máy).
  - Cột 5: Trạng thái tiếp nhận (Tag màu theo bảng mã thẩm mỹ).
  - Cột 6: Trạng thái hoàn tiền (Tag trạng thái `Refund`: Không có / Chờ xử lý / Đã hoàn tiền).
  - Cột 7: Thao tác -> Nút *"Chi tiết / Xử lý"* (mở `ReturnDetailDrawer`).

### 5.2 Khung Xem Chi Tiết (`ReturnDetailDrawer.tsx`)
Mở rộng 720px - 800px từ bên phải:
1. **Header:** Mã Return, Tag trạng thái, Badge cảnh báo hoàn tiền.
2. **Khối Thông tin Đơn hàng & Khách:**
   - Mã đơn hàng (có liên kết sang `/admin/orders` hoặc xem mã), tổng tiền đơn hàng, ngày đặt, địa chỉ giao hàng, thông tin khách hàng (Email, Tên).
3. **Khối Bằng chứng & Lý do (Evidence & Notes):**
   - Hộp hiển thị lý do đổi trả (`reason`).
   - Ghi chú của khách hàng (`customerNote`) trong hộp trích dẫn nổi bật.
   - Ghi chú quản trị viên (`adminNote` - ví dụ tình trạng máy lúc nhận hoặc lý do từ chối trước đó).
4. **Khối Danh sách thiết bị hoàn trả:**
   - Bảng liệt kê từng máy: Tên máy, biến thể màu/dung lượng, số lượng trả, tình trạng (`condition`: Mới, Trầy xước, Không lên nguồn...), lý do từng sản phẩm nếu có.
5. **Khối Lịch sử Hoàn tiền (Refunds):**
   - Hiển thị danh sách các lệnh hoàn tiền đã tạo cho return này.
   - Hiển thị số tiền đã hoàn / Tổng tiền đơn hàng.
   - Với Manager/Admin: Nút *"Giải ngân"* (`processRefund`) và *"Hoàn tất chi tiền"* (`completeRefund`).
6. **Thanh Hành động dưới đáy (Action Footer):**
   - Đặt các nút chuyển trạng thái phù hợp theo trạng thái hiện tại.
   - Phân quyền theo Role của user đăng nhập: Hiển thị tooltip 🔒 cho Staff với các tác vụ Manager-only.

---

## 6. Độ phủ Trạng thái (State Coverage Matrix)

| Màn hình / Thao tác | Loading State | Empty State | Error State | Success State |
| :--- | :--- | :--- | :--- | :--- |
| **Bảng danh sách** | Antd Table `loading={true}` | `Empty` component: *"Chưa có yêu cầu đổi trả nào trong mục này"* | `message.error()` kèm thông điệp từ API | Hiển thị danh sách kèm phân trang mượt mà |
| **Mở Drawer chi tiết** | `Spin` phủ toàn bộ Drawer | *"Không tìm thấy thông tin yêu cầu đổi trả"* | Thông báo lỗi không tải được dữ liệu chi tiết | Render đầy đủ 4 khối thông tin |
| **Xác nhận nhận hàng** | Nút Xác nhận xoay spinner | Form nhập ghi chú rỗng cho phép nhập tự do | Thông báo lỗi từ chối chuyển trạng thái | Cập nhật sang `RECEIVED`, refresh lại data |
| **Từ chối đổi trả** | Nút Từ chối xoay spinner | Validate form yêu cầu lý do không được để trống | Bắt lỗi từ server | Cập nhật sang `REJECTED`, hiển thị thông báo |
| **Tạo hoàn tiền (Manager)** | Nút Tạo lệnh xoay spinner | Validate số tiền > 0 và <= tổng tiền còn lại của đơn | Cảnh báo: *"Số tiền hoàn vượt quá giá trị đơn hàng"* | Tạo bản ghi Refund `PENDING`, refresh danh sách |

---

## 7. Kế hoạch Kiểm thử (Testing Strategy)

1. **Unit Tests cho Service (`returnService.spec.ts`):**
   - Kiểm tra các hàm `getAllReturnsAdmin`, `getReturnDetailAdmin` gọi đúng endpoint và format response.
   - Kiểm tra các action `approve`, `reject`, `markShipping`, `receive`, `inspect`, `complete` truyền đúng payload.
   - Kiểm tra các hàm refund `createRefund`, `processRefund`, `completeRefund`.
2. **Component Tests cho `AdminReturnsPage.spec.tsx`:**
   - Kiểm tra render danh sách từ mock data.
   - Kiểm tra chuyển tab trạng thái lọc dữ liệu.
   - Kiểm tra nhập từ khóa tìm kiếm.
3. **Component Tests cho `ReturnDetailDrawer.spec.tsx`:**
   - Kiểm tra hiển thị đầy đủ lý do (`reason`), ghi chú khách (`customerNote`), tình trạng sản phẩm (`condition`).
   - Kiểm tra phân quyền:
     - Khi user là **STAFF**: Các nút `Complete` và `Create Refund` bị disabled và có tooltip khóa 🔒.
     - Khi user là **MANAGER** hoặc **ADMIN**: Các nút `Complete` và `Create Refund` kích hoạt bình thường.
