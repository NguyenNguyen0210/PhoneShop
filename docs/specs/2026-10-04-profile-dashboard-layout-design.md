# Technical Specification: Account Dashboard Architecture & Features Refactoring

- **Feature Name**: E-Commerce Account Dashboard (Sidebar Navigation, Order Filter Tabs, Address Book, Password Form)
- **Status**: Approved
- **Author**: Assistant & Nguyen
- **Date**: 2026-10-04
- **Target Branch**: `Nguyen`

---

## 1. Overview & Goals

### 1.1 Problem Statement
The current account profile page (`/profile`) rendered all account management modules sequentially in a single-column long scroll. This created visual clutter, forced users to scroll past empty states (orders, returns, tickets), and stretched form inputs (such as the 3 change-password inputs) across the entire width of desktop screens. Furthermore, the core e-commerce feature—an Address Book (Sổ địa chỉ)—was missing from the UI despite backend support.

### 1.2 Proposed Solution
Refactor `/profile` into a modern 2-column e-commerce dashboard (12-column grid: 3-column sticky sidebar + 9-column dynamic tab content), matching modern e-commerce standards (Shopee, Tiki, Lazada, CellphoneS).

Key enhancements:
1. **Sidebar Navigation (Col 3 / 25%)**: User mini-profile card, loyalty tier badge, flat list of 6 navigation items with badge counts, and a logout button.
2. **Main Content Area (Col 9 / 75%)**: Render only the active tab with clean card styling.
3. **URL & Deep-linking**: Synchronize active tab with URL query parameter (`?tab=...`), with full backward-compatibility for `/orders`, `#orders`, and `#password`.
4. **Order Management Improvements**: Horizontal filter tabs (`Tất cả`, `Chờ xác nhận`, `Đang giao hàng`, `Đã hoàn thành`, `Đã hủy`), badge counts per status, and a dedicated illustrated Empty State with a "Tiếp tục mua sắm" CTA button.
5. **Address Book (Sổ địa chỉ)**: Full CRUD integration with `addressService` and backend `/addresses` endpoints, supporting default address indicators, address tags (Home/Office), and an `AddressCreateModal`.
6. **Change Password Form Restructuring**: Stacked vertical inputs within `max-w-lg`, eye toggle for visibility, and responsive layout.

---

## 2. Layout & Architectural Specifications

### 2.1 Grid Layout
- **Container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-50`
- **Desktop (`md:` and above)**:
  - Sidebar: `md:col-span-3` (`sticky top-24 space-y-4 self-start`)
  - Content: `md:col-span-9` (`space-y-6`)
- **Mobile (`< md`)**:
  - Sidebar transforms into a horizontal scrollable navigation bar with icons and badges.
  - Content renders full-width underneath.

### 2.2 Navigation Tabs & Routing
| Tab Key | Label | Icon | Route & Sync | Content Description |
|---|---|---|---|---|
| `profile` | Hồ sơ cá nhân | `User` | `/profile?tab=profile` (default) | Avatar upload, personal info card, EditProfileModal |
| `orders` | Đơn hàng của tôi | `Package` | `/profile?tab=orders`, `/orders`, `#orders` | Order list, status filter tabs, empty state CTA |
| `addresses` | Sổ địa chỉ | `MapPin` | `/profile?tab=addresses` | Saved address cards, default tag, add/delete address |
| `returns` | Đổi trả & Hoàn tiền | `RotateCcw` | `/profile?tab=returns` | Return request list, status badges, cancel return |
| `tickets` | Khiếu nại (CSKH) | `Headphones` | `/profile?tab=tickets` | Ticket list, new ticket modal, chat conversation |
| `password` | Đổi mật khẩu | `ShieldCheck` / `Lock` | `/profile?tab=password`, `#password` | Stacked change password form (`max-w-lg`) |

---

## 3. Detailed Component Specifications

### 3.1 Sidebar Component (`ProfileSidebar.tsx`)
- **User Mini Card**:
  - Round avatar with fallback initial or avatar image.
  - Full name with truncation for long names.
  - Customer tier badge: `"Thành viên thân thiết"` (`bg-blue-50 text-blue-600 border border-blue-200`).
- **Nav Items**:
  - Each item renders an icon, label, and dynamic badge (orders count, address count).
  - Active state: `bg-blue-50 text-blue-600 font-bold border-l-4 border-blue-600`.
  - Inactive state: `text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium`.
