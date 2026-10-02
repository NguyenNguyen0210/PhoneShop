# MobileCommerce Big Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul MobileCommerce into a high-standard mobile device e-commerce platform with strict IMEI concurrency tracking (15-min reservation & auto-release), realistic seed data, VietQR & VNPay payments, and a dual-interface Frontend (Tailwind Storefront for customers + Ant Design Admin Portal for staff).

**Architecture:** 
- Backend: NestJS 11 Modular Monolith with Prisma 7 + PostgreSQL (Supabase), Redis for caching and BullMQ for hold-timeout workers.
- Frontend: React 19 + Vite 8, styled with Tailwind CSS for customer storefront and Ant Design 5 for admin portal, coordinated via TanStack Query and Zustand.
- Concurrency: Atomic reservation of unique IMEI devices in database transactions with scheduled auto-expiry jobs in BullMQ.

**Tech Stack:** NestJS 11, TypeScript 6, Prisma ORM 7, PostgreSQL (Supabase), Redis, BullMQ, React 19, Vite 8, Tailwind CSS, Ant Design 5, TanStack Query v5, Zustand, Axios.

---

## File Structure Map

### Backend (`MobileCommerce/backend/`)
- `prisma/schema.prisma` - DB schema with hold expiration, relations, and indexes
- `prisma/seed.ts` - Comprehensive realistic seed data (Apple, Samsung, Xiaomi, IMEIs, users)
- `src/modules/orders/orders.service.ts` - Atomic checkout with IMEI reservation & hold timer
- `src/modules/orders/orders.processor.ts` - BullMQ processor for 15-minute order hold expiry
- `src/modules/orders/orders.module.ts` - Register BullMQ queue & processor
- `src/modules/payments/vietqr.service.ts` - Napas VietQR dynamic code generator
- `src/modules/payments/payments.service.ts` - VNPay URL signing & IPN webhook handler
- `src/modules/payments/payments.controller.ts` - Endpoints for VietQR & VNPay IPN
- `test/unit/imei.spec.ts` - Unit tests for IMEI Luhn validation & lifecycle

### Frontend (`MobileCommerce/frontend/`)
- `package.json` - Dependencies for Ant Design, Tailwind, TanStack Query, Zustand, Axios, React Router
- `vite.config.ts` - Vite config with path aliases (`@/`)
- `src/index.css` - Tailwind directives & Ant Design reset
- `src/services/apiClient.ts` - Axios client with JWT interceptor & auto-token rotation
- `src/services/*.ts` - Services for auth, products, cart, orders, payments, imei, warranty
- `src/stores/useAuthStore.ts` - Zustand authentication & user role state
- `src/stores/useCartStore.ts` - Zustand cart items & drawer toggle
- `src/layouts/StorefrontLayout.tsx` - Navbar, mobile search, cart drawer, footer
- `src/layouts/AdminLayout.tsx` - Ant Design Sider, Header, Breadcrumbs
- `src/layouts/AuthLayout.tsx` - Centered container for login and registration
- `src/pages/storefront/Home/HomePage.tsx` - Hero banner, flash sales, smartphone showcase
- `src/pages/storefront/Products/ProductListingPage.tsx` - Filterable grid (Brand, RAM, ROM, Price)
- `src/pages/storefront/ProductDetail/ProductDetailPage.tsx` - Live variant switcher, gallery, specs
- `src/pages/storefront/Cart/CartPage.tsx` - Cart table, voucher input, checkout button
- `src/pages/storefront/Checkout/CheckoutPage.tsx` - Address, payment selector, 15m timer
- `src/pages/storefront/OrderSuccess/OrderSuccessPage.tsx` - Order receipt & VietQR modal
- `src/pages/storefront/WarrantyLookup/WarrantyLookupPage.tsx` - Public IMEI lookup
- `src/pages/auth/LoginPage.tsx` & `RegisterPage.tsx` - Auth pages
- `src/pages/admin/Dashboard/AdminDashboard.tsx` - Stats, revenue chart, inventory alerts
- `src/pages/admin/Products/AdminProductsPage.tsx` - Products & variants CRUD table
- `src/pages/admin/InventoryImei/AdminImeiPage.tsx` - Batch IMEI import & status controller
- `src/pages/admin/Orders/AdminOrdersPage.tsx` - Order pipeline & fulfillment
- `src/routes/AppRoutes.tsx` - Unified router configuration

