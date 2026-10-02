import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  Smartphone,
  Info,
  Loader2,
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

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const clean = query.trim();
    if (!clean) {
      setError('Vui lòng nhập mã IMEI (15 chữ số) hoặc mã bảo hành.');
      return;
    }

    // If it looks like a 15-digit IMEI, do quick Luhn check notice if invalid
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Hệ thống Bảo hành Điện tử Toàn quốc</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Tra cứu Thời hạn Bảo hành Thiết bị
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Kiểm tra tình trạng bảo hành chính hãng, nguồn gốc máy và thời hạn còn lại qua mã IMEI 15
          chữ số hoặc mã bảo hành (WRT-...).
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập mã IMEI (15 chữ số) hoặc mã WRT..."
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 rounded-2xl text-xs sm:text-sm font-medium focus:outline-hidden"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-3.5 px-7 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-500/10 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
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

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Quick sample chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Mã mẫu thử nghiệm:</span>
          {sampleImeis.map((imei) => (
            <button
              key={imei}
              type="button"
              onClick={() => handleQuickFill(imei)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-mono text-[11px] rounded-lg transition"
            >
              {imei}
            </button>
          ))}
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Card Header */}
          <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">{result.productName}</h3>
                <p className="text-xs text-slate-300">
                  {result.variantInfo || 'Bản chính hãng phân phối tại Việt Nam'}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              {result.status === 'ACTIVE' && !result.isExpired ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>BẢO HÀNH CHÍNH HÃNG CÒN HIỆU LỰC</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs rounded-full">
                  <span>HẾT HẠN BẢO HÀNH</span>
                </span>
              )}
            </div>
          </div>

          {/* Card Details */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Mã bảo hành điện tử
                </span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {result.warrantyCode}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Mã số IMEI máy
                </span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {result.imeiNumber || '353245081234567'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Ngày kích hoạt
                </span>
                <div className="flex items-center gap-1.5 text-slate-900 text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>{formatDate(result.startDate)}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Ngày hết hạn
                </span>
                <div className="flex items-center gap-1.5 text-slate-900 text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>{formatDate(result.endDate)}</span>
                </div>
              </div>
            </div>

            {/* Remaining Days Counter */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900">
                    Thời gian bảo hành còn lại:
                  </span>
                  <span className="text-slate-600 block">
                    Được bảo hành toàn diện phần cứng và hỗ trợ phần mềm tại các TTBH chính hãng
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-blue-700">{result.daysRemaining}</span>
                <span className="text-xs text-blue-600 ml-1 font-semibold">ngày</span>
              </div>
            </div>

            {/* Terms note */}
            <div className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4 space-y-1">
              <p className="font-bold text-slate-700">Quyền lợi bảo hành chuẩn MobileCommerce:</p>
              <p>• 1 đổi 1 trong 30 ngày đầu tiên nếu máy phát sinh lỗi từ nhà sản xuất.</p>
              <p>• Bảo hành thay thế linh kiện chính hãng 100% không thu phụ phí.</p>
              <p>• Vui lòng xuất trình mã IMEI hoặc mã bảo hành này khi đến các trung tâm bảo hành.</p>
            </div>
          </div>
        </div>
      )}

      {/* Guide: How to find IMEI */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Cách lấy mã IMEI trên điện thoại của bạn:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Cách 1: Bấm phím gọi</span>
            <p>Mở bàn phím gọi điện thoại và bấm cú pháp <code className="bg-slate-100 font-mono px-1 py-0.5 rounded text-blue-600 font-bold">*#06#</code> để xem mã IMEI ngay.</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Cách 2: Vào Cài đặt máy</span>
            <p>Vào Cài đặt &gt; Cài đặt chung &gt; Giới thiệu (iOS) hoặc Cài đặt &gt; Thông tin điện thoại (Android).</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Cách 3: Xem trên vỏ hộp</span>
            <p>Kiểm tra mặt sau của hộp đựng điện thoại hoặc tem dán niêm phong IMEI của MobileCommerce.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
