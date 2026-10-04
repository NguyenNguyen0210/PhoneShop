import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    const returnedState = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(
        error === 'access_denied'
          ? 'Bạn đã từ chối cấp quyền truy cập tài khoản Google.'
          : `Lỗi xác thực Google: ${error}`
      );
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('Không tìm thấy mã xác thực Google hợp lệ (Thiếu tham số code).');
      return;
    }

    // P7: login-CSRF check — the state Google echoed must match the
    // server-minted value stored before redirect. A mismatch means this
    // callback was planted, so we stop before exchanging the code.
    const storedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    if (!returnedState || !storedState || returnedState !== storedState) {
      setStatus('error');
      setErrorMessage('Phiên đăng nhập Google không hợp lệ (sai lệch state) — vui lòng thử đăng nhập lại.');
      return;
    }

    const processGoogleAuth = async () => {
      try {
        const user = await loginWithGoogle(code, returnedState);
        setStatus('success');
        setTimeout(() => {
          if (user.role === 'STAFF') {
            navigate('/staff');
          } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 1200);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(
          err.message || 'Xác thực tài khoản Google với hệ thống PhoneShop thất bại.'
        );
      }
    };

    processGoogleAuth();
  }, [searchParams, loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200 text-center space-y-6">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center justify-center group" aria-label="PhoneShop">
          <img
            src="/logo-horizontal.png"
            alt="PhoneShop"
            className="h-10 w-auto object-contain"
          />
        </Link>

        {status === 'loading' && (
          <div className="py-6 space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping opacity-30" />
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Đang xác thực tài khoản Google...
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Hệ thống đang liên kết bảo mật và đồng bộ thông tin của bạn. Vui lòng chờ trong giây lát.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Đăng nhập thành công!
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Chào mừng bạn đã trở lại với PhoneShop. Đang chuyển hướng đến trang mua sắm...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6 space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full mx-auto flex items-center justify-center shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Đăng nhập Google thất bại
            </h2>
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl leading-relaxed">
              {errorMessage}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
              >
                <span>Quay lại trang Đăng nhập</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
          🛡️ Bảo mật chuẩn giao thức OAuth 2.0 &amp; Google Identity Services.
        </div>
      </div>
    </div>
  );
};