---

## Tasks

### Task 1: Prisma Schema Refinement & Real Seed Data

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/seed.ts`
- Modify: `backend/package.json`

- [x] **Step 1: Update Prisma Schema**
Add `holdExpiresAt` to `Order`, add `imeiDeviceId` index in `order_items`, and ensure `ImeiDevice` has `status` and `variantId` composite index.

- [x] **Step 2: Create Comprehensive Seed Script**
Write `backend/prisma/seed.ts` containing:
- 3 Roles: ADMIN, STAFF, USER
- 3 Default Users with bcrypt hashed passwords
- 4 Brands: Apple, Samsung, Xiaomi, Sony
- 4 Categories: Flagship, Mid-range, Tablets, Accessories
- Products with variants (iPhone 15 Pro Max, Galaxy S24 Ultra, Xiaomi 14 Ultra)
- Valid 15-digit Luhn IMEIs (5+ per variant)
- Sample Vouchers (WELCOME50, FREESHIP)

- [x] **Step 3: Run seed and verify**
Run: `npm run prisma:seed` in `backend`
Expected: Database populated with realistic records.

- [x] **Step 4: Commit**
```bash
git add backend/prisma/
git commit -m "feat(backend): refine schema and add realistic seed data"
```

---

### Task 2: IMEI Concurrency Engine & 15-Min Order Hold Worker

**Files:**
- Modify: `backend/src/modules/orders/orders.service.ts`
- Create: `backend/src/modules/orders/orders.processor.ts`
- Modify: `backend/src/modules/orders/orders.module.ts`
- Create: `backend/test/unit/imei.spec.ts`

- [x] **Step 1: Write Unit Test for IMEI Luhn & Concurrency**
Create `backend/test/unit/imei.spec.ts` testing:
1. Valid Luhn 15-digit IMEI returns true; invalid returns false.
2. Status transition rules (AVAILABLE -> RESERVED -> SOLD).

- [x] **Step 2: Run Unit Test to verify**
Run: `npx jest test/unit/imei.spec.ts`
Expected: PASS

- [x] **Step 3: Implement Atomic IMEI Reservation in OrdersService**
In `OrdersService.checkout`:
- In transaction: find `quantity` available IMEIs for each variant.
- Update IMEIs to `RESERVED`.
- Set `holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000)` on Order.
- Schedule BullMQ job `expire-order-hold` with delay 15 minutes.

- [x] **Step 4: Implement BullMQ Order Hold Expiry Processor**
In `orders.processor.ts`:
- On `expire-order-hold`: check if Order status is still `PENDING`.
- If so, update Order to `CANCELLED`, release IMEIs to `AVAILABLE`, update Inventory.

- [x] **Step 5: Verify backend build**
Run: `npm run build` in `backend`
Expected: Success.

- [x] **Step 6: Commit**
```bash
git add backend/src/modules/orders/ backend/test/
git commit -m "feat(backend): implement atomic imei reservation and 15m hold expiry worker"
```

---

### Task 3: Payment Integrations (VietQR & VNPay Sandbox)

**Files:**
- Create: `backend/src/modules/payments/vietqr.service.ts`
- Modify: `backend/src/modules/payments/payments.service.ts`
- Modify: `backend/src/modules/payments/payments.controller.ts`

- [x] **Step 1: Implement VietQR Generator Service**
In `vietqr.service.ts`:
- Generate Napas 247 QuickLink: `https://img.vietqr.io/image/{bankId}-{accountNo}-compact2.png?amount={amount}&addInfo={orderNumber}&accountName={accountName}`.

