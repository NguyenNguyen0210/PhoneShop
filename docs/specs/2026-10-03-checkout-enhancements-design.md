# Technical Design Spec: Checkout Enhancements (Address Selection, Shipping Methods, Coupon Management)

- **Date:** 2026-10-03
- **Status:** Approved
- **Scope:** Storefront Checkout Flow, Backend Orders & Shipping modules, Database Schema.

---

## 1. Problem Statement & Motivation
Currently, the storefront Checkout page has three major UX & functional limitations:
1. **Address Selection:** Customers must type recipient name, phone, and detailed address manually on every checkout. Even though the system auto-saves addresses to the database, logged-in customers cannot view or pick from their saved address book.
2. **Shipping Method Selection:** Shipping fee is hard-coded with a single rule (>500,000₫ = 0₫, <=500,000₫ = 30,000₫). Customers have no way to choose between shipping options (e.g. Economy, Standard, Express 2h).
3. **Coupon Application:** Checkout only receives pre-applied vouchers forwarded from the Cart page via `sessionStorage`. There is no input field on Checkout to enter a new code, remove the current code, or browse available vouchers.

---

## 2. Architecture & Data Model Changes

### 2.1 Database Schema (`backend/prisma/schema.prisma`)

1. **Enum `ShippingMethod`:**
   ```prisma
   enum ShippingMethod {
     ECONOMY     // Giao tiết kiệm (15.000₫ - 3-5 ngày)
     STANDARD    // Giao tiêu chuẩn (30.000₫ - 1-2 ngày)
     EXPRESS_2H  // Giao hỏa tốc 2h (60.000₫ - nhận trong 2 giờ)
   }
   ```

2. **Model `Order`:**
   - Add field:
     ```prisma
     shippingMethod ShippingMethod @default(STANDARD) @map("shipping_method")
     ```

3. **Model `Shipping`:**
   - Ensure `Shipping` record is created atomically during order checkout with:
     - `orderId`: Order ID
     - `providerName`: Descriptive provider string based on method (e.g., "Giao hàng Hỏa tốc 2h", "Giao hàng Tiêu chuẩn", "Giao hàng Tiết kiệm")
     - `shippingFee`: Calculated shipping fee
     - `estimatedDeliveryDate`: Computed according to selected shipping method:
       - `EXPRESS_2H`: `now + 2 hours`
       - `STANDARD`: `now + 2 days`
       - `ECONOMY`: `now + 4 days`
     - `status`: `PENDING`

### 2.2 Backend DTO & Service Logic (`backend/src/modules/orders`)

1. **`CreateOrderDto`:**
   - Add `shippingMethod?: ShippingMethod;` with `@IsOptional()` and `@IsEnum(ShippingMethod)` validation.
2. **Server-side Shipping Fee Calculation (`orders.service.ts`):**
   - Implement authoritative calculation:
     ```typescript
     function calculateShippingFee(method: ShippingMethod, subtotal: number): number {
       const isFreeEligible = subtotal > 500000;
       switch (method) {
         case ShippingMethod.ECONOMY:
           return isFreeEligible ? 0 : 15000;
         case ShippingMethod.EXPRESS_2H:
           return isFreeEligible ? 30000 : 60000; // 30k discount for orders > 500k
         case ShippingMethod.STANDARD:
         default:
           return isFreeEligible ? 0 : 30000;
       }
     }
     ```
   - In transaction, calculate `shippingFee = calculateShippingFee(dto.shippingMethod || ShippingMethod.STANDARD, subtotal)`.
   - For `FREE_SHIPPING` voucher, cap discount at `shippingFee`:
     `discountAmount = Math.min(Number(voucher.value), shippingFee);`
   - Store `shippingMethod` on `tx.order.create` and create `tx.shipping.create`.

---

## 3. Frontend Architecture & Components

### 3.1 Services & API Client
- **`frontend/src/services/addressService.ts`:**
  - Wraps existing backend `/addresses` endpoints:
    - `getAddresses()`: Returns list of `Address` for current user.
    - `createAddress(data)`: Creates new address with recipient name, phone, addressLine1, city, etc.
    - `setDefaultAddress(id)`: Sets default address for current user.
    - `deleteAddress(id)`: Removes address.
