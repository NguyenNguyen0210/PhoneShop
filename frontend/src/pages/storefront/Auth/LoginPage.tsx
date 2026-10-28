import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
  CheckCircle2,
  PhoneCall,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { authService } from '../../../services/authService';
import { notifyError, notifySuccess, getErrorMessage } from '../../../utils/notify';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loginWithGoogleCredential } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Check redirect location
  const fromState = (location.state as any)?.from;
  const from =
    typeof fromState === 'string'
      ? fromState
      : fromState?.pathname
      ? `${fromState.pathname}${fromState.search || ''}`
      : '/';

  // If already logged in, redirect directly to respective management portal
  useEffect(() => {
    if (user) {
      const role = user.role || (user as any)?.roles?.[0];
      const roles = Array.isArray((user as any)?.roles) ? (user as any).roles : [];
      if (role === 'STAFF' || roles.includes('STAFF')) {
        navigate('/staff', { replace: true });
      } else if (
        role === 'ADMIN' ||
        role === 'MANAGER' ||
        roles.includes('ADMIN') ||
        roles.includes('MANAGER')
      ) {
        navigate('/admin', { replace: true });
      } else {
        navigate(from === '/login' ? '/' : from, { replace: true });
      }
    }
  }, [user, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      notifyError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      notifySuccess('Đăng nhập thành công. Chào mừng bạn trở lại!');
      const role = loggedUser?.role || (loggedUser as any)?.roles?.[0];
      const roles = Array.isArray((loggedUser as any)?.roles) ? (loggedUser as any).roles : [];
      if (role === 'STAFF' || roles.includes('STAFF')) {
        navigate('/staff', { replace: true });
      } else if (
        role === 'ADMIN' ||
        role === 'MANAGER' ||
        roles.includes('ADMIN') ||
        roles.includes('MANAGER')
      ) {
        navigate('/admin', { replace: true });
      } else {
        navigate(from === '/login' ? '/' : from, { replace: true });
      }
    } catch (err: any) {
      notifyError(err, 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      notifyError('Không nhận được mã xác thực từ Google');
      return;
    }
    try {
      const loggedUser = await loginWithGoogleCredential(credentialResponse.credential);
      notifySuccess('Đăng nhập Google thành công!');

      const role = loggedUser.role || (loggedUser as any).roles?.[0]?.name || (loggedUser as any).roles?.[0];
      const isAdminUser = role === 'ADMIN' || role === 'MANAGER';

      if (from && from !== '/' && from !== '/login') {
        navigate(from, { replace: true });
      } else if (isAdminUser) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      notifyError(err, 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    }
  };

  const handleGoogleError = () => {
    notifyError('Đăng nhập Google không thành công hoặc cửa sổ đã bị đóng');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      notifyError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await authService.forgotPassword(forgotEmail.trim());
      setForgotSubmitted(true);
      notifySuccess('Đã gửi email khôi phục. Vui lòng kiểm tra hộp thư của bạn.');
    } catch (err: any) {
      const msg = getErrorMessage(err) || 'Không thể gửi email khôi phục. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau.';
      setForgotError(msg);
      notifyError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Ambient subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Centered Card */}
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100/90 p-6 sm:p-8 space-y-5 relative z-10">
        {/* Brand Header */}
        <div className="text-center sm:text-left">
          <Link to="/" className="inline-flex items-center group mb-3" aria-label="PhoneShop">
            <img
              src="/logo-horizontal.png"
              alt="PhoneShop - Smartphone • Better Life"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-2xl text-slate-900 tracking-tight">
            Chào mừng bạn trở lại
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Đăng nhập để theo dõi đơn hàng, voucher và ưu đãi thành viên VIP.
          </p>
        </div>

        {/* 1-Click Social Login (Google Pop-up) */}
        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            shape="rectangular"
            text="signin_with"
            width="100%"
          />
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="w-full border-t border-slate-200" />
          <span className="absolute bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            hoặc tiếp tục với email
          </span>
        </div>

        {/* Form đăng nhập */}
        <form onSubmit={handleLogin} noValidate className="space-y-4">
          {/* 1. Địa chỉ Email */}
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

          {/* 2. Mật khẩu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
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

          {/* Options Row: Ghi nhớ đăng nhập + Quên mật khẩu */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="font-medium text-slate-600">
                Ghi nhớ đăng nhập
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotSubmitted(false);
                setForgotError(null);
                setShowForgotModal(true);
              }}
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Quên mật khẩu?
            </button>
          </div>

          {/* Nút Submit Đăng nhập */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        {/* Chân form chuyển sang Đăng ký */}
        <div className="text-center text-xs text-slate-500 pt-1">
          <span>Chưa có tài khoản? </span>
          <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
            Đăng ký ngay
          </Link>
        </div>

        {/* Cam kết bảo mật chuẩn mã hóa */}
        <div className="pt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Thông tin đăng nhập của bạn luôn được bảo mật.</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FORGOT PASSWORD MODAL DIALOG                             */}
      {/* ========================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              disabled={forgotLoading}
              onClick={() => {
                setShowForgotModal(false);
                setForgotSubmitted(false);
                setForgotError(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 disabled:opacity-50 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {forgotSubmitted ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Đã gửi email khôi phục!
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Chúng tôi đã gửi liên kết đặt lại mật khẩu đến <strong>{forgotEmail}</strong>. Vui lòng kiểm tra hộp thư đến (và thư mục Spam/Quảng cáo).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSubmitted(false);
                    setForgotError(null);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} noValidate className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Khôi phục mật khẩu
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Nhập địa chỉ email liên kết với tài khoản PhoneShop của bạn để nhận mã xác thực đặt lại mật khẩu.
                  </p>
                </div>

                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      disabled={forgotLoading}
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotError) setForgotError(null);
                      }}
                      placeholder="Địa chỉ email đã đăng ký"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi link đặt lại mật khẩu...</span>
                    </>
                  ) : (
                    <span>Gửi link đặt lại mật khẩu</span>
                  )}
                </button>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hỗ trợ khẩn cấp: <strong>1800 6868</strong> (Miễn phí)</span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
