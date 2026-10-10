# Flash Sale Edit Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Flash Sale Edit feature across Backend and Frontend with strict business validation based on campaign status (UPCOMING, ACTIVE, ENDED).

**Architecture:** A RESTful `PUT /flash-sales/:id` endpoint in NestJS handles campaign updates within a Prisma database transaction, strictly enforcing business rules depending on status (UPCOMING vs ACTIVE vs ENDED). On the frontend, React (Ant Design) extends `flashSaleService` and upgrades `FlashSaleFormModal` to support prefilled editing, locking non-editable fields based on status, accessible directly from `FlashSaleTab`.

**Tech Stack:** NestJS, Prisma ORM, Jest (Backend); React 18, Ant Design 5, TypeScript, Vitest, Testing Library (Frontend).

---

## Parallel Execution Tracks

```
┌────────────────────────────────────────────────────────┐
│                   Parallel Tracks                      │
├───────────────────────────┬────────────────────────────┤
│ Track A: Backend          │ Track B: Frontend          │
│ • Task 1: Update API &    │ • Task 3: Service & Modal  │
│   Service Business Logic  │   Edit Support             │
│ • Task 2: Backend Unit    │ • Task 4: Action Button &  │
│   Test Suite              │   Frontend Component Tests │
└───────────────────────────┴────────────────────────────┘
                            │
                            ▼
               ┌───────────────────────────┐
               │ Track C: Integration      │
               │ • Task 5: End-to-End      │
               │   Verification            │
               └───────────────────────────┘
```

---

## File Structure & Responsibilities

| File Path | Responsibility |
|---|---|
| `backend/src/modules/flash-sales/flash-sales.controller.ts` | Expose `PUT /flash-sales/:id` protected by `JwtAuthGuard`, `RolesGuard`, and `MANAGER`/`ADMIN` roles. |
| `backend/src/modules/flash-sales/flash-sales.service.ts` | Implement `update(id, dto)` with status checking (`UPCOMING`, `ACTIVE`, `ENDED`), item validation, quota validation, and Prisma transaction. |
| `backend/src/modules/flash-sales/__tests__/flash-sales.service.spec.ts` | Test all validation branches and status transitions for `update()`. |
| `frontend/src/services/flashSaleService.ts` | Add `updateCampaign(id, data)` API client method. |
| `frontend/src/pages/Admin/Promotions/components/FlashSaleFormModal.tsx` | Extend modal to accept `campaignToEdit`, prefill values, enforce locked fields for `ACTIVE` campaigns, and call `updateCampaign` on submit. |
| `frontend/src/pages/Admin/Promotions/components/FlashSaleTab.tsx` | Add "Sửa" button to actions column, fetch campaign detail on click, disable for `ENDED` status. |
| `frontend/src/pages/Admin/Promotions/__tests__/AdminPromotionsPage.spec.tsx` | Test edit button rendering, opening modal in edit mode, and submitting updates. |

---

## Task Decomposition

### Track A: Backend Implementation

#### Task 1: Backend Controller & Service Update Logic

**Files:**
- Modify: `backend/src/modules/flash-sales/flash-sales.controller.ts`
- Modify: `backend/src/modules/flash-sales/flash-sales.service.ts`

- [ ] **Step 1: Add PUT endpoint to FlashSalesController**
In `backend/src/modules/flash-sales/flash-sales.controller.ts`:
Add `@Put(':id')` with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.MANAGER, Role.ADMIN)`.
```typescript
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật chiến dịch Flash Sale (MANAGER/ADMIN)' })
  update(@Param('id') id: string, @Body() dto: CreateFlashSaleDto) {
    return this.flashSalesService.update(id, dto);
  }
```

- [ ] **Step 2: Implement update logic in FlashSalesService**
In `backend/src/modules/flash-sales/flash-sales.service.ts`:
Implement `async update(id: string, dto: CreateFlashSaleDto)`:
1. Fetch existing campaign with `items` and check existence.
2. Check if ended (`!campaign.isActive || campaign.endAt < now`): throw `BadRequestException('Chiến dịch Flash Sale đã kết thúc, không thể chỉnh sửa')`.
3. Check status:
   - If `ACTIVE` (`campaign.startAt <= now && campaign.endAt >= now`):
     - Retain `startAt = campaign.startAt`.
     - Check `endAt > now`, else throw `BadRequestException('Thời gian kết thúc phải ở tương lai')`.
     - Validate existing items with `soldCount > 0`: must exist in `dto.items`, cannot change `flashPrice`, `stockLimit >= item.soldCount`.
   - If `UPCOMING` (`now < campaign.startAt`):
     - Check `startAt < endAt` and `endAt > now`.
4. Validate variants: check uniqueness, check variant exists and `isActive !== false`, check `flashPrice < variant.price`, check stock limit against `availableQty`.
5. Check overlap with other active campaigns (`campaignId != id`).
6. In `prisma.$transaction`:
   - Delete items not in `dto.items` (all verified `soldCount === 0`).
   - Upsert/update items.
   - Update campaign.

- [ ] **Step 3: Run existing tests to verify non-breaking changes**
Run: `npm test -- src/modules/flash-sales/__tests__/flash-sales.service.spec.ts` in `backend`
Expected: 13 tests PASS.

- [ ] **Step 4: Commit Task 1**
```bash
git add backend/src/modules/flash-sales/flash-sales.controller.ts backend/src/modules/flash-sales/flash-sales.service.ts
git commit -m "feat(backend): add PUT endpoint and update logic for flash sales"
```

---

#### Task 2: Backend Unit Tests for Update Method

**Files:**
- Modify: `backend/src/modules/flash-sales/__tests__/flash-sales.service.spec.ts`

- [ ] **Step 1: Write unit tests covering update scenarios**
Add describe block `'update'` to `flash-sales.service.spec.ts`:
- Update UPCOMING campaign successfully.
- Update ACTIVE campaign successfully (locking startAt, extending endAt, updating stock).
- Reject update on ENDED campaign.
- Reject update if changing flashPrice of sold item in ACTIVE campaign.
- Reject update if deleting sold item in ACTIVE campaign.
- Reject update if reducing stockLimit < soldCount.
- Reject update if overlapping with another campaign.

- [ ] **Step 2: Run test suite to verify tests pass**
Run: `npm test -- src/modules/flash-sales/__tests__/flash-sales.service.spec.ts` in `backend`
Expected: All tests PASS.

- [ ] **Step 3: Commit Task 2**
```bash
git add backend/src/modules/flash-sales/__tests__/flash-sales.service.spec.ts
git commit -m "test(backend): add comprehensive unit tests for flash sale update"
```

---

### Track B: Frontend Implementation

#### Task 3: Frontend Service & FlashSaleFormModal Edit Support

**Files:**
- Modify: `frontend/src/services/flashSaleService.ts`
- Modify: `frontend/src/pages/Admin/Promotions/components/FlashSaleFormModal.tsx`

- [ ] **Step 1: Add updateCampaign to flashSaleService**
In `frontend/src/services/flashSaleService.ts`:
```typescript
  updateCampaign: async (id: string, data: CreateFlashSaleInput): Promise<FlashSaleCampaign> => {
    const res = await apiClient.put(`/flash-sales/${id}`, data);
    return res.data?.data ?? res.data;
  },
