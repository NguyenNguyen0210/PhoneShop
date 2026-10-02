# Design Spec: 24 Real Smartphones Catalog Expansion

**Date:** 2026-10-02  
**Status:** Approved  
**Author:** AI Agent & User  
**Target:** `MobileCommerce/frontend/src/data/mockProducts.ts`  

---

## 1. Objective & Scope

Expand the product catalog of the PhoneShop storefront to **24 real, genuine smartphones** (100% phone-only, eliminating non-phone categories like tablets and accessories) using verified market data collected via **Tavily MCP** from reputable Vietnamese retailers: **CellphoneS, Thế Giới Di Động, and Điện Máy Xanh**.

### Scope Boundaries:
- **Strictly Smartphone-Only**: Remove tablet, smartwatch, and accessory entries from the storefront mock datasets.
- **Storefront-First Focus**: Target `MobileCommerce/frontend/src/data/mockProducts.ts` to power the storefront catalog, brand filter pills, and product detail views.
- **Maintain 100% Test & Visual Compatibility**: Keep the existing 8 core flagship IDs and local transparent PNG image assets in place so that `test_frontend_playwright.py` passes without regressions.
- **Perfect Grid Layout**: 24 items form a balanced 4-column grid on desktop (6 full rows) and 2-column grid on mobile (12 full rows) with zero orphan cards.

---

## 2. Categories & Brands Architecture

### 2.1 Brands (5 Leading Brands)
1. **Apple** (`b-apple`): iPhone 16 Pro Max, 16 Pro, 16 Plus, 16, 15 Pro Max, 15, 13
2. **Samsung** (`b-samsung`): Galaxy S24 Ultra, S24+, S24, S24 FE, Z Fold6, Z Flip6, A55 5G, A35 5G
3. **Xiaomi** (`b-xiaomi`): Xiaomi 14 Ultra, 14T Pro 5G, 14, Redmi Note 13 Pro 5G, Redmi Note 13
4. **Google Pixel** (`b-google`): Pixel 9 Pro, Pixel 9
5. **OPPO** (`b-oppo`): Find N3 Flip, Reno12 Pro 5G

### 2.2 Smartphone-Only Categories
1. **Điện thoại Flagship** (`c-flagship`): Dòng điện thoại cao cấp nhất từ các thương hiệu hàng đầu thế giới.
2. **Điện thoại Màn hình gập** (`c-foldable`): Thiết kế gập mở thời thượng đột phá công nghệ.
3. **Điện thoại Tầm trung & Cận cao cấp** (`c-midrange`): Hiệu năng mạnh mẽ, camera sắc nét, phân khúc được ưa chuộng nhất.
4. **Điện thoại Phổ thông & Bền bỉ** (`c-budget`): Giá thành tối ưu, pin dung lượng lớn, độ bền vượt trội.

---

## 3. Product Catalog Specifications & Pricing Matrix (24 Devices)

All pricing reflects current authentic market retail pricing in Vietnam gathered via Tavily (promotional price vs. MSRP comparison price):

