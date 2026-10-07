import React, { useState } from 'react';

interface BrandLogoProps {
  name: string;
  slug?: string;
  logoUrl?: string;
  isSelected?: boolean;
  className?: string;
}

// Màu tint fallback theo brand (khi không tải được SVG)
const FALLBACK_TINT: Record<string, string> = {
  apple: 'bg-slate-900 text-white',
  samsung: 'bg-[#1428A0] text-white',
  xiaomi: 'bg-[#FF6900] text-white',
  oppo: 'bg-[#008B47] text-white',
  google: 'bg-white text-[#4285F4] border border-slate-200',
  vivo: 'bg-[#415FFF] text-white',
  realme: 'bg-[#FFC915] text-black',
  asus: 'bg-slate-800 text-white',
  sony: 'bg-black text-white',
  honor: 'bg-[#00B6E6] text-white',
  motorola: 'bg-[#5C92FA] text-white',
  nothing: 'bg-white text-black border border-slate-300',
  oneplus: 'bg-[#EB0029] text-white',
};

// Các slug dùng icon vuông chuẩn hoá local (DB/R2 đang chứa bản Wikimedia nền màu, tỉ lệ sai)
const LOCAL_FIRST = new Set(['samsung', 'xiaomi', 'realme', 'motorola', 'nothing', 'oneplus']);

export const BrandLogo: React.FC<BrandLogoProps> = ({
  name,
  slug,
  logoUrl,
  isSelected = false,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const key = (slug || name).toLowerCase();

  // 1. icon vuông local (với 6 slug chuẩn hoá) → 2. logoUrl DB/R2 → 3. local /brands/<slug>.svg → 4. fallback chữ cái
  const localSrc = slug ? `/brands/${slug}.svg` : undefined;
  const primarySrc =
    (slug && LOCAL_FIRST.has(slug.toLowerCase()) ? localSrc : undefined) ||
    logoUrl ||
    localSrc;

  if (!hasError && primarySrc) {
    return (
      <span
        className={`w-7 h-7 rounded-lg bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.06)] flex items-center justify-center shrink-0 overflow-hidden ${className}`}
        title={name}
      >
        <img
          src={primarySrc}
          alt={name}
          loading="lazy"
          draggable={false}
          className="w-5 h-5 object-contain select-none"
          onError={(e) => {
            const localFallback = slug ? `/brands/${slug}.svg` : undefined;
            if (localFallback && !e.currentTarget.src.endsWith(localFallback)) {
              e.currentTarget.src = localFallback;
            } else {
              setHasError(true);
            }
          }}
        />
      </span>
    );
  }

  const tint = FALLBACK_TINT[key] || 'bg-slate-100 text-slate-700';
  return (
    <span
      title={name}
      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[11px] font-extrabold select-none ${
        isSelected ? 'ring-1 ring-blue-500/40' : ''
      } ${tint} ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
};
