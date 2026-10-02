import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, Shield, User, Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check redirect location
  const from = (location.state as any)?.from?.pathname || '/';

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
      if (user.role === 'ADMIN' || user.role === 'STAFF' || user.role === 'MANAGER') {
        navigate('/admin');
      } else {
        navigate(from === '/login' ? '/' : from);
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (role: 'admin' | 'staff' | 'user') => {
    setError('');
    if (role === 'admin') {
      setEmail('admin@mobilecommerce.vn');
      setPassword('Admin@123456');
    } else if (role === 'staff') {
      setEmail('staff@mobilecommerce.vn');
      setPassword('Staff@123456');
    } else {
      setEmail('customer@gmail.com');
      setPassword('Customer@123456');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 space-y-2">
        <Link to="/" className="inline-flex items-center justify-center group mb-2" aria-label="PhoneShop">
          <img
            src="/logo-horizontal.png"
            alt="PhoneShop - Smartphone • Better Life"
            className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-wider text-blue-600">
          <Sparkles className="w-3 h-3" />
          <span>SECURITY ACCESS GATEWAY</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Đăng nhập tài khoản</h2>
        <p className="text-xs text-slate-500">
          Hệ thống xác thực đa tầng bảo vệ thông tin cá nhân và đơn hàng
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200 sm:px-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Địa chỉ Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mobilecommerce.vn"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực bảo mật...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Login Buttons (Demo credentials from seed) */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block text-center">
              Đăng nhập nhanh tài khoản mẫu (Seed Demo)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                className="py-2.5 px-2 bg-slate-50 hover:bg-blue-50 text-blue-700 font-bold text-[11px] rounded-xl border border-slate-200 hover:border-blue-300 flex flex-col items-center gap-1 transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('staff')}
                className="py-2.5 px-2 bg-slate-50 hover:bg-blue-50 text-blue-700 font-bold text-[11px] rounded-xl border border-slate-200 hover:border-blue-300 flex flex-col items-center gap-1 transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Staff</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('user')}
                className="py-2.5 px-2 bg-slate-50 hover:bg-emerald-50 text-emerald-700 font-bold text-[11px] rounded-xl border border-slate-200 hover:border-emerald-300 flex flex-col items-center gap-1 transition cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Khách hàng</span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            <span>Chưa có tài khoản? </span>
            <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
              Đăng ký tài khoản mới
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
