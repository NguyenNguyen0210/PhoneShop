# Đặc Tả Kiến Trúc & Thiết Kế Cổng Vận Hành Nhân Viên (Staff Portal Architecture Design)

- **Ngày ban hành**: 2026-10-04
- **Mục tiêu**: Tách biệt hoàn toàn Cổng Vận hành Nhân viên (`/staff`) khỏi Cổng Quản trị Tối cao (`/admin`), loại bỏ 100% các tính năng/nút bấm vượt quyền của Staff (nhằm ngăn chặn lỗi 403 Forbidden và rò rỉ chức năng quản trị), đồng thời xây dựng giao diện vận hành chuyên nghiệp (High-Density Operations Hub) chuẩn sàn thương mại điện tử thực thụ.

---

## 1. Bối cảnh & Vấn đề Cần giải quyết

### 1.1. Hiện trạng trước thay đổi
1. **Dùng chung URL `/admin/...`**: Khi nhân viên (role `STAFF`) đăng nhập, hệ thống tự động chuyển hướng đến `/admin`. Toàn bộ giao diện hiển thị nhãn hiệu "Admin", breadcrumbs "Admin", và thanh điều hướng bên trái chứa đầy đủ 15 danh mục dành cho Admin cấp cao.
2. **Lỗi phân quyền 403 Forbidden**: Khi Staff vào trang chủ `/admin`, frontend gọi các API thống kê tài chính và báo cáo doanh thu (`/reports/...`), vốn được backend bảo vệ nghiêm ngặt chỉ dành cho `ADMIN`. Kết quả là bảng điều khiển bị lỗi và hiển thị số liệu 0 hoặc rỗng.
3. **Hiển thị chức năng vượt quyền**: Nhân viên nhìn thấy các liên kết cấu hình nhạy cảm như *Cấu hình Hệ thống (Settings: VietQR, S3, Email)*, *Quản lý Tài khoản (Users & Roles)*, *Audit Logs*, *Tạo Chiến dịch Khuyến mãi / Flash Sale*, *Quản lý Nhà cung cấp / Danh mục*. Khi bấm vào các tính năng này, nhân viên bị từ chối truy cập hoặc gặp lỗi.
4. **Trải nghiệm thiếu chuyên nghiệp**: Không phân định được ranh giới giữa người làm chính sách/quản trị (Admin) và nhân sự thực thi/vận hành đơn hàng (Staff).

### 1.2. Mục tiêu giải pháp
* Tách biệt độc lập: Cổng `/admin` dành cho Quản trị viên (`ADMIN`, `MANAGER`); Cổng `/staff` dành riêng cho Nhân viên Vận hành & CSKH (`STAFF`).
* Thiết kế chuyên biệt: Giao diện **High-Density Operations Hub** với tông màu sắc sảo (Indigo / Slate), tập trung vào các công việc cần giải quyết trong ca trực.
* Rà soát quyền hạn chặt chẽ: Loại bỏ 100% các nút bấm hoặc trang vượt quyền của Staff trên giao diện, tương thích hoàn toàn với phân quyền RBAC ở Backend NestJS.

---

## 2. Phân Định Ma Trận Quyền Hạn (RBAC Matrix)

