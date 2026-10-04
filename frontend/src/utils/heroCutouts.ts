import type { Product } from '../types';
import { FALLBACK_PRODUCT_IMAGE } from './imageFallback';

export const TRANSPARENT_PHONE_CUTOUTS: Record<string, string> = {
  'honor-200-5g': '/products/transparent/honor-200-5g.webp',
  'honor-x9b': '/products/transparent/honor-x9b.webp',
  'honor-magic6-pro': '/products/transparent/honor-magic6-pro.webp',
  'sony-xperia-10-vi': '/products/transparent/sony-xperia-10-vi.webp',
  'sony-xperia-1-vi': '/products/transparent/sony-xperia-1-vi.webp',
};

export const getHeroCutoutImage = (product: Product): string => {
  const slug = (product.slug || '').toLowerCase();
  if (slug && TRANSPARENT_PHONE_CUTOUTS[slug]) {
    return TRANSPARENT_PHONE_CUTOUTS[slug];
  }
  for (const [key, path] of Object.entries(TRANSPARENT_PHONE_CUTOUTS)) {
    if (slug.includes(key) || key.includes(slug)) {
      return path;
    }
  }
  return product.thumbnail ?? product.thumbnailUrl ?? FALLBACK_PRODUCT_IMAGE;
};
