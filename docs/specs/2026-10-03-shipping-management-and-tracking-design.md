# Thiết Kế Tính Năng Quản Lý Vận Chuyển & Hành Trình Giao Nhận Toàn Diện (Shipping Management & Tracking Design)

- **Ngày tạo:** 03/10/2026
- **Tác giả:** Happy Cabin / PhoneShop Engineering Team
- **Trạng thái:** Approved by User / Ready for Implementation Planning
- **Phiên bản:** 1.0.0

---

## 1. Tổng Quan & Mục Tiêu

### 1.1. Bối cảnh & Hiện trạng
Hệ thống Happy Cabin đã có bảng dữ liệu `Shipping` và một số API cơ bản trong backend (`POST /shipping`, `PATCH /shipping/:id/status`, `GET /shipping/order/:orderId`), tuy nhiên trên thực tế:
1. **Chuẩn bị shipment / Gán đơn vị vận chuyển:** Chưa có giao diện trên Frontend cho Staff chọn đơn vị vận chuyển (GHN, Viettel Post, GHTK...) và thiết lập ngày giao dự kiến. Backend ném lỗi nếu đơn đã được khởi tạo bản ghi Shipping lúc checkout.
2. **Nhập mã vận đơn (Tracking Number):** Chưa có trường nhập liệu trên giao diện Admin để nhân viên điền mã vận đơn sau khi gửi hàng tại bưu cục/bàn giao bưu tá.
3. **Cập nhật trạng thái vận chuyển chi tiết:** Backend hỗ trợ 7 trạng thái (`PENDING`, `READY_TO_SHIP`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`, `RETURNED`), nhưng Frontend Admin hiện chỉ chuyển trạng thái chung của đơn hàng (`SHIPPING` / `DELIVERED`), chưa hỗ trợ trạng thái logistics chi tiết và chưa có cơ chế đồng bộ tự động giữa `Shipping.status` và `Order.status`.
4. **Hành trình đơn hàng (Delivery Status Timeline):** Chưa có giao diện Timeline 2 tầng trực quan kèm danh sách mốc thời gian chi tiết theo thời gian thực cho cả Khách hàng theo dõi lẫn Staff quản lý.

### 1.2. Mục tiêu hệ thống
- **Dành cho Nhân viên (Staff / Admin):**
  - Cung cấp Modal **Điều Phối Giao Hàng (`ShippingDispatchModal`)** tích hợp mượt mà trong trang Quản lý đơn hàng (`/admin/orders`).
  - Cho phép chọn nhanh các đối tác vận chuyển phổ biến tại Việt Nam (GHN, Viettel Post, GHTK, J&T Express, VNPost...) hoặc nhập đơn vị vận chuyển tùy chỉnh.
  - Nhập và lưu mã vận đơn, ngày dự kiến giao hàng, phí vận chuyển.
  - Bộ nút chuyển trạng thái 1-Click thông minh tuân thủ đúng quy trình luân chuyển hàng hóa.
- **Dành cho Khách mua hàng (Storefront Customer):**
  - Giao diện **Hành trình bưu kiện (`OrderTrackingTimeline`)** 2 tầng cao cấp:
    - *Tầng 1 (Stepper):* 5 mốc trực quan (Đã đặt &rarr; Đã đóng gói &rarr; Bưu tá đã lấy &rarr; Đang giao &rarr; Đã nhận hàng).
    - *Tầng 2 (Activity Log):* Chi tiết ngày giờ chính xác của từng sự kiện luân chuyển.
  - Nút Copy mã vận đơn và nút **"Tra cứu trên website hãng &rarr;"** tự động liên kết tới trang tra cứu chính thức của GHN, Viettel Post, GHTK, J&T, VNPost.
- **Tầng Backend & Dữ liệu:**
  - Cải tiến `ShippingService` hỗ trợ Upsert an toàn thông tin vận chuyển.
  - Cơ chế **Tự động đồng bộ trạng thái đơn hàng (Auto-sync Order Status)** khi trạng thái Shipping thay đổi, bảo đảm tính toàn vẹn cho tài chính (COD &rarr; PAID), kho hàng (IMEI &rarr; SOLD) và bảo hành điện tử.

---

## 2. Kiến Trúc Dữ Liệu & API Backend

### 2.1. Prisma Schema Hiện Tại (`Shipping` Model & `ShippingStatus` Enum)
```prisma
enum ShippingStatus {
  PENDING
  READY_TO_SHIP
  PICKED_UP
  IN_TRANSIT
  DELIVERED
  FAILED
  RETURNED
}

model Shipping {
  id                    String         @id @default(uuid()) @db.Uuid
  orderId               String         @unique @map("order_id") @db.Uuid
  providerName          String         @map("provider_name") @db.VarChar(100)
  trackingNumber        String?        @unique @map("tracking_number") @db.VarChar(100)
  status                ShippingStatus @default(PENDING)
  shippingFee           Decimal        @default(0) @map("shipping_fee") @db.Decimal(15, 2)
  estimatedDeliveryDate DateTime?      @map("estimated_delivery_date")
  shippedAt             DateTime?      @map("shipped_at")
  deliveredAt           DateTime?      @map("delivered_at")
  createdAt             DateTime       @default(now()) @map("created_at")
  updatedAt             DateTime       @updatedAt @map("updated_at")

  order                 Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([trackingNumber])
  @@map("shippings")
}
```

### 2.2. Luồng Chuyển Trạng Thái (Status Transitions State Machine)
Quy tắc chuyển trạng thái hợp lệ trong `backend/src/modules/shipping/shipping.service.ts`:
- `PENDING` &rarr; `READY_TO_SHIP`
- `READY_TO_SHIP` &rarr; `PICKED_UP`
- `PICKED_UP` &rarr; `IN_TRANSIT`
- `IN_TRANSIT` &rarr; `DELIVERED` hoặc `FAILED`
- `FAILED` &rarr; `IN_TRANSIT` (giao lại) hoặc `RETURNED` (hoàn trả về kho)

### 2.3. Quy Tắc Tự Động Đồng Bộ Trạng Thái Đơn Hàng (Auto-sync with Order)
Khi Staff thực hiện chuyển trạng thái vận chuyển qua `shipping.service.ts`:
1. Khi `ShippingStatus` &rarr; `PICKED_UP` hoặc `IN_TRANSIT`:
   - Nếu `order.status` đang ở `CONFIRMED` hoặc `PROCESSING`: Tự động gọi `ordersService.transitionStatus(orderId, OrderStatus.SHIPPING)`.
   - Cập nhật `shippedAt = new Date()`.
2. Khi `ShippingStatus` &rarr; `DELIVERED`:
   - Nếu `order.status` đang ở `SHIPPING`: Tự động gọi `ordersService.transitionStatus(orderId, OrderStatus.DELIVERED)`.
   - Logic `transitionStatus` của Order tự động:
     - Chốt IMEI từ `RESERVED` sang `SOLD`.
     - Cập nhật thanh toán COD từ `PENDING` sang `PAID` và tạo `PaymentTransaction`.
     - Kích hoạt bản ghi Bảo hành điện tử (`Warranty`) cho sản phẩm.
     - Cập nhật `deliveredAt = new Date()`.
3. Khi `ShippingStatus` &rarr; `RETURNED`:
   - Tự động gọi `ordersService.transitionStatus(orderId, OrderStatus.RETURNED)`.

### 2.4. Danh Sách API Endpoints Backend
| Method | Endpoint | Quyền (Guards) | Mục đích & Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/shipping/assign` | `STAFF`, `MANAGER`, `ADMIN` | Gán ĐVVC & Mã vận đơn (Upsert: cập nhật nếu đã có bản ghi PENDING, tạo mới nếu chưa có). Đổi trạng thái sang `READY_TO_SHIP`. |
| `PATCH` | `/shipping/:id/status` | `STAFF`, `MANAGER`, `ADMIN` | Cập nhật trạng thái bưu kiện (validate theo bảng chuyển trạng thái, đồng bộ sang Order). |
| `PATCH` | `/shipping/:id` | `STAFF`, `MANAGER`, `ADMIN` | Cập nhật thông tin chi tiết (providerName, trackingNumber, estimatedDeliveryDate, shippingFee). |
| `GET` | `/shipping/order/:orderId` | `USER` (chủ đơn) hoặc `STAFF+` | Lấy dữ liệu vận chuyển đầy đủ theo Order ID. |
| `GET` | `/shipping/:id` | `USER` (chủ đơn) hoặc `STAFF+` | Lấy dữ liệu vận chuyển theo Shipping ID. |
| `GET` | `/shipping` | `STAFF`, `MANAGER`, `ADMIN` | Danh sách toàn bộ các bản ghi vận chuyển phục vụ tra cứu. |

---

## 3. Thiết Kế Giao Diện Quản Trị Viên (Staff Admin UI)

### 3.1. Định hướng thẩm mỹ & Vị trí tích hợp
- **Định hướng thẩm mỹ:** *Ant Design Enterprise Logistics* — Rõ ràng, dứt khoát, phân cấp thông tin minh bạch, tone màu xanh `#2563eb`, xanh lá `#16a34a`, cam `#ea580c`.
- **Vị trí tích hợp trong `AdminOrdersPage.tsx`:**
  - Thêm cột hoặc nút thao tác **"Vận chuyển" (icon xe tải `CarOutlined`)** tại mỗi dòng trong bảng danh sách đơn hàng.
  - Nếu đơn hàng đã có mã vận đơn & ĐVVC: Hiển thị Tag nhỏ gọn kèm tooltip xem nhanh mã vận đơn.
  - Trong Modal Chi tiết đơn hàng hiện tại: Bổ sung Card "Thông tin Vận chuyển & Giao nhận" kèm nút bấm mở modal điều phối.

### 3.2. Cấu trúc Component `ShippingDispatchModal.tsx`
- **Header:** Hiển thị Mã đơn hàng, Tên người nhận, Số điện thoại, Địa chỉ nhận hàng, Trạng thái vận chuyển hiện tại.
- **Form điều phối:**
  1. *Chọn Đơn vị vận chuyển:*
     - Nhóm nút bấm chọn nhanh các hãng:
       - **Giao Hàng Nhanh (GHN)**
       - **Viettel Post**
       - **Giao Hàng Tiết Kiệm (GHTK)**
       - **J&T Express**
       - **Bưu Điện Việt Nam (VNPost)**
       - **Hỏa tốc Happy Express (Nội thành)**
     - Ô input cho phép nhập tên hãng vận chuyển khác nếu dùng đối tác ngoài.
  2. *Mã vận đơn (Tracking Number):*
     - Input font Monospace, tự động loại bỏ khoảng trắng thừa, hỗ trợ paste nhanh từ clipboard bưu tá.
  3. *Ngày dự kiến giao hàng & Phí vận chuyển:*
     - Ant Design `DatePicker` (chọn ngày dự kiến nhận hàng).
     - Input số phí giao hàng thực tế.
  4. *Bộ nút hành động Chuyển trạng thái 1-Click:*
     - Căn cứ vào trạng thái hiện tại của đơn hàng và bưu kiện, hiển thị các nút bước tiếp theo:
       - Nút *"Gán ĐVVC & Sẵn sàng xuất kho (READY_TO_SHIP)"*
       - Nút *"Bưu tá đã lấy hàng (PICKED_UP)"*
       - Nút *"Đang giao hàng (IN_TRANSIT)"*
       - Nút *"Giao thành công (DELIVERED)"* (Màu xanh lá)
       - Nút *"Giao thất bại (FAILED)"* (Màu vàng cam) & *"Hoàn hàng về kho (RETURNED)"* (Màu đỏ)
  5. *Footer:*
     - Nút "Đóng" và Nút "Lưu thông tin vận chuyển".

---

## 4. Thiết Kế Giao Diện Khách Hàng (Customer Storefront UI)

### 4.1. Nâng cấp Component `OrderTrackingTimeline.tsx`
Component tại `frontend/src/pages/storefront/Orders/components/OrderTrackingTimeline.tsx` được nâng cấp thành **2 tầng**:

#### Tầng 1: Stepper 5 bước trực quan
1. **Đã đặt hàng** (`PENDING`) — Icon `Clock`
2. **Đã đóng gói** (`READY_TO_SHIP`) — Icon `Package`
3. **Bưu tá đã lấy hàng** (`PICKED_UP`) — Icon `Building2` / `Truck`
4. **Đang giao hàng** (`IN_TRANSIT`) — Icon `Truck` (Hiệu ứng ring xanh nổi bật)
5. **Đã giao hàng** (`DELIVERED`) — Icon `CheckCircle2`

#### Tầng 2: Chi tiết mốc lịch sử thời gian (Activity Log)
Danh sách các sự kiện theo dòng thời gian dọc, hiển thị ngày giờ thực tế:
- **Đã giao hàng thành công:** Thời gian `shipping.deliveredAt`.
- **Kiện hàng đang trên đường giao đến bạn:** Thời gian `shipping.updatedAt`.
- **Đơn vị vận chuyển đã tiếp nhận kiện hàng:** Thời gian `shipping.shippedAt`.
- **Shop đã đóng gói & tạo mã vận đơn:** Thời gian `shipping.createdAt`.
- **Đơn hàng đã được đặt thành công:** Thời gian `order.createdAt`.

#### Khối Tra Cứu Vận Đơn Trực Tiếp (Direct Carrier Tracker Link)
Dựa vào `providerName`, tự động sinh URL tra cứu bưu kiện tương ứng:
- **GHN (Giao Hàng Nhanh):** `https://donhang.ghn.vn/?order_code=${trackingNumber}`
- **Viettel Post:** `https://viettelpost.vn/tra-cuu-hanh-trinh-don?code=${trackingNumber}`
- **GHTK (Giao Hàng Tiết Kiệm):** `https://i.ghtk.vn/${trackingNumber}`
- **J&T Express:** `https://jtexpress.vn/vi/tracking?billcode=${trackingNumber}`
- **VNPost:** `https://www.vnpost.vn/vi-vn/dinh-vi/buu-pham?key=${trackingNumber}`

Nút bấm dạng icon `ExternalLink` mở tab mới giúp khách hàng theo dõi tọa độ thực tế của bưu tá trên bản đồ của hãng.

---

## 5. Ma Trận Trạng Thái Giao Diện (State Coverage Matrix)

| Màn hình | Trạng thái Dữ liệu | Trải nghiệm người dùng hiển thị (UX Representation) |
| :--- | :--- | :--- |
| **Admin Orders** | Chưa gán ĐVVC | Hiển thị nút "Gán vận chuyển" màu xám viền nét đứt. Trạng thái PENDING. |
| **Admin Orders** | Đang giao hàng | Hiển thị Tag hãng (GHN, Viettel Post...) + Mã vận đơn bấm copy được + Tag trạng thái màu cam (IN_TRANSIT). |
| **Admin Modal** | Submitting (Đang lưu) | Nút Lưu/Chuyển trạng thái hiển thị loading spinner, vô hiệu hóa form chống trùng lặp request. |
| **Admin Modal** | Lỗi API (Trùng tracking, sai luồng) | Thông báo lỗi tiếng Việt dễ hiểu qua Ant Design `message.error`. |
| **Storefront** | Mới đặt đơn (PENDING) | Stepper dừng ở bước 1, hiển thị banner thông báo: *"Shop đang chuẩn bị hàng hóa và niêm phong kiện hàng."* |
| **Storefront** | Đang vận chuyển | Hiển thị đầy đủ tên hãng, mã vận đơn, ngày dự kiến giao, nút tra cứu hãng, mốc bưu tá đã lấy hàng. |
| **Storefront** | Giao thành công | Bước 5 sáng xanh hoàn tất, hiển thị giờ giao, mở nút "Đánh giá sản phẩm" và kích hoạt thời hạn bảo hành. |
| **Storefront** | Đơn bị hủy (CANCELLED) | Banner màu đỏ hiển thị lý do hủy đơn và ngày giờ hủy. |
| **Storefront** | Giao thất bại / Hoàn hàng | Banner cảnh báo thông báo lý do bưu tá chưa phát được hàng hoặc hàng đang chuyển hoàn về kho. |

---

## 6. Kế Hoạch Kiểm Thử & Tiêu Chí Nghiệm Thu (Testing & Acceptance Criteria)

### 6.1. Backend Unit & Integration Tests
- **Test 1: Assign Shipping Upsert:** Gọi API `/shipping/assign` trên đơn hàng đã có bản ghi Shipping `PENDING` &rarr; Cập nhật thành công hãng, mã vận đơn, chuyển sang `READY_TO_SHIP`.
- **Test 2: Status Transitions Validation:** Thử chuyển trái quy trình (ví dụ từ `PENDING` nhảy cóc sang `DELIVERED`) &rarr; Ném lỗi `400 BadRequestException`.
- **Test 3: Auto-sync Order Status:** Chuyển Shipping sang `PICKED_UP` &rarr; Order đổi sang `SHIPPING`. Chuyển Shipping sang `DELIVERED` &rarr; Order đổi sang `DELIVERED`, IMEI đổi sang `SOLD`, COD thanh toán đổi sang `PAID`.
- **Test 4: Scoped Access:** User chỉ xem được thông tin vận chuyển của đơn hàng chính mình; Staff xem được của tất cả đơn.

### 6.2. Frontend Tests (Vitest & Testing Library)
- **Test 1: `shippingService`:** Mock API client kiểm tra các hàm `assignShipping`, `updateShippingStatus`, `getShippingByOrderId`.
- **Test 2: `ShippingDispatchModal`:** Render modal, chọn hãng GHN, nhập tracking number, bấm Lưu &rarr; Gọi đúng payload API.
- **Test 3: `OrderTrackingTimeline`:** Render với các trạng thái khác nhau (`PENDING`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`), kiểm tra các mốc bước và liên kết tra cứu hãng vận chuyển.

---

## 7. Phân Rã Công Việc Kế Tiếp
Sau khi tài liệu đặc tả này được chấp thuận, hệ thống sẽ chuyển sang bước lập Kế Hoạch Triển Khai (`writing-plans`):
1. **Task 1 (Backend Core):** Nâng cấp `ShippingService`, `ShippingController` và DTOs (`assign`, `updateStatus`, auto-sync order). Viết backend tests.
2. **Task 2 (Frontend Service & Types):** Bổ sung type `READY_TO_SHIP` và tạo `frontend/src/services/shippingService.ts`. Viết service tests.
3. **Task 3 (Frontend Admin):** Xây dựng component `ShippingDispatchModal.tsx` và tích hợp vào `AdminOrdersPage.tsx`. Viết unit test cho modal.
4. **Task 4 (Frontend Storefront):** Nâng cấp `OrderTrackingTimeline.tsx` với giao diện 2 tầng và link tra cứu ĐVVC. Viết component test.
5. **Task 5 (End-to-End Verification):** Chạy kiểm thử toàn bộ luồng tạo đơn &rarr; gán vận đơn &rarr; bưu tá lấy hàng &rarr; giao thành công &rarr; chốt COD/IMEI.