| Lĩnh vực | Staff CÓ THỂ LÀM (`/staff`) | Staff KHÔNG THỂ LÀM (Chỉ Admin/Manager) |
| :--- | :--- | :--- |
| **Đơn hàng (Orders)** | Xem danh sách, chi tiết; Chuyển trạng thái đơn: Xác nhận (`CONFIRMED`), Đóng gói (`PACKED`), Bàn giao vận chuyển (`SHIPPING`), Đã giao (`DELIVERED`), Hoàn tất (`COMPLETED`), Hủy đơn theo yêu cầu khách; In phiếu đóng gói / phiếu vận chuyển. | Xóa đơn hàng, cấu hình bảng giá phí giao hàng toàn sàn. |
| **Kho & IMEI (Inventory)** | Xem tồn kho thực tế; Thực hiện nhập kho (Inbound) và xuất kho (Outbound); Điều chỉnh kiểm kê tồn thực tế (Stock adjustment); Quét barcode/import danh sách mã IMEI từ Excel; Cập nhật tình trạng thiết bị IMEI (Mới, Đã bán, Lỗi); Cập nhật mức cảnh báo tồn tối thiểu. | Xóa thiết bị IMEI (`DELETE /imei/:id`), Đối soát kiểm kê tài chính kho định kỳ (`/inventory/reconcile`). |
| **Hỗ trợ CSKH (Tickets)** | Xem danh sách ticket hỗ trợ; Nhận xử lý ticket; Gửi tin nhắn trả lời khách hàng; Thay đổi trạng thái ticket (Mới tiếp nhận ➔ Đang xử lý ➔ Đã giải quyết / Đóng); Đổi mức độ ưu tiên. | Xóa ticket vĩnh viễn, cấu hình các kênh tiếp nhận hỗ trợ. |
| **Đổi trả (Returns)** | Xem danh sách yêu cầu hoàn trả; Duyệt yêu cầu gửi hàng hoàn; Xác nhận đã nhận kiện hàng; Kiểm định tình trạng thiết bị thực tế; Hoàn tất quy trình xử lý đổi trả. | Khởi tạo lệnh chuyển khoản hoàn tiền ngân hàng (`/returns/admin/:id/refund` - thuộc Kế toán & Admin). |
| **Trả góp (Installments)** | Xem danh sách hồ sơ trả góp; Thẩm định hồ sơ (Duyệt hồ sơ, Từ chối hồ sơ, Yêu cầu bổ sung chứng từ/ảnh CCCD). | Cấu hình chính sách lãi suất hoặc đối tác tài chính trả góp. |
| **Đánh giá (Reviews)** | Xem toàn bộ đánh giá sản phẩm; Phản hồi bình luận của khách hàng với danh nghĩa PhoneShop; Ẩn/Hiện đánh giá vi phạm quy chuẩn cộng đồng. | Xóa vĩnh viễn bài đánh giá (`DELETE /reviews/:id`). |
| **Khách hàng (Customer 360)**| Tra cứu danh sách khách hàng; Xem hồ sơ Customer 360 (thông tin liên hệ, lịch sử mua hàng, lịch sử bảo hành, lịch sử ticket) để hỗ trợ tư vấn. | Tạo tài khoản, sửa đổi thông tin cá nhân khách hàng, Khóa/Mở khóa tài khoản, Đặt lại mật khẩu, Đổi vai trò (Role). |
| **Sản phẩm & Danh mục** | *(Không phân quyền cho Staff)* | Tạo/Sửa/Xóa sản phẩm, cấu hình biến thể sản phẩm, quản lý Categories, Brands, Suppliers. |
| **Khuyến mãi & Marketing** | *(Không phân quyền cho Staff)* | Tạo Voucher giảm giá, tạo sự kiện Flash Sale. |
| **Cấu hình & Hệ thống** | *(Không phân quyền cho Staff)* | Cấu hình hệ thống (Settings: Email, S3, VietQR), Quản lý người dùng nội bộ, Xem Audit Logs hệ thống. |
| **Báo cáo & Tài chính** | *(Không phân quyền cho Staff)* | Xem báo cáo doanh thu tổng thể, lợi nhuận, dòng tiền kinh doanh. |

---

## 3. Kiến Trúc Điều Hướng & Router Hệ Thống

### 3.1. Phân luồng đăng nhập (Authentication Routing)
Tại `LoginPage.tsx` và `OAuthCallbackPage.tsx`:
* Nếu `user.role === 'STAFF'` ➔ Điều hướng thẳng tới `/staff`.
* Nếu `user.role === 'ADMIN' || 'MANAGER'` ➔ Điều hướng tới `/admin`.
* Nếu `user.role === 'USER'` (Khách hàng) ➔ Điều hướng về trang chủ Storefront `/`.

### 3.2. Bảo vệ Route (Route Guards)
* Tạo `StaffRoute.tsx`:
  * Yêu cầu người dùng phải đăng nhập (`accessToken` & `user`).
  * Chỉ cho phép các vai trò: `STAFF`, `MANAGER`, `ADMIN` (Admin và Manager có quyền truy cập vào Staff Workspace để giám sát hoặc trực ca).
  * Nếu người dùng là `USER`, điều hướng về `/`.
