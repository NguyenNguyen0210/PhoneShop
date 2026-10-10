export interface BrandSoftTheme {
  bg: string;
  border: string;
  hover: string;
  text: string;
  shadow: string;
  activeGradient: string;
}

export const BRAND_SOFT_THEMES: Record<string, BrandSoftTheme> = {
  apple: {
    bg: 'bg-slate-100/90',
    border: 'border-slate-300/80',
    hover: 'hover:bg-slate-200/80 hover:border-slate-400',
    text: 'text-slate-900',
    shadow: 'hover:shadow-slate-500/15',
    activeGradient: 'from-slate-800 via-slate-900 to-black',
  },
  samsung: {
    bg: 'bg-blue-50/90',
    border: 'border-blue-200/90',
    hover: 'hover:bg-blue-100/90 hover:border-blue-300',
    text: 'text-blue-950',
    shadow: 'hover:shadow-blue-500/15',
    activeGradient: 'from-blue-700 via-[#1428A0] to-indigo-900',
  },
  xiaomi: {
    bg: 'bg-orange-50/90',
    border: 'border-orange-200/90',
    hover: 'hover:bg-orange-100/90 hover:border-orange-300',
    text: 'text-orange-950',
    shadow: 'hover:shadow-orange-500/15',
    activeGradient: 'from-orange-500 via-[#FF6900] to-amber-600',
  },
  oppo: {
    bg: 'bg-emerald-50/90',
    border: 'border-emerald-200/90',
    hover: 'hover:bg-emerald-100/90 hover:border-emerald-300',
    text: 'text-emerald-950',
    shadow: 'hover:shadow-emerald-500/15',
    activeGradient: 'from-emerald-600 via-[#008B47] to-teal-700',
  },
  realme: {
    bg: 'bg-amber-50/90',
    border: 'border-amber-200/90',
    hover: 'hover:bg-amber-100/90 hover:border-amber-300',
    text: 'text-amber-950',
    shadow: 'hover:shadow-amber-500/15',
    activeGradient: 'from-amber-500 via-yellow-500 to-amber-600',
  },
  vivo: {
    bg: 'bg-indigo-50/90',
    border: 'border-indigo-200/90',
    hover: 'hover:bg-indigo-100/90 hover:border-indigo-300',
    text: 'text-indigo-950',
    shadow: 'hover:shadow-indigo-500/15',
    activeGradient: 'from-blue-600 via-[#415FFF] to-indigo-700',
  },
  oneplus: {
    bg: 'bg-rose-50/90',
    border: 'border-rose-200/90',
    hover: 'hover:bg-rose-100/90 hover:border-rose-300',
    text: 'text-rose-950',
    shadow: 'hover:shadow-rose-500/15',
    activeGradient: 'from-red-600 via-[#EB0029] to-rose-700',
  },
  honor: {
    bg: 'bg-sky-50/90',
    border: 'border-sky-200/90',
    hover: 'hover:bg-sky-100/90 hover:border-sky-300',
    text: 'text-sky-950',
    shadow: 'hover:shadow-sky-500/15',
    activeGradient: 'from-sky-500 via-[#00B6E6] to-cyan-600',
  },
  google: {
    bg: 'bg-blue-50/80',
    border: 'border-blue-200/80',
    hover: 'hover:bg-blue-100/80 hover:border-blue-300',
    text: 'text-blue-950',
    shadow: 'hover:shadow-blue-500/15',
    activeGradient: 'from-blue-600 via-indigo-600 to-blue-700',
  },
  asus: {
    bg: 'bg-slate-100/80',
    border: 'border-slate-300/80',
    hover: 'hover:bg-slate-200/80 hover:border-slate-400',
    text: 'text-slate-900',
    shadow: 'hover:shadow-slate-500/15',
    activeGradient: 'from-slate-700 via-slate-800 to-slate-900',
  },
  sony: {
    bg: 'bg-zinc-100/80',
    border: 'border-zinc-300/80',
    hover: 'hover:bg-zinc-200/80 hover:border-zinc-400',
    text: 'text-zinc-900',
    shadow: 'hover:shadow-zinc-500/15',
    activeGradient: 'from-zinc-800 via-zinc-900 to-black',
  },
  motorola: {
    bg: 'bg-sky-50/90',
    border: 'border-sky-200/90',
    hover: 'hover:bg-sky-100/90 hover:border-sky-300',
    text: 'text-sky-950',
    shadow: 'hover:shadow-sky-500/15',
    activeGradient: 'from-blue-600 via-[#5C92FA] to-indigo-700',
  },
  nothing: {
    bg: 'bg-neutral-100/90',
    border: 'border-neutral-300/80',
    hover: 'hover:bg-neutral-200/80 hover:border-neutral-400',
    text: 'text-neutral-900',
    shadow: 'hover:shadow-neutral-500/15',
    activeGradient: 'from-neutral-800 via-neutral-900 to-black',
  },
};

const DEFAULT_BRAND_THEME: BrandSoftTheme = {
  bg: 'bg-slate-50/90',
  border: 'border-slate-200/90',
  hover: 'hover:bg-slate-100 hover:border-slate-300',
  text: 'text-slate-800',
  shadow: 'hover:shadow-slate-500/10',
  activeGradient: 'from-blue-600 via-indigo-600 to-blue-700',
};

export function getBrandSoftTheme(brandNameOrSlug?: string): BrandSoftTheme {
  if (!brandNameOrSlug) return DEFAULT_BRAND_THEME;
  const key = brandNameOrSlug.toLowerCase().trim();
  return BRAND_SOFT_THEMES[key] || DEFAULT_BRAND_THEME;
}
