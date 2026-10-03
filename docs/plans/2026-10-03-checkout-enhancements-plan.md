# Checkout Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện 3 tính năng cốt lõi của trang Checkout: Chọn địa chỉ từ sổ địa chỉ đã lưu (modal + thêm mới nhanh), Chọn phương thức vận chuyển (Tiết kiệm, Tiêu chuẩn, Hỏa tốc 2h kèm quy tắc freeship >500k), và Nhập/đổi/gợi ý mã giảm giá (Coupon) trực tiếp tại trang Checkout.

**Architecture:** Tách biệt độc lập thành các luồng (Streams) có phạm vi file rõ ràng để các Agent có thể thực thi song song (Parallel execution) mà không bị xung đột code:
- **Stream 1 (Backend Core):** Prisma schema enum, DTO validation, Server-side dynamic shipping fee & voucher cap, unit tests.
- **Stream 2 (Frontend Address Management):** `addressService.ts` và `AddressSelectModal.tsx`.
- **Stream 3 (Frontend Shipping & Coupon Components):** `ShippingMethodSelector.tsx` và `CheckoutCouponSection.tsx`.
- **Stream 4 (Checkout Page Integration & Full Verification):** Tích hợp tất cả các component vào `CheckoutPage.tsx`, cập nhật `orderService.ts`, kiểm thử toàn diện.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React 18, TypeScript, Tailwind CSS, Lucide icons, Jest, Vite.

---

## File Structure & Responsibility Map

| File Path | Responsibility | Stream |
|---|---|:---:|
| `backend/prisma/schema.prisma` | Bổ sung enum `ShippingMethod` và trường `shippingMethod` vào model `Order` | 1 |
| `backend/src/modules/orders/dto/order.dto.ts` | Thêm validation cho `shippingMethod` trong `CreateOrderDto` | 1 |
| `backend/src/modules/orders/orders.service.ts` | Tính toán phí ship chuẩn xác theo phương thức, freeship >500k, tạo bản ghi `Shipping` | 1 |
| `backend/test/unit/orders-shipping-and-checkout.spec.ts` | Unit tests kiểm thử phí ship, freeship, và checkout với các gói vận chuyển | 1 |
| `frontend/src/types/index.ts` | Export kiểu dữ liệu `ShippingMethod` và `Address` | 2 |
| `frontend/src/services/addressService.ts` | Service gọi API `/addresses` (lấy danh sách, tạo mới, đặt mặc định) | 2 |
| `frontend/src/components/storefront/checkout/AddressSelectModal.tsx` | Modal hiển thị danh sách địa chỉ đã lưu, radio chọn nhanh, form thêm mới địa chỉ | 2 |
| `frontend/src/components/storefront/checkout/ShippingMethodSelector.tsx` | Component chọn phương thức vận chuyển với 3 radio card, hiển thị giá và thời gian giao | 3 |
| `frontend/src/components/storefront/checkout/CheckoutCouponSection.tsx` | Ô input nhập mã + nút Áp dụng + tag mã đang dùng + modal xem gợi ý voucher có sẵn | 3 |
| `frontend/src/services/orderService.ts` | Cập nhật `CheckoutPayload` hỗ trợ `shippingMethod` và `addressId` | 4 |
| `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx` | Tích hợp các component, tính toán tổng tiền động và gửi order | 4 |

---

## Luồng 1 (Stream 1): Backend Shipping Methods & Order Calculation (Agent 1)

### Task 1.1: Cập nhật Prisma Schema & Migrations

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Thêm enum ShippingMethod và trường shippingMethod vào model Order**

Trong `backend/prisma/schema.prisma`:
```prisma
enum ShippingMethod {
  ECONOMY
  STANDARD
  EXPRESS_2H
}

model Order {
  // ... existing fields
  shippingMethod ShippingMethod @default(STANDARD) @map("shipping_method")
  // ...
}
```

- [ ] **Step 2: Generate Prisma Client & apply migration**

Run:
```bash
cd backend
npx prisma generate
```
Expected: Prisma Client generated successfully with `ShippingMethod`.

---

### Task 1.2: Cập nhật CreateOrderDto & OrdersService

**Files:**
- Modify: `backend/src/modules/orders/dto/order.dto.ts`
- Modify: `backend/src/modules/orders/orders.service.ts`
- Test: `backend/test/unit/orders-shipping-and-checkout.spec.ts`

- [ ] **Step 1: Viết test kiểm thử tính toán phí ship trong `backend/test/unit/orders-shipping-and-checkout.spec.ts`**

Tạo test case kiểm thử:
- Gói `ECONOMY`: 15.000₫ khi <= 500k, 0₫ khi > 500k.
- Gói `STANDARD`: 30.000₫ khi <= 500k, 0₫ khi > 500k.
- Gói `EXPRESS_2H`: 60.000₫ khi <= 500k, 30.000₫ khi > 500k.
- Mã giảm giá loại `FREE_SHIPPING` khấu trừ tối đa bằng phí ship thực tế.