* Cập nhật `AdminRoute.tsx`:
  * Chỉ cho phép vai trò `ADMIN` và `MANAGER`.
  * Nếu người dùng có role là `STAFF` cố truy cập `/admin/*`, tự động điều hướng sang `/staff`.

### 3.3. Cấu trúc Cụm Route `/staff/*`
```
/staff                      ➔ StaffDashboardPage (Operations Hub & To-do Queue)
/staff/orders               ➔ StaffOrdersPage (Vận hành & đóng gói đơn hàng)
/staff/inventory            ➔ StaffInventoryPage (Tồn kho, xuất nhập & mã IMEI)
/staff/tickets              ➔ StaffTicketsPage (Danh sách yêu cầu hỗ trợ CSKH)
/staff/tickets/:id          ➔ StaffTicketDetailPage (Trò chuyện & xử lý ticket)
/staff/returns              ➔ StaffReturnsPage (Tiếp nhận & kiểm định đổi trả)
/staff/installments         ➔ StaffInstallmentsPage (Thẩm định hồ sơ trả góp)
/staff/reviews              ➔ StaffReviewsPage (Phản hồi & kiểm duyệt đánh giá)
/staff/customers            ➔ StaffCustomersPage (Tra cứu danh bạ khách hàng)
/staff/customers/:id        ➔ StaffCustomer360Page (Hồ sơ Customer 360 chỉ đọc)
```

---

## 4. Thiết Kế Giao Diện Khung Làm Việc (StaffLayout)

### 4.1. Phong cách thiết kế (Aesthetic Direction)
* **Phong cách**: High-Density Operations Hub (Lấy cảm hứng từ Shopify Fulfillment & Shopee Seller Center).
* **Bảng màu chủ đạo**:
  * Tông nền: `#f8fafc` (Slate light).
  * Điểm nhấn thương hiệu: `#4f46e5` / `#4338ca` (Indigo chuyên nghiệp cho Vận hành).
  * Đường viền thẻ & bảng: `#e2e8f0` sắc nét, bo góc chuẩn mực 10px.
  * Typography: Inter, font chữ rõ ràng, độ tương phản cao phục vụ thao tác ca làm việc liên tục.

### 4.2. Thanh điều hướng bên trái (Staff Sider)
* **Logo**: PhoneShop kèm Badge màu Indigo nổi bật: `STAFF WORKSPACE`.
* **Danh sách Menu tinh giản 8 mục**:
  1. 📊 **Bàn làm việc (Dashboard)** (`/staff`)
  2. 📦 **Đơn hàng & Vận chuyển** (`/staff/orders`)
  3. 🏷️ **Kho hàng & Quản lý IMEI** (`/staff/inventory`)
  4. 🎧 **Hỗ trợ khách hàng** (`/staff/tickets`)
  5. 🔄 **Xử lý Đổi trả** (`/staff/returns`)
  6. 💳 **Thẩm định Trả góp** (`/staff/installments`)
  7. 💬 **Đánh giá & Phản hồi** (`/staff/reviews`)
  8. 👥 **Tra cứu Khách hàng** (`/staff/customers`)
* Chân menu hiển thị chỉ báo trạng thái ca trực: Chấm xanh lá `Hệ thống Vận hành Trực tuyến`.

### 4.3. Header Tác nghiệp (Staff Header)
* Nút thu/gọn menu bên trái.
* **Thanh tìm kiếm nhanh toàn cục (Quick Search Bar)**:
  * Ô tìm kiếm hỗ trợ gõ nhanh Mã đơn hàng (ví dụ: `ORD-...`), số IMEI thiết bị, hoặc Số điện thoại khách hàng, kèm phím tắt `Enter` để nhảy ngay tới trang tra cứu.
* Nút chuyển nhanh *"Về Storefront"* (`/`) để đối chiếu sản phẩm khi tư vấn khách.
* Huy hiệu vai trò: `NHÂN VIÊN VẬN HÀNH` (Tag màu Indigo/Blue dịu mắt).
* Avatar, Tên nhân viên và Menu tài khoản với nút Đăng xuất.

