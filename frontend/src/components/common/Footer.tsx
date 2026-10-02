import React from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Truck,
  CheckCircle2,
  RotateCcw,
  Headphones,
  ShieldCheck,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600 text-xs">
      {/* Value Proposition Badges */}
      <section className="border-b border-slate-200/80 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Giao hàng hoả tốc</h4>
                <p className="text-xs text-slate-500 mt-0.5">Miễn phí toàn quốc từ 500k</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Cam kết chính hãng 100%</h4>
                <p className="text-xs text-slate-500 mt-0.5">Đầy đủ hoá đơn VAT & IMEI</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">1 đổi 1 trong 30 ngày</h4>
                <p className="text-xs text-slate-500 mt-0.5">Nếu phát sinh lỗi từ NSX</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Hỗ trợ kỹ thuật 24/7</h4>
                <p className="text-xs text-slate-500 mt-0.5">Hotline 1900 6868 miễn phí</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Authorized Partners & Secure Payment Banner */}
      <section className="border-b border-slate-200/80 py-4 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs uppercase tracking-wider text-slate-800 font-bold">
              Đối tác phân phối uỷ quyền chính hãng
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              <span>Apple Authorised Reseller</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
              <span>Samsung Premium Store</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>VietQR Napas 247</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              <span>VNPay Cổng Quốc Gia</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Footer Links Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight">MobileCommerce</span>
          </div>
          <p className="text-slate-600 leading-relaxed mb-4 text-xs">
            Hệ thống bán lẻ thiết bị di động thông minh hàng đầu Việt Nam. Công nghệ quản lý chuỗi
            cung ứng và phân phối định danh thiết bị theo chuẩn mã IMEI quốc tế.
          </p>
          <p className="text-slate-500 text-[11px] font-mono">
            © 2026 MobileCommerce Corp. All rights reserved.
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
                Chính sách giao hàng & kiểm tra hàng
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
            Về MobileCommerce
          </h4>
          <ul className="space-y-2.5">
            <li>
              <a href="#about" className="hover:text-blue-600 text-slate-600 transition">
                Giới thiệu công ty
              </a>
            </li>
            <li>
              <a href="#stores" className="hover:text-blue-600 text-slate-600 transition">
                Hệ thống cửa hàng toàn quốc
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

        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Cổng thanh toán & Bảo mật
          </h4>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 text-[11px] shadow-2xs">
              💵 COD
            </span>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 text-[11px] shadow-2xs">
              ⚡ VietQR (Napas)
            </span>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 text-[11px] shadow-2xs">
              💳 VNPay
            </span>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 text-[11px] shadow-2xs">
              🏧 ATM Nội địa
            </span>
          </div>
          <p className="text-slate-500 leading-relaxed text-[11px]">
            Bảo mật giao dịch đa tầng qua chuẩn mã hóa HMAC-SHA512 & kiểm tra tính toàn vẹn IMEI nguyên tử.
          </p>
        </div>
      </div>
    </footer>
  );
};
