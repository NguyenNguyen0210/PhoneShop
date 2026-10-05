import type { ProductVariant } from '../types';

export interface VariantSpecs {
  color?: string;
  storage?: string;
  /** ram === undefined nghĩa là bỏ qua chiều RAM khi khớp. */
  ram?: string;
}

export function matchVariantSpecs(v: ProductVariant, specs: VariantSpecs): boolean {
  if (specs.color !== undefined && v.color !== specs.color) return false;
  if (specs.storage !== undefined && v.storage !== specs.storage) return false;
  if (specs.ram !== undefined && (v.ram || '') !== specs.ram) return false;
  return true;
}

/**
 * Dung lượng tồn tại của một màu (giữ thứ tự xuất hiện trong mảng variants).
 * Dùng cho selector phụ thuộc: màu nào chỉ hiện bản đó, không cho bấm bản không tồn tại.
 */
export function getStoragesForColor(variants: ProductVariant[], color: string): string[] {
  const seen = new Set<string>();
  for (const v of variants) {
    if (v.color === color && !seen.has(v.storage)) {
      seen.add(v.storage);
    }
  }
  return Array.from(seen);
}
/**
 * Resolve variant từ lựa chọn cấu hình (màu / dung lượng).
 *
 * Root cause từng gây mất giá flash sale: handler cũ dùng `Array.find` chỉ theo
 * (color, storage) trong khi 2 variant có thể cùng màu+dung lượng nhưng khác RAM —
 * `find` luôn trúng variant thường đứng trước và không có đường UI nào quay lại
 * variant flash. Resolver này thử specs theo thứ tự ưu tiên; khi nhiều variant
 * cùng khớp một lựa chọn mơ hồ thì ưu tiên variant còn suất flash sale để
 * không bao giờ "mất deal" vì thao tác chọn (không bao giờ tính thừa cho khách).
 */
export function resolveVariantBySpecs(
  variants: ProductVariant[],
  specPriority: VariantSpecs[],
  flashVariantIds?: Set<string>
): ProductVariant | undefined {
  for (const specs of specPriority) {
    const tied = variants.filter((v) => matchVariantSpecs(v, specs));
    if (tied.length === 0) continue;
    if (tied.length === 1) return tied[0];
    if (flashVariantIds && flashVariantIds.size > 0) {
      const flash = tied.find((v) => flashVariantIds.has(String(v.id)));
      if (flash) return flash;
    }
    return tied[0];
  }
  return undefined;
}
