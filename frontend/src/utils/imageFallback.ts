const base = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const FALLBACK_PRODUCT_IMAGE = `${base}/products/iphone-16-pro-max.webp`;
export const r2Url = (path: string) => `${base}/${path.replace(/^\//, '')}`;
