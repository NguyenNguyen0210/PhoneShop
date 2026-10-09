import React from 'react';
import {
  MapPin,
  Mail,
  Phone,
  Lock,
  BadgeCheck,
  Banknote,
} from 'lucide-react';

const BRANDS = [
  { name: 'Apple', cls: 'font-bold text-[19px] tracking-tighter', glyph: '\uF8FF Apple' },
  { name: 'SAMSUNG', cls: 'font-extrabold text-[17px] tracking-[0.18em]', glyph: 'SAMSUNG', color: '#1428A0' },
  { name: 'Xiaomi', cls: 'font-bold text-[19px] tracking-tight', glyph: 'Xiaomi', color: '#FF6900' },
  { name: 'oppo', cls: 'font-bold text-[19px] tracking-wider lowercase', glyph: 'oppo', color: '#00825D' },
  { name: 'SONY', cls: 'font-extrabold text-[17px] tracking-[0.28em]', glyph: 'SONY', color: '#111111' },
];

const PAYMENTS = [
  {
    label: 'VietQR',
    cls: 'text-emerald-700 bg-emerald-50/70 border-emerald-100',
    logo: (
      <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="#047857" />
        <rect x="3" y="3" width="2" height="2" fill="#fff" />
        <rect x="9" y="1" width="6" height="6" rx="1" fill="#047857" />
        <rect x="11" y="3" width="2" height="2" fill="#fff" />
        <rect x="1" y="9" width="6" height="6" rx="1" fill="#047857" />
        <rect x="3" y="11" width="2" height="2" fill="#fff" />
        <rect x="9" y="9" width="2" height="2" fill="#047857" />
        <rect x="12" y="12" width="3" height="3" fill="#047857" />
      </svg>
    ),
  },
  {
    label: 'VNPAY',
    cls: 'text-blue-700 bg-blue-50/80 border-blue-100',
    logo: (
      <span className="w-4 h-4 rounded-[4px] bg-[#005BAA] text-white text-[10px] font-black italic flex items-center justify-center shrink-0">
        V
      </span>
    ),
  },
  {
    label: 'Visa',
    cls: 'text-[#1A1F71] bg-white border-slate-200 italic font-black',
    logo: (
      <span className="text-[11px] font-black italic tracking-tight text-[#1A1F71] shrink-0 leading-none">
        VISA
      </span>
    ),
  },
  {
    label: 'Mastercard',
    cls: 'text-slate-700 bg-white border-slate-200',
    logo: (
      <svg viewBox="0 0 24 16" className="w-5 h-4 shrink-0" aria-hidden="true">
        <circle cx="9" cy="8" r="6" fill="#EB001B" />
        <circle cx="15" cy="8" r="6" fill="#F79E1B" fillOpacity="0.9" />
      </svg>
    ),
  },
  {
    label: 'JCB',
    cls: 'text-slate-700 bg-white border-slate-200',
    logo: (
      <span className="w-5 h-4 rounded-[3px] overflow-hidden flex shrink-0" aria-hidden="true">
        <span className="flex-1 bg-[#0B4EA2]" />
        <span className="flex-1 bg-[#009A44]" />
        <span className="flex-1 bg-[#ED1C24]" />
      </span>
    ),
  },
  {
    label: 'MoMo',
    cls: 'text-pink-700 bg-pink-50/70 border-pink-100',
    logo: (
      <span className="w-4 h-4 rounded-[4px] bg-[#A50064] text-white text-[10px] font-black flex items-center justify-center shrink-0">
        M
      </span>
    ),
  },
  {
    label: 'ZaloPay',
    cls: 'text-blue-700 bg-[#E8F3FF]/70 border-blue-100',
    logo: (
      <span className="w-4 h-4 rounded-[4px] bg-[#0068FF] text-white text-[10px] font-black flex items-center justify-center shrink-0">
        Z
      </span>
    ),
  },
  {
    label: 'COD',
    cls: 'text-slate-700 bg-white border-slate-200',
    logo: <Banknote className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />,
  },
];

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white text-sm text-gray-600">
      {/* viền gradient thương hiệu trên cùng */}
      <div className="h-[3px] w-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        {/* ── 2. DẢI ĐỐI TÁC THƯƠNG HIỆU ── */}
        <div className="py-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
          <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400 shrink-0">
            <BadgeCheck className="w-4 h-4 text-blue-600" />
            Thương hiệu phân phối chính hãng
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent hidden lg:block" />
          <div className="flex items-center gap-x-9 gap-y-3 flex-wrap">
            {BRANDS.map((brand) => (
              <span
                key={brand.name}
                title={brand.name}
                style={{ color: (brand as { color?: string }).color ?? '#111111' }}
                className={`${brand.cls} select-none cursor-default opacity-80 transition-all duration-300 hover:opacity-100 hover:-translate-y-px`}
              >
                {brand.glyph}
              </span>
            ))}
          </div>
        </div>

        {/* ── 3. KHỐI 2 CỘT CHÍNH ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-9 py-10">
          {/* Cột 1: Thương hiệu */}
          <div className="space-y-4">
            <span className="text-[26px] font-black tracking-tight text-blue-700">
              Phone<span className="text-slate-900">Shop</span>
              <span className="text-blue-600">.</span>
            </span>
            <p className="text-[13px] leading-[1.75] text-slate-500 max-w-[36ch]">
              Hệ thống bán lẻ thiết bị di động chính hãng hàng đầu. Cam kết 100% máy nguyên seal, bảo hành điện tử
              chính ngạch.
            </p>
          </div>
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-900">
                Phương thức thanh toán
                <span className="block w-7 h-[2.5px] bg-blue-600 rounded-full mt-2" />
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {PAYMENTS.map((m) => (
                  <span
                    key={m.label}
                    className={`h-7 inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] font-bold leading-none shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition hover:-translate-y-px hover:shadow-sm ${m.cls}`}
                  >
                    {m.logo}
                    {m.label}
                  </span>
                ))}
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Thanh toán an toàn &amp; bảo mật SSL.
              </p>
            </div>
          </div>
        </div>

        {/* ── 4. DÒNG PHÁP LÝ & BẢN QUYỀN ── */}
        <div className="rounded-2xl bg-slate-50/80 border border-slate-200/60 px-5 py-4 text-[11.5px] leading-relaxed text-slate-500 space-y-1.5">
          <p className="font-extrabold text-slate-700 text-xs">Công ty Cổ phần Bán lẻ Kỹ thuật số PhoneShop</p>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span>GPĐKKD số: 0312345678 do Sở KH&amp;ĐT TP.HCM cấp ngày 10/10/2024.</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Tòa nhà PhoneShop, 123 Võ Văn Ngân, TP. Thủ Đức, TP.HCM.
            </span>
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> 1900 6868
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> cskh@phoneshop.vn
            </span>
          </p>
        </div>

        <div className="pt-5 flex flex-col md:flex-row justify-between items-center gap-2 text-[11.5px] text-slate-400">
          <div>© 2026 PhoneShop. GPĐKKD số 0312345678 do Sở KH&amp;ĐT TP.HCM cấp.</div>
          <div className="flex gap-5">
            <a href="#terms" className="hover:text-blue-700 hover:underline underline-offset-4 transition">
              Điều khoản sử dụng
            </a>
            <a href="#privacy" className="hover:text-blue-700 hover:underline underline-offset-4 transition">
              Chính sách bảo mật
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
