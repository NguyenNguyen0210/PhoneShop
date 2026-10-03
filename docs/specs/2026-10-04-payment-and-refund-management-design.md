# Thiết Kế Chi Tiết: Quản Lý Thanh Toán, Đối Soát & Hoàn Tiền Admin Portal (/admin/payments)

- **Ngày tạo:** 2026-10-04
- **Trạng thái:** Đã phê duyệt (Approved)
- **Tác giả:** AI Assistant & Engineering Team
- **Nhánh triển khai:** `feature/admin-payments-and-refund-management`

---

## 1. Bối cảnh & Mục tiêu

Hệ thống MobileCommerce đã hoàn thiện tầng Backend API cho phân hệ Thanh toán (Payments), Đối soát ngân hàng (Reconciliation) và Đổi trả / Hoàn tiền (Returns & Refunds). Tuy nhiên, trên giao diện Quản trị (Admin Portal), hiện tại chưa có trang `/admin/payments` để nhân viên và quản lý theo dõi dòng tiền thanh toán (Inflow) cũng như theo dõi tập trung sổ cái hoàn tiền (Outflow / Refund Ledger).

### Mục tiêu chính:
1. **Trung tâm Quản lý Thanh toán & Dòng tiền (`/admin/payments`):**
   - Cung cấp giao diện trực quan với 4 thẻ chỉ số tài chính (Doanh thu đã thu, Phân bổ theo cổng, Giao dịch VietQR chờ đối soát, Tổng tiền đã hoàn trả).
   - Tổ chức hệ thống 4 Tabs nghiệp vụ chuyên sâu, hỗ trợ đồng bộ trạng thái qua URL query parameter (`?tab=payments | reconciliation | refunds | transactions`).
2. **Theo dõi Giao dịch Thanh toán đa kênh (Payments List):**
   - Hiển thị toàn bộ lịch sử thanh toán qua VNPay, VietQR, COD từ endpoint `GET /payments`.
   - Bộ lọc linh hoạt theo Cổng thanh toán, Trạng thái giao dịch (`PAID`, `PENDING`, `FAILED`), tìm kiếm nhanh theo mã đơn hàng hoặc mã thanh toán.
3. **Quy trình Tra cứu & Đối soát thanh toán chuyển khoản (Reconciliation Flow):**
   - Lọc riêng các giao dịch VietQR / Chuyển khoản ngân hàng đang ở trạng thái chờ (`PENDING`).
   - Cung cấp Modal xác nhận đối soát: Nhân viên kiểm tra biến động số dư tài khoản ngân hàng, nhập mã bút toán / mã tham chiếu ngân hàng (`providerRef`) để gọi `PUT /payments/:id/confirm`.
   - Backend tự động xử lý nguyên tử (atomic transaction): Cập nhật Payment `PAID` -> Order `CONFIRMED` -> Tồn kho IMEI `SOLD` -> Kích hoạt bảo hành điện tử (Warranties).
   - Hỗ trợ đánh dấu thất bại (`PUT /payments/:id/fail`) nếu giao dịch không hợp lệ hoặc khách hàng hủy.
4. **Sổ cái Hoàn tiền tập trung (Refunds Ledger):**
   - Kết nối với endpoint `GET /returns/refunds/history` để theo dõi toàn bộ lệnh hoàn tiền trên toàn hệ thống.
   - Cho phép Quản lý (Manager/Admin) thao tác trực tiếp: Bắt đầu giải ngân (`processRefund` -> `PROCESSING`) và Xác nhận hoàn tất (`completeRefund` -> `COMPLETED`).
5. **Nhật ký Giao dịch Cổng (Gateway Transactions Log):**
   - Xem nhật ký kỹ thuật từ `GET /payments/transactions` với mã giao dịch, số tiền, và xem chi tiết phản hồi kỹ thuật (`responseData`) phục vụ kiểm toán hoặc tra soát lỗi cổng.
