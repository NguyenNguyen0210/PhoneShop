import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { storageService } from '../../../services/storageService';
import { apiClient } from '../../../services/apiClient';
import { orderService } from '../../../services/orderService';
import type { Order } from '../../../types';
import {
  Camera,
  CheckCircle2,
  User,
  Mail,
  Shield,
  AlertCircle,
  Package,
  Clock,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(() => Boolean(user));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    if (user) {
      orderService
        .getMyOrders()
        .then((data) => {
          if (isMounted) setOrders(data);
        })
        .catch(() => {
          if (isMounted) setOrders([]);
        })
        .finally(() => {
          if (isMounted) setLoadingOrders(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước ảnh tối đa là 5MB.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const res = await storageService.uploadAvatar(file);

      // Persist the avatar to the backend via API call
      try {
        await apiClient.put('/users/profile', { avatarUrl: res.url });
      } catch {
        await apiClient.patch('/users/profile', { avatarUrl: res.url });
      }

      if (user) {
        updateUser({ avatar: res.url });
      }
      setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện và tối ưu WebP thành công!' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Tải ảnh thất bại. Vui lòng thử lại!',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold rounded-md">
            CHỜ THANH TOÁN (15M HOLD)
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold rounded-md">
            ĐÃ XÁC NHẬN
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold rounded-md">
            ĐANG VẬN CHUYỂN
          </span>
        );
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold rounded-md">
            HOÀN TẤT
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold rounded-md">
            ĐÃ HỦY
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[10px] font-mono font-bold rounded-md">
            {status}
          </span>
        );
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-[#0e1526] border border-white/10 rounded-3xl p-8 sm:p-10 text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#151d30] border border-white/10 flex items-center justify-center mx-auto text-slate-400">
            <User className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-xl font-black text-white">Chưa đăng nhập tài khoản</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Vui lòng đăng nhập để xem thông tin hồ sơ, quản lý đơn hàng và cập nhật ảnh đại diện.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <span>Đăng nhập ngay</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const avatarSrc = user.avatar || (user as any).avatarUrl;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 py-10 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Terminal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>TERMINAL // QUẢN TRỊ DANH TÍNH KHÁCH HÀNG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Hồ sơ người dùng & Tài khoản
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-semibold rounded-lg">
              UID: {user.id ? user.id.slice(0, 8) : 'GUEST'}
            </span>
          </div>
        </div>

        {/* Developer-grade Obsidian Settings Card */}
        <div className="bg-[#0e1526] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Banner */}
          <div className="h-36 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-[#0e1526] border-b border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Profile Header & Avatar */}
          <div className="px-6 sm:px-8 pb-8 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 mb-6">
              {/* Avatar circle */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl border-4 border-[#0e1526] bg-[#151d30] shadow-2xl overflow-hidden flex items-center justify-center ring-2 ring-indigo-500/30">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={user.fullName || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-14 h-14 text-slate-400" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Avatar change button - MUST preserve title='Đổi ảnh đại diện' for Playwright test */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-1 right-1 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50 border border-white/20"
                  title="Đổi ảnh đại diện"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Name & Role */}
              <div className="text-center sm:text-left flex-1 space-y-1">
                <h2 className="text-2xl font-black text-white">{user.fullName || 'Khách hàng'}</h2>
                <p className="text-xs sm:text-sm text-slate-400 font-mono">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    <Shield className="w-3.5 h-3.5" />
                    Vai trò: {user.role || 'USER'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Supabase CDN WebP
                  </span>
                </div>
              </div>
            </div>

            {/* Message alert */}
            {message && (
              <div
                className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="p-4 bg-[#151d30] rounded-2xl border border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Họ và tên</span>
                </div>
                <p className="text-white font-bold text-sm sm:text-base">
                  {user.fullName || 'Chưa cập nhật'}
                </p>
              </div>

              <div className="p-4 bg-[#151d30] rounded-2xl border border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Địa chỉ Email</span>
                </div>
                <p className="text-white font-bold text-sm sm:text-base font-mono">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order History Section */}
        <div className="bg-[#0e1526] rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                Lịch sử đặt hàng & IMEI liên kết
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {orders.length} Đơn hàng
            </span>
          </div>

          {loadingOrders ? (
            <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải danh sách đơn hàng...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Chưa có đơn hàng nào</p>
              <p className="text-xs text-slate-500">
                Các đơn hàng bạn đặt với cơ chế giữ IMEI 15 phút sẽ xuất hiện tại đây.
              </p>
              <div className="pt-2">
                <Link
                  to="/products"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                >
                  Khám phá danh mục sản phẩm &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5 space-y-3">
              {orders.map((ord) => (
                <div key={ord.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">
                        {ord.orderNumber || ord.id.slice(0, 8)}
                      </span>
                      {getStatusBadge(ord.status)}
                    </div>
                    <p className="text-slate-400">
                      Ngày đặt: {new Date(ord.createdAt).toLocaleDateString('vi-VN')} • Phương thức:{' '}
                      <span className="font-bold text-slate-300">{ord.paymentMethod}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <span className="font-mono font-black text-sky-400 text-sm tabular-nums">
                      {formatPrice(ord.totalAmount)}
                    </span>
                    <Link
                      to={`/order-success/${ord.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                      title="Xem chi tiết đơn"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
