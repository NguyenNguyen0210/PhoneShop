# Design Specification: User Management System (Quản lý Người dùng)

**Ngày tạo:** 2026-10-04  
**Trạng thái:** Approved by User  
**Tác giả:** Antigravity Engineering  
**Mục tiêu:** Hoàn thiện toàn diện chức năng Quản lý Người dùng (User Management) cả Backend lẫn Frontend Admin Portal, bao gồm tìm kiếm thông minh, phân quyền tài khoản, khóa/mở tài khoản an toàn, reset mật khẩu tự động thu hồi session, xem lịch sử nhật ký hoạt động (Audit Logs), và ngăn chặn tự khóa tài khoản Admin.

---

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

### 1.1. Hiện trạng
* **Backend:**
  * Endpoint `GET /users` đã tồn tại nhưng cần tối ưu hóa tìm kiếm tên đầy đủ đa từ, phân trang chuẩn và xử lý an toàn quyền hạn.
  * Endpoint `POST /users` cho phép tạo tài khoản với role (USER, STAFF, MANAGER, ADMIN).
  * Endpoint `PATCH /users/:id` cho phép cập nhật thông tin cá nhân, vai trò và mật khẩu. Tuy nhiên, khi đặt lại mật khẩu hoặc đổi trạng thái khóa tài khoản (`INACTIVE` / `BANNED`), hệ thống chưa tự động thu hồi các `refreshToken` đang hoạt động của người dùng đó.
  * Chưa có logic ngăn chặn tài khoản Admin tự hạ quyền `ADMIN` hoặc tự khóa tài khoản của chính mình (Self-lockout risk).
  * Các thao tác can thiệp quản trị tài khoản nhạy cảm (Tạo user, đổi quyền, reset pass, khóa/mở) chưa ghi log tường minh vào bảng `audit_logs`.
* **Frontend:**
  * Trên Admin Portal (`AdminSidebar.tsx` và `AppRoutes.tsx`), hoàn toàn chưa có trang `/admin/users`.
  * Khách hàng hiện đang có trang riêng `/admin/customers` cho mục đích Customer 360, nhưng chưa có trang quản lý tổng thể tất cả các tài khoản hệ thống (Admin, Manager, Staff, Customer).

### 1.2. Mục tiêu đạt được
1. **Hoàn thiện Backend:**
   * Tối ưu tìm kiếm `GET /users` hỗ trợ tìm theo Email, Số điện thoại, và Họ tên (kể cả ghép họ và tên).
   * Cải tiến `PATCH /users/:id` và các API đổi trạng thái (`activate`, `deactivate`, `ban`) để tự động thu hồi toàn bộ token đăng nhập cũ (Revoke Refresh Tokens).
   * Áp dụng quy tắc an toàn (Self-Lockout Prevention): Không cho phép Admin tự hạ quyền hoặc tự khóa chính mình.
   * Ghi nhận đầy đủ Audit Logs cho mọi thao tác quản trị tài khoản người dùng.
2. **Xây dựng Giao diện Frontend Admin Portal:**
   * Thêm mục "Quản lý Người dùng" vào thanh điều hướng `AdminSidebar.tsx` và cấu hình bảo vệ route nghiêm ngặt cho `Role.ADMIN` trong `AppRoutes.tsx`.
   * Trang quản trị `/admin/users` chuyên nghiệp với:
     * KPI Thống kê (Tổng users, Đang hoạt động, Bị khóa/Cấm, Nhân sự nội bộ).
     * Thanh công cụ tìm kiếm và lọc đa chiều (Search keyword debounce, lọc Role, lọc Status).
     * Bảng danh sách người dùng với Avatar, thông tin cá nhân, Tag vai trò phân màu, Badge trạng thái.
     * Modal Tạo người dùng mới có tính năng sinh mật khẩu ngẫu nhiên + sao chép thông tin.
     * Modal Sửa thông tin & Modal Đổi vai trò (Change Role).
     * Modal Reset Mật khẩu kèm thông báo hủy session trên thiết bị khác.
     * Thao tác Khóa / Mở khóa an toàn (vô hiệu hóa đối với chính tài khoản đang đăng nhập).
     * Drawer trượt bên phải hiển thị Timeline Nhật ký hoạt động (Audit Logs) của từng người dùng.

