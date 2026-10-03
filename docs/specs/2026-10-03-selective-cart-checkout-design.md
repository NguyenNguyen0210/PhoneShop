# Đặc tả Thiết kế: Chọn sản phẩm Checkout (Selective Cart Checkout)

* **Ngày lập:** 2026-10-03
* **Trạng thái:** Đã phê duyệt (Approved)
* **Mô hình tham chiếu:** Shopee / Tiki / Lazada E-Commerce Checkout

---

## 1. Bối cảnh & Mục tiêu (Context & Goals)

### 1.1. Hiện trạng
Hệ thống MobileCommerce hiện tại mặc định checkout toàn bộ các sản phẩm đang có trong giỏ hàng. Khi người dùng bấm "Tiến hành đặt hàng", tất cả các sản phẩm trong giỏ đều được gửi đi thanh toán và sau khi đặt hàng thành công, giỏ hàng sẽ bị xóa sạch toàn bộ (`deleteMany({ where: { cartId: cart.id } })`).

### 1.2. Vấn đề của người dùng
* Khách hàng thường lưu nhiều thiết bị/phụ kiện vào giỏ hàng để so sánh hoặc theo dõi giá nhưng chưa muốn mua tất cả trong một lần đặt hàng.
* Chưa có checkbox để tick chọn riêng từng món đi thanh toán.
* Nếu muốn mua một sản phẩm đơn lẻ, người dùng buộc phải xóa các sản phẩm khác ra khỏi giỏ, làm giảm trải nghiệm mua sắm và tỷ lệ chuyển đổi.

### 1.3. Mục tiêu (Goals)
* Cho phép người dùng tick chọn riêng từng món hoặc chọn tất cả các món trong giỏ hàng để mang đi thanh toán.
* Mặc định khi vào giỏ hàng: **Không chọn sản phẩm nào** (Option B được phê duyệt); người dùng phải chủ động tick chọn ít nhất 1 sản phẩm để kích hoạt nút thanh toán.
* Bổ sung thao tác hàng loạt: "Chọn tất cả" (Select All) và "Xóa mục đã chọn" (Bulk Delete Selected Items).
* Tính toán tạm tính, phí vận chuyển và mã giảm giá Voucher **chỉ dựa trên các sản phẩm được chọn**.
* Đảm bảo tính toàn vẹn giao dịch: Khi thanh toán thành công, database chỉ xóa các sản phẩm đã được mua, các sản phẩm chưa tick chọn vẫn được lưu nguyên vẹn trong giỏ hàng của người dùng.
* Tối ưu hiệu năng: Không sửa đổi cấu trúc bảng cơ sở dữ liệu (không cần DB migration), trạng thái tick chọn được quản lý tức thì (zero-latency) ở Client store và được xác thực an toàn tuyệt đối tại Backend Transaction.

### 1.4. Ngoài phạm vi (Non-goals)
* Không triển khai tách đơn hàng theo nhiều nhà bán hàng khác nhau (hệ thống hiện tại là mô hình đơn người bán - Single Storefront).
* Không lưu trạng thái tick chọn vào database qua các request PATCH trung gian.

---

## 2. Luồng trải nghiệm người dùng (UX & User Flows)

### 2.1. Màn hình Giỏ hàng chi tiết (`/cart` - `CartPage.tsx`)
1. **Trạng thái mặc định khi mở trang:**
   * Tất cả checkbox của các sản phẩm đang để trống (unselected).
   * Checkbox "Chọn tất cả" ở thanh công cụ đầu bảng ở trạng thái chưa tick.
   * Tạm tính hiển thị `0₫ (0 sản phẩm đã chọn)`.
   * Nút CTA "Tiến hành đặt hàng" chuyển sang trạng thái disabled (màu xám mờ, `cursor-not-allowed`) với nhãn *"Vui lòng chọn sản phẩm (0)"*.
