import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  Smartphone,
  Info,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Award,
  X,
  Phone,
  Settings,
  Package,
  PhoneCall,
} from 'lucide-react';
import { warrantyService, type WarrantyLookupResult } from '../../../services/warrantyService';
import { imeiService } from '../../../services/imeiService';
import { notifyError } from '../../../utils/notify';

type LookupTab = 'imei' | 'phone';

const sanitizeCodeInput = (raw: string): string =>
  (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const isValidVnPhone = (raw: string): boolean =>
  /^(0|\+84)(3|5|7|8|9)\d{8}$/.test((raw || '').replace(/[\s.]/g, ''));

export const WarrantyLookupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LookupTab>('imei');
  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WarrantyLookupResult | null>(null);

  // Real-time Luhn calculation
  const cleanInput = sanitizeCodeInput(query);
  const is15Digits = /^\d{15}$/.test(cleanInput);
  const isLuhnValid = is15Digits ? imeiService.validateLuhn(cleanInput) : null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const clean = sanitizeCodeInput(query);
    if (!clean) {
      notifyError('Bạn nhập mã IMEI hoặc số Serial giúp shop nhé (ví dụ: 860123058912345).');
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
      notifyError(err, 'Không tìm thấy thông tin bảo hành cho mã này.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/[\s.]/g, '');
    if (!clean) {
      setPhoneError('Bạn nhập số điện thoại mua hàng giúp shop nhé.');
      return;
    }
    if (!isValidVnPhone(clean)) {
      setPhoneError('Số điện thoại chưa đúng (10 số, bắt đầu bằng 03/05/07/08/09).');
      return;
    }
    setPhoneError(null);
    // Chưa có API xác thực OTP qua SMS/Zalo — giữ số lại và hướng dẫn bước tiếp theo.
    setPhone(clean);
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Cổng Tra Cứu Bảo Hành Điện Tử Chính Hãng</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tra cứu Thời hạn Bảo hành Thiết bị
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Kiểm tra thời hạn bảo hành, nguồn gốc máy và thời gian còn lại bằng mã số trên máy
            hoặc vỏ hộp.
          </p>
        </div>

        {/* Clean Diagnostic Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-5">
          {/* Status bar */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 text-slate-500">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tra cứu nhanh, chính xác</span>
            </span>
            <span className="hidden sm:inline text-slate-400">Miễn phí, không cần đăng nhập</span>
          </div>

          {/* Tabs chọn phương thức tra cứu */}
          <div className="flex gap-6 text-sm font-semibold border-b border-slate-100" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'imei'}
              onClick={() => setActiveTab('imei')}
              className={`pb-3 border-b-2 -mb-px transition-colors cursor-pointer ${
                activeTab === 'imei'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Tra cứu theo mã IMEI / Serial
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'phone'}
              onClick={() => setActiveTab('phone')}
              className={`pb-3 border-b-2 -mb-px transition-colors cursor-pointer ${
                activeTab === 'phone'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Tra cứu theo Số điện thoại
            </button>
          </div>

          {activeTab === 'imei' ? (
            <>
              {/* Form */}
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label
                    htmlFor="warranty-code-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                  >
                    Mã số IMEI hoặc Số Sê-ri (Serial Number)
                  </label>
                  <div className="relative">
                    <input
                      id="warranty-code-input"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(sanitizeCodeInput(e.target.value))}
                      placeholder="Nhập 15 số IMEI hoặc số Serial (Ví dụ: 860123058912345)..."
                      maxLength={30}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 placeholder:font-sans focus:outline-hidden transition uppercase"
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Xóa nội dung đã nhập"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tra cứu...</span>
                    </>
                  ) : (
                    <span>Kiểm tra bảo hành ngay</span>
                  )}
                </button>
              </form>

              {/* Real-time Validation Status Badge */}
              {is15Digits && (
                <div className="animate-in fade-in duration-200">
                  {isLuhnValid ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Định dạng 15 số hợp lệ</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Số này chưa đúng, bạn kiểm tra lại giúp shop nhé (mã gồm 15 số)</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Form tra cứu theo SĐT */}
              <form onSubmit={handlePhoneLookup} className="space-y-4">
                <div>
                  <label
                    htmlFor="warranty-phone-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                  >
                    Số điện thoại mua hàng
                  </label>
                  <div className="relative">
                    <input
                      id="warranty-phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/[^0-9+\s.]/g, ''));
                        if (phoneError) setPhoneError(null);
                      }}
                      placeholder="Nhập số điện thoại lúc mua máy (Ví dụ: 0901234567)..."
                      autoComplete="tel"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 placeholder:font-sans focus:outline-hidden transition"
                    />
                    <Phone className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {phoneError ? (
                    <p className="mt-2 text-xs text-rose-600 font-medium">{phoneError}</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Dành cho trường hợp máy hỏng, mất nguồn hoặc đã vứt vỏ hộp nên không lấy được IMEI.
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <span>Tiếp tục tra cứu</span>
                </button>
              </form>

              {/* Thông báo sau khi nhập SĐT hợp lệ — OTP SMS/Zalo chưa có API nên hướng luồng thật */}
              {phone && !phoneError && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-800">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Xác thực OTP cho số {phone} sắp ra mắt</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hiện shop chưa hỗ trợ gửi mã OTP qua SMS/Zalo để liệt kê máy theo SĐT. Bạn có thể{' '}
                    <Link to="/login" className="font-bold text-blue-700 hover:underline">
                      đăng nhập
                    </Link>{' '}
                    để xem toàn bộ bảo hành của mình, hoặc gọi hotline kỹ thuật{' '}
                    <a href="tel:18006869" className="font-bold text-blue-700 hover:underline">
                      1800 6869
                    </a>{' '}
                    (miễn cước, 8:00 - 21:00) để được kiểm tra giúp.
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Đăng nhập để xem bảo hành của tôi
                  </Link>
                </div>
              )}
            </>
          )}
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                      CHỨNG NHẬN BẢO HÀNH CHÍNH HÃNG
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
                    <span>CÒN BẢO HÀNH CHÍNH HÃNG</span>
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
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                  <span className="text-xs text-slate-500 font-medium block mb-1">
                    Mã bảo hành
                  </span>
                  <span className="font-mono font-bold text-blue-600 text-xs sm:text-sm">
                    {result.warrantyCode}
                  </span>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                  <span className="text-xs text-slate-500 font-medium block mb-1">
                    Mã số máy
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                    {result.imeiNumber || 'Máy chính hãng'}
                  </span>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                  <span className="text-xs text-slate-500 font-medium block mb-1">
                    Ngày kích hoạt
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-800 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatDate(result.startDate)}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                  <span className="text-xs text-slate-500 font-medium block mb-1">
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
                        Được bảo hành phần cứng và màn hình tại các trung tâm bảo hành trên toàn quốc
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
                  <span>Quyền lợi bảo hành chuẩn Phone Shop:</span>
                </div>
                <p>• 1 đổi 1 trong 30 ngày đầu tiên nếu máy phát sinh lỗi từ nhà sản xuất.</p>
                <p>• Bảo hành thay thế linh kiện chính hãng 100% không thu phụ phí.</p>
                <p>• Vui lòng mang theo mã số này khi đến các trung tâm bảo hành.</p>
              </div>
            </div>
          </div>
        )}

        {/* Guide: How to find IMEI */}
        <div className="bg-slate-50/70 border border-slate-200/60 rounded-3xl p-6 sm:p-7 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Hướng dẫn tìm mã IMEI / Serial trên thiết bị:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                <Phone className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-sm block">Bấm phím gọi</span>
              <p className="text-slate-500 mt-1">
                Mở bàn phím cuộc gọi và bấm cú pháp{' '}
                <code className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                  *#06#
                </code>{' '}
                để hiển thị mã IMEI ngay.
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-sm block">Trong Cài đặt</span>
              <p className="text-slate-500 mt-1">
                Vào <strong>Cài đặt</strong> ➔ <strong>Giới thiệu</strong> (iOS) hoặc{' '}
                <strong>Cài đặt</strong> ➔ <strong>Thông tin điện thoại</strong> (Android).
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                <Package className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-sm block">Trên vỏ hộp máy</span>
              <p className="text-slate-500 mt-1">
                Kiểm tra tem mã vạch in ở mặt sau hoặc cạnh đáy vỏ hộp đựng thiết bị.
              </p>
            </div>
          </div>
        </div>

        {/* Service banner: hotline + my warranties */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-7 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-blue-100">
                Hỗ trợ khẩn cấp khi máy gặp sự cố
              </div>
              <a
                href="tel:18006869"
                className="text-2xl sm:text-3xl font-black tracking-tight hover:underline"
              >
                1800 6869
              </a>
              <p className="text-xs text-blue-100 mt-0.5">
                Miễn cước • Khiếu nại & bảo hành • 8:00 - 21:00 hằng ngày
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-white text-blue-700 text-xs sm:text-sm font-bold rounded-2xl hover:bg-blue-50 transition-colors shrink-0"
          >
            <span>Xem bảo hành của tôi</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
