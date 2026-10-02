import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { storageService } from '../../../services/storageService';
import { apiClient } from '../../../services/apiClient';
import { Camera, CheckCircle2, User, Mail, Shield, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Update user state with new avatar
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

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xs border border-slate-200">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Chưa đăng nhập</h2>
          <p className="text-sm text-slate-500 mb-6">
            Vui lòng đăng nhập để xem thông tin hồ sơ và đổi ảnh đại diện.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative" />

        {/* Content */}
        <div className="px-8 pb-8 relative">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 mb-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
                {user.avatar || (user as any).avatarUrl ? (
                  <img
                    src={user.avatar || (user as any).avatarUrl}
                    alt={user.fullName || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-slate-400" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
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

            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{user.fullName || 'Khách hàng'}</h1>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                  <Shield className="w-3.5 h-3.5" />
                  Vai trò: {user.role || 'USER'}
                </span>
                {user.avatar && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Supabase CDN WebP
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* User Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 text-slate-500 mb-1">
                <User className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Họ và tên</span>
              </div>
              <p className="text-slate-900 font-medium">{user.fullName || 'Chưa cập nhật'}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 text-slate-500 mb-1">
                <Mail className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Địa chỉ Email</span>
              </div>
              <p className="text-slate-900 font-medium">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