- **Logout Button**:
  - Positioned at the bottom with a subtle divider: `text-rose-600 hover:bg-rose-50 rounded-xl`.
  - Triggers a confirmation dialog before calling `useAuthStore.logout()`.

### 3.2 Orders Tab (`OrdersTab.tsx` / Integrated)
- **Status Filter Tabs**:
  - Filter logic:
    - `ALL`: All orders
    - `PENDING`: Orders with status `PENDING`
    - `SHIPPING`: Orders with status `CONFIRMED`, `PROCESSING`, `SHIPPED`, or `DELIVERING`
    - `COMPLETED`: Orders with status `DELIVERED` or `COMPLETED`
    - `CANCELLED`: Orders with status `CANCELLED`
  - Badges displaying count per filtered category.
- **Empty State**:
  - Vector icon / illustration (`PackageOpen` / Shopping bag).
  - Informative text: "Bạn chưa có đơn hàng nào trong mục này."
  - Primary button: "Tiếp tục mua sắm" (`Link to="/"`) to encourage user engagement.

### 3.3 Address Book Tab (`AddressesTab.tsx`)
- **State Management**:
  - Loads addresses via `addressService.getAddresses()`.
  - Handles loading and error states.
- **Address Card**:
  - Recipient Name and Phone number.
  - Complete address string: street, ward, district, city.
  - Badge `[ Mặc định ]` (`bg-blue-600 text-white`) if `isDefault: true`.
  - Action buttons:
    - "Thiết lập mặc định" (calls `addressService.setDefaultAddress(id)`).
    - "Xóa" (calls `addressService.deleteAddress(id)` with confirm dialog).
- **Address Modal (`AddressCreateModal.tsx`)**:
  - Inputs: Recipient name, Phone number, City/Province, District, Ward, Address Line 1.
  - Checkbox: "Đặt làm địa chỉ mặc định".
  - Validation: Non-empty recipient name, valid VN phone number (10 digits), required city and street address.
  - Calls `addressService.createAddress(payload)` on submit.

### 3.4 Change Password Component (`ChangePasswordCard.tsx`)
- Form wrapper constraint: `max-w-lg` (512px).
- Stacked input layout:
  1. Mật khẩu hiện tại (`currentPassword` / `oldPassword`)
  2. Mật khẩu mới (`newPassword`, min 6 characters)
  3. Xác nhận mật khẩu mới (`confirmPassword`)
- Eye icon toggle button inside each password field to toggle text/password visibility.
- Clear error and success alert messages.

---

## 4. State Matrix & Edge Cases

| Screen / Component | Empty State | Loading State | Error State |
|---|---|---|---|
| **Orders Tab** | Illustration + "Tiếp tục mua sắm" button | Skeleton loader cards | Error banner with retry button |
| **Addresses Tab** | Illustration + "Thêm địa chỉ đầu tiên" | Skeleton loader | Error banner with retry button |
| **Returns Tab** | "Chưa có yêu cầu đổi trả nào" | Spinner | Error message alert |
| **Tickets Tab** | Integrated empty state | Spinner | Inline ticket error alert |
| **Change Password** | N/A | Submit button spinner (`Loader2`) | Inline alert banner (`AlertCircle`) |

---

## 5. Backward Compatibility & Navbar Synchronization
- Existing Navbar links (`/orders`, `/profile#password`, `/profile#orders`) continue to work seamlessly by parsing URL pathname and hash on initial mount and setting `activeTab`.
- Changing tabs updates the URL query string via `useSearchParams` or `navigate` without full page reload.

---

## 6. Verification & Testing Strategy
1. **Unit Tests**:
   - `ProfileSidebar.spec.tsx`: Test tab switching, badge counts, logout action.
   - `AddressesTab.spec.tsx` & `AddressCreateModal.spec.tsx`: Test address list render, default badge, create address submission, validation, delete address.
   - `OrdersTab.spec.tsx` / `ProfilePage.spec.tsx`: Test horizontal filter tab filtering, empty state CTA link.
   - `ChangePasswordCard.spec.tsx`: Test password form layout, eye visibility toggle, API submission.
2. **Build Verification**:
   - `npm --prefix frontend run build` (zero TypeScript errors).
   - `npm --prefix backend run build` (zero backend regressions).