---

## 2. Kiến trúc & Chi tiết Kỹ thuật Backend (Backend Specification)

### 2.1. Cải tiến API `GET /users` (Search & Filtering)
* **Quyền hạn truy cập:** `@Roles(Role.ADMIN)` (Khi gọi để quản lý toàn bộ hệ thống).
* **Query Parameters (`QueryUserDto`):**
  * `search?: string` (Email, Phone, Họ tên).
  * `role?: string` (`ADMIN`, `MANAGER`, `STAFF`, `USER`).
  * `status?: UserStatus` (`ACTIVE`, `INACTIVE`, `BANNED`).
  * `page?: number` (Mặc định 1).
  * `limit?: number` (Mặc định 10).
* **Logic xử lý tìm kiếm:**
  * Chuẩn hóa từ khóa tìm kiếm: Nếu `search` có nhiều từ (ví dụ "Nguyễn Văn A"), tách các token và kiểm tra sự xuất hiện trong `firstName`, `lastName`, `email`, hoặc `phone`.
  * Lọc theo quan hệ bảng `user_roles` nếu truyền `role`.
  * Loại bỏ `passwordHash` trong toàn bộ kết quả trả về.
* **Định dạng kết quả trả về:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "phone": "string",
        "status": "ACTIVE | INACTIVE | BANNED",
        "avatarUrl": "string | null",
        "roles": [{ "role": { "name": "ADMIN" } }],
        "createdAt": "ISOString",
        "updatedAt": "ISOString"
      }
    ],
    "total": 120,
    "page": 1,
    "limit": 10,
    "totalPages": 12
  }
  ```

### 2.2. Cải tiến API `PATCH /users/:id` & Thu hồi Session
* **Đặt lại mật khẩu (Reset Password):**
  * Khi `dto.password` được truyền:
    * Kiểm tra độ dài mật khẩu tối thiểu (>= 6 ký tự).
    * Băm mật khẩu bằng `bcrypt.hash(dto.password, 10)`.
    * Cập nhật `passwordHash`.
    * **Bảo mật quan trọng:** Thực thi câu lệnh thu hồi token:
      ```typescript
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      ```
* **Thay đổi Vai trò (Change Role):**
  * Khi `dto.roles` được truyền:
    * Kiểm tra: Nếu user mục tiêu là chính Admin đang thực hiện (`id === currentUser.id`), và mảng `roles` mới không chứa `'ADMIN'`, ném lỗi `BadRequestException('Không thể tự hạ quyền ADMIN của chính mình')`.
    * Xóa mapping cũ trong `user_roles` và liên kết vai trò mới.
* **Cập nhật Trạng thái (Status):**
  * Nếu cập nhật `status = INACTIVE` hoặc `BANNED` cho chính mình (`id === currentUser.id`), ném lỗi `BadRequestException('Không thể tự khóa tài khoản của chính mình')`.
  * Nếu đổi trạng thái sang `INACTIVE` hoặc `BANNED`, tự động thu hồi toàn bộ `refreshToken` còn hiệu lực.

### 2.3. Cải tiến API Khóa / Mở khóa (`PUT /users/:id/activate`, `deactivate`, `ban`)
* Thêm kiểm tra `currentUser`:
  * Nếu `id === currentUser.id` trong `deactivateUser` hoặc `banUser`, ném `BadRequestException('Không thể tự khóa tài khoản của chính mình')`.
* Khi `deactivate` hoặc `ban` thành công, thu hồi tất cả `refreshToken` còn hiệu lực của user mục tiêu.

### 2.4. Ghi nhận Audit Log (Audit Logging)
* Tự động ghi bản ghi vào bảng `audit_logs`:
  * `action`: `CREATE` / `UPDATE` / `DELETE` / `STATUS_CHANGE`
  * `entity`: `'User'`
  * `entityId`: ID của user mục tiêu
  * `userId`: ID của Admin thực hiện
  * `newData`: Tóm tắt các trường đã thay đổi (loại bỏ mật khẩu thô và hash)

---

## 3. Kiến trúc & Chi tiết Kỹ thuật Frontend (Frontend Specification)

### 3.1. Routing & Phân quyền
* **Sidebar (`AdminSidebar.tsx`):**
  * Bổ sung mục menu:
    ```typescript
    {
      key: '/admin/users',
      icon: <TeamOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Người dùng',
    }
    ```
* **Routes (`AppRoutes.tsx`):**
  * Đăng ký route:
    ```tsx
    <Route
      path="/admin/users"
      element={
        <RoleGuard allowedRoles={[ROLES.ADMIN]}>
          <AdminUsersPage />
        </RoleGuard>
      }
    />
    ```

### 3.2. Dịch vụ API `userService.ts`
* Vị trí: `frontend/src/services/userService.ts`
* Các hàm chức năng:
  * `getUsers(params: UserFilterParams)`: Gọi `GET /users`
  * `getUserById(id: string)`: Gọi `GET /users/:id`
  * `createUser(payload: CreateUserPayload)`: Gọi `POST /users`
  * `updateUser(id: string, payload: UpdateUserPayload)`: Gọi `PATCH /users/:id`
  * `changeRole(id: string, roles: string[])`: Gọi `PATCH /users/:id` với body `{ roles }`
  * `resetPassword(id: string, password: string)`: Gọi `PATCH /users/:id` với body `{ password }`
  * `activateUser(id: string)`: Gọi `PUT /users/:id/activate`
  * `deactivateUser(id: string)`: Gọi `PUT /users/:id/deactivate`
  * `banUser(id: string)`: Gọi `PUT /users/:id/ban`
  * `getAuditLogs(userId: string)`: Gọi `GET /audit-logs?userId=:userId`

### 3.3. Cấu trúc Giao diện `AdminUsersPage.tsx`
* **Phong cách giao diện:** Enterprise SaaS Admin, tông màu xanh navy / trắng hiện đại, đồng bộ thiết kế với hệ thống Admin hiện có.
* **Khối Thống kê (KPI Cards):**
  1. *Tổng người dùng:* Tổng số tài khoản trên hệ thống.
  2. *Đang hoạt động (Active):* Số tài khoản hoạt động bình thường.
  3. *Bị khóa / Cấm:* Số tài khoản bị vô hiệu hóa hoặc cấm.
  4. *Quản trị & Nhân sự:* Số lượng tài khoản thuộc nhóm nội bộ (ADMIN, MANAGER, STAFF).
* **Thanh công cụ Tìm kiếm & Lọc:**
  * Ô tìm kiếm hỗ trợ debounce 300ms.
  * Bộ lọc Role: Tất cả, ADMIN, MANAGER, STAFF, USER.
  * Bộ lọc Status: Tất cả, ACTIVE, INACTIVE, BANNED.
  * Nút "Làm mới dữ liệu" và nút "+ Thêm người dùng mới" nổi bật.
* **Bảng dữ liệu Người dùng:**
  * *Họ tên & Avatar:* Avatar chữ cái đầu hoặc ảnh đại diện, hiển thị Họ & Tên.
  * *Liên hệ:* Email và Số điện thoại.
  * *Vai trò:* Tag Ant Design phân màu rõ nét:
    * `ADMIN`: Đỏ mận (`volcano` / `red`)
    * `MANAGER`: Tím (`purple`)
    * `STAFF`: Xanh dương (`blue` / `geekblue`)
    * `USER`: Mặc định (`default`)
  * *Trạng thái:* Tag hiển thị:
    * `ACTIVE`: Xanh lá (`success`)
    * `INACTIVE`: Cam (`warning`)
    * `BANNED`: Đỏ (`error`)
  * *Ngày tạo:* Format định dạng ngày giờ Việt Nam.
  * *Cột Thao tác (Action Menu):*
    * Nút Sửa thông tin.
    * Nút Đổi vai trò (Change Role).
    * Nút Đặt lại mật khẩu (Reset Password).
    * Nút Xem lịch sử hoạt động (Audit Logs).
    * Nút Khóa / Mở khóa tài khoản (có `Popconfirm` xác nhận). Vô hiệu hóa (disabled) nếu là tài khoản của chính Admin đang thao tác kèm tooltip giải thích.

### 3.4. Các Modals & Drawers Tương tác
1. **Modal Tạo người dùng (`CreateUserModal`):**
   * Trường nhập: Email (bắt buộc), Họ & Tên (bắt buộc), Số điện thoại, Vai trò (USER, STAFF, MANAGER, ADMIN), Trạng thái (ACTIVE mặc định).
   * Mật khẩu: Có thể tự nhập hoặc bấm nút **"🎲 Tạo mật khẩu ngẫu nhiên"** sinh mật khẩu chuẩn 10 ký tự gồm chữ hoa, chữ thường và số.
   * Sau khi tạo thành công: Hiển thị Modal thông báo kết quả gồm Email & Mật khẩu cùng nút **"📋 Sao chép thông tin"** để tiện gửi người dùng.
2. **Modal Chỉnh sửa thông tin (`EditUserModal`):**
   * Cho phép cập nhật Họ, Tên, Số điện thoại.
3. **Modal Đổi vai trò (`ChangeRoleModal`):**
   * Chọn vai trò từ Select dropdown.
   * Cảnh báo khi gán quyền `ADMIN` cho tài khoản.
4. **Modal Đặt lại mật khẩu (`ResetPasswordModal`):**
   * Hỗ trợ nút sinh mật khẩu ngẫu nhiên.
   * Cảnh báo thu hồi toàn bộ phiên đăng nhập cũ trên thiết bị khác.
5. **Drawer Nhật ký hoạt động (`UserAuditLogsDrawer`):**
   * Drawer độ rộng 520px mở từ cạnh phải.
   * Hiển thị Timeline các hoạt động tương ứng với `userId`:
     * Thời gian diễn ra sự kiện.
     * Loại hành động (Tag màu).
     * Thực hiện bởi ai.
     * Chi tiết dữ liệu thay đổi.
     * Phân trang nếu nhật ký có nhiều bản ghi.

---

## 4. Xử lý Trạng thái & Ngoại lệ (State Coverage & Error Handling)

| Tình huống | Trải nghiệm UI / Xử lý Backend |
|------------|--------------------------------|
| **Không có kết quả tìm kiếm (Empty State)** | Hiển thị component `Empty` với mô tả "Không tìm thấy người dùng phù hợp" và nút "Đặt lại bộ lọc". |
| **Đang tải dữ liệu (Loading State)** | Bảng dữ liệu hiển thị Ant Design `Table.loading`, nút thao tác hiển thị `Button.loading`. |
| **Email hoặc Số điện thoại trùng lặp khi tạo** | Backend trả về `ConflictException` (409), Frontend hiển thị notification lỗi rõ ràng: "Email hoặc số điện thoại đã tồn tại trong hệ thống". |
| **Admin tự hạ quyền hoặc tự khóa chính mình** | Backend chặn với `BadRequestException` (400), trên Frontend nút thao tác bị disabled với tooltip cảnh báo an toàn. |
| **Đổi mật khẩu thành công** | Hiển thị modal sao chép mật khẩu, đồng thời token cũ của user bị thu hồi ngay lập tức. |

---

## 5. Chiến lược Kiểm thử & Xác minh (Verification Strategy)

1. **Unit & Integration Tests (Backend):**
   * Viết test kiểm tra tìm kiếm `GET /users` với từ khóa đa từ và các bộ lọc `role`, `status`.
   * Viết test kiểm tra `PATCH /users/:id` khi truyền password sẽ hash bcrypt và cập nhật `revokedAt` trong bảng `refresh_tokens`.
   * Viết test kiểm tra quy tắc Self-Lockout: Admin tự hạ quyền hoặc tự khóa tài khoản của mình sẽ bị từ chối với mã lỗi 400.
   * Viết test kiểm tra ghi nhận Audit Log khi thực hiện thao tác quản trị.
2. **Component Tests (Frontend):**
   * Kiểm tra render của `AdminUsersPage`: các KPI cards, bảng danh sách người dùng, các bộ lọc.
   * Kiểm tra mở các Modals (Tạo user, Sửa, Đổi role, Reset pass) và Drawer Audit Logs.
   * Kiểm tra hành vi disabled khi thao tác trên chính tài khoản Admin hiện tại.
3. **End-to-End Verification:**
   * Khởi chạy kiểm thử toàn trình quy trình: Tạo tài khoản ➔ Đổi quyền ➔ Khóa/Mở ➔ Đổi pass ➔ Kiểm tra xem Audit Log trong Drawer.
