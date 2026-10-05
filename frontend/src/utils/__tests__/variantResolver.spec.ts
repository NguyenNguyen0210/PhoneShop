// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { resolveVariantBySpecs, getStoragesForColor } from '../variantResolver';
import type { ProductVariant } from '../../types';

const mk = (id: string, color: string, storage: string, ram?: string): ProductVariant =>
  ({ id, color, storage, ram, price: 10000000, sku: id } as ProductVariant);

// var-2 (thường) đứng TRƯỚC var-1-flash trong mảng — đúng thứ tự gây ra bug thực tế
const variants = [
  mk('var-2', 'Đen', '256GB', '8GB'),
  mk('var-1-flash', 'Đen', '256GB', '12GB'),
  mk('var-3', 'Trắng', '256GB', '12GB'),
];
const flashIds = new Set(['var-1-flash']);

describe('resolveVariantBySpecs', () => {
  it('ưu tiên variant flash khi lựa chọn mơ hồ (cùng màu+dung lượng, khác RAM)', () => {
    const got = resolveVariantBySpecs(variants, [{ color: 'Đen', storage: '256GB' }], flashIds);
    expect(got?.id).toBe('var-1-flash');
  });

  it('giữ nguyên sub-variant RAM khi khớp tuyệt đối (ổn định, không giật giá)', () => {
    const got = resolveVariantBySpecs(
      variants,
      [{ color: 'Đen', storage: '256GB', ram: '8GB' }, { color: 'Đen', storage: '256GB' }],
      flashIds
    );
    expect(got?.id).toBe('var-2');
  });

  it('khớp tuyệt đối cả RAM khi variant yêu cầu là duy nhất', () => {
    const got = resolveVariantBySpecs(
      variants,
      [{ color: 'Trắng', storage: '256GB', ram: '12GB' }, { color: 'Trắng', storage: '256GB' }],
      flashIds
    );
    expect(got?.id).toBe('var-3');
  });

  it('fallback sang variant đầu khi không có flash liên quan', () => {
    const got = resolveVariantBySpecs(
      [mk('a', 'Xanh', '128GB', '6GB'), mk('b', 'Xanh', '128GB', '8GB')],
      [{ color: 'Xanh', storage: '128GB' }],
      flashIds
    );
    expect(got?.id).toBe('a');
  });

  it('trả về undefined khi không specs nào khớp', () => {
    expect(resolveVariantBySpecs(variants, [{ color: 'Tím' }], flashIds)).toBeUndefined();
  });
});

describe('getStoragesForColor', () => {
  const multi = [
    mk('y256', 'Vàng', '256GB'),
    mk('t256', 'Xám Titan', '256GB'),
    mk('t512', 'Xám Titan', '512GB'),
  ];

  it('màu nào chỉ trả về bản của màu đó', () => {
    expect(getStoragesForColor(multi, 'Vàng')).toEqual(['256GB']);
    expect(getStoragesForColor(multi, 'Xám Titan')).toEqual(['256GB', '512GB']);
  });

  it('trả về mảng rỗng khi màu không tồn tại', () => {
    expect(getStoragesForColor(multi, 'Tím')).toEqual([]);
  });
});