6. **Thực thi Phân quyền chặt chẽ (Strict RBAC Enforcement):**
   - **STAFF:** Xem danh sách, tra cứu, đối chiếu thông tin (Read-only). Các nút nhạy cảm (Xác nhận đối soát, Đánh dấu thất bại, Giải ngân hoàn tiền, Hoàn tất hoàn tiền) được render ở trạng thái vô hiệu hóa (`disabled={true}`) kèm icon khóa 🔒 và thẻ `Tooltip` giải thích quyền hạn.
   - **MANAGER & ADMIN:** Toàn quyền thực hiện các thao tác tài chính, đối soát và giải ngân.

---

## 2. Kiến trúc & Cấu trúc Phân rã Component

Áp dụng phương án phân rã module hóa nhằm giữ tất cả các file code dưới 300 dòng, đảm bảo tính độc lập và khả năng viết unit test toàn diện:

```text
frontend/src/
├── pages/Admin/Payments/
│   ├── AdminPaymentsPage.tsx                  # Trang chính: Tabs điều phối, Stats cards, Filter, Sync URL query
│   ├── components/
│   │   ├── PaymentStatsCards.tsx              # 4 Widget thẻ chỉ số tổng quan tài chính
│   │   ├── PaymentsListTab.tsx                # Tab 1: Bảng danh sách tất cả các giao dịch thanh toán
│   │   ├── ReconciliationTab.tsx              # Tab 2: Bảng tra cứu & đối soát các đơn VietQR PENDING
│   │   ├── ReconciliationModal.tsx            # Modal nhập mã giao dịch ngân hàng providerRef để confirm
│   │   ├── RefundsLedgerTab.tsx               # Tab 3: Sổ cái theo dõi & giải ngân hoàn tiền toàn hệ thống
│   │   ├── TransactionsLogTab.tsx             # Tab 4: Bảng nhật ký kỹ thuật các giao dịch cổng
│   │   ├── PaymentMethodTag.tsx               # Component Tag nhận diện cổng thanh toán (COD, VIETQR, VNPAY)
│   │   └── PaymentStatusTag.tsx               # Component Tag nhận diện trạng thái (PAID, PENDING, FAILED)
│   └── __tests__/
│       ├── AdminPaymentsPage.spec.tsx         # Test render tabs, stats và filters
│       ├── ReconciliationModal.spec.tsx       # Test validation mã ngân hàng và gọi confirm API
│       └── RefundsLedgerTab.spec.tsx          # Test render sổ cái hoàn tiền và phân quyền hành động RBAC
├── services/
│   ├── paymentService.ts                      # Mở rộng các hàm gọi API Admin (/payments, /payments/transactions, confirm, fail)
│   └── __tests__/
│       └── paymentService.spec.ts             # Test API service endpoints
├── routes/
│   └── AppRoutes.tsx                          # Khai báo Route /admin/payments bảo vệ bởi RoleGuard
├── layouts/
│   └── AdminLayout.tsx                        # Thêm mục menu "Quản lý Thanh toán" icon CreditCardOutlined
└── types/
    └── index.ts                               # Mở rộng các interface Payment, PaymentTransaction, RefundItem
```

---

## 3. Đặc tả Dữ liệu & Tầng Service (API Client)

### 3.1. Type Definitions (`frontend/src/types/index.ts`)
```typescript
export type PaymentMethod = 'COD' | 'VIETQR' | 'VNPAY';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';
export type TransactionType = 'PAYMENT' | 'REFUND';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface PaymentTransaction {
  id: string;
  paymentId: string;
  transactionCode: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  providerReference?: string | null;
  responseData?: any;
  createdAt: string;
  payment?: Payment;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    userId: string;
    user?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
  transactions?: PaymentTransaction[];
}

export interface ConfirmPaymentPayload {
  providerRef: string;
}
```

