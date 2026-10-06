import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  CreditCard,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Phone,
  MapPin,
  Trash2,
  Loader2,
  Percent,
} from 'lucide-react';
import type { InstallmentFormData, InstallmentProvider } from '../../../types';
import { apiClient } from '../../../services/apiClient';
import { notifyError } from '../../../utils/notify';

interface InstallmentFormCardProps {
  totalAmount: number;
  value: InstallmentFormData;
  onChange: (data: InstallmentFormData) => void;
  errors?: Record<string, string>;
  /** Reports CCCD upload activity so the parent can block submit mid-upload. */
  onUploadingChange?: (uploading: boolean) => void;
}

export const InstallmentFormCard: React.FC<InstallmentFormCardProps> = ({
  totalAmount,
  value,
  onChange,
  errors = {},
  onUploadingChange,
}) => {
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  useEffect(() => {
    onUploadingChange?.(uploadingFront || uploadingBack);
  }, [uploadingFront, uploadingBack, onUploadingChange]);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Financial calculations
  const prepayAmount = Math.round((totalAmount * (value.prepayPercent ?? 0)) / 100);
  const loanAmount = Math.max(0, totalAmount - prepayAmount);
  const monthlyAmount =
    value.termMonths > 0 ? Math.round(loanAmount / value.termMonths) : 0;

  const handleFieldChange = (field: keyof InstallmentFormData, val: any) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  const uploadFile = async (file: File): Promise<string> => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Chỉ hỗ trợ file ảnh định dạng JPG, PNG hoặc WebP.');
    }
    // Validate file size <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Kích thước ảnh không được vượt quá 5MB.');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data?.data ?? res.data;
      return typeof data === 'string' ? data : data?.url || data?.path;
    } catch {
      // Fallback endpoint if /upload is not directly mounted
      try {
        const fallbackRes = await apiClient.post('/storage/upload-avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const fbData = fallbackRes.data?.data ?? fallbackRes.data;
        return typeof fbData === 'string' ? fbData : fbData?.url || fbData?.path;
      } catch {
        // Never return a blob: preview URL — it passes the non-empty check
        // but is garbage on the server, leaving staff with an unviewable
        // CCCD. Throw so the field stays empty and validation blocks submit.
        throw new Error('Không tải được ảnh lên máy chủ. Vui lòng kiểm tra mạng và thử lại.');
      }
    }
  };

  const handleFrontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFront(true);
    try {
      const url = await uploadFile(file);
      handleFieldChange('cccdFrontUrl', url);
    } catch (err: any) {
      notifyError(err, 'Lỗi tải ảnh mặt trước CCCD');
    } finally {
      setUploadingFront(false);
      if (frontInputRef.current) frontInputRef.current.value = '';
    }
  };

  const handleBackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBack(true);
    try {
      const url = await uploadFile(file);
      handleFieldChange('cccdBackUrl', url);
    } catch (err: any) {
      notifyError(err, 'Lỗi tải ảnh mặt sau CCCD');
    } finally {
      setUploadingBack(false);
      if (backInputRef.current) backInputRef.current.value = '';
    }
  };

  const prepayOptions = [0, 20, 30, 50];
  const termOptions = [3, 6, 9, 12];

  return (
    <div className="space-y-6 pt-2">
      {/* 1. Financial Partner & Package Selector */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Building2 className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            1. Chọn gói tài chính &amp; Đơn vị trả góp
          </h4>
        </div>

        {/* Provider Radio Cards */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Công ty tài chính đối tác *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'HOME_CREDIT' as InstallmentProvider,
                name: 'Home Credit',
                rate: '0% Lãi suất',
                desc: 'Thủ tục đơn giản, xét duyệt tự động 15 - 30 phút',
                color: 'red',
              },
              {
                id: 'FE_CREDIT' as InstallmentProvider,
                name: 'FE Credit',
                rate: '0% Lãi suất',
                desc: 'Hỗ trợ khoản vay linh hoạt, mạng lưới rộng khắp',
                color: 'emerald',
              },
            ].map((p) => {
              const selected = value.provider === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleFieldChange('provider', p.id)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative ${
                    selected
                      ? 'border-blue-600 bg-white shadow-xs ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          selected ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                        }`}
                      >
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{p.name}</span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Percent className="w-2.5 h-2.5" />
                      <span>{p.rate}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 pl-5">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prepayment Percentage Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Tỷ lệ trả trước (Thu khi nhận máy) *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {prepayOptions.map((pct) => {
              const active = value.prepayPercent === pct;
              return (
                <button
                  type="button"
                  key={pct}
                  onClick={() => handleFieldChange('prepayPercent', pct)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  {pct}%
                  <span className="block text-[10px] font-normal opacity-90">
                    {pct === 0 ? 'Trả sau 100%' : `${pct}% giá trị`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Term Months Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Kỳ hạn trả góp (Tháng) *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {termOptions.map((term) => {
              const active = value.termMonths === term;
              return (
                <button
                  type="button"
                  key={term}
                  onClick={() => handleFieldChange('termMonths', term)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  {term} Tháng
                  <span className="block text-[10px] font-normal opacity-90">0% Lãi suất</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Calculation Summary Card */}
        <div className="p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 rounded-xl border border-blue-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-blue-200/60">
            <span className="text-slate-600 font-medium">Tổng giá trị đơn hàng:</span>
            <span className="font-bold text-slate-900">{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-blue-200/60">
            <span className="text-slate-600 font-medium">
              Tiền trả trước ({value.prepayPercent}% - thu khi nhận máy):
            </span>
            <span className="font-bold text-emerald-700">{formatPrice(prepayAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-blue-200/60">
            <span className="text-slate-600 font-medium">Số tiền vay trả góp:</span>
            <span className="font-bold text-blue-700">{formatPrice(loanAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <div>
              <span className="text-slate-900 font-bold block text-sm">Góp mỗi tháng:</span>
              <span className="text-[10px] text-slate-500 font-medium">
                Kỳ hạn {value.termMonths} tháng • 0% lãi suất cố định
              </span>
            </div>
            <span className="font-mono font-black text-red-600 text-base sm:text-lg">
              {formatPrice(monthlyAmount)}
              <span className="text-xs font-normal text-slate-600">/tháng</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Applicant Information Form */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <User className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            2. Thông tin cá nhân người đứng tên trả góp
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Họ và tên người đăng ký *
            </label>
            <div className="relative">
              <input
                type="text"
                value={value.fullName}
                onChange={(e) => handleFieldChange('fullName', e.target.value)}
                placeholder="Nguyễn Văn A"
                className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition ${
                  errors.fullName
                    ? 'border-rose-300 focus:border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
              />
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
            {errors.fullName && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.fullName}</span>
              </p>
            )}
          </div>

          {/* Citizen ID (CCCD) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số CCCD gắn chip (12 số) *
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={12}
                value={value.citizenId}
                onChange={(e) => handleFieldChange('citizenId', e.target.value.replace(/\D/g, ''))}
                placeholder="012345678901"
                className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition ${
                  errors.citizenId
                    ? 'border-rose-300 focus:border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
              />
              <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
            {errors.citizenId && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.citizenId}</span>
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ngày sinh (Tối thiểu 18 tuổi) *
            </label>
            <div className="relative">
              <input
                type="date"
                value={value.birthDate}
                onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                className={`w-full pl-9 pr-3.5 py-2 bg-white border rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition ${
                  errors.birthDate
                    ? 'border-rose-300 focus:border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
              />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
            {errors.birthDate && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.birthDate}</span>
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số điện thoại người đăng ký *
            </label>
            <div className="relative">
              <input
                type="tel"
                maxLength={10}
                value={value.phoneNumber}
                onChange={(e) => handleFieldChange('phoneNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="0912 345 678"
                className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition ${
                  errors.phoneNumber
                    ? 'border-rose-300 focus:border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
              />
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
            {errors.phoneNumber && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.phoneNumber}</span>
              </p>
            )}
          </div>
        </div>

        {/* Current Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Địa chỉ thường trú / hiện tại theo CCCD *
          </label>
          <div className="relative">
            <input
              type="text"
              value={value.currentAddress}
              onChange={(e) => handleFieldChange('currentAddress', e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
              className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition ${
                errors.currentAddress
                  ? 'border-rose-300 focus:border-rose-500 ring-1 ring-rose-500'
                  : 'border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
              }`}
            />
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          </div>
          {errors.currentAddress && (
            <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.currentAddress}</span>
            </p>
          )}
        </div>

        {/* Income Range */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Mức thu nhập hàng tháng *
          </label>
          <select
            value={value.incomeRange}
            onChange={(e) => handleFieldChange('incomeRange', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden transition"
          >
            <option value="Dưới 10 triệu">Dưới 10 triệu đồng / tháng</option>
            <option value="10 - 20 triệu">Từ 10 - 20 triệu đồng / tháng</option>
            <option value="Trên 20 triệu">Trên 20 triệu đồng / tháng</option>
          </select>
        </div>
      </div>

      {/* 3. 2-Sided CCCD Image Uploader */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. Ảnh chụp CCCD gắn chip (2 mặt)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">Tối đa 5MB • JPG, PNG, WebP</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mặt trước CCCD */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">
              Mặt trước CCCD *
            </span>
            <input
              type="file"
              ref={frontInputRef}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={handleFrontUpload}
            />

            {value.cccdFrontUrl ? (
              <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs aspect-video flex items-center justify-center">
                <img
                  src={value.cccdFrontUrl}
                  alt="Mặt trước CCCD"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-bold rounded-md backdrop-blur-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Mặt trước</span>
                </div>
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => frontInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  >
                    Thay đổi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('cccdFrontUrl', '')}
                    className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition cursor-pointer"
                    title="Xóa ảnh"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !uploadingFront && frontInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center aspect-video ${
                  errors.cccdFrontUrl
                    ? 'border-rose-400 bg-rose-50/40 hover:bg-rose-50'
                    : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/20'
                }`}
              >
                {uploadingFront ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">Đang tải ảnh...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Tải lên ảnh mặt trước CCCD
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Ảnh rõ nét, thấy rõ họ tên &amp; số CCCD
                    </span>
                  </>
                )}
              </div>
            )}
            {errors.cccdFrontUrl && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.cccdFrontUrl}</span>
              </p>
            )}
          </div>

          {/* Mặt sau CCCD */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">
              Mặt sau CCCD *
            </span>
            <input
              type="file"
              ref={backInputRef}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={handleBackUpload}
            />

            {value.cccdBackUrl ? (
              <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs aspect-video flex items-center justify-center">
                <img
                  src={value.cccdBackUrl}
                  alt="Mặt sau CCCD"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-bold rounded-md backdrop-blur-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Mặt sau</span>
                </div>
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => backInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  >
                    Thay đổi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('cccdBackUrl', '')}
                    className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition cursor-pointer"
                    title="Xóa ảnh"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !uploadingBack && backInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center aspect-video ${
                  errors.cccdBackUrl
                    ? 'border-rose-400 bg-rose-50/40 hover:bg-rose-50'
                    : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/20'
                }`}
              >
                {uploadingBack ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">Đang tải ảnh...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Tải lên ảnh mặt sau CCCD
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Ảnh rõ nét phần vân tay &amp; chip từ
                    </span>
                  </>
                )}
              </div>
            )}
            {errors.cccdBackUrl && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.cccdBackUrl}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
