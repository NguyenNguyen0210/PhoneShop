# Thiết Kế Chi Tiết Tính Năng Đánh Giá Sản Phẩm (Product Reviews Feature Design)

- **Ngày tạo**: 2026-10-03
- **Trạng thái**: Đã phê duyệt (Approved)
- **Mục tiêu**: Hoàn thiện toàn diện tính năng đánh giá sản phẩm (Viết đánh giá, Chấm điểm sao tương tác, Upload ảnh đính kèm, Chỉnh sửa và Xóa đánh giá) trên cả Backend và Frontend Storefront.

---

## 1. Bối cảnh & Hiện trạng

- **Backend hiện có**:
  - `POST /reviews`: Tạo đánh giá mới, đã có ràng buộc chỉ tài khoản có đơn hàng `DELIVERED` hoặc `COMPLETED` chứa sản phẩm đó mới được review. Mặc định gán `status = PENDING`, `isVerified = true`.
  - `PATCH /reviews/:id`: Chỉnh sửa đánh giá của chính người dùng, tự động chuyển về `status = PENDING`.
  - `DELETE /reviews/:id`: Xóa đánh giá của chính người dùng (hoặc admin).
  - `GET /reviews?productId=...`: Lấy danh sách review đã duyệt (`status = APPROVED`).
- **Khoảng trống cần hoàn thiện**:
  - **Prisma Schema & DTO**: Chưa có trường lưu trữ danh sách ảnh đính kèm (`images`).
  - **Storage API**: Upload ảnh hiện chỉ cấp quyền cho Admin/Staff (`products`, `brands`, `categories`), chưa có endpoint cho người dùng thông thường upload ảnh đánh giá sản phẩm.
  - **Backend API**: Chưa có endpoint cho người dùng kiểm tra trạng thái điều kiện đánh giá (`canReview`, bài đánh giá hiện tại của chính mình).
  - **Frontend UI/UX**:
    - Chưa có form/modal viết bài đánh giá.
    - Chưa có component chấm điểm sao tương tác (interactive star rating 1-5 sao).
    - Chưa có component upload và xem trước ảnh đính kèm.
    - Chưa có giao diện chỉnh sửa / xóa đánh giá.
    - Chưa có nút đánh giá trong trang Chi tiết đơn hàng (`OrderDetailPage.tsx`) và trang Chi tiết sản phẩm (`ProductDetailPage.tsx` / `ProductHighlightsSection.tsx`).

---

## 2. Kiến trúc & Thiết kế Chi tiết Backend

### 2.1 CSDL Prisma Schema (`backend/prisma/schema.prisma`)
Cập nhật model `Review`:
```prisma
model Review {
  id         String       @id @default(uuid()) @db.Uuid
  userId     String       @map("user_id") @db.Uuid
  productId  String       @map("product_id") @db.Uuid
  rating     Int
  title      String?      @db.VarChar(255)
  content    String?      @db.Text
  images     String[]     @default([]) @map("images") // Mảng URLs tối đa 5 ảnh đính kèm
  status     ReviewStatus @default(PENDING)
  isVerified Boolean      @default(false) @map("is_verified")
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @updatedAt @map("updated_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  replies ReviewReply[]

  @@unique([userId, productId])
  @@index([productId])
  @@index([status])
  @@map("reviews")
}
```

### 2.2 DTOs (`backend/src/modules/reviews/dto/review.dto.ts`)
- **`CreateReviewDto`**:
  - `productId`: `@IsUUID()` (Bắt buộc)
  - `rating`: `@IsInt()`, `@Min(1)`, `@Max(5)` (Bắt buộc)
  - `title`: `@IsOptional()`, `@IsString()`, tối đa 255 ký tự
  - `content`: `@IsOptional()`, `@IsString()`, tối đa 2000 ký tự
  - `images`: `@IsOptional()`, `@IsArray()`, `@IsString({ each: true })`, `@ArrayMaxSize(5)`
- **`UpdateReviewDto`**:
  - `rating`: `@IsOptional()`, `@IsInt()`, `@Min(1)`, `@Max(5)`
  - `title`: `@IsOptional()`, `@IsString()`
  - `content`: `@IsOptional()`, `@IsString()`
  - `images`: `@IsOptional()`, `@IsArray()`, `@IsString({ each: true })`, `@ArrayMaxSize(5)`

### 2.3 Storage Controller (`backend/src/infrastructure/storage/storage.controller.ts`)
- Thêm endpoint `POST /storage/upload-review-images`:
  - `@UseGuards(JwtAuthGuard)`: Xác thực người dùng đăng nhập.
  - `@UseInterceptors(FilesInterceptor('files', 5))`: Nhận tối đa 5 files.
  - Validation: Kích thước tối đa 5MB/file, định dạng file `jpg|jpeg|png|webp`.
  - Tối ưu và nén ảnh sang định dạng WebP qua Sharp, upload lên folder `reviews/`.
  - Trả về: `Promise<UploadResult[]>`.

