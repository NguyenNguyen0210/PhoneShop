# PhoneShop Core Fixes & System Stability Design Specification

**Tài liệu:** Đặc tả thiết kế khắc phục lỗi cốt lõi, bảo toàn dữ liệu và tối ưu hệ thống  
**Hệ thống:** PhoneShop E-Commerce System (NestJS 11 + Prisma 7 + PostgreSQL + React 19)  
**Ngày lập:** 03/11/2026  
**Trạng thái:** Đã phê duyệt (Approved)  

---

## 1. Bối cảnh và Mục tiêu (Context & Objectives)

Dựa trên báo cáo kiểm toán toàn diện hệ thống (Comprehensive Code Audit), PhoneShop sở hữu nền tảng kiến trúc tương đối vững chắc (quản lý tồn kho kép, theo dõi thiết bị theo số IMEI, dynamic pricing chống race condition). Tuy nhiên, hệ thống còn tồn tại 3 lỗi logic nghiệp vụ cốt lõi ở Backend và một số điểm chưa đồng bộ với Frontend:
1. **BUG-01 (P0):** Bưu tá báo hoàn hàng (`RETURNED`) cho đơn hàng trả trước (VNPAY / VietQR) bị chặn bởi exception `assertNoCapturedPayment`.
2. **BUG-02 (P1):** Nhân viên từ chối chứng từ chuyển khoản (`failPayment`) chỉ cập nhật trạng thái thanh toán mà không hủy đơn và không giải phóng hàng giữ chỗ (`reservedQty`, IMEI `RESERVED`).
3. **BUG-03 (P1):** Đơn hàng đã giao thành công (`DELIVERED`) khi đổi trả (`RETURNED`) qua endpoint chuyển trạng thái thông thường không thực hiện thu hồi kho vật lý, không cập nhật IMEI và không hủy bảo hành.
4. **FE & RBAC (P2):** Thiếu giao diện Modal Hoàn tiền trên Admin Orders; `StockInboundModal` chưa chặn nhập tay cho biến thể IMEI; Tài khoản `STAFF` và `MANAGER` bị chặn 403 khi dùng Giỏ hàng / Wishlist.
5. **Tooling & Perf (P3):** Jest test suites có cảnh báo worker process leak; Frontend bundle chính dung lượng lớn do chưa tối ưu code-splitting.

Mục tiêu thiết kế: Xử lý triệt để các lỗi trên theo đúng nghiệp vụ thực tế, bảo toàn dữ liệu, chống double-release và double-refund, không over-engineering (không đưa thêm message broker hay saga pattern phức tạp), phù hợp với chuẩn mực dự án chất lượng cao.

---

## 2. Thiết kế Chi tiết Backend (Core Business & Data Integrity)

### 2.1. PR #1 (P0): Sửa Carrier Return cho Đơn hàng Trả trước (VNPAY / VietQR)
- **Vị trí code:** `backend/src/modules/orders/orders.service.ts` (nhánh `newStatus === OrderStatus.RETURNED && order.status === OrderStatus.SHIPPING`).
- **Nghiệp vụ chi tiết:**
  - Kiểm tra xem đơn hàng đã có khoản thanh toán thành công (`PaymentStatus.PAID`) hay chưa.
  - **Nhánh COD (Chưa thanh toán):**
    - Gọi `assertNoCapturedPayment(tx, id)` (chắc chắn chưa thu tiền).
    - Hủy các payment `PENDING`.
    - Trả IMEI từ `RESERVED` về `AVAILABLE` (hàng chưa giao đến tay khách, bưu tá trả lại kho nguyên vẹn).
    - Trừ `reservedQty` trong `Inventory`.
    - Rollback lượt dùng Voucher và quota Flash Sale.
  - **Nhánh Trả trước (VNPAY / VietQR - Đã `PAID`):**
    - **Không gọi `assertNoCapturedPayment`**.
    - Cập nhật trạng thái đơn hàng sang `OrderStatus.RETURNED`.
    - Cập nhật trạng thái IMEI: Chuyển các IMEI từ `SOLD` sang `ImeiStatus.RETURNED` (chờ bộ phận kho tiếp nhận và kiểm tra ngoại quan trước khi cho phép tái nhập kho).
    - Vô hiệu hóa bảo hành: Gọi `warrantyService.voidWarrantiesForOrder(tx, id)` với lý do rõ ràng.
    - Ghi nhận trạng thái hoàn tiền: Cập nhật Payment sang `REFUND_PENDING` (hoặc tạo transaction `REFUND` trạng thái `PENDING` và cập nhật ghi chú đơn hàng cần kế toán hoàn trả tiền cho khách).
    - Ghi nhận Audit Log sự kiện bưu tá hoàn hàng cho đơn trả trước.

