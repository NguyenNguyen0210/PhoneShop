# Installment System (Phương Án A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full-stack installment purchasing with financial profile verification (Home Credit / FE Credit), 24-hour stock reservation, CCCD document verification, customer checkout flow, and dedicated Admin review dashboard.

**Architecture:** Extend Prisma schema with `InstallmentApplication` and enum `PaymentMethod.INSTALLMENT`. Implement NestJS module `installments` integrated with `orders.service.ts` for 24h stock hold and `hold-expiry.sweeper.ts` for auto-cancellation. Build React storefront checkout form with R2 document uploads and Ant Design / Tailwind Admin review portal.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, PostgreSQL (Supabase), React 19, Tailwind CSS, Lucide Icons, Cloudflare R2.

---

## File Structure Map

### Backend (`backend/`)
- `backend/prisma/schema.prisma`: Add `INSTALLMENT` to `PaymentMethod`, add `InstallmentProvider`, `InstallmentStatus`, `InstallmentApplication` model and relations.
- `backend/src/modules/installments/dto/create-installment-application.dto.ts`: Validation DTO for customer installment submissions.
- `backend/src/modules/installments/dto/review-installment.dto.ts`: Validation DTO for Staff approval/rejection.
- `backend/src/modules/installments/dto/query-installment.dto.ts`: Query DTO for pagination, filtering, search.
- `backend/src/modules/installments/installments.service.ts`: Business logic for querying and reviewing installment applications.
- `backend/src/modules/installments/installments.controller.ts`: Endpoints for Storefront and Admin (`/api/installments`, `/api/admin/installments`).
- `backend/src/modules/installments/installments.module.ts`: NestJS module registration.
- `backend/src/modules/orders/dto/order.dto.ts`: Add optional `installmentData` to `CreateOrderDto`.
- `backend/src/modules/orders/orders.service.ts`: Integrate 24h hold, stock reservation, and installment application creation in order transaction.
- `backend/src/modules/orders/hold-expiry.sweeper.ts`: Handle 24h expiration for pending installment orders.
- `backend/src/app.module.ts`: Import `InstallmentsModule`.
- `backend/test/installments.e2e-spec.ts`: E2E tests for installment ordering and review lifecycle.

### Frontend (`frontend/src/`)
- `frontend/src/types/index.ts`: TypeScript interfaces for `InstallmentApplication`, `InstallmentProvider`, `InstallmentStatus`.
- `frontend/src/services/installmentService.ts`: Axios client service for installment APIs.
- `frontend/src/components/storefront/checkout/InstallmentFormCard.tsx`: Reusable installment plan selector, financial calculator, CCCD input, and R2 image uploader.
- `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`: Integrate `INSTALLMENT` payment option and form submission.
- `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx`: Display installment status badge and prepayment instructions.
- `frontend/src/pages/Admin/Installments/AdminInstallmentsPage.tsx`: Staff dashboard for listing, filtering, and reviewing installment applications.
- `frontend/src/pages/Admin/Installments/InstallmentReviewModal.tsx`: Modal for viewing CCCD photos, applicant data, and approving/rejecting with notes.
- `frontend/src/components/admin/AdminSidebar.tsx`: Add "Hồ sơ trả góp" menu item with active badge.
- `frontend/src/App.tsx`: Register `/admin/installments` route with `ROLES.STAFF` and `ROLES.ADMIN`.

---

## Phase 1: Database Schema & Migration

### Task 1: Update Prisma Schema & Push to Database

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Edit `backend/prisma/schema.prisma`**
Add `INSTALLMENT` to `PaymentMethod`. Add `InstallmentProvider` and `InstallmentStatus` enums. Add `InstallmentApplication` model and back-relations in `Order` and `User`.

- [ ] **Step 2: Push schema changes to database**
Run: `npx --prefix backend prisma db push`
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Generate Prisma Client**
Run: `npx --prefix backend prisma generate`
Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**
```bash
git add backend/prisma/schema.prisma
git commit -m "feat(db): add InstallmentApplication model and enums to prisma schema"
```

---

## Phase 2: Backend Module Development

### Task 2: Implement Installment DTOs

**Files:**
- Create: `backend/src/modules/installments/dto/create-installment-application.dto.ts`
- Create: `backend/src/modules/installments/dto/review-installment.dto.ts`
- Create: `backend/src/modules/installments/dto/query-installment.dto.ts`