| # | ID | Name | Brand | Category | Promo Price (VND) | MSRP (VND) | Key Specs | Variants & Colors |
|:---:|---|---|---|---|:---:|:---:|---|---|
| 1 | `prod-iphone-16-pro-max` | iPhone 16 Pro Max | Apple | Flagship | 30.990.000 | 34.990.000 | A18 Pro (3nm), 6.9" 120Hz ProMotion, 48MP Fusion 5x, 4685mAh | 256GB/512GB/1TB (Titan Sa Mạc, Tự Nhiên, Trắng, Đen) |
| 2 | `prod-iphone-16-pro` | iPhone 16 Pro | Apple | Flagship | 23.990.000 | 28.990.000 | A18 Pro (3nm), 6.3" 120Hz ProMotion, Camera Control | 128GB/256GB/512GB (Titan Sa Mạc, Tự Nhiên, Trắng, Đen) |
| 3 | `prod-iphone-16-plus` | iPhone 16 Plus | Apple | Flagship | 25.490.000 | 27.890.000 | Apple A18, 6.7" OLED Super Retina XDR, Camera Control, 4674mAh | 128GB/256GB/512GB (Xanh Mòng Két, Hồng, Xanh Lưu Ly, Đen, Trắng) |
| 4 | `prod-iphone-16` | iPhone 16 | Apple | Flagship | 21.490.000 | 22.990.000 | Apple A18, 6.1" OLED Super Retina XDR, Camera Control | 128GB/256GB (Hồng, Xanh Mòng Két, Xanh Lưu Ly, Trắng, Đen) |
| 5 | `prod-iphone-15-pro-max` | iPhone 15 Pro Max | Apple | Flagship | 28.990.000 | 34.990.000 | A17 Pro (3nm), 6.7" 120Hz ProMotion, Zoom quang 5x, Titan hàng không | 256GB/512GB/1TB (Titan Tự Nhiên, Titan Xanh, Titan Đen, Titan Trắng) |
| 6 | `prod-iphone-15` | iPhone 15 | Apple | Flagship | 18.990.000 | 21.990.000 | A16 Bionic, 6.1" Dynamic Island, Camera 48MP, Cổng USB-C | 128GB/256GB (Hồng, Xanh Lá, Vàng, Đen) |
| 7 | `prod-iphone-13` | iPhone 13 | Apple | Budget | 13.490.000 | 16.990.000 | A15 Bionic, 6.1" Super Retina XDR, Pin trâu, Thiết kế vuông vắn | 128GB (Midnight, Starlight, Xanh Blue, Hồng) |
| 8 | `prod-samsung-s24-ultra` | Samsung Galaxy S24 Ultra | Samsung | Flagship | 25.290.000 | 31.990.000 | Snapdragon 8 Gen 3 for Galaxy, 6.8" 120Hz phẳng, Bút S Pen, Galaxy AI, 200MP | 256GB/512GB (Xám Titan, Đen Titan, Vàng Titan, Tím Titan) |
| 9 | `prod-samsung-s24-plus` | Samsung Galaxy S24 Plus | Samsung | Flagship | 16.590.000 | 22.990.000 | Exynos 2400 / 8 Gen 3, 6.7" QHD+ 120Hz, Galaxy AI, Armor Aluminum | 256GB/512GB (Đen Onyx, Xám Marble, Vàng Amber) |
| 10 | `prod-samsung-s24` | Samsung Galaxy S24 | Samsung | Flagship | 15.490.000 | 18.990.000 | Dynamic AMOLED 2X 6.2" 120Hz, Galaxy AI, Viền siêu mỏng | 256GB (Đen Onyx, Xám Marble, Vàng Amber) |
| 11 | `prod-samsung-s24-fe` | Samsung Galaxy S24 FE | Samsung | Midrange | 13.990.000 | 16.990.000 | Exynos 2400e, 6.7" FHD+ 120Hz, Galaxy AI, Khung kim loại | 128GB/256GB (Xanh Blue, Đen Graphite, Xám Bạc) |
| 12 | `prod-samsung-z-fold6` | Samsung Galaxy Z Fold6 5G | Samsung | Foldable | 37.590.000 | 43.990.000 | Màn trong 7.6" + ngoài 6.3" 120Hz, Snapdragon 8 Gen 3, IP48, 12.1mm | 256GB/512GB (Xám Metal, Xanh Navy, Hồng Blossom) |
| 13 | `prod-samsung-z-flip6` | Samsung Galaxy Z Flip6 5G | Samsung | Foldable | 21.990.000 | 28.990.000 | Màn gập 6.7" + FlexWindow 3.4", Snapdragon 8 Gen 3, Tản nhiệt buồng hơi | 256GB/512GB (Xám Metal, Xanh Mint, Vàng Solar, Xanh Maya) |
| 14 | `prod-samsung-a55` | Samsung Galaxy A55 5G | Samsung | Midrange | 7.590.000 | 9.990.000 | Exynos 1480, Mặt lưng kính Victus+, Viền kim loại, 6.6" 120Hz, 5000mAh | 128GB/256GB (Xanh Iceblue, Tím Lilac, Đen Navy) |
| 15 | `prod-samsung-a35` | Samsung Galaxy A35 5G | Samsung | Midrange | 6.890.000 | 8.290.000 | Exynos 1380, Super AMOLED 6.6" 120Hz, 50MP OIS, Kháng nước IP67 | 128GB (Xanh Iceblue, Vàng Chanh, Đen Navy) |
| 16 | `prod-xiaomi-14-ultra` | Xiaomi 14 Ultra | Xiaomi | Flagship | 28.990.000 | 32.990.000 | 4 camera Leica 50MP cảm biến 1 inch LYT-900 khẩu độ vô cấp, Sạc 90W | 512GB - 16GB RAM (Đen Lưng Da, Trắng Lưng Da) |
| 17 | `prod-xiaomi-14t-pro` | Xiaomi 14T Pro 5G | Xiaomi | Midrange | 14.990.000 | 16.990.000 | Dimensity 9300+, Ống kính Leica Summilux, Màn hình 144Hz AI, Sạc 120W | 256GB/512GB (Xám Titan, Đen Titan, Xanh Titan) |
| 18 | `prod-xiaomi-14` | Xiaomi 14 | Xiaomi | Flagship | 17.990.000 | 21.990.000 | Snapdragon 8 Gen 3, Camera Leica Vario-Summilux, Màn hình 6.36" viền siêu mỏng | 256GB/512GB (Đen, Trắng, Xanh Jade) |
| 19 | `prod-redmi-note-13-pro` | Xiaomi Redmi Note 13 Pro 5G | Xiaomi | Midrange | 6.290.000 | 7.990.000 | Camera 200MP OIS, Màn hình AMOLED 1.5K 120Hz, Snapdragon 7s Gen 2, 67W | 128GB/256GB (Đen Bán Dạ, Xanh Đại Dương, Tím Cực Quang) |
| 20 | `prod-redmi-note-13` | Xiaomi Redmi Note 13 | Xiaomi | Budget | 4.190.000 | 4.890.000 | AMOLED 6.67" 120Hz, Camera 108MP, Pin 5.000mAh, Sạc 33W | 128GB (Đen Midnight, Xanh Mint, Hoàng Hôn) |
| 21 | `prod-google-pixel-9-pro` | Google Pixel 9 Pro | Google | Flagship | 24.950.000 | 28.490.000 | Google Tensor G4, Gemini Nano AI, 6.3" Super Actua 120Hz LTPO, 16GB RAM | 128GB/256GB/512GB (Đen Obsidian, Trắng Porcelain, Xám Hazel) |
| 22 | `prod-google-pixel-9` | Google Pixel 9 | Google | Flagship | 18.990.000 | 21.990.000 | Google Tensor G4, Màn OLED 6.3" Actua 120Hz, Camera 50MP + 48MP Macro | 128GB/256GB (Obsidian, Porcelain, Wintergreen, Peony) |
| 23 | `prod-oppo-find-n3-flip` | OPPO Find N3 Flip | OPPO | Foldable | 17.990.000 | 22.990.000 | 3 Camera Hasselblad, Màn hình phụ dọc tiện ích, Bản lề uốn tàng hình | 256GB (Đen Hổ Phách, Vàng Thạch Anh, Hồng) |
| 24 | `prod-oppo-reno12-pro` | OPPO Reno12 Pro 5G | OPPO | Midrange | 13.990.000 | 15.990.000 | Màn hình cong 3D 120Hz, Chuyên gia chân dung AI, Khung kim loại chống sốc | 256GB/512GB (Nâu Tinh Vân, Bạc Vũ Trụ) |

