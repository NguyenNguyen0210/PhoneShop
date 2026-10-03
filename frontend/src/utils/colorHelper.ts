/**
 * Color Helper for PhoneShop E-Commerce
 * Resolves real smartphone color names to authentic manufacturer HEX colors
 * Supports Apple, Samsung, OPPO, Xiaomi, Vivo, Google Pixel, Realme, Sony, and ASUS.
 */

export interface ColorSwatch {
  name: string;
  hex: string;
}

// Master dictionary of real Vietnamese & International smartphone color names
export const COLOR_MAP: Record<string, string> = {
  // Apple Flagships
  'titan sa mạc': '#c2a88e',
  'titan tự nhiên': '#99948d',
  'titan trắng': '#e8e8e6',
  'titan đen': '#3c3b39',
  'titan xanh': '#2f3844',
  'hồng': '#f4c3cb',
  'xanh mòng két': '#84b5ab',
  'xanh lưu ly': '#4361ee',
  'xanh lá': '#d4e4d6',
  'tím pastel': '#e8dcf0',
  'đen midnight': '#1f2022',
  'đỏ product red': '#d92d3a',

  // OPPO & Foldables
  'đen hổ phách': '#2c2826',
  'vàng thạch anh': '#e6cf9b',
  'hồng ngọc bích': '#e8a8b8',
  'hồng ánh ngọc': '#f3c8d1',
  'vàng cổ điển': '#d8b87e',
  'nâu tinh vân': '#52433d',
  'bạc vũ trụ': '#c7cbd1',
  'xanh đại dương': '#5d8ba6',
  'tím dạ quang': '#9782a8',

  // Samsung Galaxy
  'xám titan': '#797775',
  'đen titan': '#353535',
  'vàng titan': '#e8dbb5',
  'vàng amber': '#f5cf6d',
  'vàng lemon': '#f5ebad',
  'tím cobalt': '#4d4a68',
  'xanh topaz': '#a0c4d8',
  'bạc shadow': '#cfd2d6',
  'xanh maya': '#354c6b',
  'xanh iceblue': '#c7dcf0',
  'xanh navy': '#252e3d',
  'xanh lơ': '#9fc4e2',
  'xanh lilac': '#b8a9c9',
  'đen onyx': '#1e2022',
  'xám marble': '#8e9189',
  'xám metal': '#6b7280',
  'đen awesome': '#18181b',

  // Xiaomi & POCO
  'đen da thuần chay': '#1e1e1e',
  'trắng lưng da': '#f5f5f7',
  'xanh ngọc jade': '#647e68',
  'xanh ngọc': '#a0c7b5',
  'xanh mint': '#a8dfd1',
  'đen bán dạ': '#212121',
  'đen vân đá': '#1b1b1b',
  'vàng poco da thuần chay': '#e8b828',

  // Google Pixel, Vivo, Realme, Sony, ASUS
  'đen obsidian': '#26282a',
  'obsidian': '#26282a',
  'xám hazel': '#8e9189',
  'trắng porcelain': '#eae7e1',
  'porcelain': '#eae7e1',
  'peony': '#f4a5ae',
  'wintergreen': '#9bb894',
  'xanh bay': '#84a6c2',
  'xanh nha đam (aloe)': '#9bb894',
  'tím dạ khúc': '#8b7c9e',
  'cam ánh dương': '#e8915b',
  'bạc khương tuyến': '#bfc5cb',
  'xanh tàu biển da thuần chay': '#1e3a5f',
  'xanh rừng sâu': '#3c5a4b',
  'xanh ô liu': '#72886a',
  'đen cổ điển': '#1f2022',
  'đen huyễn ảnh': '#1d1e20',
  'xanh pastel': '#9bbec7',
  'xanh skyline': '#3b5874',
  'xanh epi green': '#4d695b',
  'trắng ánh trăng': '#f0f0f2',
  'bạc ánh trăng': '#d8dee3',
  'xanh sóng biển': '#6da7b8',
  'xanh tinh vân': '#3a5a78',
  'cam bình minh da thuần chay': '#d86e39',
  'hoàng hôn': '#e88d67',
  'tím cực quang': '#7c5295',

  // Generic basics
  'đen': '#18181b',
  'black': '#18181b',
  'trắng': '#f8fafc',
  'white': '#f8fafc',
  'vàng': '#f5cf6d',
  'gold': '#f5cf6d',
  'bạc': '#d4d4d8',
  'silver': '#d4d4d8',
  'xám': '#71717a',
  'gray': '#71717a',
  'grey': '#71717a',
  'tím': '#8b7c9e',
  'purple': '#8b7c9e',
  'violet': '#7c3aed',
  'cam': '#f97316',
  'orange': '#f97316',
  'đỏ': '#ef4444',
  'red': '#ef4444',
};

/**
 * Resolves a given color name or existing hex to a vivid, authentic HEX string.
 */
