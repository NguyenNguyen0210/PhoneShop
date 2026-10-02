import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  Smartphone,
  Info,
  Loader2,
  Terminal,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { warrantyService, type WarrantyLookupResult } from '../../../services/warrantyService';
import { imeiService } from '../../../services/imeiService';

export const WarrantyLookupPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WarrantyLookupResult | null>(null);
  const [error, setError] = useState('');

  const sampleImeis = [
    '353245081234567',
    '864922041234560',
    '358245091234562',
    'WRT-17182903-8F4A',
  ];

  // Real-time Luhn calculation
  const cleanInput = query.trim();
  const is15Digits = /^\d{15}$/.test(cleanInput);
  const isLuhnValid = is15Digits ? imeiService.validateLuhn(cleanInput) : null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const clean = query.trim();
    if (!clean) {
      setError('Vui lòng nhập mã IMEI (15 chữ số) hoặc mã bảo hành.');
      return;
    }

    if (/^\d{15}$/.test(clean)) {
      const isValidLuhn = imeiService.validateLuhn(clean);
      if (!isValidLuhn) {
        console.warn('Luhn checksum mismatch on entered IMEI');
      }
    }

    setLoading(true);
    try {
      const data = await warrantyService.lookupWarranty(clean);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Không tìm thấy thông tin bảo hành cho mã này.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (imei: string) => {
    setQuery(imei);
    setError('');
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Progress percentage out of standard 365 days
  const progressPercent = result
    ? Math.min(100, Math.max(0, Math.round((result.daysRemaining / 365) * 100)))
    : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-10 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Terminal Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-blue-600" />
            <span>[CYBER DIAGNOSTIC TERMINAL v2.6.1]</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tra cứu Thời hạn Bảo hành Thiết bị
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Kiểm tra tình trạng bảo hành chính hãng, nguồn gốc máy và thời hạn còn lại qua mã IMEI 15
            chữ số hoặc mã bảo hành (WRT-...).
          </p>
        </div>

        {/* Clean Diagnostic Terminal Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-5">
          {/* Terminal status bar */}
          <div className="flex items-center justify-between text-[11px] font-mono pb-2 border-b border-slate-100 text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>DIAGNOSTIC ENGINE: LUHN MODULO-10 & REGISTRY</span>
            </span>
            <span className="hidden sm:inline text-slate-400">FORMAT: 15-DIGIT IMEI / WRT-CODE</span>
          </div>

          {/* Form */}
          <form onSubmit={handleLookup} className="flex flex-col sm:row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập mã IMEI (15 chữ số) hoặc mã WRT..."
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="py-3.5 px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tra cứu...</span>
                </>
              ) : (
                <span>Tra cứu ngay</span>
              )}
            </button>
          </form>

          {/* Real-time Luhn Checksum Status Badge */}
          {is15Digits && (
            <div className="animate-in fade-in duration-200">
              {isLuhnValid ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Luhn Checksum: HỢP LỆ (Modulo-10 PASS - Cấu trúc IMEI tiêu chuẩn)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Luhn Checksum: KHÔNG HỢP LỆ (Kiểm tra lại chữ số cuối check digit)</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Quick sample chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500 border-t border-slate-100">
            <span className="font-semibold text-slate-700">Mã mẫu thử nghiệm:</span>
            {sampleImeis.map((imei) => (
              <button
                key={imei}
                type="button"
                onClick={() => handleQuickFill(imei)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-mono text-[11px] rounded-lg transition cursor-pointer"
              >
                {imei}
              </button>
            ))}
          </div>
        </div>

        {/* Hardware Activation Certificate Card */}
        {result && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-6">
            {/* Certificate Header */}
            <div className="p-6 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-blue-600 font-bold">
                      CHỨNG NHẬN KÍCH HOẠT PHẦN CỨNG
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">{result.productName}</h3>
                  <p className="text-xs text-slate-500">
                    {result.variantInfo || 'Bản chính hãng phân phối tại Việt Nam'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {result.status === 'ACTIVE' && !result.isExpired ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-full shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>BẢO HÀNH CHÍNH HÃNG CÒN HIỆU LỰC</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs rounded-full">
                    <span>HẾT HẠN BẢO HÀNH</span>
                  </span>
                )}
              </div>
            </div>

            {/* Certificate Body */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                    Mã bảo hành điện tử
                  </span>
                  <span className="font-mono font-bold text-blue-600 text-xs sm:text-sm">
                    {result.warrantyCode}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                    Mã số IMEI thiết bị
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                    {result.imeiNumber || '353245081234567'}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                    Ngày kích hoạt
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-800 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatDate(result.startDate)}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                    Ngày hết hạn
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-800 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>{formatDate(result.endDate)}</span>
                  </div>
                </div>
              </div>

              {/* Remaining Days Counter & Cyber Progress Bar */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">
                        Thời gian bảo hành còn lại:
                      </span>
                      <span className="text-xs text-slate-500">
                        Bảo hành toàn diện phần cứng & màn hình tại các TTBH chính hãng trên toàn quốc
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black font-mono text-emerald-600 tabular-nums">
                      {result.daysRemaining}
                    </span>
                    <span className="text-xs text-slate-500 ml-1 font-semibold">ngày</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Terms note */}
              <div className="text-xs text-slate-600 leading-relaxed border-t border-slate-200 pt-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Quyền lợi bảo hành chuẩn MobileCommerce:</span>
                </div>
                <p>• 1 đổi 1 trong 30 ngày đầu tiên nếu máy phát sinh lỗi từ nhà sản xuất.</p>
                <p>• Bảo hành thay thế linh kiện chính hãng 100% không thu phụ phí.</p>
                <p>• Vui lòng xuất trình mã IMEI hoặc mã bảo hành này khi đến các trung tâm bảo hành đối tác.</p>
              </div>
            </div>
          </div>
        )}

        {/* Guide: How to find IMEI */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Cách lấy mã IMEI trên điện thoại của bạn:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Cách 1: Bấm phím gọi</span>
              <p className="text-slate-500">
                Mở bàn phím gọi điện thoại và bấm cú pháp{' '}
                <code className="bg-slate-200/80 border border-slate-300 font-mono px-1.5 py-0.5 rounded text-blue-700 font-bold">
                  *#06#
                </code>{' '}
                để hiển thị mã IMEI ngay.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Cách 2: Vào Cài đặt máy</span>
              <p className="text-slate-500">
                Vào Cài đặt &gt; Cài đặt chung &gt; Giới thiệu (iOS) hoặc Cài đặt &gt; Thông tin điện thoại (Android).
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Cách 3: Xem trên vỏ hộp</span>
              <p className="text-slate-500">
                Kiểm tra tem mã vạch ở mặt sau của hộp đựng điện thoại hoặc tem niêm phong IMEI của MobileCommerce.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