### 3.2. Phương thức API Mở rộng trong `frontend/src/services/paymentService.ts`
```typescript
export const paymentService = {
  // Existing client methods: createPayment, getVietQrCode, createVnpayUrl...

  // Admin methods
  async getAllPaymentsAdmin(): Promise<Payment[]> {
    const response = await apiClient.get('/payments');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getTransactionHistoryAdmin(): Promise<PaymentTransaction[]> {
    const response = await apiClient.get('/payments/transactions');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async confirmPaymentAdmin(paymentId: string, providerRef: string): Promise<Payment> {
    const response = await apiClient.put(`/payments/${paymentId}/confirm`, { providerRef });
    return response.data?.data ?? response.data;
  },

  async failPaymentAdmin(paymentId: string): Promise<Payment> {
    const response = await apiClient.put(`/payments/${paymentId}/fail`);
    return response.data?.data ?? response.data;
  },
};
```

---

## 4. Chi tiết Thiết Kế Màn Hình & Trải Nghiệm Người Dùng (UI/UX)

### 4.1. Phong cách Thẩm mỹ (Aesthetic Direction: Enterprise Fintech / SaaS Precision)
- **Bảng màu:**
  - Nền trang: `#f8fafc` (Slate 50), Thẻ Card: `#ffffff` (White), Viền: `#e2e8f0` (Slate 200).
  - Tông màu chủ đạo (Primary): `#2563eb` (Blue 600).
  - Thẻ nhận diện Cổng (`PaymentMethodTag`):
    - `VNPAY`: Tag màu `blue` kèm icon ngân hàng / thẻ.
    - `VIETQR`: Tag màu `purple` hoặc `cyan` kèm icon mã QR.
    - `COD`: Tag màu `orange` kèm icon tiền mặt / giao nhận.
  - Thẻ nhận diện Trạng thái (`PaymentStatusTag`):
    - `PAID` / `COMPLETED`: Tag màu `success` (`#16a34a`).
    - `PENDING` / `PROCESSING`: Tag màu `warning` (`#d97706`).
    - `FAILED`: Tag màu `error` (`#dc2626`).
- **Typography & Định dạng số:**
  - Font gia đình: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`.
  - Các mã kỹ thuật (`orderNumber`, `transactionCode`, `providerRef`, `paymentId`): Sử dụng font monospace font size 12px với màu đậm.
  - Số tiền: Định dạng chuẩn `vi-VN` với đơn vị tiền tệ `₫` (ví dụ `24,990,000 ₫`).

### 4.2. Thẻ Chỉ Số Tài Chính Tổng Quan (`PaymentStatsCards.tsx`)
Hiển thị ở đầu trang với 4 widget:
1. **Tổng doanh thu thực thu:** Tổng tiền của các bản ghi `PAID` từ danh sách thanh toán.
2. **Cơ cấu cổng thanh toán:** Tỷ lệ hoặc doanh thu chi tiết phân theo VNPay, VietQR và COD.
3. **Cần đối soát VietQR:** Đếm số lượng đơn `VIETQR` trạng thái `PENDING`. Hiển thị badge màu cam cảnh báo nếu có đơn tồn đọng > 0.
4. **Tổng tiền đã hoàn trả:** Tổng số tiền các lệnh hoàn tiền đã thành công (`COMPLETED`) lấy từ sổ cái hoàn tiền.

### 4.3. Bảng Danh Sách Thanh Toán (`PaymentsListTab.tsx`)
- Cột thông tin:
  - `Mã thanh toán / Thời gian`: ID rút gọn kèm tooltip full ID, ngày giờ tạo.
  - `Đơn hàng`: Mã đơn hàng `#ORD-...`, hỗ trợ nhấp để điều hướng sang trang chi tiết đơn hàng `/admin/orders`.
  - `Khách hàng`: Email người mua hoặc tên khách hàng.
  - `Cổng thanh toán`: `PaymentMethodTag`.
  - `Số tiền`: Định dạng VND in đậm.
  - `Trạng thái`: `PaymentStatusTag`.
  - `Ngày thanh toán`: Hiển thị `paidAt` nếu đã thanh toán, ngược lại hiển thị dấu gạch ngang `—`.