---

## 5. Thiết Kế Bàn Làm Việc Vận Hành (StaffDashboardPage)

Khác biệt hoàn toàn với `AdminDashboardPage` (vốn chứa biểu đồ tài chính, doanh thu, lợi nhuận), `StaffDashboardPage` là **Trung tâm Tác vụ Vận hành (Operations Hub)**:

### 5.1. 5 Thẻ Tác vụ Cần Xử Lý Ngay (Actionable Counter Cards)
1. **Đơn chờ xác nhận**: Đếm số lượng đơn hàng có trạng thái `PENDING`.
2. **Đơn cần đóng gói**: Đếm số lượng đơn hàng có trạng thái `CONFIRMED` hoặc `PROCESSING`.
3. **Ticket CSKH chưa phản hồi**: Đếm số lượng ticket hỗ trợ có trạng thái `OPEN`.
4. **Yêu cầu đổi trả chờ xử lý**: Đếm số lượng yêu cầu hoàn trả có trạng thái `PENDING` hoặc `APPROVED` (chờ nhận máy).
5. **Hồ sơ trả góp chờ duyệt**: Đếm số hồ sơ trả góp có trạng thái `SUBMITTED`.
*(Mỗi thẻ có màu sắc trạng thái rõ ràng, icon đại diện và khi click sẽ mở ngay trang tương ứng với bộ lọc được kích hoạt sẵn).*

### 5.2. Bảng Điều Phối Tác Nghiệp (Split Operations Workbench)
* **Cột trái (60% độ rộng) - Danh sách đơn hàng mới cần xử lý**:
  * Bảng rút gọn hiển thị các đơn hàng mới nhất: Mã đơn, Thời gian tạo, Tên & SĐT người nhận, Tổng tiền, Trạng thái đơn, Nút thao tác nhanh 1-chạm: *Xác nhận đơn* / *Chuyển đóng gói*.
* **Cột phải (40% độ rộng) - Cảnh báo Kho & CSKH khẩn**:
  * **Card Cảnh báo kho hàng thấp**: Danh sách các sản phẩm có tồn kho dưới 5 máy, kèm nút mở trang Kho hàng.
  * **Card Tin nhắn hỗ trợ mới nhất**: Top 5 ticket CSKH mới mở cần phản hồi sớm, hiển thị tiêu đề và tên khách hàng.

### 5.3. Xử lý Trạng thái Màn hình (State Coverage)
* **Loading State**: Hiển thị bộ Skeleton thẻ và bảng nhẹ nhàng, không gây giật nháy màn hình.
* **Zero-Inbox / Empty State**: Khi toàn bộ đơn hàng và ticket trong ca đã được giải quyết sạch sẽ, hiển thị hình ảnh minh họa thân thiện: *"Tuyệt vời! Không còn tác vụ nào đang tồn đọng trong ca trực của bạn"*.
* **Error State**: Nếu mất kết nối mạng hoặc lỗi tải dữ liệu, hiển thị banner thông báo kèm nút *"Thử lại"* để nhân viên chủ động tải lại dữ liệu mà không cần tải lại toàn bộ trang.

---

## 6. Rà Soát Chi Tiết Các Trang Nghiệp Vụ Của Staff

### 6.1. Trang Đơn hàng (`/staff/orders`)
* Tái sử dụng `AdminOrdersPage` nhưng đặt trong layout của Staff với breadcrumbs chuẩn `/staff/orders`.
* Cung cấp đầy đủ các nút chuyển trạng thái giao vận: Xác nhận đơn, Bắt đầu đóng gói, Nhập mã vận đơn & Giao hàng, Hoàn tất đơn, Hủy đơn.

