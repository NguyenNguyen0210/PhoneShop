import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { storageService } from '../../../services/storageService';
import { apiClient } from '../../../services/apiClient';
import { orderService } from '../../../services/orderService';
import { returnService } from '../../../services/returnService';
import type { Order, ReturnRequest } from '../../../types';
import { ReturnCard } from '../Orders/components/ReturnCard';
import { OrderCancelModal } from '../Orders/components/OrderCancelModal';
import { reorderOrderItems } from '../Orders/utils/reorderHelper';
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
  BadgeCheck,
  RotateCcw,
  Ban,
  Undo2,
  Headphones,
  Phone,
  Pencil,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ChangePasswordCard } from './components/ChangePasswordCard';
import { CustomerTicketsTab } from './components/CustomerTicketsTab';
import { EditProfileModal } from './components/EditProfileModal';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, fetchProfile } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(() => Boolean(user));
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(() => Boolean(user));
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (location.pathname === '/orders' || location.hash === '#orders') {
      setTimeout(() => {
        document.getElementById('orders-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } else if (location.hash === '#returns') {
      setTimeout(() => {
        document.getElementById('returns-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } else if (location.hash === '#tickets' || location.search.includes('tab=tickets')) {
      setTimeout(() => {
        document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } else if (location.hash === '#password' || location.hash === '#change-password') {
      setTimeout(() => {
        document.getElementById('password-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [location.pathname, location.hash, location.search]);

  useEffect(() => {
    fetchProfile().catch(() => {});
  }, [fetchProfile]);

  const fetchReturns = () => {
    if (!user) return;
    setLoadingReturns(true);
    returnService
      .getMyReturns()
      .then(setReturnRequests)
      .catch(() => setReturnRequests([]))
      .finally(() => setLoadingReturns(false));
  };

  useEffect(() => {
    fetchReturns();
  }, [user]);

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
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold rounded-md">
            CHỜ THANH TOÁN (15M HOLD)
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold rounded-md">
            ĐÃ XÁC NHẬN
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-bold rounded-md">
            ĐANG VẬN CHUYỂN
          </span>
        );
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold rounded-md">
            HOÀN TẤT
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold rounded-md">
            ĐÃ HỦY
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-bold rounded-md">
            {status}
          </span>
        );
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Chưa đăng nhập tài khoản</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Vui lòng đăng nhập để xem thông tin hồ sơ, quản lý đơn hàng và cập nhật ảnh đại diện.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-10 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Customer Account Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1 uppercase tracking-wider">
              <BadgeCheck className="w-4 h-4 text-blue-600" />
              <span>TRUNG TÂM TÀI KHOẢN KHÁCH HÀNG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hồ sơ cá nhân &amp; Đơn hàng
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Thành viên PhoneShop</span>
            </span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Banner */}
          <div className="h-36 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-100 border-b border-slate-200 relative overflow-hidden" />

          {/* Profile Header & Avatar */}
          <div className="px-6 sm:px-8 pb-8 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 mb-6">
              {/* Avatar circle */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl border-4 border-white bg-slate-100 shadow-md overflow-hidden flex items-center justify-center ring-2 ring-blue-500/20">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={user.fullName || 'Avatar'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-14 h-14 text-slate-400" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Avatar change button - MUST preserve title='Đổi ảnh đại diện' for Playwright test */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-1 right-1 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 border border-white"
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
                <h2 className="text-2xl font-black text-slate-900">{user.fullName || 'Khách hàng'}</h2>
                <p className="text-xs sm:text-sm text-slate-500">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'STAFF' ? 'Nhân viên hệ thống' : 'Thành viên thân thiết'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tài khoản đã xác thực</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Message alert */}
            {message && (
              <div
                className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Details Section */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Thông tin cá nhân
                  </h3>
                  <p className="text-xs text-slate-500">
                    Quản lý họ tên, số điện thoại và email tài khoản
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer self-start sm:self-auto"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa thông tin</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Họ và tên</span>
                  </div>
                  <p className="text-slate-900 font-bold text-sm sm:text-base">
                    {user.fullName || 'Chưa cập nhật'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Số điện thoại</span>
                  </div>
                  <p
                    className={`text-sm sm:text-base ${
                      user.phone
                        ? 'text-slate-900 font-bold font-mono'
                        : 'text-slate-400 italic font-medium'
                    }`}
                  >
                    {user.phone || 'Chưa cập nhật'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Địa chỉ Email</span>
                  </div>
                  <p
                    className="text-slate-900 font-semibold text-sm sm:text-base truncate"
                    title={user.email}
                  >
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <ChangePasswordCard />

        {/* Order History Section */}
        <div id="orders-section" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5 scroll-mt-24">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider">
                Lịch sử đặt hàng của bạn
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {orders.length} Đơn hàng
            </span>
          </div>

          {loadingOrders ? (
            <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải danh sách đơn hàng...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">Chưa có đơn hàng nào</p>
              <p className="text-xs text-slate-500">
                Các đơn hàng bạn đã đặt sẽ xuất hiện chi tiết tại đây.
              </p>
              <div className="pt-2">
                <Link
                  to="/products"
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline"
                >
                  Khám phá danh mục sản phẩm &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 space-y-3">
              {orders.map((ord) => (
                <div key={ord.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        {ord.orderNumber || ord.id.slice(0, 8)}
                      </span>
                      {getStatusBadge(ord.status)}
                    </div>
                    <p className="text-slate-500">
                      Ngày đặt: {new Date(ord.createdAt).toLocaleDateString('vi-VN')} • Phương thức:{' '}
                      <span className="font-bold text-slate-700">{ord.paymentMethod}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end flex-wrap">
                    <span className="font-mono font-black text-blue-600 text-sm tabular-nums">
                      {formatPrice(ord.totalAmount)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const result = reorderOrderItems(ord);
                          setMessage({
                            type: 'success',
                            text: `Đã thêm ${result.addedCount} sản phẩm từ đơn #${ord.orderNumber || ord.id.slice(0, 8)} vào giỏ hàng`,
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer"
                        title="Mua lại đơn này"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Mua lại</span>
                      </button>

                      {['PENDING', 'CONFIRMED'].includes(ord.status) && ord.paymentStatus !== 'PAID' && (
                        <button
                          type="button"
                          onClick={() => setCancellingOrder(ord)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition cursor-pointer"
                          title="Hủy đơn hàng"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Hủy đơn</span>
                        </button>
                      )}

                      <Link
                        to={`/orders/${ord.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Xem chi tiết đơn"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Returns & Refund Section */}
        <div id="returns-section" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5 scroll-mt-24">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Undo2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider">
                Yêu cầu Đổi trả & Hoàn tiền
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {returnRequests.length} Yêu cầu
            </span>
          </div>

          {loadingReturns ? (
            <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải danh sách đổi trả...</span>
            </div>
          ) : returnRequests.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">Chưa có yêu cầu đổi trả nào</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Khi cần đổi trả sản phẩm trong vòng 7 ngày kể từ khi nhận hàng, bạn có thể gửi yêu cầu trực tiếp tại trang chi tiết đơn hàng tương ứng.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {returnRequests.map((ret) => (
                <ReturnCard
                  key={ret.id}
                  returnRequest={ret}
                  onCancel={async (returnId) => {
                    try {
                      await returnService.cancelReturn(returnId);
                      fetchReturns();
                      setMessage({ type: 'success', text: 'Hủy yêu cầu đổi trả thành công!' });
                    } catch (err: any) {
                      setMessage({ type: 'error', text: err.response?.data?.message || 'Không thể hủy yêu cầu.' });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Support Tickets Section */}
        <div id="tickets-section" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Headphones className="w-5 h-5 text-blue-600" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider">
              Trung tâm Hỗ trợ & Khiếu nại (CSKH)
            </h3>
          </div>
          <CustomerTicketsTab initialOrderId={new URLSearchParams(location.search).get('orderId')} />
        </div>

        {/* Edit Profile Modal */}
        {user && (
          <EditProfileModal
            isOpen={isEditProfileModalOpen}
            onClose={() => setIsEditProfileModalOpen(false)}
            user={user}
            onSuccess={(updatedUser) => {
              updateUser(updatedUser);
              setMessage({
                type: 'success',
                text: 'Cập nhật thông tin cá nhân thành công!',
              });
              fetchProfile().catch(() => {});
            }}
          />
        )}

        {/* Cancel Modal */}
        {cancellingOrder && (
          <OrderCancelModal
            order={cancellingOrder}
            isOpen={Boolean(cancellingOrder)}
            onClose={() => setCancellingOrder(null)}
            onCancelled={(updated) => {
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              setMessage({
                type: 'success',
                text: `Hủy đơn hàng #${updated.orderNumber || updated.id.slice(0, 8)} thành công!`,
              });
            }}
          />
        )}
      </div>
    </div>
  );
};