export function resolveColorHex(colorName?: string | null, existingHex?: string | null): string {
  // If an authentic HEX was explicitly provided and is valid, use it
  if (existingHex && existingHex.startsWith('#') && existingHex.length >= 4) {
    // If it's not the generic default slate grey (#94a3b8 or #475569), respect it
    if (existingHex !== '#94a3b8' && existingHex !== '#475569') {
      return existingHex;
    }
  }

  if (!colorName || typeof colorName !== 'string') {
    return '#334155';
  }

  const normalized = colorName.trim().toLowerCase();

  // 1. Direct dictionary match
  if (COLOR_MAP[normalized]) {
    return COLOR_MAP[normalized];
  }

  // 2. Keyword-based intelligent detection
  if (normalized.includes('đen') || normalized.includes('black') || normalized.includes('obsidian') || normalized.includes('bán dạ') || normalized.includes('tối')) {
    return '#1f2022';
  }
  if (normalized.includes('trắng') || normalized.includes('white') || normalized.includes('porcelain') || normalized.includes('moonlight') || normalized.includes('ánh trăng')) {
    return '#f8fafc';
  }
  if (normalized.includes('hồng') || normalized.includes('pink') || normalized.includes('rose') || normalized.includes('peony') || normalized.includes('ngọc bích') || normalized.includes('ánh ngọc')) {
    return '#f0c7cc';
  }
  if (normalized.includes('vàng') || normalized.includes('gold') || normalized.includes('amber') || normalized.includes('thạch anh') || normalized.includes('lemon') || normalized.includes('sa mạc')) {
    return '#e6cf9b';
  }
  if (normalized.includes('tím') || normalized.includes('purple') || normalized.includes('violet') || normalized.includes('cobalt') || normalized.includes('dạ khúc') || normalized.includes('dạ quang') || normalized.includes('lilac')) {
    return '#8b7c9e';
  }
  if (normalized.includes('cam') || normalized.includes('orange') || normalized.includes('bình minh') || normalized.includes('ánh dương') || normalized.includes('hoàng hôn')) {
    return '#e8915b';
  }
  if (normalized.includes('bạc') || normalized.includes('silver') || normalized.includes('shadow') || normalized.includes('khương tuyến') || normalized.includes('vũ trụ')) {
    return '#c7cbd1';
  }
  if (normalized.includes('xám') || normalized.includes('gray') || normalized.includes('grey') || normalized.includes('hazel') || normalized.includes('titan tự nhiên')) {
    return '#8e9189';
  }
  if (normalized.includes('xanh ngọc') || normalized.includes('jade') || normalized.includes('mint') || normalized.includes('nha đam') || normalized.includes('mòng két') || normalized.includes('aloe')) {
    return '#84b5ab';
  }
  if (normalized.includes('xanh lá') || normalized.includes('green') || normalized.includes('rừng') || normalized.includes('ô liu') || normalized.includes('epi')) {
    return '#3c5a4b';
  }
  if (normalized.includes('lưu ly') || normalized.includes('ultramarine')) {
    return '#4361ee';
  }
  if (normalized.includes('xanh') || normalized.includes('blue') || normalized.includes('navy') || normalized.includes('topaz') || normalized.includes('sky') || normalized.includes('đại dương') || normalized.includes('biển') || normalized.includes('iceblue')) {
    return '#4a80a8';
  }
  if (normalized.includes('nâu') || normalized.includes('brown')) {
    return '#52433d';
  }
  if (normalized.includes('đỏ') || normalized.includes('red')) {
    return '#dc2626';
  }

  return '#475569';
}

/**
 * Returns a CSS style object with realistic texture/gradient for special smartphone finishes
 */
export function resolveColorStyle(colorName?: string | null, existingHex?: string | null): React.CSSProperties {
  const hex = resolveColorHex(colorName, existingHex);
  const normalized = (colorName || '').trim().toLowerCase();

  if (normalized.includes('trắng ánh trăng') || normalized.includes('moonlight') || normalized.includes('bạc ánh trăng')) {
    return {
      background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 45%, #f8fafc 70%, #ffffff 100%)',
      borderColor: '#cbd5e1',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
    };
  }

  if (normalized.includes('ánh ngọc') || normalized.includes('ngọc trai')) {
    return {
      background: 'linear-gradient(135deg, #fff5f7 0%, #fce7f3 50%, #ffffff 100%)',
      borderColor: '#fbcfe8',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
    };
  }

  if (normalized.includes('trắng') || normalized.includes('white') || normalized.includes('bạc') || normalized.includes('silver')) {
    return {
      background: hex === '#ffffff' || hex === '#f8fafc' ? '#f8fafc' : hex,
      borderColor: '#cbd5e1',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
    };
  }

  return {
    backgroundColor: hex,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  };
}

/**
 * Extracts distinct, deduplicated color options from a product's variants list
 */
export function getDistinctColors(variants?: Array<{ color?: string | null; colorHex?: string | null }>): ColorSwatch[] {
  if (!Array.isArray(variants) || variants.length === 0) {
    return [];
  }

  const seenHex = new Set<string>();
  const seenName = new Set<string>();
  const result: ColorSwatch[] = [];

  for (const v of variants) {
    const name = v.color?.trim() || 'Màu tiêu chuẩn';
    const hex = resolveColorHex(name, v.colorHex);
    const normalizedName = name.toLowerCase();

    // Deduplicate by name and by hex to prevent repeating dots
    if (!seenHex.has(hex) && !seenName.has(normalizedName)) {
      seenHex.add(hex);
      seenName.add(normalizedName);
      result.push({ name, hex });
    }
  }

  return result;
}
