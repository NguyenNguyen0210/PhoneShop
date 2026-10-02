import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Smartphone, Mail, Lock, LogIn, AlertCircle, Shield, User, Loader2, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient indigo background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 space-y-2">
        <Link to="/" className="inline-flex items-center gap-2.5 group mb-2">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/20 group-hover:scale-105 transition">
            <Smartphone className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">MobileCommerce</span>
        </Link>
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-wider text-indigo-400">
          <Sparkles className="w-3 h-3" />
          <span>SECURITY ACCESS GATEWAY</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Đăng nhập tài khoản</h2>
        <p className="text-xs text-slate-400">
          Hệ thống xác thực đa tầng bảo vệ thông tin cá nhân và đơn hàng
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-[#0e1526] py-8 px-6 shadow-2xl rounded-3xl border border-white/10 sm:px-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Địa chỉ Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mobilecommerce.vn"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden transition"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden transition"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
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
          <div className="pt-4 border-t border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block text-center">
              Đăng nhập nhanh tài khoản mẫu (Seed Demo)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                className="py-2.5 px-2 bg-[#151d30] hover:bg-indigo-600/20 text-indigo-300 font-bold text-[11px] rounded-xl border border-white/10 hover:border-indigo-500/40 flex flex-col items-center gap-1 transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('staff')}
                className="py-2.5 px-2 bg-[#151d30] hover:bg-blue-600/20 text-blue-300 font-bold text-[11px] rounded-xl border border-white/10 hover:border-blue-500/40 flex flex-col items-center gap-1 transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Staff</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('user')}
                className="py-2.5 px-2 bg-[#151d30] hover:bg-emerald-600/20 text-emerald-300 font-bold text-[11px] rounded-xl border border-white/10 hover:border-emerald-500/40 flex flex-col items-center gap-1 transition cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Khách hàng</span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400">
            <span>Chưa có tài khoản? </span>
            <Link to="/register" className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline">
              Đăng ký tài khoản mới
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
