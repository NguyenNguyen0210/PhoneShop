import React, { useState } from 'react';

interface BrandLogoProps {
  name: string;
  slug?: string;
  logoUrl?: string;
  isSelected?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  name,
  slug,
  logoUrl,
  isSelected = false,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // Resolution cascade:
  // 1. logoUrl from database/R2
  // 2. local bundled SVG /brands/${slug}.svg
  // 3. Fallback bold initial letter
  const primarySrc = logoUrl || (slug ? `/brands/${slug}.svg` : undefined);

  return (
    <span
      className={`w-5 h-5 rounded-full flex items-center justify-center p-0.5 shrink-0 transition-colors overflow-hidden ${
        isSelected ? 'bg-white' : 'bg-slate-100'
      } ${className}`}
    >
      {!hasError && primarySrc ? (
        <img
          src={primarySrc}
          alt={name}
          className="w-full h-full object-contain"
          onError={(e) => {
            const localFallback = slug ? `/brands/${slug}.svg` : undefined;
            if (localFallback && !e.currentTarget.src.endsWith(localFallback)) {
              e.currentTarget.src = localFallback;
            } else {
              setHasError(true);
            }
          }}
        />
      ) : (
        <span className="text-[10px] font-bold text-slate-600 select-none">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
};
