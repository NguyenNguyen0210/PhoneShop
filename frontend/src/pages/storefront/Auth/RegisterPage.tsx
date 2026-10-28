import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { authService } from '../../../services/authService';
import { notifyError, notifySuccess } from '../../../utils/notify';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogleCredential } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password) {
      notifyError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password.length < 6) {
      notifyError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      notifyError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName,
        email,
        password,
        phone: phone || undefined,
      });
      notifySuccess('Đăng ký thành công. Chào mừng bạn đến với PhoneShop!');
      navigate('/');
    } catch (err: any) {
      notifyError(err, 'Đăng ký không thành công.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      notifyError('Không nhận được mã xác thực từ Google');
      return;
    }
    setGoogleLoading(true);
    try {
      await loginWithGoogleCredential(credentialResponse.credential);
      notifySuccess('Đăng ký / Đăng nhập Google thành công!');
      navigate('/', { replace: true });
    } catch (err: any) {
      notifyError(err, 'Đăng ký qua Google không thành công. Vui lòng thử lại.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    notifyError('Đăng ký qua Google không thành công hoặc cửa sổ đã bị đóng');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Subtle ambient radial glow in background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Card */}
      <div className="w-full max-w-[450px] bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100/90 p-6 sm:p-8 space-y-5 relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center group mb-3" aria-label="PhoneShop">
            <img
              src="/logo-horizontal.png"
              alt="PhoneShop"
              className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-2xl text-slate-900 tracking-tight">
            Tạo tài khoản PhoneShop
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Khám phá smartphone chính hãng &amp; nhận ngay đặc quyền VIP.
          </p>
        </div>

        {/* Voucher Ribbon Banner */}
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-300/60 flex items-center justify-center text-base shrink-0">
              🎁
            </div>
            <div className="text-xs text-amber-900 leading-snug">
              <span className="font-bold block">Quà tặng bạn mới</span>
              <span className="text-[11px] text-amber-700/90">
                Giảm ngay <b>50.000₫</b> cho đơn đầu tiên
              </span>
            </div>
          </div>
          <div className="shrink-0 bg-white border border-amber-300 font-mono font-bold text-xs text-amber-800 px-2.5 py-1 rounded-lg shadow-2xs">
            WELCOME50
          </div>
        </div>

        {/* 1-Click Social Sign Up (Google Pop-up) */}
        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            shape="rectangular"
            text="signup_with"
            width="100%"
          />
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="w-full border-t border-slate-200" />
          <span className="absolute bg-white px-3 text-[11px] font-medium text-slate-400">
            hoặc điền thông tin
          </span>
        </div>

        {/* Form 5 trường */}
        <form onSubmit={handleRegister} noValidate className="space-y-4">
          {/* 1. Họ và tên * */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Họ và tên *
            </label>
            <div className="relative">
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Địa chỉ Email * */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Địa chỉ Email *
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. Số điện thoại */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Số điện thoại
              </label>
              <span className="text-[11px] text-slate-400">
                Để nhận thông báo đơn hàng &amp; tích điểm
              </span>
            </div>
            <div className="relative">
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Mật khẩu * */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Ẩn hiện mật khẩu"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 5. Xác nhận mật khẩu * */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Xác nhận mật khẩu *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Ẩn hiện mật khẩu"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* CTA Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/25 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang đăng ký tài khoản...</span>
              </>
            ) : (
              <span>Đăng ký tài khoản</span>
            )}
          </button>
        </form>

        {/* Chân form */}
        <div className="text-center text-xs text-slate-500 pt-1">
          <span>Đã có tài khoản? </span>
          <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>

        {/* Cam kết bảo mật */}
        <div className="pt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Thông tin của bạn luôn được bảo mật.</span>
        </div>
      </div>
    </div>
  );
};
