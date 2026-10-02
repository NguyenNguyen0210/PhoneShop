import type { Product, Brand, Category } from '../types';
import { applePhones } from './phones/applePhones';
import { samsungPhones } from './phones/samsungPhones';
import { otherPhones } from './phones/otherPhones';

export const mockBrands: Brand[] = [
  { id: 'b-apple', name: 'Apple', slug: 'apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
  { id: 'b-samsung', name: 'Samsung', slug: 'samsung', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
  { id: 'b-xiaomi', name: 'Xiaomi', slug: 'xiaomi', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg' },
  { id: 'b-google', name: 'Google Pixel', slug: 'google', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
  { id: 'b-oppo', name: 'OPPO', slug: 'oppo', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/OPPO_Logo.svg' },
];

export const mockCategories: Category[] = [
  { id: 'c-flagship', name: 'Điện thoại Flagship', slug: 'dien-thoai-flagship' },
  { id: 'c-foldable', name: 'Điện thoại Màn hình gập', slug: 'dien-thoai-man-hinh-gap' },
  { id: 'c-midrange', name: 'Điện thoại Tầm trung', slug: 'dien-thoai-tam-trung' },
  { id: 'c-budget', name: 'Điện thoại Phổ thông', slug: 'dien-thoai-pho-thong' },
];

/**
 * 24 Verified Authentic Smartphones Catalog
 * Sourced via Tavily MCP from CellphoneS, Thế Giới Di Động, and Điện Máy Xanh.
 * Perfectly balanced 4-column desktop layout (6 rows x 4 items) & 2-column mobile layout.
 */
export const mockProducts: Product[] = [
  ...applePhones,
  ...samsungPhones,
  ...otherPhones,
];

export { applePhones, samsungPhones, otherPhones };