2. **Thao tác chọn từng sản phẩm:**
   * Mỗi dòng sản phẩm có một checkbox bo góc (18–20px) đặt ở vị trí đầu dòng, bên trái ảnh sản phẩm.
   * Khi người dùng click chọn một sản phẩm:
     * Checkbox hiển thị trạng thái đã chọn. Dòng sản phẩm được highlight viền xanh nhạt.
     * Cột tóm tắt cập nhật tức thì: Tạm tính, Phí vận chuyển (miễn phí nếu tạm tính > 500.000₫), Voucher giảm giá tương ứng.
     * Nút CTA chuyển sang trạng thái kích hoạt (màu xanh gradient) với nhãn *"TIẾN HÀNH ĐẶT HÀNG (k thiết bị)"*.
3. **Thao tác "Chọn tất cả" (Select All):**
   * Nằm ở thanh tiêu đề danh sách: `[Checkbox] Chọn tất cả (N sản phẩm)`.
   * Click vào checkbox này sẽ tick chọn toàn bộ `N` sản phẩm trong giỏ.
   * Nếu đã chọn tất cả mà người dùng bỏ tick 1 sản phẩm bất kỳ, checkbox "Chọn tất cả" sẽ tự động bỏ tick.
4. **Thao tác "Xóa mục đã chọn" (Bulk Delete):**
   * Nằm cạnh nút "Xóa giỏ hàng", chỉ hiển thị nổi bật khi có `k > 0` món đang được tick chọn: *"Xóa mục đã chọn (k)"*.
   * Khi click, hiển thị hộp thoại / thanh thông báo xác nhận: *"Bạn có chắc chắn muốn xóa k sản phẩm đã chọn khỏi giỏ hàng?"*.
   * Khi xác nhận: Gọi action xóa các món đã chọn khỏi store và gọi API backend `DELETE /cart/items/bulk` để xóa đồng loạt trong database.
5. **Cơ chế áp dụng Voucher:**
   * Điều kiện đơn hàng tối thiểu (`minOrderValue`) và số tiền giảm giá của Voucher được tính dựa trên `selectedSubtotal`.
   * Nếu người dùng bỏ tick sản phẩm khiến `selectedSubtotal` giảm xuống dưới ngưỡng `minOrderValue`, hệ thống hiển thị thông báo lỗi và không tính giảm giá.

### 2.2. Giỏ hàng trượt (`CartDrawer.tsx`)
* Giữ giao diện Drawer gọn gàng, không nhồi nhét checkbox vào khung hẹp trên mobile.
* Khi người dùng click nút *"Thanh toán"* trên `CartDrawer`, hệ thống đóng Drawer và điều hướng mượt mà về trang `/cart` để người dùng kiểm tra thông tin và tick chọn các món cần mua.

### 2.3. Màn hình Đặt hàng & Thanh toán (`/checkout` - `CheckoutPage.tsx`)
1. **Bảo vệ luồng (Route Guard):**
   * Nếu người dùng truy cập trực tiếp vào `/checkout` khi chưa tick chọn bất kỳ sản phẩm nào (`selectedItems.length === 0`), trang sẽ tự động redirect về `/cart`.
2. **Hiển thị tóm tắt đơn hàng:**
   * Chỉ liệt kê danh sách các sản phẩm đã được tick chọn từ giỏ hàng.
   * Hiển thị tổng tiền và giảm giá tương ứng với các món đã chọn.
3. **Thanh toán thành công:**
   * Gửi danh sách ID các sản phẩm đã chọn lên backend qua trường `selectedItemIds` trong `CreateOrderDto`.
   * Khi nhận phản hồi thành công từ backend, frontend gọi action `removeSelectedItems()` (thay vì `clearCart()`).
   * Các sản phẩm chưa được tick chọn vẫn nằm nguyên vẹn trong giỏ hàng.

---

## 3. Kiến trúc Kỹ thuật & Luồng Dữ liệu (Technical Architecture)

