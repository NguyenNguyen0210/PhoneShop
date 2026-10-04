import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { authService } from '../../../services/authService';

type ResetStatus = 'VERIFYING' | 'INVALID' | 'FORM' | 'SUCCESS';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState<ResetStatus>('VERIFYING');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // 1. Xác thực token khi mount
  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token) {
        if (isMounted) setStatus('INVALID');
        return;
      }

      try {
        const res = await authService.verifyResetToken(token);
        if (isMounted) {
          if (res?.valid) {
            setMaskedEmail(res.email || '');
            setStatus('FORM');
          } else {
            setStatus('INVALID');
          }
        }
      } catch {
        if (isMounted) {
          setStatus('INVALID');
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Countdown khi đặt lại mật khẩu thành công
  useEffect(() => {
    if (status !== 'SUCCESS') return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, navigate]);

  // 3. Xử lý submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ cả hai trường mật khẩu.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    if (!token) {
      setStatus('INVALID');
      return;
    }

    setSubmitting(true);
    try {
      await authService.resetPassword({ token, newPassword });
      setStatus('SUCCESS');
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
        err.message ||
        'Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn hoặc không hợp lệ.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-800 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Logo Header */}
      <div className="mb-6 z-10 text-center">
        <Link to="/" className="inline-flex items-center group" aria-label="PhoneShop">
          <img
            src="/logo-horizontal.png"
            alt="PhoneShop"
            className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>
      </div>

      {/* Main Centered Card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 z-10 animate-in zoom-in-95 duration-200">
        {/* ========================================================= */}
        {/* TRẠNG THÁI 1: VERIFYING                                    */}
        {/* ========================================================= */}
        {status === 'VERIFYING' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Đang xác thực liên kết bảo mật...
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Hệ thống đang kiểm tra mã xác thực đặt lại mật khẩu. Vui lòng chờ trong giây lát.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TRẠNG THÁI 2: INVALID / EXPIRED                           */}
        {/* ========================================================= */}
        {status === 'INVALID' && (
          <div className="text-center py-4 space-y-5">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Liên kết không hợp lệ hoặc đã hết hạn
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Liên kết đặt lại mật khẩu chỉ có hiệu lực trong vòng <strong>15 phút</strong> và mỗi liên kết chỉ được sử dụng một lần vì lý do an toàn.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Yêu cầu gửi lại liên kết mới</span>
              </button>

              <Link
                to="/"
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center"
              >
                Về trang chủ
              </Link>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
              <span>Hỗ trợ khách hàng: <strong>1800 6868</strong> (Miễn phí)</span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TRẠNG THÁI 3: FORM                                         */}
        {/* ========================================================= */}
        {status === 'FORM' && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Đặt lại mật khẩu mới
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Vui lòng tạo mật khẩu mới an toàn cho tài khoản của bạn.
                </p>
              </div>

              {maskedEmail && (
                <div className="inline-block mt-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-600">
                  Tài khoản: <strong className="text-slate-800 font-semibold">{maskedEmail}</strong>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu mới *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={submitting}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới *
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    disabled={submitting}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nút Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang cập nhật mật khẩu...</span>
                  </>
                ) : (
                  <>
                    <span>Xác nhận đặt lại mật khẩu</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TRẠNG THÁI 4: SUCCESS                                      */}
        {/* ========================================================= */}
        {status === 'SUCCESS' && (
          <div className="text-center py-4 space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Đặt lại mật khẩu thành công!
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập với mật khẩu mới để tiếp tục mua sắm và quản lý tài khoản.
              </p>
              <div className="mt-3 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 inline-block">
                Tự động chuyển về trang đăng nhập sau <strong className="text-blue-600 font-bold">{countdown}s</strong>...
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Đăng nhập ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Cam kết bảo mật chuẩn mã hóa */}
      <div className="pt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 z-10">
        <ShieldCheck className="w-4 h-4 text-slate-400" />
        <span>Hệ thống bảo mật chuẩn mã hóa SSL/TLS 256-bit.</span>
      </div>
    </div>
  );
};