### 2.2. PR #2 (P1): Đồng bộ `failPayment` & Giải phóng Hàng giữ chỗ (VietQR)
- **Vị trí code:** `backend/src/modules/payments/payments.service.ts` (`failPayment()`) và liên kết với `OrdersService`.
- **Nghiệp vụ chi tiết:**
  - Toàn bộ thao tác thực hiện trong **1 Prisma interactive transaction**:
    1. **Kiểm tra Idempotent:** Tìm Payment theo `paymentId`. Nếu `payment.status !== PaymentStatus.PENDING`, ném `BadRequestException` để chặn các request bấm lặp lại.
    2. **Ghi sổ thất bại:** Cập nhật `payment.status = PaymentStatus.FAILED`, tạo bản ghi `PaymentTransaction` với `status: FAILED, type: PAYMENT`.
    3. **Kiểm tra Order liên kết:** Tìm `Order` tương ứng kèm danh sách `payments` và `items`.
    4. **Hủy đơn & Nhả kho:** Nếu không còn payment nào khác ở trạng thái `PAID` hoặc `PENDING`:
       - Thực hiện conditional update trên Order: Chuyển từ `PENDING` sang `OrderStatus.CANCELLED`.
       - Tái sử dụng logic giải phóng hàng giữ chỗ `releaseOrderReservation(order, tx)`:
         - Trừ `reservedQty` trong bảng `Inventory` cho từng variant tương ứng.
         - Chuyển `ImeiDevice` từ `RESERVED` về `ImeiStatus.AVAILABLE`.
         - Trả lại `soldCount` của Flash Sale nếu đơn mua trong khung giờ khuyến mãi.
         - Rollback lượt dùng Voucher nếu có áp dụng mã giảm giá.
       - Ghi chú lý do hủy đơn: *"Đơn hàng bị hủy do chứng từ thanh toán chuyển khoản không hợp lệ hoặc bị từ chối"*.

### 2.3. PR #3 (P1): Chuẩn hóa Vòng đời Đổi trả sau Giao hàng (Return & Refund Lifecycle)
- **Vị trí code:** `backend/src/modules/orders/orders.service.ts` (`transitionStatus()` và `processRefund()`).
- **Nghiệp vụ chi tiết:**
  - **Chặn chuyển trạng thái trực tiếp `DELIVERED -> RETURNED` qua `transitionStatus`:**
    - Trong hàm `transitionStatus()`, loại bỏ nhánh cho phép chuyển suông từ `DELIVERED` hoặc `COMPLETED` sang `RETURNED`.
    - Nếu người dùng cố tình gọi `PUT /api/orders/:id/status` với `newStatus: RETURNED` khi đơn đang ở trạng thái `DELIVERED` hoặc `COMPLETED`, ném `BadRequestException`:
      > *"Đơn hàng đã giao thành công chỉ có thể đổi trả thông qua quy trình Hoàn tiền / Đổi trả chính thức (processRefund)."*
  - **Chuẩn hóa quy trình `processRefund()`:**
    - Ràng buộc trạng thái đầu vào: Chỉ xử lý đơn có trạng thái `DELIVERED` hoặc `COMPLETED`, và thanh toán là `PAID`.
    - Bảo vệ Idempotency (Chống Double-Refund / Double-Restock):
      - Cập nhật có điều kiện `tx.order.updateMany({ where: { id, status: { in: [DELIVERED, COMPLETED] } }, data: { status: OrderStatus.RETURNED } })`.
      - Nếu `count === 0`, ném lỗi hoặc trả về đơn đã hoàn tiền, ngăn chặn mọi side-effect lặp lại.
    - Side-effects trong transaction:
      - Tạo bản ghi `PaymentTransaction` loại `REFUND`, trạng thái `SUCCESS`.
      - Cập nhật `Payment.status = REFUNDED`.
      - Nhập lại kho vật lý: `tx.inventory.updateMany({ where: { variantId }, data: { quantity: { increment: qty } } })` kèm bản ghi `StockMovement` loại `IMPORT_RETURN`.
      - Cập nhật `ImeiDevice.status = ImeiStatus.RETURNED`.
      - Hủy bảo hành `warrantyService.voidWarrantiesForOrder()`.
      - Ghi Audit Log hoàn tiền minh bạch kèm `staffId` và lý do.

---

## 3. Thiết kế Giao diện Frontend, RBAC & Tooling