### 6.2. Trang Kho hàng & IMEI (`/staff/inventory`)
* Hiển thị đầy đủ tab Tồn kho (`StockTab`), Lịch sử biến động (`LedgerTab`), và tab Quản lý thiết bị IMEI (`ImeiTab`).
* Giữ nguyên các chức năng: Nhập kho, Xuất kho, Điều chỉnh kiểm kê, Quét barcode IMEI, Nhập IMEI bằng file, Cập nhật trạng thái IMEI (Active, Sold, Defective).
* **Ẩn hoàn toàn**:
  * Nút xóa IMEI (Backend yêu cầu `MANAGER` / `ADMIN`).
  * Tab hoặc nút đối soát kiểm kê tài chính kho cấp cao.

### 6.3. Trang Tra cứu Khách hàng (`/staff/customers` & `/staff/customers/:id`)
* Phục vụ nhân viên tra cứu hồ sơ để hỗ trợ khách (Read-only for sensitive actions).
* Giữ nguyên: Tìm kiếm khách hàng theo Tên, SĐT, Email; Xem chi tiết Customer 360 (Lịch sử đơn hàng, Thiết bị sở hữu, Lịch sử khiếu nại).
* **Loại bỏ 100% các nút quản trị tài khoản**:
  * Ẩn nút *"Thêm người dùng mới"*.
  * Ẩn nút *"Chỉnh sửa tài khoản"*.
  * Ẩn nút *"Đổi vai trò (Change Role)"*.
  * Ẩn nút *"Khóa / Mở khóa tài khoản (Activate/Deactivate)"*.
  * Ẩn nút *"Đặt lại mật khẩu (Reset Password)"*.

### 6.4. Trang CSKH, Đổi trả, Trả góp, Đánh giá
* **Tickets (`/staff/tickets`)**: Toàn quyền nhận ticket, nhắn tin hỗ trợ khách, chuyển trạng thái và đóng ticket.
* **Returns (`/staff/returns`)**: Giữ lại các nút Duyệt tiếp nhận kiện hàng, Đánh giá tình trạng thiết bị hoàn trả. Ẩn nút chuyển khoản hoàn tiền ngân hàng (chỉ Admin/Kế toán thực hiện).
* **Installments (`/staff/installments`)**: Giữ lại các nút Thẩm định hồ sơ: Duyệt, Từ chối, Yêu cầu bổ sung tài liệu.
* **Reviews (`/staff/reviews`)**: Giữ lại nút Phản hồi đánh giá của khách hàng và Ẩn/Hiện đánh giá. Ẩn nút Xóa vĩnh viễn bài đánh giá.

---

## 7. Kế Hoạch Kiểm Thử & Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. **Routing & Phân quyền**:
   * Đăng nhập bằng tài khoản `STAFF` ➔ Chuyển hướng chính xác vào `/staff`.
   * Truy cập bằng tay `/admin` khi đang đăng nhập `STAFF` ➔ Bị chặn và tự động đưa về `/staff`.
   * Đăng nhập bằng tài khoản `ADMIN` ➔ Vẫn vào `/admin` bình thường và có thể truy cập `/staff` nếu muốn.
2. **Dashboard Vận hành**:
   * Trang `/staff` tải dữ liệu trơn tru từ các API đơn hàng, kho và ticket.
   * Hoàn toàn không còn gọi API `/reports/...`, triệt tiêu 100% lỗi 403 Forbidden.
   * 5 thẻ đếm tác vụ hiển thị đúng số liệu thực tế; bấm vào thẻ chuyển hướng đến trang tương ứng với bộ lọc chính xác.
3. **Thanh Menu & Giao diện Staff**:
   * Sidebar của Staff chỉ hiển thị đúng 8 mục nghiệp vụ. Không còn xuất hiện Cấu hình hệ thống, Quản lý tài khoản, Báo cáo doanh thu,...
   * Giao diện có nhận diện `STAFF WORKSPACE`, thanh Quick Search hoạt động tốt.
4. **Không còn nút vượt quyền**:
   * Các trang khách hàng, IMEI, kho hàng không còn hiển thị các nút Xóa, Khóa tài khoản, hay Đổi mật khẩu.
5. **Kiểm thử tự động**:
   * Cập nhật và bổ sung các bài unit test trong frontend (`AppRoutes`, `StaffRoute`, `StaffDashboardPage`) đảm bảo toàn bộ bộ test chạy đạt 100% không có lỗi hồi quy (regression).
