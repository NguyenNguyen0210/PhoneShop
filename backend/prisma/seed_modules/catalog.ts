// =============================================================================
// CATALOG SEED — 12 brands, 6 categories, 60 smartphones, ~180 variants
// Canonical product catalog covering EVERY product filter case.
// Idempotent via upsert (slug/sku). Deterministic SKUs, VND rounded prices.
// Run via prisma/seed.ts step [4/7] (seedCatalog).
// =============================================================================
import {
  PrismaClient,
  ProductStatus,
  ProductCondition,
} from '@prisma/client';

const R2_BASE =
  process.env.CLOUDFLARE_R2_PUBLIC_URL ??
  'https://pub-dcd7bf5fa7c74b97a10cdc8dfadc4064.r2.dev';

const r2 = (slug: string) => `${R2_BASE}/products/${slug}.webp`;

// ---------------------------------------------------------------------------
// Brands (12)
// ---------------------------------------------------------------------------
export const BRAND_SEEDS = [
  { name: 'Apple', slug: 'apple', description: 'Apple iPhone chính hãng VN/A', logoUrl: '/brands/apple.svg' },
  { name: 'Samsung', slug: 'samsung', description: 'Samsung chính hãng Samsung Việt Nam', logoUrl: '/brands/samsung.svg' },
  { name: 'Xiaomi', slug: 'xiaomi', description: 'Xiaomi / Redmi / POCO chính hãng', logoUrl: '/brands/xiaomi.svg' },
  { name: 'OPPO', slug: 'oppo', description: 'OPPO chính hãng', logoUrl: '/brands/oppo.svg' },
  { name: 'vivo', slug: 'vivo', description: 'vivo / iQOO chính hãng', logoUrl: '/brands/vivo.svg' },
  { name: 'Google', slug: 'google', description: 'Google Pixel xách tay Mỹ', logoUrl: '/brands/google.svg' },
  { name: 'OnePlus', slug: 'oneplus', description: 'OnePlus chính hãng', logoUrl: null },
  { name: 'realme', slug: 'realme', description: 'realme chính hãng', logoUrl: '/brands/realme.svg' },
  { name: 'ASUS', slug: 'asus', description: 'ASUS ROG / Zenfone gaming', logoUrl: '/brands/asus.svg' },
  { name: 'Nothing', slug: 'nothing', description: 'Nothing Phone (UK)', logoUrl: null },
  { name: 'Sony', slug: 'sony', description: 'Sony Xperia chính hãng', logoUrl: '/brands/sony.svg' },
  { name: 'Motorola', slug: 'motorola', description: 'Motorola chính hãng', logoUrl: null },
];

// ---------------------------------------------------------------------------
// Categories (parent + 5 children). Old slugs (dien-thoai...) are preserved.
// ---------------------------------------------------------------------------
export const CATEGORY_SEEDS = [
  { name: 'Điện thoại (Smartphone)', slug: 'smartphone', description: 'Điện thoại di động thông minh chính hãng đầy đủ phân khúc', parent: null, sortOrder: 0 },
  { name: 'Điện thoại Flagship', slug: 'flagship', description: 'Dòng điện thoại cao cấp hàng đầu', parent: 'smartphone', sortOrder: 0 },
  { name: 'Điện thoại Tầm trung', slug: 'mid-range', description: 'Phân khúc 8 - 16 triệu cân bằng hiệu năng & giá bán', parent: 'smartphone', sortOrder: 1 },
  { name: 'Điện thoại Giá rẻ - Phổ thông', slug: 'budget', description: 'Phổ thông & giá rẻ dưới 7 triệu', parent: 'smartphone', sortOrder: 2 },
  { name: 'Điện thoại Chuyên game', slug: 'gaming-phone', description: 'Cấu hình khủng, tản nhiệt và tần số quét cao', parent: 'smartphone', sortOrder: 3 },
  { name: 'Điện thoại Màn hình gập', slug: 'foldable-phone', description: 'Thiết kế gập vỏ sò & gập cánh sách thời thượng', parent: 'smartphone', sortOrder: 4 },
];

type VariantSeed = {
  sku: string;
  color: string;
  storage: string;
  ram: string;
  price: number;
  compareAtPrice?: number;
  stock: number; // desired availableQty (0 = out of stock)
  active?: boolean;
};

type ProductSeed = {
  brand: string;
  category: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  condition?: ProductCondition;
  status?: ProductStatus;
  warrantyMonths?: number;
  specs: Record<string, any>;
  variants: VariantSeed[];
};

// Price helper: VND rounded to 90k
const P = (v: number) => Math.round(v / 10000) * 10000 - 10000 + 9990000 * 0 + Math.round(v / 1000) * 1000;
// Simple: keep literal prices below (already rounded). This helper unused but kept for clarity.

