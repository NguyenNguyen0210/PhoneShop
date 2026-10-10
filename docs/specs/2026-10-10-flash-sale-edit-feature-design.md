# Design Specification: Flash Sale Edit Feature

**Date:** 2026-10-10  
**Status:** Approved  
**Author:** Nguyen Nguyen & Antigravity  

## 1. Overview & Objectives

Currently, the Phone Shop system allows managers and administrators to view, create, end early, and delete Flash Sale campaigns. However, it lacks the ability to **edit** an existing Flash Sale campaign. When promotional dates shift or stock quotas need adjustment, managers currently have to delete and recreate campaigns, which risks losing transaction associations and disruption.

This feature adds comprehensive support for editing Flash Sale campaigns across Backend and Frontend with strict business validation based on campaign status (`UPCOMING`, `ACTIVE`, `ENDED`).

---

## 2. Business Rules & Permissions

### 2.1 Role-Based Access Control (RBAC)
- Only `MANAGER` and `ADMIN` roles can edit Flash Sale campaigns.
- Guarded by `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.MANAGER, Role.ADMIN)`.

### 2.2 Status-Based Editing Constraints

| Campaign Status | Allowed Actions | Disallowed Actions |
|---|---|---|
| **ENDED** (`isActive === false` OR `endAt < now`) | No modifications allowed. System returns `400 Bad Request`. | Any edits. Button disabled on UI. |
| **UPCOMING** (`now < startAt` AND `isActive === true`) | Full edit: `name`, `description`, `startAt`, `endAt`, add/remove/edit items (`flashPrice`, `stockLimit`). | Cannot set `startAt >= endAt` or `endAt <= now`. Cannot cause time overlap on items. |
| **ACTIVE** (`startAt <= now <= endAt` AND `isActive === true`) | - Edit `name`, `description`.<br>- Extend or shorten `endAt` (must be `endAt > now`).<br>- Add new variant items.<br>- For items with `soldCount === 0`: edit `flashPrice`, edit `stockLimit`, remove item.<br>- For items with `soldCount > 0`: edit `stockLimit` (must be `>= soldCount`). | - **Cannot change `startAt`** (start time is locked).<br>- For items with `soldCount > 0`: **cannot delete item**, **cannot change `flashPrice`**.<br>- Cannot reduce `stockLimit < soldCount`. |

### 2.3 Item Validation Rules
1. **No duplicate variants** in the payload.
2. **Variant state:** Variant must exist and `variant.isActive !== false`.
3. **Price constraint:** `flashPrice < Number(variant.price)`.
4. **Stock constraint:**
   - For new items or items with `soldCount === 0`: `stockLimit <= variant.inventory.availableQty`.
   - For items with `soldCount > 0`: `stockLimit >= soldCount` and `stockLimit <= variant.inventory.availableQty + soldCount`.
5. **Overlapping detection:** No variant can participate in two active/upcoming flash sales at the same time window (excluding the campaign currently being edited).

---

## 3. Backend Architecture

### 3.1 REST API Endpoint
- **Method & Path:** `PUT /flash-sales/:id`
- **Request Body:** `CreateFlashSaleDto` / `UpdateFlashSaleDto`
  ```typescript
  export class FlashSaleItemDto {
    variantId: string;
    flashPrice: number;
    stockLimit: number;
  }

  export class CreateFlashSaleDto {
    name: string;
    description?: string;
    startAt: string;
    endAt: string;
    items: FlashSaleItemDto[];
  }
  ```
- **Responses:**
  - `200 OK`: Returns updated `FlashSaleCampaign` including `items`.
  - `400 Bad Request`: Validation failure (status ended, price >= original, invalid dates, stock limit violation, attempt to delete/change price of sold items).
  - `404 Not Found`: Campaign or variant not found.

### 3.2 Service Implementation (`FlashSalesService.update`)
1. Fetch existing campaign with `items` and current date `now = new Date()`.
2. Check if campaign exists (throw 404) and if campaign has ended (throw 400).
3. If `ACTIVE`:
   - Enforce `startAt = existingCampaign.startAt`.
   - Ensure `endAt > now`.
   - Ensure all existing items with `soldCount > 0` are present in `dto.items`, with identical `flashPrice` and `stockLimit >= soldCount`.
4. If `UPCOMING`:
   - Validate `startAt < endAt` and `endAt > now`.
5. Check variant overlap query excluding `campaignId: id`.
6. Run database mutations in `prisma.$transaction`:
   - Identify items to delete: existing items not in `dto.items` (all verified to have `soldCount === 0`).
   - Identify items to update: existing items present in `dto.items`.
   - Identify items to create: `dto.items` with `variantId` not previously in the campaign.
   - Update `FlashSaleCampaign` record.
   - Return updated campaign with `items`.

---

## 4. Frontend Architecture

### 4.1 Service Layer (`flashSaleService.ts`)
- Add method:
  ```typescript
  updateCampaign: async (id: string, data: CreateFlashSaleInput): Promise<FlashSaleCampaign> => {
    const res = await apiClient.put(`/flash-sales/${id}`, data);
    return res.data?.data ?? res.data;
  }
  ```

### 4.2 Admin Table (`FlashSaleTab.tsx`)
- In `columns`: Add an "Sửa" (`EditOutlined`) button in the actions column.
- For `ENDED` campaigns: Button is disabled with tooltip *"Chiến dịch đã kết thúc, không thể chỉnh sửa"*.
- For `UPCOMING` & `ACTIVE` campaigns: Clicking "Sửa" fetches the full campaign detail (`flashSaleService.getCampaignDetail(record.id)`) and opens `FlashSaleFormModal` passing `campaignToEdit`.

### 4.3 Form Modal (`FlashSaleFormModal.tsx`)
- Add prop `campaignToEdit?: FlashSaleCampaign | null`.
- When `campaignToEdit` is provided (Edit Mode):
  - Pre-populate form values: `name`, `description`, `dateRange`.
  - Pre-populate `campaignItems` with existing items, including `soldCount`.
  - When status is `ACTIVE`:
    - Disable the start date picker in `RangePicker` (only allow changing end date).
    - In item rows with `soldCount > 0`:
      - Disable delete button with tooltip *"Đã có {soldCount} lượt mua, không thể xóa"*.
      - Disable `flashPrice` input.
      - Enforce `min={soldCount}` on `stockLimit`.
- On submit: call `flashSaleService.updateCampaign(campaignToEdit.id, payload)` instead of `createCampaign`.

---

## 5. Testing Strategy

### 5.1 Backend Unit Tests (`flash-sales.service.spec.ts`)
- Successfully update an `UPCOMING` campaign.
- Successfully update an `ACTIVE` campaign (keeping startAt, adjusting endAt, adjusting stockLimit).
- Reject update on an `ENDED` campaign.
- Reject changing `flashPrice` or removing item when `soldCount > 0` on an `ACTIVE` campaign.
- Reject setting `stockLimit < soldCount`.
- Reject overlapping campaigns.

### 5.2 Frontend Tests
- Verify `FlashSaleTab` renders the "Sửa" button and disables it when `ENDED`.
- Verify `FlashSaleFormModal` pre-populates fields and disables locked inputs for `ACTIVE` campaigns.
- Verify calling `flashSaleService.updateCampaign` upon submitting edit form.
