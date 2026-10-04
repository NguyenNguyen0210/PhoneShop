import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
  CheckCircle2,
  PhoneCall,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { authService } from '../../../services/authService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'STAFF') {
        navigate('/staff');
      } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
        navigate('/admin');
      } else {
        navigate(from === '/login' ? '/' : from);
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // P7: server-minted OAuth state stored locally and echoed back on
      // callback — blocks login-CSRF (planted Google codes).
      const { url, state } = await authService.getGoogleAuthUrl();
      if (state) sessionStorage.setItem('oauth_state', state);
      window.location.href = url;
    } catch {
      // Fallback: build authorization URL using environment credentials
      const clientId =
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '323053585279-2e3jkfp7m1nojsutf5dufau00ajd9osh.apps.googleusercontent.com';
      const redirectUri =
        import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
        'http://localhost:5173/auth/oauth/callback';
      const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const options = {
        redirect_uri: redirectUri,
        client_id: clientId,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ].join(' '),
      };
      const qs = new URLSearchParams(options);
      window.location.href = `${rootUrl}?${qs.toString()}`;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await authService.forgotPassword(forgotEmail.trim());
      setForgotSubmitted(true);
    } catch (err: any) {
      setForgotError(
        err.response?.data?.message ||
        err.message ||
        'Không thể gửi email khôi phục. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau.'
      );
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
              alt="PhoneShop"
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

        {/* 1-Click Social Login (Google) */}
        <div className="space-y-2">
          <button
            type="button"
            aria-label="Google"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
          >
            {googleLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Đang kết nối Google...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Đăng nhập nhanh với Google</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="w-full border-t border-slate-200" />
          <span className="absolute bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            hoặc tiếp tục với email
          </span>
        </div>

        {/* Alert thông báo lỗi đăng nhập */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

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
          <span>Thông tin đăng nhập được bảo mật chuẩn mã hóa SSL.</span>
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
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
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
                      onChange={(e) => setForgotEmail(e.target.value)}
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