- [ ] **Step 2: Cập nhật CreateOrderDto**

Thêm `shippingMethod?: ShippingMethod;` với `@IsOptional()` và `@IsEnum(ShippingMethod)` vào `CreateOrderDto`.

- [ ] **Step 3: Cập nhật logic tính phí ship và tạo Shipping record trong `orders.service.ts`**

Thay thế hằng số `STANDARD_SHIPPING_FEE` bằng hàm `calculateShippingFee(method, subtotal)`.
Trong `$transaction`, lưu `shippingMethod: dto.shippingMethod || ShippingMethod.STANDARD` vào `tx.order.create` và tạo bản ghi `tx.shipping.create` với `estimatedDeliveryDate` tương ứng:
- `EXPRESS_2H`: `new Date(Date.now() + 2 * 3600 * 1000)`
- `STANDARD`: `new Date(Date.now() + 2 * 24 * 3600 * 1000)`
- `ECONOMY`: `new Date(Date.now() + 4 * 24 * 3600 * 1000)`

- [ ] **Step 4: Chạy test xác nhận thành công**

Run: `cd backend && npm test -- orders-shipping-and-checkout.spec.ts`
Expected: Tất cả tests PASS.

- [ ] **Step 5: Commit Stream 1**

```bash
git add backend/prisma/schema.prisma backend/src/modules/orders/ backend/test/unit/orders-shipping-and-checkout.spec.ts
git commit -m "feat(backend): add shippingMethod to Order and dynamic shipping fee calculations"
```

---

## Luồng 2 (Stream 2): Frontend Address Management (Agent 2)

### Task 2.1: Types & addressService

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/addressService.ts`

- [ ] **Step 1: Định nghĩa types cho Address và ShippingMethod**

Trong `frontend/src/types/index.ts`:
```typescript
export type ShippingMethod = 'ECONOMY' | 'STANDARD' | 'EXPRESS_2H';

