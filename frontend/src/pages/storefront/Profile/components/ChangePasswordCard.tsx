import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Loader2,
} from 'lucide-react';
import { userService } from '../../../../services/userService';
import { notifyError, notifySuccess } from '../../../../utils/notify';

export const ChangePasswordCard: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      notifyError('Vui lòng điền đầy đủ tất cả các trường mật khẩu.');
      return;
    }

    if (newPassword.length < 6) {
      notifyError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      notifyError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    setLoading(true);
    try {
      await userService.changePassword({
        oldPassword,
        newPassword,
      });

      notifySuccess('Đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const rawMessage = err?.response?.data?.message;
      const rawStr = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      if (typeof rawStr === 'string' && rawStr.toLowerCase().includes('invalid old password')) {
        notifyError('Mật khẩu hiện tại không chính xác.');
      } else {
        notifyError(err, 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại thông tin!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="password-section"
      className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 scroll-mt-24 max-w-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Bảo mật tài khoản
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn
          </p>
        </div>
      </div>

      {/* Vertical Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Field 1: Mật khẩu hiện tại */}
        <div className="space-y-1.5">
          <label
            htmlFor="old-password"
            className="block text-xs font-semibold text-slate-700"
          >
            Mật khẩu hiện tại *
          </label>
          <div className="relative">
            <input
              id="old-password"
              type={showOldPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={loading}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              disabled={loading}
              aria-label={showOldPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer disabled:opacity-50"
            >
              {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Field 2: Mật khẩu mới */}
        <div className="space-y-1.5">
          <label
            htmlFor="new-password"
            className="block text-xs font-semibold text-slate-700"
          >
            Mật khẩu mới *
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={loading}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={loading}
              aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer disabled:opacity-50"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Tối thiểu 6 ký tự</p>
        </div>

        {/* Field 3: Xác nhận mật khẩu mới */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="block text-xs font-semibold text-slate-700"
          >
            Xác nhận mật khẩu mới *
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer disabled:opacity-50"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            <span>Lưu thay đổi mật khẩu</span>
          </button>
        </div>
      </form>
    </div>
  );
};
