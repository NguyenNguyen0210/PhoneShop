# Cleanup Dead Code and Obsolete Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dọn dẹp các file code chết, file shim thừa ở Frontend và các script kiểm tra thủ công cũ ở Backend.

**Architecture:** Cập nhật import `AdminDashboard` trong `AppRoutes.tsx` trỏ trực tiếp đến `AdminDashboardPage.tsx`, sau đó xóa các component/file thừa và xác minh lại toàn bộ hệ thống bằng linter, test runner và production build.

**Tech Stack:** React, TypeScript, Vite, Vitest, Node.js.

---

### Task 1: Dọn dẹp Code chết và Shims ở Frontend (Parallel Worker 1)

**Files:**
- Modify: `frontend/src/routes/AppRoutes.tsx:29`
- Delete: `frontend/src/components/admin/AdminSidebar.tsx`
- Delete: `frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx`
- Delete: `frontend/src/pages/Admin/Dashboard/AdminDashboard.tsx`
- Delete: `frontend/src/pages/storefront/Products/ProductDetailPage.tsx`

- [x] **Step 1: Cập nhật import trong `AppRoutes.tsx`**
Trong `frontend/src/routes/AppRoutes.tsx`:
Đổi dòng:
```tsx
import { AdminDashboard } from '../pages/Admin/Dashboard/AdminDashboard';
```
Thành:
```tsx
import { AdminDashboard } from '../pages/Admin/Dashboard/AdminDashboardPage';
```

- [x] **Step 2: Xóa các file dead code và shim thừa**
Xóa các file:
- `frontend/src/components/admin/AdminSidebar.tsx`
- `frontend/src/components/admin/__tests__/AdminSidebar.spec.tsx`
- `frontend/src/pages/Admin/Dashboard/AdminDashboard.tsx`
- `frontend/src/pages/storefront/Products/ProductDetailPage.tsx`

- [x] **Step 3: Kiểm tra linter và commit**
Run: `npx oxlint src` trong `frontend`
```bash
git add -A frontend/
git commit -m "refactor(frontend): remove unused AdminSidebar, test, and legacy shims"
```

---

### Task 2: Dọn dẹp Scripts kiểm tra thủ công ở Backend (Parallel Worker 2)

**Files:**
- Delete: `backend/test/seed_verification.ts`
- Delete: `backend/test/pagination_verification.ts`
- Delete: `backend/test/wishlist_verification.ts`

- [x] **Step 1: Xóa các script kiểm tra thủ công**
Xóa các file:
- `backend/test/seed_verification.ts`
- `backend/test/pagination_verification.ts`
- `backend/test/wishlist_verification.ts`

- [x] **Step 2: Commit**
```bash
git add -A backend/test/
git commit -m "chore(backend): remove obsolete verification scripts"
```

---

### Task 3: Xác minh toàn diện hệ thống (Verification & Quality Assurance)

**Files:**
- Verify: `frontend/`
- Verify: `backend/`

- [x] **Step 1: Chạy toàn bộ linter và typecheck**
Run: `npx oxlint src` và `npx tsc --noEmit` trong `frontend`
Run: `npm run build` trong `frontend`
Expected: 0 errors, build thành công.