- Bộ lọc & Tìm kiếm:
  - Dropdown lọc cổng: Tất cả, VNPay, VietQR, COD.
  - Dropdown lọc trạng thái: Tất cả, PAID, PENDING, FAILED.
  - Search input: Tìm kiếm nhanh theo mã đơn hàng, email khách hoặc mã giao dịch.

### 4.4. Tra Cứu & Đối Soát Thanh Toán Chuyển Khoản (`ReconciliationTab.tsx` & `ReconciliationModal.tsx`)
- Tự động lọc danh sách các thanh toán có `method === 'VIETQR'` và `status === 'PENDING'`.
- Alert hướng dẫn nghiệp vụ: *"Đối chiếu biến động số dư tài khoản nhận tiền với mã đơn hàng và số tiền tương ứng. Khi nhận được tiền, bấm Xác nhận đối soát để hoàn tất đơn hàng, tự động xuất kho IMEI và kích hoạt bảo hành điện tử."*
- Bảng hiển thị:
  - Mã đơn hàng & Thời gian đặt hàng.
  - Khách hàng (Tên, SĐT, Email).
  - Số tiền cần khớp (in đậm màu xanh lá).
  - Cú pháp chuyển khoản chuẩn (ví dụ `ORD-XXXXXX`).
  - Thao tác:
    - **Nút "Xác nhận đối soát" (Xanh lá, icon CheckOutlined):**
      - Mở `ReconciliationModal`.
      - Tóm tắt: Đơn hàng, Tên khách hàng, Số tiền cần khớp.
      - Trường nhập bắt buộc: `Mã giao dịch / Mã bút toán ngân hàng (providerRef)` (ví dụ `FT261004123456`, `MB98124018`).
      - Nút "Xác nhận & Chốt đơn": Gọi `paymentService.confirmPaymentAdmin(paymentId, providerRef)`.
      - Khi thành công: Hiển thị thông báo `message.success('Đối soát thành công! Đơn hàng đã chuyển CONFIRMED, tồn kho IMEI đã cập nhật SOLD và bảo hành đã kích hoạt.')`, tự động reload dữ liệu bảng.
    - **Nút "Đánh dấu thất bại" (Đỏ, icon CloseOutlined):**
      - Bọc bởi `Popconfirm` với tiêu đề: *"Bạn có chắc chắn muốn đánh dấu giao dịch này là thất bại không?"*.
      - Gọi `paymentService.failPaymentAdmin(paymentId)`.

