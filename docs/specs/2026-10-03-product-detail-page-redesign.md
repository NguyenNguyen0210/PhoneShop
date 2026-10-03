# Design Specification: Product Detail Page (PDP) Commercial E-Commerce Redesign

**Date:** 2026-10-03  
**Status:** Approved  
**Topic:** Storefront Product Detail Page (`ProductDetailPage.tsx`) Visual Hierarchy, Conversion Blocks, Dual-Action CTAs, and 65:35 Technical Layout

---

## 1. Context & Goals
The current Product Detail Page (`frontend/src/pages/storefront/ProductDetail/ProductDetailPage.tsx`) has solid core functionality (variant switching, gallery, sticky bar, IMEI policy). However, it lacks e-commerce commercial visual hierarchy:
- Product title concatenates color and storage in `<h1>` tag instead of a clean product name.
- Pricing uses informational blue (`#2563eb`) instead of commercial high-conversion red/rose (`#E11D48` / `rose-600`).
- Missing dedicated Promotion / Gifts Box (Khuyến mại đặc quyền 🎁).
- Variant selector buttons lack structured 2-line cards (variant name + dynamic price) with active corner checkmarks.
- Single CTA button instead of dual commercial actions: **MUA NGAY** (with subtext) + **TRẢ GÓP 0%** (with Installment Calculator Modal) + Add to Cart.
- Bottom technical section spans full width, causing whitespace imbalance.
- Brand name mentions legacy "MobileCommerce" instead of unified "PhoneShop".

---

## 2. Design System & Palette Integration
To maintain 100% cohesion with the rest of the application:
- **Body & Page Background:** `bg-[#F8FAFC]` (`slate-50`) with subtle elevation.
- **Card Containers:** `bg-white border border-slate-200/80 rounded-2xl shadow-xs`.
- **Primary Brand Color:** `text-blue-600 bg-blue-600` for secondary action, brand badges, and links.
- **Commercial Conversion Color:** `#E11D48` / `rose-600` (soft red/rose, not jarring orange or harsh pure red), paired with `bg-rose-50/50 border-rose-200/80`.
- **Accent Trust Signals:** `amber-500` for stars/reviews, `emerald-600` for `🟢 Sẵn hàng tại kho` and authentic warranty badge.

---

## 3. Detailed Component Architecture

### 3.1 Hero Purchase Section (`ProductHeroSection`)
1. **Title & Sub-bar:**
   - `<h1>` strictly displays `Điện thoại {product.name}`.
   - Sub-bar: Star rating `★ {rating}` (smooth scrolls to review section on click), review count, and compact stock badge `🟢 Sẵn hàng tại kho`.
2. **Gallery Viewport:**
   - 100% seal badge `Chính hãng 100% • Nguyên Seal`.
   - Dynamic discount badge `-{discountPercent}%` in `rose-600`.
   - Active image preview with smooth transition.
   - Thumbnail carousel with active ring indicator.
3. **Pricing Block:**
   - Active variant price in `text-3xl sm:text-4xl font-black text-rose-600`.
   - Crossed-out compare price `text-slate-400 line-through text-base sm:text-lg`.
   - Discount tag `-{discountPercent}%` and VAT/free shipping indicator.
4. **Structured Variant Cards:**
   - *Colors:* Rounded cards with circular color swatch, color name, and active checkmark.
   - *Storage & RAM:* 2-line cards (Top: `{storage} • {ram} RAM`, Bottom: `{price}₫`), active border in `rose-500` with corner checkmark badge.
5. **Promotion & Gifts Box (Khuyến Mại Đặc Quyền 🎁):**
   - Border in `rose-200/80`, background in `rose-50/40`.
   - Gift icon `🎁` with 4 high-value bullet points:
     - Giảm thêm 300.000₫ khi thanh toán qua VNPay/MoMo.
     - Tặng củ sạc siêu nhanh chính hãng + Ốp lưng bảo vệ.
     - Trợ giá thu cũ đổi mới lên đến 1.000.000₫.
     - Bảo hành rơi vỡ màn hình 12 tháng chính hãng.
6. **Commercial Dual CTA Buttons:**
   - **MUA NGAY Button:** Full `bg-rose-600 hover:bg-rose-700 text-white`, 2 lines:
     - Top line: `MUA NGAY` (bold uppercase).
     - Bottom line: `Giao tận nơi hoặc nhận tại cửa hàng` (small subtext).
   - **TRẢ GÓP 0% Button:** `bg-blue-600 hover:bg-blue-700 text-white`, 2 lines:
     - Top line: `TRẢ GÓP 0%` (bold uppercase).
     - Bottom line: `Duyệt nhanh qua CCCD / Thẻ tín dụng` (small subtext).
     - Opens `InstallmentModal`.
   - **Thêm vào giỏ Button:** Dedicated shopping cart button with tooltip and quick confirmation toast.

---

### 3.2 Installment Calculator Modal (`InstallmentModal.tsx`)
- Triggered by clicking "TRẢ GÓP 0%".
- Shows:
  - Product thumbnail, variant, and total price.
  - Down payment options: 0%, 20%, 30%, 50%.
  - Tenure terms: 3 months, 6 months, 9 months, 12 months.
  - Calculated monthly payment amount (`(totalPrice - downPayment) / months`).
  - Required documents note (CCCD gắn chip hoặc thẻ tín dụng).
  - Button "Tiến hành đăng ký & Giữ máy 15p" which proceeds to `/checkout`.

---

### 3.3 Bottom 65:35 Technical Layout
1. **Left Column (65-70% Width):**
   - **Detailed Description & Highlights:** Formatted text from `product.description`.
   - **Visual Hardware Feature Grid (4 Cards):**
     - 📱 *Màn hình:* Size, resolution, panel type, and 120Hz refresh rate.
     - ⚡ *Vi xử lý (CPU):* Chipset name, core count, and RAM.
     - 📸 *Camera:* Rear matrix specs and front selfie camera.
     - 🔋 *Pin & Sạc:* Battery capacity and fast charging wattage.
   - **Customer Reviews & Ratings Section:** Real feedback list, verified purchase badges, rating stars, and official shop responses.
2. **Right Column (30-35% Width):**
   - **Compact Specs Table:** Zebra-striped table rows (`bg-white` / `bg-slate-50`) listing primary specs.
   - **"Xem cấu hình chi tiết" Button:** Opens an Ant Design Modal showing complete OEM specification matrix.
   - **PhoneShop Commitment Card:** Brand consistency (`PhoneShop` instead of `MobileCommerce`).

---

### 3.4 Floating Sticky Purchase Bar
- Updates color from blue to commercial rose `#E11D48` for price and action button.
- Retains instant variant specs and Buy Now shortcut.