### 2.4 Reviews Service & Controller
- Thêm endpoint `GET /reviews/product/:productId/my-review`:
  - Guard: `@UseGuards(JwtAuthGuard)`.
  - Logic:
    1. Kiểm tra đơn hàng của `userId` chứa `variant` thuộc `productId` với trạng thái thuộc `[DELIVERED, COMPLETED]`.
    2. Lấy review hiện có của `userId` cho `productId` (nếu có, không phân biệt trạng thái PENDING/APPROVED).
    3. Trả về response:
       ```json
       {
         "hasPurchased": boolean,
         "canReview": boolean,
         "myReview": Review | null
       }
       ```
- Cập nhật `create`: Hỗ trợ lưu trường `images` (mảng string URLs).
- Cập nhật `update`: Hỗ trợ cập nhật trường `images`, tự động chuyển trạng thái `status = ReviewStatus.PENDING`.
- Cập nhật `findAll` & `findOne`: Include trường `images` trong kết quả trả về.

---

## 3. Kiến trúc & Thiết kế Chi tiết Frontend

### 3.1 Dịch vụ API Frontend (`frontend/src/services/reviewService.ts`)
Tạo mới file `reviewService.ts` tương tác với backend:
- `getMyReviewStatus(productId: string): Promise<{ hasPurchased: boolean; canReview: boolean; myReview: Review | null }>`
- `createReview(data: { productId: string; rating: number; title?: string; content?: string; images?: string[] }): Promise<Review>`
- `updateReview(id: string, data: { rating?: number; title?: string; content?: string; images?: string[] }): Promise<Review>`
- `deleteReview(id: string): Promise<void>`
- `uploadReviewImages(files: File[]): Promise<string[]>`

Cập nhật TypeScript interface trong `frontend/src/types/index.ts`:
- Bổ sung `images?: string[];` và `status?: 'PENDING' | 'APPROVED' | 'REJECTED';` vào `interface Review`.

### 3.2 Các Components Frontend Mới

#### 1. `StarRatingInput.tsx` (`frontend/src/components/storefront/reviews/StarRatingInput.tsx`)
- Props: `value: number`, `onChange: (val: number) => void`, `readonly?: boolean`.
- Tính năng:
  - Hover chuyển màu sao tức thời (`hoverRating`).
  - Click chọn số sao từ 1 đến 5 sao.
  - Hiển thị nhãn cảm xúc bên cạnh (*1 sao: Rất tệ, 2 sao: Không hài lòng, 3 sao: Bình thường, 4 sao: Hài lòng, 5 sao: Tuyệt vời*).
  - Hỗ trợ keyboard accessibility (`tabIndex`, phím mũi tên).

#### 2. `ReviewImageUploader.tsx` (`frontend/src/components/storefront/reviews/ReviewImageUploader.tsx`)
- Props: `images: string[]`, `onChange: (urls: string[]) => void`, `maxCount?: number` (mặc định 5).
- Tính năng:
  - Chọn nhiều ảnh đồng thời, kiểm tra kích thước (< 5MB) và định dạng.
  - Tự động gọi `reviewService.uploadReviewImages` khi người dùng chọn file, hiển thị trạng thái loading spinner trên từng thumbnail.
  - Nút xóa ảnh thumbnail (`X`) linh hoạt.
  - Xem trước ảnh phóng to (Preview Lightbox).

#### 3. `ReviewModal.tsx` (`frontend/src/components/storefront/reviews/ReviewModal.tsx`)
- Props:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `productId: string`
  - `productName: string`
  - `productImage?: string`
  - `initialData?: Review | null` (nếu đang ở chế độ chỉnh sửa)
  - `onSuccess: () => void`
- Tính năng:
  - Tiêu đề động: *"Đánh giá sản phẩm"* hoặc *"Chỉnh sửa đánh giá"*.
  - Render thông tin sản phẩm (ảnh thumbnail nhỏ + tên sản phẩm).
  - Tích hợp `StarRatingInput` (bắt buộc chọn rating >= 1).
  - Input Tiêu đề đánh giá (tùy chọn).
  - Textarea Nội dung nhận xét (có đếm số ký tự, placeholder hướng dẫn cụ thể).
  - Tích hợp `ReviewImageUploader` (tối đa 5 ảnh).
  - Xử lý submit: disable nút bấm khi đang lưu, hiển thị toast thông báo thành công và tự động đóng modal.

#### 4. `ReviewDeleteDialog.tsx` (`frontend/src/components/storefront/reviews/ReviewDeleteDialog.tsx`)
- Dialog xác nhận khi người dùng bấm nút xóa bài đánh giá của chính mình: *"Bạn có chắc chắn muốn xóa bài đánh giá này không? Thao tác này không thể hoàn tác."*.
- Nút *"Hủy"* và nút *"Xóa đánh giá"* (màu đỏ nguy hiểm, có loading state).