- [ ] **Step 1: Create `create-installment-application.dto.ts`**
Define validation rules:
- `provider`: `IsEnum(InstallmentProvider)`
- `termMonths`: `IsInt`, `IsIn([3, 6, 9, 12])`
- `prepayPercent`: `IsInt`, `IsIn([0, 20, 30, 50])`
- `fullName`: `IsString`, `MinLength(2)`
- `citizenId`: `IsString`, `Matches(/^[0-9]{12}$/)` (CCCD 12 numbers)
- `birthDate`: `IsISO8601`
- `phoneNumber`: `IsString`, `Matches(/^(0[3|5|7|8|9])[0-9]{8}$/)`
- `currentAddress`: `IsString`, `MinLength(5)`
- `incomeRange`: `IsString`
- `cccdFrontUrl`: `IsUrl`
- `cccdBackUrl`: `IsUrl`

- [ ] **Step 2: Create `review-installment.dto.ts`**
Define `status` (`APPROVED` | `REJECTED`), `staffNotes` (optional string), `rejectionReason` (optional string, required if status is REJECTED).

- [ ] **Step 3: Create `query-installment.dto.ts`**
Define pagination (`page`, `limit`), `status` filter, `provider` filter, and search string `search`.

- [ ] **Step 4: Commit**
```bash
git add backend/src/modules/installments/dto/
git commit -m "feat(backend): add installment DTOs with validation constraints"
```

### Task 3: Implement Installment Service & Controller

**Files:**
- Create: `backend/src/modules/installments/installments.service.ts`
- Create: `backend/src/modules/installments/installments.controller.ts`
- Create: `backend/src/modules/installments/installments.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Implement `installments.service.ts`**
Functions:
- `findAll(query: QueryInstallmentDto)`: Paginated query with filters and search across `orderNumber`, `fullName`, `phoneNumber`, `citizenId`.
- `findById(id: string)`: Return application with full order items, user details, and reviewer info.
- `findByOrderId(orderId: string, userId?: string)`: For customer order tracking.
- `review(id: string, staffId: string, dto: ReviewInstallmentDto)`:
  - If `APPROVED`: transition order to `CONFIRMED`, send email.
  - If `REJECTED`: transition order to `CANCELLED`, release `reservedQty` back to `availableQty`, send email with reason.

- [ ] **Step 2: Implement `installments.controller.ts`**
- `GET /api/installments/my`: Get current user's installment applications.
- `GET /api/installments/order/:orderId`: Get installment details for specific order.
- `GET /api/admin/installments`: Role guard `ADMIN` & `STAFF`, paginated list.
- `GET /api/admin/installments/:id`: Role guard `ADMIN` & `STAFF`, detail view.
- `PATCH /api/admin/installments/:id/review`: Role guard `ADMIN` & `STAFF`, execute review.

- [ ] **Step 3: Register in `installments.module.ts` and `app.module.ts`**
Provide `InstallmentsService`, export if needed, wire into NestJS dependency tree.

- [ ] **Step 4: Commit**
```bash
git add backend/src/modules/installments/ backend/src/app.module.ts
git commit -m "feat(backend): implement installments service, controller, and module"
```

### Task 4: Integrate Orders Service & 24h Expiry Sweeper

**Files:**
- Modify: `backend/src/modules/orders/dto/order.dto.ts`
- Modify: `backend/src/modules/orders/orders.service.ts`
- Modify: `backend/src/modules/orders/hold-expiry.sweeper.ts`

- [ ] **Step 1: Update `CreateOrderDto`**
Add `paymentMethod: PaymentMethod` and `installmentData?: CreateInstallmentApplicationDto`.

- [ ] **Step 2: Update `orders.service.ts` createOrder flow**
- When `paymentMethod === PaymentMethod.INSTALLMENT`:
  - Calculate `prepayAmount = totalAmount * prepayPercent / 100`
  - Calculate `loanAmount = totalAmount - prepayAmount`
  - Calculate `monthlyAmount = loanAmount / termMonths`
  - Set `holdExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)` (24 hours).
  - Create `Payment` record with `method: INSTALLMENT, status: PENDING`.
  - Create `InstallmentApplication` linked to `order.id` inside the Prisma transaction.

- [ ] **Step 3: Update `hold-expiry.sweeper.ts`**
When expiring orders with `paymentMethod === INSTALLMENT`:
- Update `InstallmentApplication.status = CANCELLED`.
- Return inventory `reservedQty -> availableQty`.

- [ ] **Step 4: Run backend tests**
Run: `npm --prefix backend test`
Expected: All tests pass.

- [ ] **Step 5: Commit**
```bash
git add backend/src/modules/orders/
git commit -m "feat(backend): integrate 24h stock hold and installment application in orders service"
```

---

## Phase 3: Frontend Storefront Integration

### Task 5: Frontend Types & Installment Service

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/services/installmentService.ts`

