import React from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  RotateCcw,
  Headphones,
  ShieldCheck,
  CreditCard,
  QrCode,
  Lock,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600 text-xs">
      {/* ─────────────────────────────────────────────────────────────
          1. VALUE PROPOSITION BADGES (CAM KẾT DỊCH VỤ TOÀN HỆ THỐNG)
          ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200/80 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Giao hàng hoả tốc 2h</h4>
                <p className="text-xs text-slate-500 mt-0.5">Miễn phí toàn quốc cho smartphone</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">100% Nguyên seal chính hãng</h4>
                <p className="text-xs text-slate-500 mt-0.5">Đầy đủ hóa đơn VAT & kiểm định IMEI</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">1 đổi 1 trong 30 ngày</h4>
                <p className="text-xs text-slate-500 mt-0.5">Đổi mới nếu phát sinh lỗi phần cứng</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Headphones className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Hỗ trợ kỹ thuật 24/7</h4>
                <p className="text-xs text-slate-500 mt-0.5">Hotline 1900 6868 miễn cước gọi</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. AUTHORIZED BRAND PARTNERS (CHỈ THƯƠNG HIỆU PHÂN PHỐI)
          ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200/80 py-3.5 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs uppercase tracking-wider text-slate-900 font-bold whitespace-nowrap">
              Phân phối chính hãng:
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full lg:w-auto justify-start lg:justify-end py-0.5">
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-slate-700 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap text-xs font-medium hover:bg-white hover:border-slate-300 transition">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0"></span>
              <span>Apple Authorised Reseller</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-slate-700 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap text-xs font-medium hover:bg-white hover:border-slate-300 transition">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
              <span>Samsung Flagship Partner</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-slate-700 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap text-xs font-medium hover:bg-white hover:border-slate-300 transition">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
              <span>Xiaomi Official Store</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-slate-700 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap text-xs font-medium hover:bg-white hover:border-slate-300 transition">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
              <span>OPPO Authorized Dealer</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-slate-700 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap text-xs font-medium hover:bg-white hover:border-slate-300 transition">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span>
              <span>Sony Mobile Vietnam</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN FOOTER LINKS & PAYMENT METHODS
          ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <img
              src="/logo-horizontal.png"
              alt="PhoneShop"
              className="h-8 w-auto object-contain"
            />
          </div>
          <p className="text-slate-600 leading-relaxed mb-4 text-xs">
            Hệ thống bán lẻ thiết bị di động thông minh hàng đầu Việt Nam. Cam kết 100% sản phẩm chính hãng với kiểm định số IMEI chuẩn hóa & bảo hành điện tử tiện lợi.
          </p>
          <p className="text-slate-500 text-[11px] font-mono">
            © 2026 Phone Shop. All rights reserved.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Hỗ trợ khách hàng
          </h4>
          <ul className="space-y-2.5">
            <li>
              <Link to="/warranty-lookup" className="hover:text-blue-600 transition flex items-center gap-1.5 text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tra cứu bảo hành điện tử (IMEI)</span>
              </Link>
            </li>
            <li>
              <a href="#policy" className="hover:text-blue-600 text-slate-600 transition">
                Chính sách đổi trả 30 ngày
              </a>
            </li>
            <li>
              <a href="#shipping" className="hover:text-blue-600 text-slate-600 transition">
                Chính sách giao hàng & đồng kiểm
              </a>
            </li>
            <li>
              <a href="#installment" className="hover:text-blue-600 text-slate-600 transition">
                Hướng dẫn mua hàng trả góp 0%
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Về PhoneShop
          </h4>
          <ul className="space-y-2.5">
            <li>
              <a href="#about" className="hover:text-blue-600 text-slate-600 transition">
                Giới thiệu hệ thống
              </a>
            </li>
            <li>
              <a href="#stores" className="hover:text-blue-600 text-slate-600 transition">
                Hệ thống 120 cửa hàng toàn quốc
              </a>
            </li>
            <li>
              <a href="#careers" className="hover:text-blue-600 text-slate-600 transition">
                Tuyển dụng nhân sự
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:text-blue-600 text-slate-600 transition">
                Liên hệ hợp tác kinh doanh
              </a>
            </li>
          </ul>
        </div>

        {/* Payment Gateways & Secure Checkout */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Phương thức thanh toán
          </h4>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="px-2.5 py-2 bg-white border border-slate-200/90 rounded-xl text-slate-800 text-[11px] font-medium flex items-center gap-2 shadow-2xs hover:border-slate-300 transition">
              <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
              <span>VietQR 24/7</span>
            </div>
            <div className="px-2.5 py-2 bg-white border border-slate-200/90 rounded-xl text-slate-800 text-[11px] font-medium flex items-center gap-2 shadow-2xs hover:border-slate-300 transition">
              <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Cổng VNPay</span>
            </div>
            <div className="px-2.5 py-2 bg-white border border-slate-200/90 rounded-xl text-slate-800 text-[11px] font-medium flex items-center gap-2 shadow-2xs hover:border-slate-300 transition">
              <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Visa / Master</span>
            </div>
            <div className="px-2.5 py-2 bg-white border border-slate-200/90 rounded-xl text-slate-800 text-[11px] font-medium flex items-center gap-2 shadow-2xs hover:border-slate-300 transition">
              <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tiền mặt (COD)</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2 pt-3 border-t border-slate-200/80 text-slate-500 text-[11px] leading-relaxed">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>Giao dịch được bảo vệ bằng mã hóa SSL 256-bit theo tiêu chuẩn bảo mật thanh toán quốc tế PCI-DSS.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};