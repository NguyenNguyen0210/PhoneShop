# Design Spec: Product Detail Drawer for Admin & Staff

**Date:** 2026-10-10  
**Status:** Approved  
**Author:** Nguyen Nguyen & Antigravity  

---

## 1. Context & Objectives

### 1.1. Context
Currently on the Admin Products management page (`/admin/products`), the eye icon button (`EyeOutlined`) in the action column simply opens the external storefront page (`/products/:id` or `/products/:slug`) in a new browser tab. 

Admin and Staff users need a direct, in-depth view of all internal product details (Brand, Category, Suppliers, Inbound batch information, Variants & Inventory, Specs, and Description) right inside the product management dashboard without navigating away from the table or switching contexts.

### 1.2. Objectives
- Replace the storefront redirect behavior of the eye icon button on `AdminProductsPage` with an in-place **Product Detail Drawer** (`ProductDetailDrawer`).
- Provide an all-in-one read-only inspection view displaying:
  1. General product profile (Name, code, slug, condition, brand, category, warranty months, status, high-resolution thumbnail).
  2. Supplier & inbound information derived from warehouse inbound stock movements.
  3. Variant matrix (SKUs, colors, RAM/storage, list price, cost price, real-time available stock).
  4. OEM Technical Specifications (Specs table: Display, CPU, Camera, Battery, OS...).
  5. Full product description text.
- Provide quick footer actions:
  - Open external storefront in a new tab (secondary action preserved).
  - Open `ProductEditModal` directly for instant updating (primary action).
  - Close the drawer.

---

## 2. User Experience & Interaction Design

### 2.1. Triggering from `AdminProductsPage`
- **Action Column Update:**
  - The eye icon (`EyeOutlined`) button's tooltip is changed from `"Xem ngoài web"` to `"Xem chi tiết sản phẩm"`.
  - Clicking this button sets `detailProductId = record.id` and sets `isDetailDrawerOpen = true`.
- **Drawer Specifications:**
  - Component: Ant Design `Drawer`.
  - Placement: Right-hand side slide-in.
  - Width: `720px` on desktop (responsive on smaller screens `width="min(100vw, 720px)"`).
  - Scroll behavior: Body is scrollable with smooth padding and clean visual grouping cards.
  - Destroy on close: `destroyOnClose={true}` to ensure fresh data fetching on open.

### 2.2. Content Blocks Inside the Drawer
1. **Header:**
   - Device icon + Product Name.
   - Status badge: `ACTIVE` ("Đang kinh doanh", green tag) or `DRAFT` / `INACTIVE` ("Tạm dừng", slate tag).
   - Display Code / SKU & Slug.
   - Close (`X`) button.
2. **Block 1 - General Product Profile Card:**
   - Large image preview with click-to-zoom (`Image` preview).
   - Key attributes: Brand (`brand.name`), Category (`category.name`), Condition (`NEW`: "Máy mới 100%" / `LIKE_NEW`), Warranty (`12 tháng chính hãng`), Total variants count, Total inventory stock available.
3. **Block 2 - Supplier & Inbound Information Card:**
   - Amber-themed card highlighting the latest supplier who fulfilled stock for this product.
   - Displays Supplier Name, Contact Person, Phone Number, and details of the latest inbound batch (date, quantity, cost price).
   - If no inbound record exists yet: displays a clean informational badge *"Chưa có dữ liệu nhập kho từ Nhà cung cấp cho sản phẩm này"*.
4. **Block 3 - Variants & Inventory Table:**
   - Ant Design compact table detailing each SKU variant:
     * Color swatch / Color name.
     * RAM & Storage configuration.
     * SKU code (monospace font).
     * List selling price (formatted VND).
     * Cost price / Giá vốn (formatted VND).
     * Available quantity vs total inventory.
5. **Block 4 - Technical Specifications (Specs):**
   - Formatted 2-column key-value grid for all specifications stored in `product.specs` (e.g. Screen size, Chipset, Rear Camera, Battery capacity, Charging).
6. **Block 5 - Product Description:**
   - Formatted paragraph displaying `product.description` and `product.shortDescription`.
7. **Footer Actions:**
   - Left side: Button *"Xem trên Storefront"* (`ExportOutlined`) to open the public storefront URL in a new tab if required.
   - Right side:
     * Button *"Đóng"* (closes the drawer).
     * Button *"Chỉnh sửa sản phẩm"* (`EditOutlined`, `type="primary"`, closes drawer and opens `ProductEditModal`).

---

## 3. Architecture & Data Flow

### 3.1. Frontend Component Structure
- `frontend/src/pages/Admin/Products/components/ProductDetailDrawer.tsx`:
  - Props:
    ```typescript
    export interface ProductDetailDrawerProps {
      open: boolean;
      productId: string | null;
      onClose: () => void;
      onOpenEdit?: (productId: string) => void;
    }
    ```
- State inside Drawer:
  - `loading: boolean`: Loading state while fetching details.
  - `product: Product | null`: Full product entity loaded from `productService.getProductById(productId)`.
  - `latestSupplierInfo: { supplier: Supplier | null; movement: StockMovement | null } | null`: Derived latest supplier inbound data.

### 3.2. Data Loading Sequence
1. Upon `open && productId`:
   - Set `loading = true`.
   - Call `productService.getProductById(productId)`.
   - Concurrently fetch `supplierService.getSuppliers(true)` to build a supplier lookup map.
   - For variants in the loaded product, query the latest ledger transactions via `inventoryService.getVariantLedger(variantId, { page: 1, limit: 5 })` for the first available variant(s).
   - Find the most recent `INBOUND` movement where `referenceType === 'SUPPLIER'` or where note contains `[NCC: ...]`.
   - Match with the supplier map to resolve full supplier details.
   - Set `product` and `latestSupplierInfo`.
   - Set `loading = false`.

### 3.3. Error Handling & Edge Cases
- **Product not found / network error:** Display Ant Design `message.error` and close gracefully or show empty state.
- **No variants:** Table renders empty state *"Sản phẩm chưa có biến thể SKU nào"*.
- **No specs:** Specs block renders *"Chưa cập nhật thông số kỹ thuật"*.
- **No supplier inbound record:** Informational message without breaking the UI.

---

## 4. Test Strategy
- Unit test suite: `frontend/src/pages/Admin/Products/components/__tests__/ProductDetailDrawer.spec.tsx`:
  1. Render drawer with loading state when opening.
  2. Render product basic information (name, brand, category, warranty, status).
  3. Render variants table with prices and stock levels.
  4. Render latest supplier information when inbound ledger is available.
  5. Render fallback message when no supplier inbound record exists.
  6. Trigger `onOpenEdit` when clicking "Chỉnh sửa sản phẩm".
  7. Open storefront URL in new window when clicking "Xem trên Storefront".
  8. Close drawer when clicking "Đóng" or close icon.
- Regression test suite: `frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx`:
  - Verify that clicking the eye icon opens `ProductDetailDrawer` instead of calling `window.open` directly.