```
[ Frontend: CartPage / CheckoutPage ]
               │
               ▼
      useCartStore (Zustand)
      - items: CartItem[]
      - selectedItemIds: string[]
      - Actions: toggleSelectItem, selectAll, deselectAll, removeSelectedItems
      - Getters: selectedItems(), selectedSubtotal(), selectedTotalCount()
               │
               │ POST /orders/checkout { ...orderData, selectedItemIds: [...] }
               ▼
     [ Backend: OrdersController ]
               │
               ▼
     [ OrdersService.checkout ]
               │
               ├─► Lọc itemsToCheckout = cart.items.filter(i => selectedItemIds.includes(i.id))
               ├─► Xác thực tồn kho & trạng thái active của riêng itemsToCheckout
               │
               ▼ (Atomic $transaction)
               ├─► Khóa hàng Voucher (SELECT FOR UPDATE) & xác thực minOrderValue theo subtotal mới
               ├─► Khóa thiết bị IMEI (SELECT FOR UPDATE SKIP LOCKED) theo số lượng itemsToCheckout
               ├─► Trừ tồn kho (decrement availableQty, increment reservedQty) cho itemsToCheckout
               ├─► Tạo bản ghi Order & OrderItems
               ├─► Ghi nhận VoucherUsage
               └─► Xóa chọn lọc: DELETE FROM cart_items WHERE cart_id = cart.id AND id IN (selectedItemIds)
```

---

## 4. Đặc tả Chi tiết Thành phần Hệ thống

### 4.1. Frontend State: `useCartStore.ts`
* **State bổ sung:**
  ```typescript
  selectedItemIds: string[]; // Mặc định []
  ```
* **Actions mới:**
  ```typescript
  toggleSelectItem: (itemId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  removeSelectedItems: () => void;
  ```
* **Computed Helpers:**
  ```typescript
  selectedItems: () => CartItem[];
  selectedSubtotal: () => number;
  selectedTotalCount: () => number;
  isAllSelected: () => boolean;
  ```
* **Quy tắc dọn dẹp liên kết:**
  * Khi hàm `removeItem(itemId)` hoặc `clearCart()` được gọi, store tự động loại bỏ các ID tương ứng ra khỏi `selectedItemIds`.

### 4.2. Frontend Service: `cartService.ts` & `orderService.ts`
* Trong `cartService.ts`:
  ```typescript
  async removeSelectedItemsBulk(itemIds: string[]): Promise<void> {
    await apiClient.delete('/cart/items/bulk', { data: { itemIds } });
  }
  ```
* Trong `orderService.ts`:
  * Mở rộng `CheckoutPayload`:
    ```typescript
    export interface CheckoutPayload {
      customerName: string;
      shippingPhone: string;
      shippingAddress: string;
      notes?: string;
      paymentMethod?: PaymentMethod | string;
      installmentData?: InstallmentFormData | any;
      voucherCode?: string;
      addressId?: string;
      selectedItemIds?: string[];
    }
    ```

### 4.3. Backend Data Transfer Objects (DTOs)
* **`backend/src/modules/orders/dto/order.dto.ts`:**
  ```typescript
  export class CreateOrderDto {
    @ApiProperty()
    @IsUUID()
    addressId: string;

    @ApiPropertyOptional({ type: [String], description: 'Danh sách ID các CartItem được chọn thanh toán' })
    @IsOptional()
    @IsArray()
    @IsUUID('all', { each: true })
    selectedItemIds?: string[];

    // ... các trường hiện tại khác giữ nguyên
  }
  ```
* **`backend/src/modules/cart/dto/cart.dto.ts`:**
  ```typescript
  export class BulkDeleteCartItemsDto {
    @ApiProperty({ type: [String], description: 'Danh sách ID các CartItem cần xóa' })
    @IsArray()
    @IsUUID('all', { each: true })
    itemIds: string[];
  }
  ```

### 4.4. Backend Orders Module: `orders.service.ts`
* Lọc danh sách sản phẩm tham gia checkout:
  ```typescript
  let itemsToCheckout = cart.items;
  if (dto.selectedItemIds && dto.selectedItemIds.length > 0) {
    const selectedSet = new Set(dto.selectedItemIds);
    itemsToCheckout = cart.items.filter((item) => selectedSet.has(item.id));
    if (itemsToCheckout.length === 0) {
      throw new BadRequestException('Không tìm thấy sản phẩm đã chọn trong giỏ hàng');
    }
  }
  ```