export interface Address {
  id: string;
  userId: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  ward?: string;
  district?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressPayload {
  recipientName: string;
  phone: string;
  addressLine1: string;
  ward?: string;
  district?: string;
  city: string;
  type?: 'HOME' | 'WORK' | 'OTHER';
  isDefault?: boolean;
}
```

- [ ] **Step 2: Triển khai `addressService.ts`**

Trong `frontend/src/services/addressService.ts`:
- `getAddresses()`: `apiClient.get('/addresses')`
- `createAddress(payload)`: `apiClient.post('/addresses', payload)`
- `setDefaultAddress(id)`: `apiClient.put(\`/addresses/${id}/default\`)`
- `deleteAddress(id)`: `apiClient.delete(\`/addresses/${id}\`)`

---

### Task 2.2: Component `AddressSelectModal.tsx`

**Files:**
- Create: `frontend/src/components/storefront/checkout/AddressSelectModal.tsx`

- [ ] **Step 1: Xây dựng giao diện Modal danh sách địa chỉ đã lưu**

- Hiển thị danh sách các địa chỉ lấy từ `addressService.getAddresses()`.
- Mỗi địa chỉ là 1 thẻ click chọn, có đánh dấu `Đang chọn`, nhãn `Mặc định`, hiển thị tên, SĐT, địa chỉ chi tiết.
- Nút "+ Thêm địa chỉ mới" để chuyển đổi sang form nhập thêm địa chỉ ngay trong modal.

- [ ] **Step 2: Form thêm địa chỉ mới ngay trong Modal**

- Các input: Họ và tên, SĐT, Tỉnh / Thành phố, Địa chỉ chi tiết (số nhà, tên đường, phường/xã), checkbox `Đặt làm địa chỉ mặc định`.
- Nút "Lưu và Sử dụng": gọi `addressService.createAddress()`, cập nhật danh sách và tự động chọn địa chỉ vừa tạo.

- [ ] **Step 3: Commit Stream 2**

```bash
git add frontend/src/types/index.ts frontend/src/services/addressService.ts frontend/src/components/storefront/checkout/AddressSelectModal.tsx
git commit -m "feat(frontend): add addressService and AddressSelectModal component"
```

---

## Luồng 3 (Stream 3): Frontend Shipping & Coupon Components (Agent 3)

### Task 3.1: Component `ShippingMethodSelector.tsx`

**Files:**
- Create: `frontend/src/components/storefront/checkout/ShippingMethodSelector.tsx`

- [ ] **Step 1: Tạo component lựa chọn 3 gói vận chuyển**

- Nhận props: `subtotal: number`, `selectedMethod: ShippingMethod`, `onChange: (method: ShippingMethod) => void`.
- Cấu hình 3 gói:
  - `ECONOMY`: "Giao tiết kiệm", thời gian "3 - 5 ngày", phí gốc 15.000₫ (Miễn phí nếu `subtotal > 500k`).
  - `STANDARD`: "Giao tiêu chuẩn", thời gian "1 - 2 ngày", phí gốc 30.000₫ (Miễn phí nếu `subtotal > 500k`), badge "Phổ biến nhất".
  - `EXPRESS_2H`: "Giao hỏa tốc 2h", thời gian "Nhận trong 2 giờ", phí gốc 60.000₫ (Giảm 30.000₫ còn 30.000₫ nếu `subtotal > 500k`), badge "Nhanh nhất".
- Render dạng radio cards cao cấp, hover & focus effect đẹp mắt, hiển thị giá tiền thực tế sau khi tính quy tắc freeship.

---

### Task 3.2: Component `CheckoutCouponSection.tsx`

**Files:**
- Create: `frontend/src/components/storefront/checkout/CheckoutCouponSection.tsx`

- [ ] **Step 1: Tạo component nhập và quản lý mã voucher**

- Nhận props: `subtotal: number`, `appliedVoucher: any | null`, `onApplyVoucher: (voucher: any) => void`, `onRemoveVoucher: () => void`.
- Input text nhập mã coupon + nút `[Áp dụng]`: gọi `voucherService.validateVoucher(code, subtotal)`. Hiển thị loading spinner và thông báo lỗi rõ ràng nếu voucher không hợp lệ/hết hạn.
- Khi đã áp dụng voucher: hiển thị tag xanh lá gồm tên mã, số tiền giảm, và nút icon xóa `[Gỡ]`.
- Nút / Link "Xem danh sách mã ưu đãi": hiển thị danh sách voucher hợp lệ lấy từ `voucherService.getActiveVouchers()` để người dùng click 1 chạm để áp dụng ngay.

- [ ] **Step 2: Commit Stream 3**

```bash
git add frontend/src/components/storefront/checkout/ShippingMethodSelector.tsx frontend/src/components/storefront/checkout/CheckoutCouponSection.tsx
git commit -m "feat(frontend): add ShippingMethodSelector and CheckoutCouponSection components"
```

---

## Luồng 4 (Stream 4): Tích hợp & Kiểm thử toàn diện (Agent 4)

### Task 4.1: Cập nhật `orderService.ts`

**Files:**
- Modify: `frontend/src/services/orderService.ts`

- [ ] **Step 1: Bổ sung shippingMethod vào CheckoutPayload**

Cập nhật `CheckoutPayload` để hỗ trợ `shippingMethod?: ShippingMethod;`.
Gửi `shippingMethod` cùng `addressId` trong request `POST /orders/checkout`.

---

### Task 4.2: Tích hợp toàn diện vào `CheckoutPage.tsx`

**Files:**
- Modify: `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`

- [ ] **Step 1: Tích hợp Address Selection**

- Khởi tạo: gọi `addressService.getAddresses()` khi mount trang.
- Nếu có địa chỉ: tự động chọn địa chỉ mặc định (hoặc địa chỉ đầu tiên).
- Hiển thị Card địa chỉ người nhận đã chọn với badge `Mặc định` và nút `[Thay đổi]`. Bấm nút mở `AddressSelectModal`.
- Nếu chưa có địa chỉ hoặc user muốn gõ tay: hiển thị form nhập trực tiếp như cũ.

- [ ] **Step 2: Tích hợp `ShippingMethodSelector`**

- State: `const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('STANDARD');`
- Tính toán `shippingFee` động theo `shippingMethod` và `subtotal`.
- Đặt `ShippingMethodSelector` bên dưới phần Địa chỉ nhận hàng và trước Phương thức thanh toán.

- [ ] **Step 3: Tích hợp `CheckoutCouponSection`**

- Thay thế phần hiển thị voucher tĩnh ở Summary bằng `CheckoutCouponSection`.
- Khi áp dụng/gỡ voucher: tự động cập nhật `totalAmountDue`, đồng bộ `sessionStorage.setItem('mobilecommerce_voucher', ...)`.

- [ ] **Step 4: Hoàn thiện gửi đơn hàng với đầy đủ dữ liệu**

Khi submit form:
- Gửi `addressId` của địa chỉ đang chọn (hoặc auto-create nếu nhập tay).
- Gửi `shippingMethod` đã chọn.
- Gửi `voucherCode` đã áp dụng.

---

### Task 4.3: Kiểm thử toàn diện & Verification

- [ ] **Step 1: Chạy build Frontend để kiểm tra TypeScript**

Run: `cd frontend && npm run build`
Expected: Build thành công không có lỗi TypeScript hay cú pháp.

- [ ] **Step 2: Chạy kiểm thử Backend test suite**

Run: `cd backend && npm test`
Expected: Toàn bộ unit tests pass.

- [ ] **Step 3: Commit hoàn thiện tính năng**

```bash
git add frontend/src/services/orderService.ts frontend/src/pages/storefront/Checkout/CheckoutPage.tsx
git commit -m "feat(checkout): integrate saved address selection, shipping methods, and coupon management"
```