// ---------------------------------------------------------------------------
// 60 PRODUCTS — each row covers a distinct filter combination.
// Colors use VI names matching ProductFilterSidebar (Đen/Trắng/Xanh/Titan/Vàng/Tím/Xanh lá).
// Chipset strings intentionally contain filter keywords: Apple/Snapdragon/Dimensity/Exynos.
// ---------------------------------------------------------------------------
export const PRODUCT_SEEDS: ProductSeed[] = [
  // ================= APPLE (9, iOS, Apple A-Series) =================
  {
    brand: 'apple', category: 'flagship', name: 'iPhone 17 Pro Max', slug: 'iphone-17-pro-max',
    shortDescription: 'Flagship Apple A19 Pro, titan nguyên khối',
    description: 'iPhone 17 Pro Max chính hãng VN/A. Chip Apple A19 Pro, màn 6.9 inch ProMotion 120Hz, khung titan, camera 48MP.',
    warrantyMonths: 12,
    specs: { screenSize: 6.9, screenResolution: '1290x2796', screenTechnology: 'LTPO Super Retina XDR OLED', screenRefreshRate: 120, chipset: 'Apple A-Series A19 Pro', os: 'iOS', has5G: true, batteryCapacity: 4832, mainCameraMp: 48, rearCamera: 'Chính 48MP + Ultra Wide 48MP + Tele 12MP', frontCamera: '12MP' },
    variants: [
      { sku: 'APL-IP17PM-256-TITAN', color: 'Titan', storage: '256GB', ram: '8GB', price: 34990000, compareAtPrice: 37990000, stock: 25 },
      { sku: 'APL-IP17PM-512-TITAN', color: 'Titan', storage: '512GB', ram: '8GB', price: 39990000, stock: 15 },
      { sku: 'APL-IP17PM-1T-DEN', color: 'Đen', storage: '1TB', ram: '8GB', price: 44990000, stock: 8 },
    ],
  },
  {
    brand: 'apple', category: 'flagship', name: 'iPhone 17 Pro', slug: 'iphone-17-pro',
    shortDescription: 'iPhone 17 Pro 6.3 inch, A19 Pro',
    description: 'iPhone 17 Pro chính hãng. Màn 6.3 inch 120Hz, chip Apple A19 Pro, pin 3988mAh.',
    specs: { screenSize: 6.3, chipset: 'Apple A-Series A19 Pro', os: 'iOS', has5G: true, batteryCapacity: 3988, screenRefreshRate: 120, screenTechnology: 'LTPO OLED', mainCameraMp: 48 },
    variants: [
      { sku: 'APL-IP17P-128-TITAN', color: 'Titan', storage: '128GB', ram: '8GB', price: 28990000, stock: 20 },
      { sku: 'APL-IP17P-256-XANH', color: 'Xanh', storage: '256GB', ram: '8GB', price: 30990000, compareAtPrice: 32990000, stock: 12 },
      { sku: 'APL-IP17P-512-TITAN', color: 'Titan', storage: '512GB', ram: '8GB', price: 35990000, stock: 6 },
    ],
  },
  {
    brand: 'apple', category: 'flagship', name: 'iPhone 17', slug: 'iphone-17',
    shortDescription: 'iPhone 17 tiêu chuẩn, A19',
    description: 'iPhone 17 chính hãng VN/A, chip Apple A19, màn 6.3 inch, pin 3692mAh (<4000 bucket).',
    specs: { screenSize: 6.3, chipset: 'Apple A-Series A19', os: 'iOS', has5G: true, batteryCapacity: 3692, screenRefreshRate: 120, screenTechnology: 'Super Retina XDR OLED', mainCameraMp: 48 },
    variants: [
      { sku: 'APL-IP17-128-DEN', color: 'Đen', storage: '128GB', ram: '8GB', price: 21990000, stock: 30 },
      { sku: 'APL-IP17-256-TRANG', color: 'Trắng', storage: '256GB', ram: '8GB', price: 24990000, compareAtPrice: 26990000, stock: 18 },
      { sku: 'APL-IP17-256-XANHLÁ', color: 'Xanh lá', storage: '256GB', ram: '8GB', price: 24990000, stock: 10 },
    ],
  },
  {
    brand: 'apple', category: 'flagship', name: 'iPhone 16 Pro Max', slug: 'iphone-16-pro-max',
    shortDescription: 'iPhone 16 Pro Max giảm sâu',
    description: 'iPhone 16 Pro Max chính hãng, chip Apple A18 Pro, màn 6.9 inch, pin 4685mAh.',
    specs: { screenSize: 6.9, chipset: 'Apple A-Series A18 Pro', os: 'iOS', has5G: true, batteryCapacity: 4685, screenRefreshRate: 120, screenTechnology: 'LTPO OLED', mainCameraMp: 48 },
    variants: [
      { sku: 'APL-IP16PM-256-TITAN', color: 'Titan', storage: '256GB', ram: '8GB', price: 30990000, compareAtPrice: 34990000, stock: 22 },
      { sku: 'APL-IP16PM-512-DEN', color: 'Đen', storage: '512GB', ram: '8GB', price: 35990000, compareAtPrice: 39990000, stock: 10 },
      { sku: 'APL-IP16PM-1T-TRANG', color: 'Trắng', storage: '1TB', ram: '8GB', price: 40990000, stock: 4 },
    ],
  },
  {
    brand: 'apple', category: 'mid-range', name: 'iPhone 16', slug: 'iphone-16',
    shortDescription: 'iPhone 16 6.0 inch quốc dân',
    description: 'iPhone 16 chính hãng, chip Apple A18, màn 6.0 inch gọn, pin 3561mAh.',
    specs: { screenSize: 6.0, chipset: 'Apple A-Series A18', os: 'iOS', has5G: true, batteryCapacity: 3561, screenRefreshRate: 60, screenTechnology: 'Super Retina XDR OLED', mainCameraMp: 48 },
    variants: [
      { sku: 'APL-IP16-128-XANH', color: 'Xanh', storage: '128GB', ram: '8GB', price: 19990000, compareAtPrice: 22990000, stock: 25 },
      { sku: 'APL-IP16-256-TIM', color: 'Tím', storage: '256GB', ram: '8GB', price: 22990000, stock: 14 },
    ],
  },
  {
    brand: 'apple', category: 'mid-range', name: 'iPhone 15', slug: 'iphone-15',
    shortDescription: 'iPhone 15 giá tốt',
    description: 'iPhone 15 chính hãng VN/A, chip Apple A16 Bionic, màn 6.0 inch Dynamic Island gọn.',
    specs: { screenSize: 6.0, chipset: 'Apple A-Series A16 Bionic', os: 'iOS', has5G: true, batteryCapacity: 3349, screenRefreshRate: 60, screenTechnology: 'Super Retina XDR OLED', mainCameraMp: 48 },
    variants: [
      { sku: 'APL-IP15-128-DEN', color: 'Đen', storage: '128GB', ram: '6GB', price: 16990000, compareAtPrice: 19990000, stock: 20 },
      { sku: 'APL-IP15-256-VANG', color: 'Vàng', storage: '256GB', ram: '6GB', price: 19990000, stock: 8 },
    ],
  },
  {
    brand: 'apple', category: 'budget', name: 'iPhone 14', slug: 'iphone-14',
    shortDescription: 'iPhone 14 nhỏ gọn 5.9 inch',
    description: 'iPhone 14 bản thu gọn màn 5.9 inch cho người thích máy nhỏ, chip Apple A15 Bionic.',
    specs: { screenSize: 5.9, chipset: 'Apple A-Series A15 Bionic', os: 'iOS', has5G: true, batteryCapacity: 3279, screenRefreshRate: 60, screenTechnology: 'Super Retina XDR OLED', mainCameraMp: 12 },
    variants: [
      { sku: 'APL-IP14-128-TIM', color: 'Tím', storage: '128GB', ram: '6GB', price: 13990000, compareAtPrice: 16990000, stock: 15 },
      { sku: 'APL-IP14-256-VANG', color: 'Vàng', storage: '256GB', ram: '6GB', price: 15990000, stock: 0 },
    ],
  },
  {
    brand: 'apple', category: 'mid-range', name: 'iPhone 16e', slug: 'iphone-16e',
    shortDescription: 'iPhone 16e tiết kiệm nhỏ gọn',
    description: 'iPhone 16e chính hãng, chip Apple A18, màn 5.8 inch gọn, pin 4005mAh.',
    specs: { screenSize: 5.8, chipset: 'Apple A-Series A18', os: 'iOS', has5G: true, batteryCapacity: 4005, screenRefreshRate: 60, screenTechnology: 'Super Retina XDR OLED', mainCameraMp: 48 },
    variants: [
      { sku: 'APL-IP16E-128-TRANG', color: 'Trắng', storage: '128GB', ram: '8GB', price: 15990000, stock: 18 },
      { sku: 'APL-IP16E-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 18490000, stock: 9 },
    ],
  },
  {
    brand: 'apple', category: 'flagship', name: 'iPhone 17 Air', slug: 'iphone-17-air',
    shortDescription: 'iPhone siêu mỏng 5.5mm',
    description: 'iPhone 17 Air mỏng nhất lịch sử Apple, màn 6.6 inch, chip Apple A19 Pro, pin 3149mAh.',
    specs: { screenSize: 6.6, chipset: 'Apple A-Series A19 Pro', os: 'iOS', has5G: true, batteryCapacity: 3149, screenRefreshRate: 120, screenTechnology: 'LTPO OLED', mainCameraMp: 48 },
    variants: [
      { sku: 'APL-IP17A-256-TITAN', color: 'Titan', storage: '256GB', ram: '8GB', price: 26990000, stock: 12 },
      { sku: 'APL-IP17A-512-XANH', color: 'Xanh', storage: '512GB', ram: '8GB', price: 31990000, stock: 5 },
    ],
  },

  // ================= SAMSUNG (12) =================
  {
    brand: 'samsung', category: 'flagship', name: 'Samsung Galaxy S26 Ultra', slug: 'galaxy-s26-ultra',
    shortDescription: 'Galaxy S26 Ultra Snapdragon 8 Elite Gen 2',
    description: 'Galaxy S26 Ultra chính hãng, Snapdragon 8 Elite Gen 2, màn 6.9 inch 120Hz, pin 5400mAh, camera 200MP, bút S Pen.',
    warrantyMonths: 12,
    specs: { screenSize: 6.9, chipset: 'Snapdragon 8 Elite Gen 2', os: 'Android', has5G: true, batteryCapacity: 5400, screenRefreshRate: 120, screenTechnology: 'Dynamic AMOLED 2X', mainCameraMp: 200 },
    variants: [
      { sku: 'SAM-S26U-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 31990000, stock: 20 },
      { sku: 'SAM-S26U-512-TITAN', color: 'Titan', storage: '512GB', ram: '12GB', price: 36990000, compareAtPrice: 39990000, stock: 10 },
      { sku: 'SAM-S26U-1T-XANH', color: 'Xanh', storage: '1TB', ram: '12GB', price: 42990000, stock: 3 },
    ],
  },
  {
    brand: 'samsung', category: 'flagship', name: 'Samsung Galaxy S26', slug: 'galaxy-s26',
    shortDescription: 'Galaxy S26 nhỏ gọn',
    description: 'Galaxy S26 chính hãng, màn 6.3 inch, Snapdragon 8 Elite Gen 2, pin 4900mAh.',
    specs: { screenSize: 6.3, chipset: 'Snapdragon 8 Elite Gen 2', os: 'Android', has5G: true, batteryCapacity: 4900, screenRefreshRate: 120, screenTechnology: 'Dynamic AMOLED 2X', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-S26-128-TRANG', color: 'Trắng', storage: '128GB', ram: '8GB', price: 21990000, stock: 18 },
      { sku: 'SAM-S26-256-XANHLÁ', color: 'Xanh lá', storage: '256GB', ram: '8GB', price: 23990000, compareAtPrice: 25990000, stock: 12 },
    ],
  },
  {
    brand: 'samsung', category: 'flagship', name: 'Samsung Galaxy S25 Ultra', slug: 'galaxy-s25-ultra',
    shortDescription: 'S25 Ultra giảm sâu',
    description: 'Galaxy S25 Ultra chính hãng, Snapdragon 8 Elite, màn 6.9 inch, pin 5000mAh.',
    specs: { screenSize: 6.9, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 5000, screenRefreshRate: 120, screenTechnology: 'Dynamic AMOLED 2X', mainCameraMp: 200 },
    variants: [
      { sku: 'SAM-S25U-256-TITAN', color: 'Titan', storage: '256GB', ram: '12GB', price: 27990000, compareAtPrice: 33990000, stock: 16 },
      { sku: 'SAM-S25U-512-DEN', color: 'Đen', storage: '512GB', ram: '12GB', price: 31990000, compareAtPrice: 36990000, stock: 7 },
    ],
  },
  {
    brand: 'samsung', category: 'foldable-phone', name: 'Samsung Galaxy Z Fold7', slug: 'galaxy-z-fold7',
    shortDescription: 'Z Fold7 màn gập 8 inch',
    description: 'Galaxy Z Fold7 chính hãng, màn gập 8.0 inch, Snapdragon 8 Elite, pin 4400mAh.',
    specs: { screenSize: 8.0, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 4400, screenRefreshRate: 120, screenTechnology: 'Foldable Dynamic AMOLED 2X', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-ZF7-256-XANH', color: 'Xanh', storage: '256GB', ram: '12GB', price: 42990000, stock: 6 },
      { sku: 'SAM-ZF7-512-DEN', color: 'Đen', storage: '512GB', ram: '12GB', price: 46990000, stock: 3 },
      { sku: 'SAM-ZF7-1T-DEN', color: 'Đen', storage: '1TB', ram: '12GB', price: 51990000, stock: 0 },
    ],
  },
  {
    brand: 'samsung', category: 'foldable-phone', name: 'Samsung Galaxy Z Flip7', slug: 'galaxy-z-flip7',
    shortDescription: 'Z Flip7 gập vỏ sò',
    description: 'Galaxy Z Flip7 chính hãng, màn gập 6.9 inch, chip Exynos 2500, pin 4000mAh.',
    specs: { screenSize: 6.9, chipset: 'Exynos 2500', os: 'Android', has5G: true, batteryCapacity: 4000, screenRefreshRate: 120, screenTechnology: 'Foldable AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-ZFL7-256-VANG', color: 'Vàng', storage: '256GB', ram: '8GB', price: 24990000, stock: 10 },
      { sku: 'SAM-ZFL7-512-TIM', color: 'Tím', storage: '512GB', ram: '8GB', price: 27990000, compareAtPrice: 29990000, stock: 5 },
    ],
  },
  {
    brand: 'samsung', category: 'mid-range', name: 'Samsung Galaxy A56', slug: 'galaxy-a56',
    shortDescription: 'Galaxy A56 quốc dân',
    description: 'Galaxy A56 chính hãng, màn 6.6 inch Super AMOLED 120Hz, Exynos 1580, pin 5000mAh.',
    specs: { screenSize: 6.6, chipset: 'Exynos 1580', os: 'Android', has5G: true, batteryCapacity: 5000, screenRefreshRate: 120, screenTechnology: 'Super AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-A56-128-XANH', color: 'Xanh', storage: '128GB', ram: '8GB', price: 9990000, stock: 40 },
      { sku: 'SAM-A56-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 10990000, compareAtPrice: 11990000, stock: 30 },
    ],
  },
  {
    brand: 'samsung', category: 'mid-range', name: 'Samsung Galaxy A36', slug: 'galaxy-a36',
    shortDescription: 'Galaxy A36 tầm trung',
    description: 'Galaxy A36 chính hãng, Snapdragon 6 Gen 3, màn 6.6 inch, pin 5000mAh.',
    specs: { screenSize: 6.6, chipset: 'Snapdragon 6 Gen 3', os: 'Android', has5G: true, batteryCapacity: 5000, screenRefreshRate: 120, screenTechnology: 'Super AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-A36-128-TIM', color: 'Tím', storage: '128GB', ram: '6GB', price: 7990000, stock: 35 },
      { sku: 'SAM-A36-256-TRANG', color: 'Trắng', storage: '256GB', ram: '8GB', price: 8990000, stock: 25 },
    ],
  },
  {
    brand: 'samsung', category: 'budget', name: 'Samsung Galaxy A16 4G', slug: 'galaxy-a16-4g',
    shortDescription: 'Galaxy A16 bản 4G giá rẻ',
    description: 'Galaxy A16 bản 4G, màn 6.7 inch, Exynos 1330, pin 5000mAh. Máy 4G phù hợp test lọc has5G=false.',
    specs: { screenSize: 6.7, chipset: 'Exynos 1330', os: 'Android', has5G: false, batteryCapacity: 5000, screenRefreshRate: 90, screenTechnology: 'Super AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-A164G-128-XANH', color: 'Xanh', storage: '128GB', ram: '4GB', price: 4490000, stock: 50 },
      { sku: 'SAM-A164G-128-DEN', color: 'Đen', storage: '128GB', ram: '6GB', price: 4990000, stock: 40 },
    ],
  },
  {
    brand: 'samsung', category: 'budget', name: 'Samsung Galaxy M35', slug: 'galaxy-m35',
    shortDescription: 'Galaxy M35 pin 6000',
    description: 'Galaxy M35 chính hãng, pin 6000mAh trâu nhất phân khúc, Exynos 1380, màn 6.6 inch.',
    specs: { screenSize: 6.6, chipset: 'Exynos 1380', os: 'Android', has5G: true, batteryCapacity: 6000, screenRefreshRate: 120, screenTechnology: 'Super AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-M35-128-XANH', color: 'Xanh', storage: '128GB', ram: '6GB', price: 6990000, compareAtPrice: 7990000, stock: 30 },
      { sku: 'SAM-M35-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 7990000, stock: 20 },
    ],
  },
  {
    brand: 'samsung', category: 'mid-range', name: 'Samsung Galaxy S24 FE', slug: 'galaxy-s24-fe',
    shortDescription: 'S24 FE fan edition',
    description: 'Galaxy S24 FE chính hãng, Exynos 2400e, màn 6.7 inch, pin 4700mAh.',
    specs: { screenSize: 6.7, chipset: 'Exynos 2400e', os: 'Android', has5G: true, batteryCapacity: 4700, screenRefreshRate: 120, screenTechnology: 'Dynamic AMOLED 2X', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-S24FE-128-XANH', color: 'Xanh', storage: '128GB', ram: '8GB', price: 12990000, compareAtPrice: 14990000, stock: 18 },
      { sku: 'SAM-S24FE-256-TRANG', color: 'Trắng', storage: '256GB', ram: '8GB', price: 14490000, stock: 12 },
    ],
  },
  {
    brand: 'samsung', category: 'budget', name: 'Samsung Galaxy A05s', slug: 'galaxy-a05s',
    shortDescription: 'Galaxy A05s 4G dưới 4 triệu',
    description: 'Galaxy A05s bản 4G giá rẻ, Snapdragon 680, màn 6.7 inch, pin 5000mAh, RAM 4GB, bộ nhớ 64GB.',
    specs: { screenSize: 6.7, chipset: 'Snapdragon 680', os: 'Android', has5G: false, batteryCapacity: 5000, screenRefreshRate: 90, screenTechnology: 'PLS LCD', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-A05S-64-DEN', color: 'Đen', storage: '64GB', ram: '4GB', price: 3990000, stock: 60 },
      { sku: 'SAM-A05S-128-XANHLÁ', color: 'Xanh lá', storage: '128GB', ram: '4GB', price: 4490000, stock: 45 },
    ],
  },
  {
    brand: 'samsung', category: 'mid-range', name: 'Samsung Galaxy F55', slug: 'galaxy-f55',
    shortDescription: 'Galaxy F55 mỏng nhẹ',
    description: 'Galaxy F55 chính hãng, Snapdragon 7 Gen 1, màn 6.7 inch Super AMOLED, pin 5000mAh.',
    specs: { screenSize: 6.7, chipset: 'Snapdragon 7 Gen 1', os: 'Android', has5G: true, batteryCapacity: 5000, screenRefreshRate: 120, screenTechnology: 'Super AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'SAM-F55-128-DEN', color: 'Đen', storage: '128GB', ram: '8GB', price: 8990000, stock: 22 },
      { sku: 'SAM-F55-256-VANG', color: 'Vàng', storage: '256GB', ram: '8GB', price: 9990000, stock: 0 },
    ],
  },

  // ================= XIAOMI (9) =================
  {
    brand: 'xiaomi', category: 'flagship', name: 'Xiaomi 16 Pro', slug: 'xiaomi-16-pro',
    shortDescription: 'Xiaomi 16 Pro Leica',
    description: 'Xiaomi 16 Pro chính hãng, Snapdragon 8 Elite Gen 2, camera Leica 50MP, màn 6.8 inch LTPO, pin 5400mAh.',
    specs: { screenSize: 6.8, chipset: 'Snapdragon 8 Elite Gen 2', os: 'Android', has5G: true, batteryCapacity: 5400, screenRefreshRate: 120, screenTechnology: 'LTPO AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'XMI-16P-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 22990000, stock: 15 },
      { sku: 'XMI-16P-512-TRANG', color: 'Trắng', storage: '512GB', ram: '12GB', price: 25990000, compareAtPrice: 27990000, stock: 8 },
    ],
  },
  {
    brand: 'xiaomi', category: 'flagship', name: 'Xiaomi 15 Ultra', slug: 'xiaomi-15-ultra',
    shortDescription: 'Xiaomi 15 Ultra RAM 16GB',
    description: 'Xiaomi 15 Ultra chính hãng, Snapdragon 8 Elite, RAM 16GB, camera Leica 200MP, pin 5410mAh.',
    specs: { screenSize: 6.9, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 5410, screenRefreshRate: 120, screenTechnology: 'LTPO AMOLED', mainCameraMp: 200 },
    variants: [
      { sku: 'XMI-15U-512-TRANG', color: 'Trắng', storage: '512GB', ram: '16GB', price: 27990000, stock: 8 },
      { sku: 'XMI-15U-1T-DEN', color: 'Đen', storage: '1TB', ram: '16GB', price: 31990000, stock: 2 },
    ],
  },
  {
    brand: 'xiaomi', category: 'flagship', name: 'Xiaomi 15', slug: 'xiaomi-15',
    shortDescription: 'Xiaomi 15 nhỏ gọn',
    description: 'Xiaomi 15 chính hãng, màn 6.36 inch, Snapdragon 8 Elite, pin 5240mAh.',
    specs: { screenSize: 6.36, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 5240, screenRefreshRate: 120, screenTechnology: 'LTPO OLED', mainCameraMp: 50 },
    variants: [
      { sku: 'XMI-15-256-XANHLÁ', color: 'Xanh lá', storage: '256GB', ram: '12GB', price: 17990000, compareAtPrice: 19990000, stock: 18 },
      { sku: 'XMI-15-512-DEN', color: 'Đen', storage: '512GB', ram: '12GB', price: 19990000, stock: 10 },
    ],
  },
  {
    brand: 'xiaomi', category: 'mid-range', name: 'Redmi Note 14 Pro', slug: 'redmi-note-14-pro',
    shortDescription: 'Redmi Note 14 Pro',
    description: 'Redmi Note 14 Pro chính hãng, Dimensity 7300 Ultra, màn 6.67 inch cong, pin 5110mAh.',
    specs: { screenSize: 6.67, chipset: 'Dimensity 7300 Ultra', os: 'Android', has5G: true, batteryCapacity: 5110, screenRefreshRate: 120, screenTechnology: 'AMOLED', mainCameraMp: 200 },
    variants: [
      { sku: 'XMI-RN14P-128-TIM', color: 'Tím', storage: '128GB', ram: '8GB', price: 7990000, stock: 35 },
      { sku: 'XMI-RN14P-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 8990000, compareAtPrice: 9990000, stock: 28 },
    ],
  },
  {
    brand: 'xiaomi', category: 'budget', name: 'Redmi Note 14', slug: 'redmi-note-14',
    shortDescription: 'Redmi Note 14 giá rẻ',
    description: 'Redmi Note 14 chính hãng, Dimensity 7025 Ultra, màn 6.67 inch, pin 5110mAh.',
    specs: { screenSize: 6.67, chipset: 'Dimensity 7025 Ultra', os: 'Android', has5G: true, batteryCapacity: 5110, screenRefreshRate: 120, screenTechnology: 'AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'XMI-RN14-128-XANH', color: 'Xanh', storage: '128GB', ram: '6GB', price: 5990000, stock: 45 },
      { sku: 'XMI-RN14-256-TRANG', color: 'Trắng', storage: '256GB', ram: '8GB', price: 6990000, stock: 30 },
    ],
  },
  {
    brand: 'xiaomi', category: 'budget', name: 'Redmi 14C', slug: 'redmi-14c',
    shortDescription: 'Redmi 14C 4G màn 6.88',
    description: 'Redmi 14C bản 4G, màn 6.88 inch lớn nhất phân khúc, pin 5160mAh, RAM 4GB.',
    specs: { screenSize: 6.88, chipset: 'MediaTek Helio G81 Ultra', os: 'Android', has5G: false, batteryCapacity: 5160, screenRefreshRate: 120, screenTechnology: 'IPS LCD', mainCameraMp: 50 },
    variants: [
      { sku: 'XMI-R14C-64-DEN', color: 'Đen', storage: '64GB', ram: '4GB', price: 3290000, stock: 70 },
      { sku: 'XMI-R14C-128-XANH', color: 'Xanh', storage: '128GB', ram: '6GB', price: 3990000, stock: 55 },
    ],
  },
  {
    brand: 'xiaomi', category: 'gaming-phone', name: 'POCO X7 Pro', slug: 'poco-x7-pro',
    shortDescription: 'POCO X7 Pro gaming',
    description: 'POCO X7 Pro gaming phone, Dimensity 8400 Ultra, pin 6000mAh Silicon-Carbon, màn 6.67 inch.',
    specs: { screenSize: 6.67, chipset: 'Dimensity 8400 Ultra', os: 'Android', has5G: true, batteryCapacity: 6000, screenRefreshRate: 120, screenTechnology: 'CrystalRes AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'XMI-PX7P-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 10990000, compareAtPrice: 12990000, stock: 25 },
      { sku: 'XMI-PX7P-512-VANG', color: 'Vàng', storage: '512GB', ram: '12GB', price: 12990000, stock: 12 },
    ],
  },
  {
    brand: 'xiaomi', category: 'foldable-phone', name: 'Xiaomi MIX Flip', slug: 'xiaomi-mix-flip',
    shortDescription: 'Xiaomi MIX Flip gập vỏ sò',
    description: 'Xiaomi MIX Flip chính hãng, màn gập 6.86 inch, Snapdragon 8 Gen 3, pin 4780mAh.',
    specs: { screenSize: 6.86, chipset: 'Snapdragon 8 Gen 3', os: 'Android', has5G: true, batteryCapacity: 4780, screenRefreshRate: 120, screenTechnology: 'Foldable AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'XMI-MIXF-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 23990000, stock: 6 },
      { sku: 'XMI-MIXF-512-TIM', color: 'Tím', storage: '512GB', ram: '12GB', price: 26990000, stock: 0 },
    ],
  },
  {
    brand: 'xiaomi', category: 'mid-range', name: 'Redmi K80', slug: 'redmi-k80',
    shortDescription: 'Redmi K80 hiệu năng',
    description: 'Redmi K80 xách tay, Snapdragon 8 Gen 3, màn 6.67 inch 2K, pin 6550mAh.',
    specs: { screenSize: 6.67, chipset: 'Snapdragon 8 Gen 3', os: 'Android', has5G: true, batteryCapacity: 6550, screenRefreshRate: 120, screenTechnology: 'AMOLED 2K', mainCameraMp: 50 },
    variants: [
      { sku: 'XMI-K80-256-TRANG', color: 'Trắng', storage: '256GB', ram: '12GB', price: 12990000, stock: 15 },
      { sku: 'XMI-K80-512-XANHLÁ', color: 'Xanh lá', storage: '512GB', ram: '12GB', price: 14990000, stock: 8 },
    ],
  },

  // ================= OPPO (7) =================
  {
    brand: 'oppo', category: 'flagship', name: 'OPPO Find X9 Pro', slug: 'oppo-find-x9-pro',
    shortDescription: 'Find X9 Pro Dimensity 9500',
    description: 'OPPO Find X9 Pro chính hãng, Dimensity 9500, màn 6.78 inch, pin 5670mAh, camera Hasselblad.',
    specs: { screenSize: 6.78, chipset: 'Dimensity 9500', os: 'Android', has5G: true, batteryCapacity: 5670, screenRefreshRate: 120, screenTechnology: 'AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'OPP-FX9P-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 26990000, stock: 10 },
      { sku: 'OPP-FX9P-512-TITAN', color: 'Titan', storage: '512GB', ram: '16GB', price: 30990000, compareAtPrice: 33990000, stock: 5 },
    ],
  },
  {
    brand: 'oppo', category: 'mid-range', name: 'OPPO Reno14 Pro', slug: 'oppo-reno14-pro',
    shortDescription: 'Reno14 Pro pin 6200',
    description: 'OPPO Reno14 Pro chính hãng, Dimensity 8450, màn 6.83 inch, pin 6200mAh.',
    specs: { screenSize: 6.83, chipset: 'Dimensity 8450', os: 'Android', has5G: true, batteryCapacity: 6200, screenRefreshRate: 120, screenTechnology: 'AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'OPP-R14P-256-TIM', color: 'Tím', storage: '256GB', ram: '12GB', price: 16990000, stock: 14 },
      { sku: 'OPP-R14P-512-TRANG', color: 'Trắng', storage: '512GB', ram: '12GB', price: 18990000, stock: 7 },
    ],
  },
  {
    brand: 'oppo', category: 'mid-range', name: 'OPPO Reno14', slug: 'oppo-reno14',
    shortDescription: 'Reno14 pin 6000',
    description: 'OPPO Reno14 chính hãng, Dimensity 8350, màn 6.59 inch, pin 6000mAh.',
    specs: { screenSize: 6.59, chipset: 'Dimensity 8350', os: 'Android', has5G: true, batteryCapacity: 6000, screenRefreshRate: 120, screenTechnology: 'AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'OPP-R14-128-XANHLÁ', color: 'Xanh lá', storage: '128GB', ram: '8GB', price: 11990000, stock: 20 },
      { sku: 'OPP-R14-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 12990000, compareAtPrice: 14490000, stock: 15 },
    ],
  },
  {
    brand: 'oppo', category: 'budget', name: 'OPPO A5 Pro', slug: 'oppo-a5-pro',
    shortDescription: 'OPPO A5 Pro bền bỉ',
    description: 'OPPO A5 Pro chính hãng, Dimensity 6300, màn 6.67 inch, pin 5800mAh, chuẩn bền quân đội.',
    specs: { screenSize: 6.67, chipset: 'Dimensity 6300', os: 'Android', has5G: true, batteryCapacity: 5800, screenRefreshRate: 120, screenTechnology: 'IPS LCD', mainCameraMp: 50 },
    variants: [
      { sku: 'OPP-A5P-128-XANH', color: 'Xanh', storage: '128GB', ram: '6GB', price: 6490000, stock: 35 },
      { sku: 'OPP-A5P-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 7490000, stock: 25 },
    ],
  },
  {
    brand: 'oppo', category: 'budget', name: 'OPPO A3', slug: 'oppo-a3-4g',
    shortDescription: 'OPPO A3 4G',
    description: 'OPPO A3 bản 4G, Snapdragon 6s Gen 1, màn 6.67 inch, pin 5100mAh.',
    specs: { screenSize: 6.67, chipset: 'Snapdragon 6s Gen 1', os: 'Android', has5G: false, batteryCapacity: 5100, screenRefreshRate: 120, screenTechnology: 'IPS LCD', mainCameraMp: 50 },
    variants: [
      { sku: 'OPP-A3-128-DEN', color: 'Đen', storage: '128GB', ram: '6GB', price: 4990000, stock: 40 },
      { sku: 'OPP-A3-256-TRANG', color: 'Trắng', storage: '256GB', ram: '8GB', price: 5990000, stock: 0 },
    ],
  },
  {
    brand: 'oppo', category: 'foldable-phone', name: 'OPPO Find N5', slug: 'oppo-find-n5',
    shortDescription: 'Find N5 gập mỏng nhất',
    description: 'OPPO Find N5 chính hãng, màn gập 8.12 inch, Snapdragon 8 Elite, RAM 16GB, pin 5600mAh.',
    specs: { screenSize: 8.12, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 5600, screenRefreshRate: 120, screenTechnology: 'Foldable AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'OPP-FN5-512-DEN', color: 'Đen', storage: '512GB', ram: '16GB', price: 44990000, stock: 4 },
      { sku: 'OPP-FN5-512-TRANG', color: 'Trắng', storage: '512GB', ram: '16GB', price: 44990000, stock: 2 },
    ],
  },
  {
    brand: 'oppo', category: 'budget', name: 'OPPO K12x', slug: 'oppo-k12x',
    shortDescription: 'OPPO K12x giá rẻ',
    description: 'OPPO K12x chính hãng, Dimensity 6300, màn 6.67 inch, pin 5100mAh.',
    specs: { screenSize: 6.67, chipset: 'Dimensity 6300', os: 'Android', has5G: true, batteryCapacity: 5100, screenRefreshRate: 120, screenTechnology: 'IPS LCD', mainCameraMp: 50 },
    variants: [
      { sku: 'OPP-K12X-128-XANHLÁ', color: 'Xanh lá', storage: '128GB', ram: '6GB', price: 5490000, stock: 30 },
      { sku: 'OPP-K12X-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 6490000, stock: 20 },
    ],
  },

  // ================= VIVO (6) =================
  {
    brand: 'vivo', category: 'flagship', name: 'vivo X300 Pro', slug: 'vivo-x300-pro',
    shortDescription: 'vivo X300 Pro Zeiss',
    description: 'vivo X300 Pro chính hãng, Dimensity 9500, camera Zeiss 200MP, màn 6.78 inch, pin 5750mAh.',
    specs: { screenSize: 6.78, chipset: 'Dimensity 9500', os: 'Android', has5G: true, batteryCapacity: 5750, screenRefreshRate: 120, screenTechnology: 'AMOLED', mainCameraMp: 200 },
    variants: [
      { sku: 'VIV-X300P-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 25990000, stock: 9 },
      { sku: 'VIV-X300P-512-XANH', color: 'Xanh', storage: '512GB', ram: '16GB', price: 29990000, stock: 4 },
    ],
  },
  {
    brand: 'vivo', category: 'mid-range', name: 'vivo V40', slug: 'vivo-v40',
    shortDescription: 'vivo V40 chụp đẹp',
    description: 'vivo V40 chính hãng, Snapdragon 7 Gen 3, màn 6.78 inch cong, pin 5500mAh.',
    specs: { screenSize: 6.78, chipset: 'Snapdragon 7 Gen 3', os: 'Android', has5G: true, batteryCapacity: 5500, screenRefreshRate: 120, screenTechnology: 'AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'VIV-V40-128-TIM', color: 'Tím', storage: '128GB', ram: '8GB', price: 12990000, stock: 18 },
      { sku: 'VIV-V40-256-XANH', color: 'Xanh', storage: '256GB', ram: '12GB', price: 14990000, compareAtPrice: 16490000, stock: 12 },
    ],
  },
  {
    brand: 'vivo', category: 'budget', name: 'vivo Y100', slug: 'vivo-y100',
    shortDescription: 'vivo Y100 4G',
    description: 'vivo Y100 bản 4G, Snapdragon 685, màn 6.67 inch AMOLED, pin 5000mAh.',
    specs: { screenSize: 6.67, chipset: 'Snapdragon 685', os: 'Android', has5G: false, batteryCapacity: 5000, screenRefreshRate: 120, screenTechnology: 'AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'VIV-Y100-128-XANH', color: 'Xanh', storage: '128GB', ram: '8GB', price: 5990000, stock: 35 },
      { sku: 'VIV-Y100-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 6990000, stock: 0 },
    ],
  },
  {
    brand: 'vivo', category: 'budget', name: 'vivo Y03', slug: 'vivo-y03',
    shortDescription: 'vivo Y03 dưới 3 triệu',
    description: 'vivo Y03 bản 4G giá rẻ nhất, màn 6.56 inch, pin 5000mAh, RAM 4GB, bộ nhớ 64GB.',
    specs: { screenSize: 6.56, chipset: 'MediaTek Helio G85', os: 'Android', has5G: false, batteryCapacity: 5000, screenRefreshRate: 90, screenTechnology: 'IPS LCD', mainCameraMp: 13 },
    variants: [
      { sku: 'VIV-Y03-64-DEN', color: 'Đen', storage: '64GB', ram: '4GB', price: 2990000, stock: 80 },
      { sku: 'VIV-Y03-128-XANHLÁ', color: 'Xanh lá', storage: '128GB', ram: '4GB', price: 3490000, stock: 60 },
    ],
  },
  {
    brand: 'vivo', category: 'gaming-phone', name: 'vivo iQOO 13', slug: 'vivo-iqoo-13',
    shortDescription: 'iQOO 13 gaming',
    description: 'vivo iQOO 13 gaming phone, Snapdragon 8 Elite, màn 6.82 inch 144Hz, pin 6150mAh.',
    specs: { screenSize: 6.82, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 6150, screenRefreshRate: 144, screenTechnology: 'LTPO AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'VIV-IQ13-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 18990000, stock: 12 },
      { sku: 'VIV-IQ13-512-VANG', color: 'Vàng', storage: '512GB', ram: '16GB', price: 21990000, compareAtPrice: 23990000, stock: 6 },
    ],
  },
  {
    brand: 'vivo', category: 'foldable-phone', name: 'vivo X Fold5', slug: 'vivo-x-fold5',
    shortDescription: 'vivo X Fold5',
    description: 'vivo X Fold5 chính hãng, màn gập 8.03 inch, Snapdragon 8 Gen 3, pin 6000mAh.',
    specs: { screenSize: 8.03, chipset: 'Snapdragon 8 Gen 3', os: 'Android', has5G: true, batteryCapacity: 6000, screenRefreshRate: 120, screenTechnology: 'Foldable AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'VIV-XF5-256-TITAN', color: 'Titan', storage: '256GB', ram: '12GB', price: 39990000, stock: 3 },
      { sku: 'VIV-XF5-512-DEN', color: 'Đen', storage: '512GB', ram: '12GB', price: 43990000, stock: 0 },
    ],
  },

  // ================= GOOGLE (4, Tensor) =================
  {
    brand: 'google', category: 'flagship', name: 'Google Pixel 10 Pro XL', slug: 'pixel-10-pro-xl',
    shortDescription: 'Pixel 10 Pro XL Tensor G5',
    description: 'Google Pixel 10 Pro XL xách tay Mỹ, Tensor G5, màn 6.8 inch, pin 5200mAh, camera AI.',
    specs: { screenSize: 6.8, chipset: 'Google Tensor G5', os: 'Android', has5G: true, batteryCapacity: 5200, screenRefreshRate: 120, screenTechnology: 'LTPO OLED', mainCameraMp: 50 },
    variants: [
      { sku: 'GOO-P10PXL-128-DEN', color: 'Đen', storage: '128GB', ram: '16GB', price: 27990000, stock: 7 },
      { sku: 'GOO-P10PXL-256-TRANG', color: 'Trắng', storage: '256GB', ram: '16GB', price: 30990000, stock: 4 },
    ],
  },
  {
    brand: 'google', category: 'flagship', name: 'Google Pixel 10', slug: 'pixel-10',
    shortDescription: 'Pixel 10 tiêu chuẩn',
    description: 'Google Pixel 10 xách tay, Tensor G5, màn 6.3 inch, pin 4970mAh.',
    specs: { screenSize: 6.3, chipset: 'Google Tensor G5', os: 'Android', has5G: true, batteryCapacity: 4970, screenRefreshRate: 120, screenTechnology: 'Actua OLED', mainCameraMp: 50 },
    variants: [
      { sku: 'GOO-P10-128-XANH', color: 'Xanh', storage: '128GB', ram: '8GB', price: 19990000, stock: 10 },
      { sku: 'GOO-P10-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 22990000, stock: 6 },
    ],
  },
  {
    brand: 'google', category: 'mid-range', name: 'Google Pixel 9a', slug: 'pixel-9a',
    shortDescription: 'Pixel 9a giá tốt',
    description: 'Google Pixel 9a xách tay, Tensor G4, màn 6.0 inch gọn, pin 5100mAh.',
    specs: { screenSize: 6.0, chipset: 'Google Tensor G4', os: 'Android', has5G: true, batteryCapacity: 5100, screenRefreshRate: 120, screenTechnology: 'pOLED', mainCameraMp: 48 },
    variants: [
      { sku: 'GOO-P9A-128-TIM', color: 'Tím', storage: '128GB', ram: '8GB', price: 11990000, compareAtPrice: 13990000, stock: 14 },
      { sku: 'GOO-P9A-256-TRANG', color: 'Trắng', storage: '256GB', ram: '8GB', price: 13490000, stock: 9 },
    ],
  },
  {
    brand: 'google', category: 'foldable-phone', name: 'Google Pixel 9 Pro Fold', slug: 'pixel-9-pro-fold',
    shortDescription: 'Pixel 9 Pro Fold',
    description: 'Google Pixel 9 Pro Fold xách tay, màn gập 8.0 inch, Tensor G4, RAM 16GB.',
    specs: { screenSize: 8.0, chipset: 'Google Tensor G4', os: 'Android', has5G: true, batteryCapacity: 4650, screenRefreshRate: 120, screenTechnology: 'Foldable OLED', mainCameraMp: 48 },
    variants: [
      { sku: 'GOO-P9PF-256-DEN', color: 'Đen', storage: '256GB', ram: '16GB', price: 41990000, stock: 2 },
      { sku: 'GOO-P9PF-512-TRANG', color: 'Trắng', storage: '512GB', ram: '16GB', price: 45990000, stock: 0 },
    ],
  },

  // ================= ONEPLUS (4) =================
  {
    brand: 'oneplus', category: 'flagship', name: 'OnePlus 13', slug: 'oneplus-13',
    shortDescription: 'OnePlus 13 Snapdragon 8 Elite',
    description: 'OnePlus 13 chính hãng, Snapdragon 8 Elite, màn 6.82 inch 2K, pin 6000mAh, sạc 100W.',
    specs: { screenSize: 6.82, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 6000, screenRefreshRate: 120, screenTechnology: 'LTPO AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'ONE-13-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 20990000, stock: 12 },
      { sku: 'ONE-13-512-XANH', color: 'Xanh', storage: '512GB', ram: '16GB', price: 23990000, compareAtPrice: 25990000, stock: 6 },
    ],
  },
  {
    brand: 'oneplus', category: 'mid-range', name: 'OnePlus 12R', slug: 'oneplus-12r',
    shortDescription: 'OnePlus 12R',
    description: 'OnePlus 12R chính hãng, Snapdragon 8 Gen 2, màn 6.78 inch, pin 5500mAh.',
    specs: { screenSize: 6.78, chipset: 'Snapdragon 8 Gen 2', os: 'Android', has5G: true, batteryCapacity: 5500, screenRefreshRate: 120, screenTechnology: 'LTPO AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'ONE-12R-128-XANH', color: 'Xanh', storage: '128GB', ram: '8GB', price: 13990000, stock: 15 },
      { sku: 'ONE-12R-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 15990000, stock: 9 },
    ],
  },
  {
    brand: 'oneplus', category: 'mid-range', name: 'OnePlus Nord 4', slug: 'oneplus-nord-4',
    shortDescription: 'Nord 4 kim loại',
    description: 'OnePlus Nord 4 chính hãng, Snapdragon 7+ Gen 3, màn 6.74 inch, pin 5500mAh.',
    specs: { screenSize: 6.74, chipset: 'Snapdragon 7+ Gen 3', os: 'Android', has5G: true, batteryCapacity: 5500, screenRefreshRate: 120, screenTechnology: 'Fluid AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'ONE-NORD4-128-XANHLÁ', color: 'Xanh lá', storage: '128GB', ram: '8GB', price: 9490000, stock: 20 },
      { sku: 'ONE-NORD4-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 10490000, stock: 14 },
    ],
  },
  {
    brand: 'oneplus', category: 'budget', name: 'OnePlus Nord CE4 Lite 4G', slug: 'oneplus-nord-ce4-lite-4g',
    shortDescription: 'Nord CE4 Lite 4G',
    description: 'OnePlus Nord CE4 Lite bản 4G, Snapdragon 685, màn 6.67 inch, pin 5500mAh.',
    specs: { screenSize: 6.67, chipset: 'Snapdragon 685', os: 'Android', has5G: false, batteryCapacity: 5500, screenRefreshRate: 120, screenTechnology: 'AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'ONE-NCE4L-128-XANH', color: 'Xanh', storage: '128GB', ram: '8GB', price: 5490000, stock: 30 },
      { sku: 'ONE-NCE4L-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 6490000, stock: 18 },
    ],
  },

  // ================= REALME (4) =================
  {
    brand: 'realme', category: 'gaming-phone', name: 'realme GT 7 Pro', slug: 'realme-gt-7-pro',
    shortDescription: 'GT 7 Pro pin 6500',
    description: 'realme GT 7 Pro gaming, Snapdragon 8 Elite, pin 6500mAh lớn nhất, màn 6.78 inch.',
    specs: { screenSize: 6.78, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 6500, screenRefreshRate: 120, screenTechnology: 'LTPO AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'REA-GT7P-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 16990000, compareAtPrice: 19990000, stock: 14 },
      { sku: 'REA-GT7P-512-VANG', color: 'Vàng', storage: '512GB', ram: '12GB', price: 18990000, stock: 7 },
    ],
  },
  {
    brand: 'realme', category: 'mid-range', name: 'realme 13 Pro+', slug: 'realme-13-pro-plus',
    shortDescription: 'realme 13 Pro+',
    description: 'realme 13 Pro+ chính hãng, Snapdragon 7s Gen 2, màn 6.7 inch cong, pin 5200mAh.',
    specs: { screenSize: 6.7, chipset: 'Snapdragon 7s Gen 2', os: 'Android', has5G: true, batteryCapacity: 5200, screenRefreshRate: 120, screenTechnology: 'Curved AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'REA-13PP-128-VANG', color: 'Vàng', storage: '128GB', ram: '8GB', price: 10990000, stock: 22 },
      { sku: 'REA-13PP-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 12490000, stock: 15 },
    ],
  },
  {
    brand: 'realme', category: 'budget', name: 'realme C75', slug: 'realme-c75-4g',
    shortDescription: 'realme C75 4G pin 6000',
    description: 'realme C75 bản 4G, pin 6000mAh, màn 6.72 inch, chuẩn bền quân đội.',
    specs: { screenSize: 6.72, chipset: 'MediaTek Helio G92 Max', os: 'Android', has5G: false, batteryCapacity: 6000, screenRefreshRate: 90, screenTechnology: 'IPS LCD', mainCameraMp: 50 },
    variants: [
      { sku: 'REA-C75-64-VANG', color: 'Vàng', storage: '64GB', ram: '4GB', price: 3990000, stock: 45 },
      { sku: 'REA-C75-128-DEN', color: 'Đen', storage: '128GB', ram: '8GB', price: 4490000, stock: 45 },
      { sku: 'REA-C75-256-DEN', color: 'Đen', storage: '256GB', ram: '8GB', price: 5490000, stock: 30 },
    ],
  },
  {
    brand: 'realme', category: 'budget', name: 'realme Note 60', slug: 'realme-note-60',
    shortDescription: 'realme Note 60 dưới 3 triệu',
    description: 'realme Note 60 bản 4G giá rẻ nhất, màn 6.74 inch, pin 5000mAh, RAM 4GB, bộ nhớ 64GB.',
    specs: { screenSize: 6.74, chipset: 'Unisoc T612', os: 'Android', has5G: false, batteryCapacity: 5000, screenRefreshRate: 90, screenTechnology: 'IPS LCD', mainCameraMp: 32 },
    variants: [
      { sku: 'REA-N60-64-DEN', color: 'Đen', storage: '64GB', ram: '4GB', price: 2790000, stock: 90 },
      { sku: 'REA-N60-128-XANH', color: 'Xanh', storage: '128GB', ram: '4GB', price: 3290000, stock: 70 },
    ],
  },

  // ================= ASUS (2 gaming) =================
  {
    brand: 'asus', category: 'gaming-phone', name: 'ASUS ROG Phone 9 Pro', slug: 'asus-rog-phone-9-pro',
    shortDescription: 'ROG Phone 9 Pro RAM 16GB',
    description: 'ASUS ROG Phone 9 Pro gaming phone, Snapdragon 8 Elite, RAM 16GB, màn 6.78 inch 185Hz, pin 5800mAh.',
    specs: { screenSize: 6.78, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 5800, screenRefreshRate: 185, screenTechnology: 'LTPO AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'ASUS-ROG9P-512-DEN', color: 'Đen', storage: '512GB', ram: '16GB', price: 29990000, stock: 5 },
      { sku: 'ASUS-ROG9P-1T-TRANG', color: 'Trắng', storage: '1TB', ram: '16GB', price: 34990000, stock: 2 },
    ],
  },
  {
    brand: 'asus', category: 'flagship', name: 'ASUS Zenfone 12 Ultra', slug: 'asus-zenfone-12-ultra',
    shortDescription: 'Zenfone 12 Ultra',
    description: 'ASUS Zenfone 12 Ultra chính hãng, Snapdragon 8 Elite, màn 6.78 inch, pin 5500mAh.',
    specs: { screenSize: 6.78, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 5500, screenRefreshRate: 144, screenTechnology: 'LTPO AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'ASUS-ZF12U-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 22490000, stock: 8 },
      { sku: 'ASUS-ZF12U-512-XANH', color: 'Xanh', storage: '512GB', ram: '12GB', price: 25490000, compareAtPrice: 27990000, stock: 4 },
    ],
  },

  // ================= NOTHING / SONY / MOTOROLA =================
  {
    brand: 'nothing', category: 'mid-range', name: 'Nothing Phone 3', slug: 'nothing-phone-3',
    shortDescription: 'Nothing Phone 3 Glyph',
    description: 'Nothing Phone 3 chính hãng, Snapdragon 8s Gen 4, màn 6.67 inch, pin 5150mAh, đèn Glyph.',
    specs: { screenSize: 6.67, chipset: 'Snapdragon 8s Gen 4', os: 'Android', has5G: true, batteryCapacity: 5150, screenRefreshRate: 120, screenTechnology: 'LTPO AMOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'NOT-NP3-128-TRANG', color: 'Trắng', storage: '128GB', ram: '8GB', price: 14990000, stock: 12 },
      { sku: 'NOT-NP3-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 16990000, stock: 8 },
    ],
  },
  {
    brand: 'sony', category: 'flagship', name: 'Sony Xperia 1 VII', slug: 'sony-xperia-1-vii',
    shortDescription: 'Xperia 1 VII màn 4K',
    description: 'Sony Xperia 1 VII chính hãng, Snapdragon 8 Elite, màn 6.5 inch 4K 120Hz, pin 5000mAh.',
    specs: { screenSize: 6.5, chipset: 'Snapdragon 8 Elite', os: 'Android', has5G: true, batteryCapacity: 5000, screenRefreshRate: 120, screenTechnology: '4K OLED', mainCameraMp: 48 },
    variants: [
      { sku: 'SON-X1VII-256-DEN', color: 'Đen', storage: '256GB', ram: '12GB', price: 28990000, stock: 5 },
      { sku: 'SON-X1VII-512-TIM', color: 'Tím', storage: '512GB', ram: '12GB', price: 31990000, stock: 0 },
    ],
  },
  {
    brand: 'motorola', category: 'budget', name: 'Motorola Moto G85', slug: 'moto-g85',
    shortDescription: 'Moto G85 màn cong',
    description: 'Motorola Moto G85 chính hãng, Snapdragon 6s Gen 3, màn 6.7 inch cong pOLED, pin 5000mAh.',
    specs: { screenSize: 6.7, chipset: 'Snapdragon 6s Gen 3', os: 'Android', has5G: true, batteryCapacity: 5000, screenRefreshRate: 144, screenTechnology: 'pOLED', mainCameraMp: 50 },
    variants: [
      { sku: 'MOT-G85-128-XANH', color: 'Xanh', storage: '128GB', ram: '8GB', price: 6990000, compareAtPrice: 7990000, stock: 25 },
      { sku: 'MOT-G85-256-TIM', color: 'Tím', storage: '256GB', ram: '8GB', price: 7990000, stock: 18 },
    ],
  },
];

// Products with non-ACTIVE status for admin filter testing (deterministic subset)
const NON_ACTIVE_SLUGS: Record<string, ProductStatus> = {
  'sony-xperia-1-vii': ProductStatus.INACTIVE,
  'pixel-9-pro-fold': ProductStatus.DRAFT,
  'vivo-x-fold5': ProductStatus.DISCONTINUED,
};

// Products with non-NEW condition for condition filter testing
const NON_NEW_SLUGS: Record<string, ProductCondition> = {
  'iphone-14': ProductCondition.REFURBISHED,
  'galaxy-s25-ultra': ProductCondition.REFURBISHED,
  'xiaomi-15': ProductCondition.REFURBISHED,
  'oppo-reno14': ProductCondition.USED,
  'vivo-v40': ProductCondition.USED,
  'pixel-9a': ProductCondition.REFURBISHED,
  'realme-13-pro-plus': ProductCondition.USED,
};

// ---------------------------------------------------------------------------
// Seed function — upsert brands, categories (hierarchy), products, variants,
// inventories (with varied stock for inStock filter). Idempotent.
// ---------------------------------------------------------------------------
export async function seedCatalog(prisma: PrismaClient) {
  console.log('  Catalog: upserting 12 brands...');
  const brandMap: Record<string, string> = {};
  for (const b of BRAND_SEEDS) {
    const row = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, description: b.description, logoUrl: b.logoUrl, isActive: true },
      create: { name: b.name, slug: b.slug, description: b.description, logoUrl: b.logoUrl, isActive: true },
    });
    brandMap[b.slug] = row.id;
  }

  console.log('  Catalog: upserting 6 categories (hierarchy)...');
  const catMap: Record<string, string> = {};
  // parents first
  for (const c of CATEGORY_SEEDS.filter((x) => !x.parent)) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, parentId: null, isActive: true, sortOrder: c.sortOrder },
      create: { name: c.name, slug: c.slug, description: c.description, parentId: null, isActive: true, sortOrder: c.sortOrder },
    });
    catMap[c.slug] = row.id;
  }
  for (const c of CATEGORY_SEEDS.filter((x) => x.parent)) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, parentId: catMap[c.parent!], isActive: true, sortOrder: c.sortOrder },
      create: { name: c.name, slug: c.slug, description: c.description, parentId: catMap[c.parent!], isActive: true, sortOrder: c.sortOrder },
    });
    catMap[c.slug] = row.id;
  }

  console.log(`  Catalog: upserting ${PRODUCT_SEEDS.length} products + variants...`);
  let variantCount = 0;
  // stagger createdAt over 180 days so newest/best-seller sorts are meaningful
  const now = Date.now();
  for (let i = 0; i < PRODUCT_SEEDS.length; i++) {
    const p = PRODUCT_SEEDS[i];
    const createdAt = new Date(now - (180 - i * 2.5) * 86400000);
    const status = NON_ACTIVE_SLUGS[p.slug] ?? ProductStatus.ACTIVE;
    const condition = NON_NEW_SLUGS[p.slug] ?? ProductCondition.NEW;
    const thumb = r2(p.slug);

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        brandId: brandMap[p.brand],
        categoryId: catMap[p.category],
        name: p.name,
        description: p.description,
        shortDescription: p.shortDescription,
        specs: p.specs,
        condition,
        status,
        thumbnailUrl: thumb,
        warrantyMonths: p.warrantyMonths ?? 12,
      },
      create: {
        brandId: brandMap[p.brand],
        categoryId: catMap[p.category],
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        specs: p.specs,
        condition,
        status,
        thumbnailUrl: thumb,
        warrantyMonths: p.warrantyMonths ?? 12,
        createdAt,
      },
    });

    for (const v of p.variants) {
      const costPrice = Math.round(v.price * 0.82);
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          productId: product.id,
          name: `${p.name} ${v.storage} ${v.color}`,
          color: v.color,
          storage: v.storage,
          ram: v.ram,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          costPrice,
          imageUrl: thumb,
          isActive: v.active ?? true,
        },
        create: {
          productId: product.id,
          sku: v.sku,
          name: `${p.name} ${v.storage} ${v.color}`,
          color: v.color,
          storage: v.storage,
          ram: v.ram,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          costPrice,
          imageUrl: thumb,
          isActive: v.active ?? true,
        },
      });
      variantCount++;

      // Inventory with varied stock (variant.stock = desired availableQty)
      const variant = await prisma.productVariant.findUniqueOrThrow({ where: { sku: v.sku } });
      const available = v.stock;
      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: { quantity: available, availableQty: available, reservedQty: 0, reorderLevel: 5 },
        create: { variantId: variant.id, quantity: available, availableQty: available, reservedQty: 0, reorderLevel: 5 },
      });
    }
  }

  const totalProducts = await prisma.product.count();
  const totalVariants = await prisma.productVariant.count({ where: { isActive: true } });
  console.log(`  ✔ Catalog ready: ${totalProducts} products, ${totalVariants} active variants (${variantCount} upserted this run).`);
  return { totalProducts, totalVariants };
}