* Kiểm tra tồn kho và Variant chỉ thực hiện trên `itemsToCheckout`.
* Tái tính toán `subtotal` và xác thực Voucher `minOrderValue` dựa trên `itemsToCheckout`.
* Trong `prisma.$transaction`:
  * Xóa chọn lọc trong cơ sở dữ liệu:
    ```typescript
    const checkoutItemIds = itemsToCheckout.map((i) => i.id);
    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        id: { in: checkoutItemIds },
      },
    });
    ```

### 4.5. Backend Cart Module: `cart.service.ts` & `cart.controller.ts`
* Trong `cart.service.ts`:
  ```typescript
  async removeItemsBulk(userId: string, itemIds: string[]) {
    const cart = await this.getOrCreateCart(userId);
    return this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        id: { in: itemIds },
      },
    });
  }
  ```
* Trong `cart.controller.ts`:
  ```typescript
  @Delete('items/bulk')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xóa nhiều sản phẩm khỏi giỏ hàng' })
  async removeItemsBulk(
    @CurrentUser('id') userId: string,
    @Body() dto: BulkDeleteCartItemsDto,
  ) {
    return this.cartService.removeItemsBulk(userId, dto.itemIds);
  }
  ```

---

## 5. Kế hoạch Kiểm thử & Đảm bảo Chất lượng (Testing & QA)

### 5.1. Backend Unit Tests
1. **`orders.service.spec.ts`:**
   * Test case 1: Checkout với `selectedItemIds`: Đơn hàng tạo thành công với đúng các món được chọn; database chỉ xóa các món này, các món còn lại trong giỏ được bảo lưu.
   * Test case 2: Checkout với `selectedItemIds` rỗng hoặc ID không thuộc giỏ của user -> Ném lỗi `BadRequestException`.
   * Test case 3: Voucher validation: Khi chỉ chọn một số món có tổng tiền nhỏ hơn `minOrderValue` -> Ném lỗi không đủ điều kiện.
   * Test case 4: Tương thích ngược: Khi không truyền `selectedItemIds` -> Mặc định checkout toàn bộ giỏ hàng như cũ.
2. **`cart.service.spec.ts`:**
   * Test case 1: Xóa hàng loạt danh sách `itemIds` thuộc giỏ hàng của user thành công.
   * Test case 2: Không cho phép xóa các `itemIds` thuộc giỏ hàng của tài khoản khác (IDOR safe).

### 5.2. Frontend Unit & Integration Tests
1. **`useCartStore.spec.ts`:**
   * Xác minh khởi tạo mặc định `selectedItemIds = []`.
   * Xác minh `toggleSelectItem`, `selectAll`, `deselectAll`.
   * Xác minh `selectedSubtotal()` và `selectedTotalCount()`.
   * Xác minh tự động dọn ID khi `removeItem(id)`.
2. **Kịch bản kiểm thử giao diện thủ công (Manual Verification Matrix):**
   * [ ] Mở `/cart` khi có 3 sản phẩm -> Cả 3 checkbox đều chưa tick, nút Đặt hàng bị disable.
   * [ ] Tick 1 sản phẩm -> Nút Đặt hàng kích hoạt, hiển thị đúng số lượng và số tiền.
   * [ ] Tick "Chọn tất cả" -> Cả 3 sản phẩm được chọn, checkbox Chọn tất cả ở trạng thái checked.
   * [ ] Bỏ tick 1 sản phẩm -> Checkbox Chọn tất cả tự bỏ tick, tổng tiền giảm tương ứng.
   * [ ] Áp dụng Voucher có điều kiện 10 triệu, tick món 5 triệu -> Báo lỗi không đủ điều kiện đơn tối thiểu.
   * [ ] Click "Xóa mục đã chọn" -> Thanh xác nhận xuất hiện, sau khi xác nhận các món được tick bị xóa.
   * [ ] Nhấn "Thanh toán" từ `CartDrawer` -> Điều hướng về `/cart`.
   * [ ] Từ `/cart` sang `/checkout` -> Chỉ hiển thị các món được chọn.
   * [ ] Thanh toán đơn hàng thành công -> Các món chưa chọn vẫn nằm trong giỏ hàng.