- **`frontend/src/types/index.ts`:**
  - Export `ShippingMethod = 'ECONOMY' | 'STANDARD' | 'EXPRESS_2H'`.
  - Export `Address` interface.

### 3.2 UI Components

1. **`AddressSelectModal.tsx` (`frontend/src/components/storefront/checkout/`):**
   - Shows modal dialog listing user's saved addresses.
   - Allows selecting an address as the active shipping destination.
   - Highlights the default address with a badge.
   - Includes "+ Thêm địa chỉ mới" button which expands a creation form (Tên, SĐT, Địa chỉ chi tiết, Tỉnh/TP, checkbox "Đặt làm mặc định").
   - Upon creating, automatically selects the newly created address.

2. **Selected Address Card in `CheckoutPage.tsx`:**
   - For logged-in users with saved addresses:
     - Displays recipient name, phone, address, and default tag.
     - Has a clean button `[Thay đổi địa chỉ]` to open `AddressSelectModal`.
   - For users with no saved address or guest checkout:
     - Renders the existing direct input form with an option to auto-save to address book.

3. **`ShippingMethodSelector.tsx` (`frontend/src/components/storefront/checkout/`):**
   - 3 interactive radio cards:
     - **Giao tiết kiệm (15.000₫ / Miễn phí nếu >500k, 3-5 ngày)**
     - **Giao tiêu chuẩn (30.000₫ / Miễn phí nếu >500k, 1-2 ngày, Khuyên dùng)**
     - **Giao hỏa tốc 2h (60.000₫ / 30.000₫ nếu >500k, nhận trong 2 giờ)**
   - Displays live price calculation, strike-through original prices when discounted, and badges.

4. **`CheckoutCouponSection.tsx` (`frontend/src/components/storefront/checkout/`):**
   - Placed in the Order Summary column.
   - Text input + `[Áp dụng]` button with loading indicator.
   - When a voucher is applied:
     - Shows voucher code pill, discount value, and `[Gỡ bỏ]` button.
   - Link / Button "Xem mã ưu đãi có sẵn" opens a popover / modal displaying valid active vouchers from `voucherService.getActiveVouchers()` for 1-click application.
   - Syncs changes back to `sessionStorage('mobilecommerce_voucher')`.

5. **`CheckoutPage.tsx` Integration:**
   - Coordinates `selectedAddress`, `shippingMethod`, `voucher`, and `subtotal`.
   - Real-time recalculation of `shippingFee`, `discountAmount`, and `totalAmountDue = Math.max(0, subtotal - discountAmount + shippingFee)`.
   - Passes `addressId`, `shippingMethod`, and `voucherCode` into `orderService.checkout()`.

---

## 4. Error Handling & Edge Cases
- **Expired/Invalid Voucher:** Validated in real-time via `voucherService.validateVoucher()` and re-checked inside the backend transaction with row-level locks.
- **Address not owned by user:** Backend strictly validates `address.userId === userId`.
- **Cart modification during checkout:** Re-calculates subtotal and re-evaluates freeship threshold dynamically.
- **Fallback for users with 0 addresses:** Clean inline input form with zero disruption to guest/new users.

---

## 5. Verification & Testing Plan
1. **Backend Tests:**
   - Unit tests in `backend/test/unit/orders-shipping-and-checkout.spec.ts` testing:
     - `calculateShippingFee` for ECONOMY, STANDARD, EXPRESS_2H with subtotal < 500k and > 500k.
     - Free shipping voucher discounting shipping fee up to fee amount.
     - Order checkout creation saving `shippingMethod` and `shipping` table row.
2. **Frontend Build & Integration:**
   - Verify Vite frontend builds cleanly with no TypeScript errors (`npm run build`).
   - Verify interactive flows in browser:
     - Selecting and adding addresses via `AddressSelectModal`.
     - Switching between 3 shipping methods and watching total update immediately.
     - Applying, changing, and removing vouchers directly at Checkout.