- [x] **Step 2: Implement VNPay URL Generator & IPN Webhook**
In `payments.service.ts`:
- Method `createVnpayPaymentUrl`: sign params with HMAC-SHA512.
- Method `handleVnpayIpn`: verify secure hash, check order total, mark Payment `PAID`, Order `CONFIRMED`, IMEI `SOLD`, and generate Warranty `WRT-XXX`.

- [x] **Step 3: Expose Payment Endpoints in PaymentsController**
Add:
- `POST /payments/vietqr/:orderId`
- `POST /payments/vnpay/create-url`
- `GET /payments/vnpay/ipn`
- `GET /payments/vnpay/return`

- [x] **Step 4: Verify backend build and commit**
```bash
npm run build
git add backend/src/modules/payments/
git commit -m "feat(backend): implement vietqr and vnpay sandbox integration"
```

---

### Task 4: Frontend Scaffolding, Tailwind CSS & Ant Design Integration

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/index.css`
- Create: `frontend/src/services/apiClient.ts`
- Create: `frontend/src/stores/useAuthStore.ts`
- Create: `frontend/src/stores/useCartStore.ts`

- [x] **Step 1: Install Frontend Dependencies**
Install in `frontend`:
- `antd`, `@ant-design/icons`
- `tailwindcss`, `@tailwindcss/vite`
- `@tanstack/react-query`
- `zustand`
- `axios`
- `react-router-dom`
- `lucide-react`

- [x] **Step 2: Configure Vite & Tailwind CSS**
Setup Tailwind in `src/index.css` and configure path alias `@/` in `vite.config.ts`.

- [x] **Step 3: Create Axios API Client with Auto-Auth Interceptors**
Create `frontend/src/services/apiClient.ts` with baseURL `/api`, authorization header injection, and 401 token refresh retry.

- [x] **Step 4: Create Zustand Auth and Cart Stores**
- `useAuthStore.ts`: user state, tokens in localStorage, login, logout, role check.
- `useCartStore.ts`: items, addItem, removeItem, updateQty, clearCart, isDrawerOpen.

- [x] **Step 5: Commit**
```bash
git add frontend/
git commit -m "feat(frontend): setup tailwind, antd, apiClient, and zustand stores"
```

---

### Task 5: Customer Storefront Implementation (Tailwind CSS)

**Files:**
- Create: `frontend/src/layouts/StorefrontLayout.tsx`
- Create: `frontend/src/pages/storefront/Home/HomePage.tsx`
- Create: `frontend/src/pages/storefront/Products/ProductListingPage.tsx`
- Create: `frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`
- Create: `frontend/src/pages/storefront/Cart/CartPage.tsx`
- Create: `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`
- Create: `frontend/src/pages/storefront/OrderSuccess/OrderSuccessPage.tsx`
- Create: `frontend/src/pages/storefront/WarrantyLookup/WarrantyLookupPage.tsx`
- Create: `frontend/src/pages/auth/LoginPage.tsx` & `RegisterPage.tsx`

- [x] **Step 1: Create StorefrontLayout with Header, Cart Badge & Footer**
Responsive top navigation with logo, search input, category links, cart icon with badge count, and user dropdown.

- [x] **Step 2: Create HomePage**
Modern hero section, brand logo carousel (Apple, Samsung, Xiaomi), flash sale countdown, and featured smartphone cards with price and badge.

- [x] **Step 3: Create ProductListingPage with Filters**
Brand filter checkboxes, price range slider/chips, storage & RAM filters, sort dropdown, and responsive product grid.

- [x] **Step 4: Create ProductDetailPage with Live Variant Switcher**
Product image gallery, color swatches, storage option selector, dynamic price update, real-time stock indicator, technical specifications table.

- [x] **Step 5: Create CartPage & CheckoutPage with 15-Minute Hold Timer**
- Cart view with item count, unit price, quantity stepper, coupon discount input.
- Checkout page with customer shipping info, payment option (COD, VietQR, VNPay), and 15:00 hold timer alert banner.

- [x] **Step 6: Create OrderSuccessPage & WarrantyLookupPage**
- OrderSuccess: Displays order code, item list, and VietQR scan image modal if VietQR was chosen.
- WarrantyLookup: Input IMEI or phone number to check warranty status, expiration date, and remaining days.

- [x] **Step 7: Create LoginPage & RegisterPage**
Clean auth layout with validation, tabs for Login / Register, error messages, redirect to requested page.

- [x] **Step 8: Commit**
```bash
git add frontend/src/pages/storefront/ frontend/src/pages/auth/ frontend/src/layouts/StorefrontLayout.tsx
git commit -m "feat(frontend): implement customer storefront pages"
```

---

### Task 6: Admin Portal Implementation (Ant Design 5)

**Files:**
- Create: `frontend/src/layouts/AdminLayout.tsx`
- Create: `frontend/src/pages/admin/Dashboard/AdminDashboard.tsx`
- Create: `frontend/src/pages/admin/Products/AdminProductsPage.tsx`
- Create: `frontend/src/pages/admin/InventoryImei/AdminImeiPage.tsx`
- Create: `frontend/src/pages/admin/Orders/AdminOrdersPage.tsx`

- [x] **Step 1: Create AdminLayout with Ant Design Sider & Header**
Collapsible sidebar navigation (Dashboard, Products, Kho & IMEI, Orders, Vouchers, Users), breadcrumbs, admin profile avatar.

- [x] **Step 2: Create AdminDashboard**
KPI cards (`Total Revenue`, `Total Orders`, `Low Stock Alert`, `Total Users`), order status summary tags, and revenue table.

- [x] **Step 3: Create AdminProductsPage**
Ant Design Table with product name, brand, category, variants count, status switch. Modal for creating/editing product and variants.

- [x] **Step 4: Create AdminImeiPage with Batch Importer**
- Table of IMEIs with variant name, status tag (`AVAILABLE`, `RESERVED`, `SOLD`, `WARRANTY`), actions.
- Modal: Batch IMEI Import (paste multiple IMEIs, validate Luhn algorithm, import to selected variant).

- [x] **Step 5: Create AdminOrdersPage**
Order fulfillment pipeline table, status changer dropdown (`PENDING` -> `CONFIRMED` -> `SHIPPING` -> `DELIVERED`), modal to inspect order items and assigned IMEI serial numbers.

- [x] **Step 6: Commit**
```bash
git add frontend/src/pages/admin/ frontend/src/layouts/AdminLayout.tsx
git commit -m "feat(frontend): implement ant design admin portal pages"
```

---

### Task 7: Routing, End-to-End Build & Verification

**Files:**
- Create: `frontend/src/routes/AppRoutes.tsx`
- Create: `frontend/src/routes/ProtectedRoute.tsx` & `AdminRoute.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [x] **Step 1: Implement AppRoutes with Route Guards**
Configure React Router with:
- Public storefront routes (`/`, `/products`, `/products/:id`, `/cart`, `/checkout`, `/order-success/:id`, `/warranty-lookup`)
- Auth routes (`/login`, `/register`)
- Admin protected routes (`/admin`, `/admin/products`, `/admin/imei`, `/admin/orders`) requiring `Role.ADMIN` or `Role.STAFF`.

- [x] **Step 2: Verify Frontend Build**
Run: `npm run build` in `frontend`
Expected: TypeScript and Vite build complete with 0 errors.

- [x] **Step 3: Verify Backend Build**
Run: `npm run build` in `backend`
Expected: NestJS build complete with 0 errors.

- [x] **Step 4: Final Git Commit**
```bash
git add .
git commit -m "feat: complete mobile commerce big refactor"
```