### 3.3 Tích hợp trên các trang Storefront

#### 1. Trang Chi tiết sản phẩm (`ProductHighlightsSection.tsx` & `ProductDetailPage.tsx`)
- Khi trang tải: nếu người dùng đã đăng nhập, gọi `getMyReviewStatus(productId)`.
- **Hộp tổng quan đánh giá**:
  - Nếu `canReview === true`: Hiển thị nút *"Viết đánh giá"* nổi bật (màu xanh/đen thương hiệu).
  - Nếu chưa đăng nhập: Hiển thị tooltip hoặc nút *"Đăng nhập để đánh giá"*.
  - Nếu chưa mua hàng: Không hiển thị nút viết đánh giá.
- **Danh sách đánh giá**:
  - Nếu user đã có bài đánh giá (`myReview`): Ghim bài đánh giá của chính user lên đầu danh sách.
  - Hiển thị badge trạng thái cho bài đánh giá của user:
    - `PENDING`: Badge vàng hổ phách *"Đang chờ quản trị viên duyệt"*.
    - `APPROVED`: Badge xanh lá *"Đã duyệt"*.
  - Cung cấp nút menu hành động: **Chỉnh sửa** (mở `ReviewModal` với `initialData`) và **Xóa** (mở `ReviewDeleteDialog`).
  - Với mỗi bài đánh giá có ảnh: hiển thị danh sách ảnh thumbnail bo góc đẹp mắt, người dùng bấm vào để xem ảnh kích thước đầy đủ trong Lightbox.

#### 2. Trang Chi tiết đơn hàng (`OrderDetailPage.tsx`)
- Với các đơn hàng có trạng thái `DELIVERED` hoặc `COMPLETED`:
  - Trong bảng sản phẩm đã mua, thêm cột hoặc nút hành động bên dưới mỗi món hàng:
    - Nếu món hàng đó user chưa đánh giá: Nút *"Đánh giá sản phẩm"*.
    - Nếu đã đánh giá: Nút *"Xem / Sửa đánh giá"*.
  - Khi bấm nút: mở `ReviewModal` tương ứng với sản phẩm đó. Sau khi gửi thành công, cập nhật ngay trạng thái nút mà không cần tải lại trang.

---

## 4. Xử lý Lỗi & Trạng thái Biên (Edge Cases & Error Handling)

1. **Khách hàng đánh giá trùng lặp**:
   - Backend đã có `@unique([userId, productId])` và kiểm tra `existing` ném lỗi `ConflictException`.
   - Frontend đã kiểm tra trước qua `canReview` và `myReview`.
2. **Khách hàng chưa nhận hàng thành công cố tình gửi đánh giá**:
   - Backend chặn bằng `ForbiddenException('Only customers with a delivered order can review this product')`.
   - Frontend hiển thị thông báo lỗi rõ ràng qua toast/alert.
3. **Upload ảnh lỗi / mất kết nối**:
   - Nếu upload ảnh thất bại, chỉ báo lỗi cho cụm ảnh, không làm mất nội dung văn bản người dùng đang gõ.
   - Giới hạn kích thước file <= 5MB và kiểm tra mime-type hợp lệ ở cả client và server.
4. **Trạng thái PENDING sau khi sửa**:
   - Khi chỉnh sửa đánh giá, backend chuyển status về `PENDING`.
   - Khách hàng vẫn nhìn thấy bài đánh giá của mình với badge *"Đang chờ duyệt"*, trong khi khách vãng lai chỉ nhìn thấy phiên bản hợp lệ đã duyệt (hoặc ẩn cho đến khi admin duyệt lại).

---

## 5. Kế hoạch Kiểm thử & Xác nhận (Testing & Verification)

1. **Unit / Integration Tests Backend**:
   - Kiểm tra DTO validation (rating ngoài 1-5, images > 5 ảnh, images sai URL).
   - Kiểm tra `POST /storage/upload-review-images`: từ chối người dùng chưa login, chấp nhận user bình thường, giới hạn file.
   - Kiểm tra `GET /reviews/product/:productId/my-review`: trả về đúng `canReview` và `myReview` tùy theo trạng thái đơn hàng và review đã có.
   - Kiểm tra `POST /reviews`, `PATCH /reviews/:id`, `DELETE /reviews/:id`.
2. **Frontend UI Tests**:
   - Component `StarRatingInput`: chọn sao, hover phản hồi chính xác.
   - Component `ReviewImageUploader`: upload ảnh, preview thumbnail, xóa ảnh.
   - Luồng Viết review trên PDP và trong OrderDetailPage.
   - Luồng Chỉnh sửa review và Xóa review.