### 3.1. PR #4 (P2): Frontend Refund UI, IMEI Inbound UX & Phân quyền RBAC
- **Admin Orders Refund Modal:**
  - File: `frontend/src/services/orderService.ts` & `frontend/src/pages/Admin/Orders/AdminOrdersPage.tsx`.
  - Bổ sung `orderService.refundOrder(id, { reason, amount, bankAccount, restockItems })`.
  - Trên giao diện quản lý đơn hàng: Thêm nút hành động "Hoàn tiền / Đổi trả" cho các đơn `DELIVERED` hoặc `COMPLETED` đã thanh toán.
  - Hiển thị Modal thu thập: Lý do hoàn tiền, Số tiền hoàn, Ghi chú tài khoản thụ hưởng, Tùy chọn nhập lại kho.
  - Cập nhật trực quan trạng thái đơn sang `RETURNED` và tag thanh toán sang `REFUNDED`.
- **Kiểm soát nhập kho IMEI (`StockInboundModal`):**
  - File: `frontend/src/pages/Admin/Inventory/components/StockInboundModal.tsx`.
  - Khi người dùng chọn một biến thể: Kiểm tra xem biến thể có quản lý theo IMEI hay không.
  - Nếu có quản lý theo IMEI: Khóa ô nhập số lượng và nút bấm xác nhận; hiển thị `Alert type="warning"` giải thích rõ lý do cần nhập qua tab IMEI kèm nút điều hướng nhanh tới `/admin/inventory?tab=imei`.
- **Mở rộng RBAC cho Giỏ hàng & Wishlist:**
  - File: `backend/src/modules/cart/cart.controller.ts` & `backend/src/modules/wishlist/wishlist.controller.ts`.
  - Bổ sung `Role.STAFF, Role.MANAGER` vào danh sách `@Roles(...)` để nhân viên có thể sử dụng giỏ hàng bình thường khi đăng nhập tài khoản làm việc.

### 3.2. PR #5 (P3): Dọn dẹp Jest & Tối ưu Bundle Frontend
- **Jest Teardown Cleanup:**
  - File: `backend/test/orders-hold.spec.ts`, `backend/test/system-settings-integration.spec.ts`.
  - Đảm bảo toàn bộ test suites đều có hook `afterAll()` đóng kết nối `app.close()` và `prisma.$disconnect()`, loại bỏ cảnh báo unhandled worker process leak.
- **Tối ưu Bundle Frontend:**
  - File: `frontend/vite.config.ts`.
  - Cấu hình `manualChunks` tách vendor: `vendor-react`, `vendor-antd`, `vendor-charts`, `vendor-utils`.
  - Giải quyết cảnh báo dynamic import tại `inventoryService.ts`, đưa dung lượng chunk chính về mức tiêu chuẩn tối ưu.

---

## 4. Kế hoạch Kiểm chứng & Regression Test Suite

Hệ thống sẽ được kiểm chứng bằng 8 bài test hồi quy bắt buộc:
1. `test_carrier_return_vnpay_paid`: Đơn VNPAY `PAID` đang `SHIPPING` bị bưu tá chuyển sang `RETURNED` $\to$ Cập nhật thành công, không ném exception, IMEI chuyển sang `RETURNED`, hủy bảo hành.
2. `test_carrier_return_cod_unpaid`: Đơn COD đang `SHIPPING` bị hoàn hàng $\to$ IMEI trở lại `AVAILABLE`, trừ `reservedQty`, không tạo giao dịch hoàn tiền.
3. `test_fail_payment_vietqr_cancels_and_releases`: Gọi `failPayment` cho đơn VietQR `PENDING` $\to$ Order chuyển sang `CANCELLED`, `reservedQty` được trừ, IMEI chuyển về `AVAILABLE`.
4. `test_fail_payment_idempotency`: Gọi `failPayment` hai lần liên tiếp cho cùng một payment $\to$ Lần thứ hai bị từ chối an toàn, không giải phóng tồn kho lần 2.
5. `test_block_plain_transition_from_delivered_to_returned`: Gọi `PUT /orders/:id/status` với `newStatus: RETURNED` khi đơn đang `DELIVERED` $\to$ Bị chặn với lỗi `BadRequestException`, yêu cầu dùng `processRefund`.
6. `test_process_refund_restocks_and_voids_warranty`: Gọi `processRefund` cho đơn `DELIVERED` $\to$ Kho vật lý được cộng lại, IMEI chuyển sang `RETURNED`, bảo hành chuyển sang `VOIDED`, `Payment` sang `REFUNDED`.
7. `test_refund_idempotency`: Gọi `processRefund` lần thứ hai cho cùng một đơn đã hoàn tiền $\to$ Bị từ chối an toàn, không cộng tồn kho lần 2.
8. `test_rbac_staff_manager_cart_access`: Gửi request thêm giỏ hàng với JWT của `STAFF` hoặc `MANAGER` $\to$ Trả về mã 200/201, không bị `403 Forbidden`.