```

- [ ] **Step 2: Update FlashSaleFormModal to support Edit Mode**
In `frontend/src/pages/Admin/Promotions/components/FlashSaleFormModal.tsx`:
- Add `campaignToEdit?: FlashSaleCampaign | null` to props.
- Add state `isEditMode = !!campaignToEdit`.
- Calculate campaign status (`UPCOMING`, `ACTIVE`, `ENDED`).
- When `campaignToEdit` changes and `open` is true:
  - Prefill `name`, `description`, `dateRange`.
  - Prefill `campaignItems` with existing items including `soldCount`.
- If status is `ACTIVE`:
  - In RangePicker: disable start date modification (`disabled={[true, false]}`).
  - In items table: disable delete button if `soldCount > 0`, disable price edit if `soldCount > 0`, set `min={soldCount}` for stockLimit.
- In `handleSubmit`:
  - If `isEditMode`: call `flashSaleService.updateCampaign(campaignToEdit.id, payload)`.
  - If create: call `flashSaleService.createCampaign(payload)`.

- [ ] **Step 3: Verify build / TypeScript in frontend**
Run: `npm run build` or typecheck in `frontend`
Expected: Compile without errors.

- [ ] **Step 4: Commit Task 3**
```bash
git add frontend/src/services/flashSaleService.ts frontend/src/pages/Admin/Promotions/components/FlashSaleFormModal.tsx
git commit -m "feat(frontend): support edit mode in flashSaleService and FlashSaleFormModal"
```

---

#### Task 4: Frontend FlashSaleTab Action & Test Suite

**Files:**
- Modify: `frontend/src/pages/Admin/Promotions/components/FlashSaleTab.tsx`
- Modify: `frontend/src/pages/Admin/Promotions/__tests__/AdminPromotionsPage.spec.tsx`

- [ ] **Step 1: Add "Sửa" action in FlashSaleTab**
In `frontend/src/pages/Admin/Promotions/components/FlashSaleTab.tsx`:
- Add `editingCampaign` state.
- Add `EditOutlined` import.
- In `columns.actions`:
  - If `status === 'ENDED'`: render disabled button with tooltip *"Chiến dịch đã kết thúc, không thể chỉnh sửa"*.
  - If `status === 'ACTIVE' || status === 'UPCOMING'`: render active button "Sửa".
  - Clicking "Sửa" fetches `flashSaleService.getCampaignDetail(record.id)`, sets `editingCampaign`, and opens modal.
- Pass `campaignToEdit={editingCampaign}` to `FlashSaleFormModal`.

- [ ] **Step 2: Write frontend unit tests**
In `frontend/src/pages/Admin/Promotions/__tests__/AdminPromotionsPage.spec.tsx`:
- Add test: renders "Sửa" button for upcoming/active campaigns and disables it for ended campaigns.
- Add test: clicking "Sửa" opens the modal with campaign data prefilled and calls `updateCampaign` on submit.

- [ ] **Step 3: Run frontend unit tests**
Run: `npm test -- src/pages/Admin/Promotions/__tests__/AdminPromotionsPage.spec.tsx --run` in `frontend`
Expected: All tests PASS.

- [ ] **Step 4: Commit Task 4**
```bash
git add frontend/src/pages/Admin/Promotions/components/FlashSaleTab.tsx frontend/src/pages/Admin/Promotions/__tests__/AdminPromotionsPage.spec.tsx
git commit -m "feat(frontend): add edit button to FlashSaleTab and update tests"
```

---

### Track C: Integration Verification

#### Task 5: End-to-End Verification

- [ ] **Step 1: Run full backend test suite for flash sales**
Run: `npm test -- src/modules/flash-sales/__tests__/flash-sales.service.spec.ts` in `backend`
Expected: All tests PASS.

- [ ] **Step 2: Run full frontend test suite for promotions**
Run: `npm test -- src/pages/Admin/Promotions/__tests__/AdminPromotionsPage.spec.tsx --run` in `frontend`
Expected: All tests PASS.

- [ ] **Step 3: Final Git Commit and Status Check**
Run: `git status`
Expected: Clean working tree.