### 4.5. Sổ Cái Hoàn Tiền Tập Trung (`RefundsLedgerTab.tsx`)
- Kết nối `returnService.getRefundHistory()`.
- Cột thông tin:
  - `Mã hoàn tiền`: `refundNumber` in đậm.
  - `Đơn hàng & Yêu cầu đổi trả`: Mã yêu cầu đổi trả, mã đơn liên kết.
  - `Số tiền hoàn trả`: Định dạng VND in đậm màu xanh dương.
  - `Lý do hoàn tiền`: Chuỗi lý do yêu cầu từ khách/nhân viên.
  - `Trạng thái`: Tag trạng thái hoàn tiền (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`).
  - `Thời gian tạo & Xử lý`: `createdAt` và `processedAt`.
  - `Thao tác`:
    - Nếu trạng thái `PENDING`: Nút **"Bắt đầu giải ngân"** -> Gọi `returnService.processRefund(refundId)`.
    - Nếu trạng thái `PROCESSING`: Nút **"Xác nhận đã chuyển tiền"** -> Gọi `returnService.completeRefund(refundId)`.
    - Phân quyền: Đối với tài khoản `STAFF`, các nút này ở trạng thái `disabled` kèm tooltip khóa 🔒.

### 4.6. Nhật Ký Cổng Thanh Toán (`TransactionsLogTab.tsx`)
- Kết nối `paymentService.getTransactionHistoryAdmin()`.
- Cột thông tin:
  - `Mã giao dịch hệ thống`: `transactionCode` (monospaced).
  - `Mã đơn hàng liên kết`: `orderNumber`.
  - `Loại giao dịch`: Tag `PAYMENT`.
  - `Trạng thái`: Tag `SUCCESS`, `PENDING`, `FAILED`.
  - `Số tiền`: Định dạng VND.
  - `Mã đối tác (providerReference)`: Chuỗi mã đối tác gửi về hoặc mã ngân hàng admin nhập.
  - `Thời gian`: Định dạng `dd/MM/yyyy HH:mm:ss`.
  - `Thao tác`: Nút "Xem Raw JSON" mở Drawer hiển thị cấu trúc `responseData` phục vụ kỹ thuật tra soát.

---

## 5. Ma Trận Phân Quyền & Ràng Buộc Bảo Mật (RBAC Matrix)

| Chức năng / Hành động | STAFF | MANAGER | ADMIN | Endpoint API tương ứng |
| :--- | :--- | :--- | :--- | :--- |
| **Xem danh sách thanh toán** | Cho phép | Cho phép | Cho phép | `GET /payments` |
| **Xem bảng chờ đối soát** | Cho phép xem đối chiếu | Cho phép | Cho phép | `GET /payments` |
| **Xác nhận đối soát (Confirm)** | 🔒 Disabled (Tooltip) | **Thực hiện** | **Thực hiện** | `PUT /payments/:id/confirm` |
| **Đánh dấu thất bại (Fail)** | 🔒 Disabled (Tooltip) | **Thực hiện** | **Thực hiện** | `PUT /payments/:id/fail` |
| **Xem Sổ cái Hoàn tiền** | Cho phép xem | Cho phép | Cho phép | `GET /returns/refunds/history` |
| **Bắt đầu giải ngân (Process)** | 🔒 Disabled (Tooltip) | **Thực hiện** | **Thực hiện** | `PUT /returns/refunds/:id/process` |
| **Hoàn tất hoàn tiền (Complete)** | 🔒 Disabled (Tooltip) | **Thực hiện** | **Thực hiện** | `PUT /returns/refunds/:id/complete` |
| **Xem Logs giao dịch Gateway** | Cho phép xem | Cho phép | Cho phép | `GET /payments/transactions` |

*Ghi chú hiển thị:*
- Khi người dùng đăng nhập có vai trò `STAFF`, các nút hành động nhạy cảm tài chính (`Confirm`, `Fail`, `Process Refund`, `Complete Refund`) được render với:
  - Thuộc tính `disabled={true}`
  - Icon khóa 🔒
  - Component `Tooltip` bọc ngoài với nội dung: *"Chỉ Quản lý (Manager/Admin) có quyền thực hiện thao tác này"*.

---

## 6. Xử Lý Trạng Thái Giao Diện (State Coverage Matrix)

| Trạng thái | Biểu hiện trên UI | Hành vi phục hồi / Thao tác người dùng |
| :--- | :--- | :--- |
| **Đang tải (Loading)** | Hiển thị Spin / Table loading skeleton trên bảng; các nút thao tác chuyển sang `loading={true}`. | Khóa tương tác tạm thời để chống click lặp (idempotency guard). |
| **Dữ liệu trống (Empty)** | Component Ant Design `Empty` với thông điệp theo ngữ cảnh (ví dụ: *"Tất cả giao dịch VietQR đã được đối soát!"*). | Nút "Tải lại dữ liệu" để kiểm tra giao dịch mới phát sinh. |
| **Lỗi mạng / Lỗi API** | Hiển thị thông báo `message.error` kèm mã lỗi hoặc giải thích từ backend. | Giữ nguyên dữ liệu cũ, cung cấp nút bấm "Tải lại dữ liệu" (Reload) ở thanh tiêu đề. |
| **Validation thất bại** | Form trong Modal báo đỏ tại ô `providerRef` (*"Vui lòng nhập mã giao dịch ngân hàng"*). | Focus vào trường nhập lỗi, không gửi request lên server. |

---

## 7. Kế Hoạch Kiểm Thử Tự Động (Unit Testing Strategy)

1. **`paymentService.spec.ts`**:
   - Kiểm tra `getAllPaymentsAdmin` gửi request `GET /payments`.
   - Kiểm tra `getTransactionHistoryAdmin` gửi request `GET /payments/transactions`.
   - Kiểm tra `confirmPaymentAdmin` gửi request `PUT /payments/:id/confirm` kèm body `{ providerRef }`.
   - Kiểm tra `failPaymentAdmin` gửi request `PUT /payments/:id/fail`.
2. **`AdminPaymentsPage.spec.tsx`**:
   - Kiểm tra render chuẩn 4 Card chỉ số tổng quan (Doanh thu, Tỷ trọng, Đơn chờ soát, Tiền hoàn).
   - Kiểm tra chuyển Tab qua URL query parameter (ví dụ `?tab=reconciliation`).
   - Kiểm tra chức năng lọc theo Cổng thanh toán và Trạng thái.
3. **`ReconciliationModal.spec.tsx`**:
   - Kiểm tra mở modal với đúng thông tin số tiền và mã đơn hàng.
   - Kiểm tra bắt buộc nhập `providerRef` trước khi bấm nút xác nhận.
   - Kiểm tra gọi đúng `confirmPaymentAdmin` và thực thi callback reload sau khi thành công.
4. **`RefundsLedgerTab.spec.tsx`**:
   - Kiểm tra load và render bảng lịch sử hoàn tiền từ `returnService.getRefundHistory()`.
   - Kiểm tra phân quyền RBAC: User `STAFF` thấy các nút Giải ngân / Hoàn tất bị disabled có tooltip; User `ADMIN` có thể bấm và gọi API xử lý.

---

## 8. Danh Mục Tác Vụ Triển Khai (Implementation Checklist)

- [ ] **Bước 1:** Bổ sung các phương thức Admin vào `frontend/src/services/paymentService.ts` và viết unit test `paymentService.spec.ts`.
- [ ] **Bước 2:** Tạo các Component Tag bổ trợ: `PaymentMethodTag.tsx`, `PaymentStatusTag.tsx` và widget `PaymentStatsCards.tsx`.
- [ ] **Bước 3:** Tạo Modal đối soát `ReconciliationModal.tsx` và viết unit test `ReconciliationModal.spec.tsx`.
- [ ] **Bước 4:** Tạo Tab Tra cứu & Đối soát `ReconciliationTab.tsx`.
- [ ] **Bước 5:** Tạo Tab Danh sách thanh toán `PaymentsListTab.tsx` và Tab Nhật ký kỹ thuật `TransactionsLogTab.tsx`.
- [ ] **Bước 6:** Tạo Tab Sổ cái hoàn tiền `RefundsLedgerTab.tsx` và viết unit test `RefundsLedgerTab.spec.tsx`.
- [ ] **Bước 7:** Hoàn thiện trang chính `AdminPaymentsPage.tsx` tích hợp 4 Tabs, đồng bộ URL query `?tab=...` và viết test `AdminPaymentsPage.spec.tsx`.
- [ ] **Bước 8:** Đăng ký Route `/admin/payments` trong `AppRoutes.tsx` và thêm Menu "Quản lý Thanh toán" trong `AdminLayout.tsx`.
- [ ] **Bước 9:** Chạy toàn bộ test suites frontend (`npm run test` hoặc `vitest run`) và kiểm tra build `npm run build` để đảm bảo không có lỗi type hoặc compile.
