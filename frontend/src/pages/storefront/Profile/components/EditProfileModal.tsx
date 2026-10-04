import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, AlertCircle, Loader2, Save } from 'lucide-react';
import type { User as UserType } from '../../../../types';
import { authService } from '../../../../services/authService';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onSuccess: (updatedUser: UserType) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setLoading(false);
      setError(null);
    }
  }, [isOpen, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        setError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 chữ số, vd: 0901234567).');
        return;
      }
    }

    const parts = trimmedName.split(/\s+/);
    const lastName = parts.length > 1 ? parts[0] : '';
    const firstName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '';

    setLoading(true);
    try {
      const updated = await authService.updateProfile({
        firstName,
        lastName,
        phone: trimmedPhone || undefined,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const responseData = err?.response?.data;
      let errorMsg = 'Cập nhật thông tin thất bại. Vui lòng thử lại!';

      if (responseData?.message) {
        const rawMessage = responseData.message;
        if (typeof rawMessage === 'string') {
          errorMsg = rawMessage;
        } else if (Array.isArray(rawMessage)) {
          errorMsg = rawMessage.join(', ');
        }
      } else if (err?.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Chỉnh sửa thông tin cá nhân
              </h3>
              <p className="text-xs text-slate-500">
                Cập nhật họ tên và số điện thoại liên lạc
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl flex items-center gap-2.5 text-xs bg-rose-50 text-rose-800 border border-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Họ và tên */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-fullName"
              className="block text-xs font-semibold text-slate-700"
            >
              Họ và tên *
            </label>
            <div className="relative">
              <input
                id="edit-fullName"
                type="text"
                disabled={loading}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition disabled:opacity-60"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Số điện thoại */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-phone"
              className="block text-xs font-semibold text-slate-700"
            >
              Số điện thoại
            </label>
            <div className="relative">
              <input
                id="edit-phone"
                type="tel"
                disabled={loading}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại (vd: 0901234567)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition disabled:opacity-60"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500">
              Dùng để xác thực đơn hàng và nhận thông báo giao hàng
            </p>
          </div>

          {/* Email (Readonly) */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-email"
              className="block text-xs font-semibold text-slate-700"
            >
              Địa chỉ Email
            </label>
            <div className="relative">
              <input
                id="edit-email"
                type="email"
                disabled
                readOnly
                value={user.email}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-500 cursor-not-allowed select-none"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400">
              Email đăng nhập được bảo mật và không thể thay đổi
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