- [ ] **Step 1: Update `frontend/src/types/index.ts`**
Export `InstallmentProvider`, `InstallmentStatus`, `InstallmentApplication`, and update `CreateOrderDto`.

- [ ] **Step 2: Create `installmentService.ts`**
Axios calls:
- `getMyInstallments()`
- `getInstallmentByOrderId(orderId: string)`
- `getAdminInstallments(params)`
- `getAdminInstallmentById(id: string)`
- `reviewInstallment(id: string, data)`

- [ ] **Step 3: Commit**
```bash
git add frontend/src/types/index.ts frontend/src/services/installmentService.ts
git commit -m "feat(frontend): add installment types and api service"
```

### Task 6: Storefront Checkout Installment Form Card

**Files:**
- Create: `frontend/src/components/storefront/checkout/InstallmentFormCard.tsx`
- Modify: `frontend/src/pages/storefront/Checkout/CheckoutPage.tsx`

- [ ] **Step 1: Build `InstallmentFormCard.tsx`**
- Provider selection: `Home Credit` (0% lãi suất) or `FE Credit` (0% lãi suất).
- Term options: 3, 6, 9, 12 months.
- Prepayment options: 0%, 20%, 30%, 50%.
- Dynamic computation box: Prepayment amount, Loan amount, Monthly installment amount.
- Applicant personal inputs: Full name, CCCD (12 digits check), Date of birth, Phone number, Address, Income range.
- 2-Sided CCCD Image Uploader with preview and file size check (<= 5MB, JPG/PNG/WebP).

- [ ] **Step 2: Wire into `CheckoutPage.tsx`**
- Add 4th payment method: `INSTALLMENT`.
- On submit: validate installment fields before calling `orderService.createOrder(...)`.
- On success: navigate to order success page showing installment status.

- [ ] **Step 3: Update `OrderDetailPage.tsx`**
Render installment banner: provider name, monthly installment amount, prepay amount, status badge.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/components/storefront/checkout/ frontend/src/pages/storefront/Checkout/ frontend/src/pages/storefront/Orders/
git commit -m "feat(frontend): integrate installment application form into checkout and order details"
```

---

## Phase 4: Frontend Admin Portal

### Task 7: Admin Installments List & Review Modal

**Files:**
- Create: `frontend/src/pages/Admin/Installments/AdminInstallmentsPage.tsx`
- Create: `frontend/src/pages/Admin/Installments/InstallmentReviewModal.tsx`
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Build `InstallmentReviewModal.tsx`**
- Show applicant details: Full name, CCCD, phone, birth date, address, declared income.
- Side-by-side or tabbed high-resolution view of CCCD Front & Back with zoom.
- Order and installment package summary (prepayment, monthly, term, product name).
- Action buttons: "Duyệt hồ sơ" (confirmation modal) and "Từ chối" (requires rejection reason input).

- [ ] **Step 2: Build `AdminInstallmentsPage.tsx`**
- Ant Design / Tailwind layout with statistic cards (Total Pending, Total Approved, Total Rejected).
- Tabbed filters: `Tất cả`, `Chờ thẩm định` (badge count), `Đã duyệt`, `Đã từ chối`.
- Search input by order number, customer name, phone, CCCD.
- Table with columns: Order Code, Applicant Name, Phone, CCCD, Provider, Package, Status, Submission Date, Action.

- [ ] **Step 3: Update `AdminSidebar.tsx` and `App.tsx`**
- Add navigation item under Order Management with CreditCard icon.
- Protect route `/admin/installments` with `RoleGuard` (`STAFF`, `ADMIN`).

- [ ] **Step 4: Verify frontend build & lint**
Run: `npm --prefix frontend run build` and `npx --prefix frontend oxlint src`
Expected: 0 errors.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages/Admin/Installments/ frontend/src/components/admin/AdminSidebar.tsx frontend/src/App.tsx
git commit -m "feat(admin): implement installment applications review dashboard"
```

---

## Phase 5: Verification & End-to-End Testing

### Task 8: End-to-End Verification

**Files:**
- Execute verification commands and Playwright tests.

- [ ] **Step 1: Backend test suite run**
Run: `npm --prefix backend test`
Expected: All backend tests pass.

- [ ] **Step 2: Frontend production build**
Run: `npm --prefix frontend run build`
Expected: Clean build without typescript or bundling errors.

- [ ] **Step 3: Playwright E2E browser verification**
- Navigate to Storefront Checkout, submit test installment order.
- Log in to Admin portal, open `/admin/installments`.
- Open review modal, approve the application.
- Verify order status updates to `CONFIRMED`.

- [ ] **Step 4: Final commit and summary**
```bash
git commit --allow-empty -m "chore: complete installment module refactor verification"
```
