import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smartphone, Mail, Lock, User, Phone, UserPlus, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
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
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Đăng ký không thành công.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 space-y-2">
        <Link to="/" className="inline-flex items-center gap-2.5 group mb-2">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/20 group-hover:scale-105 transition">
            <Smartphone className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">MobileCommerce</span>
        </Link>
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-wider text-indigo-400">
          <Sparkles className="w-3 h-3" />
          <span>NEW USER REGISTRATION</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Đăng ký tài khoản</h2>
        <p className="text-xs text-slate-400">
          Nhận ngay voucher <span className="font-mono font-bold text-sky-400">WELCOME50</span> giảm 50.000₫ cho đơn hàng đầu tiên
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

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Họ và tên *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden transition"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Địa chỉ Email *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden transition"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Số điện thoại
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden transition"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden transition"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Xác nhận mật khẩu *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
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
                  <span>Đang đăng ký tài khoản...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Đăng ký tài khoản</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400">
            <span>Đã có tài khoản? </span>
            <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