---

## 4. Technical Implementation

1. **`MobileCommerce/frontend/src/data/mockProducts.ts`**:
   - `mockBrands`: Extended to include Apple, Samsung, Xiaomi, Google Pixel, and OPPO with SVG/high-res brand logos.
   - `mockCategories`: Refined to `c-flagship`, `c-foldable`, `c-midrange`, and `c-budget`.
   - `mockProducts`: Populated with 24 structured products following the exact TypeScript interface:
     - Each product includes `id`, `name`, `slug`, `description`, `brandId`, `categoryId`, `thumbnail`, `images`, `status: 'ACTIVE'`, `rating`, `reviewCount`, `featured`, `specs` dictionary, and `variants` array.
     - Each variant contains `id`, `productId`, `sku`, `color`, `colorHex`, `storage`, `ram`, `price`, `compareAtPrice`, and `inventoryQty`.
2. **Image Strategy**:
   - Original 8 products retain `/images/products/<name>.png`.
   - 16 new products utilize verified official product assets with seamless fallback to transparent local assets if external network is unavailable.
3. **Admin and Cart Compatibility**:
   - Product IDs and variant structure conform to `CartContext` and admin pages (`AdminProductsPage`, `AdminOrdersPage`, `AdminImeiPage`).

---

## 5. Verification Plan

1. **Type Checking & Build**: Run `npm run build` in `MobileCommerce/frontend` (`tsc -b && vite build`) to ensure zero TypeScript errors.
2. **E2E Test Suite**: Execute `python test_frontend_playwright.py` in `MobileCommerce` to verify that all 8 test suites pass:
   - Storefront Homepage renders correctly with brand, header, and product cards.
   - Product Detail page navigates and switches variants properly (`prod-1` fallback remains fully supported).
   - Cart, Warranty Lookup, Auth, and Admin views operate without error.
3. **Visual Grid Review**: Confirm desktop 4-column layout renders all 24 cards evenly in 6 complete rows.
